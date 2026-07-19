import { initImportPanel } from "./import.js";
import { saveListingToDb, setStoredListingId, getStoredListingId } from "./db-client.js";

const STEP_TITLES = {
  1: "Alapadatok",
  2: "Műszaki adatok",
  3: "Extrák",
  5: "Hirdetés",
};

const cellsCard = document.getElementById("import-cells-card");
const cellsGrid = document.getElementById("import-cells-grid");
const cellsTitle = document.getElementById("import-cells-title");
const extrasInput = document.getElementById("import-extras-input");
const saveBtn = document.getElementById("import-save-btn");
const saveStatus = document.getElementById("import-save-status");
const dbBadge = document.getElementById("import-db-badge");

let currentCells = [];
let currentFormData = {};
let currentListingId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function groupCellsByStep(cells) {
  const groups = new Map();
  for (const cell of cells) {
    const step = cell.step ?? 1;
    if (!groups.has(step)) groups.set(step, []);
    groups.get(step).push(cell);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}

function enrichFormFromImportItem(formData, item) {
  const data = { ...(formData ?? {}) };
  if ((!data.km || String(data.km).trim() === "") && item?.km) {
    const digits = String(item.km).replace(/[^\d]/g, "");
    if (digits) data.km = digits;
  }
  if (item?.url && !data.forras_url) data.forras_url = item.url;
  if (item?.id && !data.hasznaltauto_hirdetes_id) data.hasznaltauto_hirdetes_id = String(item.id);
  return data;
}

function formDataToDisplayCells(formData) {
  const cells = [];

  for (const def of fieldDefs) {
    const value = formData[def.field_key];
    if (value == null || String(value).trim() === "") continue;
    cells.push({
      field_key: def.field_key,
      label: def.label,
      value: String(value).trim(),
      step: def.step,
    });
  }

  for (const item of formData.felszereltseg ?? []) {
    const text = String(item).trim();
    if (!text) continue;
    cells.push({
      field_key: `extra:${text}`,
      label: text,
      value: "1",
      step: 3,
    });
  }

  return cells;
}

function renderCells(cells, title) {
  currentCells = cells.filter((c) => !c.field_key?.startsWith("extra:"));
  const extras = cells.filter((c) => c.field_key?.startsWith("extra:")).map((c) => c.label);

  cellsTitle.textContent = title || "Importált adatok";
  cellsGrid.innerHTML = "";

  for (const [step, stepCells] of groupCellsByStep(currentCells)) {
    const section = document.createElement("section");
    section.className = "import-cells-step";
    section.innerHTML = `<h3 class="import-cells-step-title">${escapeHtml(STEP_TITLES[step] ?? `Lépés ${step}`)}</h3>`;

    const grid = document.createElement("div");
    grid.className = "import-cells-grid";

    for (const cell of stepCells) {
      const row = document.createElement("div");
      row.className = "import-cell-row";
      const isLong = cell.field_key === "leiras" || String(cell.value).length > 80;
      row.innerHTML = `
        <label class="import-cell-label">${escapeHtml(cell.label)}</label>
        ${isLong
          ? `<textarea data-field-key="${escapeHtml(cell.field_key)}" rows="3">${escapeHtml(cell.value)}</textarea>`
          : `<input type="text" data-field-key="${escapeHtml(cell.field_key)}" value="${escapeHtml(cell.value)}" />`}
      `;
      grid.appendChild(row);
    }

    section.appendChild(grid);
    cellsGrid.appendChild(section);
  }

  extrasInput.value = extras.join("\n");
  cellsCard.classList.remove("hidden");
  saveStatus.textContent = "";
  cellsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectFormDataFromGrid() {
  const data = { ...currentFormData };
  for (const input of cellsGrid.querySelectorAll("[data-field-key]")) {
    const key = input.dataset.fieldKey;
    const value = input.value.trim();
    if (value) data[key] = value;
    else delete data[key];
  }

  const extras = extrasInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (extras.length) data.felszereltseg = extras;
  else delete data.felszereltseg;

  return data;
}

async function handleSave() {
  saveBtn.disabled = true;
  saveStatus.textContent = "Mentés…";
  saveStatus.className = "import-save-status";

  try {
    const formData = collectFormDataFromGrid();
    const saved = await saveListingToDb(formData, currentListingId ?? getStoredListingId());
    currentListingId = saved?.id ?? currentListingId;
    currentFormData = formData;
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

let fieldDefs = [];

async function loadFieldDefs() {
  const response = await fetch("/api/field-defs");
  const data = await response.json();
  fieldDefs = data.fields ?? [];
}

saveBtn?.addEventListener("click", handleSave);

await loadFieldDefs();
await refreshDbBadge();

initImportPanel({
  alertOnApply: false,
  onApply: (formData, item) => {
    const enriched = enrichFormFromImportItem(formData, item);
    currentFormData = enriched;
    currentListingId = null;
    setStoredListingId(null);
    const cells = formDataToDisplayCells(enriched);
    renderCells(cells, item?.cim || item?.url || "Importált hirdetés");
  },
  onSelected: (item) => {
    if (!item.form?.km && item.km) {
      console.info(`Km a listából: ${item.km}`);
    }
  },
});
