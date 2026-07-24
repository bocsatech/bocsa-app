#!/bin/bash
set -euo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Ha Downloads-ból fut:
if [ -f "$(dirname "$0")/../program/package.json" ]; then
  DEST="$(cd "$(dirname "$0")/.." && pwd)"
  CB="$DEST/catboost-src"
  mkdir -p "$CB"
  # forrás: bocsa-app ha van, különben a mellékelt
  if [ -d "$HOME/bocsa-app/fugveny/catboost" ]; then
    rsync -a --delete "$HOME/bocsa-app/fugveny/catboost/" "$CB/" --exclude .venv
  fi
else
  CB="$ROOT/catboost"
  DEST="${HOME}/Downloads/fugveny"
fi

# Telepítés után a Downloads struktúra
if [ -d "${HOME}/Downloads/fugveny" ]; then
  DEST="${HOME}/Downloads/fugveny"
  CB="$DEST/catboost-src"
  mkdir -p "$CB"
  SRC_CB="${HOME}/bocsa-app/fugveny/catboost"
  if [ -d "$SRC_CB" ]; then
    rsync -a --delete "$SRC_CB/" "$CB/" --exclude .venv
  fi
fi

cd "$CB"
python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt

echo "CatBoost tanítás — fugveny"
echo "CSV: ~/Downloads/fugveny/uj lista/uj-lista.csv (vagy részeredmény)"
python train.py
echo ""
echo "Pontozás..."
python predict.py || true
echo ""
read -r -p "Enter a bezáráshoz..."
