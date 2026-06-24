#!/usr/bin/env node
/**
 * GermanDateField popover teszt localhoston (Playwright).
 *   node scripts/test-calendar-localhost.mjs
 */
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);

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

  const { operation, value } = challengeRes;
  const pinAnswer = operation === "add" ? adminPin + value : adminPin - value;
  await page.locator(".loginPinInput").fill(String(pinAnswer));
  await page.locator('button.loginSubmit').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function testDateField(page, label) {
  const field = page.locator(".dateFieldWithPicker").first();
  await field.waitFor({ state: "visible", timeout: 10000 });

  const textInput = field.locator(".dateFieldText");
  const pickerBtn = field.locator(".dateFieldPickerBtn");

  await textInput.click();
  const popover = page.locator(".germanDateCalendarPopover");
  await popover.waitFor({ state: "visible", timeout: 3000 });

  const box = await popover.boundingBox();
  if (!box || box.width < 100 || box.height < 100) {
    throw new Error(`${label}: popover túl kicsi vagy rossz helyen (${JSON.stringify(box)})`);
  }
  if (box.top < 0 || box.left < 0) {
    throw new Error(`${label}: popover negatív pozíció (${JSON.stringify(box)})`);
  }

  const monthCombo = popover.locator(".germanDateCalendarCombo").first();
  await monthCombo.locator(".germanDateCalendarComboTrigger").click();
  await monthCombo.locator(".germanDateCalendarComboList button").nth(5).click();
  await page.waitForTimeout(200);

  const dayBtn = popover.locator(".germanDateCalendarDay:not(.isEmpty)").first();
  await dayBtn.click();
  await popover.waitFor({ state: "hidden", timeout: 3000 });

  const value = await textInput.inputValue();
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    throw new Error(`${label}: érvénytelen dátum érték „${value}"`);
  }

  await pickerBtn.click();
  await popover.waitFor({ state: "visible", timeout: 3000 });
  await page.keyboard.press("Escape");
  await popover.waitFor({ state: "hidden", timeout: 3000 });

  return value;
}

const pages = [
  { path: "/persoenliche-sache", label: "Persönliche Sache / Geburtstag" },
  { path: "/arbeitsauftrag", label: "Arbeitsauftrag filter" },
  { path: "/pkw-service", label: "PKW-Service Von" },
  { path: "/lager/bewegungen", label: "Lager Bewegungen Zeitraum" },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log(`Teszt bázis: ${base}\n`);
  await login(page);
  console.log("✓ Login OK\n");

  const failures = [];

  for (const entry of pages) {
    try {
      await page.goto(`${base}${entry.path}`, { waitUntil: "networkidle" });

      if (entry.path === "/lager/bewegungen") {
        await page.getByRole("button", { name: "Zeitraum" }).click();
        await page.waitForTimeout(300);
      }

      const value = await testDateField(page, entry.label);
      console.log(`✓ ${entry.label}: ${value}`);
    } catch (err) {
      failures.push({ ...entry, error: err.message });
      console.error(`✗ ${entry.label}: ${err.message}`);
      await page.screenshot({
        path: `/tmp/calendar-fail-${entry.path.replace(/\//g, "_")}.png`,
        fullPage: true,
      });
    }
  }

  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} hiba — screenshotok: /tmp/calendar-fail-*.png`);
    process.exit(1);
  }

  console.log("\n✓ Minden naptár teszt sikeres");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
