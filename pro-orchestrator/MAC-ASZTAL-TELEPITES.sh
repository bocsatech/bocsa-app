#!/bin/bash
# BOCSA Pro — asztali ikonok (git nélkül)
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

BOCSA=""
for d in "$HOME/Downloads/bocsa-app" "$HOME/Desktop/bocsa-app"; do
  [ -d "$d/pro-orchestrator" ] && BOCSA="$d" && break
done

WH="${HOME}/Downloads/willhaben pro"
RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main"

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done

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

DESKTOP="$(get_desktop)"

echo ""
echo "🖥 BOCSA Pro — asztali ikonok → $DESKTOP"
echo ""

if [ -z "$BOCSA" ]; then
  echo "❌ Nincs bocsa-app (pro-orchestrator). Letöltés..."
  BOCSA="${HOME}/Downloads/bocsa-app"
  mkdir -p "$BOCSA/pro-orchestrator/src" "$BOCSA/launchers/mac"
  for f in \
    pro-orchestrator/src/server.mjs \
    pro-orchestrator/src/stop.mjs \
    pro-orchestrator/package.json \
    launchers/mac/icon.png
  do
    mkdir -p "$BOCSA/$(dirname "$f")"
    curl -sf "$RAW/$f" -o "$BOCSA/$f" 2>/dev/null || true
  done
  [ -d "$BOCSA/pro-orchestrator" ] || { echo "❌ bocsa-app letöltés sikertelen"; exit 1; }
fi

# Willhaben Pro ikonok
if [ ! -f "$WH/package.json" ]; then
  echo "📦 Willhaben Pro telepítés..."
  curl -sf "$RAW/pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh" | bash
fi

# BOCSA Pro Orchestrator — Asztali indító
ORCH_CMD="$DESKTOP/BOCSA Pro Inditas.command"
cat > "$ORCH_CMD" <<SCRIPT
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
BOCSA="$BOCSA"
NODE="$NODE"
cd "\$BOCSA/pro-orchestrator" || exit 1
"\$NODE" src/stop.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :\$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1
nohup "\$NODE" src/server.mjs >>"\$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 2
/usr/bin/open -a Safari "http://localhost:3850" 2>/dev/null || true
echo "BOCSA Pro: http://localhost:3850"
SCRIPT
chmod +x "$ORCH_CMD"
xattr -cr "$ORCH_CMD" 2>/dev/null || true
echo "  ✓ BOCSA Pro Inditas.command"

# Willhaben Pro ikonok
if [ -d "$WH/Willhaben Pro.app" ]; then
  rm -rf "$DESKTOP/Willhaben Pro.app"
  cp -a "$WH/Willhaben Pro.app" "$DESKTOP/"
  xattr -cr "$DESKTOP/Willhaben Pro.app" 2>/dev/null || true
  echo "  ✓ Willhaben Pro.app"
fi
if [ -f "$WH/mac-launcher/Inditas.command" ]; then
  cp "$WH/mac-launcher/Inditas.command" "$DESKTOP/Willhaben Pro Inditas.command"
  chmod +x "$DESKTOP/Willhaben Pro Inditas.command"
  xattr -cr "$DESKTOP/Willhaben Pro Inditas.command" 2>/dev/null || true
  echo "  ✓ Willhaben Pro Inditas.command"
fi

printf '%s\n' "$BOCSA" > "${HOME}/.bocsa-pro/repo-path"
printf '%s\n' "$BOCSA" > "${DESKTOP}/.bocsa-pro-repo"

echo ""
echo "✅ Kész — az Asztalon:"
echo "   • BOCSA Pro Inditas.command  → Safari + orchestrator (3850)"
echo "   • Willhaben Pro Inditas.command / Willhaben Pro.app"
echo ""
/usr/bin/osascript -e "tell application \"Finder\" to activate" 2>/dev/null || true
/usr/bin/osascript -e "tell application \"Finder\" to reveal POSIX file \"$ORCH_CMD\"" 2>/dev/null || true
echo ""
