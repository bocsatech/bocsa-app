#!/bin/bash
# Willhaben Pro → ~/Downloads/willhaben pro
# Ajánlott: curl -sf …/scripts/MAC-TELEPIT-MINDEN.sh | bash
exec bash "$(dirname "$0")/MAC-TELEPIT-MINDEN.sh" 2>/dev/null || \
  curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash
