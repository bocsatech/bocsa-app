import { syncInbox } from './inbox-sync.mjs';
import { loadStore } from './store.mjs';

console.log('Szinkron debug…\n');
try {
  const result = await syncInbox({
    onProgress: (msg) => console.log(' ', msg),
  });
  const store = loadStore();
  console.log('\nKész:', result);
  console.log('Beszélgetések:', store.conversations.length);
  if (store.lastSyncDebug) console.log('Debug:', store.lastSyncDebug);
  console.log('');
} catch (e) {
  const store = loadStore();
  console.error('\nHiba:', e.message);
  if (store.lastSyncError) console.error('Utolsó hiba:', store.lastSyncError);
  process.exit(1);
}
