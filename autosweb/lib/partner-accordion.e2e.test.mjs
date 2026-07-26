import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

test("partner accordion: zárva indul, egy nyitva, összes becsukása", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:3456/", { waitUntil: "networkidle" });

    await page.fill("#home-partner-postal-input", "8000");
    await page.click(".home-partner-postal-btn");
    await page.waitForSelector("#home-partner-accordion", { timeout: 15000 });

    const toggleCount = await page.locator(".home-partner-category-toggle").count();
    assert.ok(toggleCount >= 9, "legalább 9 kategória");

    assert.equal(
      await page.locator(".home-partner-category-panel:not([hidden])").count(),
      0,
      "induláskor minden panel zárva"
    );

    await page.locator(".home-partner-category-toggle").first().click();
    assert.equal(await page.locator(".home-partner-category.is-open").count(), 1);

    await page.locator(".home-partner-category-toggle").nth(1).click();
    assert.equal(await page.locator(".home-partner-category.is-open").count(), 1);
    assert.equal(await page.locator(".home-partner-category-panel:not([hidden])").count(), 1);

    await page.click("#home-partner-collapse-all");
    assert.equal(await page.locator("#home-partner-accordion").count(), 0);
    assert.equal(await page.locator("#home-partner-results").evaluate((el) => el.hidden), true);
    assert.equal(await page.locator("#home-partner-recommendations").isVisible(), true);
  } finally {
    await browser.close();
  }
});
