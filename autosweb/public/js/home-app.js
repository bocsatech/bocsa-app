import { fetchListings } from "./db-client.js";
import { createHomeGridCard } from "./home-grid-card.js";
import { initSiteSideContent } from "./site-side-content.js";

const gridEl = document.getElementById("home-grid");
const emptyEl = document.getElementById("home-empty");
const countEl = document.getElementById("home-result-count");
const searchInput = document.getElementById("home-search");
const searchForm = document.getElementById("home-search-form");

let allItems = [];
let searchQuery = "";

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

function filterItems(items, query) {
  const q = normalizeSearch(query);
  if (!q) return items;
  return items.filter((item) => listingSearchHaystack(item).includes(q));
}

function renderGrid(items) {
  gridEl.innerHTML = "";
  const filtered = filterItems(items, searchQuery);
  emptyEl.hidden = filtered.length > 0;

  if (countEl) {
    const published = items.filter((item) => item.status === "feladott").length;
    if (searchQuery.trim()) {
      countEl.textContent = `${filtered.length} találat · ${published} közzétett · ${items.length} hirdetés`;
    } else if (published > 0) {
      countEl.textContent = `${published} közzétett · ${items.length} hirdetés összesen`;
    } else {
      countEl.textContent = `${items.length} hirdetés (még nincs közzétéve a főoldalon)`;
    }
  }

  for (const item of filtered) {
    gridEl.appendChild(createHomeGridCard(item));
  }
}

async function loadListings() {
  const all = await fetchListings({ limit: 300 });
  allItems = all.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "feladott" ? -1 : 1;
  });
  renderGrid(allItems);
}

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  searchQuery = searchInput?.value ?? "";
  renderGrid(allItems);
});

searchInput?.addEventListener("input", () => {
  searchQuery = searchInput.value;
  renderGrid(allItems);
});

initSiteSideContent().catch(console.error);
loadListings().catch((error) => {
  emptyEl.hidden = false;
  emptyEl.textContent = error.message ?? "Nem sikerült betölteni a hirdetéseket.";
});
