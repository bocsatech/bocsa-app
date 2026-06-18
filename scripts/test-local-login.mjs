#!/usr/bin/env node
/**
 * Lokális login teszt — dev szerver futása mellett (npm run dev).
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
  return { response, json };
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

console.log(`BOCSA login teszt → ${base}\n`);

const loginPage = await request("/login");
if (loginPage.response.status !== 200) {
  fail(`/login => ${loginPage.response.status} (dev szerver fut? npm run dev)`);
}
ok(`/login => 200`);

const challengeRes = await request("/api/auth/challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin" }),
});

if (!challengeRes.response.ok) {
  fail(
    `challenge => ${challengeRes.response.status}: ${challengeRes.json.error || "ismeretlen hiba"}`
  );
}

const { operation, value, compact } = challengeRes.json;
if (!operation || typeof value !== "number") {
  fail(`challenge válasz hibás: ${JSON.stringify(challengeRes.json)}`);
}
ok(`challenge => ${compact || `${operation} ${value}`}`);

const pinAnswer =
  operation === "add" ? adminPin + value : adminPin - value;

const cookie = challengeRes.response.headers.get("set-cookie") || "";
const loginRes = await request("/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    cookie,
  },
  body: JSON.stringify({
    username: "admin",
    password: "demo123",
    pinAnswer: String(pinAnswer),
  }),
});

if (!loginRes.response.ok || !loginRes.json.ok) {
  fail(
    `login => ${loginRes.response.status}: ${loginRes.json.error || JSON.stringify(loginRes.json)}`
  );
}
ok(`login => admin (Geheimzahl ${adminPin}, eredmény ${pinAnswer})`);

console.log("\nMinden teszt sikeres.");
