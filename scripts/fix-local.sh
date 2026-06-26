#!/usr/bin/env bash
# Teljes lokális javítás: git sync + fájl-ellenőrzés + tiszta dev indítás.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

required=(
  "app/login/page.tsx"
  "app/page.tsx"
  "app/layout.js"
  "proxy.ts"
)

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Port $port felszabadítása (PID: $pids)…"
    kill -9 $pids 2>/dev/null || true
  fi
}

stop_port 3000
stop_port 3001

if git remote get-url origin >/dev/null 2>&1; then
  echo "→ Legfrissebb main letöltése…"
  git fetch origin main
  git checkout main 2>/dev/null || true
  git pull origin main
fi

missing=0
for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "✗ Hiányzik: $file"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "→ Hiányzó fájlok — legfrissebb kód letöltése…"
  git rebase --abort 2>/dev/null || true
  if git remote get-url origin >/dev/null 2>&1; then
    git fetch origin main
    git reset --hard origin/main
  else
    echo "HIBA: nincs git remote. Klónozd újra:"
    echo "  cd ~ && rm -rf bocsa-app"
    echo "  git clone https://github.com/bocsatech/bocsa-app"
    exit 1
  fi
  echo "→ npm install…"
  npm install --no-audit --no-fund
fi

rm -rf .next node_modules/.cache
echo "→ .next törölve"
echo "→ Dev szerver indul (webpack, port 3000)…"
echo "→ Böngésző: http://localhost:3000/login"
echo "→ Ha nem tölt be: npm run test:local"
exec npx next dev --webpack "$@"
