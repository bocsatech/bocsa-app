#!/bin/bash
set -euo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

DEST="${HOME}/Downloads/fugveny"
SRC_CB="${HOME}/bocsa-app/fugveny/catboost"
CB="${DEST}/catboost-src"

mkdir -p "$DEST/uj lista" "$CB"

if [ -d "$SRC_CB" ]; then
  rsync -a --delete "$SRC_CB/" "$CB/" --exclude .venv --exclude __pycache__
elif [ -d "$(dirname "$0")/../catboost" ]; then
  rsync -a --delete "$(cd "$(dirname "$0")/.." && pwd)/catboost/" "$CB/" --exclude .venv --exclude __pycache__
else
  echo "Nincs CatBoost forrás. git pull + fugveny/mac/telepites.command"
  read -r -p "Enter..."
  exit 1
fi

cd "$CB"
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

echo "CatBoost tanítás — fugveny"
echo "CSV: ~/Downloads/fugveny/uj lista/uj-lista.csv"
python train.py
echo ""
echo "Lista pontozása..."
python predict.py || true
echo ""
echo "Modell: ~/Downloads/fugveny/uj lista/catboost/"
read -r -p "Enter a bezáráshoz..."
