import { UZEMANYAG_CATEGORIES, EQUIPMENT_SECTIONS, KLIM_OPTIONS } from "./equipment-data.js";

const STORAGE_KEY = "hirdetes-local-draft";
const form = document.getElementById("ad-form");
const panels = [...document.querySelectorAll(".step-panel")];
const indicators = [...document.querySelectorAll("[data-step-indicator]")];
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");
const footerActions = document.getElementById("footer-actions");
const uploadZone = document.getElementById("upload-zone");
const photoInput = document.getElementById("photo-input");
const photoGrid = document.getElementById("photo-grid");
const summaryText = document.getElementById("summary-text");
const newAdBtn = document.getElementById("new-ad-btn");
const gyartasiEv = document.getElementById("gyartasi_ev");
const muszakiEv = document.getElementById("muszaki_ev");
const gyartmany = document.getElementById("gyartmany");
const modell = document.getElementById("modell");
const tipus = document.getElementById("tipus");
const hirdetesCime = document.getElementById("hirdetes_cime");
const teljesitmenyKw = document.getElementById("teljesitmeny_kw");
const leDisplay = document.getElementById("le-display");
const klima = document.getElementById("klima");
const equipmentRoot = document.getElementById("equipment-sections");
const uzemanyag = document.getElementById("uzemanyag");
const fuelMain = document.getElementById("fuel-main");
const fuelSubpanels = document.getElementById("fuel-subpanels");
const fuelSelected = document.getElementById("fuel-selected");

let currentStep = 1;

const AUTO_FILL_PRESETS = {
  TESLA: { tipus: "Long Range AWD", hengerurtartalom: "", uzemanyag: "Elektromos", sebessegvalto: "Automata", hajtas: "Összkerék", teljesitmeny_kw: "258" },
  VOLKSWAGEN: { tipus: "1.6 TDI", hengerurtartalom: "1598", uzemanyag: "Diesel", sebessegvalto: "Manuális (6 seb.)", hajtas: "Első kerék", teljesitmeny_kw: "77" },
  TOYOTA: { tipus: "1.8 Hybrid", hengerurtartalom: "1798", uzemanyag: "Benzin/elektromos", sebessegvalto: "Fokozatmentes automata", hajtas: "Első kerék", teljesitmeny_kw: "72" },
};

function fillYearSelect(select) {
  if (!select) return;
  const now = new Date().getFullYear();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "év";
  select.appendChild(empty);
  for (let year = now; year >= 1980; year -= 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    select.appendChild(option);
  }
}

function renderFuelSelector() {
  if (!fuelMain || !fuelSubpanels) return;

  fuelMain.innerHTML = "";
  fuelSubpanels.innerHTML = "";

  for (const category of UZEMANYAG_CATEGORIES) {
    const mainBtn = document.createElement("button");
    mainBtn.type = "button";
    mainBtn.className = "fuel-btn";
    mainBtn.dataset.categoryId = category.id;
    mainBtn.textContent = category.label;

    if (category.children) {
      mainBtn.addEventListener("click", () => toggleFuelPanel(category.id));
    } else {
      mainBtn.addEventListener("click", () => selectFuel(category.value, category.id));
    }

    fuelMain.appendChild(mainBtn);

    if (!category.children) continue;

    const panel = document.createElement("div");
    panel.className = "fuel-subpanel";
    panel.dataset.panelFor = category.id;

    for (const child of category.children) {
      const subBtn = document.createElement("button");
      subBtn.type = "button";
      subBtn.className = "fuel-btn";
      subBtn.dataset.parentId = category.id;
      subBtn.dataset.value = child.value;
      subBtn.textContent = child.label;
      subBtn.addEventListener("click", () => selectFuel(child.value, category.id, child.label));
      panel.appendChild(subBtn);
    }

    fuelSubpanels.appendChild(panel);
  }
}

function toggleFuelPanel(categoryId) {
  const targetPanel = document.querySelector(`.fuel-subpanel[data-panel-for="${categoryId}"]`);
  const willOpen = !targetPanel?.classList.contains("open");

  document.querySelectorAll(".fuel-subpanel").forEach((panel) => panel.classList.remove("open"));
  document.querySelectorAll(".fuel-btn[data-category-id]").forEach((btn) => btn.classList.remove("parent-open"));

  if (willOpen && targetPanel) {
    targetPanel.classList.add("open");
    document.querySelector(`.fuel-btn[data-category-id="${categoryId}"]`)?.classList.add("parent-open");
  }
}

function closeFuelPanels() {
  document.querySelectorAll(".fuel-subpanel").forEach((panel) => panel.classList.remove("open"));
  document.querySelectorAll(".fuel-btn.parent-open").forEach((btn) => btn.classList.remove("parent-open"));
}

function syncFuelButtonState(categoryId, subLabel = null) {
  document.querySelectorAll(".fuel-btn").forEach((btn) => btn.classList.remove("active"));

  if (categoryId) {
    const mainBtn = document.querySelector(`.fuel-btn[data-category-id="${categoryId}"]`);
    mainBtn?.classList.add("active");
  }

  if (subLabel) {
    const subBtn = [...document.querySelectorAll(".fuel-btn[data-parent-id]")].find(
      (btn) => btn.dataset.parentId === categoryId && btn.textContent === subLabel
    );
    subBtn?.classList.add("active");
  }
}

function selectFuel(value, categoryId, subLabel = null) {
  if (!uzemanyag) return;
  uzemanyag.value = value;
  uzemanyag.dataset.userEdited = "1";
  closeFuelPanels();
  syncFuelButtonState(categoryId, subLabel);

  const category = UZEMANYAG_CATEGORIES.find((item) => item.id === categoryId);
  const display = subLabel ? `${category?.label ?? ""} — ${subLabel}` : value;
  if (fuelSelected) fuelSelected.textContent = `Kiválasztva: ${display}`;
  saveDraft();
}

function restoreFuelSelection(value) {
  if (!value) return;

  for (const category of UZEMANYAG_CATEGORIES) {
    if (category.value === value) {
      selectFuel(value, category.id);
      return;
    }
    if (category.children) {
      const child = category.children.find((item) => item.value === value);
      if (child) {
        selectFuel(value, category.id, child.label);
        return;
      }
    }
  }
}

function renderKlimaOptions() {
  for (const option of KLIM_OPTIONS) {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    klima.appendChild(el);
  }
}

function renderEquipment() {
  equipmentRoot.innerHTML = "";
  for (const [key, section] of Object.entries(EQUIPMENT_SECTIONS)) {
    const block = document.createElement("div");
    block.className = "equipment-block";
    block.innerHTML = `<h3>${section.title}</h3>`;
    const grid = document.createElement("div");
    grid.className = "equipment-grid";
    for (const item of section.items) {
      const id = `${key}_${item.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
      const label = document.createElement("label");
      label.className = "check";
      label.innerHTML = `<input type="checkbox" name="felszereltseg" value="${item}" id="${id}" /> ${item}`;
      grid.appendChild(label);
    }
    block.appendChild(grid);
    equipmentRoot.appendChild(block);
  }
}

function applyAutoFill() {
  const preset = AUTO_FILL_PRESETS[gyartmany.value];
  document.querySelectorAll(".auto-filled").forEach((field) => {
    field.classList.remove("auto-filled");
    if (!field.dataset.userEdited) field.value = "";
  });

  if (!preset) return;

  for (const [name, value] of Object.entries(preset)) {
    const field = form.elements.namedItem(name);
    if (!field || field.dataset.userEdited === "1") continue;
    field.value = value;
    if (name !== "uzemanyag") field.classList.add("auto-filled");
  }
  updateLeDisplay();
}

function updateLeDisplay() {
  const kw = Number(teljesitmenyKw.value);
  const le = Number.isFinite(kw) ? Math.round(kw * 1.36) : 0;
  leDisplay.textContent = `(= ${le.toLocaleString("hu-HU")} LE)`;
}

function updateTitle() {
  const parts = [gyartmany.value, modell.value, tipus.value].filter(Boolean);
  const year = gyartasiEv.value;
  hirdetesCime.value = parts.length
    ? `Eladó ${parts.join(" ")}${year ? ` (${year})` : ""}`
    : "";
}

function showStep(step) {
  currentStep = step;
  panels.forEach((panel) => {
    panel.classList.toggle("hidden", Number(panel.dataset.step) !== step);
  });
  indicators.forEach((indicator) => {
    const n = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle("active", n === step);
    indicator.classList.toggle("done", n < step);
  });
  backBtn.classList.toggle("hidden", step <= 1);
  footerActions.classList.toggle("hidden", step === 4);
  if (step === 1) nextBtn.textContent = "Hirdetésfeladás folytatása";
  if (step === 2) nextBtn.textContent = "Tovább az extrákhoz";
  if (step === 3) nextBtn.textContent = "Hirdetés feladása kiemelés nélkül";
}

function collectFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.felszereltseg = [...form.querySelectorAll('input[name="felszereltseg"]:checked')].map((el) => el.value);
  return data;
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData()));
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const [key, value] of Object.entries(data)) {
      if (key === "felszereltseg") continue;
      const field = form.elements.namedItem(key);
      if (!field) continue;
      if (field instanceof RadioNodeList) {
        [...field].forEach((node) => {
          node.checked = node.value === value;
        });
      } else if (field.type === "checkbox") {
        field.checked = value === "1" || value === true || value === "on";
      } else {
        field.value = value;
      }
    }
    for (const item of data.felszereltseg ?? []) {
      const box = [...form.querySelectorAll('input[name="felszereltseg"]')].find((el) => el.value === item);
      if (box) box.checked = true;
    }
    syncPackageSelection();
    updateTitle();
    updateLeDisplay();
    restoreFuelSelection(data.uzemanyag);
  } catch {
    /* ignore */
  }
}

function validateStep(step) {
  if (step !== 1) return true;
  const required = [
    "uzemanyag",
    "gyartasi_ev",
    "gyartmany",
    "modell",
    "tipus",
    "kivitel",
    "allapot",
    "okmany_jelleg",
    "okmany_ervenyesseg",
    "km",
    "vetelar",
    "megye",
    "telepules",
    "telefon1_korzet",
    "telefon1_szam",
  ];
  for (const name of required) {
    const field = form.elements.namedItem(name);
    const value = field?.value?.trim?.() ?? "";
    if (!value) {
      field?.focus();
      alert("Kérjük, töltsd ki a kötelező (*) mezőket.");
      return false;
    }
  }
  return true;
}

function buildSummary() {
  const data = collectFormData();
  const phone = `${data.telefon1_orszag ?? ""} ${data.telefon1_korzet ?? ""} ${data.telefon1_szam ?? ""}`.trim();
  summaryText.textContent = `${data.hirdetes_cime || `${data.gyartmany} ${data.modell}`} · ${Number(data.km).toLocaleString("hu-HU")} km · ${Number(data.vetelar).toLocaleString("hu-HU")} Ft · ${phone}`;
}

function syncPackageSelection() {
  document.querySelectorAll(".package").forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle("selected", radio?.checked);
  });
}

function renderPhotoPreview(files) {
  photoGrid.innerHTML = "";
  const list = [...(files ?? [])].slice(0, 12);
  if (list.length === 0) {
    for (let i = 1; i <= 6; i += 1) {
      const slot = document.createElement("div");
      slot.className = "photo-slot";
      slot.textContent = i === 1 ? "1. főkép" : `${i}.`;
      photoGrid.appendChild(slot);
    }
    return;
  }
  list.forEach((file, index) => {
    const slot = document.createElement("div");
    slot.className = "photo-slot";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "6px";
    slot.appendChild(img);
    if (index === 0) slot.title = "Főkép";
    photoGrid.appendChild(slot);
  });
}

form.querySelectorAll(".auto-filled, #tipus, #hengerurtartalom, #sebessegvalto, #hajtas, #teljesitmeny_kw").forEach((field) => {
  field?.addEventListener("input", () => {
    field.dataset.userEdited = "1";
    field.classList.remove("auto-filled");
  });
});

[gyartmany, modell, tipus, gyartasiEv].forEach((field) => {
  field?.addEventListener("input", updateTitle);
  field?.addEventListener("change", updateTitle);
});

gyartmany?.addEventListener("change", applyAutoFill);
teljesitmenyKw?.addEventListener("input", updateLeDisplay);

backBtn.addEventListener("click", () => {
  if (currentStep > 1) showStep(currentStep - 1);
});

nextBtn.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  saveDraft();
  if (currentStep < 4) {
    if (currentStep === 3) buildSummary();
    showStep(currentStep + 1);
  }
});

newAdBtn.addEventListener("click", () => {
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  renderPhotoPreview([]);
  updateTitle();
  showStep(1);
});

form.addEventListener("input", saveDraft);
form.addEventListener("change", saveDraft);

document.querySelectorAll(".package").forEach((card) => {
  card.addEventListener("click", () => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    syncPackageSelection();
    saveDraft();
  });
});

uploadZone.addEventListener("click", () => photoInput.click());
uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadZone.style.borderColor = "#f57c00";
});
uploadZone.addEventListener("dragleave", () => {
  uploadZone.style.borderColor = "";
});
uploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadZone.style.borderColor = "";
  if (event.dataTransfer?.files?.length) {
    photoInput.files = event.dataTransfer.files;
    renderPhotoPreview(event.dataTransfer.files);
  }
});
photoInput.addEventListener("change", () => {
  if (photoInput.files) renderPhotoPreview(photoInput.files);
});

fillYearSelect(gyartasiEv);
fillYearSelect(muszakiEv);
renderFuelSelector();
renderKlimaOptions();
renderEquipment();
restoreDraft();
renderPhotoPreview([]);
showStep(1);
