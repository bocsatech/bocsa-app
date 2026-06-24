#!/usr/bin/env node
/**
 * GermanDateField — teljes ellenőrzés (Playwright).
 */
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.waitForSelector(".loginChallengeCompact", { timeout: 15000 });
  const challengeRes = await page.evaluate(async () => {
    const r = await fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin" }),
    });
    return r.json();
  });
  const pinAnswer =
    challengeRes.operation === "add" ? adminPin + challengeRes.value : adminPin - challengeRes.value;
  await page.locator(".loginPinInput").fill(String(pinAnswer));
  await page.locator("button.loginSubmit").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function assertCalendarField(page, label, setup) {
  if (setup) await setup(page);

  const field = page.locator(".dateFieldWithPicker.hasCalendarPopover").first();
  const count = await field.count();
  if (count === 0) {
    const hasNative = await page.locator(".dateFieldNativePicker").count();
    throw new Error(
      `${label}: nincs custom naptár (hasCalendarPopover). Natív mezők: ${hasNative}`
    );
  }

  await field.scrollIntoViewIfNeeded();
  await field.locator(".dateFieldPickerBtn").click();

  const popover = page.locator(".germanDateCalendarPopover");
  await popover.waitFor({ state: "visible", timeout: 5000 });

  const box = await popover.boundingBox();
  if (!box || box.top < 4 || box.left < 4) {
    throw new Error(`${label}: popover rossz pozíció ${JSON.stringify(box)}`);
  }

  const monthCombo = popover.locator(".germanDateCalendarCombo").first();
  await monthCombo.locator(".germanDateCalendarComboTrigger").click();
  const list = monthCombo.locator(".germanDateCalendarComboList");
  await list.waitFor({ state: "visible", timeout: 3000 });

  const triggerBox = await monthCombo.locator(".germanDateCalendarComboTrigger").boundingBox();
  const listBox = await list.boundingBox();
  if (!triggerBox || !listBox || Math.abs(listBox.x - triggerBox.x) > 32) {
    throw new Error(`${label}: hónap-lista elcsúszva`);
  }

  await list.locator("button").nth(5).click();
  const dayBtn = popover.locator(".germanDateCalendarDay:not(.isEmpty)").first();
  await dayBtn.click();
  await popover.waitFor({ state: "hidden", timeout: 3000 });

  const value = await field.locator(".dateFieldText").inputValue();
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    throw new Error(`${label}: érvénytelen dátum „${value}"`);
  }

  return value;
}

const cases = [
  { path: "/persoenliche-sache", label: "Persönliche Sache" },
  { path: "/arbeitsauftrag", label: "Arbeitsauftrag" },
  { path: "/pkw-service", label: "PKW-Service" },
  { path: "/lager/bewegungen", label: "Lager", setup: async (p) => p.getByRole("button", { name: "Zeitraum" }).click() },
  { path: "/arbeitsstunden", label: "Arbeitsstunden", setup: async (p) => p.locator(".asSidebarStundenPeriodBtn", { hasText: "Intervall" }).first().click() },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  console.log(`Calendar teszt → ${base}\n`);
  await login(page);
  console.log("✓ Login\n");

  const failures = [];
  for (const entry of cases) {
    try {
      await page.goto(`${base}${entry.path}`, { waitUntil: "networkidle" });
      const value = await assertCalendarField(page, entry.label, entry.setup);
      console.log(`✓ ${entry.label}: ${value}`);
    } catch (err) {
      failures.push(`${entry.label}: ${err.message}`);
      console.error(`✗ ${entry.label}: ${err.message}`);
      await page.screenshot({ path: `/tmp/calendar-fail-${entry.path.replace(/\//g, "_")}.png`, fullPage: true });
    }
  }

  await browser.close();
  if (failures.length) {
    console.error(`\n${failures.length} hiba`);
    process.exit(1);
  }
  console.log("\n✓ Minden oldal OK — custom naptár működik");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
