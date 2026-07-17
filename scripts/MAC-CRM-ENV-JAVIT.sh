#!/bin/bash
# BOCSA CRM — .env.local javítás (Supabase kulcsok)
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-CRM-ENV-JAVIT.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main"
DL="${HOME}/Downloads"
CRM="$DL/bocsa-crm"

# fallback: régi bocsa-app
[ -d "$CRM/app" ] || CRM="$DL/bocsa-app"

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done

echo ""
echo "🔧 BOCSA CRM — .env.local"
echo "   Mappa: $CRM"
echo ""

[ -d "$CRM" ] || { echo "❌ Nincs bocsa-crm mappa. Futtasd előbb MAC-TELEPIT-MINDEN.sh"; exit 1; }

# Keresés régi .env.local-ban
for src in "$CRM/.env.local" "$DL/bocsa-app/.env.local" "$HOME/Desktop/bocsa-app/.env.local"; do
  if [ -f "$src" ] && grep -q 'NEXT_PUBLIC_SUPABASE_URL=' "$src" 2>/dev/null; then
    if [ "$src" != "$CRM/.env.local" ]; then
      cp "$src" "$CRM/.env.local"
      echo "  ✓ Másolva: $src"
    else
      echo "  ✓ .env.local már OK"
    fi
    break
  fi
done

if [ ! -f "$CRM/.env.local" ] || ! grep -q 'NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$CRM/.env.local" 2>/dev/null; then
  if [ -n "$NODE" ] && [ -f "$CRM/scripts/setup-env-local.mjs" ]; then
    echo "  → npm run setup:env"
    (cd "$CRM" && "$NODE" scripts/setup-env-local.mjs)
  elif curl -sf "$RAW/.env.local.example" -o "$CRM/.env.local"; then
    echo "  ✓ Letöltve: .env.local.example"
  else
    cat > "$CRM/.env.local" <<'ENV'
NEXT_PUBLIC_SUPABASE_URL=https://duvzbcxsfzeqjnvohifm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dnpiY3hzZnplcWpudm9oaWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzU1NzEsImV4cCI6MjA5MzE1MTU3MX0.RiQIwGyKJKqo0ud4yzTTU9_-jKkLU5jw2w3WxEe-0sg
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=local-dev-bocsa-session-secret-2026
ENV
    echo "  ✓ .env.local létrehozva"
  fi
fi

echo ""
echo "✅ Kész!"
echo ""
echo "   1. Állítsd le a CRM-et (Ctrl+C a terminálban)"
echo "   2. Indítsd újra:"
echo "      cd \"$CRM\" && npm run dev"
echo "   3. Böngésző: http://localhost:3000/login"
echo "      admin / demo123  —  Geheimzahl: 10"
echo ""
