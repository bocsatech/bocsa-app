/**
 * Gyorskereső az összesítő sávban: Márka, Modell, Üzemanyag, Évjárat, Vételár.
 *
 * A Márka/Modell a járműkatalógusból töltődik, az évlistát itt állítjuk elő.
 * A leadott értékek a szűrő objektum alakját követik (`home-search-filter.js`),
 * hogy a főoldal ugyanazon a szűrőláncon engedje át a hirdetéseket.
 */

import { initVehicleCatalogSelects, fillSelect } from "./vehicle-catalog-client.js";

const FIRST_YEAR = 1950;

function yearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let year = current; year >= FIRST_YEAR; year -= 1) years.push(String(year));
  return years;
}

function numOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function initHomeQuickSearch({ onSearch = () => {} } = {}) {
  const form = document.getElementById("home-qs-form");
  if (!form) return;

  const brandSelect = document.getElementById("qs-gyartmany");
  const modelSelect = document.getElementById("qs-modell");
  const fuelSelect = document.getElementById("qs-uzemanyag");
  const yearFrom = document.getElementById("qs-ev-tol");
  const yearTo = document.getElementById("qs-ev-ig");
  const priceFrom = document.getElementById("qs-ar-tol");
  const priceTo = document.getElementById("qs-ar-ig");

  const years = yearOptions();
  fillSelect(yearFrom, years, "-tól");
  fillSelect(yearTo, years, "-ig");

  initVehicleCatalogSelects({
    brandSelect,
    modelSelect,
    brandEmptyLabel: "Mindegy",
    modelEmptyLabel: "Mindegy",
  }).catch((error) => {
    console.error("Gyorskereső katalógus:", error);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSearch({
      gyartmany: brandSelect?.value ?? "",
      modell: modelSelect?.value ?? "",
      uzemanyagQuick: fuelSelect?.value ?? "",
      ev_tol: numOrNull(yearFrom?.value),
      ev_ig: numOrNull(yearTo?.value),
      ar_tol: numOrNull(priceFrom?.value),
      ar_ig: numOrNull(priceTo?.value),
    });
  });

  /*
   * A reset a böngésző alapértékeit állítja vissza; a Modell listát nekünk kell
   * kiürítenünk, mert a katalógus kötés csak a Márka `change` eseményére frissít.
   */
  form.addEventListener("reset", () => {
    requestAnimationFrame(() => {
      brandSelect?.dispatchEvent(new Event("change"));
      onSearch({});
    });
  });
}
