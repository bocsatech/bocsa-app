/** Székesfehérvár – Dabas – Velencei-tó környéke (mellékelt térkép régiója) */

export const NEARBY_RADIUS_KM = 40;

export const REGION_CITIES = [
  { name: "Székesfehérvár", lat: 47.186, lon: 18.413 },
  { name: "Dabas", lat: 47.186, lon: 19.308 },
  { name: "Velence", lat: 47.238, lon: 18.654 },
  { name: "Gárdony", lat: 47.193, lon: 18.616 },
  { name: "Pusztaszabolcs", lat: 47.137, lon: 18.642 },
  { name: "Adony", lat: 47.119, lon: 18.864 },
  { name: "Ráckeve", lat: 47.161, lon: 19.006 },
  { name: "Ercsi", lat: 47.252, lon: 18.896 },
  { name: "Iváncsa", lat: 47.156, lon: 18.821 },
  { name: "Dömsöd", lat: 47.089, lon: 19.011 },
  { name: "Seregélyes", lat: 47.111, lon: 18.569 },
  { name: "Polgárdi", lat: 47.061, lon: 18.302 },
  { name: "Várpalota", lat: 47.196, lon: 18.139 },
  { name: "Csór", lat: 47.285, lon: 18.559 },
  { name: "Sárszentmihály", lat: 47.154, lon: 18.476 },
  { name: "Perkáta", lat: 47.051, lon: 18.787 },
  { name: "Kiskunlacháza", lat: 47.188, lon: 19.148 },
  { name: "Bugyi", lat: 47.227, lon: 19.279 },
  { name: "Apaj", lat: 47.114, lon: 19.146 },
  { name: "Pákozd", lat: 47.213, lon: 18.553 },
];

const cityByNormalized = new Map(
  REGION_CITIES.map((city) => [normalizePlace(city.name), city])
);

function normalizePlace(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestCity(lat, lon) {
  let best = null;
  let bestKm = Infinity;
  for (const city of REGION_CITIES) {
    const km = haversineKm(lat, lon, city.lat, city.lon);
    if (km < bestKm) {
      bestKm = km;
      best = { ...city, distanceKm: km };
    }
  }
  return best;
}

function listingPlace(item) {
  const filter = item.preview?.filter ?? {};
  const fromFilter = filter.telepules || "";
  const fromLocation = item.preview?.location || "";
  return normalizePlace(fromFilter || fromLocation.split(",")[0]);
}

function resolveListingCity(item) {
  const place = listingPlace(item);
  if (!place) return null;

  if (cityByNormalized.has(place)) return cityByNormalized.get(place);

  for (const city of REGION_CITIES) {
    const key = normalizePlace(city.name);
    if (place.includes(key) || key.includes(place)) return city;
  }
  return null;
}

export function filterListingsNearby(items, userLat, userLon, radiusKm = NEARBY_RADIUS_KM) {
  return items.filter((item) => {
    const city = resolveListingCity(item);
    if (!city) return false;
    const dist = haversineKm(userLat, userLon, city.lat, city.lon);
    return dist <= radiusKm;
  });
}

export function initHomeNearby({ onChange }) {
  const root = document.getElementById("home-nearby");
  const btn = document.getElementById("home-nearby-btn");
  const statusEl = document.getElementById("home-nearby-status");
  const clearBtn = document.getElementById("home-nearby-clear");
  if (!root || !btn) return null;

  let active = null;

  function setStatus(message, type = "") {
    if (!statusEl) return;
    statusEl.hidden = !message;
    statusEl.textContent = message ?? "";
    statusEl.dataset.statusType = type;
  }

  function applyActive(next) {
    active = next;
    root.classList.toggle("is-active", Boolean(active));
    clearBtn.hidden = !active;
    onChange?.(active);
  }

  clearBtn?.addEventListener("click", () => {
    applyActive(null);
    setStatus("");
    btn.disabled = false;
    btn.textContent = "Helymeghatározás engedélyezése";
  });

  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("A böngésző nem támogatja a helymeghatározást.", "err");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Helymeghatározás…";
    setStatus("Engedélyezd a helyhozzáférést a böngészőben.", "info");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = findNearestCity(latitude, longitude);
        applyActive({ lat: latitude, lon: longitude, nearest });
        btn.disabled = false;
        btn.textContent = "Hely frissítése";
        const label = nearest?.name ?? "a környékeden";
        setStatus(
          `Szűrés: ${label} környéke (${NEARBY_RADIUS_KM} km) — csak a térképen látható régió hirdetései.`,
          "ok"
        );
      },
      (error) => {
        btn.disabled = false;
        btn.textContent = "Helymeghatározás engedélyezése";
        const msg =
          error.code === error.PERMISSION_DENIED
            ? "A helymeghatározás le van tiltva. Engedélyezd a böngésző beállításaiban."
            : "Nem sikerült meghatározni a helyzetet. Próbáld újra.";
        setStatus(msg, "err");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  });

  return {
    getActive: () => active,
    clear: () => {
      applyActive(null);
      setStatus("");
      btn.disabled = false;
      btn.textContent = "Helymeghatározás engedélyezése";
    },
  };
}
