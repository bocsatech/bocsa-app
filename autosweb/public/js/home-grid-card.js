import { escapeHtml, formatListingDisplayTitle } from "./listing-card.js";

function buildCardTitle(preview, item) {
  const raw =
    preview.title ||
    item.hirdetes_cime ||
    `Hirdetés #${item.id}`;
  return formatListingDisplayTitle(raw) || raw;
}

function extractYearMonth(specLine, year) {
  const match = String(specLine || "").match(/\b((?:19|20)\d{2})\/(\d{1,2})\b/);
  if (match) return `${match[1]}/${match[2]}`;
  if (year) return String(year);
  return "";
}

function formatSpecYear(preview) {
  const year = preview.filter?.gyartasi_ev;
  if (year && year > 1900) return String(year);
  const match = String(preview.specLine || "").match(/\b((?:19|20)\d{2})\b/);
  return match ? match[1] : "—";
}

function formatFuelLabel(value) {
  const fuel = String(value ?? "").trim();
  if (!fuel) return "—";
  if (/^dízel$/i.test(fuel) || /^diesel$/i.test(fuel)) return "Dizel";
  return fuel;
}

function formatLocation(preview) {
  const city = preview.filter?.telepules;
  if (city) return city;
  const location = String(preview.location ?? "").trim();
  if (!location) return "—";
  return location.split(",")[0].trim() || location;
}

function formatTimeAgo(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "most";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} perce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} napja`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} hete`;
  const months = Math.floor(days / 30);
  return `${Math.max(months, 1)} hónapja`;
}

function buildDisplayTitle(preview, item) {
  const base = buildCardTitle(preview, item);
  if (/\(\d{4}(?:\/\d{1,2})?\)/.test(base)) {
    return base.toUpperCase();
  }
  const yearMonth = extractYearMonth(preview.specLine, preview.filter?.gyartasi_ev);
  return yearMonth ? `${base.toUpperCase()} (${yearMonth})` : base.toUpperCase();
}

const ICON_CALENDAR = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3.5" width="12" height="10.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 2v2.5M11 2v2.5M2 6.5h12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
const ICON_ODOMETER = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 5.8v2.6l1.8 1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="8.5" r="1" fill="currentColor"/></svg>`;
const ICON_FUEL = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3.5h6v9H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.2"/><path d="M9 6.5h1.8L13 9.2v3.3h-4V6.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M11.5 9.2h1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
const ICON_PIN = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5a3.5 3.5 0 0 1 3.5 3.5c0 2.625-3.5 7-3.5 7S3.5 7.625 3.5 5A3.5 3.5 0 0 1 7 1.5Z" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="5" r="1.2" fill="currentColor"/></svg>`;
const ICON_CLOCK = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 4.2v3l2 1.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;

export function createHomeGridCard(item) {
  const preview = item.preview ?? {};
  const card = document.createElement("a");
  card.className = "home-grid-card";
  card.href = `/listings.html?id=${item.id}`;
  card.setAttribute("role", "listitem");

  const title = buildDisplayTitle(preview, item);
  const price = preview.price || "—";
  const km = preview.km || "—";
  const year = formatSpecYear(preview);
  const fuel = formatFuelLabel(preview.filter?.uzemanyag);
  const location = formatLocation(preview);
  const posted = formatTimeAgo(item.updated_at ?? item.created_at);

  card.innerHTML = `
    <div class="home-grid-card-media">
      <div class="home-grid-card-photo" aria-hidden="true"></div>
      <span class="home-grid-card-save" aria-hidden="true">
        <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden="true">
          <path d="M9 14.5 1.8 8.2a4.2 4.2 0 0 1 0-5.9 4 4 0 0 1 5.7 0L9 3.3l1.5-1.5a4 4 0 0 1 5.7 5.9L9 14.5Z" stroke="currentColor" stroke-width="1.4"/>
        </svg>
      </span>
    </div>
    <div class="home-grid-card-body">
      <div class="home-grid-card-specs">
        <span class="home-grid-card-spec">${ICON_CALENDAR}<span>${escapeHtml(year)}</span></span>
        <span class="home-grid-card-spec">${ICON_ODOMETER}<span>${escapeHtml(km)}</span></span>
        <span class="home-grid-card-spec">${ICON_FUEL}<span>${escapeHtml(fuel)}</span></span>
      </div>
      <strong class="home-grid-card-price">${escapeHtml(price)}</strong>
      <h2 class="home-grid-card-title">${escapeHtml(title)}</h2>
      <footer class="home-grid-card-foot">
        <span class="home-grid-card-foot-item">${ICON_PIN}<span>${escapeHtml(location)}</span></span>
        <span class="home-grid-card-foot-item">${ICON_CLOCK}<span>${escapeHtml(posted)}</span></span>
      </footer>
    </div>
  `;

  return card;
}
