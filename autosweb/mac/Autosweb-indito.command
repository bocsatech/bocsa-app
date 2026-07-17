#!/bin/bash
# Indító — ha már telepítve van ~/Downloads/autosweb alatt
cd "$HOME/Downloads/autosweb" || {
  osascript -e 'display alert "Autosweb" message "Először telepítsd: bocsa-app/autosweb/mac/telepites.command"'
  exit 1
}
if [ ! -d node_modules ]; then
  npm install
fi
open "http://127.0.0.1:3456"
echo "Autosweb: http://127.0.0.1:3456"
echo "Bezáráshoz: Ctrl+C"
npm start
