#!/bin/bash
# Régi név — átirányít a Bymy telepítőre.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$DIR/Telepit-Downloads-bymy.command"
