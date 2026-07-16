import { connectToOpenBrowser, DEFAULT_CDP_URL, launchBrowser } from "../../hasznaltauto-scraper/src/browser.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";

const DEFAULT_OUTPUT = join(process.cwd(), "data", "jarmu-katalogus-A.json");

const FORM_URL = "https://www.hasznaltauto.hu/hirdetesfeladas/szemelyauto";
const KATALOGUS_URL = "https://katalogus.hasznaltauto.hu/";

const PROFILE_FIELD_MAP = {
  ajtok: ["ajtok", "ajtók", "doors"],
  szemelyek: ["szemelyek", "szállítható", "passengers"],
  hengerurtartalom: ["hengerurtartalom", "hengerűrtartalom", "cm3"],
  teljesitmeny_kw: ["teljesitmeny", "teljesítmény", "kw"],
  uzemanyag: ["uzemanyag", "üzemanyag", "fuel"],
  kornyezetvedelmi: ["kornyezetvedelmi", "környezetvédelmi"],
  sebessegvalto: ["sebessegvalto", "sebességváltó", "valto"],
  hajtas: ["hajtas", "hajtás", "meghajtás"],
  henger_elrendezes: ["henger_elrendezes", "henger-elrendezés"],
  sajat_tomeg: ["sajat_tomeg", "saját tömeg"],
  ossztomeg: ["ossztomeg", "össztömeg"],
  csomagtarto: ["csomagtarto", "csomagtartó"],
  gumi_nyari_szelesseg: ["nyari_gumi_szelesseg", "gumi_szelesseg"],
  gumi_nyari_magassag: ["nyari_gumi_magassag", "gumi_magassag"],
  gumi_nyari_atmero: ["nyari_gumi_atmero", "gumi_atmero"],
};

function parseArgs(argv) {
  const options = {
    letter: "A",
    output: DEFAULT_OUTPUT,
    connect: true,
    headed: false,
    source: "form",
    delayMs: 400,
    maxBrands: null,
    maxModels: null,
    maxTypes: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--letter") {
      options.letter = (argv[i + 1] ?? "A").toUpperCase();
      i += 1;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--connect") {
      options.connect = true;
      continue;
    }
    if (arg === "--headed") {
      options.connect = false;
      options.headed = true;
      continue;
    }
    if (arg === "--source") {
      options.source = argv[i + 1] ?? "form";
      i += 1;
      continue;
    }
    if (arg === "--delay") {
      options.delayMs = Number(argv[i + 1] ?? 400);
      i += 1;
      continue;
    }
    if (arg === "--max-brands") {
      options.maxBrands = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--max-models") {
      options.maxModels = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--max-types") {
      options.maxTypes = Number(argv[i + 1]);
      i += 1;
      continue;
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function startsWithLetter(text, letter) {
  const first = String(text ?? "").trim().charAt(0).toUpperCase();
  return first === letter.toUpperCase();
}

function normalizeOption(option) {
  if (!option) return null;
  if (typeof option === "string") {
    const text = option.trim();
    return text ? { value: text, text } : null;
  }
  const text = String(option.text ?? option.label ?? option.nev ?? option.name ?? "").trim();
  const value = String(option.value ?? option.id ?? option.kod ?? text).trim();
  if (!text && !value) return null;
  return { value, text: text || value };
}

function uniqueOptions(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const normalized = normalizeOption(item);
    if (!normalized) continue;
    const key = `${normalized.value}::${normalized.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function createEmptyCatalog(letter) {
  return {
    meta: {
      letter,
      source: "hasznaltauto.hu",
      scrapedAt: null,
      brandCount: 0,
      note: "Teszt katalógus — élesítés előtt törölendő",
    },
    apiEndpoints: [],
    gyartmanyok: {},
  };
}

function saveCatalog(path, catalog) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

function loadCatalog(path, letter) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return createEmptyCatalog(letter);
  }
}

async function openPageSession(options, onProgress) {
  if (options.connect) {
    try {
      const session = await connectToOpenBrowser(DEFAULT_CDP_URL, {
        autoStart: false,
        onProgress,
      });
      const context = session.browser.contexts()[0] ?? (await session.browser.newContext());
      const page = context.pages()[0] ?? (await context.newPage());
      return { page, close: async () => session.browser.close() };
    } catch {
      onProgress?.("Chrome CDP nem elérhető — automatikus indítás...");
      startChromeWithDebugging(FORM_URL);
      const ready = await waitForCdpReady(DEFAULT_CDP_URL, { onProgress });
      if (!ready) throw new Error("Chrome nem indult el. Futtasd: npm run chrome");
      const session = await connectToOpenBrowser(DEFAULT_CDP_URL, { autoStart: false, onProgress });
      const context = session.browser.contexts()[0] ?? (await session.browser.newContext());
      const page = context.pages()[0] ?? (await context.newPage());
      return { page, close: async () => session.browser.close() };
    }
  }

  const session = await launchBrowser({ headless: !options.headed });
  const page = session.context.pages()[0] ?? (await session.context.newPage());
  return {
    page,
    close: async () => session.context.close(),
  };
}

async function waitForHumanIfBlocked(page, onProgress) {
  const title = await page.title();
  const body = await page.locator("body").innerText().catch(() => "");
  if (!/cloudflare|attention required|just a moment|ellenőrzés/i.test(`${title}\n${body}`)) {
    return;
  }
  onProgress?.("Cloudflare védelem — oldd meg a böngészőben, majd várunk...");
  for (let i = 0; i < 120; i += 1) {
    await sleep(1000);
    const nextTitle = await page.title();
    const nextBody = await page.locator("body").innerText().catch(() => "");
    if (!/cloudflare|attention required|just a moment|ellenőrzés/i.test(`${nextTitle}\n${nextBody}`)) {
      onProgress?.("Cloudflare átlépve.");
      return;
    }
  }
  throw new Error("Cloudflare továbbra is blokkol. Futtasd: npm run chrome");
}

function attachNetworkCollector(page, catalog) {
  page.on("response", async (response) => {
    const url = response.url();
    const type = response.headers()["content-type"] ?? "";
    if (!/json|text\/plain|javascript/i.test(type)) return;
    if (!/ajax|api|modell|marka|gyart|tipus|kivitel|katalog|vehicle|auto|szemely|catalog/i.test(url)) return;
    try {
      const text = await response.text();
      if (!text || text.length < 2) return;
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text.slice(0, 500);
      }
      catalog.apiEndpoints.push({
        url,
        status: response.status(),
        sample: Array.isArray(parsed) ? parsed.slice(0, 3) : parsed,
      });
    } catch {
      /* ignore */
    }
  });
}

async function findSelectByLabel(page, labels) {
  for (const label of labels) {
    const select = page.locator(`label:has-text("${label}") + select, label:has-text("${label}") ~ select`).first();
    if (await select.count()) return select;
    const byName = page.locator(`select[name*="${label}" i], select[id*="${label}" i]`).first();
    if (await byName.count()) return byName;
  }
  return null;
}

async function readSelectOptions(select) {
  return uniqueOptions(
    await select.evaluate((el) =>
      [...el.options].map((option) => ({
        value: option.value,
        text: option.textContent?.trim() ?? "",
      }))
    )
  ).filter((option) => option.value && option.text && !/válasszon|mindegy|^--$/i.test(option.text));
}

async function readFieldValues(page) {
  const values = {};
  for (const [key, aliases] of Object.entries(PROFILE_FIELD_MAP)) {
    for (const alias of aliases) {
      const field = page.locator(`[name="${alias}"], #${alias}`).first();
      if (!(await field.count())) continue;
      const tag = await field.evaluate((el) => el.tagName.toLowerCase());
      if (tag === "select") {
        values[key] = await field.evaluate((el) => el.options[el.selectedIndex]?.textContent?.trim() ?? el.value);
      } else {
        values[key] = await field.inputValue().catch(async () => field.evaluate((el) => el.value ?? el.textContent?.trim() ?? ""));
      }
      break;
    }
  }

  const leText = await page.locator("#le-display, .hint-inline").first().textContent().catch(() => "");
  const leMatch = String(leText).match(/(\d+)\s*LE/i);
  if (leMatch) values.teljesitmeny_le = Number(leMatch[1]);

  return Object.fromEntries(Object.entries(values).filter(([, value]) => String(value ?? "").trim()));
}

async function scrapeFormCatalog(page, options, catalog, onProgress) {
  await page.goto(FORM_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitForHumanIfBlocked(page, onProgress);
  await sleep(1500);

  const brandSelect =
    (await findSelectByLabel(page, ["Gyártmány", "Gyartmany"])) ??
    page.locator('select[name*="gyart" i], select[id*="gyart" i]').first();
  const modelSelect =
    (await findSelectByLabel(page, ["Modell"])) ??
    page.locator('select[name*="modell" i], select[id*="modell" i]').first();
  const typeSelect =
    (await findSelectByLabel(page, ["Típus", "Tipus"])) ??
    page.locator('select[name*="tipus" i], select[id*="tipus" i]').first();
  const bodySelect =
    (await findSelectByLabel(page, ["Kivitel"])) ??
    page.locator('select[name*="kivitel" i], select[id*="kivitel" i]').first();

  if (!(await brandSelect.count())) {
    throw new Error("Gyártmány legördülő nem található. Lehet, hogy be kell jelentkezni a hirdetésfeladáshoz.");
  }

  const allBrands = (await readSelectOptions(brandSelect)).filter((brand) => startsWithLetter(brand.text, options.letter));
  const brands = options.maxBrands ? allBrands.slice(0, options.maxBrands) : allBrands;
  onProgress?.(`${options.letter} betűs márkák: ${brands.length}`);

  for (const brand of brands) {
    const brandKey = slugify(brand.text);
    if (!catalog.gyartmanyok[brandKey]) {
      catalog.gyartmanyok[brandKey] = { nev: brand.text, value: brand.value, modellek: {} };
    }

    onProgress?.(`Márka: ${brand.text}`);
    await brandSelect.selectOption(brand.value);
    await sleep(options.delayMs);

    if (!(await modelSelect.count())) {
      onProgress?.(`  Modell select nem található — szabad szöveg? (${brand.text})`);
      continue;
    }

    const models = await readSelectOptions(modelSelect);
    const limitedModels = options.maxModels ? models.slice(0, options.maxModels) : models;

    for (const model of limitedModels) {
      const modelKey = slugify(model.text);
      if (!catalog.gyartmanyok[brandKey].modellek[modelKey]) {
        catalog.gyartmanyok[brandKey].modellek[modelKey] = { nev: model.text, value: model.value, tipusok: {} };
      }

      onProgress?.(`  Modell: ${model.text}`);
      await modelSelect.selectOption(model.value);
      await sleep(options.delayMs);

      if (!(await typeSelect.count())) continue;
      const types = await readSelectOptions(typeSelect);
      const limitedTypes = options.maxTypes ? types.slice(0, options.maxTypes) : types;

      for (const type of limitedTypes) {
        const typeKey = slugify(type.text);
        if (!catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey]) {
          catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey] = {
            nev: type.text,
            value: type.value,
            kivitel: [],
            profilok: {},
          };
        }

        await typeSelect.selectOption(type.value);
        await sleep(options.delayMs);

        const bodies = (await bodySelect.count()) ? await readSelectOptions(bodySelect) : [];
        const profileBase = await readFieldValues(page);

        if (bodies.length === 0) {
          catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey].profilok.default = profileBase;
          continue;
        }

        catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey].kivitel = bodies.map((item) => item.text);

        for (const body of bodies) {
          await bodySelect.selectOption(body.value);
          await sleep(options.delayMs);
          const bodyKey = slugify(body.text);
          catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey].profilok[bodyKey] = {
            kivitel: body.text,
            ...(await readFieldValues(page)),
          };
        }
      }
    }

    catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
    catalog.meta.scrapedAt = new Date().toISOString();
    saveCatalog(options.output, catalog);
  }
}

async function scrapeKatalogusCatalog(page, options, catalog, onProgress) {
  await page.goto(KATALOGUS_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitForHumanIfBlocked(page, onProgress);
  await sleep(1500);

  const brandSelect = page.locator("select").first();
  if (!(await brandSelect.count())) {
    throw new Error("Katalógus gyártmány lista nem található.");
  }

  const brands = (await readSelectOptions(brandSelect)).filter((brand) => startsWithLetter(brand.text, options.letter));
  const limitedBrands = options.maxBrands ? brands.slice(0, options.maxBrands) : brands;
  onProgress?.(`Katalógus — ${options.letter} betűs márkák: ${limitedBrands.length}`);

  for (const brand of limitedBrands) {
    const brandKey = slugify(brand.text);
    catalog.gyartmanyok[brandKey] = { nev: brand.text, value: brand.value, modellek: {}, forras: "katalogus" };
    onProgress?.(`Márka: ${brand.text}`);

    await brandSelect.selectOption(brand.value);
    await sleep(options.delayMs);

    const modelSelect = page.locator("select").nth(1);
    const models = (await modelSelect.count()) ? await readSelectOptions(modelSelect) : [];
    const limitedModels = options.maxModels ? models.slice(0, options.maxModels) : models;

    for (const model of limitedModels) {
      const modelKey = slugify(model.text);
      catalog.gyartmanyok[brandKey].modellek[modelKey] = { nev: model.text, value: model.value, tipusok: {}, forras: "katalogus" };
      onProgress?.(`  Modell: ${model.text}`);

      await modelSelect.selectOption(model.value);
      await sleep(options.delayMs);

      const typeSelect = page.locator("select").nth(2);
      const types = (await typeSelect.count()) ? await readSelectOptions(typeSelect) : [];
      const limitedTypes = options.maxTypes ? types.slice(0, options.maxTypes) : types;

      for (const type of limitedTypes) {
        const typeKey = slugify(type.text);
        catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey] = {
          nev: type.text,
          value: type.value,
          kivitel: [],
          profilok: {},
          forras: "katalogus",
        };

        await typeSelect.selectOption(type.value);
        await sleep(options.delayMs);

        const bodySelect = page.locator("select").nth(3);
        const bodies = (await bodySelect.count()) ? await readSelectOptions(bodySelect) : [];
        catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey].kivitel = bodies.map((item) => item.text);
      }
    }

    catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
    catalog.meta.scrapedAt = new Date().toISOString();
    saveCatalog(options.output, catalog);
  }
}

export async function runMentesmarka(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const catalog = loadCatalog(options.output, options.letter);
  catalog.meta.letter = options.letter;
  catalog.meta.source = options.source === "katalogus" ? "katalogus.hasznaltauto.hu" : "hasznaltauto.hu/hirdetesfeladas";

  const onProgress = (message) => console.log(`[mentesmarka] ${message}`);
  const { page, close } = await openPageSession(options, onProgress);
  attachNetworkCollector(page, catalog);

  try {
    if (options.source === "katalogus") {
      await scrapeKatalogusCatalog(page, options, catalog, onProgress);
    } else {
      await scrapeFormCatalog(page, options, catalog, onProgress);
    }
  } finally {
    await close().catch(() => {});
  }

  catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
  catalog.meta.scrapedAt = new Date().toISOString();
  saveCatalog(options.output, catalog);
  onProgress(`Kész: ${options.output}`);
  return catalog;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  runMentesmarka().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
