#!/bin/bash
# Willhaben Agent — Mac telepítés v3 (tar.gz, unzip nélkül)
# Futtatás:
#   curl -fL -o /tmp/wh-agent-install.command "https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command"
#   bash /tmp/wh-agent-install.command
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben-agent"
TMP="$(mktemp -d /tmp/willhaben-agent.XXXXXX)"
TAR="${TMP}/package.tar.gz"
ARCHIVE="https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.tar.gz"

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
  exit 1
}

trap 'rm -rf "$TMP"' EXIT

echo ""
echo "══════════════════════════════════════════"
echo "  WILLHABEN AGENT — telepítő v3"
echo "══════════════════════════════════════════"
echo ""

# 1. KÖNYVTÁR
echo "【1/4】 Könyvtár…"
mkdir -p "$TARGET/data"
echo "  ✓ ${TARGET}"

command -v node >/dev/null 2>&1 || fail "Node.js kell: https://nodejs.org/"

# 2. LETÖLTÉS (tar.gz — beépített macOS tar)
echo ""
echo "【2/4】 Letöltés (tar.gz)…"
if ! curl -fL "$ARCHIVE" -o "$TAR"; then
  fail "Letöltés sikertelen — ellenőrizd az internetet."
fi
[ -s "$TAR" ] || fail "Üres letöltött fájl."

echo "  → kicsomagolás (tar)…"
if ! tar -xzf "$TAR" -C "$TMP" 2>/dev/null; then
  fail "tar hiba. Futtasd kézzel: cd /tmp && curl -fL -o wa.tar.gz $ARCHIVE && tar -xzf wa.tar.gz"
fi

SOURCE="${TMP}/bocsa-app-main/willhaben-agent"
[ -f "${SOURCE}/package.json" ] || fail "Hiányzó willhaben-agent a csomagban."

echo "  → másolás…"
if command -v ditto >/dev/null 2>&1; then
  ditto "$SOURCE" "$TARGET"
elif command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude node_modules --exclude .git --exclude data "$SOURCE/" "$TARGET/"
else
  cp -R "$SOURCE/." "$TARGET/"
fi
[ -f "$TARGET/package.json" ] || fail "Másolás sikertelen."
echo "  ✓ Fájlok OK"

# 3. NPM
echo ""
echo "【3/4】 npm install…"
( cd "$TARGET" && npm install --no-audit --no-fund ) || fail "npm install sikertelen."
( cd "$TARGET" && npx playwright install chromium ) 2>/dev/null || true
echo "  ✓ npm OK"

# 4. ASZTAL
echo ""
echo "【4/4】 Asztali indító…"
DESKTOP="$(get_desktop)"
LAUNCHER="${DESKTOP}/Willhaben Agent Inditas.command"

cat > "$LAUNCHER" <<LAUNCH
#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
cd "${TARGET}" || exit 1
echo "Willhaben Agent — http://127.0.0.1:3860"
exec caffeinate -dims npm start
LAUNCH

chmod +x "$LAUNCHER"
xattr -cr "$LAUNCHER" 2>/dev/null || true

if [ -d "$TARGET/Willhaben Agent.app" ]; then
  chmod +x "$TARGET/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true
  rm -rf "${DESKTOP}/Willhaben Agent.app"
  ditto "$TARGET/Willhaben Agent.app" "${DESKTOP}/Willhaben Agent.app" 2>/dev/null || \
    cp -a "$TARGET/Willhaben Agent.app" "$DESKTOP/"
  xattr -cr "${DESKTOP}/Willhaben Agent.app" 2>/dev/null || true
fi

echo "  ✓ ${LAUNCHER}"
echo ""
echo "══════════════════════════════════════════"
echo "  ✅ KÉSZ"
echo "══════════════════════════════════════════"
echo ""
echo "  cd ${TARGET}"
echo "  npm run login"
echo "  npm start"
echo ""
