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
const yearSelect = document.getElementById("ev");

let currentStep = 1;

function fillYears() {
  const now = new Date().getFullYear();
  for (let year = now; year >= 1980; year -= 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.appendChild(option);
  }
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
  if (step === 2) nextBtn.textContent = "Tovább a képek kezeléséhez";
  if (step === 3) nextBtn.textContent = "Hirdetés feladása kiemelés nélkül";
}

function collectFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.extras = [...form.querySelectorAll('input[name="extra"]:checked')].map((el) => el.value);
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
      if (key === "extras") continue;
      const field = form.elements.namedItem(key);
      if (!field) continue;
      if (field instanceof RadioNodeList) {
        [...field].forEach((node) => {
          node.checked = node.value === value;
        });
      } else if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }
    }
    for (const extra of data.extras ?? []) {
      const box = form.querySelector(`input[name="extra"][value="${extra}"]`);
      if (box) box.checked = true;
    }
    syncPackageSelection();
  } catch {
    /* ignore */
  }
}

function validateStep(step) {
  if (step !== 1) return true;
  const required = ["kategoria", "marka", "modell", "ev", "km", "ar", "telefon"];
  for (const name of required) {
    const field = form.elements.namedItem(name);
    const value = field?.value?.trim?.() ?? "";
    if (!value) {
      field?.focus();
      alert("Kérjük, töltsd ki a kötelező mezőket.");
      return false;
    }
  }
  return true;
}

function buildSummary() {
  const data = collectFormData();
  summaryText.textContent = `${data.marka} ${data.modell} · ${data.ev} · ${Number(data.km).toLocaleString("hu-HU")} km · ${Number(data.ar).toLocaleString("hu-HU")} Ft`;
}

function syncPackageSelection() {
  document.querySelectorAll(".package").forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle("selected", radio?.checked);
  });
}

function renderPhotoPreview(files) {
  photoGrid.innerHTML = "";
  const list = [...files].slice(0, 12);
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

backBtn.addEventListener("click", () => {
  if (currentStep > 1) showStep(currentStep - 1);
});

nextBtn.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  saveDraft();

  if (currentStep < 4) {
    if (currentStep === 3) buildSummary();
    showStep(currentStep + 1);
    return;
  }
});

newAdBtn.addEventListener("click", () => {
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  renderPhotoPreview([]);
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

fillYears();
restoreDraft();
showStep(1);
