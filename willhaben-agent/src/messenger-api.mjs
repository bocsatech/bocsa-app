const BASE = 'https://www.willhaben.at';

const CONVERSATION_PATHS = [
  '/webapi/messenger/conversations?page=0&size=50',
  '/webapi/messenger/v1/conversations?limit=50',
  '/webapi/messenger/conversations',
  '/webapi/messenger/threads?page=0&size=50',
  '/webapi/chat/conversations',
];

function asString(value) {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value) return value;
  }
  return null;
}

function pickNested(obj, paths) {
  for (const path of paths) {
    let cur = obj;
    let ok = true;
    for (const part of path) {
      if (!cur || typeof cur !== 'object') {
        ok = false;
        break;
      }
      cur = cur[part];
    }
    const value = asString(cur);
    if (ok && value) return value;
  }
  return null;
}

function looksLikeConversation(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const id = pick(obj, ['id', 'conversationId', 'threadId', 'uuid', 'chatId', 'messageThreadId']);
  if (!id) return false;

  const partner = pick(obj, [
    'partnerName',
    'counterpartName',
    'buyerName',
    'sellerName',
    'participantName',
    'userName',
    'displayName',
    'name',
    'partnerDisplayName',
  ]) || pickNested(obj, [
    ['partner', 'name'],
    ['partner', 'displayName'],
    ['counterpart', 'name'],
    ['buyer', 'name'],
    ['seller', 'name'],
    ['participant', 'name'],
    ['otherParticipant', 'name'],
  ]);

  const adTitle = pick(obj, [
    'adTitle',
    'advertTitle',
    'listingTitle',
    'subject',
    'advertHeading',
    'heading',
    'title',
    'advertName',
  ]) || pickNested(obj, [
    ['advert', 'heading'],
    ['advert', 'title'],
    ['ad', 'title'],
    ['listing', 'title'],
  ]);

  const preview = pick(obj, [
    'lastPreview',
    'lastMessage',
    'preview',
    'snippet',
    'lastMessageText',
    'messagePreview',
    'lastMessagePreview',
    'text',
  ]) || pickNested(obj, [
    ['lastMessage', 'text'],
    ['lastMessage', 'body'],
    ['latestMessage', 'text'],
  ]);

  return Boolean(partner || adTitle || preview || obj.messages || obj.lastMessageAt || obj.updatedAt);
}

function looksLikeMessage(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const text = pick(obj, ['text', 'body', 'content', 'message', 'messageText']) || pickNested(obj, [
    ['content', 'text'],
    ['payload', 'text'],
  ]);
  return Boolean(text);
}

function findArrays(node, predicate, depth = 0, out = []) {
  if (!node || depth > 10) return out;
  if (Array.isArray(node)) {
    if (node.length && node.every((item) => typeof item === 'object') && node.some(predicate)) {
      out.push(node);
    }
    for (const item of node) findArrays(item, predicate, depth + 1, out);
    return out;
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node)) findArrays(value, predicate, depth + 1, out);
  }
  return out;
}

function parseTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseConversationsPayload(payload) {
  const arrays = findArrays(payload, looksLikeConversation);
  const best = arrays.sort((a, b) => b.length - a.length)[0] || [];
  const seen = new Set();

  return best.map((raw) => {
    const id = pick(raw, ['id', 'conversationId', 'threadId', 'uuid', 'chatId', 'messageThreadId']);
    if (!id || seen.has(id)) return null;
    seen.add(id);

    const partnerName = pick(raw, [
      'partnerName',
      'counterpartName',
      'buyerName',
      'sellerName',
      'participantName',
      'userName',
      'displayName',
      'name',
      'partnerDisplayName',
    ]) || pickNested(raw, [
      ['partner', 'name'],
      ['partner', 'displayName'],
      ['counterpart', 'name'],
      ['buyer', 'name'],
      ['seller', 'name'],
      ['participant', 'name'],
      ['otherParticipant', 'name'],
    ]) || 'Ismeretlen';

    const adTitle = pick(raw, [
      'adTitle',
      'advertTitle',
      'listingTitle',
      'subject',
      'advertHeading',
      'heading',
      'title',
      'advertName',
    ]) || pickNested(raw, [
      ['advert', 'heading'],
      ['advert', 'title'],
      ['ad', 'title'],
      ['listing', 'title'],
    ]) || '';

    const lastPreview = pick(raw, [
      'lastPreview',
      'lastMessage',
      'preview',
      'snippet',
      'lastMessageText',
      'messagePreview',
      'lastMessagePreview',
    ]) || pickNested(raw, [
      ['lastMessage', 'text'],
      ['lastMessage', 'body'],
      ['latestMessage', 'text'],
    ]) || '';

    const lastMessageAt = parseTimestamp(
      pick(raw, ['lastMessageAt', 'updatedAt', 'modifiedAt', 'lastUpdated', 'timestamp'])
      || pickNested(raw, [['lastMessage', 'createdAt'], ['lastMessage', 'sentAt']])
    ) || new Date().toISOString();

    const unread = Boolean(
      raw.unread
      || raw.hasUnreadMessages
      || raw.unreadCount > 0
      || raw.isUnread
    );

    const url = pick(raw, ['url', 'conversationUrl', 'chatUrl', 'link'])
      || (id ? `${BASE}/iad/myprofile/chat/${encodeURIComponent(id)}` : null);

    return {
      id,
      url,
      partnerName,
      adTitle,
      lastPreview,
      unread,
      lastMessageAt,
      _raw: raw,
    };
  }).filter(Boolean);
}

export function parseMessagesPayload(payload) {
  const arrays = findArrays(payload, looksLikeMessage);
  const best = arrays.sort((a, b) => b.length - a.length)[0] || [];

  return best.map((raw, index) => {
    const text = pick(raw, ['text', 'body', 'content', 'message', 'messageText']) || pickNested(raw, [
      ['content', 'text'],
      ['payload', 'text'],
    ]);
    if (!text) return null;

    const directionRaw = (
      pick(raw, ['direction', 'messageDirection', 'type', 'senderType', 'authorType']) || ''
    ).toLowerCase();

    const fromSelf = raw.fromSelf
      ?? raw.isOwnMessage
      ?? raw.ownMessage
      ?? raw.sentByMe
      ?? raw.outgoing
      ?? /out|own|self|sent|seller|me|outgoing/.test(directionRaw);

    const at = parseTimestamp(
      pick(raw, ['at', 'sentAt', 'createdAt', 'timestamp', 'messageDate', 'date'])
    ) || new Date().toISOString();

    return {
      id: pick(raw, ['id', 'messageId', 'uuid']) || `m${index}`,
      direction: fromSelf ? 'out' : 'in',
      text,
      at,
    };
  }).filter(Boolean);
}

export function attachCapturedPayloads(captured, conversations) {
  const byId = new Map(conversations.map((c) => [c.id, c]));

  for (const item of captured) {
    const parsed = parseConversationsPayload(item.json);
    for (const conv of parsed) {
      const existing = byId.get(conv.id);
      if (existing) Object.assign(existing, conv);
      else {
        byId.set(conv.id, conv);
        conversations.push(conv);
      }
    }
  }

  return conversations;
}

export async function fetchJson(context, path) {
  const response = await context.request.get(`${BASE}${path}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'de-AT,de;q=0.9',
    },
  });

  if (response.status() === 401 || response.status() === 403) {
    return { ok: false, status: response.status(), data: null, unauthorized: true };
  }
  if (!response.ok()) {
    return { ok: false, status: response.status(), data: null, unauthorized: false };
  }

  const contentType = response.headers()['content-type'] || '';
  if (!contentType.includes('json')) {
    return { ok: false, status: response.status(), data: null, unauthorized: false };
  }

  try {
    return { ok: true, status: response.status(), data: await response.json(), unauthorized: false };
  } catch {
    return { ok: false, status: response.status(), data: null, unauthorized: false };
  }
}

export async function fetchConversations(context) {
  for (const path of CONVERSATION_PATHS) {
    const result = await fetchJson(context, path);
    if (!result.ok) {
      if (result.unauthorized) return { conversations: [], unauthorized: true, source: null };
      continue;
    }
    const conversations = parseConversationsPayload(result.data);
    if (conversations.length) {
      return { conversations, unauthorized: false, source: path };
    }
  }
  return { conversations: [], unauthorized: false, source: null };
}

export async function fetchMessages(context, conversationId) {
  const paths = [
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}`,
  ];

  for (const path of paths) {
    const result = await fetchJson(context, path);
    if (!result.ok) continue;
    const messages = parseMessagesPayload(result.data);
    if (messages.length) return messages;
  }
  return [];
}

export async function sendMessageViaApi(context, conversationId, text) {
  const bodies = [
    { text },
    { message: text },
    { body: text },
    { content: text },
    { messageText: text },
  ];
  const paths = [
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/message`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/message`,
  ];

  for (const path of paths) {
    for (const data of bodies) {
      const response = await context.request.post(`${BASE}${path}`, {
        headers: {
          accept: 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'accept-language': 'de-AT,de;q=0.9',
        },
        data,
      });
      if (response.ok()) return true;
    }
  }
  return false;
}

export function installNetworkCapture(page) {
  const captured = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (!/\/webapi\/(messenger|chat|messaging)\//i.test(url)) return;
    if (!response.ok()) return;
    try {
      const json = await response.json();
      captured.push({ url, json });
    } catch {
      /* not json */
    }
  });

  return captured;
}

export function isMessengerUrl(url) {
  return /\/webapi\/(messenger|chat|messaging)\//i.test(url);
}
