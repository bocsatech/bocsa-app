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
  return store.conversations.find((c) => c.id === id) || null;
}

export function upsertConversation(store, conversation) {
  if (!conversation?.id) return store;
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
    // Ne töröljük a meglévő üzeneteket, ha most nincs új
    delete next.messages;
  }
  if (idx >= 0) {
    store.conversations[idx] = {
      ...store.conversations[idx],
      ...next,
      ...(next.messages ? { messages: next.messages } : {}),
    };
  } else {
    store.conversations.unshift({ ...next, messages: next.messages || [] });
  }
  store.conversations = purgeJunkConversations(store.conversations);
  store.conversations.sort(
    (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
  );
  return store;
}

export function purgeJunkConversations(list) {
  return (list || []).filter((c) => {
    const blob = `${c.partnerName || ''} ${c.adTitle || ''} ${c.lastPreview || ''}`;
    if (/optimizely|audience|backwards.?compatibility|feature.?flag/i.test(blob)) return false;
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
}

export function appendOutbound(store, conversationId, text) {
  const conv = getConversation(store, conversationId);
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
