import { loadAdFormPartial } from "./load-ad-form.js";
import { createAdForm } from "./form-core.js";
import { initImportPanel } from "./import.js";
import { enrichFormFromImportItem } from "./import-enrich.js";
import {
  saveListingToDb,
  setStoredListingId,
  getStoredListingId,
  fetchListing,
  fetchDbStats,
} from "./db-client.js";

const EMBEDDED_VERSION = document.querySelector('meta[name="autosweb-version"]')?.content ?? "";
const SERVER_RESTART_MSG =
  "Régi Autosweb szerver fut — állítsd le (Ctrl+C), majd indítsd újra: ~/Desktop/Autosweb-indito.command (vagy autosweb/mac/frissites.command után újraindítás).";

const formSection = document.getElementById("import-form-section");
const formTitle = document.getElementById("import-form-title");
const formError = document.getElementById("import-form-error");
const topAlert = document.getElementById("import-top-alert");
const saveBtn = document.getElementById("import-save-btn");
const saveStatus = document.getElementById("import-save-status");
const dbBadge = document.getElementById("import-db-badge");

let currentListingId = null;
let adForm = null;
let serverReady = false;

function showTopAlert(message, type = "err") {
  if (!topAlert) {
    showFormError(message);
    return;
  }
  topAlert.hidden = false;
  topAlert.textContent = message;
  topAlert.dataset.alertType = type;
  topAlert.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function hideTopAlert() {
  if (topAlert) topAlert.hidden = true;
}

function showFormError(message) {
  if (!formError) return;
  formError.hidden = false;
  formError.textContent = message;
  formError.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function setSaveStatus(message, type = "") {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.className = type ? `import-save-status import-save-status--${type}` : "import-save-status";
}

function setSaveBlocked(message) {
  serverReady = false;
  if (saveBtn) saveBtn.disabled = true;
  showTopAlert(message, "err");
  setSaveStatus(message, "err");
}

function setSaveReady() {
  serverReady = true;
  if (saveBtn) saveBtn.disabled = false;
  if (saveStatus?.classList.contains("import-save-status--err")) {
    setSaveStatus("");
  }
}

function setVersionWarning(message) {
  showTopAlert(message, "warn");
  setSaveStatus(message, "err");
}

function verifyFormLoaded() {
  const ok = Boolean(document.getElementById("gyartasi_ev") && document.getElementById("km"));
  if (!ok) {
    showFormError(
      "Az űrlap nem töltődött be. Futtasd: autosweb/mac/frissites.command, indítsd újra az Autosweb-et, majd Cmd+Shift+R."
    );
  } else if (formError) {
    formError.hidden = true;
  }
  return ok;
}

async function checkServerReady() {
  try {
    const healthRes = await fetch("/api/health");
    if (!healthRes.ok) throw new Error("health");
    const health = await healthRes.json();
    const statsRes = await fetch("/api/db/stats");
    if (!statsRes.ok) throw new Error("stats");
    const stats = await statsRes.json();
    if (typeof stats.listings !== "number") throw new Error("stats shape");

    dbBadge.hidden = false;
    dbBadge.textContent = `SQLite: ${stats.listings} hirdetés · ${stats.cells} cella · szerver ${health.version ?? "?"}`;

    if (EMBEDDED_VERSION && health.version && health.version !== EMBEDDED_VERSION) {
      setVersionWarning(
        `Verzió eltérés (${EMBEDDED_VERSION} ≠ ${health.version}) — frissites.command → újraindítás → Cmd+Shift+R.`
      );
    } else {
      hideTopAlert();
    }

    setSaveReady();
    return true;
  } catch {
    setSaveBlocked(SERVER_RESTART_MSG);
    return false;
  }
}

async function initPage() {
  const loaded = await loadAdFormPartial();
  if (!loaded) {
    showFormError(
      "Az űrlap fájl hiányzik. Frissíts (frissites.command), indítsd újra az Autosweb-et. URL: http://127.0.0.1:3456/import.html"
    );
    return;
  }

  adForm = createAdForm({
    mode: "import",
    onApplied: () => {
      formSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  });

  verifyFormLoaded();
  await checkServerReady();
  setInterval(checkServerReady, 15000);

  initImportPanel({
    alertOnApply: false,
    onApply: (formData, item) => {
      if (!verifyFormLoaded() || !adForm) return;
      const enriched = enrichFormFromImportItem(formData, item);
      currentListingId = null;
      setStoredListingId(null);
      adForm.resetForm();
      formTitle.textContent = item?.cim || item?.url || "Importált hirdetés";
      adForm.applyFormData(enriched, { fromImport: true });
      if (saveStatus && !serverReady) {
        setSaveStatus(SERVER_RESTART_MSG, "err");
      } else if (saveStatus) {
        setSaveStatus("");
      }
    },
  });

  await loadListingFromUrl();
}

async function loadListingFromUrl() {
  const params = new URLSearchParams(location.search);
  const listingId = Number(params.get("listing"));
  if (!Number.isFinite(listingId) || listingId <= 0 || !adForm) return;

  try {
    const listing = await fetchListing(listingId);
    if (!listing?.form) return;
    currentListingId = listing.id;
    setStoredListingId(listing.id);
    formTitle.textContent = listing.hirdetes_cime || `Hirdetés #${listing.id}`;
    adForm.applyFormData(listing.form, { fromImport: true });
    formSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showFormError(error.message ?? "Hirdetés betöltése sikertelen.");
  }
}

async function handleSave() {
  if (!adForm || !verifyFormLoaded()) return;
  if (!serverReady) {
    showTopAlert(SERVER_RESTART_MSG, "err");
    setSaveStatus(SERVER_RESTART_MSG, "err");
    return;
  }

  saveBtn.disabled = true;
  setSaveStatus("Mentés…");

  try {
    const formData = adForm.collectFormData();
    const saved = await saveListingToDb(formData, currentListingId ?? getStoredListingId(), {
      status: "mentett",
    });
    currentListingId = saved?.id ?? currentListingId;
    hideTopAlert();
    setSaveStatus(
      `Mentve (#${saved?.id ?? "?"}, ${saved?.cells?.length ?? 0} cella) — megtekintés: /listings.html?id=${saved?.id ?? ""}`,
      "ok"
    );
    await checkServerReady();
  } catch (error) {
    const message = error.message ?? "Mentés sikertelen";
    showTopAlert(message, "err");
    setSaveStatus(message, "err");
    await checkServerReady();
  } finally {
    if (serverReady) saveBtn.disabled = false;
  }
}

saveBtn?.addEventListener("click", handleSave);
await initPage();
