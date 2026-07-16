import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  collectListingLinksFromPage,
  collectSubListLinksFromPage,
} from "./links.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MAX_SUB_LISTS = 20;

export async function launchBrowser({ profileDir, headless = true } = {}) {
  const resolvedProfile = profileDir ?? join(process.cwd(), ".browser-profile");
  mkdirSync(resolvedProfile, { recursive: true });

  const common = {
    headless,
    locale: "hu-HU",
    viewport: { width: 1360, height: 900 },
    userAgent: USER_AGENT,
    args: ["--disable-blink-features=AutomationControlled"],
  };

  try {
    const context = await chromium.launchPersistentContext(resolvedProfile, {
      ...common,
      channel: "chrome",
    });
    return { context, browserName: "Google Chrome" };
  } catch {
    const context = await chromium.launchPersistentContext(resolvedProfile, common);
    return { context, browserName: "Chromium (Playwright)" };
  }
}

export function isBlockedContent(title, html) {
  return (
    /cloudflare|pillanat|attention required|biztonsági ellenőrzés/i.test(title) ||
    /cf-challenge|cf-turnstile/i.test(html)
  );
}

async function waitForPage(page, isReady, timeoutMs = 120000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const title = await page.title();
    const html = await page.content();
    if (!isBlockedContent(title, html) && isReady(html, title)) {
      return html;
    }
    await page.waitForTimeout(1500);
  }

  throw new Error(
    "Az oldal nem töltődött be időben. Futtasd --headed módban, és ha kell, végezd el a Cloudflare ellenőrzést."
  );
}

export async function isPageBlocked(page) {
  const title = await page.title();
  const html = await page.content();
  return isBlockedContent(title, html);
}

export async function dismissCookieBanner(page) {
  const candidates = [
    page.getByRole("button", { name: /elfogad|hozzájárul|összes.*elfogad|accept/i }),
    page.locator("button, a").filter({ hasText: /elfogad|hozzájárul/i }),
  ];

  for (const locator of candidates) {
    try {
      const target = locator.first();
      if ((await target.count()) === 0 || !(await target.isVisible())) continue;
      await target.click({ timeout: 3000 });
      await page.waitForTimeout(800);
      return;
    } catch {
      /* next */
    }
  }
}

async function scrollPage(page) {
  for (let step = 0; step < 6; step += 1) {
    await page.evaluate((offset) => window.scrollTo(0, offset), step * 900);
    await page.waitForTimeout(1000);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

export async function waitForListingPage(page, timeoutMs = 120000) {
  return waitForPage(
    page,
    (html) => html.includes("hirdetesadatok") || html.includes("Alapadatok") || /<h1/i.test(html),
    timeoutMs
  );
}

export async function collectListingLinksWithRetry(page, baseUrl, { timeoutMs = 60000 } = {}) {
  const started = Date.now();
  let best = [];

  while (Date.now() - started < timeoutMs) {
    if (await isPageBlocked(page)) {
      throw new Error(
        "Cloudflare védelem blokkolja az oldalt. Futtasd így: npm start -- \"LINK\" --headed"
      );
    }

    await dismissCookieBanner(page);
    await scrollPage(page);

    const links = await collectListingLinksFromPage(page, baseUrl);
    if (links.length > best.length) best = links;
    if (links.length > 0) return links;

    await page.waitForTimeout(2000);
  }

  return best;
}

export async function saveDebugHtml(page, label = "debug") {
  const dir = join(process.cwd(), "output");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${label}-oldal.html`);
  writeFileSync(path, await page.content(), "utf8");
  return path;
}

export async function collectAllListingLinks(page, listUrl, { onProgress, debug = false } = {}) {
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);

  let listings = await collectListingLinksWithRetry(page, listUrl, { timeoutMs: 45000 });
  if (listings.length > 0) {
    onProgress?.(`Közvetlen hirdetések: ${listings.length}`);
    return listings;
  }

  const subLists = await collectSubListLinksFromPage(page, listUrl);
  if (subLists.length === 0) {
    if (debug) {
      const path = await saveDebugHtml(page, "hiba");
      onProgress?.(`Hibakereső HTML mentve: ${path}`);
    }
    return [];
  }

  onProgress?.(`Nincs közvetlen hirdetés. Alkategóriák bejárása: ${subLists.length} db`);

  const all = new Set();
  const targets = subLists.slice(0, MAX_SUB_LISTS);

  for (let i = 0; i < targets.length; i += 1) {
    const subUrl = targets[i];
    onProgress?.(`[${i + 1}/${targets.length}] ${subUrl}`);

    await page.goto(subUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(3000);

    const found = await collectListingLinksWithRetry(page, subUrl, { timeoutMs: 45000 });
    found.forEach((link) => all.add(link));
    onProgress?.(`  → ${found.length} hirdetés`);
  }

  return [...all].sort((a, b) => a.localeCompare(b, "hu"));
}

export async function revealPhoneNumber(page) {
  const revealSelectors = [
    page.getByRole("button", { name: /telefonszám.*felfed/i }),
    page.getByRole("link", { name: /telefonszám.*felfed/i }),
    page.getByText(/elsődleges telefonszám.*felfed/i),
    page.getByText(/telefonszám.*felfedése/i),
    page.locator("button, a").filter({ hasText: /felfed/i }),
  ];

  for (const locator of revealSelectors) {
    try {
      const target = locator.first();
      if ((await target.count()) === 0 || !(await target.isVisible())) continue;
      await target.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      break;
    } catch {
      /* try next selector */
    }
  }

  const contactArea = page.locator(
    "[class*='contact'], [class*='kapcsolat'], [id*='contact'], [id*='kapcsolat'], aside, .seller"
  );
  const text = (await contactArea.count()) > 0 ? await contactArea.first().innerText().catch(() => "") : "";
  const fullText = `${text}\n${await page.locator("body").innerText()}`;
  const match = fullText.match(/(?:\+36|06)[\s\d/-]{7,16}\d/);
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}
