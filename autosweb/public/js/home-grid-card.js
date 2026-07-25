import { escapeHtml, formatListingDisplayTitle } from "./listing-card.js";

function buildCardTitle(preview, item) {
  const raw =
    preview.title ||
    item.hirdetes_cime ||
    `Hirdetés #${item.id}`;
  return formatListingDisplayTitle(raw) || raw;
}

function pickDealBadge(preview) {
  const badges = preview.badges ?? [];
  if (!badges.length) return null;
  const label = badges[0];
  const tone = /garanc|extra|automata|full/i.test(label) ? "great" : "good";
  return { label, tone };
}

export function createHomeGridCard(item) {
  const preview = item.preview ?? {};
  const card = document.createElement("article");
  card.className = "home-grid-card";
  card.dataset.listingId = String(item.id);

  const title = buildCardTitle(preview, item);
  const price = preview.price || "—";
  const km = preview.km || "—";
  const deal = pickDealBadge(preview);
  const status = item.status || "mentett";
  const statusLabel = status === "feladott" ? "Közzétéve" : "Mentett";
  const statusClass = status === "feladott" ? "published" : "draft";

  card.innerHTML = `
    <div class="home-grid-card-media">
      <div class="home-grid-card-photo" aria-hidden="true"></div>
      <button type="button" class="home-grid-card-save" aria-label="Mentés" disabled>
        <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden="true">
          <path d="M9 14.5 1.8 8.2a4.2 4.2 0 0 1 0-5.9 4 4 0 0 1 5.7 0L9 3.3l1.5-1.5a4 4 0 0 1 5.7 5.9L9 14.5Z" stroke="currentColor" stroke-width="1.4"/>
        </svg>
      </button>
      <div class="home-grid-card-dots" aria-hidden="true">
        <span class="is-active"></span><span></span><span></span><span></span>
      </div>
    </div>
    <div class="home-grid-card-body">
      <div class="home-grid-card-price-row">
        <strong class="home-grid-card-price">${escapeHtml(price)}</strong>
        <span class="home-grid-card-km">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M7 4v3.2l2 1.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          ${escapeHtml(km)}
        </span>
      </div>
      <h2 class="home-grid-card-title">${escapeHtml(title)}</h2>
      <span class="home-grid-card-status home-grid-card-status--${statusClass}">${escapeHtml(statusLabel)}</span>
      ${deal ? `<span class="home-grid-card-deal home-grid-card-deal--${deal.tone}">${escapeHtml(deal.label)}</span>` : ""}
      <div class="home-grid-card-actions">
        <a class="home-grid-card-cta" href="/listings.html?id=${item.id}">Részletek</a>
        <a class="home-grid-card-quick" href="/listings.html?id=${item.id}">Gyors nézet</a>
      </div>
    </div>
  `;

  return card;
}
