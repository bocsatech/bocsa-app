import { fetchListings, fetchListing, deleteListingFromDb, fetchDbStats } from "./db-client.js";
import { renderListingCells } from "./cells-view.js";

const listEl = document.getElementById("listings-list");
const detailEl = document.getElementById("listings-detail");
const detailTitle = document.getElementById("listings-detail-title");
const detailMeta = document.getElementById("listings-detail-meta");
const cellsEl = document.getElementById("listings-cells");
const emptyEl = document.getElementById("listings-empty");
const statsEl = document.getElementById("listings-stats");
const filterButtons = [...document.querySelectorAll("[data-listings-filter]")];
const editBtn = document.getElementById("listings-edit-btn");
const deleteBtn = document.getElementById("listings-delete-btn");

let currentFilter = "all";
let selectedId = null;

const STATUS_LABELS = {
  mentett: "Mentett",
  feladott: "Feladott",
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value.includes("T") ? value : `${value}Z`).toLocaleString("hu-HU");
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setActiveFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.listingsFilter === filter);
  });
}

async function refreshStats() {
  try {
    const stats = await fetchDbStats();
    statsEl.hidden = false;
    statsEl.textContent = `${stats.listings} hirdetés · ${stats.mentett ?? 0} mentett · ${stats.feladott ?? 0} feladott · ${stats.cells} cella`;
  } catch {
    statsEl.hidden = true;
  }
}

function renderList(items) {
  listEl.innerHTML = "";
  emptyEl.hidden = items.length > 0;

  for (const item of items) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "import-result-row listings-row";
    if (item.id === selectedId) row.classList.add("listings-row--active");
    row.innerHTML = `
      <strong>${escapeHtml(item.hirdetes_cime || `Hirdetés #${item.id}`)}</strong>
      <span class="listings-row-meta">
        <span class="listings-status listings-status--${escapeHtml(item.status || "mentett")}">${escapeHtml(STATUS_LABELS[item.status] || item.status || "Mentett")}</span>
        · ${escapeHtml(formatDate(item.updated_at))}
        · ${item.cell_count ?? 0} cella
      </span>
    `;
    row.addEventListener("click", () => selectListing(item.id));
    listEl.appendChild(row);
  }
}

async function loadList() {
  const status = currentFilter === "all" ? null : currentFilter;
  const items = await fetchListings({ limit: 200, status });
  renderList(items);
  if (selectedId && !items.some((item) => item.id === selectedId)) {
    selectedId = null;
    detailEl.hidden = true;
  }
}

async function selectListing(id) {
  selectedId = id;
  detailEl.hidden = false;
  detailTitle.textContent = "Betöltés…";
  detailMeta.textContent = "";
  cellsEl.innerHTML = "";

  const listing = await fetchListing(id);
  if (!listing) {
    detailTitle.textContent = "Nem található";
    return;
  }

  detailTitle.textContent = listing.hirdetes_cime || `Hirdetés #${listing.id}`;
  const parts = [
    STATUS_LABELS[listing.status] || listing.status,
    `Frissítve: ${formatDate(listing.updated_at)}`,
    `${listing.cells?.length ?? 0} cella`,
  ];
  if (listing.forras_url) {
    parts.push(`Forrás: ${listing.forras_url}`);
  }
  detailMeta.textContent = parts.join(" · ");

  renderListingCells(cellsEl, listing.cells);
  editBtn.href = `/import.html?listing=${listing.id}`;
  deleteBtn.dataset.id = String(listing.id);

  await loadList();
  detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleDelete() {
  if (!selectedId) return;
  const title = detailTitle.textContent || `#${selectedId}`;
  if (!confirm(`Törlöd ezt a hirdetést?\n\n${title}`)) return;

  await deleteListingFromDb(selectedId);
  selectedId = null;
  detailEl.hidden = true;
  await refreshStats();
  await loadList();
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    setActiveFilter(btn.dataset.listingsFilter);
    await loadList();
  });
});

deleteBtn?.addEventListener("click", handleDelete);

const params = new URLSearchParams(location.search);
const openId = Number(params.get("id"));
if (Number.isFinite(openId) && openId > 0) {
  selectListing(openId).catch(console.error);
}

setActiveFilter("all");
refreshStats().catch(console.error);
loadList().catch((error) => {
  emptyEl.hidden = false;
  emptyEl.textContent = error.message ?? "Nem sikerült betölteni a hirdetéseket.";
});
