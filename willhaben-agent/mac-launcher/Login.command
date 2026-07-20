#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"
wh_cd
echo ""
echo "  Willhaben bejelentkezés — zárd be a böngészőt, ha kész."
echo ""
exec npm run login
