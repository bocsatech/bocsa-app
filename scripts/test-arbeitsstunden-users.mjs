#!/usr/bin/env node
/**
 * Arbeitsstunden — minden felhasználó neve megjelenik-e.
 * Playwright nélkül is fut (fetch + HTML ellenőrzés).
 */
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { response, text, json };
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

console.log(`BOCSA Arbeitsstunden teszt → ${base}\n`);

const challengeRes = await request("/api/auth/challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin" }),
});

if (!challengeRes.response.ok) {
  fail(`challenge => ${challengeRes.response.status}`);
}

const { operation, value } = challengeRes.json;
const pinAnswer = operation === "add" ? adminPin + value : adminPin - value;
ok(`challenge => ${operation} ${value}`);

const cookie = challengeRes.response.headers.get("set-cookie") || "";
const loginRes = await request("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({
    username: "admin",
    password: "demo123",
    pinAnswer: String(pinAnswer),
  }),
});

if (!loginRes.response.ok || !loginRes.json.ok) {
  fail(`login => ${loginRes.response.status}: ${loginRes.json.error || "hiba"}`);
}

const sessionCookie = loginRes.response.headers.get("set-cookie") || cookie;
ok("login => admin");

const lagerRes = await request("/api/lager/meldungen/summary", {
  headers: { cookie: sessionCookie },
});
if (!lagerRes.response.ok) {
  fail(
    `lager summary => ${lagerRes.response.status} (getPkwErsatzteile import hiba?) — futtasd: npm run dev:clean`
  );
}
ok(`lager summary => ${lagerRes.response.status}`);

const usersRes = await request("/api/arbeitsstunden/benutzer", {
  headers: { cookie: sessionCookie },
});
if (!usersRes.response.ok) {
  fail(`benutzer API => ${usersRes.response.status}`);
}

const apiUsers = usersRes.json.users ?? [];
ok(`benutzer API => ${apiUsers.length} felhasználó`);

const pageRes = await request("/arbeitsstunden", {
  headers: { cookie: sessionCookie },
});
if (!pageRes.response.ok) {
  fail(`/arbeitsstunden => ${pageRes.response.status}`);
}

const expected = apiUsers.map(
  (user) => String(user.displayName || user.fullName || user.username || "").trim()
).filter(Boolean);

const missing = expected.filter((name) => !pageRes.text.includes(name));
console.log("\nFelhasználók az oldalon:");
for (const name of expected) {
  console.log(`  ${pageRes.text.includes(name) ? "✓" : "✗"} ${name}`);
}

if (missing.length > 0) {
  fail(`Hiányzó nevek az oldalon: ${missing.join(", ")}`);
}

const checkboxCount = (pageRes.text.match(/type="checkbox"/g) ?? []).length;
if (checkboxCount < expected.length) {
  fail(`Checkbox hiány: ${checkboxCount} db, elvárt legalább ${expected.length}`);
}
ok(`checkbox => ${checkboxCount} db a név előtt`);

console.log(`\n✓ Minden felhasználó (${expected.length}) megjelenik az oldalon.`);
