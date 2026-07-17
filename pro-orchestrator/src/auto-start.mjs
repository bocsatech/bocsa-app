import { loadConfig } from './config.mjs';
import { startSlot } from './slots.mjs';

export function slotReadyForAutoStart(slot) {
  if (slot.autoStart === false) return false;
  const urls = slot.watchUrls || [];
  return urls.some((u) => u.enabled !== false && String(u.url || '').trim());
}

export async function startAutoSlots() {
  const config = loadConfig();
  if (config.autoStartOnLaunch === false) {
    return { ok: true, started: [], skipped: [], reason: 'autoStartOnLaunch kikapcsolva' };
  }

  const started = [];
  const skipped = [];

  for (const slot of config.slots) {
    if (!slotReadyForAutoStart(slot)) {
      skipped.push({ id: slot.id, reason: 'nincs URL vagy autoStart=false' });
      continue;
    }
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const result = await startSlot(slot);
      started.push({ id: slot.id, label: slot.label, ...result });
    } catch (err) {
      started.push({ id: slot.id, label: slot.label, ok: false, error: err.message });
    }
  }

  return { ok: true, started, skipped };
}
