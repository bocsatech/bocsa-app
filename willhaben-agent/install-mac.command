#!/bin/bash
# Willhaben Agent — egygombos telepítő 1.3.8
# BÁRHONNAN futtatható (nem kell cd):
#   curl -fsSL "https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command" | bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

INSTALLER_VERSION="1.3.8"
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

write_launcher() {
  local dest="$1"
  local body="$2"
  mkdir -p "$(dirname "$dest")"
  printf '%s\n' "$body" > "$dest"
  chmod +x "$dest"
  xattr -cr "$dest" 2>/dev/null || true
}

echo ""
echo "══════════════════════════════════════════"
echo "  Willhaben Agent — telepítő ${INSTALLER_VERSION}"
echo "  Cél: ${TARGET}"
echo "══════════════════════════════════════════"
echo ""

command -v node >/dev/null 2>&1 || fail "Node.js kell: https://nodejs.org/"
command -v curl >/dev/null 2>&1 || fail "curl hiányzik."

echo "【1/5】 Könyvtár"
mkdir -p "${TARGET}/data"
echo "  ✓ ${TARGET}"

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
  src/sync-debug.mjs
  scripts/test-all.mjs
  install-mac.command
  mac-launcher/common.sh
  mac-launcher/wh-agent
  mac-launcher/Inditas.command
  mac-launcher/Login.command
  mac-launcher/Szinkron.command
  mac-launcher/run.sh
  "Willhaben Agent.app/Contents/Info.plist"
  "Willhaben Agent.app/Contents/MacOS/run"
)

echo ""
echo "【2/5】 Letöltés (${#FILES[@]} fájl)"
n=0
for rel in "${FILES[@]}"; do
  n=$((n + 1))
  dest="${TARGET}/${rel}"
  mkdir -p "$(dirname "$dest")"
  printf "  [%2d/%2d] %s\n" "$n" "${#FILES[@]}" "$rel"
  curl -fsSL "$(url_for "$rel")" -o "$dest" || fail "Letöltés sikertelen: $rel"
done

[ -f "${TARGET}/package.json" ] || fail "Hiányzó package.json"
[ -f "${TARGET}/src/messenger-api.mjs" ] || fail "Hiányzó messenger-api.mjs"

if [ ! -f "${TARGET}/config.json" ]; then
  cp "${TARGET}/config.default.json" "${TARGET}/config.json"
fi

chmod +x "${TARGET}/install-mac.command" 2>/dev/null || true
chmod +x "${TARGET}/mac-launcher/"*.command "${TARGET}/mac-launcher/wh-agent" "${TARGET}/mac-launcher/run.sh" 2>/dev/null || true
chmod +x "${TARGET}/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true

echo ""
echo "【3/5】 npm install + teszt"
( cd "${TARGET}" && node src/stop.mjs ) 2>/dev/null || true
( cd "${TARGET}" && npm install --no-audit --no-fund ) || fail "npm install sikertelen"
( cd "${TARGET}" && npx playwright install chromium ) 2>/dev/null || true
( cd "${TARGET}" && npm test ) || fail "Belső teszt sikertelen"

echo ""
echo "【4/5】 Parancs bárhonnan (wh-agent)"
BIN_DIR="${HOME}/bin"
mkdir -p "$BIN_DIR"
ln -sf "${TARGET}/mac-launcher/wh-agent" "${BIN_DIR}/wh-agent"
chmod +x "${TARGET}/mac-launcher/wh-agent"

SHELL_RC=""
for f in "${HOME}/.zprofile" "${HOME}/.zshrc" "${HOME}/.bash_profile"; do
  [ -f "$f" ] && SHELL_RC="$f" && break
done
if [ -n "$SHELL_RC" ] && ! grep -q 'export PATH="$HOME/bin' "$SHELL_RC" 2>/dev/null; then
  printf '\n# Willhaben Agent\nexport PATH="$HOME/bin:$PATH"\n' >> "$SHELL_RC"
  echo "  ✓ PATH frissítve: $SHELL_RC"
fi
echo "  ✓ wh-agent → ${BIN_DIR}/wh-agent"

echo ""
echo "【5/5】 Asztali ikonok"
DESKTOP="$(get_desktop)"

write_launcher "${DESKTOP}/Willhaben Agent TELEPITES.command" "#!/bin/bash
set -euo pipefail
export PATH=\"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH\"
exec bash \"${TARGET}/install-mac.command\""

write_launcher "${DESKTOP}/Willhaben Agent LOGIN.command" "#!/bin/bash
set -uo pipefail
export PATH=\"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH\"
cd \"${TARGET}\" || { echo \"Hiányzik: ${TARGET}\"; read -r; exit 1; }
echo \"Willhaben Agent LOGIN\"
echo \"Playwright böngésző…\"
npx playwright install chromium 2>/dev/null || true
echo \"Böngésző indítása — nézd a Dockot, ha nem látod az ablakot.\"
node src/login.mjs
CODE=\$?
echo \"\"
[ \$CODE -eq 0 ] && echo \"✅ Kész — következő: SZINKRON\" || echo \"❌ Hiba (\$CODE)\"
read -r -p \"Enter…\" _
exit \$CODE"

write_launcher "${DESKTOP}/Willhaben Agent SZINKRON.command" "#!/bin/bash
set -euo pipefail
export PATH=\"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH\"
exec bash \"${TARGET}/mac-launcher/Szinkron.command\""

write_launcher "${DESKTOP}/Willhaben Agent INDITAS.command" "#!/bin/bash
set -euo pipefail
export PATH=\"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH\"
cd \"${TARGET}\" || exit 1
echo \"Willhaben Agent — http://127.0.0.1:3860\"
exec caffeinate -dims npm start"

if [ -d "${TARGET}/Willhaben Agent.app" ]; then
  rm -rf "${DESKTOP}/Willhaben Agent.app"
  cp -a "${TARGET}/Willhaben Agent.app" "$DESKTOP/"
  xattr -cr "${DESKTOP}/Willhaben Agent.app" 2>/dev/null || true
  echo "  ✓ Willhaben Agent.app"
fi

echo "  ✓ Willhaben Agent TELEPITES.command"
echo "  ✓ Willhaben Agent LOGIN.command"
echo "  ✓ Willhaben Agent SZINKRON.command"
echo "  ✓ Willhaben Agent INDITAS.command"

/usr/bin/open "${TARGET}" 2>/dev/null || true

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ KÉSZ — nem kell cd, nem kell npm a home-ból"
echo "══════════════════════════════════════════"
echo ""
echo "  Asztalon dupla katt:"
echo "    1. Willhaben Agent LOGIN"
echo "    2. Willhaben Agent SZINKRON"
echo "    3. Willhaben Agent INDITAS"
echo ""
echo "  Vagy Terminálból bárhonnan (új ablak után):"
echo "    wh-agent login"
echo "    wh-agent sync"
echo "    wh-agent start"
echo ""
echo "  Web: http://127.0.0.1:3860"
echo ""
