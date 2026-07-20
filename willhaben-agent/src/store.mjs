import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDataDir } from './config.mjs';

const STORE_PATH = () => path.join(getDataDir(), 'inbox.json');
const CHART_DIR = () => path.join(getDataDir(), 'price-chart');

function emptyStore() {
  return {
    lastSyncAt: null,
    lastSyncError: null,
    conversations: [],
    priceChart: null,
  };
}

export function loadStore() {
  const file = STORE_PATH();
  if (!fs.existsSync(file)) return emptyStore();
  try {
    return { ...emptyStore(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store) {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH(), JSON.stringify(store, null, 2));
}

export function upsertConversation(store, conversation) {
  const idx = store.conversations.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) {
    store.conversations[idx] = { ...store.conversations[idx], ...conversation };
  } else {
    store.conversations.unshift(conversation);
  }
  store.conversations.sort((a, b) => {
    const ta = new Date(a.lastMessageAt || 0).getTime();
    const tb = new Date(b.lastMessageAt || 0).getTime();
    return tb - ta;
  });
  return store;
}

export function getConversation(store, id) {
  return store.conversations.find((c) => c.id === id) || null;
}

export function appendOutboundMessage(store, conversationId, text) {
  const conv = getConversation(store, conversationId);
  if (!conv) return null;
  const msg = {
    id: crypto.randomUUID(),
    direction: 'out',
    text,
    at: new Date().toISOString(),
    pending: false,
  };
  conv.messages = conv.messages || [];
  conv.messages.push(msg);
  conv.lastMessageAt = msg.at;
  conv.lastPreview = text.slice(0, 120);
  return msg;
}

export function savePriceChart(store, chart) {
  const dir = CHART_DIR();
  fs.mkdirSync(dir, { recursive: true });
  store.priceChart = chart;
  return store;
}

export function getPriceChartDir() {
  return CHART_DIR();
}

export function makeConversationId(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}
