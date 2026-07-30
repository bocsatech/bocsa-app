/** Beállítások oldal — profil, jelszó, értesítések. */

import {
  getAuthUser,
  getDisplayName,
  setDisplayName,
  changePassword,
  deleteAccount,
  requireAuthForPage,
  initSiteAuth,
  logout,
} from "./site-auth.js";

const PHOTO_KEY = "autosweb-avatar-photos";
const NOTIFY_KEY = "autosweb-notify-prefs";
const MAX_BYTES = 2.5 * 1024 * 1024;
const AVATAR_SIZE = 256;

function readPhotos() {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePhotos(map) {
  localStorage.setItem(PHOTO_KEY, JSON.stringify(map));
}

function readNotifyPrefs(email) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFY_KEY) || "{}");
    return {
      messages: true,
      favorites: true,
      interests: true,
      newsletter: false,
      ...(all[email] ?? {}),
    };
  } catch {
    return { messages: true, favorites: true, interests: true, newsletter: false };
  }
}

function writeNotifyPrefs(email, prefs) {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(NOTIFY_KEY) || "{}");
  } catch {
    all = {};
  }
  all[email] = prefs;
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(all));
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      reject(new Error("Csak JPG, PNG vagy WebP tölthető fel."));
      return;
    }
    if (file.size > MAX_BYTES) {
      reject(new Error("A kép maximum 2,5 MB lehet."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("A képet nem sikerült beolvasni."));
    };
    img.src = url;
  });
}

function showFlash(el, message, ok = true) {
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.classList.toggle("settings-flash--ok", ok);
  el.classList.toggle("settings-flash--err", !ok);
}

function refreshProfileUi(user) {
  const emailEl = document.getElementById("settings-email");
  const nameInput = document.getElementById("settings-display-name");
  const letterEl = document.getElementById("settings-avatar-letter");
  const imgEl = document.getElementById("settings-avatar-img");
  if (emailEl) emailEl.textContent = user.email;
  if (nameInput) nameInput.value = getDisplayName();

  const photo = readPhotos()[user.email];
  const letter = (user.email.charAt(0) || "A").toUpperCase();
  if (letterEl) {
    letterEl.textContent = letter;
    letterEl.hidden = Boolean(photo);
  }
  if (imgEl) {
    if (photo) {
      imgEl.src = photo;
      imgEl.hidden = false;
    } else {
      imgEl.removeAttribute("src");
      imgEl.hidden = true;
    }
  }
}

function initNotifyForm(email) {
  const form = document.getElementById("settings-notify-form");
  if (!form) return;
  const prefs = readNotifyPrefs(email);
  for (const [key, value] of Object.entries(prefs)) {
    const input = form.elements.namedItem(key);
    if (input && "checked" in input) input.checked = Boolean(value);
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = {
      messages: Boolean(form.messages?.checked),
      favorites: Boolean(form.favorites?.checked),
      interests: Boolean(form.interests?.checked),
      newsletter: Boolean(form.newsletter?.checked),
    };
    writeNotifyPrefs(email, next);
    showFlash(document.getElementById("settings-notify-flash"), "Értesítési beállítások mentve.", true);
  });
}

export function initSettingsPage() {
  requireAuthForPage();
  const user = getAuthUser();
  if (!user?.email) return;

  refreshProfileUi(user);
  initNotifyForm(user.email);

  document.getElementById("settings-profile-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const flash = document.getElementById("settings-profile-flash");
    try {
      const name = new FormData(event.currentTarget).get("display_name");
      setDisplayName(name);
      window.dispatchEvent(new CustomEvent("autosweb-auth-changed"));
      showFlash(flash, "Megjelenített név mentve.", true);
    } catch (error) {
      showFlash(flash, error.message ?? "Mentés sikertelen.", false);
    }
  });

  document.getElementById("settings-password-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const flash = document.getElementById("settings-password-flash");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      changePassword(data.get("current_password"), data.get("new_password"), data.get("new_password_confirm"));
      form.reset();
      showFlash(flash, "Jelszó sikeresen módosítva.", true);
    } catch (error) {
      showFlash(flash, error.message ?? "Jelszó módosítás sikertelen.", false);
    }
  });

  const fileInput = document.getElementById("settings-avatar-file");
  document.getElementById("settings-avatar-upload")?.addEventListener("click", () => fileInput?.click());
  document.getElementById("settings-avatar-remove")?.addEventListener("click", () => {
    const map = readPhotos();
    delete map[user.email];
    writePhotos(map);
    refreshProfileUi(user);
    window.dispatchEvent(new CustomEvent("autosweb-auth-changed"));
    showFlash(document.getElementById("settings-avatar-flash"), "Profilkép törölve.", true);
  });
  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    const flash = document.getElementById("settings-avatar-flash");
    try {
      const dataUrl = await resizeImageFile(file);
      const map = readPhotos();
      map[user.email] = dataUrl;
      writePhotos(map);
      refreshProfileUi(user);
      window.dispatchEvent(new CustomEvent("autosweb-auth-changed"));
      showFlash(flash, "Profilkép feltöltve.", true);
    } catch (error) {
      showFlash(flash, error.message ?? "Feltöltés sikertelen.", false);
    }
  });

  document.getElementById("settings-delete-account")?.addEventListener("click", () => {
    const ok = window.confirm(
      "Biztosan törölni szeretnéd a fiókodat? Ez a helyi demó-fiókot törli erről a gépről."
    );
    if (!ok) return;
    try {
      deleteAccount();
      window.location.href = "/";
    } catch (error) {
      window.alert(error.message ?? "Törlés sikertelen.");
    }
  });

  document.getElementById("settings-logout")?.addEventListener("click", () => {
    logout();
    window.location.href = "/";
  });
}

initSiteAuth();
initSettingsPage();
