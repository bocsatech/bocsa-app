#!/bin/bash
# Willhaben Agent — Mac telepítés v4
# Nincs zip, tar, git — csak fájlonkénti letöltés.
#
# Futtatás:
#   curl -fL -o /tmp/wh-install.command "https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command"
#   bash /tmp/wh-install.command
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben-agent"
RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent"

url_for() {
  echo "${RAW}/$(echo "$1" | sed 's/ /%20/g')"
}

get_desktop() {
  local d=""
  d="$(/usr/bin/osascript -e 'tell application "Finder" to get POSIX path of (desktop as alias)' 2>/dev/null || true)"
  d="${d%/}"
  for d in "$d" "${HOME}/Desktop" "${HOME}/Asztal"; do
    [ -n "$d" ] && [ -d "$d" ] && echo "$d" && return 0
  done
  mkdir -p "${HOME}/Desktop"
  echo "${HOME}/Desktop"
}

fail() { echo ""; echo "❌ $1"; exit 1; }

echo ""
echo "══════════════════════════════════════════"
echo "  WILLHABEN AGENT — telepítő v4"
echo "  (fájlonkénti letöltés — nincs csomagolás)"
echo "══════════════════════════════════════════"
echo ""

echo "【1/4】 Könyvtár: ${TARGET}"
mkdir -p "$TARGET/data"
command -v node >/dev/null 2>&1 || fail "Node.js kell: https://nodejs.org/"
command -v curl >/dev/null 2>&1 || fail "curl hiányzik."

FILES=(
  package.json
  package-lock.json
  config.default.json
  .gitignore
  README.md
  public/index.html
  public/app.css
  public/app.js
  src/version.mjs
  src/config.mjs
  src/browser.mjs
  src/consent.mjs
  src/store.mjs
  src/price-chart.mjs
  src/inbox-sync.mjs
  src/server.mjs
  src/index.mjs
  src/login.mjs
  src/stop.mjs
  src/instance-lock.mjs
  src/sync-cli.mjs
  scripts/test-price-chart.mjs
  mac-launcher/Inditas.command
  mac-launcher/run.sh
  "mac/telepites.command"
  "Willhaben Agent.app/Contents/Info.plist"
  "Willhaben Agent.app/Contents/MacOS/run"
)

echo ""
echo "【2/4】 Letöltés (${#FILES[@]} fájl)…"
n=0
for rel in "${FILES[@]}"; do
  n=$((n + 1))
  dest="${TARGET}/${rel}"
  mkdir -p "$(dirname "$dest")"
  url="$(url_for "$rel")"
  printf "  [%2d/%2d] %s\r" "$n" "${#FILES[@]}" "$rel"
  if ! curl -fsSL "$url" -o "$dest"; then
    echo ""
    fail "Letöltés sikertelen: $rel"
  fi
done
echo ""
echo "  ✓ Minden fájl letöltve"

chmod +x "${TARGET}/mac-launcher/Inditas.command" 2>/dev/null || true
chmod +x "${TARGET}/mac-launcher/run.sh" 2>/dev/null || true
chmod +x "${TARGET}/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true
chmod +x "${TARGET}/mac/telepites.command" 2>/dev/null || true

if [ ! -f "${TARGET}/config.json" ] && [ -f "${TARGET}/config.default.json" ]; then
  cp "${TARGET}/config.default.json" "${TARGET}/config.json"
fi

echo ""
echo "【3/4】 npm install…"
( cd "$TARGET" && npm install --no-audit --no-fund ) || fail "npm install sikertelen."
( cd "$TARGET" && npx playwright install chromium ) 2>/dev/null || true
echo "  ✓ npm OK"

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

if [ -d "${TARGET}/Willhaben Agent.app" ]; then
  rm -rf "${DESKTOP}/Willhaben Agent.app"
  cp -a "${TARGET}/Willhaben Agent.app" "$DESKTOP/"
  xattr -cr "${DESKTOP}/Willhaben Agent.app" 2>/dev/null || true
fi

echo "  ✓ ${LAUNCHER}"
echo ""
echo "══════════════════════════════════════════"
echo "  ✅ KÉSZ — Willhaben Agent telepítve"
echo "══════════════════════════════════════════"
echo ""
echo "  cd ${TARGET}"
echo "  npm run login"
echo "  npm start"
echo ""
echo "  Web: http://127.0.0.1:3860"
echo ""
