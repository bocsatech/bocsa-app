#!/usr/bin/env node
import { mkdirSync, writeFileSync, cpSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { CSV_HEADERS, rowsToCsv } from "./parse.mjs";
import { scrapeListUrl } from "./scrape.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** Régi (első) A6-szerű lista — ha nincs --name / --url */
const LEGACY_LIST_URL =
  process.env.FUGVENY_URL ||
  "https://www.hasznaltauto.hu/talalatilista/PCOHKVG3R3NDAEH5C57QCCOQ3WNMOVRLEFK2QT35RWDGICBGWYD5STVUQD4PPDUTYA5CS7OK5COPCXEOR4BXF6JON5PGNOIUBUCKZSJJ3BQSONUMMVJPQKY22QLWQA7V2BFAVUGTYTOYQH4VVMYKB35AAJ7RLG55LSGEKOUGGW4MEKA3RMWKIEDTAY7FGZRNAW3K5GE43O6SFYVRM57642SBQ7RAJTVUPUOSTMX67MTEKDIONSUUAK77EIQY7G4CE35YFY46PN2KRDYY5AC72XIKT2H3YCQYILYWQM4XQU7OAFHA6TAHTUIDN7AEE3JLDKY6ZCJFBOT6AY2Z33DKC33V6BRKGZF6RZ466475P54HOGGSOOXFDNR6SD42K7HY5XEFAUDEW7KUA77LSX53HXMNLMW4I6FGFKF7ECFOK23C4SVSC3FUB3VLET6J7ZTBBS4AMCSV6XCVRKR4AZISVKSQ5OIVQMVRLCE6CRCQ47LJ6UGPDSBB2SYO4HQR2FRUL5SNSP3MUJG2GOV6BM6QVSGNB5WN4EA2GP357BE2DCIAO3OZ7BQC6UB75OBNM4FGEA3CBV7SUYDHP5ZOKAZBXYV4X6ICCXWGPA44JKYYV6DHQLJWO4HHR5ZD3INF326CPSYCSN35DJI7SU5AUZQL6GXYLKZNL2DRQLZBELFHIZZ2KJQOZVM3OXXJ7CMA2BCIF6OJHSP3NPBUM32STTO2CPA52RTQUZUMULDCMRBP7EBPMGRGQ5RA7XNSN6WZVQIBZU47NHSU5MPR7OSOLUN3FFZO4VMAT5HH3GQB2WJ2SKRTVRO7Q2PQTP56CTS3PW3IMUTKXRV7AF3UG62BL4OMRVNAJUZOO7IQTHP4ITZKLOBTMGPW7YL7DRU7YM";

function parseArgs(argv) {
  const args = {
    url: null,
    outDir: null,
    name: null,
    headless: true,
    connect: false,
    startPage: 1,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--headed") args.headless = false;
    else if (a === "--connect") args.connect = true;
    else if (a === "--url" && argv[i + 1]) args.url = argv[++i];
    else if (a === "--out" && argv[i + 1]) args.outDir = argv[++i];
    else if (a === "--name" && argv[i + 1]) args.name = argv[++i];
    else if (a === "--from-page" && argv[i + 1]) args.startPage = Number.parseInt(argv[++i], 10) || 1;
    else if (/^https?:\/\//i.test(a)) args.url = a;
  }
  return args;
}

/** "uj lista" → fájlnév előtag: uj-lista */
function slugifyName(name) {
  return String(name || "lista")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "lista";
}

function fugvenyRoot() {
  return join(homedir(), "Downloads", "fugveny");
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function copyProgram() {
  const dest = join(fugvenyRoot(), "program");
  mkdirSync(dest, { recursive: true });
  if (resolve(ROOT) === resolve(dest)) return dest;

  for (const name of ["package.json", "README.md", "src"]) {
    const from = join(ROOT, name);
    const to = join(dest, name);
    if (!existsSync(from)) continue;
    if (resolve(from) === resolve(to)) continue;
    cpSync(from, to, { recursive: true });
  }
  return dest;
}

function fileNames(base) {
  return {
    latestCsv: `${base}.csv`,
    latestJson: `${base}.json`,
    partialCsv: `${base}-reszleges.csv`,
    partialJson: `${base}-reszleges.json`,
    progress: `${base}-progress.json`,
    stampedPartial: (id) => `${base}-reszleges-${id}.csv`,
    stampedPartialJson: (id) => `${base}-reszleges-${id}.json`,
    stampedFinal: (id) => `${base}-${id}.csv`,
    stampedFinalJson: (id) => `${base}-${id}.json`,
  };
}

function rowKey(row) {
  return [
    row.Gyartmany,
    row.Modell,
    row.Tipus,
    row.Gyartasi_ev,
    row.Kmora_allas,
    row.Vetelar,
  ].join("|");
}

function loadExistingRows(outDir, names) {
  const candidates = [join(outDir, names.latestJson), join(outDir, names.partialJson)];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      const rows = data.hirdetesek || [];
      if (rows.length) return { rows, pagesScraped: data.oldalak || 1, path };
    } catch {
      /* next */
    }
  }
  return { rows: [], pagesScraped: 0, path: null };
}

function saveResults(
  outDir,
  names,
  { listUrl, pagesScraped, maxPage, results, partial = false, error = null, stampCopy = false }
) {
  const id = stamp();
  const latestCsv = join(outDir, partial ? names.partialCsv : names.latestCsv);
  const latestJson = join(outDir, partial ? names.partialJson : names.latestJson);

  const payload = {
    mentve: new Date().toISOString(),
    listaUrl: listUrl,
    oldalak: pagesScraped,
    maxOldal: maxPage,
    darabszam: results.length,
    reszleges: partial,
    hiba: error,
    mezok: CSV_HEADERS,
    hirdetesek: results,
  };

  const csv = rowsToCsv(results);
  writeFileSync(latestCsv, csv, "utf8");
  writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");

  if (partial) {
    writeFileSync(join(outDir, names.latestCsv), csv, "utf8");
    writeFileSync(join(outDir, names.latestJson), JSON.stringify(payload, null, 2), "utf8");
  }

  writeFileSync(
    join(outDir, names.progress),
    JSON.stringify(
      {
        mentve: payload.mentve,
        oldalak: pagesScraped,
        maxOldal: maxPage,
        darabszam: results.length,
        kovetkezoOldal: pagesScraped + 1,
      },
      null,
      2
    ),
    "utf8"
  );

  let stampedCsv = null;
  let stampedJson = null;
  if (stampCopy) {
    stampedCsv = join(outDir, partial ? names.stampedPartial(id) : names.stampedFinal(id));
    stampedJson = join(outDir, partial ? names.stampedPartialJson(id) : names.stampedFinalJson(id));
    writeFileSync(stampedCsv, csv, "utf8");
    writeFileSync(stampedJson, JSON.stringify(payload, null, 2), "utf8");
  }

  return {
    csvPath: stampedCsv || latestCsv,
    jsonPath: stampedJson || latestJson,
    latestCsv: join(outDir, names.latestCsv),
    latestJson: join(outDir, names.latestJson),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  npm start -- --url URL --name "uj lista" --connect
  npm start -- --url URL --name "uj lista" --connect --from-page 500

Kimenet: ~/Downloads/fugveny/uj lista/
  uj-lista.csv
  uj-lista-reszleges.csv
  uj-lista-progress.json
`);
    return;
  }

  // --name "uj lista" → almappa; különben régi gyökér + hirdetesek.*
  const listName = args.name;
  const outDir = args.outDir
    ? resolve(args.outDir)
    : listName
      ? join(fugvenyRoot(), listName)
      : fugvenyRoot();
  const base = listName ? slugifyName(listName) : "hirdetesek";
  const names = fileNames(base);

  let url = args.url;
  const urlFile = join(outDir, "lista-url.txt");
  if (!url && existsSync(urlFile)) {
    url = readFileSync(urlFile, "utf8").split(/\r?\n/)[0]?.trim();
  }
  if (!url && !listName) {
    url = LEGACY_LIST_URL;
  }
  if (!url) {
    console.error('Hiányzik az URL. Példa: --url "https://..." --name "uj lista" --connect');
    process.exitCode = 1;
    return;
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(urlFile, `${url}\n`, "utf8");

  const onProgress = (msg) => console.log(msg);

  let startPage = args.startPage;
  const existing = loadExistingRows(outDir, names);
  if (args.startPage === 1 && existsSync(join(outDir, names.progress))) {
    try {
      const prog = JSON.parse(readFileSync(join(outDir, names.progress), "utf8"));
      if (prog.kovetkezoOldal > 1) {
        startPage = prog.kovetkezoOldal;
        onProgress(
          `Folytatás progress alapján: oldal ${startPage} (eddig ${prog.darabszam || existing.rows.length} db)`
        );
      }
    } catch {
      /* ignore */
    }
  }

  const priorByKey = new Map();
  for (const row of existing.rows) {
    priorByKey.set(rowKey(row), row);
  }

  let lastPartialSave = 0;
  let lastStampSave = 0;
  const PARTIAL_EVERY = 10;
  const STAMP_EVERY = 100;

  const onPartial = (partial) => {
    const page = partial.pagesScraped;
    if (page - lastPartialSave < PARTIAL_EVERY && page < (partial.maxPage || 999999)) {
      return;
    }
    lastPartialSave = page;

    const merged = new Map(priorByKey);
    for (const row of partial.results) {
      merged.set(rowKey(row), row);
    }
    const results = [...merged.values()];
    const stampCopy = page - lastStampSave >= STAMP_EVERY;
    if (stampCopy) lastStampSave = page;

    saveResults(outDir, names, {
      ...partial,
      results,
      partial: true,
      stampCopy,
    });
    onProgress(`  💾 részeredmény: ${results.length} db → ${names.partialCsv}`);
  };

  onProgress(`Kimenet: ${outDir}`);
  onProgress(`Fájlok:  ${names.latestCsv} | ${names.partialCsv} | ${names.progress}`);
  if (listName === "uj lista") {
    onProgress("Várható: ~78566 hirdetés / ~3143 oldal — hosszú futás, megszakítás után folytatható.");
  }

  const result = await scrapeListUrl(url, {
    onProgress,
    onPartial,
    headless: args.headless,
    connect: args.connect,
    profileDir: join(fugvenyRoot(), ".browser-profile"),
    startPage,
  });

  const merged = new Map(priorByKey);
  for (const row of result.results) {
    merged.set(rowKey(row), row);
  }
  const finalRows = [...merged.values()];

  const saved = saveResults(outDir, names, {
    listUrl: result.listUrl,
    pagesScraped: result.pagesScraped,
    maxPage: result.maxPage,
    results: finalRows,
    partial: Boolean(result.error),
    error: result.error || null,
    stampCopy: true,
  });
  const programDir = copyProgram();

  console.log("");
  console.log(result.error ? "Kész (részleges — volt hiba)." : "Kész.");
  console.log(`  Hirdetések: ${finalRows.length} db`);
  console.log(`  Oldalak:    ${result.pagesScraped} / max ${result.maxPage}`);
  console.log(`  CSV:        ${saved.latestCsv}`);
  console.log(`  JSON:       ${saved.latestJson}`);
  console.log(`  Program:    ${programDir}`);
  if (result.error) {
    console.log(`  Hiba:       ${result.error}`);
    const nm = listName ? `--name "${listName}"` : "";
    console.log(
      `  Folytatás:  npm start -- --connect ${nm} --from-page ${result.pagesScraped + 1}`
    );
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
