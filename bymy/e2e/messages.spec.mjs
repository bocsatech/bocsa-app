import { test, expect } from "@playwright/test";

test.describe("üzenetek API", () => {
  // Javítás a main-en van; amíg a Vercel deploy limit miatt nem megy ki, ez failelne.
  // Deploy után: cseréld test()-re.
  test.fix("nem adhat 500-as ~/.autosweb ENOENT hibát bejelentkezés nélkül", async ({ request }) => {
    const res = await request.get("/api/messages/conversations");
    // 401/403 OK (nincs session); 500 + ENOENT = a Vercel filesystem bug
    const body = await res.text();
    expect(body).not.toMatch(/ENOENT/i);
    expect(body).not.toMatch(/\.autosweb/i);
    expect(res.status()).not.toBe(500);
  });
});
