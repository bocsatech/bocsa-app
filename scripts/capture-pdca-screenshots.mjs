/**
 * PDCA borító: app screenshot + borító előnézet PNG generálás.
 *
 * Saját JPG (pl. chatben küldött képernyőkép):
 *   node scripts/capture-pdca-screenshots.mjs documents/pdca/sajat-program.jpg
 *
 * Automatikus app-mock screenshot:
 *   node scripts/capture-pdca-screenshots.mjs
 */
import { chromium } from "playwright";
import { copyFileSync, existsSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";

const root = resolve(process.cwd());
const pdcaDir = resolve(root, "documents/pdca");
const appHomeJpg = resolve(pdcaDir, "bocsa-app-home.jpg");

async function capture(page, filePath, width, height, type = "jpeg") {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  if (type === "png") {
    await page.screenshot({ path: filePath, type: "png" });
    return;
  }
  await page.screenshot({ path: filePath, type: "jpeg", quality: 92 });
}

const sourceJpg = process.argv[2] ? resolve(process.argv[2]) : null;

if (sourceJpg) {
  if (!existsSync(sourceJpg)) {
    console.error("Nincs ilyen fájl:", sourceJpg);
    process.exit(1);
  }
  copyFileSync(sourceJpg, appHomeJpg);
  console.log("Saját JPG bemásolva:", appHomeJpg);
}

const browser = await chromium.launch();
const page = await browser.newPage();

if (!sourceJpg) {
  const appHomeUrl = pathToFileURL(resolve(pdcaDir, "_app-home-capture.html")).href;
  await page.goto(appHomeUrl, { waitUntil: "networkidle" });
  await capture(page, appHomeJpg, 1600, 900);
  console.log("App mock screenshot:", appHomeJpg);
}

const coverUrl = pathToFileURL(resolve(pdcaDir, "lean-production-borito.html")).href;
await page.goto(coverUrl, { waitUntil: "networkidle" });
await capture(
  page,
  resolve(pdcaDir, "lean-production-borito.png"),
  1536,
  1024,
  "png"
);

await browser.close();
console.log("Borító előnézet:", resolve(pdcaDir, "lean-production-borito.png"));
