#!/bin/bash
# BOCSA — minden program külön mappa a Letöltésekben
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main"
DL="${HOME}/Downloads"

SOURCE=""
for d in "$DL/bocsa-app" "$HOME/Desktop/bocsa-app"; do
  [ -d "$d/app" ] && [ -d "$d/pro-orchestrator" ] && SOURCE="$d" && break
done

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done

DEST_CRM="$DL/bocsa-crm"
DEST_ORCH="$DL/bocsa-orchestrator"
DEST_WH="$DL/willhaben pro"
DEST_HA="$DL/hasznaltauto pro"
DEST_WHW="$DL/willhaben-watcher"
DEST_HAS="$DL/hasznaltauto-scraper"
DEST_HIR="$DL/hirdetes-local"
DEST_MEN="$DL/mentesmarka"

SKIP_DIRS="pro-orchestrator|hasznaltauto-pro|hasznaltauto-scraper|willhaben-watcher|hirdetes-local|mentesmarka|node_modules|.git|.next"

copy_tree() {
  local src="$1" dest="$2"
  echo "  → $dest"
  rm -rf "$dest"
  mkdir -p "$(dirname "$dest")"
  cp -a "$src" "$dest"
}

install_crm_from_source() {
  echo "📁 bocsa-crm"
  rm -rf "$DEST_CRM"
  mkdir -p "$DEST_CRM"
  shopt -s dotglob nullglob
  for item in "$SOURCE"/*; do
    base="$(basename "$item")"
    echo "$base" | grep -qE "^($SKIP_DIRS)$" && continue
    cp -a "$item" "$DEST_CRM/"
  done
  shopt -u dotglob nullglob
  [ -f "$SOURCE/.env.local" ] && cp "$SOURCE/.env.local" "$DEST_CRM/.env.local" 2>/dev/null || true
  echo "  ✓ $DEST_CRM"
}

download_repo_to_temp() {
  echo "📥 bocsa-app letöltés GitHub-ról..."
  local tmp="$DL/.bocsa-install-tmp"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  curl -sfL "https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip" -o "$tmp/repo.zip"
  unzip -q "$tmp/repo.zip" -d "$tmp"
  SOURCE="$tmp/bocsa-app-main"
}

install_program_from_github() {
  local rel="$1" dest="$2"
  echo "  → letöltés: $rel"
  rm -rf "$dest"
  mkdir -p "$dest"
  # fájllista — főbb fájlok; teljes fa a monorepóból jön forrás esetén
  curl -sfL "$RAW/$rel/package.json" -o "$dest/.pkgcheck" 2>/dev/null || true
  if [ ! -f "$dest/.pkgcheck" ]; then
    echo "  ✗ $rel (GitHub)"
    rm -rf "$dest"
    return 1
  fi
  rm -f "$dest/.pkgcheck"
  return 0
}

echo ""
echo "═══════════════════════════════════════════"
echo "  BOCSA — programok szétválasztása"
echo "  Letöltések: $DL"
echo "═══════════════════════════════════════════"
echo ""

if [ -z "$SOURCE" ]; then
  download_repo_to_temp
fi
echo "Forrás: $SOURCE"
echo ""

# 1. CRM
install_crm_from_source

# 2. Orchestrator
if [ -d "$SOURCE/pro-orchestrator" ]; then
  echo "📁 bocsa-orchestrator"
  copy_tree "$SOURCE/pro-orchestrator" "$DEST_ORCH"
  rm -rf "$DEST_ORCH/vendor" 2>/dev/null || true
  # meglévő data megőrzése
  if [ -d "$SOURCE/pro-orchestrator/data" ] && [ ! -d "$DEST_ORCH/data/instances" ]; then
    cp -a "$SOURCE/pro-orchestrator/data" "$DEST_ORCH/" 2>/dev/null || true
  fi
  echo "  ✓ $DEST_ORCH"
fi

# 3. Willhaben Pro
echo "📁 willhaben pro"
if [ -d "$DEST_WH" ] && [ -f "$DEST_WH/package.json" ]; then
  echo "  ✓ már van: $DEST_WH"
elif [ -d "$SOURCE/pro-orchestrator/vendor/willhaben-pro" ]; then
  copy_tree "$SOURCE/pro-orchestrator/vendor/willhaben-pro" "$DEST_WH"
elif [ -d "$SOURCE/willhaben-pro" ]; then
  copy_tree "$SOURCE/willhaben-pro" "$DEST_WH"
else
  mkdir -p "$DEST_WH"
  curl -sf "$RAW/pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh" | bash 2>/dev/null || true
fi

# 4. Hasznaltauto Pro
if [ -d "$SOURCE/hasznaltauto-pro" ]; then
  echo "📁 hasznaltauto pro"
  copy_tree "$SOURCE/hasznaltauto-pro" "$DEST_HA"
fi

# 5. Egyéb programok (ha vannak a forrásban)
for pair in \
  "willhaben-watcher:$DEST_WHW" \
  "hasznaltauto-scraper:$DEST_HAS" \
  "hirdetes-local:$DEST_HIR" \
  "mentesmarka:$DEST_MEN"
do
  rel="${pair%%:*}"
  dest="${pair##*:}"
  [ -d "$SOURCE/$rel" ] || continue
  echo "📁 $(basename "$dest")"
  copy_tree "$SOURCE/$rel" "$dest"
done

# Régi beágyazott mappák törlése a bocsa-app-ból (opcionális forrás marad)
if [ "$SOURCE" = "$DL/bocsa-app" ]; then
  echo ""
  echo "🧹 Régi almappák törlése a bocsa-app-ból..."
  for legacy in willhaben-pro hasznaltauto-pro pro-orchestrator; do
    [ -d "$SOURCE/$legacy" ] || continue
    rm -rf "$SOURCE/$legacy"
    echo "  ✗ $SOURCE/$legacy"
  done
  echo "  ℹ bocsa-app → csak CRM maradt (vagy törölheted, ha már bocsa-crm van)"
fi

# npm install + .env.local ellenőrzés
if [ -n "$NODE" ]; then
  ensure_crm_env_local 2>/dev/null || true
  echo ""
  echo "📥 npm install..."
  for dir in "$DEST_CRM" "$DEST_ORCH" "$DEST_WH" "$DEST_HA"; do
    [ -f "$dir/package.json" ] || continue
    echo "  $dir"
    (cd "$dir" && npm install --no-audit --no-fund 2>&1 | tail -2) || true
  done
fi

# Asztal + összefoglaló
MAP="$DL/BOCSA-PROGRAMOK.txt"
cat > "$MAP" <<MAP
BOCSA programok — ${DL}
Frissítve: $(date)

bocsa-crm (CRM web)          → $DEST_CRM
  Indítás: cd "$DEST_CRM" && npm run dev
  Böngésző: http://localhost:3000/login

bocsa-orchestrator (Pro 3850) → $DEST_ORCH
  Indítás: cd "$DEST_ORCH" && npm start
  Böngésző: http://localhost:3850

willhaben pro                 → $DEST_WH
hasznaltauto pro              → $DEST_HA
willhaben-watcher             → $DEST_WHW
hasznaltauto-scraper          → $DEST_HAS
hirdetes-local                → $DEST_HIR
mentesmarka                   → $DEST_MEN

Telepítő újrafuttatás:
  curl -sf $RAW/scripts/MAC-TELEPIT-MINDEN.sh | bash
MAP

echo ""
echo "✅ Kész! Térkép: $MAP"
echo ""
cat "$MAP"
echo ""

# Asztali ikonok
if curl -sf "$RAW/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh" -o /tmp/mac-asztal.sh 2>/dev/null; then
  bash /tmp/mac-asztal.sh 2>/dev/null || true
fi

rm -rf "$DL/.bocsa-install-tmp" 2>/dev/null || true
