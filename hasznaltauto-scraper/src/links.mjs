import { shortUrl } from "./url-utils.mjs";

const HASZNALTAUTO_HOST = "hasznaltauto.hu";
const LISTING_PATH_RE = /\/szemelyauto\/.+-\d{5,}$/i;
const LISTING_URL_RE = /https?:\/\/(?:www\.)?hasznaltauto\.hu\/szemelyauto\/.+-\d{5,}/gi;

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

function pathDepth(pathname) {
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
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

export function normalizeSubListHref(href, listUrl) {
  try {
    const absolute = new URL(href, listUrl);
    if (absolute.hostname.replace(/^www\./, "") !== HASZNALTAUTO_HOST) return null;

    const listPath = new URL(listUrl).pathname.replace(/\/$/, "");
    const path = absolute.pathname.replace(/\/$/, "");

    if (!path.startsWith("/szemelyauto/")) return null;
    if (!path.startsWith(`${listPath}/`)) return null;
    if (LISTING_PATH_RE.test(path)) return null;
    if (pathDepth(path) !== pathDepth(listPath) + 1) return null;

    absolute.hash = "";
    absolute.search = "";
    return absolute.toString();
  } catch {
    return null;
  }
}

function addNormalizedLinks(found, hrefs, baseUrl, normalizer) {
  for (const href of hrefs) {
    const normalized = normalizer(href, baseUrl);
    if (normalized) found.add(normalized);
  }
}

export function extractListingLinksFromHtml(html, baseUrl) {
  const found = new Set();
  const patterns = [/href="([^"]+)"/gi, /href='([^']+)'/gi];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const normalized = normalizeListingHref(match[1], baseUrl);
      if (normalized) found.add(normalized);
    }
  }

  for (const match of html.matchAll(LISTING_URL_RE)) {
    const normalized = normalizeListingHref(match[0], baseUrl);
    if (normalized) found.add(normalized);
  }

  return [...found].sort((a, b) => a.localeCompare(b, "hu"));
}

export function extractSubListLinksFromHtml(html, listUrl) {
  const found = new Set();
  const patterns = [/href="([^"]+)"/gi, /href='([^']+)'/gi];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const normalized = normalizeSubListHref(match[1], listUrl);
      if (normalized) found.add(normalized);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b, "hu"));
}

export async function readHrefsFromPage(page) {
  return page.evaluate(() => {
    const found = new Set();
    const add = (value) => {
      if (value) found.add(value);
    };

    document.querySelectorAll("a[href]").forEach((anchor) => add(anchor.href));
    document.querySelectorAll("[data-href], [data-url]").forEach((node) => {
      add(node.getAttribute("data-href"));
      add(node.getAttribute("data-url"));
    });

    return [...found];
  });
}

export async function collectListingLinksFromPage(page, baseUrl) {
  const hrefs = await readHrefsFromPage(page);
  const unique = new Set();
  addNormalizedLinks(unique, hrefs, baseUrl, normalizeListingHref);

  const html = await page.content();
  for (const link of extractListingLinksFromHtml(html, baseUrl)) {
    unique.add(link);
  }

  return [...unique].sort((a, b) => a.localeCompare(b, "hu"));
}

export async function collectSubListLinksFromPage(page, listUrl) {
  const hrefs = await readHrefsFromPage(page);
  const unique = new Set();
  addNormalizedLinks(unique, hrefs, listUrl, normalizeSubListHref);

  const html = await page.content();
  for (const link of extractSubListLinksFromHtml(html, listUrl)) {
    unique.add(link);
  }

  return [...unique].sort((a, b) => a.localeCompare(b, "hu"));
}

export { slugFromListUrl } from "./url-utils.mjs";
