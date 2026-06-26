#!/usr/bin/env node
/** Stammdaten: GET /api/users/me muss JSON user zurückgeben */
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
  return { response, json, cookie: response.headers.get("set-cookie") || "" };
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function loginAsAdmin() {
  const challengeRes = await request("/api/auth/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin" }),
  });
  if (!challengeRes.response.ok) fail(`challenge => ${challengeRes.response.status}`);
  const { operation, value } = challengeRes.json;
  const pinAnswer = operation === "add" ? adminPin + value : adminPin - value;
  const loginRes = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: challengeRes.cookie },
    body: JSON.stringify({
      username: "admin",
      password: "demo123",
      pinAnswer: String(pinAnswer),
    }),
  });
  if (!loginRes.response.ok || !loginRes.json.ok) {
    fail(`login => ${loginRes.response.status}: ${loginRes.json.error || "?"}`);
  }
  return loginRes.cookie;
}

console.log(`Stammdaten API teszt → ${base}\n`);
const cookie = await loginAsAdmin();
console.log("✓ admin login");

const meRes = await request("/api/users/me", { headers: { cookie } });
const contentType = meRes.response.headers.get("content-type") ?? "";
if (!contentType.includes("application/json")) {
  fail(`GET /api/users/me => HTML statt JSON (${contentType})`);
}
if (!meRes.response.ok) {
  fail(`GET /api/users/me => ${meRes.response.status}: ${meRes.json.error || "?"}`);
}
if (!meRes.json.user?.username) {
  fail("GET /api/users/me => user.username fehlt");
}

console.log(`✓ GET /api/users/me => ${meRes.json.user.username}, Position: ${meRes.json.user.position ?? "—"}`);

const patchRes = await request("/api/users/me", {
  method: "PATCH",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ address: "Teststraße 1" }),
});
if (!patchRes.response.ok) {
  fail(`PATCH /api/users/me => ${patchRes.response.status}: ${patchRes.json.error || "?"}`);
}
if (patchRes.json.user?.address !== "Teststraße 1") {
  fail(`PATCH /api/users/me => address nicht gespeichert (${patchRes.json.user?.address ?? "?"})`);
}
console.log("✓ PATCH /api/users/me => address gespeichert");

console.log("\nMinden Stammdaten API teszt sikeres.");
