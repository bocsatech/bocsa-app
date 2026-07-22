#!/bin/bash
# Közös útvonal — minden indító ezt használja
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

WH_TARGET="${HOME}/Downloads/Willhaben Agent"

wh_resolve_dir() {
  if [ -f "${WH_TARGET}/package.json" ]; then
    echo "${WH_TARGET}"
    return 0
  fi
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [ -f "${script_dir}/package.json" ]; then
    echo "${script_dir}"
    return 0
  fi
  return 1
}

wh_cd() {
  local dir
  dir="$(wh_resolve_dir)" || {
    echo ""
    echo "❌ Willhaben Agent nincs telepítve."
    echo "   Futtasd: curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash"
    echo ""
    read -r -p "Enter…" _
    exit 1
  }
  cd "$dir" || exit 1
}

# Indításkor húzd le a friss forrást a mainről (üzenet-javítások azonnal)
wh_auto_update() {
  local raw="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent"
  local files=(
    src/version.mjs
    src/store.mjs
    src/server.mjs
    src/inbox-sync.mjs
    src/messenger-api.mjs
    public/app.js
    public/index.html
    public/app.css
    package.json
  )
  local f
  echo "Frissítés ellenőrzése…"
  for f in "${files[@]}"; do
    curl -fsSL "${raw}/${f}" -o "${f}.tmp" 2>/dev/null || { rm -f "${f}.tmp"; continue; }
    if ! cmp -s "${f}.tmp" "$f" 2>/dev/null; then
      mv "${f}.tmp" "$f"
      echo "  ✓ ${f}"
    else
      rm -f "${f}.tmp"
    fi
  done
}
