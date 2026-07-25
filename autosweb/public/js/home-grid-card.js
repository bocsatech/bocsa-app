import { escapeHtml, formatListingDisplayTitle } from "./listing-card.js";

function buildCardTitle(preview, item) {
  const raw =
    preview.title ||
    item.hirdetes_cime ||
    `Hirdetés #${item.id}`;
  return formatListingDisplayTitle(raw) || raw;
}

export function createHomeGridCard(item) {
  const preview = item.preview ?? {};
  const card = document.createElement("a");
  card.className = "home-grid-card";
  card.href = `/listings.html?id=${item.id}`;
  card.setAttribute("role", "listitem");

  const title = buildCardTitle(preview, item);
  const price = preview.price || "—";
  const km = preview.km || "—";

  card.innerHTML = `
    <div class="home-grid-card-media">
      <div class="home-grid-card-photo" aria-hidden="true"></div>
      <span class="home-grid-card-save" aria-hidden="true">
        <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden="true">
          <path d="M9 14.5 1.8 8.2a4.2 4.2 0 0 1 0-5.9 4 4 0 0 1 5.7 0L9 3.3l1.5-1.5a4 4 0 0 1 5.7 5.9L9 14.5Z" stroke="currentColor" stroke-width="1.4"/>
        </svg>
      </span>
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
    </div>
  `;

  return card;
}
