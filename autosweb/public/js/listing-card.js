const STATUS_BADGES = {
  mentett: { label: "MENTETT", mod: "mentett" },
  feladott: { label: "FELADOTT", mod: "feladott" },
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Megjelenítéshez: „Eladó …” prefix nélkül */
export function formatListingDisplayTitle(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^eladó\s+/i, "");
}

function formatSpecLine(preview) {
  const spec = preview.specLine ?? "";
  const km = preview.km ?? "";
  if (!km || !spec.includes(km)) {
    return escapeHtml(spec);
  }
  const parts = spec.split(km);
  return parts.map((part, index) => {
    const chunk = escapeHtml(part);
    if (index === parts.length - 1) return chunk;
    return `${chunk}<span class="ha-card-km">${escapeHtml(km)}</span>`;
  }).join("");
}

function renderBadges(preview, status) {
  const statusInfo = STATUS_BADGES[status] ?? STATUS_BADGES.mentett;
  const parts = [
    `<span class="ha-badge ha-badge--status ha-badge--${statusInfo.mod}">${escapeHtml(statusInfo.label)}</span>`,
  ];

  const features = preview.badges ?? [];
  const statusLabel = statusInfo.label;
  for (const badge of features) {
    if (badge === statusLabel) continue;
    parts.push(`<span class="ha-badge ha-badge--feature">${escapeHtml(badge)}</span>`);
  }
  return parts.join("");
}

export function createListingCard(item, { selected = false, formatDate = (v) => v } = {}) {
  const preview = item.preview ?? {};
  const card = document.createElement("button");
  card.type = "button";
  card.className = "ha-card listings-ha-card";
  if (selected) card.classList.add("ha-card--selected");
  card.dataset.listingId = String(item.id);

  const title = formatListingDisplayTitle(
    preview.title || item.hirdetes_cime || `Hirdetés #${item.id}`
  ) || `Hirdetés #${item.id}`;
  const price = preview.price || "—";
  const code = preview.hirdeteskod;
  const location = preview.location;
  const desc = preview.leiras;
  const updated = formatDate(item.updated_at);

  card.innerHTML = `
    <header class="ha-card-head">
      <h2 class="ha-card-title">${escapeHtml(title.toUpperCase())}</h2>
      <div class="ha-card-price">${escapeHtml(price)}</div>
    </header>
    <div class="ha-card-badges">${renderBadges(preview, item.status || "mentett")}</div>
    <div class="ha-card-body">
      <div class="ha-card-photo">
        <div class="ha-card-photo-empty" aria-hidden="true">
          <span class="ha-card-photo-icon" aria-hidden="true">
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4.5h3l1.5-2h7l1.5 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.4"/>
              <circle cx="11" cy="10" r="3.2" stroke="currentColor" stroke-width="1.4"/>
            </svg>
          </span>
        </div>
      </div>
      <div class="ha-card-main">
        ${preview.specLine ? `<p class="ha-card-spec">${formatSpecLine(preview)}</p>` : ""}
        ${desc ? `<p class="ha-card-desc">${escapeHtml(desc)}</p>` : ""}
        ${code ? `<p class="ha-card-code">(Hirdetéskód: ${escapeHtml(code)})</p>` : ""}
        ${location ? `<p class="ha-card-location"><span class="ha-card-pin" aria-hidden="true"></span>${escapeHtml(location)}</p>` : ""}
      </div>
      <div class="ha-card-dealer">
        <div class="ha-card-dealer-logo" aria-hidden="true">AUTOSWEB</div>
      </div>
    </div>
    <footer class="ha-card-foot">
      <span class="ha-card-foot-left">Autosweb · ${escapeHtml(updated)} · ${item.cell_count ?? 0} cella</span>
      <span class="ha-card-foot-mark" aria-hidden="true">K</span>
    </footer>
  `;

  return card;
}
