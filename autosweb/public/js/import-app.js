import { loadAdFormPartial } from "./load-ad-form.js";
import { createAdForm } from "./form-core.js";
import { initImportPanel } from "./import.js";
import { enrichFormFromImportItem } from "./import-enrich.js";
import { saveListingToDb, setStoredListingId, getStoredListingId } from "./db-client.js";

const formSection = document.getElementById("import-form-section");
const formTitle = document.getElementById("import-form-title");
const formError = document.getElementById("import-form-error");
const saveBtn = document.getElementById("import-save-btn");
const saveStatus = document.getElementById("import-save-status");
const dbBadge = document.getElementById("import-db-badge");

let currentListingId = null;
let adForm = null;

function showFormError(message) {
  if (!formError) return;
  formError.hidden = false;
  formError.textContent = message;
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
  await refreshDbBadge();

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
      saveStatus.textContent = "";
    },
  });
}

async function handleSave() {
  if (!adForm || !verifyFormLoaded()) return;
  saveBtn.disabled = true;
  saveStatus.textContent = "Mentés…";
  saveStatus.className = "import-save-status";

  try {
    const formData = adForm.collectFormData();
    const saved = await saveListingToDb(formData, currentListingId ?? getStoredListingId());
    currentListingId = saved?.id ?? currentListingId;
    saveStatus.textContent = `Mentve (#${saved?.id ?? "?"}, ${saved?.cells?.length ?? 0} cella)`;
    saveStatus.className = "import-save-status import-save-status--ok";
    await refreshDbBadge();
  } catch (error) {
    saveStatus.textContent = error.message ?? "Mentés sikertelen";
    saveStatus.className = "import-save-status import-save-status--err";
  } finally {
    saveBtn.disabled = false;
  }
}

async function refreshDbBadge() {
  try {
    const response = await fetch("/api/db/stats");
    if (!response.ok) return;
    const stats = await response.json();
    dbBadge.hidden = false;
    dbBadge.textContent = `SQLite: ${stats.listings} hirdetés · ${stats.cells} cella`;
  } catch {
    /* ignore */
  }
}

saveBtn?.addEventListener("click", handleSave);
await initPage();
