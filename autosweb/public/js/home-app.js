import { fetchListings } from "./db-client.js";
import { createHomeGridCard } from "./home-grid-card.js";
import {
  emptyFilters,
  filterListingsBySidebar,
  populateFilterOptions,
  initHomeSearchSidebar,
} from "./home-search-filter.js";
import { filterByQuickPreset, initHomeQuickFilters } from "./home-quick-filters.js";
import { filterByCategory, initHomeCategoryBar } from "./home-category-bar.js";
import { filterListingsNearby, initHomeNearby } from "./home-nearby.js";
import { initHomeUnifiedScroll } from "./home-unified-scroll.js";
import { initHomeStatsBar } from "./home-stats-bar.js";

const gridTrack = document.getElementById("home-grid-track");
const emptyEl = document.getElementById("home-empty");
const filterForm = document.getElementById("home-filter-form");

const LISTINGS_FETCH_LIMIT = 500;

let allItems = [];
let sidebarFilters = emptyFilters();
let quickPreset = null;
let categoryFilter = null;
let quickFilterUi = null;
let categoryUi = null;
let nearbyUi = null;
let nearbyFilter = null;
let statsUi = null;
let statsFilter = null;

function sortForHome(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });
}

function filterItems(items) {
  let result = filterListingsBySidebar(items, sidebarFilters);
  result = filterByQuickPreset(result, quickPreset);
  result = filterByCategory(result, categoryFilter);
  if (nearbyFilter) {
    result = filterListingsNearby(result, nearbyFilter.lat, nearbyFilter.lon);
  }
  if (statsFilter) {
    result = result.filter((item) => statsFilter.listingIds.has(item.id));
  }
  return result;
}

function renderListings(items) {
  if (!gridTrack) return;

  gridTrack.innerHTML = "";

  const filtered = filterItems(items);
  emptyEl.hidden = filtered.length > 0;
  if (!filtered.length && statsFilter) {
    emptyEl.hidden = false;
    if (statsFilter.mode === "recent24h") {
      emptyEl.textContent = `Nincs új hirdetés ${statsFilter.origin.city} ${statsFilter.radiusKm} km-es körzetében az elmúlt 24 órában.`;
    } else {
      emptyEl.textContent = `Nincs hirdetés ${statsFilter.origin.city} ${statsFilter.radiusKm} km-es körzetében.`;
    }
  } else if (!filtered.length && nearbyFilter) {
    emptyEl.hidden = false;
    emptyEl.textContent =
      "Nincs hirdetés a közeledben ezen a térképen. Kapcsold ki a közeli szűrést, vagy ments több hirdetést településsel.";
  } else if (!filtered.length) {
    emptyEl.textContent =
      "Még nincs hirdetés. Importálj, mentsd az adatbázisba (Import oldal), majd frissítsd a főoldalt — a legfrissebb mentések itt jelennek meg.";
  }

  for (const item of filtered) {
    gridTrack.appendChild(createHomeGridCard(item));
  }
}

async function loadListings() {
  const all = await fetchListings({ limit: LISTINGS_FETCH_LIMIT });
  allItems = sortForHome(all);
  populateFilterOptions(allItems);
  populateYearOptions(allItems);
  renderListings(allItems);
  statsUi?.refreshActiveCount?.();
}

function populateYearOptions(items) {
  const years = [
    ...new Set(
      items.map((item) => item.preview?.filter?.gyartasi_ev).filter((y) => y && y > 1900)
    ),
  ].sort((a, b) => a - b);

  for (const select of document.querySelectorAll('[name="ev_tol"], [name="ev_ig"]')) {
    const current = select.value;
    const empty = select.name === "ev_tol" ? "-tól" : "-ig";
    select.innerHTML = `<option value="">${empty}</option>`;
    for (const year of years) {
      const opt = document.createElement("option");
      opt.value = String(year);
      opt.textContent = String(year);
      select.appendChild(opt);
    }
    if (current) select.value = current;
  }
}

function applyFilters() {
  renderListings(allItems);
}

function hasActiveSidebarFilters(filters) {
  return Boolean(
    filters.gyartmany ||
      filters.modell ||
      filters.kivitel ||
      filters.uzemanyag ||
      filters.uzemanyagQuick ||
      filters.allapot ||
      filters.tipus ||
      filters.features?.length ||
      filters.ev_tol != null ||
      filters.ev_ig != null ||
      filters.ar_tol != null ||
      filters.ar_ig != null ||
      filters.km_tol != null ||
      filters.km_ig != null ||
      filters.ccm_tol != null ||
      filters.ccm_ig != null
  );
}

initHomeUnifiedScroll();

quickFilterUi = initHomeQuickFilters({
  onChange: (preset) => {
    quickPreset = preset;
    if (preset) {
      nearbyUi?.clear();
      categoryUi?.clear();
      categoryFilter = null;
    }
    applyFilters();
  },
  getForm: () => filterForm,
});

categoryUi = initHomeCategoryBar({
  onChange: (category) => {
    categoryFilter = category;
    if (category) {
      quickPreset = null;
      quickFilterUi?.clear();
      nearbyUi?.clear();
      nearbyFilter = null;
    }
    applyFilters();
  },
  getForm: () => filterForm,
});

nearbyUi = initHomeNearby({
  onChange: (active) => {
    nearbyFilter = active;
    if (active) {
      quickPreset = null;
      quickFilterUi?.clear();
      categoryUi?.clear();
      categoryFilter = null;
    }
    applyFilters();
  },
});

statsUi = initHomeStatsBar({
  onChange: (active) => {
    statsFilter = active;
    applyFilters();
  },
  getItems: () => allItems,
});

const readSidebarFilters = initHomeSearchSidebar((filters) => {
  sidebarFilters = filters;
  if (hasActiveSidebarFilters(filters)) {
    quickPreset = null;
    quickFilterUi?.clear();
    categoryUi?.clear();
    categoryFilter = null;
    nearbyUi?.clear();
    nearbyFilter = null;
  }
  applyFilters();
});
sidebarFilters = readSidebarFilters?.() ?? emptyFilters();

import("./site-side-content.js")
  .then((mod) => mod.initSiteSideContent())
  .catch((error) => console.error("Oldalsáv betöltés:", error));

import("./partner-recommendations.js")
  .then((mod) => mod.initPartnerRecommendations())
  .catch((error) => console.error("Partner ajánló:", error));

loadListings().catch((error) => {
  emptyEl.hidden = false;
  emptyEl.textContent = error.message ?? "Nem sikerült betölteni a hirdetéseket.";
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) loadListings().catch(() => {});
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadListings().catch(() => {});
  }
});
