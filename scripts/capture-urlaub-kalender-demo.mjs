#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "documents/pdca/urlaub-kalender-demo.html");
const OUT = path.join(ROOT, "documents/pdca/urlaub-kalender-demo.png");
const ARTIFACT = "/opt/cursor/artifacts/urlaub-kalender-demo.png";

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 980, height: 720 } });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: OUT, fullPage: true });
  await page.screenshot({ path: ARTIFACT, fullPage: true });
  await browser.close();
  console.log(`✓ Demo PNG: ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
