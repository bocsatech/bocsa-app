import { launchBrowser, revealPhoneNumber, waitForListingPage } from "./browser.mjs";
import { formatResultText, parseListingHtml } from "./parse.mjs";

const HASZNALTAUTO_RE = /^https?:\/\/(www\.)?hasznaltauto\.hu\//i;

export function normalizeListingUrl(input) {
  const url = String(input ?? "").trim();
  if (!url) throw new Error("Üres link.");
  if (!HASZNALTAUTO_RE.test(url)) {
    throw new Error("Csak hasznaltauto.hu hirdetés link támogatott.");
  }
  return url;
}

export async function scrapeListing(url, { headless = true, profileDir } = {}) {
  const listingUrl = normalizeListingUrl(url);
  const { context } = await launchBrowser({ profileDir, headless });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  try {
    await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    const html = await waitForListingPage(page);
    const telefonszam = await revealPhoneNumber(page);
    const parsed = parseListingHtml(html, { url: listingUrl, phone: telefonszam });
    return {
      ...parsed,
      text: formatResultText(parsed),
    };
  } finally {
    await context.close();
  }
}
