import { connectToOpenBrowser, DEFAULT_CDP_URL, launchBrowser } from "./browser.mjs";
import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { waitForUserReady } from "./ready.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));

/**
 * Magyar Mac: ~/Letöltések
 * Angol Mac: ~/Downloads
 * Először a létező mappát használjuk; ha egyik sincs, Letöltések-et hozunk létre.
 */
function letoltesekRoot() {
  const home = homedir();
  const candidates = [join(home, "Letöltések"), join(home, "Downloads")];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  const created = join(home, "Letöltések");
  mkdirSync(created, { recursive: true });
  return created;
}

/** Minden kimenet: ~/Letöltések/mentesmarka/ */
function mentesmarkaRoot() {
  const root = join(letoltesekRoot(), "mentesmarka");
  mkdirSync(root, { recursive: true });
  return root;
}

const DEFAULT_OUTPUT = join(mentesmarkaRoot(), "jarmu-katalogus.csv");

/** null = minden márka. Szűréshez: --brands "Audi,BMW" */
const DEFAULT_BRANDS = null;

/** Normalizált aliasok — egyezés a hasznaltauto.hu legördülő szövegeivel (pl. MERCEDES-BENZ, ALFA ROMEO). */
const BRAND_MATCH_ALIASES = {
  audi: ["audi"],
  bmw: ["bmw"],
  mercedes: ["mercedes", "mercedes-benz"],
  ford: ["ford"],
  kia: ["kia"],
  toyota: ["toyota"],
  mazda: ["mazda"],
  opel: ["opel"],
  alfa: ["alfa", "alfa romeo"],
  suzuki: ["suzuki"],
  skoda: ["skoda"],
  volkswagen: ["volkswagen", "vw"],
};

const FORM_URL = "https://admin.hasznaltauto.hu/hirdetesfeladas/szemelyauto";
const KATALOGUS_URL = "https://katalogus.hasznaltauto.hu/";

/** Gyártási év: lépésenként, nem minden év (gyorsabb). Találatnál ±1 finomítás. */
const YEAR_MIN = 1990;
const YEAR_MAX = 2026;
const YEAR_STEP = 3;

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

function parseBrandsArg(raw) {
  const text = String(raw ?? "").trim();
  if (!text || /^all|mind|minden$/i.test(text)) return null;
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    brands: DEFAULT_BRANDS,
    output: DEFAULT_OUTPUT,
    format: "csv",
    connect: true,
    headed: false,
    source: "form",
    delayMs: 900,
    deep: false,
    fresh: true,
    maxBrands: null,
    maxModels: null,
    maxTypes: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--brands") {
      options.brands = parseBrandsArg(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--letter") {
      console.warn("[mentesmarka] --letter elavult — használd a --brands opciót.");
      i += 1;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--format") {
      const format = String(argv[i + 1] ?? "csv").toLowerCase();
      if (!["csv", "json", "both"].includes(format)) {
        throw new Error(`Ismeretlen --format: ${format} (csv|json|both)`);
      }
      options.format = format;
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
      options.delayMs = Number(argv[i + 1] ?? 900);
      i += 1;
      continue;
    }
    if (arg === "--fresh") {
      options.fresh = true;
      continue;
    }
    if (arg === "--resume") {
      options.fresh = false;
      continue;
    }
    if (arg === "--deep") {
      options.deep = true;
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

  if (options.format === "csv" && options.output.endsWith(".json")) {
    options.output = options.output.replace(/\.json$/i, ".csv");
  }
  if (options.format === "json" && options.output.endsWith(".csv")) {
    options.output = options.output.replace(/\.csv$/i, ".json");
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

function normalizeBrandName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function brandAllowKey(name) {
  return normalizeBrandName(name).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function brandMatchesAllowlist(brandText, allowedBrand) {
  const norm = normalizeBrandName(brandText);
  const key = brandAllowKey(allowedBrand);
  const aliases = BRAND_MATCH_ALIASES[key] ?? [normalizeBrandName(allowedBrand)];
  return aliases.some((alias) => {
    const pattern = normalizeBrandName(alias);
    return norm === pattern || norm.startsWith(`${pattern} `) || norm.startsWith(`${pattern}-`);
  });
}

function filterAllowedBrands(allBrands, allowedBrands) {
  if (!allowedBrands?.length) return allBrands;

  const matched = allBrands.filter((brand) =>
    allowedBrands.some((allowed) => brandMatchesAllowlist(brand.text, allowed))
  );

  matched.sort((a, b) => {
    const indexFor = (text) => {
      const idx = allowedBrands.findIndex((allowed) => brandMatchesAllowlist(text, allowed));
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return indexFor(a.text) - indexFor(b.text);
  });

  return matched;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function catalogToCsvRows(catalog) {
  const rows = [["Gyartmany", "Modell", "EvTol", "EvIg", "Tipus"]];
  const brands = Object.values(catalog.gyartmanyok ?? {}).sort((a, b) =>
    String(a.nev).localeCompare(String(b.nev), "hu")
  );

  for (const brand of brands) {
    const models = Object.values(brand.modellek ?? {}).sort((a, b) =>
      String(a.nev).localeCompare(String(b.nev), "hu")
    );
    if (!models.length) {
      rows.push([brand.nev, "", "", "", ""]);
      continue;
    }
    for (const model of models) {
      const types = Object.values(model.tipusok ?? {}).sort((a, b) =>
        String(a.nev).localeCompare(String(b.nev), "hu")
      );
      if (!types.length) {
        rows.push([brand.nev, model.nev, "", "", ""]);
        continue;
      }
      for (const type of types) {
        rows.push([
          brand.nev,
          model.nev,
          type.evTol ?? "",
          type.evIg ?? "",
          type.nev,
        ]);
      }
    }
  }

  return rows;
}

function catalogToCsv(catalog) {
  return `${catalogToCsvRows(catalog)
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function resolveOutputPath(output) {
  const text = String(output ?? "").trim();
  if (!text) return DEFAULT_OUTPUT;
  if (text.startsWith("/") || /^[A-Za-z]:[\\/]/.test(text)) return resolve(text);
  // Relatív path is mindig a Letöltések/mentesmarka alá
  return resolve(mentesmarkaRoot(), text.replace(/^\.\//, ""));
}

function outputPaths(options) {
  const absolute = resolveOutputPath(options.output);
  const base = absolute.replace(/\.(csv|json)$/i, "");
  const dir = dirname(`${base}.csv`);
  return {
    root: mentesmarkaRoot(),
    csv: `${base}.csv`,
    json: `${base}.json`,
    appendCsv: `${base}.append.csv`,
    status: join(dir, "LEGUTOBBI-MENTES.txt"),
  };
}

function atomicWriteFile(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, content, "utf8");
  const fd = openSync(tmp, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, filePath);
}

/** NEM dob hibát — a scrape továbbmegy. CSAK ~/Letöltések/mentesmarka/ */
function saveOutputs(options, catalog, onProgress, { quiet = false } = {}) {
  const paths = outputPaths(options);
  try {
    mkdirSync(paths.root, { recursive: true });

    const toSave = {
      meta: catalog.meta ?? {},
      gyartmanyok: catalog.gyartmanyok ?? {},
      apiEndpoints: [],
    };

    atomicWriteFile(paths.json, `${JSON.stringify(toSave, null, 2)}\n`);
    if (options.format === "csv" || options.format === "both") {
      atomicWriteFile(paths.csv, catalogToCsv(catalog));
    }

    const rowCount = Math.max(0, catalogToCsvRows(catalog).length - 1);
    const status = [
      `mentesmarka v${PKG.version}`,
      `ido: ${new Date().toISOString()}`,
      `mappa: ${paths.root}`,
      `csv: ${paths.csv}`,
      `json: ${paths.json}`,
      `append: ${paths.appendCsv}`,
      `markak: ${Object.keys(catalog.gyartmanyok ?? {}).length}`,
      `sorok: ${rowCount}`,
    ].join("\n");
    atomicWriteFile(paths.status, `${status}\n`);

    if (!quiet) {
      onProgress?.(`Mentve (${rowCount} sor): ${paths.csv}`);
    }
    return paths;
  } catch (error) {
    const message = `MENTÉSI HIBA (folytatom): ${error.message}`;
    console.error(`[mentesmarka] ${message}`);
    onProgress?.(message);
    return paths;
  }
}

/** Egy modell típusai azonnal a .append.csv végére — kill esetén is megmarad. */
function appendModelTypes(options, brandName, modelName, types, onProgress) {
  const paths = outputPaths(options);
  try {
    mkdirSync(paths.root, { recursive: true });
    if (!existsSync(paths.appendCsv)) {
      writeFileSync(paths.appendCsv, "Gyartmany,Modell,EvTol,EvIg,Tipus\n", "utf8");
    }

    const rows =
      types.length > 0
        ? types.map((type) => [
            brandName,
            modelName,
            type.evTol ?? "",
            type.evIg ?? "",
            type.nev ?? type.text ?? "",
          ])
        : [[brandName, modelName, "", "", ""]];

    const chunk = `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
    appendFileSync(paths.appendCsv, chunk, "utf8");
    const fd = openSync(paths.appendCsv, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }

    onProgress?.(`  +${rows.length} típus → ${paths.appendCsv}`);
  } catch (error) {
    onProgress?.(`Append hiba (folytatom): ${error.message}`);
  }
}

function yearProbeList() {
  const years = [];
  for (let y = YEAR_MIN; y <= YEAR_MAX; y += YEAR_STEP) years.push(y);
  if (!years.includes(YEAR_MAX)) years.push(YEAR_MAX);
  return years;
}

function mergeTypeYear(typeEntry, year) {
  const y = Number(year);
  if (!Number.isFinite(y) || y <= 0) return;
  if (typeEntry.evTol == null || y < typeEntry.evTol) typeEntry.evTol = y;
  if (typeEntry.evIg == null || y > typeEntry.evIg) typeEntry.evIg = y;
}

function upsertTypeWithYear(modelEntry, type, year) {
  const typeKey = slugify(type.text);
  const y = Number(year);
  const hasYear = Number.isFinite(y) && y > 0;
  if (!modelEntry.tipusok[typeKey]) {
    modelEntry.tipusok[typeKey] = {
      nev: type.text,
      value: type.value,
      evTol: hasYear ? y : undefined,
      evIg: hasYear ? y : undefined,
      kivitel: [],
      profilok: {},
    };
    return true;
  }
  if (hasYear) mergeTypeYear(modelEntry.tipusok[typeKey], y);
  return false;
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

function createEmptyCatalog(brands) {
  return {
    meta: {
      brands: brands?.length ? [...brands] : ["*"],
      source: "admin.hasznaltauto.hu",
      scrapedAt: null,
      brandCount: 0,
      levels: "gyartmany-modell-tipus",
      note: "Hasznaltauto gyártmány/modell/típus katalógus — Autos oldalhoz",
    },
    apiEndpoints: [],
    gyartmanyok: {},
  };
}

function loadCatalog(options) {
  const paths = outputPaths(options);
  const brands = options.brands;
  try {
    const catalog = JSON.parse(readFileSync(paths.json, "utf8"));
    if (!catalog.meta) catalog.meta = {};
    catalog.meta.brands = brands?.length ? [...brands] : ["*"];
    return catalog;
  } catch {
    return createEmptyCatalog(brands);
  }
}

function listOpenPages(session) {
  const pages = [];
  if (session.browser) {
    for (const context of session.browser.contexts()) {
      for (const page of context.pages()) {
        if (!page.isClosed()) pages.push(page);
      }
    }
  } else if (session.context) {
    for (const page of session.context.pages()) {
      if (!page.isClosed()) pages.push(page);
    }
  }
  return pages;
}

async function findPageByUrl(session, pattern) {
  for (const page of listOpenPages(session)) {
    if (pattern.test(page.url())) return page;
  }
  return null;
}

async function findFormPageWithBrandSelect(session) {
  const pages = listOpenPages(session);
  const ranked = [
    ...pages.filter((page) => /hirdetesfeladas/i.test(page.url())),
    ...pages.filter((page) => /hasznaltauto\.hu/i.test(page.url()) && !/hirdetesfeladas/i.test(page.url())),
    ...pages.filter((page) => !/hasznaltauto\.hu/i.test(page.url())),
  ];

  for (const page of ranked) {
    if (await pageHasBrandSelect(page)) return page;
  }
  return null;
}

async function pageHasBrandSelect(page) {
  try {
    return await page.evaluate(() => {
      const selectors = [
        "select#gyartmany",
        'select[name="gyartmany"]',
        'select[name*="gyart" i]',
        'select[id*="gyart" i]',
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el?.options?.length > 1) return true;
      }
      for (const label of document.querySelectorAll("label")) {
        if (!/gyártmány|gyartmany/i.test(label.textContent ?? "")) continue;
        const select =
          label.control instanceof HTMLSelectElement
            ? label.control
            : label.parentElement?.querySelector("select") ??
              label.nextElementSibling?.querySelector?.("select") ??
              label.nextElementSibling;
        if (select instanceof HTMLSelectElement && select.options.length > 1) return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

async function describePage(page) {
  try {
    return await page.evaluate(() => ({
      title: document.title,
      selects: [...document.querySelectorAll("select")].slice(0, 8).map((el) => ({
        id: el.id,
        name: el.name,
        options: el.options.length,
      })),
    }));
  } catch {
    return { title: "(nem olvasható)", selects: [] };
  }
}

async function resolveFormPage(session, onProgress) {
  let page = await findFormPageWithBrandSelect(session);

  if (page) {
    await page.bringToFront();
    onProgress(`Meglévő űrlap lap használata: ${page.url()}`);
    return page;
  }

  const openTabs = listOpenPages(session);
  if (openTabs.length) {
    onProgress(`Nyitott Chrome lapok (${openTabs.length}) — port 9223:`);
    for (const tab of openTabs) {
      const info = await describePage(tab);
      onProgress(`  - ${tab.url()} (${info.title}, ${info.selects.length} select)`);
    }
  } else {
    onProgress("Nincs nyitott lap a mentesmarka Chrome-ban (port 9223).");
  }

  await waitForUserReady(
    [
      `Chrome-ban legyen nyitva: ${FORM_URL}`,
      "Látnod kell a Gyártmány legördülő mezőt (bejelentkezve).",
      "Ha másik lapon van, kattints rá, hogy aktív legyen.",
      "A program NEM navigál el — a meglévő lapot használja.",
    ].join("\n")
  );

  page = await findFormPageWithBrandSelect(session);

  if (!page) {
    throw new Error(
      `Gyártmány legördülő nem található. Nyisd meg: ${FORM_URL}`
    );
  }

  await page.bringToFront();
  onProgress(`Űrlap kész: ${page.url()}`);
  return page;
}

async function openPageSession(options, onProgress) {
  if (options.connect) {
    const session = await connectToOpenBrowser(DEFAULT_CDP_URL, {
      autoStart: false,
      onProgress,
    });
    onProgress?.(`Csatlakozva: ${DEFAULT_CDP_URL}`);
    return {
      session,
      page: null,
      close: async () => session.browser?.close().catch(() => {}),
    };
  }

  const session = await launchBrowser({ headless: !options.headed });
  const page = session.context.pages()[0] ?? (await session.context.newPage());
  return {
    session,
    page,
    close: async () => session.context.close(),
  };
}

function attachNetworkCollector(page, catalog) {
  // Csak URL-eket gyűjtünk — a response body mentése felduzzasztotta / elrontotta a JSON mentést.
  page.on("response", (response) => {
    const url = response.url();
    if (!/ajax|api|modell|marka|gyart|tipus|kivitel|katalog|vehicle|auto|szemely|catalog/i.test(url)) return;
    catalog.apiEndpoints.push({ url, status: response.status() });
    if (catalog.apiEndpoints.length > 50) {
      catalog.apiEndpoints.splice(0, catalog.apiEndpoints.length - 50);
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

function isEgyebType(text) {
  return /^egy[eé]b\b/i.test(String(text ?? "").trim());
}

function typesAreOnlyEgyeb(types) {
  const list = types ?? [];
  return list.length > 0 && list.every((item) => isEgyebType(item.text ?? item.nev ?? item));
}

/** Valódi típusok: EGYÉB nélkül, ha van más is. */
function preferRealTypes(types) {
  const list = types ?? [];
  const real = list.filter((item) => !isEgyebType(item.text ?? item.nev ?? item));
  return real.length ? real : list;
}

async function waitForSelectOptions(select, { minCount = 1, timeoutMs = 15000, settleMs = 250 } = {}) {
  const started = Date.now();
  let lastCount = -1;
  let stableSince = Date.now();

  while (Date.now() - started < timeoutMs) {
    const count = await select
      .evaluate((el) =>
        [...el.options].filter((option) => {
          const text = option.textContent?.trim() ?? "";
          return option.value && text && !/válasszon|mindegy|^--$/i.test(text);
        }).length
      )
      .catch(() => 0);

    if (count !== lastCount) {
      lastCount = count;
      stableSince = Date.now();
    }

    if (count >= minCount && Date.now() - stableSince >= settleMs) {
      return count;
    }

    await sleep(150);
  }

  return lastCount;
}

/**
 * Tipus AJAX után vár: ne az első "EGYÉB" opciót mentse, hanem a teljes listát.
 * Minimum várakozás + stabil lista (hosszabb settle).
 */
async function waitForTypeOptions(select, { timeoutMs = 35000, minWaitMs = 1500, settleMs = 1500 } = {}) {
  const started = Date.now();
  let lastSig = "";
  let stableSince = Date.now();
  let best = [];

  // Mindig adj időt az AJAX-nak indulni.
  await sleep(minWaitMs);

  while (Date.now() - started < timeoutMs) {
    const options = await readSelectOptions(select);
    const real = preferRealTypes(options);
    const sig = options.map((item) => `${item.value}:${item.text}`).join("|");

    if (sig !== lastSig) {
      lastSig = sig;
      stableSince = Date.now();
      if (real.length) best = real;
      else if (options.length) best = options;
    }

    const hasReal = real.length > 0 && !typesAreOnlyEgyeb(real);
    // Stabil + van valódi típus (nem csak EGYÉB)
    if (hasReal && Date.now() - stableSince >= settleMs) {
      return real;
    }

    await sleep(250);
  }

  return preferRealTypes(best);
}

function clearCatalogOutputs(options, onProgress) {
  const paths = outputPaths(options);
  for (const filePath of [paths.csv, paths.json, paths.appendCsv, paths.status]) {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        onProgress?.(`Törölve (fresh): ${filePath}`);
      }
    } catch (error) {
      onProgress?.(`Nem törölhető: ${filePath} (${error.message})`);
    }
  }
}

async function safeSelectOption(select, option, onProgress) {
  const attempts = [
    { value: option.value },
    { label: option.text },
  ];

  for (const attempt of attempts) {
    try {
      await select.selectOption(attempt, { timeout: 8000 });
      return true;
    } catch {
      /* try next */
    }
  }

  // Utolsó esély: közvetlen value állítás + change esemény (AJAX űrlapokhoz).
  const ok = await select
    .evaluate((el, value) => {
      const match = [...el.options].find((item) => item.value === value);
      if (!match) return false;
      el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return el.value === value;
    }, option.value)
    .catch(() => false);

  if (!ok) {
    onProgress?.(`    Figyelmeztetés: nem választható: ${option.text}`);
  }
  return ok;
}

function modelAlreadyDone(modelEntry) {
  const types = Object.values(modelEntry?.tipusok ?? {});
  // Évjáratos scrape lefutott (üres típuslista is lehet érvényes)
  if (modelEntry?.evjaratKesz) {
    if (types.length && types.every((item) => isEgyebType(item.nev))) return false;
    return true;
  }
  if (!types.length) return false;
  // Csak EGYÉB = hibás / korai olvasás → újra kell scrape-elni
  if (types.every((item) => isEgyebType(item.nev))) return false;
  // Régi mentés év nélkül → évjáratos újrafuttatás kell (--resume esetén is)
  if (types.every((item) => item.evTol == null && item.evIg == null)) return false;
  return true;
}

async function resolveYearMonthSelects(page) {
  let yearSelect =
    (await findSelectByLabel(page, ["Gyártási év", "Gyartasi ev", "Évjárat"])) ??
    page.locator('#gyartasi_ev, select[name="gyartasi_ev"], select[id*="gyartasi_ev" i]').first();
  let monthSelect =
    (await findSelectByLabel(page, ["Gyártási hónap", "Gyartasi honap", "Hónap"])) ??
    page.locator('#gyartasi_honap, select[name="gyartasi_honap"], select[id*="gyartasi_honap" i]').first();

  if (!(await yearSelect.count())) {
    // Utolsó esély: select, aminek az optionjei évszámok
    const candidate = page.locator("select").filter({
      has: page.locator('option[value="2015"], option[value="2020"]'),
    }).first();
    if (await candidate.count()) yearSelect = candidate;
  }

  return {
    yearSelect: (await yearSelect.count()) ? yearSelect : null,
    monthSelect: (await monthSelect.count()) ? monthSelect : null,
  };
}

async function selectOptionFlexible(select, value, onProgress, label) {
  const valueStr = String(value);
  try {
    await select.selectOption(valueStr, { timeout: 4000 });
    return true;
  } catch {
    /* next */
  }
  try {
    await select.selectOption({ label: valueStr }, { timeout: 4000 });
    return true;
  } catch {
    /* next */
  }
  const ok = await select
    .evaluate((el, v) => {
      const match = [...el.options].find(
        (item) => item.value === v || item.textContent?.trim() === v || item.textContent?.trim() === `${v}.`
      );
      if (!match) return false;
      el.value = match.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof window.jQuery === "function") {
        window.jQuery(el).trigger("change");
      }
      return true;
    }, valueStr)
    .catch(() => false);
  if (!ok) onProgress?.(`    Figyelmeztetés: ${label} nem állítható: ${value}`);
  return ok;
}

async function ensureModelSelected(modelSelect, model) {
  const current = await modelSelect
    .evaluate((el) => ({ value: el.value, text: el.options[el.selectedIndex]?.textContent?.trim() ?? "" }))
    .catch(() => ({ value: "", text: "" }));
  if (current.value === model.value || current.text === model.text) return true;
  return safeSelectOption(modelSelect, model, null);
}

async function setGyartasiEvHonap(page, year, onProgress) {
  const { yearSelect, monthSelect } = await resolveYearMonthSelects(page);
  if (!yearSelect) {
    onProgress?.("    Figyelem: gyártási év select nem található");
    return false;
  }

  const ok = await selectOptionFlexible(yearSelect, year, onProgress, "gyártási év");
  if (!ok) return false;

  if (monthSelect) {
    let monthOk = false;
    for (const m of ["6", "06", "1", "01"]) {
      monthOk = await selectOptionFlexible(monthSelect, m, null, "hónap");
      if (monthOk) break;
    }
    if (!monthOk) {
      await monthSelect
        .evaluate((el) => {
          const match = [...el.options].find(
            (item) => item.value && !/válasszon|^--$/i.test(item.textContent ?? "")
          );
          if (!match) return false;
          el.value = match.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          if (typeof window.jQuery === "function") window.jQuery(el).trigger("change");
          return true;
        })
        .catch(() => false);
    }
  }

  return true;
}

/** Gyors Tipus olvasás: üres / csak EGYÉB évnél ne várjon 25 mp-et. */
async function waitForRealTypeOptions(select, { timeoutMs = 12000, minWaitMs = 900, settleMs = 900 } = {}) {
  const started = Date.now();
  let lastSig = "";
  let stableSince = Date.now();
  let bestReal = [];
  let sawOnlyEgyeb = false;

  await sleep(minWaitMs);

  while (Date.now() - started < timeoutMs) {
    const options = await readSelectOptions(select);
    const real = options.filter((item) => !isEgyebType(item.text));
    const sig = options.map((item) => `${item.value}:${item.text}`).join("|");

    if (sig !== lastSig) {
      lastSig = sig;
      stableSince = Date.now();
      if (real.length) bestReal = real;
      if (options.length && !real.length) sawOnlyEgyeb = true;
    }

    if (real.length && Date.now() - stableSince >= settleMs) {
      return real;
    }

    // Csak EGYÉB / üres és stabil → ez az év üres, lépj tovább
    if (
      Date.now() - started >= Math.min(4500, timeoutMs) &&
      Date.now() - stableSince >= settleMs &&
      !real.length
    ) {
      return [];
    }

    await sleep(200);
  }

  return bestReal.length ? bestReal : sawOnlyEgyeb ? [] : preferRealTypes(await readSelectOptions(select)).filter((t) => !isEgyebType(t.text));
}

/**
 * Modell + évjárat lépéses Tipus gyűjtés.
 * Sorrend: modell (megtart) → év → Tipus AJAX.
 * 1990→2026, lépés 3; találatnál ±1. Üres/EGYÉB kihagyva.
 */
async function scrapeModelTypesByYear(page, typeSelect, modelSelect, model, options, onProgress) {
  const foundByYear = new Map();
  const probeYears = yearProbeList();
  let yearSelectOk = false;

  async function collectYear(year, { longWait = false } = {}) {
    if (foundByYear.has(year)) return foundByYear.get(year);

    // Először modell, aztán év — a Tipus mindkettőre kell
    await ensureModelSelected(modelSelect, model);
    const yearOk = await setGyartasiEvHonap(page, year, onProgress);
    if (yearOk) yearSelectOk = true;
    if (!yearOk) return [];

    // Évváltás után modell megmaradt-e?
    await ensureModelSelected(modelSelect, model);
    // Modell change újra triggerelheti a Tipus AJAX-ot év + modell mellett
    await modelSelect
      .evaluate((el) => {
        el.dispatchEvent(new Event("change", { bubbles: true }));
        if (typeof window.jQuery === "function") window.jQuery(el).trigger("change");
      })
      .catch(() => {});

    await sleep(Math.max(700, Math.floor(options.delayMs * 0.6)));

    const types = await waitForRealTypeOptions(typeSelect, {
      timeoutMs: longWait ? 28000 : 10000,
      minWaitMs: longWait ? 1500 : 800,
      settleMs: longWait ? 1200 : 800,
    });

    if (types.length) {
      foundByYear.set(year, types);
      onProgress?.(`    Év ${year}: ${types.length} típus`);
    }
    return types;
  }

  for (const year of probeYears) {
    onProgress?.(`    Év: ${year}…`);
    const types = await collectYear(year);
    if (!types.length) continue;

    for (const neighbor of [year - 1, year + 1]) {
      if (neighbor < YEAR_MIN || neighbor > YEAR_MAX) continue;
      if (foundByYear.has(neighbor)) continue;
      onProgress?.(`    Év: ${neighbor} (±1)…`);
      await collectYear(neighbor);
    }
  }

  // Ha semmi: tipikus évek hosszabb várakozással (pl. Giulietta ~2010–2020)
  if (!foundByYear.size && yearSelectOk) {
    onProgress?.("    Nincs típus a lépéses éveknél — újrapróba kulcsévekkel…");
    for (const year of [2010, 2012, 2014, 2015, 2016, 2018, 2020]) {
      if (foundByYear.has(year)) continue;
      await collectYear(year, { longWait: true });
    }
  }

  // Ha a gyártási év select egyáltalán nem működött: egyszeri Tipus olvasás modell után
  if (!foundByYear.size && !yearSelectOk) {
    onProgress?.("    Gyártási év nélkül próbálom a Tipus listát…");
    await ensureModelSelected(modelSelect, model);
    await sleep(1500);
    const types = await waitForRealTypeOptions(typeSelect, {
      timeoutMs: 30000,
      minWaitMs: 2000,
      settleMs: 1500,
    });
    if (types.length) foundByYear.set(0, types);
  }

  return foundByYear;
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

async function scrapeFormCatalog(session, page, options, catalog, onProgress) {
  if (options.connect && !(await pageHasBrandSelect(page))) {
    page = await resolveFormPage(session, onProgress);
  } else if (!options.connect) {
    await page.goto(FORM_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await sleep(1500);
  }

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

  const allBrands = filterAllowedBrands(await readSelectOptions(brandSelect), options.brands);
  const brands = options.maxBrands ? allBrands.slice(0, options.maxBrands) : allBrands;
  onProgress?.(
    options.brands?.length
      ? `Szűrt márkák (${brands.length}): ${brands.map((b) => b.text).join(", ") || "—"}`
      : `Összes márka (${brands.length})`
  );
  if (!brands.length) {
    throw new Error(
      options.brands?.length
        ? `Egyetlen márka sem található a listából: ${options.brands.join(", ")}. Ellenőrizd a legördülő szövegeit.`
        : "Egyetlen gyártmány sem található a legördülőben."
    );
  }

  catalog.meta.pendingBrands = brands.map((b) => b.text);
  catalog.meta.scrapedAt = new Date().toISOString();
  saveOutputs(options, catalog, onProgress);

  for (const brand of brands) {
    const brandKey = slugify(brand.text);
    if (!catalog.gyartmanyok[brandKey]) {
      catalog.gyartmanyok[brandKey] = { nev: brand.text, value: brand.value, modellek: {} };
    }

    onProgress?.(`Márka: ${brand.text}`);
    const brandOk = await safeSelectOption(brandSelect, brand, onProgress);
    if (!brandOk) {
      onProgress?.(`  Márka kihagyva (nem választható): ${brand.text}`);
      saveOutputs(options, catalog, onProgress);
      continue;
    }
    await sleep(options.delayMs);
    await waitForSelectOptions(modelSelect, { minCount: 1, timeoutMs: 20000 });
    catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
    catalog.meta.scrapedAt = new Date().toISOString();
    saveOutputs(options, catalog, onProgress);

    if (!(await modelSelect.count())) {
      onProgress?.(`  Modell select nem található — szabad szöveg? (${brand.text})`);
      continue;
    }

    const models = await readSelectOptions(modelSelect);
    const limitedModels = options.maxModels ? models.slice(0, options.maxModels) : models;

    // Modellnevek azonnal bekerülnek — típusok később töltődnek.
    for (const model of limitedModels) {
      const modelKey = slugify(model.text);
      if (!catalog.gyartmanyok[brandKey].modellek[modelKey]) {
        catalog.gyartmanyok[brandKey].modellek[modelKey] = { nev: model.text, value: model.value, tipusok: {} };
      }
    }
    catalog.meta.scrapedAt = new Date().toISOString();
    saveOutputs(options, catalog, onProgress);

    for (const model of limitedModels) {
      const modelKey = slugify(model.text);

      if (
        !options.fresh &&
        !options.deep &&
        modelAlreadyDone(catalog.gyartmanyok[brandKey].modellek[modelKey])
      ) {
        onProgress?.(`  Modell (már megvan): ${model.text}`);
        continue;
      }

      onProgress?.(`  Modell: ${model.text}`);
      const modelOk = await safeSelectOption(modelSelect, model, onProgress);
      if (!modelOk) {
        saveOutputs(options, catalog, onProgress);
        continue;
      }
      await sleep(Math.max(options.delayMs, 1000));

      const modelEntry = catalog.gyartmanyok[brandKey].modellek[modelKey];

      if (!(await typeSelect.count())) {
        onProgress?.(`    Tipus select nincs — modell kihagyva (nem jelölöm késznek)`);
        saveOutputs(options, catalog, onProgress, { quiet: true });
        continue;
      }

      onProgress?.(
        `    Évjárat scrape: ${YEAR_MIN}–${YEAR_MAX}, lépés ${YEAR_STEP} (+±1 találatnál)`
      );
      // Új scrape: töröljük a régi (év nélküli / EGYÉB) típusokat
      modelEntry.tipusok = {};
      delete modelEntry.evjaratKesz;

      const foundByYear = await scrapeModelTypesByYear(
        page,
        typeSelect,
        modelSelect,
        model,
        options,
        onProgress
      );

      const yearsSorted = [...foundByYear.keys()].filter((y) => y > 0).sort((a, b) => a - b);
      for (const year of [...foundByYear.keys()].sort((a, b) => a - b)) {
        let types = foundByYear.get(year) ?? [];
        if (options.maxTypes) types = types.slice(0, options.maxTypes);
        for (const type of types) {
          upsertTypeWithYear(modelEntry, type, year);
        }
      }

      const appendRows = Object.values(modelEntry.tipusok);

      // Üres Tipus = hiba — NE jelöld késznek, NE írj üres sort (resume újrapróbálja)
      if (!appendRows.length) {
        onProgress?.(`    HIBA: nincs Tipus ehhez a modellhez — később újra`);
        saveOutputs(options, catalog, onProgress, { quiet: true });
        continue;
      }

      modelEntry.evjaratKesz = true;

      // --deep: egy jó évjáraton végigmegy a kivitel/profilokon
      if (options.deep && yearsSorted.length) {
        const deepYear = yearsSorted[Math.floor(yearsSorted.length / 2)];
        await setGyartasiEvHonap(page, deepYear, onProgress);
        await ensureModelSelected(modelSelect, model);
        await sleep(1000);
        const deepTypes = Object.values(modelEntry.tipusok);
        for (const typeEntry of deepTypes) {
          const typeOpt = { value: typeEntry.value, text: typeEntry.nev };
          const typeOk = await safeSelectOption(typeSelect, typeOpt, onProgress);
          if (!typeOk) continue;
          await sleep(options.delayMs);

          const bodies = (await bodySelect.count()) ? await readSelectOptions(bodySelect) : [];
          const profileBase = await readFieldValues(page);

          if (bodies.length === 0) {
            typeEntry.profilok.default = profileBase;
            continue;
          }

          typeEntry.kivitel = bodies.map((item) => item.text);
          for (const body of bodies) {
            const bodyOk = await safeSelectOption(bodySelect, body, onProgress);
            if (!bodyOk) continue;
            await sleep(options.delayMs);
            const bodyKey = slugify(body.text);
            typeEntry.profilok[bodyKey] = {
              kivitel: body.text,
              ...(await readFieldValues(page)),
            };
          }
        }
      }

      onProgress?.(
        `    Kész: ${appendRows.length} típus` +
          (yearsSorted.length ? `, év ${yearsSorted[0]}–${yearsSorted[yearsSorted.length - 1]}` : "")
      );
      appendModelTypes(options, brand.text, model.text, appendRows, onProgress);
      catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
      catalog.meta.scrapedAt = new Date().toISOString();
      saveOutputs(options, catalog, onProgress, { quiet: true });
    }

    catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
    catalog.meta.scrapedAt = new Date().toISOString();
    saveOutputs(options, catalog, onProgress);
  }
}

async function scrapeKatalogusCatalog(page, options, catalog, onProgress) {
  if (!/katalogus\.hasznaltauto\.hu/i.test(page.url())) {
    await waitForUserReady("Chrome-ban nyisd meg: https://katalogus.hasznaltauto.hu/");
    await page.goto(KATALOGUS_URL, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
    await sleep(1500);
  }

  const brandSelect = page.locator("select").first();
  if (!(await brandSelect.count())) {
    throw new Error("Katalógus gyártmány lista nem található.");
  }

  const brands = filterAllowedBrands(await readSelectOptions(brandSelect), options.brands);
  const limitedBrands = options.maxBrands ? brands.slice(0, options.maxBrands) : brands;
  onProgress?.(
    options.brands?.length
      ? `Katalógus — szűrt márkák (${limitedBrands.length}): ${limitedBrands.map((b) => b.text).join(", ") || "—"}`
      : `Katalógus — összes márka (${limitedBrands.length})`
  );
  if (!limitedBrands.length) {
    throw new Error(
      options.brands?.length
        ? `Egyetlen márka sem található a listából: ${options.brands.join(", ")}. Ellenőrizd a legördülő szövegeit.`
        : "Egyetlen gyártmány sem található a katalógusban."
    );
  }

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

        if (!options.deep) continue;

        await typeSelect.selectOption(type.value);
        await sleep(options.delayMs);

        const bodySelect = page.locator("select").nth(3);
        const bodies = (await bodySelect.count()) ? await readSelectOptions(bodySelect) : [];
        catalog.gyartmanyok[brandKey].modellek[modelKey].tipusok[typeKey].kivitel = bodies.map((item) => item.text);
      }
    }

    catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
    catalog.meta.scrapedAt = new Date().toISOString();
    saveOutputs(options, catalog, onProgress);
  }
}

export async function runMentesmarka(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  options.output = resolveOutputPath(options.output);

  const onProgress = (message) => console.log(`[mentesmarka] ${message}`);
  console.log(`mentesmarka v${PKG.version} — saját Chrome port: 9223`);

  if (options.fresh) {
    onProgress("FRESH mód — előző mentés figyelmen kívül, üres katalógustól indul");
    clearCatalogOutputs(options, onProgress);
  }

  const catalog = options.fresh ? createEmptyCatalog(options.brands) : loadCatalog(options);
  catalog.meta.brands = options.brands?.length ? [...options.brands] : ["*"];
  catalog.meta.source =
    options.source === "katalogus" ? "katalogus.hasznaltauto.hu" : "admin.hasznaltauto.hu/hirdetesfeladas";
  catalog.meta.levels = options.deep ? "gyartmany-modell-tipus-kivitel" : "gyartmany-modell-tipus";
  catalog.meta.fresh = Boolean(options.fresh);

  console.log(
    `[mentesmarka] Formátum: ${options.format} | Márkák: ${options.brands?.length ? options.brands.join(", ") : "MINDEN"} | Szintek: ${catalog.meta.levels} | ${options.fresh ? "FRESH" : "RESUME"}`
  );

  // Induláskor azonnal létrehozza a fájlokat — látszik a pontos útvonal.
  const bootPaths = saveOutputs(options, catalog, onProgress);
  onProgress(`Kimenet mappa: ${bootPaths.root}`);
  onProgress(`CSV: ${bootPaths.csv}`);

  const saveNow = () => {
    try {
      catalog.meta.brandCount = Object.keys(catalog.gyartmanyok).length;
      catalog.meta.scrapedAt = new Date().toISOString();
      saveOutputs(options, catalog, onProgress);
    } catch {
      /* ignore */
    }
  };

  const onSignal = (signal) => {
    onProgress(`${signal} — részlista mentése...`);
    saveNow();
    process.exit(130);
  };
  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));

  if (options.connect && options.source === "form") {
    await waitForUserReady(
      [
        "1) Másik terminálban futtasd: npm run chrome  (mentesmarka saját Chrome, port 9223)",
        `2) ABBAN a Chrome ablakban: Cloudflare + bejelentkezés + űrlap: ${FORM_URL}`,
        "3) Látszik a Gyártmány legördülő? Ha igen, nyomj ENTER-t itt",
        "",
        `Részlista ide mentődik: ${bootPaths.csv}`,
        "NEM a sima Chrome és NEM a scraper Chrome (9222) — csak a mentesmarka Chrome (9223)!",
      ].join("\n")
    );
  }

  const { session, page: initialPage, close } = await openPageSession(options, onProgress);
  let page = initialPage;

  if (options.connect && options.source === "form") {
    page = await resolveFormPage(session, onProgress);
  } else if (!page) {
    const context = session.browser?.contexts()[0] ?? session.context;
    page = context.pages()[0] ?? (await context.newPage());
  }

  attachNetworkCollector(page, catalog);

  try {
    if (options.source === "katalogus") {
      await scrapeKatalogusCatalog(page, options, catalog, onProgress);
    } else {
      await scrapeFormCatalog(session, page, options, catalog, onProgress);
    }
  } catch (error) {
    onProgress(`Hiba — részlista mentése: ${error.message}`);
    saveNow();
    throw error;
  } finally {
    saveNow();
    await close().catch(() => {});
  }

  const paths = outputPaths(options);
  const rowCount = Math.max(0, catalogToCsvRows(catalog).length - 1);
  onProgress(`Kész — ${catalog.meta.brandCount} márka, ${rowCount} sor`);
  onProgress(`CSV: ${paths.csv}`);
  onProgress(`JSON: ${paths.json}`);
  onProgress(`Státusz: ${paths.status}`);
  return catalog;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  runMentesmarka().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
