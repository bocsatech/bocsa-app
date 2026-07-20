import { syncInbox } from './inbox-sync.mjs';

console.log('Willhaben inbox szinkron…\n');
try {
  const result = await syncInbox({
    onProgress: (msg) => console.log(`  ${msg}`),
  });
  console.log(`\nKész: ${result.count} beszélgetés\n`);
} catch (err) {
  console.error(`Hiba: ${err.message}\n`);
  process.exit(1);
}
