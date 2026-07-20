#!/bin/bash
# Willhaben Agent — teljes eltávolítás a Macről (CSAK ez a program!)
# curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/uninstall-willhaben-agent-mac.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

echo ""
echo "Willhaben Agent eltávolítása…"
echo ""

# futó példány leállítása
for port in 3860; do
  lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done
pkill -f "willhaben-agent" 2>/dev/null || true
pkill -f "node src/index.mjs" 2>/dev/null || true

# mappák
for dir in \
  "${HOME}/Downloads/willhaben-agent" \
  "${HOME}/Downloads/willhaben agent" \
  "${HOME}/Downloads/.willhaben-agent-install" \
  /tmp/willhaben-agent.* \
  /tmp/wh-install.command \
  /tmp/wh-agent-install.command
do
  if [ -e "$dir" ] 2>/dev/null; then
    rm -rf $dir 2>/dev/null || true
    echo "  ✗ $dir"
  fi
done

# asztali ikonok
for d in "${HOME}/Desktop" "${HOME}/Asztal"; do
  [ -d "$d" ] || continue
  rm -rf "${d}/Willhaben Agent.app" 2>/dev/null && echo "  ✗ ${d}/Willhaben Agent.app"
  rm -f "${d}/Willhaben Agent Inditas.command" 2>/dev/null && echo "  ✗ ${d}/Willhaben Agent Inditas.command"
done

# bocsa-app-ból csak a willhaben-agent almappa (ha van)
if [ -d "${HOME}/Downloads/bocsa-app/willhaben-agent" ]; then
  rm -rf "${HOME}/Downloads/bocsa-app/willhaben-agent"
  echo "  ✗ ~/Downloads/bocsa-app/willhaben-agent"
fi

echo ""
echo "✅ Willhaben Agent törölve a gépről."
echo "   (Más programok érintetlenek.)"
echo ""
