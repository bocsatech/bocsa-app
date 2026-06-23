#!/usr/bin/env node
/** Urlaub oldal + Meine Menü ellenőrzés */
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  return { response, text };
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

console.log(`Urlaub teszt → ${base}\n`);

const challengeRes = await request("/api/auth/challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin" }),
});
if (!challengeRes.response.ok) fail(`challenge => ${challengeRes.response.status}`);

const { operation, value } = JSON.parse(challengeRes.text);
const pinAnswer = operation === "add" ? adminPin + value : adminPin - value;
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
if (!loginRes.response.ok) fail(`login => ${loginRes.response.status}`);
const sessionCookie = loginRes.response.headers.get("set-cookie") || cookie;
ok("login => admin");

const pageRes = await request("/urlaub", { headers: { cookie: sessionCookie } });
if (!pageRes.response.ok) fail(`/urlaub => ${pageRes.response.status}`);

const checks = [
  ["Meine Menü link: Urlaub", pageRes.text.includes('href="/urlaub"') && pageRes.text.includes("Urlaub")],
  ["Timeline wrap", pageRes.text.includes("urlaubTimelineWrap")],
  ["Mitarbeiter sorok", pageRes.text.includes("urlaubUserCell")],
  ["Monatsband", pageRes.text.includes("urlaubMonthSegment")],
  ["Sichtbar indikátor", pageRes.text.includes("Sichtbar:")],
  ["Urlaub blokkok", pageRes.text.includes("urlaubBlock")],
];

console.log("");
for (const [label, passed] of checks) {
  console.log(`${passed ? "✓" : "✗"} ${label}`);
  if (!passed) fail(`Hiányzik: ${label}`);
}

console.log("\n✓ Urlaub naptár rendben a feature branch-en (localhost).");
