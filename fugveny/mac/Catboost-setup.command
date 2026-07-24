#!/bin/bash
# CatBoost Python környezet telepítése / javítása
set -euo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

DEST="${HOME}/Downloads/fugveny"
SRC_CB="${HOME}/bocsa-app/fugveny/catboost"
CB="${DEST}/catboost-src"

mkdir -p "$CB"
if [ -d "$SRC_CB" ]; then
  rsync -a --delete "$SRC_CB/" "$CB/" --exclude .venv --exclude __pycache__
fi

cd "$CB"
echo "CatBoost setup: $CB"
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -c "import numpy, pandas, sklearn, catboost; print('OK:', catboost.__version__)"
echo ""
echo "Kész. Most a weben: Tanítás (CatBoost)"
read -r -p "Enter..."
