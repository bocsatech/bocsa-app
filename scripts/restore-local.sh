#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Git rebase megszakítása (ha van)..."
git rebase --abort 2>/dev/null || true

echo "→ Legfrissebb kód letöltése (fetch + reset — divergent branch nélkül)..."
if git remote get-url new-origin >/dev/null 2>&1; then
  git fetch new-origin main
  git reset --hard new-origin/main
elif git remote get-url origin >/dev/null 2>&1; then
  git fetch origin main
  git reset --hard origin/main
else
  echo "HIBA: nincs git remote (origin / new-origin)."
  exit 1
fi

echo "→ Commit: $(git log -1 --oneline)"

if [[ ! -f .env.local ]]; then
  echo ""
  echo "HIBA: .env.local hiányzik!"
  echo "Hozd létre Supabase → Settings → API alapján (.env.local.example)."
  exit 1
fi

if ! grep -q 'NEXT_PUBLIC_SUPABASE_URL=' .env.local; then
  echo "HIBA: NEXT_PUBLIC_SUPABASE_URL hiányzik a .env.local-ból."
  exit 1
fi

echo "→ npm install..."
npm install --no-audit --no-fund

echo ""
echo "Kész. Indítás: npm run dev"
echo "Login: admin / demo123 (Geheimzahl 42, pl. +8 → 50)"
echo "Ha Supabase hiba: futtasd supabase/emergency-restore.sql a SQL Editorban."
