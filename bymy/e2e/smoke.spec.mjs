import { test, expect } from "@playwright/test";

test.describe("smoke — alap oldalak", () => {
  test("kezdőlap betölt", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator(".site-app-logo, a[aria-label='Bymy']").first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: /főmenü/i })).toBeVisible();
  });

  test("belépés oldal: email form + Google gomb", async ({ page }) => {
    await page.goto("/belepes.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /belépés/i })).toBeVisible();
    await expect(page.locator("#login-form input[name='email']")).toBeVisible();
    await expect(page.locator("#login-form input[name='password']")).toBeVisible();

    const google = page.locator('[data-oauth-provider="google"]');
    await expect(google).toBeVisible();
    // Productionön a Google OAuth be van kapcsolva
    await expect(google).toBeEnabled({ timeout: 20_000 });
  });

  test("regisztráció oldal betölt", async ({ page }) => {
    await page.goto("/regisztracio.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /regisztráció/i })).toBeVisible();
    await expect(page.locator("#register-form, form.login-form").first()).toBeVisible();
  });

  test("auth db API elérhető", async ({ request }) => {
    const res = await request.get("/api/auth/db");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.ok).toBeTruthy();
    expect(typeof data.smtpConfigured).toBe("boolean");
    expect(Array.isArray(data.oauthProviders)).toBeTruthy();
    const google = data.oauthProviders.find((p) => p.id === "google");
    expect(google?.enabled).toBeTruthy();
  });
});
