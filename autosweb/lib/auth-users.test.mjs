import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createServer } from "http";

const dir = mkdtempSync(join(tmpdir(), "autosweb-auth-"));
process.env.AUTOSWEB_DB_PATH = join(dir, "test.db");

const {
  initAuthSchema,
  registerUser,
  loginUser,
  getUserByToken,
  saveUserProfile,
  changeUserPassword,
  importLocalAccounts,
  deleteUserAccount,
  handleAuthApi,
  authStats,
} = await import("./auth-users.mjs");

test("auth: regisztráció + belépés + profil + jelszó", async () => {
  initAuthSchema();
  const reg = registerUser({
    email: "Teszt@Pelda.Hu",
    password: "titok1",
    password_confirm: "titok1",
  });
  assert.equal(reg.ok, true);
  assert.ok(reg.token);
  assert.equal(reg.user.email, "teszt@pelda.hu");

  const me = getUserByToken(reg.token);
  assert.equal(me.email, "teszt@pelda.hu");

  const login = loginUser({ email: "teszt@pelda.hu", password: "titok1" });
  assert.ok(login.token);

  const saved = saveUserProfile(login.token, {
    firstName: "Anna",
    lastName: "Teszt",
    postalCode: "1117",
    city: "Budapest",
    phone: "+361234",
  });
  assert.equal(saved.user.displayName, "Anna Teszt");
  assert.equal(saved.user.profile.city, "Budapest");

  changeUserPassword(login.token, {
    current_password: "titok1",
    new_password: "titok2",
    new_password_confirm: "titok2",
  });
  assert.throws(() => loginUser({ email: "teszt@pelda.hu", password: "titok1" }));
  const again = loginUser({ email: "teszt@pelda.hu", password: "titok2" });
  assert.ok(again.token);
});

test("auth: localStorage import + törlés", () => {
  const imported = importLocalAccounts([
    {
      email: "local@pelda.hu",
      password: "abc123",
      displayName: "Local User",
      profile: { firstName: "Local", lastName: "User", postalCode: "1000", city: "Bp" },
    },
  ]);
  assert.equal(imported.results[0].imported, true);
  const again = importLocalAccounts([{ email: "local@pelda.hu", password: "abc123" }]);
  assert.equal(again.results[0].reason, "exists");

  const login = loginUser({ email: "local@pelda.hu", password: "abc123" });
  deleteUserAccount(login.token);
  assert.equal(getUserByToken(login.token), null);
  assert.throws(() => loginUser({ email: "local@pelda.hu", password: "abc123" }));
});

test("auth: HTTP API register/login/me", async () => {
  const server = createServer(async (req, res) => {
    const pathname = req.url?.split("?")[0] || "/";
    if (pathname.startsWith("/api/auth")) {
      await handleAuthApi(req, res, pathname);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const regRes = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "api@pelda.hu",
      password: "pass99",
      password_confirm: "pass99",
    }),
  });
  assert.equal(regRes.status, 201);
  const reg = await regRes.json();
  assert.ok(reg.token);

  const meRes = await fetch(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${reg.token}` },
  });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  assert.equal(me.user.email, "api@pelda.hu");

  const stats = authStats();
  assert.ok(stats.users >= 1);

  server.close();
});

test.after(() => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
