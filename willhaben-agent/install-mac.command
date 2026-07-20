#!/bin/bash
# Willhaben Agent — telepítő 1.0.3
# Letöltések/Willhaben Agent + asztali indító
#
# curl -fL -o /tmp/wh-install.command \
#   "https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command"
# bash /tmp/wh-install.command
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

INSTALLER_VERSION="1.0.3"
TARGET="${HOME}/Downloads/Willhaben Agent"
RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent"

url_for() { echo "${RAW}/$(echo "$1" | sed 's/ /%20/g')"; }

get_desktop() {
  local d
  d="$(/usr/bin/osascript -e 'tell application "Finder" to get POSIX path of (desktop as alias)' 2>/dev/null || true)"
  d="${d%/}"
  for d in "$d" "${HOME}/Desktop" "${HOME}/Asztal"; do
    [ -n "$d" ] && [ -d "$d" ] && echo "$d" && return 0
  done
  mkdir -p "${HOME}/Desktop" && echo "${HOME}/Desktop"
}

fail() { echo ""; echo "❌ $1"; exit 1; }

echo ""
echo "══════════════════════════════════════════"
echo "  Willhaben Agent — telepítő ${INSTALLER_VERSION}"
echo "  Cél: ${TARGET}"
echo "══════════════════════════════════════════"
echo ""

echo "【1/4】 Könyvtár létrehozása"
mkdir -p "${TARGET}/data"
echo "  ✓ ${TARGET}"

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
  src/messenger-api.mjs
  src/server.mjs
  src/index.mjs
  src/login.mjs
  src/stop.mjs
  src/instance-lock.mjs
  src/sync-cli.mjs
  scripts/test-all.mjs
  scripts/test-messenger-api.mjs
  mac-launcher/Inditas.command
  mac-launcher/run.sh
  "Willhaben Agent.app/Contents/Info.plist"
  "Willhaben Agent.app/Contents/MacOS/run"
)

echo ""
echo "【2/4】 Letöltés (${#FILES[@]} fájl)"
n=0
for rel in "${FILES[@]}"; do
  n=$((n + 1))
  dest="${TARGET}/${rel}"
  mkdir -p "$(dirname "$dest")"
  printf "  [%2d/%2d] %s\n" "$n" "${#FILES[@]}" "$rel"
  curl -fsSL "$(url_for "$rel")" -o "$dest" || fail "Letöltés sikertelen: $rel"
done

[ -f "${TARGET}/package.json" ] || fail "Hiányzó package.json"

if [ ! -f "${TARGET}/config.json" ]; then
  cp "${TARGET}/config.default.json" "${TARGET}/config.json"
fi

chmod +x "${TARGET}/mac-launcher/Inditas.command" 2>/dev/null || true
chmod +x "${TARGET}/mac-launcher/run.sh" 2>/dev/null || true
chmod +x "${TARGET}/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true

echo ""
echo "【3/4】 npm install"
( cd "${TARGET}" && node src/stop.mjs ) 2>/dev/null || true
( cd "${TARGET}" && npm install --no-audit --no-fund ) || fail "npm install sikertelen"
( cd "${TARGET}" && npx playwright install chromium ) 2>/dev/null || true
( cd "${TARGET}" && npm test ) || fail "Belső teszt sikertelen — telepítés megáll."

echo ""
echo "【4/4】 Asztali indítóikon"
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
  echo "  ✓ Willhaben Agent.app"
fi
echo "  ✓ ${LAUNCHER}"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ TELEPÍTÉS KÉSZ"
echo "══════════════════════════════════════════"
echo ""
echo "  cd \"${TARGET}\""
echo "  npm run login"
echo "  npm start"
echo ""
echo "  Ha a port foglalt: npm run stop"
echo "  Web: http://127.0.0.1:3860"
echo ""
