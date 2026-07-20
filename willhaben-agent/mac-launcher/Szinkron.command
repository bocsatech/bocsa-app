#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"
wh_cd
npm run stop 2>/dev/null || true
exec npm run sync:debug
