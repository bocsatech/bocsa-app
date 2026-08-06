import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const dir = mkdtempSync(join(tmpdir(), "autosweb-msg-"));
process.env.AUTOSWEB_DB_PATH = join(dir, "test.db");

const { registerUser } = await import("./auth-users.mjs");
const {
  initMessagingSchema,
  startConversation,
  listConversations,
  sendMessage,
  listMessages,
  markRead,
  blockUser,
  registerDeviceToken,
  pendingPushForUser,
} = await import("./messaging.mjs");

test("messaging: beszélgetés + üzenet + push outbox", () => {
  initMessagingSchema();
  const buyer = registerUser({
    email: "vevo@teszt.hu",
    password: "jelszo1",
    password_confirm: "jelszo1",
  });
  const seller = registerUser({
    email: "elado@teszt.hu",
    password: "jelszo1",
    password_confirm: "jelszo1",
  });

  const conv = startConversation(buyer.user.id, {
    listing_id: "car-1",
    listing_title: "BMW 320d",
    listing_price_label: "8,9 M Ft",
    listing_code: "AEA-1",
    seller_id: seller.user.id,
  });
  assert.ok(conv.id);
  assert.equal(conv.listing.title, "BMW 320d");

  const msg = sendMessage(buyer.user.id, conv.id, { body: "Szia, megvan még?" });
  assert.equal(msg.body, "Szia, megvan még?");

  const thread = listMessages(seller.user.id, conv.id);
  assert.equal(thread.messages.length, 1);
  assert.ok(thread.conversation.unread >= 1);

  markRead(seller.user.id, conv.id);
  const after = listConversations(seller.user.id);
  assert.equal(after[0].unread, 0);

  const pushes = pendingPushForUser(seller.user.id);
  assert.ok(pushes.length >= 1);
  assert.match(pushes[0].title, /üzenet/i);

  registerDeviceToken(buyer.user.id, { token: "device-token-demo", platform: "ios" });
  blockUser(buyer.user.id, seller.user.id);
  assert.throws(() => sendMessage(buyer.user.id, conv.id, { body: "tiltva" }));
});

test.after(() => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
