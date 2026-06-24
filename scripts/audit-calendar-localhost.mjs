#!/usr/bin/env node
/**
 * Részletes naptár teszt — screenshot + hónap-select kattintás.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);
const outDir = "/tmp/calendar-audit";

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.waitForSelector(".loginChallengeCompact", { timeout: 10000 });
  const challengeRes = await page.evaluate(async () => {
    const r = await fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin" }),
    });
    return r.json();
  });
  const pinAnswer =
    challengeRes.operation === "add"
      ? adminPin + challengeRes.value
      : adminPin - challengeRes.value;
  await page.locator(".loginPinInput").fill(String(pinAnswer));
  await page.locator("button.loginSubmit").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function auditPage(page, path, setup) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  if (setup) await setup(page);

  const field = page.locator(".dateFieldWithPicker").first();
  await field.scrollIntoViewIfNeeded();
  await field.locator(".dateFieldText").click();

  const popover = page.locator(".germanDateCalendarPopover");
  await popover.waitFor({ state: "visible", timeout: 5000 });

  await page.waitForTimeout(100);
  const box1 = await popover.boundingBox();
  const issues = [];

  if (!box1 || box1.top < 8 || box1.left < 8) {
    issues.push(`rossz pozíció: ${JSON.stringify(box1)}`);
  }

  const monthCombo = popover.locator(".germanDateCalendarCombo").first();
  await monthCombo.locator(".germanDateCalendarComboTrigger").click();
  await page.waitForTimeout(200);

  const comboList = monthCombo.locator(".germanDateCalendarComboList");
  await comboList.waitFor({ state: "visible", timeout: 3000 });

  const triggerBox = await monthCombo.locator(".germanDateCalendarComboTrigger").boundingBox();
  const listBox = await comboList.boundingBox();
  if (!triggerBox || !listBox) {
    issues.push("hónap lista bounding box hiányzik");
  } else if (Math.abs(listBox.x - triggerBox.x) > 24 || listBox.y < triggerBox.y - 8) {
    issues.push(
      `hónap lista rossz helyen (trigger=${JSON.stringify(triggerBox)}, list=${JSON.stringify(listBox)})`
    );
  }

  await comboList.locator("button").nth(5).click();
  await page.waitForTimeout(200);
  const stillVisible = await popover.isVisible();
  if (!stillVisible) {
    issues.push("popover bezáródott hónap-választás után");
  }

  const slug = path.replace(/\//g, "_") || "root";
  await page.screenshot({ path: `${outDir}/${slug}.png`, fullPage: false });

  await page.keyboard.press("Escape");
  return { path, issues, box: box1 };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(page);

  const results = [];
  results.push(
    await auditPage(page, "/persoenliche-sache", null),
    await auditPage(page, "/arbeitsauftrag", null),
    await auditPage(page, "/pkw-service", null),
    await auditPage(page, "/lager/bewegungen", async (p) => {
      await p.getByRole("button", { name: "Zeitraum" }).click();
    }),
    await auditPage(page, "/pruefprotokoll", null)
  );

  await browser.close();

  let failed = false;
  for (const r of results) {
    if (r.issues.length) {
      failed = true;
      console.error(`✗ ${r.path}: ${r.issues.join("; ")} (box=${JSON.stringify(r.box)})`);
    } else {
      console.log(`✓ ${r.path}: box=${JSON.stringify(r.box)}`);
    }
  }

  console.log(`\nScreenshotok: ${outDir}/`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
