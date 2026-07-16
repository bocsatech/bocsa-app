#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Node: $(node -v 2>/dev/null || echo '?')"
echo "npm:  $(npm -v 2>/dev/null || echo '?')"
echo "Registry: $(npm config get registry)"

rm -rf node_modules
rm -f package-lock.json
npm cache clean --force

npm install --registry=https://registry.npmjs.org/ --no-fund --no-audit
npx playwright install chromium

echo ""
echo "Kész. Futtatás: npm run chrome  (majd npm run mentesmarka)"
