const AUTH_KEY = "autosweb-auth-user";
const USERS_KEY = "autosweb-auth-users";

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

export function register(email, password, passwordConfirm) {
  const trimmedEmail = String(email ?? "").trim();
  const trimmedPassword = String(password ?? "").trim();
  const trimmedConfirm = String(passwordConfirm ?? "").trim();
  if (!trimmedEmail || !trimmedPassword) {
    throw new Error("Email és jelszó kötelező.");
  }
  if (trimmedPassword !== trimmedConfirm) {
    throw new Error("A két jelszó nem egyezik.");
  }
  const users = readUsers();
  if (users[trimmedEmail]) {
    throw new Error("Ez az email már regisztrálva van.");
  }
  users[trimmedEmail] = { password: trimmedPassword, createdAt: Date.now() };
  writeUsers(users);
  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ email: trimmedEmail, loggedInAt: Date.now() })
  );
}

export function login(email, password) {
  const trimmedEmail = String(email ?? "").trim();
  const trimmedPassword = String(password ?? "").trim();
  if (!trimmedEmail || !trimmedPassword) {
    throw new Error("Email és jelszó kötelező.");
  }
  const users = readUsers();
  const stored = users[trimmedEmail];
  if (stored && stored.password !== trimmedPassword) {
    throw new Error("Hibás email vagy jelszó.");
  }
  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ email: trimmedEmail, loggedInAt: Date.now() })
  );
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

export function changePassword(currentPassword, newPassword, newPasswordConfirm) {
  const user = getAuthUser();
  if (!user?.email) throw new Error("Nem vagy bejelentkezve.");
  const current = String(currentPassword ?? "").trim();
  const next = String(newPassword ?? "").trim();
  const confirm = String(newPasswordConfirm ?? "").trim();
  if (!current || !next) throw new Error("A jelenlegi és az új jelszó kötelező.");
  if (next !== confirm) throw new Error("A két új jelszó nem egyezik.");
  if (next.length < 4) throw new Error("Az új jelszó legalább 4 karakter legyen.");

  const users = readUsers();
  const stored = users[user.email];
  if (stored?.password && stored.password !== current) {
    throw new Error("A jelenlegi jelszó hibás.");
  }
  users[user.email] = {
    ...(stored ?? {}),
    password: next,
    updatedAt: Date.now(),
  };
  writeUsers(users);
}

export function getDisplayName() {
  const user = getAuthUser();
  if (!user?.email) return "";
  const users = readUsers();
  const stored = users[user.email]?.displayName;
  if (stored) return String(stored);
  const local = user.email.split("@")[0] || user.email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function setDisplayName(name) {
  const user = getAuthUser();
  if (!user?.email) throw new Error("Nem vagy bejelentkezve.");
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("A megjelenített név kötelező.");
  if (trimmed.length > 40) throw new Error("A név maximum 40 karakter lehet.");
  const users = readUsers();
  users[user.email] = {
    ...(users[user.email] ?? {}),
    displayName: trimmed,
    updatedAt: Date.now(),
  };
  writeUsers(users);
  return trimmed;
}

export function deleteAccount() {
  const user = getAuthUser();
  if (!user?.email) throw new Error("Nem vagy bejelentkezve.");
  const users = readUsers();
  delete users[user.email];
  writeUsers(users);
  sessionStorage.removeItem(AUTH_KEY);
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
  const users = readUsers();
  const stored = users[user.email]?.profile ?? {};
  return { ...EMPTY_PROFILE, ...stored };
}

export function saveProfile(profile) {
  const user = getAuthUser();
  if (!user?.email) throw new Error("Nem vagy bejelentkezve.");
  const next = {
    salutation: String(profile.salutation ?? "").trim(),
    firstName: String(profile.firstName ?? "").trim(),
    lastName: String(profile.lastName ?? "").trim(),
    street: String(profile.street ?? "").trim(),
    postalCode: String(profile.postalCode ?? "").trim(),
    city: String(profile.city ?? "").trim(),
    country: String(profile.country ?? "Magyarország").trim() || "Magyarország",
    phone: String(profile.phone ?? "").trim(),
    company: String(profile.company ?? "").trim(),
    accountType: profile.accountType === "business" ? "business" : "private",
  };
  if (!next.firstName || !next.lastName) {
    throw new Error("A keresztnév és a vezetéknév kötelező.");
  }
  if (!next.postalCode || !next.city) {
    throw new Error("Az irányítószám és a város kötelező.");
  }
  const users = readUsers();
  const displayName =
    [next.firstName, next.lastName].filter(Boolean).join(" ") || users[user.email]?.displayName;
  users[user.email] = {
    ...(users[user.email] ?? {}),
    profile: next,
    displayName,
    updatedAt: Date.now(),
  };
  writeUsers(users);
  return next;
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

  // Az avatar menü külön script — ne importáld újra (különben dupla listener).
  window.dispatchEvent(new CustomEvent("autosweb-auth-changed"));
}

export function initSiteAuth() {
  updateHeaderAuthUi();

  document.querySelectorAll("[data-auth-guard]").forEach((el) => {
    el.addEventListener("click", (event) => {
      if (isLoggedIn()) return;
      event.preventDefault();
      const target = el.getAttribute("href") || "/hirdetesfeladas.html";
      window.location.href = loginUrl(target);
    });
  });

  document.addEventListener("click", (event) => {
    const logoutBtn = event.target.closest("[data-auth-logout]");
    if (!logoutBtn) return;
    event.preventDefault();
    logout();
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const data = new FormData(form);
    try {
      register(data.get("email"), data.get("password"), data.get("password_confirm"));
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const data = new FormData(form);
    try {
      login(data.get("email"), data.get("password"));
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
