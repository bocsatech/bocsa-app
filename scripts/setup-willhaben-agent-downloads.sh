#!/bin/bash
# Willhaben Agent → ~/Downloads/willhaben agent
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/willhaben-agent/mac/telepites.command"
