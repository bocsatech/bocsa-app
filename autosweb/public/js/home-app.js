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

const gridViewport = document.getElementById("home-grid-viewport");
const gridTrack = document.getElementById("home-grid-track");
const emptyEl = document.getElementById("home-empty");
const filterForm = document.getElementById("home-filter-form");

const LISTINGS_FETCH_LIMIT = 500;
const AUTO_SCROLL_SPEED = 0.55;
const AUTO_SCROLL_BOTTOM_PAUSE_MS = 2500;

let autoScrollRaf = null;
let autoScrollPaused = false;
let autoScrollBottomUntil = 0;

let allItems = [];
let sidebarFilters = emptyFilters();
let quickPreset = null;
let categoryFilter = null;
let quickFilterUi = null;
let categoryUi = null;
let nearbyUi = null;
let nearbyFilter = null;

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
  return result;
}

function stopAutoScroll() {
  if (autoScrollRaf) {
    cancelAnimationFrame(autoScrollRaf);
    autoScrollRaf = null;
  }
}

function autoScrollTick() {
  if (!gridViewport || autoScrollPaused) {
    autoScrollRaf = requestAnimationFrame(autoScrollTick);
    return;
  }

  const maxScroll = gridViewport.scrollHeight - gridViewport.clientHeight;
  if (maxScroll <= 4) {
    autoScrollRaf = requestAnimationFrame(autoScrollTick);
    return;
  }

  if (Date.now() < autoScrollBottomUntil) {
    autoScrollRaf = requestAnimationFrame(autoScrollTick);
    return;
  }

  if (gridViewport.scrollTop >= maxScroll - 2) {
    autoScrollBottomUntil = Date.now() + AUTO_SCROLL_BOTTOM_PAUSE_MS;
    gridViewport.scrollTop = 0;
  } else {
    gridViewport.scrollTop += AUTO_SCROLL_SPEED;
  }

  autoScrollRaf = requestAnimationFrame(autoScrollTick);
}

function startAutoScroll() {
  stopAutoScroll();
  autoScrollBottomUntil = 0;
  if (gridViewport) gridViewport.scrollTop = 0;
  autoScrollRaf = requestAnimationFrame(autoScrollTick);
}

function renderListings(items) {
  if (!gridTrack) return;

  stopAutoScroll();
  gridTrack.innerHTML = "";

  const filtered = filterItems(items);
  emptyEl.hidden = filtered.length > 0;
  if (!filtered.length && nearbyFilter) {
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

  if (filtered.length) {
    requestAnimationFrame(() => startAutoScroll());
  }
}

async function loadListings() {
  const all = await fetchListings({ limit: LISTINGS_FETCH_LIMIT });
  allItems = sortForHome(all);
  populateFilterOptions(allItems);
  populateYearOptions(allItems);
  renderListings(allItems);
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

gridViewport?.addEventListener("mouseenter", () => {
  autoScrollPaused = true;
});

gridViewport?.addEventListener("mouseleave", () => {
  autoScrollPaused = false;
});

gridViewport?.addEventListener("wheel", () => {
  autoScrollBottomUntil = Date.now() + AUTO_SCROLL_BOTTOM_PAUSE_MS;
}, { passive: true });

import("./site-side-content.js")
  .then((mod) => mod.initSiteSideContent())
  .catch((error) => console.error("Oldalsáv betöltés:", error));

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
    startAutoScroll();
  } else {
    stopAutoScroll();
  }
});
