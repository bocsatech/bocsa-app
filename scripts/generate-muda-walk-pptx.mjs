#!/usr/bin/env node
/**
 * Muda-Walk űrlap → szerkeszthető PowerPoint (.pptx)
 * node scripts/generate-muda-walk-pptx.mjs
 * node scripts/generate-muda-walk-pptx.mjs ~/Downloads/Muda-Walk.pptx
 */
import PptxGenJS from "pptxgenjs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "documents/pdca/Muda-Walk.pptx");

const WASTE_COLS = [
  "Über-\nproduktion",
  "Fehler",
  "Warte-\nzeiten",
  "Trans-\nporte",
  "Unnötige\nBewegungen",
  "Ineffiziente\nProzesse",
  "Bestände",
];

const DATA_ROWS = 7;

function cell(text, opts = {}) {
  return {
    text: text ?? "",
    options: {
      fontSize: opts.fontSize ?? 9,
      bold: opts.bold ?? false,
      align: opts.align ?? "left",
      valign: opts.valign ?? "middle",
      fill: opts.fill,
      color: opts.color ?? "363636",
      margin: opts.margin ?? [3, 4, 3, 4],
      ...opts,
    },
  };
}

function headerCell(text, opts = {}) {
  return cell(text, {
    bold: true,
    fontSize: opts.fontSize ?? 8,
    align: "center",
    valign: "middle",
    fill: opts.fill ?? "E8E8E8",
    color: "1a1a1a",
    ...opts,
  });
}

function emptyRow() {
  return [
    cell(""),
    ...WASTE_COLS.map(() => cell("")),
    cell(""),
    cell(""),
  ];
}

function buildTable() {
  const rows = [];

  // Fejléc 1. sor
  rows.push([
    headerCell("Bereich,\nArbeitsplatz\n-schritt", { rowspan: 2, fontSize: 8 }),
    headerCell("Verschwendung durch …", { colspan: 7, fontSize: 9 }),
    headerCell("Beschreibung", { rowspan: 2, fontSize: 8 }),
    headerCell("Wie\nviel?", { rowspan: 2, fontSize: 8 }),
  ]);

  // Fejléc 2. sor (7 Muda oszlop)
  rows.push(WASTE_COLS.map((label) => headerCell(label, { fontSize: 7 })));

  // Üres adatsorok
  for (let i = 0; i < DATA_ROWS; i += 1) {
    rows.push(emptyRow());
  }

  return rows;
}

async function main() {
  const outArg = process.argv[2];
  const outPath = outArg
    ? path.resolve(outArg.startsWith("~") ? outArg.replace("~", process.env.HOME || "") : outArg)
    : DEFAULT_OUT;

  await mkdir(path.dirname(outPath), { recursive: true });

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Bocsa Robert";
  pptx.title = "Muda-Walk";

  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  // Cím + Team / Datum (szerkeszthető szövegdobozok)
  slide.addText("Muda-Walk", {
    x: 7.2,
    y: 0.15,
    w: 2.5,
    h: 0.45,
    fontSize: 28,
    bold: true,
    align: "right",
    color: "1a1a1a",
  });

  slide.addText("Team:", {
    x: 0.35,
    y: 0.2,
    w: 0.55,
    h: 0.25,
    fontSize: 11,
    bold: true,
  });
  slide.addText(" ", {
    x: 0.9,
    y: 0.18,
    w: 3.2,
    h: 0.3,
    fontSize: 11,
    placeholder: "Team eintragen",
  });

  slide.addText("Datum:", {
    x: 4.2,
    y: 0.2,
    w: 0.75,
    h: 0.25,
    fontSize: 11,
    bold: true,
  });
  slide.addText(" ", {
    x: 5.0,
    y: 0.18,
    w: 1.8,
    h: 0.3,
    fontSize: 11,
    placeholder: "TT.MM.JJJJ",
  });

  const colW = [
    1.35, // Bereich
    0.42,
    0.42,
    0.42,
    0.42,
    0.55,
    0.55,
    0.42, // 7 Muda
    3.35, // Beschreibung
    0.55, // Wie viel
  ];

  slide.addTable(buildTable(), {
    x: 0.35,
    y: 0.65,
    w: 12.6,
    colW,
    border: { type: "solid", color: "999999", pt: 0.75 },
    rowH: [0.38, 0.72, ...Array(DATA_ROWS).fill(0.58)],
    autoPage: false,
  });

  await pptx.writeFile({ fileName: outPath });
  console.log(`✓ PowerPoint kész: ${outPath}`);
  console.log("  → Nyisd meg PowerPointban / Keynote-ban: minden cella szerkeszthető.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
