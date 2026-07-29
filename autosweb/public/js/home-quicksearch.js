/**
 * Gyorskereső az összesítő sávban.
 *
 * 1. sor: Márka, Modell, Típus
 * 2. sor: Üzemanyag, Évjárat, Vételár
 * 3. sor: Keresés, Részletes keresés, Visszaállítás
 *
 * A Márka/Modell/Típus a járműkatalógusból töltődik.
 * A leadott értékek a szűrő objektum alakját követik (`home-search-filter.js`).
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
  const tipusSelect = document.getElementById("qs-tipus");
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
    yearSelect: yearFrom,
    tipusSelect,
    brandEmptyLabel: "Mindegy",
    modelEmptyLabel: "Mindegy",
    tipusEmptyLabel: "Mindegy",
    yearFromCatalog: false,
  }).catch((error) => {
    console.error("Gyorskereső katalógus:", error);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSearch({
      gyartmany: brandSelect?.value ?? "",
      modell: modelSelect?.value ?? "",
      tipusKatalogus: tipusSelect?.value ?? "",
      uzemanyagQuick: fuelSelect?.value ?? "",
      ev_tol: numOrNull(yearFrom?.value),
      ev_ig: numOrNull(yearTo?.value),
      ar_tol: numOrNull(priceFrom?.value),
      ar_ig: numOrNull(priceTo?.value),
    });
  });

  /*
   * A reset a böngésző alapértékeit állítja vissza; a Modell/Típus listát nekünk
   * kell frissítenünk, mert a katalógus kötés a Márka `change` eseményére épül.
   */
  form.addEventListener("reset", () => {
    requestAnimationFrame(() => {
      brandSelect?.dispatchEvent(new Event("change"));
      onSearch({});
    });
  });

  const advancedBtn = document.getElementById("qs-reszletes");
  advancedBtn?.addEventListener("click", () => {
    window.location.href = "/listings.html";
  });
}
