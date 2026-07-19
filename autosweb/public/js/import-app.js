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

function verifyFormLoaded() {
  const ok = Boolean(document.getElementById("gyartasi_ev") && document.getElementById("km") && document.getElementById("equipment-sections"));
  if (!ok && formError) {
    formError.hidden = false;
    formError.textContent =
      "Az űrlap nem töltődött be — indítsd újra az Autosweb szervert (autosweb/mac/frissites.command), majd Cmd+Shift+R. Csak http://127.0.0.1:3456/import.html működik.";
  }
  return ok;
}

const adForm = createAdForm({
  mode: "import",
  onApplied: () => {
    formSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  },
});

if (!verifyFormLoaded()) {
  console.error("Import űrlap hiányos — szerver injektálás vagy cache hiba.");
}

async function handleSave() {
  if (!adForm) return;
  if (!verifyFormLoaded()) {
    saveStatus.textContent = "Az űrlap nincs betöltve — indítsd újra az Autosweb-et.";
    saveStatus.className = "import-save-status import-save-status--err";
    return;
  }
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
await refreshDbBadge();

initImportPanel({
  alertOnApply: false,
  onApply: (formData, item) => {
    if (!verifyFormLoaded()) return;
    const enriched = enrichFormFromImportItem(formData, item);
    currentListingId = null;
    setStoredListingId(null);
    adForm?.resetForm();
    formTitle.textContent = item?.cim || item?.url || "Importált hirdetés";
    adForm?.applyFormData(enriched, { fromImport: true });
    saveStatus.textContent = "";
  },
});
