#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "package.json",
  "next.config.mjs",
  "middleware.ts",
  "app/layout.js",
  "app/page.tsx",
  "app/login/page.tsx",
];

let ok = true;

console.log("BOCSA lokális ellenőrzés\n");
console.log(`Mappa: ${root}\n`);

for (const rel of required) {
  const path = resolve(root, rel);
  const exists = existsSync(path);
  console.log(`${exists ? "✓" : "✗"} ${rel}`);
  if (!exists) ok = false;
}

console.log("");
if (!ok) {
  console.log("HIBA: Hiányzó fájlok — töltsd le újra a projektet:");
  console.log("  cd ~ && rm -rf bocsa-app");
  console.log("  git clone https://github.com/bocsatech/bocsa-app");
  console.log("  cd bocsa-app && npm install");
  process.exit(1);
}

console.log("Fájlok rendben.");
console.log("");
console.log("Következő lépések:");
console.log("  1. cp .env.local.example .env.local  (és töltsd ki a kulcsokat)");
console.log("  2. npm run build                     (ha hibázik, küldd el a hibát)");
console.log("  3. npm run dev:webpack               (Mac-en gyakran ez kell 404 helyett)");
console.log("  4. Böngésző: http://localhost:3000/login");
