const AUTH_KEY = "autosweb-auth-user";
const TOKEN_KEY = "autosweb-auth-token";
const LEGACY_USERS_KEY = "autosweb-auth-users";

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function setCachedUser(user) {
  if (!user?.email) {
    sessionStorage.removeItem(AUTH_KEY);
    return null;
  }
  const cached = {
    id: user.id,
    email: user.email,
    displayName: user.displayName || null,
    profile: user.profile || null,
    loggedInAt: Date.now(),
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(cached));
  return cached;
}

function rememberAuth(data) {
  if (data?.token) setStoredToken(data.token);
  return setCachedUser(data?.user ?? null);
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
  return Boolean(getAuthUser()?.email);
}

async function authFetch(url, options = {}) {
  const token = getStoredToken();
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Kérés sikertelen.");
  }
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function refreshAuthSession() {
  try {
    const data = await authFetch("/api/auth/me");
    return rememberAuth(data);
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    return null;
  }
}

/** Profil mindig a szerverről (SQLite), ne a böngésző cache-ből. */
export async function loadProfileFromServer() {
  const data = await authFetch("/api/auth/profile");
  if (data.user) rememberAuth(data);
  else {
    const user = getAuthUser() || { email: null };
    setCachedUser({
      ...user,
      displayName: data.displayName ?? user.displayName ?? null,
      profile: data.profile,
    });
  }
  return data.profile ?? getProfile();
}

async function maybeMigrateLegacyProfile(user) {
  if (!user?.email || user.profile?.firstName) return;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_USERS_KEY) || "{}");
    const profile = legacy[user.email]?.profile;
    if (profile?.firstName && profile?.lastName) {
      await saveProfile(profile);
    }
  } catch {
    /* ignore */
  }
}

export async function register(email, password, passwordConfirm) {
  const data = await authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      passwordConfirm,
    }),
  });
  const user = rememberAuth(data);
  await maybeMigrateLegacyProfile(user);
  return user;
}

export async function login(email, password) {
  const data = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user = rememberAuth(data);
  await maybeMigrateLegacyProfile(user);
  return getAuthUser();
}

export async function logout() {
  try {
    await authFetch("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(AUTH_KEY);
  setStoredToken("");
}

export async function changePassword(currentPassword, newPassword, newPasswordConfirm) {
  await authFetch("/api/auth/password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword,
      newPassword,
      newPasswordConfirm,
    }),
  });
}

export function getDisplayName() {
  const user = getAuthUser();
  if (!user?.email) return "";
  if (user.displayName) return String(user.displayName);
  const profile = user.profile;
  const fromProfile = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  if (fromProfile) return fromProfile;
  const local = user.email.split("@")[0] || user.email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function setDisplayName(name) {
  const data = await authFetch("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ displayName: name }),
  });
  if (data.user) rememberAuth(data);
  else {
    const user = getAuthUser();
    if (user) {
      user.displayName = data.displayName;
      setCachedUser(user);
    }
  }
  return data.displayName;
}

export async function deleteAccount() {
  await authFetch("/api/auth/account", { method: "DELETE" });
  sessionStorage.removeItem(AUTH_KEY);
  setStoredToken("");
}

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

export function getProfile() {
  const user = getAuthUser();
  if (!user?.email) return { ...EMPTY_PROFILE };
  return { ...EMPTY_PROFILE, ...(user.profile || {}) };
}

export async function saveProfile(profile) {
  const data = await authFetch("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ profile }),
  });
  if (data.user) rememberAuth(data);
  else {
    const user = getAuthUser();
    if (user) {
      user.profile = data.profile;
      user.displayName = [data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ");
      setCachedUser(user);
    }
  }
  if (!data.profile?.firstName) {
    throw new Error("A mentés nem sikerült — próbáld újra belépés után.");
  }
  return data.profile;
}

function loginUrl(nextPath = "/hirdetesfeladas.html") {
  return `/belepes.html?next=${encodeURIComponent(nextPath)}`;
}

function updateHeaderAuthUi() {
  const loginBtn = document.querySelector("[data-auth-login], [data-auth-logout]");
  const registerBtns = document.querySelectorAll("[data-auth-register]");
  const user = getAuthUser();
  const loggedIn = Boolean(user?.email);

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

  // Az avatar menü külön script (site-avatar-menu.js) — ne importáld újra (különben dupla listener).
  window.dispatchEvent(new CustomEvent("autosweb-auth-changed"));
}

export function initSiteAuth() {
  refreshAuthSession().finally(() => {
    updateHeaderAuthUi();
  });

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

export async function requireAuthForPage() {
  const user = await refreshAuthSession();
  if (user?.email) {
    updateHeaderAuthUi();
    return true;
  }
  const next = window.location.pathname + window.location.search;
  window.location.replace(loginUrl(next));
  return false;
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
