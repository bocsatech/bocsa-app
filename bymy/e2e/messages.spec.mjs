import { test, expect } from "@playwright/test";

test.describe("üzenetek API", () => {
  test("nem adhat 500-as ~/.autosweb ENOENT hibát bejelentkezés nélkül", async ({ request }) => {
    // Javítás a main-en van; production deploy limit miatt még él a bug.
    // Deploy után: BYMY_EXPECT_MESSAGES_BROKEN=0 npm run test:e2e
    test.skip(
      process.env.BYMY_EXPECT_MESSAGES_BROKEN !== "0",
      "Üzenetek ENOENT még a productionön — deploy után BYMY_EXPECT_MESSAGES_BROKEN=0"
    );

    const res = await request.get("/api/messages/conversations");
    // 401/403 OK (nincs session); 500 + ENOENT = a Vercel filesystem bug
    const body = await res.text();
    expect(body).not.toMatch(/ENOENT/i);
    expect(body).not.toMatch(/\.autosweb/i);
    expect(res.status()).not.toBe(500);
  });
});
