import { loadConfig, saveConfig } from './config.mjs';

const password = process.argv[2]?.trim();

if (!password || password.length < 4) {
  console.error('\n  Használat: npm run set-password -- a-jelszavad\n');
  console.error('  Minimum 4 karakter.\n');
  process.exit(1);
}

const config = loadConfig();
config.adminPanel = { ...(config.adminPanel || {}), password };
saveConfig(config);

console.log('\n  ✓ Limitek jelszava beállítva.');
console.log(`  Bejelentkezési jelszó: ${password}`);
console.log('  Indítsd újra: npm start');
console.log('  Admin: http://127.0.0.1:3848 → 🔒 Bejelentkezés\n');
