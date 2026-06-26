#!/usr/bin/env node
/**
 * Admin user PATCH teszt — dev szerver + admin session szükséges.
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
    json = { raw: text.slice(0, 300) };
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
  if (!challengeRes.response.ok) {
    fail(`challenge => ${challengeRes.response.status}`);
  }
  const { operation, value } = challengeRes.json;
  const pinAnswer = operation === "add" ? adminPin + value : adminPin - value;
  const loginRes = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: challengeRes.cookie,
    },
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

console.log(`Users PATCH teszt → ${base}\n`);

const cookie = await loginAsAdmin();
console.log("✓ admin login");

const listRes = await request("/api/users", {
  headers: { cookie },
});
if (!listRes.response.ok) {
  fail(`GET /api/users => ${listRes.response.status}: ${listRes.json.error}`);
}

const target =
  (listRes.json.users ?? []).find((user) => user.username === "bocsar") ??
  (listRes.json.users ?? [])[0];
if (!target?.id) {
  fail("Nincs teszt felhasználó.");
}

const marker = `patch-test-${Date.now()}`;
const patchRes = await request(`/api/users/${target.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({
    username: target.username,
    fullName: marker,
    position: "Vorgesetzter",
    site: "Teststandort",
    filialeCode: "S",
    companyMobile: "",
    privateMobile: "",
    companyEmail: "",
    privateEmail: "",
    birthDate: "",
    address: "",
    ecardNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bankAccount: "",
    directManager: "",
    workArea: null,
    overtimeHoursBalance: 0,
    photoUrl: "",
    signatureUrl: "",
  }),
});

if (!patchRes.response.ok) {
  fail(`PATCH => ${patchRes.response.status}: ${patchRes.json.error || JSON.stringify(patchRes.json)}`);
}

if (patchRes.json.user?.full_name !== marker) {
  fail(
    `PATCH válasz nem egyezik: ${patchRes.json.user?.full_name ?? "?"} !== ${marker}`
  );
}

console.log(`✓ PATCH ${target.username} => full_name="${marker}"`);
console.log("\nMinden users PATCH teszt sikeres.");
