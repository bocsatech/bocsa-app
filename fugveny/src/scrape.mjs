import { mkdirSync } from "fs";
import { join } from "path";
import {
  buildListPageUrl,
  extractMaxPageFromHtml,
  stripPageFromUrl,
} from "./pagination.mjs";
import { parseListingCard } from "./parse.mjs";
import {
  connectOverCdp,
  DEFAULT_CDP_URL,
  startChromeWithDebugging,
  waitForCdpReady,
} from "./chrome.mjs";
import { chromium } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MAX_PAGES = 80;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlocked(title, html, url) {
  const t = `${title} ${url}`.toLowerCase();
  return (
    /just a moment|attention required|cloudflare|cf-browser-verification|challenge-platform/i.test(
      t + html.slice(0, 4000)
    ) && !/talalati-sor|hirdetéskód|hasznaltauto/i.test(html.slice(0, 8000))
  );
}

async function dismissCookies(page) {
  const candidates = [
    page.getByRole("button", { name: /elfogad|hozzájárul|összes.*elfogad|accept/i }),
    page.locator("button, a").filter({ hasText: /elfogad|hozzájárul/i }),
  ];
  for (const locator of candidates) {
    try {
      const target = locator.first();
      if ((await target.count()) === 0 || !(await target.isVisible())) continue;
      await target.click({ timeout: 2500 });
      await page.waitForTimeout(600);
      return;
    } catch {
      /* next */
    }
  }
}

async function scrollPage(page) {
  for (let step = 0; step < 6; step += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), step * 900);
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

export async function launchBrowser({ headless = true, profileDir } = {}) {
  const resolved = profileDir ?? join(process.cwd(), ".browser-profile");
  mkdirSync(resolved, { recursive: true });

  const common = {
    headless,
    locale: "hu-HU",
    viewport: { width: 1360, height: 900 },
    userAgent: USER_AGENT,
    args: ["--disable-blink-features=AutomationControlled"],
  };

  try {
    const context = await chromium.launchPersistentContext(resolved, {
      ...common,
      channel: "chrome",
    });
    return { context, external: false, browser: null };
  } catch {
    const context = await chromium.launchPersistentContext(resolved, common);
    return { context, external: false, browser: null };
  }
}

async function openSession({ connect, headless, profileDir, startUrl, onProgress }) {
  if (connect) {
    let ready = false;
    try {
      const probe = await fetch(`${DEFAULT_CDP_URL}/json/version`, {
        signal: AbortSignal.timeout(1500),
      });
      ready = probe.ok;
    } catch {
      ready = false;
    }

    if (!ready) {
      onProgress?.("Chrome indítása debug porttal (9222)...");
      startChromeWithDebugging(startUrl, 9222, join(profileDir || process.cwd(), ".chrome-connect-profile"));
      ready = await waitForCdpReady(DEFAULT_CDP_URL, { onProgress });
      if (!ready) throw new Error("Chrome nem indult el. Futtasd: npm run chrome");
      onProgress?.(
        "Ha Cloudflare kérdést látsz Chrome-ban, oldd meg, majd a program folytatja..."
      );
      // Extra wait for human Cloudflare click
      await new Promise((r) => setTimeout(r, 15000));
    }

    return connectOverCdp(DEFAULT_CDP_URL);
  }

  return launchBrowser({ headless, profileDir });
}

export async function extractCards(page) {
  return page.evaluate(() => {
    const listingRe = /\/(?:szemelyauto|hasznaltauto)\/[^?#]+-\d{5,}/i;
    const seen = new Set();
    const cards = [];

    const add = (url, container, title) => {
      try {
        const absolute = new URL(url, window.location.href);
        if (!listingRe.test(absolute.pathname) && !/\/\d{6,}(?:\/|$)/.test(absolute.pathname)) {
          // also allow classic /szemelyauto/...-12345678
          if (!/-\d{5,}(?:\/|$|\?)/.test(absolute.pathname)) return;
        }
        const clean = `${absolute.origin}${absolute.pathname}`;
        if (seen.has(clean)) return;
        seen.add(clean);
        const text = (container || document.body).innerText?.replace(/\s+/g, " ").trim() ?? "";
        cards.push({ url: clean, text, title: (title || "").trim() });
      } catch {
        /* skip */
      }
    };

    for (const row of document.querySelectorAll(".row.talalati-sor, .talalati-sor")) {
      const anchor =
        row.querySelector(".cim-kontener h3 a") ||
        row.querySelector("h3 a[href]") ||
        row.querySelector("a[href*='szemelyauto'], a[href*='hasznaltauto']");
      if (!anchor) continue;
      add(anchor.href, row, anchor.innerText);
    }

    if (cards.length === 0) {
      for (const anchor of document.querySelectorAll("a[href*='szemelyauto'], a[href*='-/']")) {
        const container =
          anchor.closest(".talalati-sor, article, [class*='talalat'], [class*='listing'], li, .row") ||
          anchor.parentElement;
        add(anchor.href, container, anchor.innerText);
      }
    }

    return cards;
  });
}

async function waitForListOrThrow(page, { onProgress, timeoutMs = 90000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const title = await page.title();
    const html = await page.content();
    const url = page.url();

    if (isBlocked(title, html, url)) {
      onProgress?.("Cloudflare / blokkolás — várakozás...");
      await page.waitForTimeout(2000);
      continue;
    }

    const cards = await extractCards(page);
    if (cards.length > 0) return cards;

    await dismissCookies(page);
    await scrollPage(page);
    await page.waitForTimeout(1000);
  }
  throw new Error("Nem töltődött be a találati lista időben (Cloudflare?).");
}

export async function scrapeListUrl(
  listUrl,
  { onProgress, headless = true, profileDir, connect = false } = {}
) {
  const startUrl = stripPageFromUrl(listUrl);
  const session = await openSession({
    connect,
    headless,
    profileDir,
    startUrl,
    onProgress,
  });
  const { context, external } = session;
  const page = context.pages().find((p) => !p.isClosed()) || (await context.newPage());

  const close = async () => {
    if (external) {
      // Ne zárd be a felhasználó Chrome-ját — csak a CDP kapcsolatot engedjük el.
      return;
    }
    await context.close();
  };

  try {
    onProgress?.(`Megnyitás: ${startUrl.slice(0, 80)}…`);
    if (!page.url().includes("talalatilista") && !page.url().includes("hasznaltauto")) {
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    } else if (!/talalatilista/i.test(page.url())) {
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    }
    await dismissCookies(page);

    let firstCards;
    try {
      firstCards = await waitForListOrThrow(page, {
        onProgress,
        timeoutMs: connect ? 180000 : 90000,
      });
    } catch (error) {
      if (!connect && headless) {
        onProgress?.("Headless nem ment — újrapróbál headed módban...");
        await close();
        return scrapeListUrl(listUrl, {
          onProgress,
          headless: false,
          profileDir,
          connect: false,
        });
      }
      if (!connect) {
        onProgress?.("Próbáld Mac-en: npm start -- --connect");
      }
      throw error;
    }

    const html = await page.content();
    let maxPage = extractMaxPageFromHtml(html, page.url());

    // Live pagination scan
    const liveMax = await page.evaluate(() => {
      const nums = [];
      document.querySelectorAll("a[href], strong, b, span").forEach((node) => {
        const t = String(node.textContent || "").trim();
        if (/^\d{1,3}$/.test(t)) nums.push(Number.parseInt(t, 10));
        const href = node.getAttribute?.("href") || "";
        const m = href.match(/\/page(\d+)/i);
        if (m) nums.push(Number.parseInt(m[1], 10));
      });
      return nums.length ? Math.max(...nums) : 1;
    });
    maxPage = Math.max(maxPage, liveMax, 1);
    onProgress?.(`Lapozó: 1…${maxPage} oldal`);

    const byUrl = new Map();
    for (const card of firstCards) {
      byUrl.set(card.url, card);
    }
    onProgress?.(`Oldal 1/${maxPage}: ${firstCards.length} hirdetés (össz: ${byUrl.size})`);

    for (let pageNum = 2; pageNum <= Math.min(maxPage, MAX_PAGES); pageNum += 1) {
      const target = buildListPageUrl(startUrl, pageNum);
      onProgress?.(`Oldal ${pageNum}/${maxPage}…`);
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
      await dismissCookies(page);
      await scrollPage(page);
      await page.waitForTimeout(700);

      let cards = await extractCards(page);
      if (cards.length === 0) {
        await page.waitForTimeout(1500);
        cards = await extractCards(page);
      }
      if (cards.length === 0) {
        onProgress?.(`  → üres oldal, megállás (össz: ${byUrl.size})`);
        break;
      }

      for (const card of cards) {
        if (!byUrl.has(card.url)) byUrl.set(card.url, card);
      }
      onProgress?.(`  → ${cards.length} db (össz: ${byUrl.size})`);
      await sleep(400);
    }

    const results = [...byUrl.values()].map(parseListingCard);
    return {
      listUrl: startUrl,
      pagesScraped: Math.min(maxPage, MAX_PAGES),
      maxPage,
      results,
    };
  } finally {
    await close();
  }
}
