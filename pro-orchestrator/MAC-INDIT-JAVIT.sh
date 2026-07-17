#!/usr/bin/env bash
# BOCSA — asztali ikonok + indítók javítása (Desktop npm hiba)
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-INDIT-JAVIT.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main"
WH="${HOME}/Downloads/willhaben pro"
HA="${HOME}/Downloads/hasznaltauto pro"

echo "→ Indító scriptek frissítése..."

mkdir -p "$WH/mac-launcher" "$HA/mac-launcher"
curl -sf "$RAW/pro-orchestrator/vendor/willhaben-pro/mac-launcher/Inditas.command" -o "$WH/mac-launcher/Inditas.command"
curl -sf "$RAW/hasznaltauto-pro/mac-launcher/Inditas.command" -o "$HA/mac-launcher/Inditas.command"
chmod +x "$WH/mac-launcher/Inditas.command" "$HA/mac-launcher/Inditas.command"

if [ -d "$WH/Willhaben Pro.app/Contents/MacOS" ]; then
  curl -sf "$RAW/pro-orchestrator/vendor/willhaben-pro/Willhaben%20Pro.app/Contents/MacOS/run" \
    -o "$WH/Willhaben Pro.app/Contents/MacOS/run" 2>/dev/null || \
  curl -sf "$RAW/pro-orchestrator/vendor/willhaben-pro/mac-launcher/run.sh" -o "$WH/Willhaben Pro.app/Contents/MacOS/run"
  chmod +x "$WH/Willhaben Pro.app/Contents/MacOS/run"
fi

echo "→ Asztali ikonok..."
curl -sf "$RAW/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh" | bash

echo ""
echo "→ Orchestrator frissítés + indítás..."
curl -sf "$RAW/pro-orchestrator/MAC-ORCH-FRISSIT.sh" | bash
