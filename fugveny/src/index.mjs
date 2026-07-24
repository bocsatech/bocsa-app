#!/usr/bin/env node
import { mkdirSync, writeFileSync, cpSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { rowsToCsv } from "./parse.mjs";
import { scrapeListUrl } from "./scrape.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DEFAULT_LIST_URL =
  process.env.FUGVENY_URL ||
  "https://www.hasznaltauto.hu/talalatilista/PCOHKVG3R3NDAEH5C57QCCOQ3WNMOVRLEFK2QT35RWDGICBGWYD5STVUQD4PPDUTYA5CS7OK5COPCXEOR4BXF6JON5PGNOIUBUCKZSJJ3BQSONUMMVJPQKY22QLWQA7V2BFAVUGTYTOYQH4VVMYKB35AAJ7RLG55LSGEKOUGGW4MEKA3RMWKIEDTAY7FGZRNAW3K5GE43O6SFYVRM57642SBQ7RAJTVUPUOSTMX67MTEKDIONSUUAK77EIQY7G4CE35YFY46PN2KRDYY5AC72XIKT2H3YCQYILYWQM4XQU7OAFHA6TAHTUIDN7AEE3JLDKY6ZCJFBOT6AY2Z33DKC33V6BRKGZF6RZ466475P54HOGGSOOXFDNR6SD42K7HY5XEFAUDEW7KUA77LSX53HXMNLMW4I6FGFKF7ECFOK23C4SVSC3FUB3VLET6J7ZTBBS4AMCSV6XCVRKR4AZISVKSQ5OIVQMVRLCE6CRCQ47LJ6UGPDSBB2SYO4HQR2FRUL5SNSP3MUJG2GOV6BM6QVSGNB5WN4EA2GP357BE2DCIAO3OZ7BQC6UB75OBNM4FGEA3CBV7SUYDHP5ZOKAZBXYV4X6ICCXWGPA44JKYYV6DHQLJWO4HHR5ZD3INF326CPSYCSN35DJI7SU5AUZQL6GXYLKZNL2DRQLZBELFHIZZ2KJQOZVM3OXXJ7CMA2BCIF6OJHSP3NPBUM32STTO2CPA52RTQUZUMULDCMRBP7EBPMGRGQ5RA7XNSN6WZVQIBZU47NHSU5MPR7OSOLUN3FFZO4VMAT5HH3GQB2WJ2SKRTVRO7Q2PQTP56CTS3PW3IMUTKXRV7AF3UG62BL4OMRVNAJUZOO7IQTHP4ITZKLOBTMGPW7YL7DRU7YM";

function parseArgs(argv) {
  const args = {
    url: DEFAULT_LIST_URL,
    outDir: null,
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
    else if (a === "--from-page" && argv[i + 1]) args.startPage = Number.parseInt(argv[++i], 10) || 1;
    else if (/^https?:\/\//i.test(a)) args.url = a;
  }
  return args;
}

function resolveOutDir(requested) {
  if (requested) return resolve(requested);
  const downloads = join(homedir(), "Downloads", "fugveny");
  mkdirSync(downloads, { recursive: true });
  return downloads;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function copyProgram(outDir) {
  const dest = join(outDir, "program");
  mkdirSync(dest, { recursive: true });
  for (const name of ["package.json", "README.md", "src"]) {
    const from = join(ROOT, name);
    if (!existsSync(from)) continue;
    cpSync(from, join(dest, name), { recursive: true });
  }
  return dest;
}

function saveResults(outDir, { listUrl, pagesScraped, maxPage, results, partial = false, error = null }) {
  const id = stamp();
  const csvPath = join(outDir, partial ? `hirdetesek-reszleges-${id}.csv` : `hirdetesek-${id}.csv`);
  const jsonPath = join(outDir, partial ? `hirdetesek-reszleges-${id}.json` : `hirdetesek-${id}.json`);
  const latestCsv = join(outDir, "hirdetesek.csv");
  const latestJson = join(outDir, "hirdetesek.json");

  const payload = {
    mentve: new Date().toISOString(),
    listaUrl: listUrl,
    oldalak: pagesScraped,
    maxOldal: maxPage,
    darabszam: results.length,
    reszleges: partial,
    hiba: error,
    mezok: [
      "Gyartmany",
      "Modell",
      "Tipus",
      "Uzemanyag",
      "Gyartasi_ev",
      "Hengerurtartalom",
      "Teljesitmeny_kW",
      "Teljesitmeny_LE",
      "Kmora_allas",
      "Vetelar",
    ],
    hirdetesek: results,
  };

  const csv = rowsToCsv(results);
  writeFileSync(csvPath, csv, "utf8");
  writeFileSync(latestCsv, csv, "utf8");
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");

  return { csvPath, jsonPath, latestCsv, latestJson };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: npm start -- [--url URL] [--out DIR] [--headed] [--connect] [--from-page N]

Default URL: a mentett hasznaltauto talalatilista.
Kimenet: ~/Downloads/fugveny/ (CSV + JSON + program)

Mac / Cloudflare esetén:
  npm start -- --connect
`);
    return;
  }

  const outDir = resolveOutDir(args.outDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "lista-url.txt"), `${args.url}\n`, "utf8");
  const onProgress = (msg) => console.log(msg);

  let lastPartialSave = 0;
  const onPartial = (partial) => {
    // Mentés kb. minden 5. oldal után, hogy hiba esetén se vesszen el
    if (partial.pagesScraped - lastPartialSave < 5 && partial.pagesScraped < (partial.maxPage || 99)) {
      return;
    }
    lastPartialSave = partial.pagesScraped;
    saveResults(outDir, { ...partial, partial: true });
    onProgress?.(`  💾 részeredmény mentve (${partial.results.length} db)`);
  };

  onProgress(`Kimenet: ${outDir}`);
  const result = await scrapeListUrl(args.url, {
    onProgress,
    onPartial,
    headless: args.headless,
    connect: args.connect,
    profileDir: join(outDir, ".browser-profile"),
    startPage: args.startPage,
  });

  const saved = saveResults(outDir, {
    ...result,
    partial: Boolean(result.error),
    error: result.error || null,
  });
  const programDir = copyProgram(outDir);

  console.log("");
  console.log(result.error ? "Kész (részleges — volt hiba)." : "Kész.");
  console.log(`  Hirdetések: ${result.results.length} db`);
  console.log(`  Oldalak:    ${result.pagesScraped} / max ${result.maxPage}`);
  console.log(`  CSV:        ${saved.latestCsv}`);
  console.log(`  JSON:       ${saved.latestJson}`);
  console.log(`  Program:    ${programDir}`);
  if (result.error) {
    console.log(`  Hiba:       ${result.error}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
