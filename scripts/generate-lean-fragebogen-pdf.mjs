#!/usr/bin/env node
/**
 * Fragebogen Lean Management (DE/HU) → PDF
 * Használat:
 *   node scripts/generate-lean-fragebogen-pdf.mjs
 *   node scripts/generate-lean-fragebogen-pdf.mjs ~/Downloads/Fragebogen_Lean_Management_DE_HU.pdf
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "documents/pdca/fragebogen-lean-management-de-hu.html");
const DEFAULT_OUT = path.join(
  ROOT,
  "documents/pdca/Fragebogen_Lean_Management_Musterloesung_DE_HU.pdf"
);

function resolveOutputPath(arg) {
  if (!arg) return DEFAULT_OUT;
  return path.resolve(arg.startsWith("~") ? arg.replace("~", process.env.HOME || "") : arg);
}

async function ensurePlaywright() {
  try {
    await import("playwright");
    return;
  } catch {
    console.log("Playwright telepítése (egyszeri)...");
    execSync("npm install --no-save playwright@1.51.1", {
      cwd: ROOT,
      stdio: "inherit",
    });
    execSync("npx playwright install chromium", { cwd: ROOT, stdio: "inherit" });
  }
}

async function generatePdf(outputPath) {
  await ensurePlaywright();
  const { chromium } = await import("playwright");

  await mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
  });
  await browser.close();
  return outputPath;
}

const outputPath = resolveOutputPath(process.argv[2]);

try {
  const saved = await generatePdf(outputPath);
  console.log(`✓ PDF kész: ${saved}`);
} catch (error) {
  console.error("PDF generálás sikertelen:", error.message);
  console.error("Alternatíva: nyisd meg a HTML-t böngészőben → Nyomtatás → PDF mentés:");
  console.error(HTML);
  process.exit(1);
}
