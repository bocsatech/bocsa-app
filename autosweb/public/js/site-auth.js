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

function loginUrl(nextPath = "/hirdetesfeladas.html") {
  return `/belepes.html?next=${encodeURIComponent(nextPath)}`;
}

function updateHeaderAuthUi() {
  const loginBtn = document.querySelector("[data-auth-login], [data-auth-logout]");
  const registerBtn = document.querySelector("[data-auth-register]");
  const user = getAuthUser();

  if (registerBtn) {
    registerBtn.hidden = Boolean(user?.email);
  }

  if (loginBtn) {
    if (user?.email) {
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
