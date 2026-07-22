import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDataDir } from './config.mjs';

const STORE_FILE = () => path.join(getDataDir(), 'inbox.json');

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-greeting',
    name: 'Üdvözlés',
    text: 'Guten Tag! Vielen Dank für Ihre Nachricht. Ich interessiere mich für das Fahrzeug.',
  },
  {
    id: 'tpl-km',
    name: 'Km kérdés',
    text: 'Könnten Sie mir bitte den genauen Kilometerstand und den letzten Service mitteilen?',
  },
  {
    id: 'tpl-offer',
    name: 'Árajánlat sablon',
    text: 'Basierend auf meiner Einschätzung könnte ich {angebot_eur} € anbieten. Wäre das für Sie interessant?',
  },
];

function emptyStore() {
  return {
    lastSyncAt: null,
    lastSyncError: null,
    lastSyncDebug: null,
    conversations: [],
    dismissedConversationIds: [],
    templates: [...DEFAULT_TEMPLATES],
    priceChart: null,
  };
}

export function loadStore() {
  const file = STORE_FILE();
  if (!fs.existsSync(file)) return emptyStore();
  try {
    const s = { ...emptyStore(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    if (!s.templates?.length) s.templates = [...DEFAULT_TEMPLATES];
    s.conversations = purgeJunkConversations(s.conversations);
    // Persistált üres history + preview → töltsd fel, hogy a középső panel ne legyen üres
    let changed = false;
    s.conversations = s.conversations.map((c) => {
      const h = hydrateConversationMessages(c);
      if ((h.messages?.length || 0) > (c.messages?.length || 0)) changed = true;
      return h;
    });
    if (changed) {
      try { saveStore(s); } catch { /* ignore */ }
    }
    return s;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store) {
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.writeFileSync(STORE_FILE(), JSON.stringify(store, null, 2));
}

export function makeConversationId(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

export function getConversation(store, id) {
  const conv = store.conversations.find((c) => c.id === id) || null;
  return conv ? hydrateConversationMessages(conv) : null;
}

/** Ha a lista előnézete megvan, de a középső panel üres — töltsd fel. */
export function hydrateConversationMessages(conv) {
  if (!conv || typeof conv !== 'object') return conv;
  const messages = Array.isArray(conv.messages) ? conv.messages : [];
  if (messages.length) return { ...conv, messages: messages.map((m) => ({ ...m })) };

  const preview = String(conv.lastPreview || '').trim();
  if (
    preview.length >= 2
    && !/^(zuletzt online|willhaben-?code)/i.test(preview)
    && !/^\d{1,2}:\d{2}$/.test(preview)
    && !/^\d{1,2}\.\d{2}\.\d{2,4}$/.test(preview)
  ) {
    return {
      ...conv,
      messages: [{
        id: 'preview-1',
        direction: 'in',
        text: preview,
        at: conv.lastMessageAt || new Date().toISOString(),
      }],
    };
  }
  return { ...conv, messages: [] };
}

export function upsertConversation(store, conversation) {
  if (!conversation?.id) return store;
  if ((store.dismissedConversationIds || []).includes(conversation.id)) {
    return store;
  }
  if (/optimizely|audience|backwards.?compatibility/i.test(
    `${conversation.partnerName || ''} ${conversation.adTitle || ''} ${conversation.lastPreview || ''}`,
  )) {
    return store;
  }
  // Ne mentsünk üres szemetet
  if (
    (!conversation.messages || !conversation.messages.length)
    && !conversation.lastPreview
    && !conversation.adTitle
    && (!conversation.partnerName || conversation.partnerName === 'Ismeretlen' || conversation.partnerName === 'Beszélgetés')
  ) {
    return store;
  }

  const idx = store.conversations.findIndex((c) => c.id === conversation.id);
  const next = { ...conversation };
  if (Array.isArray(next.messages)) {
    next.messages = next.messages.map((m) => ({ ...m }));
  } else {
    delete next.messages;
  }

  if (idx >= 0) {
    const prev = store.conversations[idx];
    const merged = { ...prev, ...next };

    // Üres lastPreview / adTitle ne törölje a jót
    if (!String(next.lastPreview || '').trim() && prev.lastPreview) {
      merged.lastPreview = prev.lastPreview;
    }
    if (!String(next.adTitle || '').trim() && prev.adTitle) {
      merged.adTitle = prev.adTitle;
    }
    // Időpont ne legyen adTitle („09:44”)
    if (/^\d{1,2}:\d{2}$/.test(String(merged.adTitle || '').trim()) && prev.adTitle
      && !/^\d{1,2}:\d{2}$/.test(String(prev.adTitle || '').trim())) {
      merged.adTitle = prev.adTitle;
    }

    if (Array.isArray(next.messages)) {
      if (next.messages.length > 0) {
        merged.messages = next.messages;
      } else if (Array.isArray(prev.messages) && prev.messages.length > 0) {
        // Új sync üres history-t hozott — tartsd a régit, amíg van preview/hydratálás
        merged.messages = prev.messages.map((m) => ({ ...m }));
      } else {
        merged.messages = [];
      }
    }

    // Ha még mindig üres: lastPreview → egy üzenet
    const hydrated = hydrateConversationMessages(merged);
    store.conversations[idx] = hydrated;
  } else {
    store.conversations.unshift(hydrateConversationMessages({ ...next, messages: next.messages || [] }));
  }
  store.conversations = purgeJunkConversations(store.conversations);
  store.conversations.sort(
    (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
  );
  return store;
}

export function purgeJunkConversations(list) {
  const junkName = (s) => /zuletzt online|willhaben-?code|optimizely|audience|backwards.?compatibility|feature.?flag|^(heute|gestern)$/i.test(String(s || '').trim());

  const filtered = (list || []).filter((c) => {
    const blob = `${c.partnerName || ''} ${c.adTitle || ''} ${c.lastPreview || ''}`;
    if (/optimizely|audience|backwards.?compatibility|feature.?flag/i.test(blob)) return false;
    if (junkName(c.partnerName) || junkName(c.adTitle) || junkName(c.lastPreview)) return false;
    // Strip dump messages in-place
    if (Array.isArray(c.messages)) {
      c.messages = c.messages.filter((m) => {
        const text = String(m?.text || '');
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (/^(heute|gestern|today|yesterday)\b/i.test(text) && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) return false;
        if (/^(heute|gestern|today|yesterday)$/i.test(lines[0] || '') && lines.length > 1) return false;
        if (lines.length >= 4 && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) return false;
        return true;
      });
      // Clear messages that greet a different person (Angela chat showing "Hallo Ingrid")
      const first = String(c.partnerName || '').trim().split(/\s+/)[0];
      if (first && first.length >= 3 && c.messages.length) {
        const want = first.toLowerCase();
        const greets = [];
        for (const m of c.messages) {
          const re = /hallo\s+([A-Za-zÄÖÜäöüß]{2,40})/gi;
          let match;
          while ((match = re.exec(String(m.text || '')))) greets.push(match[1].toLowerCase());
        }
        if (
          greets.length
          && !greets.some((g) => g === want || want.startsWith(g) || g.startsWith(want))
        ) {
          c.messages = [];
        }
      }
    }
    if (
      (!c.messages || !c.messages.length)
      && !c.lastPreview
      && !c.adTitle
      && (!c.partnerName || c.partnerName === 'Ismeretlen')
    ) {
      return false;
    }
    return true;
  });

  // Deduplicate: keep richest entry per partner+ad (prefer one with real messages / uuid-looking id)
  const byKey = new Map();
  for (const c of filtered) {
    const key = `${String(c.partnerName || '').toLowerCase()}|${String(c.adTitle || '').toLowerCase().slice(0, 40)}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, c);
      continue;
    }
    const score = (x) => (x.messages?.length || 0) * 10 + (x.lastPreview ? 2 : 0) + (String(x.id || '').length > 20 ? 1 : 0);
    byKey.set(key, score(c) >= score(prev) ? c : prev);
  }
  return [...byKey.values()];
}

/** Web agenten törölt beszélgetés — sync nem hozza vissza. */
export function deleteConversation(store, id) {
  if (!id) return false;
  const before = store.conversations.length;
  store.conversations = store.conversations.filter((c) => c.id !== id);
  store.dismissedConversationIds = store.dismissedConversationIds || [];
  if (!store.dismissedConversationIds.includes(id)) {
    store.dismissedConversationIds.push(id);
  }
  return store.conversations.length < before;
}

/** Egy üzenet törlése a helyi store-ból. */
export function deleteMessage(store, conversationId, messageId) {
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv || !messageId) return false;
  const before = conv.messages?.length || 0;
  conv.messages = (conv.messages || []).filter((m) => m.id !== messageId);
  if (conv.messages.length === before) return false;
  if (conv.messages.length) {
    const last = conv.messages[conv.messages.length - 1];
    conv.lastPreview = String(last.text || '').slice(0, 120);
    conv.lastMessageAt = last.at || conv.lastMessageAt;
  } else {
    conv.lastPreview = '';
  }
  return true;
}

/**
 * Willhabenről eltűnt beszélgetések törlése.
 * Csak sikeres, nem üres remote lista után hívd.
 */
export function pruneMissingConversations(store, remoteIds) {
  const remote = new Set((remoteIds || []).filter(Boolean));
  if (!remote.size) return 0;
  const before = store.conversations.length;
  store.conversations = store.conversations.filter((c) => remote.has(c.id));
  store.dismissedConversationIds = (store.dismissedConversationIds || []).filter((id) => remote.has(id));
  return before - store.conversations.length;
}

export function appendOutbound(store, conversationId, text) {
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) return null;
  const msg = {
    id: crypto.randomUUID(),
    direction: 'out',
    text,
    at: new Date().toISOString(),
  };
  conv.messages = conv.messages || [];
  conv.messages.push(msg);
  conv.lastMessageAt = msg.at;
  conv.lastPreview = text.slice(0, 120);
  return msg;
}

export function listTemplates(store) {
  return store.templates || [];
}

export function saveTemplate(store, template) {
  const id = template.id || crypto.randomUUID();
  const entry = { id, name: String(template.name || '').trim(), text: String(template.text || '') };
  if (!entry.name || !entry.text) throw new Error('Sablon név és szöveg kötelező');
  const idx = store.templates.findIndex((t) => t.id === id);
  if (idx >= 0) store.templates[idx] = entry;
  else store.templates.push(entry);
  return entry;
}

export function deleteTemplate(store, id) {
  store.templates = store.templates.filter((t) => t.id !== id);
}

export function applyTemplate(text, vars) {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v ?? ''));
  }
  return out;
}
