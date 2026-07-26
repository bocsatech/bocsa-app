/**
 * Cascading Gyártmány → Modell → Típus (jarmu-katalogus API).
 */

let catalogPromise = null;

export async function fetchJarmuKatalogus({ force = false } = {}) {
  if (!force && catalogPromise) return catalogPromise;
  catalogPromise = fetch(`/api/jarmu-katalogus${force ? "?force=1" : ""}`, { cache: "no-store" })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    })
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

function fillSelect(select, values, emptyLabel, { preserve = true } = {}) {
  if (!select) return;
  const previous = preserve ? select.value : "";
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = emptyLabel;
  select.appendChild(empty);
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  if (previous && values.includes(previous)) {
    select.value = previous;
  } else {
    select.value = "";
  }
}

function resolveBrandKey(tree, brand) {
  if (!brand) return "";
  if (tree[brand]) return brand;
  const upper = brand.toUpperCase();
  if (tree[upper]) return upper;
  const found = Object.keys(tree).find((key) => key.toLowerCase() === brand.toLowerCase());
  return found ?? brand;
}

/**
 * @param {{
 *   brandSelect: HTMLSelectElement|null,
 *   modelSelect: HTMLSelectElement|null,
 *   typeSelect: HTMLSelectElement|null,
 *   emptyBrand?: string,
 *   emptyModel?: string,
 *   emptyType?: string,
 *   onChange?: () => void,
 * }} options
 */
export async function bindVehicleCatalogSelects(options) {
  const {
    brandSelect,
    modelSelect,
    typeSelect,
    emptyBrand = "Válasszon!",
    emptyModel = "Válasszon!",
    emptyType = "Válasszon!",
    onChange,
  } = options;

  if (!brandSelect) return null;

  let catalog;
  try {
    catalog = await fetchJarmuKatalogus();
  } catch (error) {
    console.warn("Járműkatalógus betöltés sikertelen:", error);
    fillSelect(brandSelect, [], emptyBrand, { preserve: false });
    fillSelect(modelSelect, [], emptyModel, { preserve: false });
    fillSelect(typeSelect, [], emptyType, { preserve: false });
    return null;
  }

  if (!catalog.ok) {
    console.warn(catalog.error);
  }

  const tree = catalog.tree ?? {};
  fillSelect(brandSelect, catalog.brands ?? [], emptyBrand);

  function refreshModels({ resetType = true } = {}) {
    const brandKey = resolveBrandKey(tree, brandSelect.value);
    const models = brandKey && tree[brandKey] ? Object.keys(tree[brandKey]).sort((a, b) => a.localeCompare(b, "hu")) : [];
    fillSelect(modelSelect, models, emptyModel, { preserve: false });
    if (resetType) fillSelect(typeSelect, [], emptyType, { preserve: false });
    modelSelect && (modelSelect.disabled = !brandKey);
    typeSelect && (typeSelect.disabled = true);
  }

  function refreshTypes() {
    const brandKey = resolveBrandKey(tree, brandSelect.value);
    const model = modelSelect?.value ?? "";
    const types = brandKey && model && tree[brandKey]?.[model] ? [...tree[brandKey][model]] : [];
    fillSelect(typeSelect, types, emptyType, { preserve: false });
    typeSelect && (typeSelect.disabled = !model);
  }

  brandSelect.addEventListener("change", () => {
    refreshModels({ resetType: true });
    onChange?.();
  });

  modelSelect?.addEventListener("change", () => {
    refreshTypes();
    onChange?.();
  });

  typeSelect?.addEventListener("change", () => {
    onChange?.();
  });

  // form.reset() visszateszi az eredeti üres HTML-t — katalógust újra kell tölteni.
  brandSelect.form?.addEventListener("reset", () => {
    requestAnimationFrame(() => {
      fillSelect(brandSelect, catalog.brands ?? [], emptyBrand, { preserve: false });
      refreshModels({ resetType: true });
      onChange?.();
    });
  });

  // Kezdeti állapot a meglévő value alapján (draft / import).
  if (brandSelect.value) {
    refreshModels({ resetType: false });
    if (modelSelect?.value) refreshTypes();
  } else {
    refreshModels({ resetType: true });
  }

  return {
    catalog,
    async setValues(brand, model, type) {
      const brandKey = resolveBrandKey(tree, brand);
      if (brandKey && (catalog.brands ?? []).includes(brandKey)) {
        brandSelect.value = brandKey;
      } else if (brand) {
        // Ha nincs a katalógusban, ideiglenes option
        ensureOption(brandSelect, brand);
        brandSelect.value = brand;
      }
      refreshModels({ resetType: false });
      if (model) {
        ensureOption(modelSelect, model);
        modelSelect.value = model;
      }
      refreshTypes();
      if (type) {
        ensureOption(typeSelect, type);
        typeSelect.value = type;
      }
      onChange?.();
    },
  };
}

function ensureOption(select, value) {
  if (!select || !value) return;
  const exists = [...select.options].some((opt) => opt.value === value);
  if (exists) return;
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = value;
  select.appendChild(opt);
}
