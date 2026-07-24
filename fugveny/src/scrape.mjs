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

const MAX_PAGES = 5000;
const PAGE_RETRIES = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isContextDestroyed(error) {
  const msg = String(error?.message ?? error ?? "");
  return /Execution context was destroyed|Target closed|most likely because of a navigation|Frame was detached/i.test(
    msg
  );
}

function isNavBlocked(error) {
  const msg = String(error?.message ?? error ?? "");
  return /ERR_BLOCKED_BY_RESPONSE|ERR_HTTP_RESPONSE_CODE_FAILURE|ERR_CONNECTION|net::ERR_|blocked by|403|Access denied/i.test(
    msg
  );
}

function isGotoFailure(error) {
  return isContextDestroyed(error) || isNavBlocked(error);
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

async function safeEvaluate(page, fn, arg) {
  try {
    return arg === undefined ? await page.evaluate(fn) : await page.evaluate(fn, arg);
  } catch (error) {
    if (!isContextDestroyed(error)) throw error;
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
    return arg === undefined ? await page.evaluate(fn) : await page.evaluate(fn, arg);
  }
}

async function scrollPage(page) {
  try {
    for (let step = 0; step < 5; step += 1) {
      await safeEvaluate(page, (y) => window.scrollTo(0, y), step * 900);
      await page.waitForTimeout(250);
    }
    await safeEvaluate(page, () => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
  } catch (error) {
    if (!isContextDestroyed(error)) throw error;
    // Navigáció közben történt — várunk, majd továbblépünk
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
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
      startChromeWithDebugging(
        startUrl,
        9222,
        join(profileDir || process.cwd(), ".chrome-connect-profile")
      );
      ready = await waitForCdpReady(DEFAULT_CDP_URL, { onProgress });
      if (!ready) throw new Error("Chrome nem indult el. Futtasd: npm run chrome");
      onProgress?.(
        "Ha Cloudflare kérdést látsz Chrome-ban, oldd meg, majd a program folytatja..."
      );
      await new Promise((r) => setTimeout(r, 15000));
    }

    return connectOverCdp(DEFAULT_CDP_URL);
  }

  return launchBrowser({ headless, profileDir });
}

export async function extractCards(page) {
  return safeEvaluate(page, () => {
    const listingRe = /\/(?:szemelyauto|hasznaltauto)\/[^?#]+-\d{5,}/i;
    const seen = new Set();
    const cards = [];

    const add = (url, container, title) => {
      try {
        const absolute = new URL(url, window.location.href);
        if (!listingRe.test(absolute.pathname) && !/\/\d{6,}(?:\/|$)/.test(absolute.pathname)) {
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

/** Prefer a tab that already shows listing cards. */
async function pickWorkingPage(context, fallbackPage) {
  const pages = context.pages().filter((p) => !p.isClosed());
  let best = fallbackPage;
  let bestCount = 0;

  for (const page of pages) {
    try {
      const url = page.url();
      if (!/hasznaltauto\.hu/i.test(url)) continue;
      const cards = await extractCards(page);
      const score = cards.length + (/talalatilista/i.test(url) ? 10 : 0);
      if (score > bestCount) {
        best = page;
        bestCount = score;
      }
    } catch {
      /* skip tab */
    }
  }

  return best;
}

async function clickPaginationPage(page, pageNum) {
  const clicked = await page.evaluate((num) => {
    const want = String(num);
    const links = [...document.querySelectorAll("a[href]")];
    const byText = links.find((a) => String(a.textContent || "").trim() === want);
    if (byText) {
      byText.click();
      return true;
    }
    const byHref = links.find((a) => new RegExp(`/page${num}(?:/|$|\\?)`, "i").test(a.getAttribute("href") || ""));
    if (byHref) {
      byHref.click();
      return true;
    }
    if (num === 2) {
      const next = links.find((a) => {
        const t = `${a.textContent || ""} ${a.getAttribute("rel") || ""}`;
        return /next|következ|→|›|»/i.test(t) || a.getAttribute("rel") === "next";
      });
      if (next) {
        next.click();
        return true;
      }
    }
    return false;
  }, pageNum);

  if (!clicked) return false;
  await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

async function ensureListVisible(page, { onProgress, timeoutMs = 180000 } = {}) {
  onProgress?.(
    "Nyisd meg Chrome-ban a hasznaltauto találati listát (ha még nincs), majd várj..."
  );
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if (/hasznaltauto\.hu/i.test(page.url())) {
        const cards = await extractCards(page);
        if (cards.length > 0) return cards;
      }
    } catch {
      /* retry */
    }
    await page.waitForTimeout(2000);
  }
  throw new Error(
    "Nem látszik a találati lista a Chrome-ban. Nyisd meg a listát kézzel, majd futtasd újra."
  );
}

async function waitForListOrThrow(page, { onProgress, timeoutMs = 90000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
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
    } catch (error) {
      if (isContextDestroyed(error)) {
        onProgress?.("Oldal újratöltődött — várok...");
        await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1200);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Nem töltődött be a találati lista időben (Cloudflare?).");
}

async function loadListPage(page, targetUrl, pageNum, { onProgress } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= PAGE_RETRIES; attempt += 1) {
    try {
      // Először lapozó kattintás (kevésbé blokkolódik, mint a goto)
      let navigated = false;
      try {
        navigated = await clickPaginationPage(page, pageNum);
      } catch (error) {
        if (!isGotoFailure(error)) throw error;
      }

      if (!navigated) {
        try {
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
          navigated = true;
        } catch (error) {
          if (isNavBlocked(error)) {
            onProgress?.(
              `  goto blokkolva — kattints Chrome-ban a(z) ${pageNum}. oldalra (próba ${attempt}/${PAGE_RETRIES})...`
            );
            await page.waitForTimeout(4000);
            // hátha a felhasználó / előző click már odavitt
          } else if (isContextDestroyed(error)) {
            await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
          } else {
            throw error;
          }
        }
      }

      await page.waitForTimeout(600);
      await dismissCookies(page);
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(400);

      if (isBlocked(await page.title(), await page.content(), page.url())) {
        onProgress?.(`  Cloudflare — várakozás (próba ${attempt}/${PAGE_RETRIES})...`);
        await page.waitForTimeout(5000);
        continue;
      }

      await scrollPage(page);
      await page.waitForTimeout(400);

      let cards = await extractCards(page);
      if (cards.length === 0) {
        await page.waitForTimeout(1500);
        cards = await extractCards(page);
      }

      if (cards.length > 0) return cards;

      lastError = new Error("Üres oldal");
      onProgress?.(`  Üres (próba ${attempt}/${PAGE_RETRIES})...`);
      await page.waitForTimeout(1500 * attempt);
    } catch (error) {
      lastError = error;
      if (isGotoFailure(error)) {
        onProgress?.(`  Navigáció hiba — újra (próba ${attempt}/${PAGE_RETRIES})...`);
        await page.waitForTimeout(1500 * attempt);
        continue;
      }
      onProgress?.(`  Hiba: ${error.message ?? error} (próba ${attempt}/${PAGE_RETRIES})`);
      await page.waitForTimeout(1200 * attempt);
    }
  }

  throw lastError || new Error(`Nem sikerült betölteni: ${targetUrl}`);
}

export async function scrapeListUrl(
  listUrl,
  { onProgress, onPartial, headless = true, profileDir, connect = false, startPage = 1 } = {}
) {
  const startUrl = stripPageFromUrl(listUrl);
  const session = await openSession({
    connect,
    headless,
    profileDir,
    startUrl: connect ? "https://www.hasznaltauto.hu/" : startUrl,
    onProgress,
  });
  const { context, external } = session;
  let page = context.pages().find((p) => !p.isClosed()) || (await context.newPage());

  const close = async () => {
    if (external) return;
    await context.close();
  };

  const byUrl = new Map();
  let maxPage = 1;
  let pagesScraped = 0;

  const emitPartial = (pageNum) => {
    if (!onPartial) return;
    const results = [...byUrl.values()].map(parseListingCard);
    onPartial({
      listUrl: startUrl,
      pagesScraped: pageNum,
      maxPage,
      results,
      partial: true,
    });
  };

  try {
    page = await pickWorkingPage(context, page);

    // Ha a megnyitott Chrome-ban már van lista → ne goto-zzunk (Cloudflare blokkolhatja)
    let firstCards = [];
    try {
      firstCards = await extractCards(page);
    } catch {
      firstCards = [];
    }

    if (firstCards.length === 0) {
      const firstTarget =
        startPage > 1 ? buildListPageUrl(startUrl, startPage) : startUrl;
      onProgress?.(`Megnyitás: ${firstTarget.slice(0, 80)}…`);

      let gotoOk = false;
      try {
        await page.goto(firstTarget, { waitUntil: "domcontentloaded", timeout: 120000 });
        gotoOk = true;
      } catch (error) {
        if (isGotoFailure(error)) {
          onProgress?.(
            "A linket a böngésző blokkolta. Nyisd meg kézzel a listát Chrome-ban (másold be a linket), amíg látod a hirdetéseket."
          );
          firstCards = await ensureListVisible(page, {
            onProgress,
            timeoutMs: connect ? 240000 : 90000,
          });
        } else {
          throw error;
        }
      }

      if (gotoOk) {
        await dismissCookies(page);
        try {
          firstCards = await waitForListOrThrow(page, {
            onProgress,
            timeoutMs: connect ? 180000 : 90000,
          });
        } catch (error) {
          if (connect) {
            firstCards = await ensureListVisible(page, { onProgress, timeoutMs: 180000 });
          } else if (!headless) {
            throw error;
          } else {
            onProgress?.("Headless nem ment — újrapróbál headed módban...");
            await close();
            return scrapeListUrl(listUrl, {
              onProgress,
              onPartial,
              headless: false,
              profileDir,
              connect: false,
              startPage,
            });
          }
        }
      }
    } else {
      onProgress?.(
        `Már van lista a Chrome-ban (${firstCards.length} hirdetés) — folytatás goto nélkül.`
      );
    }

    try {
      const html = await page.content();
      maxPage = extractMaxPageFromHtml(html, page.url());
      const liveMax = await safeEvaluate(page, () => {
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
    } catch {
      maxPage = Math.max(maxPage, 30);
    }

    onProgress?.(`Lapozó: 1…${maxPage} oldal`);

    for (const card of firstCards) {
      byUrl.set(card.url, card);
    }
    pagesScraped = startPage;
    onProgress?.(
      `Oldal ${startPage}/${maxPage}: ${firstCards.length} hirdetés (össz: ${byUrl.size})`
    );
    emitPartial(startPage);

    const fromPage = startPage + 1;
    for (let pageNum = fromPage; pageNum <= Math.min(maxPage, MAX_PAGES); pageNum += 1) {
      const target = buildListPageUrl(startUrl, pageNum);
      onProgress?.(`Oldal ${pageNum}/${maxPage}…`);

      try {
        const cards = await loadListPage(page, target, pageNum, { onProgress });
        for (const card of cards) {
          if (!byUrl.has(card.url)) byUrl.set(card.url, card);
        }
        pagesScraped = pageNum;
        onProgress?.(`  → ${cards.length} db (össz: ${byUrl.size})`);
        emitPartial(pageNum);
        await sleep(600);
      } catch (error) {
        onProgress?.(`  → oldal kihagyva: ${error.message ?? error}`);
        emitPartial(pageNum - 1);
        await sleep(1500);
      }
    }

    const results = [...byUrl.values()].map(parseListingCard);
    return {
      listUrl: startUrl,
      pagesScraped,
      maxPage,
      results,
    };
  } catch (error) {
    if (byUrl.size > 0) {
      onProgress?.(`Hiba, de ${byUrl.size} hirdetés megvan — mentés...`);
      const results = [...byUrl.values()].map(parseListingCard);
      emitPartial(pagesScraped);
      return {
        listUrl: startUrl,
        pagesScraped,
        maxPage,
        results,
        error: String(error?.message ?? error),
      };
    }
    throw error;
  } finally {
    await close();
  }
}
