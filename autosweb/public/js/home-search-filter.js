const FEATURE_CHECKS = [
  { id: "automata", label: "automata", match: (item) => hasBadgeOrText(item, ["AUTOMATA", "automata"]) },
  { id: "tempomat", label: "tempomat", match: (item) => hasBadgeOrText(item, ["TEMPOMAT", "tempomat"]) },
  { id: "osszker", label: "összkerékmeghajtás", match: (item) => hasBadgeOrText(item, ["4WD", "összkerék", "4x4"]) },
  { id: "alufelni", label: "alufelni", match: (item) => hasBadgeOrText(item, ["ALUFELNI", "alufelni"]) },
  { id: "elektromos_ablak", label: "elektromos ablak", match: (item) => hasBadgeOrText(item, ["elektromos ablak"]) },
  { id: "vonohorog", label: "vonóhorog", match: (item) => hasBadgeOrText(item, ["VONÓHOROG", "vonóhorog"]) },
  { id: "isofix", label: "ISOFIX rendszer", match: (item) => hasBadgeOrText(item, ["ISOFIX"]) },
  { id: "esp", label: "ESP (menetstabilizátor)", match: (item) => hasBadgeOrText(item, ["ESP"]) },
  { id: "szervizkonyv", label: "szervizkönyv", match: (item) => hasBadgeOrText(item, ["szervizkönyv"]) },
  { id: "veteran", label: "veterán", match: (item) => hasBadgeOrText(item, ["veterán"]) },
];

function hasBadgeOrText(item, needles) {
  const preview = item.preview ?? {};
  const hay = [
    preview.title,
    preview.leiras,
    preview.specLine,
    ...(preview.badges ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

function readFilters(form) {
  const data = new FormData(form);
  const features = FEATURE_CHECKS.filter(({ id }) => data.get(`feat_${id}`) === "on").map(({ id }) => id);
  return {
    gyartmany: data.get("gyartmany")?.toString() ?? "",
    modell: data.get("modell")?.toString() ?? "",
    kivitel: data.get("kivitel")?.toString() ?? "",
    uzemanyag: data.get("uzemanyag")?.toString() ?? "",
    ev_tol: numOrNull(data.get("ev_tol")),
    ev_ig: numOrNull(data.get("ev_ig")),
    ar_tol: numOrNull(data.get("ar_tol")),
    ar_ig: numOrNull(data.get("ar_ig")),
    tipus: data.get("tipus")?.toString().trim() ?? "",
    km_tol: numOrNull(data.get("km_tol")),
    km_ig: numOrNull(data.get("km_ig")),
    ccm_tol: numOrNull(data.get("ccm_tol")),
    ccm_ig: numOrNull(data.get("ccm_ig")),
    allapot: data.get("allapot")?.toString() ?? "",
    ajtok: data.get("ajtok")?.toString() ?? "",
    ulesek: data.get("ulesek")?.toString() ?? "",
    features,
  };
}

function numOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : null;
}

function inRange(value, min, max) {
  if (value == null) return min == null && max == null;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function filterListingsBySidebar(items, filters) {
  return items.filter((item) => {
    const f = item.preview?.filter ?? {};
    const preview = item.preview ?? {};

    if (filters.gyartmany && f.gyartmany !== filters.gyartmany) return false;
    if (filters.modell && f.modell !== filters.modell) return false;
    if (filters.kivitel && f.kivitel !== filters.kivitel) return false;
    if (filters.uzemanyag && f.uzemanyag !== filters.uzemanyag) return false;
    if (filters.allapot && f.allapot !== filters.allapot) return false;
    if (filters.ajtok && f.ajtok !== filters.ajtok) return false;
    if (filters.ulesek && f.ulesek !== filters.ulesek) return false;

    if (filters.tipus) {
      const hay = [f.tipus, preview.title, preview.specLine].join(" ").toLowerCase();
      if (!hay.includes(filters.tipus.toLowerCase())) return false;
    }

    if (!inRange(f.gyartasi_ev, filters.ev_tol, filters.ev_ig)) return false;
    if (!inRange(preview.priceNum, filters.ar_tol, filters.ar_ig)) return false;
    if (!inRange(preview.kmNum, filters.km_tol, filters.km_ig)) return false;
    if (!inRange(f.hengerurtartalom, filters.ccm_tol, filters.ccm_ig)) return false;

    for (const feat of filters?.features ?? []) {
      const rule = FEATURE_CHECKS.find((entry) => entry.id === feat);
      if (rule && !rule.match(item)) return false;
    }

    return true;
  });
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "hu"));
}

function fillSelect(select, values, emptyLabel = "Mindegy") {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${emptyLabel}</option>`;
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  if (current && values.includes(current)) select.value = current;
}

export function populateFilterOptions(items) {
  const filters = items.map((item) => item.preview?.filter ?? {});
  fillSelect(document.getElementById("filter-gyartmany"), uniqueSorted(filters.map((f) => f.gyartmany)));
  fillSelect(document.getElementById("filter-modell"), uniqueSorted(filters.map((f) => f.modell)));
  fillSelect(document.getElementById("filter-kivitel"), uniqueSorted(filters.map((f) => f.kivitel)));
  fillSelect(document.getElementById("filter-uzemanyag"), uniqueSorted(filters.map((f) => f.uzemanyag)));
  fillSelect(document.getElementById("filter-allapot"), uniqueSorted(filters.map((f) => f.allapot)));
  fillSelect(document.getElementById("filter-ajtok"), uniqueSorted(filters.map((f) => f.ajtok)));
  fillSelect(document.getElementById("filter-ulesek"), uniqueSorted(filters.map((f) => f.ulesek)));
}

export function emptyFilters() {
  return {
    gyartmany: "",
    modell: "",
    kivitel: "",
    uzemanyag: "",
    ev_tol: null,
    ev_ig: null,
    ar_tol: null,
    ar_ig: null,
    tipus: "",
    km_tol: null,
    km_ig: null,
    ccm_tol: null,
    ccm_ig: null,
    allapot: "",
    ajtok: "",
    ulesek: "",
    features: [],
  };
}

export function initHomeSearchSidebar(onChange) {
  const form = document.getElementById("home-filter-form");
  if (!form) return () => emptyFilters();

  const trigger = () => onChange(readFilters(form));

  form.addEventListener("input", trigger);
  form.addEventListener("change", trigger);

  document.getElementById("filter-reset")?.addEventListener("click", (event) => {
    event.preventDefault();
    form.reset();
    trigger();
  });

  return () => readFilters(form);
}

export { FEATURE_CHECKS };
