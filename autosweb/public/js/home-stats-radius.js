import {
  buildCityIndex,
  filterListingsInRadius,
} from "./listing-radius.js";

const STORAGE_POSTAL = "autosweb_stats_postal";
const STORAGE_RADIUS = "autosweb_stats_radius_km";

async function fetchPostalLookup(postalCode) {
  const params = new URLSearchParams({ postal_code: postalCode });
  const res = await fetch(`/api/postal-codes/lookup?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Ismeretlen irányítószám.");
  }
  return data;
}

async function fetchCityIndex() {
  const res = await fetch("/api/postal-codes/cities");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Nem sikerült betölteni a településlistát.");
  }
  return buildCityIndex(data.cities ?? []);
}

function formatCount(value) {
  return Number(value).toLocaleString("hu-HU");
}

export function initHomeStatsRadius({ onChange, getItems }) {
  const card = document.getElementById("home-stats-total-card");
  const postalInput = document.getElementById("home-stats-postal");
  const radiusInput = document.getElementById("home-stats-radius-km");
  const countEl = document.getElementById("home-stats-total-count");
  const metaEl = document.getElementById("home-stats-total-meta");
  if (!card || !postalInput || !radiusInput || !countEl || !metaEl) return null;

  let cityIndexPromise = null;
  let active = null;

  function getCityIndex() {
    if (!cityIndexPromise) {
      cityIndexPromise = fetchCityIndex();
    }
    return cityIndexPromise;
  }

  function setMeta(message, type = "") {
    metaEl.textContent = message ?? "";
    metaEl.dataset.statusType = type;
  }

  function setCount(value) {
    countEl.textContent = value == null ? "—" : formatCount(value);
  }

  function readInputs() {
    const postal_code = postalInput.value.replace(/\D/g, "").slice(0, 4);
    const radiusRaw = radiusInput.value.trim();
    const radiusKm = Number(radiusRaw);
    return { postal_code, radiusRaw, radiusKm };
  }

  function validateInputs() {
    const { postal_code, radiusRaw, radiusKm } = readInputs();
    if (postal_code.length !== 4) {
      return { error: "Adj meg érvényes 4 számjegyű irányítószámot." };
    }
    if (!radiusRaw || !Number.isFinite(radiusKm) || radiusKm <= 0) {
      return { error: "Add meg a keresési sugarat km-ben." };
    }
    return { postal_code, radiusKm };
  }

  function buildActiveFilter(origin, radiusKm, filtered) {
    return {
      postal_code: origin.postal_code,
      radiusKm,
      origin,
      listingIds: new Set(filtered.map((item) => item.id)),
      count: filtered.length,
    };
  }

  async function applyRadiusFilter() {
    const parsed = validateInputs();
    if (parsed.error) {
      setMeta(parsed.error, "err");
      return null;
    }

    const { postal_code, radiusKm } = parsed;

    if (
      active &&
      active.postal_code === postal_code &&
      active.radiusKm === radiusKm
    ) {
      active = null;
      card.classList.remove("is-active");
      setCount(null);
      setMeta("Add meg az irányítószámot és a sugarat, majd kattints.");
      onChange?.(null);
      return null;
    }

    try {
      const origin = await fetchPostalLookup(postal_code);
      const cityIndex = await getCityIndex();
      const filtered = filterListingsInRadius(
        getItems(),
        origin.lat,
        origin.lon,
        radiusKm,
        cityIndex
      );
      active = buildActiveFilter(origin, radiusKm, filtered);
      card.classList.add("is-active");
      setCount(active.count);
      setMeta(`${origin.city} · ${radiusKm} km`, "ok");
      onChange?.(active);

      try {
        localStorage.setItem(STORAGE_POSTAL, postal_code);
        localStorage.setItem(STORAGE_RADIUS, String(radiusKm));
      } catch {
        /* ignore */
      }

      document.querySelector(".home-listings-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return active;
    } catch (error) {
      setMeta(error.message ?? "Nem sikerült a keresés.", "err");
      return null;
    }
  }

  async function refreshActiveCount() {
    if (!active) return;
    try {
      const cityIndex = await getCityIndex();
      const filtered = filterListingsInRadius(
        getItems(),
        active.origin.lat,
        active.origin.lon,
        active.radiusKm,
        cityIndex
      );
      active = buildActiveFilter(active.origin, active.radiusKm, filtered);
      setCount(active.count);
      onChange?.(active);
    } catch {
      /* keep previous count */
    }
  }

  postalInput.addEventListener("input", () => {
    postalInput.value = postalInput.value.replace(/\D/g, "").slice(0, 4);
  });

  radiusInput.addEventListener("input", () => {
    if (radiusInput.value.includes("-")) {
      radiusInput.value = radiusInput.value.replace(/-/g, "");
    }
  });

  card.addEventListener("click", (event) => {
    if (event.target.closest("input, label")) return;
    applyRadiusFilter();
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("input")) return;
    event.preventDefault();
    applyRadiusFilter();
  });

  try {
    const savedPostal = localStorage.getItem(STORAGE_POSTAL);
    const savedRadius = localStorage.getItem(STORAGE_RADIUS);
    if (savedPostal) postalInput.value = savedPostal.replace(/\D/g, "").slice(0, 4);
    if (savedRadius) radiusInput.value = savedRadius.replace(/[^\d.,]/g, "").replace(",", ".");
  } catch {
    /* ignore */
  }

  setMeta("Add meg az irányítószámot és a sugarat, majd kattints.");

  return {
    getActive: () => active,
    clear: () => {
      active = null;
      card.classList.remove("is-active");
      setCount(null);
      setMeta("Add meg az irányítószámot és a sugarat, majd kattints.");
      onChange?.(null);
    },
    refreshActiveCount,
  };
}
