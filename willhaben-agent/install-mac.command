#!/bin/bash
# Willhaben Agent — Mac telepítés (4 lépés: mappa → letöltés → telepítés → asztali ikon)
# Terminálban:
#   curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben-agent"
TMP="${HOME}/Downloads/.willhaben-agent-install"
ZIP="${TMP}/package.zip"
ARCHIVE="https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip"

get_desktop() {
  local d=""
  d="$(/usr/bin/osascript -e 'tell application "Finder" to get POSIX path of (desktop as alias)' 2>/dev/null || true)"
  d="${d%/}"
  if [ -n "$d" ] && [ -d "$d" ]; then echo "$d"; return 0; fi
  for d in "${HOME}/Desktop" "${HOME}/Asztal"; do
    [ -d "$d" ] && echo "$d" && return 0
  done
  mkdir -p "${HOME}/Desktop"
  echo "${HOME}/Desktop"
}

fail() {
  echo ""
  echo "❌ HIBA: $1"
  echo ""
  exit 1
}

echo ""
echo "══════════════════════════════════════════"
echo "  WILLHABEN AGENT — telepítés"
echo "  (önálló program, semmi más nem kell hozzá)"
echo "══════════════════════════════════════════"
echo ""

# ── 1. KÖNYVTÁR ─────────────────────────────
echo "【1/4】 Könyvtár létrehozása…"
mkdir -p "$TARGET"
mkdir -p "${TARGET}/data"
echo "  ✓ ${TARGET}"
echo ""

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js nincs telepítve. Telepítsd: https://nodejs.org/ majd futtasd újra ezt a parancsot."
fi
if ! command -v unzip >/dev/null 2>&1; then
  fail "unzip nincs telepítve. Telepítsd: xcode-select --install"
fi

# ── 2. LETÖLTÉS ─────────────────────────────
echo "【2/4】 Letöltés GitHub-ról…"
rm -rf "$TMP"
mkdir -p "$TMP"

if ! curl -fL "$ARCHIVE" -o "$ZIP"; then
  fail "Letöltés sikertelen. Ellenőrizd az internetkapcsolatot."
fi

if [ ! -s "$ZIP" ]; then
  fail "Üres letöltött fájl."
fi

echo "  → kicsomagolás…"
unzip -qo "$ZIP" -d "$TMP" || fail "Kicsomagolás sikertelen."

SOURCE="${TMP}/bocsa-app-main/willhaben-agent"
if [ ! -f "$SOURCE/package.json" ]; then
  fail "A csomagban nincs willhaben-agent. Próbáld újra később."
fi

echo "  → fájlok másolása…"
# data/ megmarad, csak programfájlok
RSYNC_EX=(--exclude node_modules --exclude .git --exclude data)
if command -v rsync >/dev/null 2>&1; then
  rsync -a "${RSYNC_EX[@]}" "$SOURCE/" "$TARGET/"
else
  find "$TARGET" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} + 2>/dev/null || true
  cp -a "$SOURCE/." "$TARGET/"
fi

if [ ! -f "$TARGET/package.json" ]; then
  fail "Másolás sikertelen — nincs package.json a cél mappában."
fi
echo "  ✓ Letöltés kész"
echo ""

# ── 3. TELEPÍTÉS (npm) ──────────────────────
echo "【3/4】 Telepítés (npm + Playwright)…"
( cd "$TARGET" && npm install --no-audit --no-fund ) || fail "npm install sikertelen."
( cd "$TARGET" && npx playwright install chromium ) || echo "  ⚠ Playwright figyelmeztetés (folytatás…)"
echo "  ✓ Telepítés kész"
echo ""

# ── 4. ASZTALI INDÍTÓIKON ───────────────────
echo "【4/4】 Asztali indítóikon…"
DESKTOP="$(get_desktop)"
LAUNCHER="${DESKTOP}/Willhaben Agent Inditas.command"

cat > "$LAUNCHER" <<LAUNCH
#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
cd "${TARGET}" || { osascript -e 'display alert "Willhaben Agent" message "Hiányzik: ${TARGET}"'; exit 1; }
echo "Willhaben Agent — http://127.0.0.1:3860"
exec caffeinate -dims npm start
LAUNCH

chmod +x "$LAUNCHER"
xattr -cr "$LAUNCHER" 2>/dev/null || true

if [ -d "$TARGET/Willhaben Agent.app" ]; then
  chmod +x "$TARGET/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true
  rm -rf "${DESKTOP}/Willhaben Agent.app"
  cp -a "$TARGET/Willhaben Agent.app" "$DESKTOP/"
  xattr -cr "${DESKTOP}/Willhaben Agent.app" 2>/dev/null || true
  echo "  ✓ ${DESKTOP}/Willhaben Agent.app"
fi

echo "  ✓ ${LAUNCHER}"
echo ""

rm -rf "$TMP"

echo "══════════════════════════════════════════"
echo "  ✅ MINDEN KÉSZ"
echo "══════════════════════════════════════════"
echo ""
echo "  Mappa:  ${TARGET}"
echo "  Asztal: Willhaben Agent Inditas.command"
echo ""
echo "  Következő (terminálban, egyesével):"
echo ""
echo "    cd ${TARGET}"
echo "    npm run login"
echo "    npm start"
echo ""
echo "  Vagy dupla kattintás: Willhaben Agent Inditas.command"
echo "  Web: http://127.0.0.1:3860"
echo ""
