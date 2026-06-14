/**
 * PDCA borító: app screenshot + borító előnézet PNG generálás.
 * node scripts/capture-pdca-screenshots.mjs
 */
import { chromium } from "playwright";
import { resolve } from "path";
import { pathToFileURL } from "url";

const root = resolve(process.cwd());
const pdcaDir = resolve(root, "documents/pdca");

async function capture(page, filePath, width, height) {
await page.setViewportSize({ width, height });
await page.waitForTimeout(400);
await page.screenshot({ path: filePath, type: "jpeg", quality: 92 });
}

const browser = await chromium.launch();
const page = await browser.newPage();

const appHomeUrl = pathToFileURL(resolve(pdcaDir, "_app-home-capture.html")).href;
await page.goto(appHomeUrl, { waitUntil: "networkidle" });
await capture(page, resolve(pdcaDir, "bocsa-app-home.jpg"), 1600, 900);

const coverUrl = pathToFileURL(resolve(pdcaDir, "lean-production-borito.html")).href;
await page.goto(coverUrl, { waitUntil: "networkidle" });
await capture(page, resolve(pdcaDir, "lean-production-borito.png"), 1536, 1024);

await browser.close();
console.log("Saved:", resolve(pdcaDir, "bocsa-app-home.jpg"));
console.log("Saved:", resolve(pdcaDir, "lean-production-borito.png"));
