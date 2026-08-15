import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/auto.html",
  "/teherauto.html",
  "/ingatlan.html",
  "/ajanlasok.html",
  "/belepes.html",
  "/regisztracio.html",
];

test.describe("fejléc — közös elemek minden oldalon", () => {
  for (const path of PAGES) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      const header = page.locator("header.hub-header, header.site-header, header.site-app-header").first();
      await expect(header).toBeVisible();

      await expect(page.locator("a[aria-label='Bymy'], .site-app-logo, .hub-logo").first()).toBeVisible();
      await expect(page.getByRole("link", { name: /\+?\s*hirdetésfeladás/i }).first()).toBeVisible();
      await expect(page.locator("[data-theme-toggle]").first()).toBeVisible();

      const nav = page.getByRole("navigation", { name: /főmenü/i });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link", { name: /kezdőlap/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /^autó/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /teherautó/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /ingatlan/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /ajánlások/i })).toBeVisible();

      const guestVisible = await page.locator("[data-auth-guest]").first().isVisible().catch(() => false);
      const memberVisible = await page.locator("[data-auth-member]").first().isVisible().catch(() => false);
      expect(guestVisible || memberVisible).toBeTruthy();
    });
  }
});
