/**
 * Import conversations from the Willhaben page helper / browser extension.
 * Replaces the fragile Playwright profile sync for reading inbox.
 */
import { upsertConversation, loadStore, saveStore, pruneMissingConversations } from './store.mjs';
import { parseConversationsPayload, parseMessagesPayload } from './messenger-api.mjs';

function asMessages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw) && raw.length && raw[0]?.text) {
    return raw.map((m, i) => ({
      id: m.id || `imp-${i}`,
      direction: m.direction === 'out' || m.outgoing || m.from_self || m.fromSelf ? 'out' : 'in',
      text: String(m.text || m.body || m.message_text || '').trim(),
      at: m.at || m.sent_at || m.createdAt || new Date().toISOString(),
    })).filter((m) => m.text);
  }
  return parseMessagesPayload(raw);
}

export function importConversationsPayload(body) {
  const store = loadStore();
  let list = [];

  if (Array.isArray(body?.conversations)) {
    list = body.conversations;
  } else if (body?.conversation_summaries || body?.data) {
    list = parseConversationsPayload(body);
  } else {
    list = parseConversationsPayload(body);
  }

  const normalized = [];
  for (const raw of list) {
    if (!raw) continue;
    let conv;
    if (raw.id && (raw.partnerName || raw.messages)) {
      conv = {
        id: String(raw.id),
        partnerName: raw.partnerName || 'Beszélgetés',
        adTitle: raw.adTitle || '',
        lastPreview: raw.lastPreview || '',
        lastMessageAt: raw.lastMessageAt || new Date().toISOString(),
        unread: Boolean(raw.unread),
        url: raw.url || null,
        messages: asMessages(raw.messages),
      };
    } else {
      const parsed = parseConversationsPayload({ conversations: [raw] })[0];
      if (!parsed) continue;
      conv = {
        ...parsed,
        messages: asMessages(raw.messages || raw.message_list || parsed.messages),
      };
    }
    if (!conv.messages?.length && conv.lastPreview) {
      conv.messages = [{
        id: 'preview-1',
        direction: 'in',
        text: conv.lastPreview,
        at: conv.lastMessageAt,
      }];
    }
    if (!conv.lastPreview && conv.messages?.length) {
      conv.lastPreview = conv.messages[conv.messages.length - 1].text.slice(0, 120);
    }
    upsertConversation(store, { ...conv, syncedAt: new Date().toISOString() });
    normalized.push(conv.id);
  }

  if (body?.replaceAll && normalized.length) {
    pruneMissingConversations(store, normalized);
  }

  store.lastSyncAt = new Date().toISOString();
  store.lastSyncError = null;
  store.lastSyncDebug = {
    source: body?.source || 'browser-helper',
    count: normalized.length,
  };
  saveStore(store);
  return { ok: true, count: normalized.length, ids: normalized };
}
