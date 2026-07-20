#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
PRO_DIR="${HOME}/Downloads/Willhaben Agent"
[ -f "$PRO_DIR/package.json" ] || PRO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CMD="cd $(printf '%q' "$PRO_DIR") && caffeinate -dims npm start"
osascript -e "tell application \"Terminal\" to do script \"$CMD\""
