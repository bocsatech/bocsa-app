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

function parsePageNumber(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const num = Number.parseInt(text, 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function extractPaginationFromHtml(html, currentUrl = "") {
  const pageNumbers = new Set([getPageNumberFromUrl(currentUrl)]);
  let nextHref = null;

  const hrefMatches = [...html.matchAll(/href="([^"]*\/page\d+[^"]*)"/gi)];
  for (const match of hrefMatches) {
    const pageMatch = match[1].match(/\/page(\d+)/i);
    if (pageMatch) pageNumbers.add(Number.parseInt(pageMatch[1], 10));
  }

  const textNumbers = [...html.matchAll(/<a[^>]*href="[^"]*"[^>]*>\s*(\d{1,3})\s*<\/a>/gi)];
  for (const match of textNumbers) {
    const num = parsePageNumber(match[1]);
    if (num) pageNumbers.add(num);
  }

  const nextPatterns = [
    /<a[^>]*rel="next"[^>]*href="([^"]+)"/i,
    /<a[^>]*href="([^"]+)"[^>]*rel="next"/i,
    /<a[^>]*href="([^"]*\/page\d+)"[^>]*>[^<]*(?:→|›|»|&rarr;)/i,
    /<a[^>]*>[^<]*(?:→|›|»|&rarr;)[^<]*<\/a>\s*$/im,
  ];

  for (const pattern of nextPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      nextHref = match[1];
      break;
    }
  }

  const maxPage = pageNumbers.size > 0 ? Math.max(...pageNumbers) : 1;
  const currentPage = getPageNumberFromUrl(currentUrl);

  return {
    currentPage,
    maxPage,
    nextHref,
    hasPagination: maxPage > 1 || Boolean(nextHref),
  };
}
