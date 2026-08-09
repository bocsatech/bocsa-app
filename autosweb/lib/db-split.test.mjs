import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const dir = mkdtempSync(join(tmpdir(), "autosweb-dbsplit-"));
process.env.AUTOSWEB_DATA_DIR = dir;
delete process.env.AUTOSWEB_DB_PATH;

const { getUsersDbPath, getListingsDbPath, getMessagesDbPath, getDbPaths } = await import(
  `./db-registry.mjs?t=${Date.now()}`
);
const { initAuthSchema, registerUser } = await import(`./auth-users.mjs?t=${Date.now()}`);
const { initMessagingSchema, startConversation, listConversations } = await import(
  `./messaging.mjs?t=${Date.now()}`
);
const { saveListing, listListings } = await import(`./db.mjs?t=${Date.now()}`);

test("három külön helyi DB: users / listings / messages", () => {
  const paths = getDbPaths();
  assert.equal(paths.users, getUsersDbPath());
  assert.equal(paths.listings, getListingsDbPath());
  assert.equal(paths.messages, getMessagesDbPath());
  assert.notEqual(paths.users, paths.listings);
  assert.notEqual(paths.listings, paths.messages);

  initAuthSchema();
  initMessagingSchema();

  const reg = registerUser({
    email: "split@teszt.hu",
    password: "jelszo1",
    password_confirm: "jelszo1",
  });
  assert.equal(reg.ok, true);
  assert.ok(existsSync(paths.users));

  const saved = saveListing({
    hirdetes_cime: "Teszt autó",
    gyartmany: "BMW",
    modell: "320d",
  });
  assert.ok(saved?.id);
  assert.ok(existsSync(paths.listings));
  assert.equal(listListings({ limit: 10 }).length >= 1, true);

  const conv = startConversation(reg.user.id, {
    listing_id: String(saved.id),
    listing_title: "Teszt autó",
    listing_price_label: "1 M Ft",
  });
  assert.ok(conv?.id);
  assert.ok(existsSync(paths.messages));
  assert.equal(listConversations(reg.user.id).length, 1);
});
