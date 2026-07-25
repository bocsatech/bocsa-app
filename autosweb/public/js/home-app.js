import { fetchListings } from "./db-client.js";
import { createHomeGridCard } from "./home-grid-card.js";
import {
  emptyFilters,
  filterListingsBySidebar,
  populateFilterOptions,
  initHomeSearchSidebar,
} from "./home-search-filter.js";
import { filterByQuickPreset, initHomeQuickFilters } from "./home-quick-filters.js";
import { filterListingsNearby, initHomeNearby } from "./home-nearby.js";

const gridTrack = document.getElementById("home-grid-track");
const gridViewport = document.getElementById("home-grid-viewport");
const gridIndicators = document.getElementById("home-grid-indicators");
const emptyEl = document.getElementById("home-empty");
const filterForm = document.getElementById("home-filter-form");

const LISTINGS_FETCH_LIMIT = 500;
const AUTO_SCROLL_MS = 5000;
const GRID_ROWS = 2;
const GRID_COLS_DESKTOP = 4;

function getGridCols() {
  const w = window.innerWidth;
  if (w <= 620) return 1;
  if (w <= 980) return 2;
  return GRID_COLS_DESKTOP;
}

function getVisibleCount() {
  return GRID_ROWS * getGridCols();
}
let sidebarFilters = emptyFilters();
let quickPreset = null;
let currentPage = 0;
let pageCount = 0;
let carouselTimer = null;
let quickFilterUi = null;
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
  if (nearbyFilter) {
    result = filterListingsNearby(result, nearbyFilter.lat, nearbyFilter.lon);
  }
  return result;
}

function chunkItems(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

let allItems = [];

function stopCarousel() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

function goToPage(index) {
  if (!pageCount) return;
  currentPage = ((index % pageCount) + pageCount) % pageCount;
  gridTrack.style.transform = `translateX(-${currentPage * 100}%)`;
  gridIndicators?.querySelectorAll("[data-carousel-page]").forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.carouselPage) === currentPage);
  });
}

function startCarousel() {
  stopCarousel();
  if (pageCount <= 1) return;
  carouselTimer = setInterval(() => {
    goToPage(currentPage + 1);
  }, AUTO_SCROLL_MS);
}

function renderIndicators(totalPages) {
  if (!gridIndicators) return;
  gridIndicators.innerHTML = "";
  gridIndicators.hidden = totalPages <= 1;

  for (let index = 0; index < totalPages; index += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "home-grid-dot";
    dot.dataset.carouselPage = String(index);
    dot.setAttribute("aria-label", `${index + 1}. oldal`);
    if (index === 0) dot.classList.add("is-active");
    dot.addEventListener("click", () => {
      goToPage(index);
      startCarousel();
    });
    gridIndicators.appendChild(dot);
  }
}

function renderCarousel(items) {
  if (!gridTrack) return;

  stopCarousel();
  currentPage = 0;
  pageCount = 0;
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

  const pages = chunkItems(filtered, getVisibleCount());
  pageCount = pages.length;

  for (const pageItems of pages) {
    const pageEl = document.createElement("div");
    pageEl.className = "home-grid-page";
    for (const item of pageItems) {
      pageEl.appendChild(createHomeGridCard(item));
    }
    gridTrack.appendChild(pageEl);
  }

  goToPage(0);
  renderIndicators(pageCount);
  startCarousel();
}

async function loadListings() {
  const all = await fetchListings({ limit: LISTINGS_FETCH_LIMIT });
  allItems = sortForHome(all);
  populateFilterOptions(allItems);
  populateYearOptions(allItems);
  renderCarousel(allItems);
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
  renderCarousel(allItems);
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

gridViewport?.addEventListener("mouseenter", stopCarousel);
gridViewport?.addEventListener("mouseleave", startCarousel);

quickFilterUi = initHomeQuickFilters({
  onChange: (preset) => {
    quickPreset = preset;
    if (preset) nearbyUi?.clear();
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
    }
    applyFilters();
  },
});

const readSidebarFilters = initHomeSearchSidebar((filters) => {
  sidebarFilters = filters;
  if (hasActiveSidebarFilters(filters)) {
    quickPreset = null;
    quickFilterUi?.clear();
    nearbyUi?.clear();
    nearbyFilter = null;
  }
  applyFilters();
});
sidebarFilters = readSidebarFilters?.() ?? emptyFilters();

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
  }
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (allItems.length) renderCarousel(allItems);
  }, 150);
});
