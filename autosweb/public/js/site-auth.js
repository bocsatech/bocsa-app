/**
 * Közös fiók — Autosweb szerver (/api/auth/*) + localStorage token.
 * A régi böngésző-only fiókok egyszer importálódnak a szerverre.
 * Avatar menü: site-avatar-menu.js (külön script).
 */

const AUTH_KEY = "autosweb-auth-user";
const TOKEN_KEY = "autosweb-auth-token";
const USERS_KEY = "autosweb-auth-users";
const MIGRATED_KEY = "autosweb-auth-migrated-v1";

const EMPTY_PROFILE = {
  salutation: "",
  firstName: "",
  lastName: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Magyarország",
  phone: "",
  company: "",
  accountType: "private",
};

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || getAuthUser()?.token || null;
  } catch {
    return null;
  }
}

function setSession(user, token) {
  const payload = {
    id: user?.id ?? null,
    email: user?.email ?? "",
    displayName: user?.displayName ?? "",
    profile: { ...EMPTY_PROFILE, ...(user?.profile ?? {}) },
    token: token || null,
    loggedInAt: Date.now(),
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  return payload;
}

function clearSession() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getAuthUser()?.email && getToken());
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const auth = token ?? getToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function migrateLocalAccountsOnce() {
  if (localStorage.getItem(MIGRATED_KEY)) return;
  const users = readUsers();
  const accounts = Object.entries(users).map(([email, row]) => ({
    email,
    password: row?.password,
    displayName: row?.displayName,
    profile: row?.profile,
  }));
  if (accounts.length) {
    try {
      await api("/api/auth/import-local", { method: "POST", body: { accounts } });
    } catch {
      /* szerver lehet offline — később újra */
      return;
    }
  }
  localStorage.setItem(MIGRATED_KEY, "1");
}

export async function restoreSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await api("/api/auth/me", { token });
    return setSession(data.user, token);
  } catch {
    clearSession();
    return null;
  }
}

export async function register(email, password, passwordConfirm) {
  const data = await api("/api/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      password_confirm: passwordConfirm,
    },
  });
  setSession(data.user, data.token);
  return data.user;
}

export async function login(email, password) {
  const trimmedEmail = String(email ?? "").trim();
  const trimmedPassword = String(password ?? "").trim();
  if (!trimmedEmail || !trimmedPassword) {
    throw new Error("Email és jelszó kötelező.");
  }

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: { email: trimmedEmail, password: trimmedPassword },
    });
    setSession(data.user, data.token);
    return data.user;
  } catch (error) {
    // Régi localStorage fiók: import + újrapróbálás
    const local = readUsers()[trimmedEmail];
    if (local?.password && local.password === trimmedPassword) {
      try {
        await api("/api/auth/import-local", {
          method: "POST",
          body: {
            accounts: [
              {
                email: trimmedEmail,
                password: trimmedPassword,
                displayName: local.displayName,
                profile: local.profile,
              },
            ],
          },
        });
        const data = await api("/api/auth/login", {
          method: "POST",
          body: { email: trimmedEmail, password: trimmedPassword },
        });
        setSession(data.user, data.token);
        return data.user;
      } catch (inner) {
        throw inner;
      }
    }
    throw error;
  }
}

export async function logout() {
  const token = getToken();
  try {
    if (token) await api("/api/auth/logout", { method: "POST", token });
  } catch {
    /* ignore */
  }
  clearSession();
}

export async function changePassword(currentPassword, newPassword, newPasswordConfirm) {
  await api("/api/auth/password", {
    method: "POST",
    body: {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    },
  });
}

export function getDisplayName() {
  const user = getAuthUser();
  if (!user?.email) return "";
  if (user.displayName) return String(user.displayName);
  const local = user.email.split("@")[0] || user.email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function setDisplayName(name) {
  const user = getAuthUser();
  if (!user?.email) throw new Error("Nem vagy bejelentkezve.");
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("A megjelenített név kötelező.");
  if (trimmed.length > 40) throw new Error("A név maximum 40 karakter lehet.");
  const profile = { ...getProfile() };
  const parts = trimmed.split(/\s+/);
  if (!profile.firstName && parts[0]) profile.firstName = parts[0];
  if (!profile.lastName && parts.length > 1) profile.lastName = parts.slice(1).join(" ");
  if (!profile.firstName) profile.firstName = trimmed;
  if (!profile.lastName) profile.lastName = "—";
  await saveProfile(profile);
  return trimmed;
}

export async function deleteAccount() {
  await api("/api/auth/account", { method: "DELETE" });
  const user = getAuthUser();
  if (user?.email) {
    const users = readUsers();
    delete users[user.email];
    writeUsers(users);
  }
  clearSession();
}

export function getProfile() {
  const user = getAuthUser();
  if (!user?.email) return { ...EMPTY_PROFILE };
  return { ...EMPTY_PROFILE, ...(user.profile ?? {}) };
}

export async function saveProfile(profile) {
  const data = await api("/api/auth/profile", {
    method: "PUT",
    body: profile,
  });
  setSession(data.user, getToken());
  return data.user.profile;
}

export async function saveAvatar(avatarDataUrl) {
  const data = await api("/api/auth/avatar", {
    method: "PUT",
    body: { avatarDataUrl: avatarDataUrl || "" },
  });
  setSession(data.user, getToken());
  return data.user;
}

function loginUrl(nextPath = "/hirdetesfeladas.html") {
  return `/belepes.html?next=${encodeURIComponent(nextPath)}`;
}

function updateHeaderAuthUi() {
  const loginBtn = document.querySelector("[data-auth-login], [data-auth-logout]");
  const registerBtns = document.querySelectorAll("[data-auth-register]");
  const user = getAuthUser();
  const loggedIn = Boolean(user?.email && getToken());

  registerBtns.forEach((btn) => {
    btn.hidden = loggedIn;
  });

  if (loginBtn) {
    if (loggedIn) {
      loginBtn.textContent = "Kijelentkezés";
      loginBtn.href = "#";
      loginBtn.removeAttribute("data-auth-login");
      loginBtn.setAttribute("data-auth-logout", "");
      loginBtn.classList.remove("site-header-btn--ghost");
      loginBtn.classList.add("site-header-btn--outline");
      loginBtn.title = user.email;
    } else {
      loginBtn.textContent = "Belépés";
      loginBtn.href = "/belepes.html";
      loginBtn.setAttribute("data-auth-login", "");
      loginBtn.removeAttribute("data-auth-logout");
      loginBtn.classList.add("site-header-btn--ghost");
      loginBtn.classList.remove("site-header-btn--outline");
      loginBtn.removeAttribute("title");
    }
  }

  // Az avatar menü külön script — ne importáld újra (különben dupla listener).
  window.dispatchEvent(new CustomEvent("autosweb-auth-changed"));
}

export async function initSiteAuth() {
  await restoreSession();
  await migrateLocalAccountsOnce();
  updateHeaderAuthUi();

  document.querySelectorAll("[data-auth-guard]").forEach((el) => {
    el.addEventListener("click", (event) => {
      if (isLoggedIn()) return;
      event.preventDefault();
      const target = el.getAttribute("href") || "/hirdetesfeladas.html";
      window.location.href = loginUrl(target);
    });
  });

  document.addEventListener("click", async (event) => {
    const logoutBtn = event.target.closest("[data-auth-logout]");
    if (!logoutBtn) return;
    event.preventDefault();
    await logout();
    updateHeaderAuthUi();
    window.location.href = "/";
  });
}

export function requireAuthForPage() {
  if (isLoggedIn()) return;
  const next = window.location.pathname + window.location.search;
  window.location.replace(loginUrl(next));
}

export function initRegisterPage() {
  const form = document.getElementById("register-form");
  const errorEl = document.getElementById("register-error");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/hirdetesfeladas.html";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const data = new FormData(form);
    try {
      await register(data.get("email"), data.get("password"), data.get("password_confirm"));
      window.location.href = next;
    } catch (error) {
      errorEl.hidden = false;
      errorEl.textContent = error.message ?? "Sikertelen regisztráció.";
    }
  });
}

export function initLoginPage() {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/hirdetesfeladas.html";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const data = new FormData(form);
    try {
      await login(data.get("email"), data.get("password"));
      window.location.href = next;
    } catch (error) {
      errorEl.hidden = false;
      errorEl.textContent = error.message ?? "Sikertelen belépés.";
    }
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.body?.dataset?.authInit !== "manual") initSiteAuth();
    });
  } else if (document.body?.dataset?.authInit !== "manual") {
    initSiteAuth();
  }
}
