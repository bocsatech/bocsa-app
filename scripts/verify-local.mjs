#!/usr/bin/env node
/** PKW + Arbeitsstunden modulok és API-k ellenőrzése */
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const adminPin = Number(process.env.TEST_ADMIN_PIN || 10);

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "lib/pkw-ersatzteile.mjs",
  "lib/pkw-reifen.mjs",
  "lib/dates-server.mjs",
  "lib/pkw-fahrzeug-payload.mjs",
  "lib/pkw-server.mjs",
  "app/arbeitsstunden/page.tsx",
  "app/arbeitsstunden/ArbeitsstundenTimeline.tsx",
];

let ok = true;
console.log("Modul fájlok:\n");
for (const rel of requiredFiles) {
  const exists = existsSync(resolve(root, rel));
  console.log(`${exists ? "✓" : "✗"} ${rel}`);
  if (!exists) ok = false;
}

async function login() {
  const challengeRes = await fetch(`${base}/api/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin" }),
  });
  const challenge = await challengeRes.json();
  const pinAnswer =
    challenge.operation === "add" ? adminPin + challenge.value : adminPin - challenge.value;
  const cookie = challengeRes.headers.get("set-cookie") || "";
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      username: "admin",
      password: "demo123",
      pinAnswer: String(pinAnswer),
    }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  return loginRes.headers.get("set-cookie") || cookie;
}

console.log("\nAPI-k:\n");
try {
  const cookie = await login();
  const endpoints = [
    "/api/pkw/fahrzeuge",
    "/api/lager/meldungen/summary",
    "/api/arbeitsstunden/benutzer",
    "/arbeitsstunden",
  ];
  for (const path of endpoints) {
    const res = await fetch(`${base}${path}`, { headers: { cookie } });
    const good = res.status === 200;
    console.log(`${good ? "✓" : "✗"} ${path} => ${res.status}`);
    if (!good) ok = false;
  }
} catch (error) {
  console.log(`✗ Dev szerver nem elérhető: ${error.message}`);
  console.log("  → npm run dev:clean");
  ok = false;
}

if (!ok) process.exit(1);
console.log("\n✓ Minden ellenőrzés sikeres.");
