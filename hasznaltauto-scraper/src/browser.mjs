import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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

function isBlockedPage(title, html) {
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
    if (!isBlockedPage(title, html) && isReady(html, title)) {
      return html;
    }
    await page.waitForTimeout(1500);
  }

  throw new Error(
    "Az oldal nem töltődött be időben. Indítsd --headed módban, és ha kell, végezd el a Cloudflare ellenőrzést."
  );
}

export async function waitForListingPage(page, timeoutMs = 120000) {
  return waitForPage(
    page,
    (html) => html.includes("hirdetesadatok") || html.includes("Alapadatok") || /<h1/i.test(html),
    timeoutMs
  );
}

export async function waitForListPage(page, timeoutMs = 120000) {
  return waitForPage(
    page,
    (html) =>
      /szemelyauto\/[^"'\s]+-\d{5,}/i.test(html) ||
      /találati lista|hirdetés találat/i.test(html) ||
      /class="[^"]*talalat/i.test(html),
    timeoutMs
  );
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
