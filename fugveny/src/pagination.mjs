const PAGE_SUFFIX_RE = /\/page(\d+)$/i;

export function getPageNumberFromUrl(url) {
  try {
    const match = new URL(url).pathname.match(PAGE_SUFFIX_RE);
    return match ? Number.parseInt(match[1], 10) : 1;
  } catch {
    return 1;
  }
}

export function stripPageFromUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(PAGE_SUFFIX_RE, "").replace(/\/$/, "") || "/";
    return parsed.toString();
  } catch {
    return url;
  }
}

export function buildListPageUrl(baseUrl, pageNum) {
  const parsed = new URL(stripPageFromUrl(baseUrl));
  const path = parsed.pathname.replace(/\/$/, "") || "/";
  parsed.pathname = pageNum <= 1 ? path : `${path}/page${pageNum}`;
  return parsed.toString();
}

export function extractMaxPageFromHtml(html, currentUrl = "") {
  const pageNumbers = new Set([getPageNumberFromUrl(currentUrl)]);

  for (const match of html.matchAll(/href="([^"]*\/page\d+[^"]*)"/gi)) {
    const pageMatch = match[1].match(/\/page(\d+)/i);
    if (pageMatch) pageNumbers.add(Number.parseInt(pageMatch[1], 10));
  }

  for (const match of html.matchAll(/<a[^>]*href="[^"]*"[^>]*>\s*(\d{1,3})\s*<\/a>/gi)) {
    const num = Number.parseInt(match[1], 10);
    if (Number.isFinite(num) && num > 0 && num <= 500) pageNumbers.add(num);
  }

  return pageNumbers.size > 0 ? Math.max(...pageNumbers) : 1;
}
