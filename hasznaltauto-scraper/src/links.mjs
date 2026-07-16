const HASZNALTAUTO_HOST = "hasznaltauto.hu";
const LISTING_PATH_RE = /\/szemelyauto\/.+-\d{5,}$/i;

export function isHasznaltautoUrl(input) {
  try {
    const url = new URL(String(input ?? "").trim());
    return url.hostname.replace(/^www\./, "") === HASZNALTAUTO_HOST;
  } catch {
    return false;
  }
}

export function isListingUrl(input) {
  if (!isHasznaltautoUrl(input)) return false;
  const pathname = new URL(input).pathname;
  return LISTING_PATH_RE.test(pathname);
}

export function isListPageUrl(input) {
  return isHasznaltautoUrl(input) && !isListingUrl(input);
}

export function normalizeListingHref(href, baseUrl) {
  try {
    const absolute = new URL(href, baseUrl);
    if (absolute.hostname.replace(/^www\./, "") !== HASZNALTAUTO_HOST) return null;
    if (!LISTING_PATH_RE.test(absolute.pathname)) return null;
    absolute.hash = "";
    absolute.search = "";
    return absolute.toString();
  } catch {
    return null;
  }
}

export function extractListingLinksFromHtml(html, baseUrl) {
  const found = new Set();
  const hrefMatches = html.matchAll(/href="([^"]+)"/gi);

  for (const match of hrefMatches) {
    const normalized = normalizeListingHref(match[1], baseUrl);
    if (normalized) found.add(normalized);
  }

  return [...found].sort((a, b) => a.localeCompare(b, "hu"));
}

export function slugFromListUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "lista";
}
