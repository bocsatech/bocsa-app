import { syncInbox } from './inbox-sync.mjs';

console.log('Szinkron…\n');
try {
  const r = await syncInbox({ onProgress: (m) => console.log(' ', m) });
  console.log(`\nKész: ${r.count} beszélgetés\n`);
} catch (e) {
  console.error('Hiba:', e.message);
  process.exit(1);
}
