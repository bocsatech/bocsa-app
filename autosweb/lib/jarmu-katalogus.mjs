/**
 * Járműkatalógus: ~/Letöltések/mentesmarka/jarmu-katalogus.csv
 * Gyartmany → Modell → Tipus (mint a hasznaltauto.hu)
 */
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

let cache = null;

export function letoltesekRoot() {
  const home = homedir();
  const candidates = [join(home, "Letöltések"), join(home, "Downloads")];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  const created = join(home, "Letöltések");
  mkdirSync(created, { recursive: true });
  return created;
}

export function mentesmarkaDir() {
  return join(letoltesekRoot(), "mentesmarka");
}

export function catalogPaths() {
  const dir = mentesmarkaDir();
  return {
    dir,
    csv: join(dir, "jarmu-katalogus.csv"),
    appendCsv: join(dir, "jarmu-katalogus.append.csv"),
    json: join(dir, "jarmu-katalogus.json"),
  };
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** CSV → { brands: string[], tree: { [brand]: { [model]: string[] } }, rowCount } */
export function parseCatalogCsv(text) {
  const lines = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { brands: [], tree: {}, rowCount: 0 };
  }

  const header = parseCsvLine(lines[0]).map(normalizeHeader);
  let iGy = header.findIndex((h) => h === "gyartmany" || h === "marka" || h === "gyarto");
  let iMo = header.findIndex((h) => h === "modell");
  let iTi = header.findIndex((h) => h === "tipus");
  if (iGy < 0) iGy = 0;
  if (iMo < 0) iMo = 1;
  if (iTi < 0) iTi = 2;

  const tree = {};
  let rowCount = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const brand = String(cells[iGy] ?? "").trim();
    const model = String(cells[iMo] ?? "").trim();
    const type = String(cells[iTi] ?? "").trim();
    if (!brand) continue;
    rowCount += 1;
    if (!tree[brand]) tree[brand] = {};
    if (!model) continue;
    if (!tree[brand][model]) tree[brand][model] = [];
    if (type && !tree[brand][model].includes(type)) {
      tree[brand][model].push(type);
    }
  }

  for (const brand of Object.keys(tree)) {
    for (const model of Object.keys(tree[brand])) {
      tree[brand][model].sort((a, b) => a.localeCompare(b, "hu"));
    }
  }

  const brands = Object.keys(tree).sort((a, b) => a.localeCompare(b, "hu"));
  return { brands, tree, rowCount };
}

function parseCatalogJson(text) {
  const data = JSON.parse(text);
  const tree = {};
  const gyartmanyok = data.gyartmanyok ?? {};
  for (const brandEntry of Object.values(gyartmanyok)) {
    const brand = String(brandEntry.nev ?? "").trim();
    if (!brand) continue;
    tree[brand] = {};
    for (const modelEntry of Object.values(brandEntry.modellek ?? {})) {
      const model = String(modelEntry.nev ?? "").trim();
      if (!model) continue;
      const types = Object.values(modelEntry.tipusok ?? {})
        .map((t) => String(t.nev ?? "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "hu"));
      tree[brand][model] = types;
    }
  }
  const brands = Object.keys(tree).sort((a, b) => a.localeCompare(b, "hu"));
  let rowCount = 0;
  for (const brand of brands) {
    for (const model of Object.keys(tree[brand])) {
      rowCount += Math.max(1, tree[brand][model].length);
    }
  }
  return { brands, tree, rowCount };
}

function fileMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

export function loadJarmuKatalogus({ force = false } = {}) {
  const paths = catalogPaths();
  const sourcePath = [paths.csv, paths.appendCsv, paths.json].find((p) => existsSync(p)) ?? null;
  const mtime = sourcePath ? fileMtime(sourcePath) : 0;

  if (!force && cache && cache.sourcePath === sourcePath && cache.mtime === mtime) {
    return cache.payload;
  }

  if (!sourcePath) {
    const payload = {
      ok: false,
      error:
        "Nincs járműkatalógus. Futtasd a mentesmarka programot — kimenet: ~/Letöltések/mentesmarka/jarmu-katalogus.csv",
      path: paths.csv,
      dir: paths.dir,
      brands: [],
      tree: {},
      rowCount: 0,
      source: null,
    };
    cache = { sourcePath: null, mtime: 0, payload };
    return payload;
  }

  const raw = readFileSync(sourcePath, "utf8");
  const parsed = sourcePath.endsWith(".json") ? parseCatalogJson(raw) : parseCatalogCsv(raw);

  const payload = {
    ok: true,
    path: sourcePath,
    dir: paths.dir,
    brands: parsed.brands,
    tree: parsed.tree,
    rowCount: parsed.rowCount,
    source: sourcePath.endsWith(".json") ? "json" : "csv",
    updatedAt: new Date(mtime).toISOString(),
  };
  cache = { sourcePath, mtime, payload };
  return payload;
}

export function getModels(gyartmany) {
  const catalog = loadJarmuKatalogus();
  const brand = String(gyartmany ?? "").trim();
  if (!brand) return [];
  const models = catalog.tree[brand] ?? catalog.tree[brand.toUpperCase()] ?? {};
  return Object.keys(models).sort((a, b) => a.localeCompare(b, "hu"));
}

export function getTypes(gyartmany, modell) {
  const catalog = loadJarmuKatalogus();
  const brand = String(gyartmany ?? "").trim();
  const model = String(modell ?? "").trim();
  if (!brand || !model) return [];
  const models = catalog.tree[brand] ?? catalog.tree[brand.toUpperCase()] ?? {};
  return [...(models[model] ?? [])];
}
