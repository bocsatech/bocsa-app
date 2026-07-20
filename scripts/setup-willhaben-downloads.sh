#!/bin/bash
# Willhaben Pro → ~/Downloads/willhaben pro (+ Willhaben Pro.app)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/willhaben-pro/mac/telepites.command"
