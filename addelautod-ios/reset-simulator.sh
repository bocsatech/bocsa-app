#!/bin/bash
# Régi útvonal — átirányítás a Bymy scriptere.
exec bash <(curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/cursor/bymy-brand-de62/bymy-ios/reset-simulator.sh) "$@"
