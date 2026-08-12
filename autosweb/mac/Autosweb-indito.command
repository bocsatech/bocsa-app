#!/bin/bash
# Autosweb indító (Asztal) — induláskor GitHub feature ágról frissít, majd elindítja a szervert.
# Nincs szükség külön frissites.command / második terminálra.
#
# Kihagyás (ha offline / gyors újraindítás): AUTOSWEB_SKIP_UPDATE=1
set -euo pipefail

# Mobil / Wi‑Fi LAN: feature branch (0.0.0.0 bind). Mainre váltás: AUTOSWEB_BRANCH=main
AUTOSWEB_BRANCH="${AUTOSWEB_BRANCH:-cursor/addelautod-mobile-de62}"
GITHUB_TAR="https://github.com/bocsatech/bocsa-app/archive/refs/heads/${AUTOSWEB_BRANCH}.tar.gz"
DESKTOP_LAUNCHER="$HOME/Desktop/Autosweb-indito.command"

autosweb_target() {
  if [ -d "${HOME}/Downloads/autosweb" ]; then
    echo "${HOME}/Downloads/autosweb"
    return
  fi
  if [ -d "${HOME}/Letöltések/autosweb" ]; then
    echo "${HOME}/Letöltések/autosweb"
    return
  fi
  if [ -d "${HOME}/Letöltések" ]; then
    echo "${HOME}/Letöltések/autosweb"
    return
  fi
  echo "${HOME}/Downloads/autosweb"
}

TARGET="$(autosweb_target)"
INDEX="$TARGET/public/index.html"
HTML="$TARGET/public/hirdetesfeladas.html"
CSS="$TARGET/public/css/site-app.css"

echo "══════════════════════════════════════"
echo " Autosweb"
echo "══════════════════════════════════════"
echo "Cél: $TARGET"
echo ""

# --- Régi szerver leállítása ---
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Régi szerver leállítása (3456)…"
    # shellcheck disable=SC2086
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

# --- Frissítés GitHub-ról (main) ---
update_from_github() {
  if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
    echo "⚠ curl/tar hiányzik — frissítés kihagyva"
    return 1
  fi

  local tmp src backup
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/autosweb-update.XXXXXX")"

  echo "Frissítés GitHub ${AUTOSWEB_BRANCH}-ről…"
  if ! curl -fsSL --connect-timeout 20 --max-time 180 "$GITHUB_TAR" \
    | tar -xz -C "$tmp"; then
    echo "⚠ Letöltés sikertelen — a meglévő helyi fájlokkal indulok."
    rm -rf "$tmp"
    return 1
  fi

  # GitHub archive mappa: bocsa-app-<branch-perjelek-helyett-->
  local folder
  folder="$(find "$tmp" -maxdepth 1 -type d -name 'bocsa-app-*' | head -1)"
  src="${folder}/autosweb"
  if [ ! -d "$src/public" ] || [ ! -f "$src/server.mjs" ]; then
    echo "⚠ Érvénytelen archívum — frissítés kihagyva"
    rm -rf "$tmp"
    return 1
  fi

  mkdir -p "$TARGET/public/images/categories" "$TARGET/data" "$TARGET/lib" "$TARGET/scripts"

  backup="$(mktemp -d "${TMPDIR:-/tmp}/autosweb-cats.XXXXXX")"
  cp -a "$TARGET/public/images/categories/." "$backup/" 2>/dev/null || true

  cp "$src/package.json" "$src/server.mjs" "$TARGET/"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$src/lib/" "$TARGET/lib/"
    rsync -a --delete --exclude 'images/categories/' "$src/public/" "$TARGET/public/"
    rsync -a "$src/scripts/" "$TARGET/scripts/" 2>/dev/null || true
  else
    rm -rf "$TARGET/lib"
    cp -R "$src/lib" "$TARGET/lib"
    find "$TARGET/public" -mindepth 1 -maxdepth 1 ! -name images -exec rm -rf {} + 2>/dev/null || true
    if [ -d "$TARGET/public/images" ]; then
      find "$TARGET/public/images" -mindepth 1 -maxdepth 1 ! -name categories -exec rm -rf {} + 2>/dev/null || true
    fi
    cp -R "$src/public/"* "$TARGET/public/" 2>/dev/null || true
    rm -rf "$TARGET/scripts"
    cp -R "$src/scripts" "$TARGET/scripts" 2>/dev/null || true
  fi

  mkdir -p "$TARGET/public/images/categories"
  cp -a "$backup/." "$TARGET/public/images/categories/" 2>/dev/null || true
  if [ -d "$src/public/images/categories" ]; then
    for f in "$src/public/images/categories/"*; do
      [ -f "$f" ] || continue
      base="$(basename "$f")"
      if [ ! -f "$TARGET/public/images/categories/$base" ]; then
        cp "$f" "$TARGET/public/images/categories/$base"
      fi
    done
  fi
  rm -rf "$backup"

  # Asztali indító önmagát is frissíti (még a tmp törlése előtt)
  if [ -f "$src/mac/Autosweb-indito.command" ]; then
    mkdir -p "$HOME/Desktop"
    cp "$src/mac/Autosweb-indito.command" "$DESKTOP_LAUNCHER"
    chmod +x "$DESKTOP_LAUNCHER"
    echo "  ✓ Asztali indító frissítve"
  fi

  rm -rf "$tmp"
  echo "  ✓ Fájlok frissítve"
  return 0
}

if [ "${AUTOSWEB_SKIP_UPDATE:-0}" = "1" ]; then
  echo "Frissítés kihagyva (AUTOSWEB_SKIP_UPDATE=1)"
else
  if ! update_from_github; then
    echo "⚠ Teljes archívum sikertelen — próbálok legalább server.mjs + db.mjs raw letöltést…"
    mkdir -p "$TARGET/lib"
    RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/${AUTOSWEB_BRANCH}/autosweb"
    if curl -fsSL --connect-timeout 15 --max-time 60 "$RAW/server.mjs" -o "$TARGET/server.mjs" \
      && curl -fsSL --connect-timeout 15 --max-time 60 "$RAW/lib/db.mjs" -o "$TARGET/lib/db.mjs"; then
      echo "  ✓ server.mjs + lib/db.mjs frissítve (raw)"
    else
      echo "  ✗ Raw frissítés is sikertelen"
    fi
  fi
fi

# --- Telepítés ellenőrzés ---
if [ ! -d "$TARGET" ] || [ ! -f "$TARGET/server.mjs" ]; then
  osascript -e 'display alert "Autosweb" message "Nincs telepítve ~/Downloads/autosweb.\n\nElőször futtasd: bocsa-app/autosweb/mac/telepites.command\nvagy ellenőrizd az internetet (az indító letölti a fájlokat)."' 2>/dev/null || \
    echo "Nincs telepítve: $TARGET — futtasd: telepites.command (vagy indítsd online újra)"
  exit 1
fi

cd "$TARGET"

if [ ! -f "$CSS" ]; then
  osascript -e 'display alert "Régi verzió!" message "Hiányzik site-app.css. Indítsd újra az Autosweb-indito.command-ot online."' 2>/dev/null || true
  exit 1
fi

if ! grep -q 'site-app' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi verzió!" message "Régi HTML. Indítsd újra online — az indító letölti a frissítést."' 2>/dev/null || true
  exit 1
fi

if [ ! -f "$INDEX" ]; then
  osascript -e 'display alert "Hiányzik a főoldal!" message "public/index.html nincs."' 2>/dev/null || true
  exit 1
fi

# Mobil: fotók + Hirdetéseim — e nélkül a feladott hirdetésnek nincs képe / üres a lista
if [ ! -f "$TARGET/lib/listing-photos.mjs" ]; then
  osascript -e 'display alert "Régi Autosweb!" message "Hiányzik a listing-photos.mjs (képmentés).\n\nIndítsd újra ONLINE az Autosweb-indito.command-ot.\nNe futtass régi frissites.command-ot main ágról."' 2>/dev/null || \
    echo "HIBA: lib/listing-photos.mjs hiányzik — régi szerver"
  exit 1
fi
if ! grep -q 'listings/mine' "$TARGET/server.mjs" 2>/dev/null; then
  osascript -e 'display alert "Régi Autosweb!" message "Nincs /api/listings/mine (Hirdetéseim).\n\nIndítsd újra ONLINE az indítót a feature ágról."' 2>/dev/null || \
    echo "HIBA: /api/listings/mine hiányzik — régi szerver"
  exit 1
fi
if ! grep -q 'setListingStatus' "$TARGET/server.mjs" 2>/dev/null; then
  osascript -e 'display alert "Régi Autosweb!" message "Nincs aktív/inaktív kapcsoló API.\n\nIndítsd újra ONLINE az Autosweb-indito.command-ot (feature ág)."' 2>/dev/null || \
    echo "HIBA: setListingStatus hiányzik — régi szerver"
  exit 1
fi

# --- npm + katalógus ---
if [ ! -d node_modules ]; then
  echo "npm install…"
  npm install
fi

if [ -f "$HOME/Desktop/lista.csv" ]; then
  echo "Járműkatalógus import (~/Desktop/lista.csv)…"
  npm run import:catalog -- "$HOME/Desktop/lista.csv" && echo "  ✓ katalógus OK" || echo "  ⚠ katalógus import sikertelen"
elif [ -f "$HOME/Desktop/lista3.csv" ]; then
  echo "Járműkatalógus import (~/Desktop/lista3.csv)…"
  npm run import:catalog -- "$HOME/Desktop/lista3.csv" && echo "  ✓ katalógus OK" || echo "  ⚠ katalógus import sikertelen"
elif [ -f "$HOME/Downloads/lista.csv" ]; then
  echo "Járműkatalógus import (~/Downloads/lista.csv)…"
  npm run import:catalog -- "$HOME/Downloads/lista.csv" && echo "  ✓ katalógus OK" || true
fi

if [ -f "$TARGET/scripts/embed-ad-form.mjs" ]; then
  node scripts/embed-ad-form.mjs 2>/dev/null || true
fi

INDEX_VER=$(grep 'autosweb-version' "$INDEX" | head -1 | sed 's/.*content="//;s/".*//' || true)
# Telefon / ugyanazon Wi‑Fi: 0.0.0.0 (csak belső hálózat, nem internet)
export AUTOSWEB_HOST="${AUTOSWEB_HOST:-0.0.0.0}"
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
echo ""
echo "Autosweb főoldal: ${INDEX_VER:-?}"
echo "Mac böngésző:  http://127.0.0.1:3456/"
if [ -n "$LAN_IP" ]; then
  echo "Telefon (Wi‑Fi): http://${LAN_IP}:3456/"
  echo "  → Bymy: fogaskerék → Keresés Wi‑Fi-n  VAGY  írd be: http://${LAN_IP}:3456"
  echo "  A telefonon a localhost NEM ez a gép. Ugyanaz a Wi‑Fi, iOS: Bymy → Helyi hálózat."
else
  echo "Telefon: System Settings → Network → Wi‑Fi → IP, majd http://IP:3456"
fi
echo "Ha a telefon nem találja: macOS Tűzfal engedje a node-ot; ne vendég Wi‑Fi."
echo "Bezáráshoz: Ctrl+C"
echo ""

open "http://127.0.0.1:3456/" 2>/dev/null || true
npm start
