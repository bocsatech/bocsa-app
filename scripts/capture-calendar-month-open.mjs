#!/usr/bin/env node
/** Screenshot: hónap legördülő a popoverben. */
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.waitForSelector(".loginChallengeCompact");
  const c = await page.evaluate(async () => {
    const r = await fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin" }),
    });
    return r.json();
  });
  const ans = c.operation === "add" ? adminPin + c.value : adminPin - c.value;
  await page.locator(".loginPinInput").fill(String(ans));
  await page.locator("button.loginSubmit").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await login(page);
await page.goto(`${base}/persoenliche-sache`, { waitUntil: "networkidle" });
await page.locator(".dateFieldText").click();
const popover = page.locator(".germanDateCalendarPopover");
await popover.waitFor({ state: "visible" });
await popover.locator(".germanDateCalendarComboTrigger").first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/calendar-month-open.png" });
await browser.close();
console.log("✓ /tmp/calendar-month-open.png");
