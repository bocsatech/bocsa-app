const LISTING_ID_KEY = "autosweb-listing-id";

export function getStoredListingId() {
  const raw = sessionStorage.getItem(LISTING_ID_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setStoredListingId(id) {
  if (id == null) sessionStorage.removeItem(LISTING_ID_KEY);
  else sessionStorage.setItem(LISTING_ID_KEY, String(id));
}

async function parseJson(response) {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 404 && data.error === "Ismeretlen API.") {
      throw new Error("Régi Autosweb szerver — futtasd: autosweb/mac/frissites.command, majd indítsd újra.");
    }
    throw new Error(data.error || "Szerver hiba");
  }
  return data;
}

export async function fetchDbStats() {
  const response = await fetch("/api/db/stats");
  return parseJson(response);
}

export async function fetchLatestListing() {
  const response = await fetch("/api/listings/latest");
  const data = await parseJson(response);
  return data.listing ?? null;
}

export async function fetchListing(id) {
  const response = await fetch(`/api/listings/${id}`);
  const data = await parseJson(response);
  return data.listing ?? null;
}

export async function saveListingToDb(formData, listingId = null) {
  const response = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form: formData, id: listingId }),
  });
  const data = await parseJson(response);
  const saved = data.listing;
  if (saved?.id) setStoredListingId(saved.id);
  return saved;
}
