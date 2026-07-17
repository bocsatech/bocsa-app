#!/bin/bash
# BOCSA Pro — teljes javítás (régi kilövés + v0.8.3+ + indítás)
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-JAVIT-EGYEDUL.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

echo "→ MAC-ORCH-FRISSIT (leállítás + letöltés + újraindítás)"
curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-ORCH-FRISSIT.sh | bash
