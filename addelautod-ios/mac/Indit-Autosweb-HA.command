#!/bin/bash
# Alias: ugyanaz mint Autosweb-HA-indito.command (port 3457)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$DIR/Autosweb-HA-indito.command"
