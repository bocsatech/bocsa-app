import { cleanText } from "./parse-listing.mjs";

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

export async function scrollListingPage(page) {
  for (let i = 0; i < 8; i += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 700);
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

export async function revealPhoneNumber(page) {
  const revealSelectors = [
    page.getByRole("button", { name: /elsődleges telefonszám felfedése/i }),
    page.getByRole("link", { name: /elsődleges telefonszám felfedése/i }),
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
      break;
    } catch {
      /* try next */
    }
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const phone = await extractVisiblePhone(page);
    if (phone) return phone;
    await page.waitForTimeout(300);
  }
  return null;
}

async function extractVisiblePhone(page) {
  try {
    const telLink = page.locator('a[href^="tel:"]').first();
    if ((await telLink.count()) > 0) {
      const href = await telLink.getAttribute("href");
      if (href) return href.replace(/^tel:/i, "").replace(/\s+/g, " ").trim();
    }
  } catch {
    /* continue */
  }

  for (const selector of [".contact-box", ".telefonszam", "[class*='telefon']", "[class*='phone']"]) {
    try {
      const node = page.locator(selector).first();
      if ((await node.count()) === 0 || !(await node.isVisible())) continue;
      const text = await node.innerText();
      const match = text.match(/(?:\+36|06)[\s\d/-]{7,16}\d/);
      if (match) return match[0].replace(/\s+/g, " ").trim();
    } catch {
      /* next */
    }
  }

  try {
    const bodyText = await page.locator("body").innerText();
    const match = bodyText.match(/(?:\+36|06)[\s\d/-]{7,16}\d/);
    return match ? match[0].replace(/\s+/g, " ").trim() : null;
  } catch {
    return null;
  }
}

export async function extractListingFromPage(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const map = {};

    const addPair = (rawKey, rawValue) => {
      const key = clean(rawKey).replace(/:$/, "");
      const value = clean(rawValue);
      if (!key || !value || key.length > 80) return;
      if (!map[key]) map[key] = value;
    };

    for (const table of document.querySelectorAll("table.hirdetesadatok, table[class*='hirdetesadatok'], .hirdetesadatok table")) {
      for (const row of table.querySelectorAll("tr")) {
        const cells = [...row.querySelectorAll("td, th")];
        if (cells.length >= 2) addPair(cells[0].innerText, cells[1].innerText);
      }
    }

    for (const row of document.querySelectorAll("tr")) {
      const keyCell = row.querySelector("td.bal.pontos, td.pontos, th.pontos, .bal.pontos");
      if (!keyCell) continue;
      const valueCell = keyCell.nextElementSibling;
      if (valueCell) addPair(keyCell.innerText, valueCell.innerText);
    }

    for (const dt of document.querySelectorAll("dt")) {
      const dd = dt.nextElementSibling;
      if (dd) addPair(dt.innerText, dd.innerText);
    }

    for (const label of document.querySelectorAll("label, .label, [class*='label']")) {
      const text = clean(label.innerText);
      if (!text.endsWith(":") || text.length > 50) continue;
      const parent = label.parentElement;
      const valueNode =
        parent?.querySelector("strong, span:not(.label), input, select, .value, [class*='value']") ||
        label.nextElementSibling;
      if (valueNode && valueNode !== label) addPair(text, valueNode.innerText || valueNode.value);
    }

    for (const section of document.querySelectorAll("[class*='adat'], [class*='spec'], [class*='property'], .hirdetes-adatok, .adatok")) {
      const text = section.innerText || "";
      for (const line of text.split("\n")) {
        const match = line.match(/^(.{2,45}?):\s*(.+)$/);
        if (match) addPair(match[1], match[2]);
      }
    }

    let leiras = "";
    const leirasSelectors = [
      ".leiras",
      "#leiras",
      "[class*='leiras']",
      "[class*='description']",
      "[data-testid*='description']",
      "section[class*='leiras']",
    ];
    for (const selector of leirasSelectors) {
      const node = document.querySelector(selector);
      const text = clean(node?.innerText ?? "");
      if (text.length >= 20) {
        leiras = text;
        break;
      }
    }

    if (!leiras) {
      for (const heading of document.querySelectorAll("h2, h3, h4, strong, b, span")) {
        if (!/leírás/i.test(heading.textContent ?? "")) continue;
        const block =
          heading.closest("section, div, article") ||
          heading.parentElement?.querySelector("p, div") ||
          heading.nextElementSibling;
        const text = clean(block?.innerText ?? "");
        if (text.length >= 20) {
          leiras = text;
          break;
        }
      }
    }

    const felszereltseg = [];
    const badgeSelectors = [
      ".extra-badge",
      ".tooltip-badge",
      "[class*='felszer']",
      "[class*='badge']",
      ".hirdetes-extra",
      ".talalati-sor .badge",
      ".feature-badge",
    ];
    for (const selector of badgeSelectors) {
      for (const node of document.querySelectorAll(selector)) {
        const text = clean(node.innerText);
        if (text && text.length <= 60 && !felszereltseg.includes(text)) felszereltseg.push(text);
      }
    }

    const title = clean(document.querySelector("h1")?.innerText ?? "");
    let location = "";
    for (const [key, value] of Object.entries(map)) {
      if (/megtalál|települ|megye|elérhet/i.test(key)) location = value;
    }
    let kmText = "";
    for (const [key, value] of Object.entries(map)) {
      if (/futás|km óra|kilométeróra/i.test(key)) kmText = value;
    }
    if (!kmText) {
      for (const node of document.querySelectorAll(
        ".talalatisor-infokontener span, [class*='km'], [class*='futas'], .hirdetes-km, .pricefield-secondary"
      )) {
        const t = clean(node.innerText ?? "");
        if (/\d[\d\s.]*\s*km/i.test(t) || /\b0\s*km/i.test(t)) {
          kmText = t;
          break;
        }
      }
    }

    return { map, leiras, felszereltseg, title, location, kmText };
  });
}

export function mergePageExtract(parsed, extracted) {
  if (!extracted) return parsed;
  const mergedMap = {
    ...(extracted.map ?? {}),
    ...(parsed.nyersAdatok ?? {}),
  };
  if (extracted.kmText && !mergedMap["Futásteljesítmény"]) {
    mergedMap["Futásteljesítmény"] = extracted.kmText;
  }
  if (extracted.kmText && !mergedMap["Km óra állás"]) {
    mergedMap["Km óra állás"] = extracted.kmText;
  }

  return {
    ...parsed,
    cim: parsed.cim || extracted.title || "",
    leiras: parsed.leiras || extracted.leiras || "",
    telefonszam: parsed.telefonszam || extracted.phone || parsed.telefonszam,
    felszereltseg: extracted.felszereltseg?.length ? extracted.felszereltseg : parsed.felszereltseg,
    nyersAdatok: mergedMap,
  };
}

export async function prepareListingPage(page) {
  await dismissCookieBanner(page);
  await scrollListingPage(page);
}
