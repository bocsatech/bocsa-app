#!/usr/bin/env node
/**
 * Urlaub Monatsanzeige — Demo-PNG erzeugen
 *   node scripts/capture-urlaub-monat-demo.mjs
 *   node scripts/capture-urlaub-monat-demo.mjs ~/Downloads/urlaub-monat-demo.png
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "documents/pdca/urlaub-monat-demo.html");
const DEFAULT_OUT = path.join(ROOT, "documents/pdca/urlaub-monat-demo.png");

function resolveOutputPath(arg) {
  if (!arg) return DEFAULT_OUT;
  return path.resolve(arg.startsWith("~") ? arg.replace("~", process.env.HOME || "") : arg);
}

async function main() {
  const { chromium } = await import("playwright");
  const outputPath = resolveOutputPath(process.argv[2]);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1040, height: 820 } });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
  console.log(`✓ Demo PNG: ${outputPath}`);
}

main().catch((error) => {
  console.error("Hiba:", error.message);
  console.error("Telepítés: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
});
