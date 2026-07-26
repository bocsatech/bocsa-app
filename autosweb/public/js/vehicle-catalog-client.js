/** Járműkatalógus (lista.csv) — márka / modell / típus legördülők. */

let catalogPromise = null;

export async function fetchVehicleCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/vehicle-catalog")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Katalógus betöltése sikertelen.");
        return data;
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

export function fillSelect(select, values, emptyLabel = "Mindegy") {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${emptyLabel}</option>`;
  for (const value of values ?? []) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  if (current && values?.includes(current)) select.value = current;
}

export function bindBrandModelSelects({
  brandSelect,
  modelSelect,
  tipusSelect = null,
  catalog,
  brandEmptyLabel = "Válasszon",
  modelEmptyLabel = "Válasszon",
  tipusEmptyLabel = "Válasszon",
  onChange = () => {},
}) {
  if (!brandSelect || !modelSelect || !catalog) return;

  fillSelect(brandSelect, catalog.gyartmanyok, brandEmptyLabel);

  function refreshModels() {
    const brand = brandSelect.value;
    const models = brand ? catalog.modellek[brand] ?? [] : [];
    fillSelect(modelSelect, models, modelEmptyLabel);
    if (tipusSelect) fillSelect(tipusSelect, [], tipusEmptyLabel);
    onChange();
  }

  function refreshTipusok() {
    if (!tipusSelect) return;
    const brand = brandSelect.value;
    const model = modelSelect.value;
    const key = brand && model ? `${brand}|${model}` : "";
    const tipusok = key ? catalog.tipusok[key] ?? [] : [];
    fillSelect(tipusSelect, tipusok, tipusEmptyLabel);
    onChange();
  }

  brandSelect.addEventListener("change", () => {
    refreshModels();
  });

  modelSelect.addEventListener("change", () => {
    refreshTipusok();
  });

  refreshModels();
}

export async function initVehicleCatalogSelects(options) {
  const catalog = await fetchVehicleCatalog();
  bindBrandModelSelects({ ...options, catalog });
  return catalog;
}
