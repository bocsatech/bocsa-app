#!/bin/bash
# BOCSA — asztali ikonok (külön Letöltések mappák)
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

DL="${HOME}/Downloads"
ORCH="$DL/bocsa-orchestrator"
CRM="$DL/bocsa-crm"
WH="$DL/willhaben pro"
HA="$DL/hasznaltauto pro"

# Régi elrendezés fallback
[ -d "$ORCH/src" ] || ORCH="$DL/bocsa-app/pro-orchestrator"
[ -f "$CRM/app/login/page.tsx" ] || CRM="$DL/bocsa-app"

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
echo "🖥 Asztali ikonok → $DESKTOP"
echo ""

if [ ! -f "$ORCH/src/server.mjs" ]; then
  echo "❌ Nincs bocsa-orchestrator. Futtasd előbb:"
  echo "   curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash"
  exit 1
fi

# BOCSA CRM
if [ -f "$CRM/package.json" ]; then
  CRM_CMD="$DESKTOP/BOCSA CRM Inditas.command"
  cat > "$CRM_CMD" <<SCRIPT
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
cd "$CRM" || exit 1
npm run dev
SCRIPT
  chmod +x "$CRM_CMD"
  xattr -cr "$CRM_CMD" 2>/dev/null || true
  echo "  ✓ BOCSA CRM Inditas.command → localhost:3000"
fi

# BOCSA Pro Orchestrator
ORCH_CMD="$DESKTOP/BOCSA Pro Inditas.command"
cat > "$ORCH_CMD" <<SCRIPT
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
NODE="$NODE"
cd "$ORCH" || exit 1
"\$NODE" src/stop.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :\$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1
nohup "\$NODE" src/server.mjs >>"\$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 3
VER=\$(curl -sf http://127.0.0.1:3850/api/status 2>/dev/null | grep -o '"version":"[^"]*"' | head -1 || echo "")
TS=\$(date +%s)
/usr/bin/open -a Safari "http://localhost:3850/?v=\$TS" 2>/dev/null || true
echo "BOCSA Pro: http://localhost:3850 \$VER"
echo "Safari: Cmd+Shift+R ha régi kinézet"
SCRIPT
chmod +x "$ORCH_CMD"
xattr -cr "$ORCH_CMD" 2>/dev/null || true
echo "  ✓ BOCSA Pro Inditas.command → localhost:3850"

# Willhaben Pro
if [ -f "$WH/package.json" ]; then
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
    echo "  ✓ Willhaben Pro Inditas.command → ~/Downloads/willhaben pro"
  fi
fi

# Hasznaltauto Pro
if [ -f "$HA/mac-launcher/Inditas.command" ]; then
  cp "$HA/mac-launcher/Inditas.command" "$DESKTOP/Hasznaltauto Pro Inditas.command"
  chmod +x "$DESKTOP/Hasznaltauto Pro Inditas.command"
  xattr -cr "$DESKTOP/Hasznaltauto Pro Inditas.command" 2>/dev/null || true
  echo "  ✓ Hasznaltauto Pro Inditas.command → ~/Downloads/hasznaltauto pro"
fi

printf '%s\n' "$ORCH" > "${HOME}/.bocsa-pro/orchestrator-path" 2>/dev/null || mkdir -p "${HOME}/.bocsa-pro" && printf '%s\n' "$ORCH" > "${HOME}/.bocsa-pro/orchestrator-path"
printf '%s\n' "$CRM" > "${HOME}/.bocsa-pro/crm-path" 2>/dev/null || true

echo ""
echo "✅ Kész"
echo "   Térkép: $DL/BOCSA-PROGRAMOK.txt"
echo ""
