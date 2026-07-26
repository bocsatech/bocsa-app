import { haversineKm } from "./home-nearby.js";

export function normalizePlace(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCityIndex(cities) {
  const byNorm = new Map();
  for (const row of cities ?? []) {
    const city = String(row.city ?? "").trim();
    if (!city || row.lat == null || row.lon == null) continue;
    const key = normalizePlace(city);
    if (!key || byNorm.has(key)) continue;
    byNorm.set(key, { city, lat: Number(row.lat), lon: Number(row.lon) });
  }
  return byNorm;
}

export function listingCityName(item) {
  const filter = item.preview?.filter ?? {};
  const fromFilter = filter.telepules || "";
  const fromLocation = item.preview?.location || "";
  return String(fromFilter || fromLocation.split(",")[0] || "").trim();
}

export function resolveListingCoords(item, cityIndex) {
  const name = listingCityName(item);
  const norm = normalizePlace(name);
  if (!norm) return null;
  if (cityIndex.has(norm)) return cityIndex.get(norm);
  for (const [key, coords] of cityIndex) {
    if (norm.includes(key) || key.includes(norm)) return coords;
  }
  return null;
}

export function filterListingsInRadius(items, originLat, originLon, radiusKm, cityIndex) {
  const radius = Number(radiusKm);
  if (!Number.isFinite(radius) || radius <= 0) return [];
  return (items ?? []).filter((item) => {
    const coords = resolveListingCoords(item, cityIndex);
    if (!coords) return false;
    return haversineKm(originLat, originLon, coords.lat, coords.lon) <= radius;
  });
}

export function countListingsInRadius(items, originLat, originLon, radiusKm, cityIndex) {
  return filterListingsInRadius(items, originLat, originLon, radiusKm, cityIndex).length;
}

export function listingTimestamp(item) {
  const raw = item.updated_at ?? item.created_at;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

export function isListingWithinHours(item, hours) {
  const timestamp = listingTimestamp(item);
  if (timestamp == null) return false;
  const cutoff = Date.now() - Number(hours) * 3600000;
  return timestamp >= cutoff;
}

export function filterListingsRecentInRadius(
  items,
  originLat,
  originLon,
  radiusKm,
  cityIndex,
  hours = 24
) {
  const inRadius = filterListingsInRadius(items, originLat, originLon, radiusKm, cityIndex);
  return inRadius.filter((item) => isListingWithinHours(item, hours));
}
