import { PARTNER_CATEGORIES } from "../lib/partner-categories.mjs";

const STORAGE_KEY = "autosweb_partner_postal_code";

export async function fetchPartnerRecommendations(postalCode) {
  const params = new URLSearchParams({ postal_code: String(postalCode).trim() });
  const response = await fetch(`/api/partners/recommendations?${params}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Ajánlások betöltése sikertelen.");
  return data;
}

export function loadSavedPostalCode() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePostalCode(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

function formatRating(partner) {
  if (partner.google_rating == null) return "";
  const count =
    partner.google_review_count != null ? ` (${partner.google_review_count})` : "";
  return `★ ${Number(partner.google_rating).toFixed(1)}${count}`;
}

function renderPartnerCard(partner) {
  const article = document.createElement("article");
  article.className = "home-partner-card";

  const rating = formatRating(partner);
  article.innerHTML = `
    <h4 class="home-partner-name">${escapeHtml(partner.name)}</h4>
    <p class="home-partner-meta">
      <span class="home-partner-distance">~${partner.distance_km} km</span>
      ${rating ? `<span class="home-partner-rating">${escapeHtml(rating)}</span>` : ""}
    </p>
    <p class="home-partner-address">${escapeHtml(partner.address)} · ${escapeHtml(partner.postal_code)}</p>
    ${
      partner.opening_hours
        ? `<p class="home-partner-hours">${escapeHtml(partner.opening_hours)}</p>`
        : ""
    }
    <div class="home-partner-actions">
      <a class="home-partner-call" href="tel:${escapeHtml(partner.phone.replace(/\s/g, ""))}">Hívás</a>
      ${
        partner.google_maps_url
          ? `<a class="home-partner-map" href="${escapeHtml(partner.google_maps_url)}" target="_blank" rel="noopener noreferrer">Google</a>`
          : ""
      }
    </div>
  `;
  return article;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCategoryBlock(category) {
  const section = document.createElement("section");
  section.className = "home-partner-category";
  section.dataset.category = category.id;

  const heading = document.createElement("h3");
  heading.className = "home-partner-category-title";
  heading.textContent = category.label;
  section.append(heading);

  const list = document.createElement("div");
  list.className = "home-partner-list";

  if (category.partners?.length) {
    for (const partner of category.partners) {
      list.append(renderPartnerCard(partner));
    }
  } else {
    const empty = document.createElement("p");
    empty.className = "home-partner-empty";
    empty.textContent = category.empty_message ?? "Hamarosan a környékeden is";
    list.append(empty);
  }

  section.append(list);
  return section;
}

export function initPartnerRecommendations(rootId = "home-partner-recommendations") {
  const root = document.getElementById(rootId);
  const form = document.getElementById("home-partner-postal-form");
  const input = document.getElementById("home-partner-postal-input");
  const statusEl = document.getElementById("home-partner-postal-status");
  const resultsEl = document.getElementById("home-partner-results");
  if (!root || !form || !input || !resultsEl) return;

  const saved = loadSavedPostalCode();
  if (saved) input.value = saved;

  async function loadRecommendations(postalCode) {
    statusEl.hidden = false;
    statusEl.textContent = "Ajánlások betöltése…";
    statusEl.dataset.statusType = "info";
    resultsEl.innerHTML = "";

    try {
      const data = await fetchPartnerRecommendations(postalCode);
      savePostalCode(postalCode);
      statusEl.textContent = `${data.city} (${data.postal_code}) — legfeljebb ${data.max_results} partner / kategória`;
      statusEl.dataset.statusType = "ok";

      for (const category of data.categories ?? PARTNER_CATEGORIES) {
        resultsEl.append(renderCategoryBlock(category));
      }
    } catch (error) {
      statusEl.textContent = error.message ?? "Nem sikerült betölteni az ajánlásokat.";
      statusEl.dataset.statusType = "err";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const postalCode = input.value.replace(/\D/g, "").slice(0, 4);
    input.value = postalCode;
    if (postalCode.length !== 4) {
      statusEl.hidden = false;
      statusEl.textContent = "Adj meg érvényes 4 számjegyű irányítószámot.";
      statusEl.dataset.statusType = "err";
      return;
    }
    loadRecommendations(postalCode);
  });

  if (saved.length === 4) {
    loadRecommendations(saved);
  }
}
