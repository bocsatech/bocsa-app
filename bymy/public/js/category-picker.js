const STORAGE_KEY = "bymy-hirdetes-category";

const ICONS = {
  chevron: `<svg class="cp-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrow: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14.5h2.2l1.3-2.5h7l1.4 2.5H18a2 2 0 0 1 2 2v2.2a1.3 1.3 0 0 1-1.3 1.3h-.7" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7.2" cy="18.7" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="15.5" cy="18.7" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 14.5 6.5 9.8h11L19 14.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
  van: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 15.5V9.2A1.7 1.7 0 0 1 5.2 7.5h8.3L17 11.2h2.3A1.7 1.7 0 0 1 21 12.9v2.6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7.2" cy="17.2" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16.5" cy="17.2" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 15.5h17" stroke="currentColor" stroke-width="1.5"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.8 15.2V7.8h10.4v7.4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.2 10.2h4.2L20 13v2.2h-6.8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6.2" cy="17" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16.6" cy="17" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
  house: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 11.5 12 5l7.5 6.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 10.8V19h10v-8.2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 19v-4.5h4V19" stroke="currentColor" stroke-width="1.7"/></svg>`,
};

const IMMO_TIPUS = [
  { id: "elado", label: "Eladó" },
  { id: "kiado", label: "Kiadó" },
  { id: "berelheto", label: "Bérelhető" },
];

const IMMO_KATEGORIA = [
  { id: "csaladi-haz", label: "Családi házak" },
  { id: "tarsashazi", label: "Társasházi lakások" },
  { id: "sorhaz", label: "Sorházak" },
  { id: "garazs", label: "Garázsok" },
  { id: "ipari", label: "Ipari ingatlanok" },
  { id: "telek", label: "Telkek" },
  { id: "nyaralo", label: "Nyaralók" },
  { id: "mezogazdasagi", label: "Mezőgazdasági ingatlanok" },
];

function labelList(ids, catalog) {
  if (!ids?.length) return "Mindegy";
  return ids
    .map((id) => catalog.find((x) => x.id === id)?.label)
    .filter(Boolean)
    .join(", ");
}

function readStored() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeStored(value) {
  if (!value) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function initCategoryPicker({ onVehicleSelected, onIngatlanSelected, onReset } = {}) {
  const root = document.getElementById("category-picker");
  if (!root) return null;

  const pickerShell = document.getElementById("category-picker-shell");
  const wizardShell = document.getElementById("ad-wizard-shell");
  const stepsBar = document.getElementById("wizard-steps-bar");
  const contextBar = document.getElementById("wizard-context-bar");
  const contextLabel = document.getElementById("wizard-context-label");
  const changeBtn = document.getElementById("wizard-change-category");
  const stub = document.getElementById("ingatlan-stub");
  const stubSummary = document.getElementById("ingatlan-stub-summary");
  const stubBack = document.getElementById("ingatlan-stub-back");

  const state = {
    open: "auto",
    immoTipus: [],
    immoKategoria: [],
    sheet: null,
  };

  const stored = readStored();
  if (stored?.immoTipus) state.immoTipus = stored.immoTipus;
  if (stored?.immoKategoria) state.immoKategoria = stored.immoKategoria;

  root.innerHTML = `
    <header class="category-picker-head">
      <h1>Hirdetés feladás</h1>
      <p>Milyen hirdetést adsz fel?</p>
    </header>
    <div class="cp-stack" role="list">
      <section class="cp-group" data-accent="car" data-group="auto" role="listitem">
        <button type="button" class="cp-group-toggle" data-toggle-group="auto" aria-expanded="true">
          <img class="cp-group-thumb" src="/images/categories/benzin.jpg" alt="" width="52" height="52" />
          <span class="cp-group-copy">
            <strong>Autó hirdetés</strong>
            <span>Személyautó és más</span>
          </span>
          ${ICONS.chevron}
        </button>
        <div class="cp-group-body" data-group-body="auto">
          <button type="button" class="cp-option" data-pick='{"vertical":"auto","subtype":"szemelyauto","label":"Személyautó"}'>
            <span class="cp-option-bar" aria-hidden="true"></span>
            <span class="cp-option-icon">${ICONS.car}</span>
            <span class="cp-option-copy"><strong>Személyautó</strong></span>
            <span class="cp-option-trail">${ICONS.arrow}</span>
          </button>
          <button type="button" class="cp-option is-soon" disabled aria-disabled="true">
            <span class="cp-option-bar" aria-hidden="true"></span>
            <span class="cp-option-icon">${ICONS.car}</span>
            <span class="cp-option-copy"><strong>Leasing hirdetés</strong></span>
            <span class="cp-option-trail"><span class="cp-soon">Hamarosan</span></span>
          </button>
          <button type="button" class="cp-option is-soon" disabled aria-disabled="true">
            <span class="cp-option-bar" aria-hidden="true"></span>
            <span class="cp-option-icon">${ICONS.car}</span>
            <span class="cp-option-copy"><strong>Bérautó hirdetés</strong></span>
            <span class="cp-option-trail"><span class="cp-soon">Hamarosan</span></span>
          </button>
          <button type="button" class="cp-option is-soon" disabled aria-disabled="true">
            <span class="cp-option-bar" aria-hidden="true"></span>
            <span class="cp-option-icon">${ICONS.van}</span>
            <span class="cp-option-copy"><strong>Bérelhető lakókocsi hirdetés</strong></span>
            <span class="cp-option-trail"><span class="cp-soon">Hamarosan</span></span>
          </button>
        </div>
      </section>

      <section class="cp-group" data-accent="truck" data-group="teher" role="listitem">
        <button type="button" class="cp-group-toggle" data-toggle-group="teher" aria-expanded="false">
          <img class="cp-group-thumb" src="/images/categories/diesel.png" alt="" width="52" height="52" />
          <span class="cp-group-copy">
            <strong>Teherautó hirdetés</strong>
            <span>Kisteher és teherautó</span>
          </span>
          ${ICONS.chevron}
        </button>
        <div class="cp-group-body" data-group-body="teher">
          <button type="button" class="cp-option" data-pick='{"vertical":"teher","subtype":"kisteher","label":"Kisteher 3,5 t-ig"}'>
            <span class="cp-option-bar" aria-hidden="true"></span>
            <span class="cp-option-icon">${ICONS.van}</span>
            <span class="cp-option-copy">
              <strong>Kisteher 3,5 t-ig</strong>
              <span>Max. 3,5 tonna</span>
            </span>
            <span class="cp-option-trail">${ICONS.arrow}</span>
          </button>
          <button type="button" class="cp-option" data-pick='{"vertical":"teher","subtype":"teherauto","label":"Teherautó 3,5 t-tól"}'>
            <span class="cp-option-bar" aria-hidden="true"></span>
            <span class="cp-option-icon">${ICONS.truck}</span>
            <span class="cp-option-copy">
              <strong>Teherautó 3,5 t-tól</strong>
              <span>3,5 tonnától</span>
            </span>
            <span class="cp-option-trail">${ICONS.arrow}</span>
          </button>
        </div>
      </section>

      <section class="cp-group" data-accent="immo" data-group="ingatlan" role="listitem">
        <button type="button" class="cp-group-toggle" data-toggle-group="ingatlan" aria-expanded="false">
          <span class="cp-group-thumb cp-group-thumb--icon" aria-hidden="true">${ICONS.house}</span>
          <span class="cp-group-copy">
            <strong>Ingatlan hirdetések</strong>
            <span>Eladó, kiadó, kategóriák</span>
          </span>
          ${ICONS.chevron}
        </button>
        <div class="cp-group-body" data-group-body="ingatlan">
          <div class="cp-immo-rows">
            <button type="button" class="cp-immo-row" data-open-sheet="tipus">
              <strong>Típus</strong>
              <span class="cp-immo-row-value"><span data-immo-tipus-label>Mindegy</span>${ICONS.arrow}</span>
            </button>
            <button type="button" class="cp-immo-row" data-open-sheet="kategoria">
              <strong>Kategória</strong>
              <span class="cp-immo-row-value"><span data-immo-kat-label>Mindegy</span>${ICONS.arrow}</span>
            </button>
          </div>
          <button type="button" class="cp-immo-continue" data-immo-continue>Tovább az ingatlan feladáshoz</button>
        </div>
      </section>
    </div>
  `;

  const backdrop = document.createElement("div");
  backdrop.className = "cp-sheet-backdrop";
  backdrop.hidden = true;

  const sheet = document.createElement("div");
  sheet.className = "cp-sheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.innerHTML = `
    <div class="cp-sheet-bar">
      <button type="button" data-sheet-back>Vissza</button>
      <h2 data-sheet-title>Típus</h2>
      <button type="button" data-sheet-done>Kész</button>
    </div>
    <div class="cp-sheet-body">
      <p class="cp-sheet-label" data-sheet-section>TÍPUS</p>
      <button type="button" class="cp-sheet-clear" data-sheet-clear>Összes kikapcsolása</button>
      <div class="cp-toggle-list" data-sheet-list></div>
    </div>
  `;

  document.body.append(backdrop, sheet);

  function syncOpenGroups() {
    root.querySelectorAll(".cp-group").forEach((group) => {
      const id = group.getAttribute("data-group");
      const open = state.open === id;
      group.classList.toggle("is-open", open);
      const toggle = group.querySelector("[data-toggle-group]");
      if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function syncImmoLabels() {
    const tipusEl = root.querySelector("[data-immo-tipus-label]");
    const katEl = root.querySelector("[data-immo-kat-label]");
    if (tipusEl) tipusEl.textContent = labelList(state.immoTipus, IMMO_TIPUS);
    if (katEl) katEl.textContent = labelList(state.immoKategoria, IMMO_KATEGORIA);
  }

  function setHiddenFields(selection) {
    const map = {
      hirdetes_vertical: selection?.vertical || "",
      hirdetes_alkategoria: selection?.subtype || "",
      ingatlan_tipus: (selection?.immoTipus || []).join(","),
      ingatlan_kategoria: (selection?.immoKategoria || []).join(","),
    };
    for (const [id, value] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
  }

  function showPicker() {
    pickerShell?.removeAttribute("hidden");
    wizardShell?.setAttribute("hidden", "");
    stepsBar?.setAttribute("hidden", "");
    contextBar?.setAttribute("hidden", "");
    stub?.setAttribute("hidden", "");
    writeStored(null);
    setHiddenFields(null);
    onReset?.();
  }

  function showVehicleWizard(selection) {
    writeStored(selection);
    setHiddenFields(selection);
    pickerShell?.setAttribute("hidden", "");
    stub?.setAttribute("hidden", "");
    wizardShell?.removeAttribute("hidden");
    stepsBar?.removeAttribute("hidden");
    if (contextBar && contextLabel) {
      contextBar.removeAttribute("hidden");
      const group =
        selection.vertical === "teher" ? "Teherautó" : "Autó";
      contextLabel.textContent = `${group} · ${selection.label}`;
    }
    onVehicleSelected?.(selection);
  }

  function showIngatlanStub(selection) {
    writeStored(selection);
    setHiddenFields(selection);
    pickerShell?.setAttribute("hidden", "");
    wizardShell?.setAttribute("hidden", "");
    stepsBar?.setAttribute("hidden", "");
    contextBar?.setAttribute("hidden", "");
    if (stub && stubSummary) {
      stub.removeAttribute("hidden");
      const tipus = labelList(selection.immoTipus, IMMO_TIPUS);
      const kat = labelList(selection.immoKategoria, IMMO_KATEGORIA);
      stubSummary.textContent = `Típus: ${tipus}. Kategória: ${kat}. Az ingatlan űrlap hamarosan érkezik — a választásod elmentve.`;
    }
    onIngatlanSelected?.(selection);
  }

  function closeSheet() {
    state.sheet = null;
    sheet.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("cp-sheet-open");
    window.setTimeout(() => {
      sheet.hidden = true;
      backdrop.hidden = true;
    }, 200);
  }

  function openSheet(kind) {
    state.sheet = kind;
    const catalog = kind === "tipus" ? IMMO_TIPUS : IMMO_KATEGORIA;
    const selected = kind === "tipus" ? state.immoTipus : state.immoKategoria;
    sheet.querySelector("[data-sheet-title]").textContent =
      kind === "tipus" ? "Típus" : "Kategória";
    sheet.querySelector("[data-sheet-section]").textContent =
      kind === "tipus" ? "TÍPUS" : "KATEGÓRIA";
    const list = sheet.querySelector("[data-sheet-list]");
    list.innerHTML = catalog
      .map(
        (item) => `
      <label class="cp-toggle-row">
        <span>${item.label}</span>
        <span class="cp-switch">
          <input type="checkbox" value="${item.id}" ${selected.includes(item.id) ? "checked" : ""} />
          <span></span>
        </span>
      </label>`
      )
      .join("");
    sheet.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      sheet.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("cp-sheet-open");
    });
  }

  function applySheet() {
    if (!state.sheet) return;
    const checked = [...sheet.querySelectorAll('input[type="checkbox"]:checked')].map(
      (el) => el.value
    );
    if (state.sheet === "tipus") state.immoTipus = checked;
    else state.immoKategoria = checked;
    syncImmoLabels();
    closeSheet();
  }

  root.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-group]");
    if (toggle) {
      const id = toggle.getAttribute("data-toggle-group");
      state.open = state.open === id ? null : id;
      syncOpenGroups();
      return;
    }

    const pick = event.target.closest("[data-pick]");
    if (pick) {
      root.querySelectorAll(".cp-option.is-active").forEach((el) => el.classList.remove("is-active"));
      pick.classList.add("is-active");
      let payload;
      try {
        payload = JSON.parse(pick.getAttribute("data-pick"));
      } catch {
        return;
      }
      showVehicleWizard(payload);
      return;
    }

    const openSheetBtn = event.target.closest("[data-open-sheet]");
    if (openSheetBtn) {
      openSheet(openSheetBtn.getAttribute("data-open-sheet"));
      return;
    }

    if (event.target.closest("[data-immo-continue]")) {
      showIngatlanStub({
        vertical: "ingatlan",
        subtype: "ingatlan",
        label: "Ingatlan",
        immoTipus: [...state.immoTipus],
        immoKategoria: [...state.immoKategoria],
      });
    }
  });

  sheet.querySelector("[data-sheet-back]").addEventListener("click", closeSheet);
  sheet.querySelector("[data-sheet-done]").addEventListener("click", applySheet);
  sheet.querySelector("[data-sheet-clear]").addEventListener("click", () => {
    sheet.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.checked = false;
    });
  });
  backdrop.addEventListener("click", closeSheet);

  changeBtn?.addEventListener("click", () => {
    showPicker();
    syncOpenGroups();
  });
  stubBack?.addEventListener("click", () => {
    showPicker();
    state.open = "ingatlan";
    syncOpenGroups();
  });

  syncOpenGroups();
  syncImmoLabels();

  // Restore previous vehicle selection only if user refreshed mid-flow
  if (stored?.vertical === "auto" || stored?.vertical === "teher") {
    showVehicleWizard(stored);
  } else if (stored?.vertical === "ingatlan") {
    showIngatlanStub(stored);
  } else {
    showPicker();
  }

  return {
    reset: showPicker,
    getSelection: () => readStored(),
  };
}
