#!/bin/bash
# Willhaben Agent — Mac telepítés
#   curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben-agent"
TMP="$(mktemp -d /tmp/willhaben-agent.XXXXXX)"
SOURCE=""

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
  rm -rf "$TMP"
  exit 1
}

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo ""
echo "══════════════════════════════════════════"
echo "  WILLHABEN AGENT — telepítés"
echo "══════════════════════════════════════════"
echo ""

# ── 1. KÖNYVTÁR ─────────────────────────────
echo "【1/4】 Könyvtár létrehozása…"
mkdir -p "$TARGET/data"
echo "  ✓ ${TARGET}"
echo ""

command -v node >/dev/null 2>&1 || fail "Node.js kell: https://nodejs.org/"

# ── 2. LETÖLTÉS ─────────────────────────────
echo "【2/4】 Letöltés…"

download_with_git() {
  command -v git >/dev/null 2>&1 || return 1
  echo "  → git clone (gyors, csak a szükséges fájlok)…"
  git clone --depth 1 --single-branch --branch main \
    "https://github.com/bocsatech/bocsa-app.git" "${TMP}/repo" 2>&1 || return 1
  SOURCE="${TMP}/repo/willhaben-agent"
  [ -f "${SOURCE}/package.json" ]
}

download_with_zip() {
  command -v unzip >/dev/null 2>&1 || return 1
  local zip="${TMP}/package.zip"
  echo "  → zip letöltés…"
  curl -fL "https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip" -o "$zip" || return 1
  [ -s "$zip" ] || return 1
  echo "  → kicsomagolás ($(du -h "$zip" | cut -f1))…"
  unzip -qo "$zip" -d "$TMP" 2>&1 || return 1
  SOURCE="${TMP}/bocsa-app-main/willhaben-agent"
  [ -f "${SOURCE}/package.json" ]
}

if download_with_git; then
  echo "  ✓ Letöltve (git)"
elif download_with_zip; then
  echo "  ✓ Letöltve (zip)"
else
  fail "Letöltés sikertelen. Telepítsd a git-et: xcode-select --install — vagy ellenőrizd az internetet."
fi

echo "  → fájlok másolása…"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude node_modules --exclude .git --exclude data "$SOURCE/" "$TARGET/"
else
  find "$TARGET" -mindepth 1 -maxdepth 1 ! -name data ! -name . -exec rm -rf {} + 2>/dev/null || true
  cp -a "$SOURCE/." "$TARGET/"
fi

[ -f "$TARGET/package.json" ] || fail "Másolás sikertelen."
echo ""

# ── 3. TELEPÍTÉS ─────────────────────────────
echo "【3/4】 npm install…"
( cd "$TARGET" && npm install --no-audit --no-fund ) || fail "npm install sikertelen."
echo "  → Playwright Chromium…"
( cd "$TARGET" && npx playwright install chromium ) 2>/dev/null || true
echo "  ✓ Telepítés kész"
echo ""

# ── 4. ASZTALI IKON ──────────────────────────
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
  echo "  ✓ Willhaben Agent.app"
fi

echo "  ✓ Willhaben Agent Inditas.command"
echo ""
echo "══════════════════════════════════════════"
echo "  ✅ MINDEN KÉSZ"
echo "══════════════════════════════════════════"
echo ""
echo "  cd ${TARGET}"
echo "  npm run login"
echo "  npm start"
echo ""
echo "  Web: http://127.0.0.1:3860"
echo ""
