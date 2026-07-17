#!/bin/bash
# Kalibrálási hurok javítás — két autó referencia váltakozás
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$HOME/Downloads/bocsa-app" 2>/dev/null || cd "$HOME/Desktop/bocsa-app" 2>/dev/null || exit 1

exec bash pro-orchestrator/MAC-JAVIT-EGYEDUL.sh
