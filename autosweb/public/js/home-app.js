import { fetchListings } from "./db-client.js";
import { createHomeGridCard } from "./home-grid-card.js";
import {
  emptyFilters,
  filterListingsBySidebar,
  populateFilterOptions,
  initHomeSearchSidebar,
} from "./home-search-filter.js";

const gridTrack = document.getElementById("home-grid-track");
const gridViewport = document.getElementById("home-grid-viewport");
const gridIndicators = document.getElementById("home-grid-indicators");
const emptyEl = document.getElementById("home-empty");
const countEl = document.getElementById("home-result-count");
const searchInput = document.getElementById("home-search");
const searchForm = document.getElementById("home-search-form");

const VISIBLE_COUNT = 9;
const AUTO_SCROLL_MS = 5000;

let allItems = [];
let searchQuery = "";
let sidebarFilters = emptyFilters();
let currentPage = 0;
let pageCount = 0;
let carouselTimer = null;

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function listingSearchHaystack(item) {
  const preview = item.preview ?? {};
  return normalizeSearch(
    [
      preview.title,
      preview.price,
      preview.specLine,
      preview.km,
      preview.location,
      preview.leiras,
      preview.hirdeteskod,
      item.hirdetes_cime,
      ...(preview.badges ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function filterItems(items) {
  let result = filterListingsBySidebar(items, sidebarFilters);
  const q = normalizeSearch(searchQuery);
  if (q) {
    result = result.filter((item) => listingSearchHaystack(item).includes(q));
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

function updateCount(items, filtered) {
  if (!countEl) return;
  const published = items.filter((item) => item.status === "feladott").length;
  const pages = Math.max(1, Math.ceil(filtered.length / VISIBLE_COUNT));
  const base =
    searchQuery.trim() || Object.keys(sidebarFilters).length ?
      `${filtered.length} találat · ${published} közzétett · ${items.length} hirdetés`
    : published > 0 ?
      `${published} közzétett · ${items.length} hirdetés összesen`
    : `${items.length} hirdetés (még nincs közzétéve a főoldalon)`;
  countEl.textContent = filtered.length > VISIBLE_COUNT ? `${base} · ${pages} oldal (9 / oldal)` : base;
}

function renderCarousel(items) {
  if (!gridTrack) return;

  stopCarousel();
  currentPage = 0;
  pageCount = 0;
  gridTrack.innerHTML = "";

  const filtered = filterItems(items);
  emptyEl.hidden = filtered.length > 0;
  updateCount(items, filtered);

  const pages = chunkItems(filtered, VISIBLE_COUNT);
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
  const all = await fetchListings({ limit: 300 });
  allItems = all.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "feladott" ? -1 : 1;
  });
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

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  searchQuery = searchInput?.value ?? "";
  applyFilters();
});

searchInput?.addEventListener("input", () => {
  searchQuery = searchInput.value;
  applyFilters();
});

gridViewport?.addEventListener("mouseenter", stopCarousel);
gridViewport?.addEventListener("mouseleave", startCarousel);

const readSidebarFilters = initHomeSearchSidebar((filters) => {
  sidebarFilters = filters;
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
