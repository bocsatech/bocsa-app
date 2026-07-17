#!/bin/bash
# Willhaben Pro → ~/Downloads/willhaben pro (bocsa-app-ból törlés)
# Ha nincs friss bocsa-app: bash pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/../pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh" ]; then
  exec bash "$SCRIPT_DIR/../pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh"
fi
exec bash "$SCRIPT_DIR/MAC-WILLHABEN-ATHELYEZ.sh" 2>/dev/null || {
  echo "Futtasd: curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh | bash"
  exit 1
}
