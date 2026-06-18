#!/usr/bin/env node
/**
 * .env.local automatikus létrehozása — egy parancs, nem kell kézzel másolni.
 */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, ".env.local");

const content = `# BOCSA lokális — automatikusan generálva (npm run setup:env)
NEXT_PUBLIC_SUPABASE_URL=https://duvzbcxsfzeqjnvohifm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dnpiY3hzZnplcWpudm9oaWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzU1NzEsImV4cCI6MjA5MzE1MTU3MX0.RiQIwGyKJKqo0ud4yzTTU9_-jKkLU5jw2w3WxEe-0sg
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=local-dev-bocsa-session-secret-2026
`;

if (existsSync(target)) {
  const backup = `${target}.backup-${Date.now()}`;
  copyFileSync(target, backup);
  console.log(`→ Régi .env.local mentve: ${backup}`);
}

writeFileSync(target, content, "utf8");
console.log("→ .env.local létrehozva / felülírva");
console.log("");
console.log("Következő:");
console.log("  npm run check:local");
console.log("  npm run fix:local");
console.log("  http://localhost:3000/login  (admin / demo123, Geheimzahl 10)");
