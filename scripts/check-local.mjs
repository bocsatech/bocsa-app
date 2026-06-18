#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "package.json",
  "next.config.mjs",
  "proxy.ts",
  "app/layout.js",
  "app/page.tsx",
  "app/login/page.tsx",
];

const manifest = resolve(
  root,
  ".next/dev/server/app/login/page/build-manifest.json"
);
const hasBrokenCache = existsSync(resolve(root, ".next")) && !existsSync(manifest);

let ok = true;

console.log("BOCSA lokális ellenőrzés\n");
console.log(`Mappa: ${root}\n`);

for (const rel of required) {
  const path = resolve(root, rel);
  const exists = existsSync(path);
  console.log(`${exists ? "✓" : "✗"} ${rel}`);
  if (!exists) ok = false;
}

if (hasBrokenCache) {
  console.log("✗ .next cache sérült (ez okozza a 404/500 hibát)");
} else if (existsSync(resolve(root, ".next"))) {
  console.log("✓ .next cache");
} else {
  console.log("○ .next cache (még nincs — első indításkor jön létre)");
}

console.log("");
if (!ok) {
  console.log("HIBA: Hiányzó fájlok — töltsd le újra a projektet:");
  console.log("  cd ~ && rm -rf bocsa-app");
  console.log("  git clone https://github.com/bocsatech/bocsa-app");
  console.log("  cd bocsa-app && npm install");
  process.exit(1);
}

if (hasBrokenCache) {
  console.log("Javítás:");
  console.log("  npm run fix:local");
  process.exit(1);
}

console.log("Fájlok rendben.");
console.log("");
console.log("Következő lépések:");
console.log("  1. cp .env.local.example .env.local  (és töltsd ki a kulcsokat)");
console.log("  2. npm run dev");
console.log("  3. Böngésző: http://localhost:3000/login");
console.log("");
console.log("Ha 404/500 marad (git pull nélkül is):");
console.log("  rm -rf .next && npx next dev --webpack");
console.log("");
console.log("Legfrissebb kód + javítás:");
console.log("  git fetch origin main && git reset --hard origin/main && npm install && npm run dev");
