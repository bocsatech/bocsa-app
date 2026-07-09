#!/bin/bash
# Willhaben Watcher — vágólapra másol + willhaben megnyitása
set -e
SCRIPT_URL="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-watcher/KOPIEREN-UND-EINFUEGEN.js"
WH_URL="https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse"

echo "Script letöltése..."
curl -fsSL "$SCRIPT_URL" -o /tmp/wh-watcher-paste.js

echo "Vágólapra másolva!"
cat /tmp/wh-watcher-paste.js | pbcopy

open -a "Google Chrome" "$WH_URL" 2>/dev/null || open "$WH_URL"

osascript <<'APPLESCRIPT'
display dialog "A script a VÁGÓLAPON van!

1. Chrome-ban: F12
2. Fül: Console (Konzol)
3. Cmd+V (beillesztés)
4. Enter

→ Zöld WH gomb jobb alul!" buttons {"OK"} default button "OK" with title "Willhaben Watcher"
APPLESCRIPT
