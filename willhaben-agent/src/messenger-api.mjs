import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const BASE = 'https://www.willhaben.at';

export const CONVERSATION_PATHS = [
  '/webapi/bff/messenger/conversations',
  '/webapi/bff/messenger/conversations?page=0&size=50',
  '/webapi/messenger/conversations?page=0&size=50',
  '/webapi/messenger/v1/conversations?limit=50',
  '/webapi/messenger/conversations',
  '/webapi/messenger/v2/conversations',
  '/webapi/messenger/threads?page=0&size=50',
  '/webapi/messenger/v1/threads',
  '/webapi/messenger/inbox',
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
  for (const pathKeys of paths) {
    let cur = obj;
    let ok = true;
    for (const part of pathKeys) {
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

function findUuidLike(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const value of Object.values(obj)) {
    const s = asString(value);
    if (s && /^[0-9a-f-]{8,}$/i.test(s)) return s;
  }
  return null;
}

function looksLikeConversation(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  const id = pick(obj, [
    'id',
    'conversationId',
    'threadId',
    'uuid',
    'chatId',
    'messageThreadId',
    'messengerConversationId',
    'conversationUuid',
  ]) || findUuidLike(obj);

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
    'contactName',
    'interlocutorName',
  ]) || pickNested(obj, [
    ['partner', 'name'],
    ['partner', 'displayName'],
    ['counterpart', 'name'],
    ['buyer', 'name'],
    ['seller', 'name'],
    ['participant', 'name'],
    ['otherParticipant', 'name'],
    ['contact', 'name'],
    ['interlocutor', 'name'],
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
    'adHeading',
    'itemTitle',
  ]) || pickNested(obj, [
    ['advert', 'heading'],
    ['advert', 'title'],
    ['advert', 'description'],
    ['ad', 'title'],
    ['listing', 'title'],
    ['adDetail', 'heading'],
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
    'lastMessageContent',
  ]) || pickNested(obj, [
    ['lastMessage', 'text'],
    ['lastMessage', 'body'],
    ['lastMessage', 'content'],
    ['latestMessage', 'text'],
    ['mostRecentMessage', 'text'],
  ]);

  return Boolean(
    partner
    || adTitle
    || preview
    || obj.messages
    || obj.lastMessageAt
    || obj.updatedAt
    || obj.modifiedAt
    || obj.advertId
    || obj.adId
  );
}

function looksLikeMessage(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const text = pick(obj, [
    'text',
    'body',
    'content',
    'message',
    'messageText',
    'messageContent',
  ]) || pickNested(obj, [
    ['content', 'text'],
    ['payload', 'text'],
    ['message', 'text'],
  ]);
  return Boolean(text);
}

function findArrays(node, predicate, depth = 0, out = []) {
  if (!node || depth > 12) return out;
  if (Array.isArray(node)) {
    if (node.length && node.every((item) => typeof item === 'object') && node.some(predicate)) {
      out.push(node);
    }
    for (const item of node) findArrays(item, predicate, depth + 1, out);
    return out;
  }
  if (typeof node === 'object') {
    for (const key of [
      'conversations',
      'threads',
      'items',
      'content',
      'data',
      'results',
      'conversationList',
      'messagethreads',
      'messageThreads',
      'entries',
      'elements',
      'conversationSummaries',
      'summaries',
    ]) {
      if (Array.isArray(node[key]) && node[key].some(predicate)) {
        out.push(node[key]);
      }
    }
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
    const id = pick(raw, [
      'id',
      'conversationId',
      'threadId',
      'uuid',
      'chatId',
      'messageThreadId',
      'messengerConversationId',
      'conversationUuid',
    ]) || findUuidLike(raw);
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
      'contactName',
      'interlocutorName',
    ]) || pickNested(raw, [
      ['partner', 'name'],
      ['partner', 'displayName'],
      ['counterpart', 'name'],
      ['buyer', 'name'],
      ['seller', 'name'],
      ['participant', 'name'],
      ['otherParticipant', 'name'],
      ['contact', 'name'],
      ['interlocutor', 'name'],
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
      'adHeading',
      'itemTitle',
    ]) || pickNested(raw, [
      ['advert', 'heading'],
      ['advert', 'title'],
      ['ad', 'title'],
      ['listing', 'title'],
      ['adDetail', 'heading'],
    ]) || '';

    const lastPreview = pick(raw, [
      'lastPreview',
      'lastMessage',
      'preview',
      'snippet',
      'lastMessageText',
      'messagePreview',
      'lastMessagePreview',
      'lastMessageContent',
    ]) || pickNested(raw, [
      ['lastMessage', 'text'],
      ['lastMessage', 'body'],
      ['lastMessage', 'content'],
      ['latestMessage', 'text'],
      ['mostRecentMessage', 'text'],
    ]) || '';

    const lastMessageAt = parseTimestamp(
      pick(raw, ['lastMessageAt', 'updatedAt', 'modifiedAt', 'lastUpdated', 'timestamp', 'lastModified'])
      || pickNested(raw, [['lastMessage', 'createdAt'], ['lastMessage', 'sentAt']])
    ) || new Date().toISOString();

    const unread = Boolean(
      raw.unread
      || raw.hasUnreadMessages
      || raw.unreadCount > 0
      || raw.isUnread
    );

    const url = pick(raw, ['url', 'conversationUrl', 'chatUrl', 'link'])
      || `${BASE}/iad/myprofile/chat/${encodeURIComponent(id)}`;

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
    const text = pick(raw, [
      'text',
      'body',
      'content',
      'message',
      'messageText',
      'messageContent',
    ]) || pickNested(raw, [
      ['content', 'text'],
      ['payload', 'text'],
      ['message', 'text'],
    ]);
    if (!text) return null;

    const directionRaw = (
      pick(raw, ['direction', 'messageDirection', 'type', 'senderType', 'authorType', 'messageType']) || ''
    ).toLowerCase();

    const fromSelf = raw.fromSelf
      ?? raw.isOwnMessage
      ?? raw.ownMessage
      ?? raw.sentByMe
      ?? raw.outgoing
      ?? raw.mine
      ?? /out|own|self|sent|seller|me|outgoing|author/.test(directionRaw);

    const at = parseTimestamp(
      pick(raw, ['at', 'sentAt', 'createdAt', 'timestamp', 'messageDate', 'date', 'sentDate'])
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

export async function getCsrfToken(context) {
  const cookies = await context.cookies(BASE);
  return cookies.find((c) => c.name === 'x-bbx-csrf-token')?.value || null;
}

function buildHeaders(csrfToken) {
  const headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'de-AT,de;q=0.9',
  };
  if (csrfToken) headers['x-bbx-csrf-token'] = csrfToken;
  return headers;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return { data: null, text: '' };
  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text: text.slice(0, 500) };
  }
}

export async function fetchJson(context, apiPath, { page } = {}) {
  if (page) {
    return fetchJsonViaPage(page, apiPath);
  }

  const csrfToken = await getCsrfToken(context);
  const response = await context.request.get(`${BASE}${apiPath}`, {
    headers: buildHeaders(csrfToken),
  });
  const { data, text } = await parseResponseBody(response);

  if (response.status() === 401 || response.status() === 403) {
    return {
      ok: false,
      status: response.status(),
      data,
      text,
      unauthorized: true,
      source: 'context.request',
    };
  }
  if (!response.ok()) {
    return {
      ok: false,
      status: response.status(),
      data,
      text,
      unauthorized: false,
      source: 'context.request',
    };
  }

  return {
    ok: true,
    status: response.status(),
    data,
    text,
    unauthorized: false,
    source: 'context.request',
  };
}

export async function fetchJsonViaPage(page, apiPath) {
  return page.evaluate(async ({ base, path }) => {
    const readCookie = (name) => {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : '';
    };

    const csrf = readCookie('x-bbx-csrf-token');
    const headers = { accept: 'application/json, text/plain, */*' };
    if (csrf) headers['x-bbx-csrf-token'] = csrf;

    const response = await fetch(`${base}${path}`, {
      credentials: 'include',
      headers,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      text: text.slice(0, 500),
      unauthorized: response.status === 401 || response.status === 403,
      source: 'page.fetch',
      hadCsrf: Boolean(csrf),
    };
  }, { base: BASE, path: apiPath });
}

export async function probeConversationPaths(context, page) {
  const probes = [];
  let unauthorizedCount = 0;

  for (const apiPath of CONVERSATION_PATHS) {
    const result = page
      ? await fetchJsonViaPage(page, apiPath)
      : await fetchJson(context, apiPath);

    const parsedCount = result.data ? parseConversationsPayload(result.data).length : 0;
    probes.push({
      path: apiPath,
      status: result.status,
      ok: result.ok,
      unauthorized: result.unauthorized,
      parsedCount,
      source: result.source,
      hadCsrf: result.hadCsrf,
      preview: result.text?.slice(0, 120) || '',
    });

    if (result.unauthorized) unauthorizedCount += 1;
  }

  return {
    probes,
    unauthorized: unauthorizedCount === CONVERSATION_PATHS.length,
  };
}

export async function fetchConversations(context, { page } = {}) {
  const { probes, unauthorized } = await probeConversationPaths(context, page);

  for (const probe of probes) {
    if (!probe.ok || !probe.parsedCount) continue;
    const result = page
      ? await fetchJsonViaPage(page, probe.path)
      : await fetchJson(context, probe.path);
    const conversations = parseConversationsPayload(result.data);
    if (conversations.length) {
      return {
        conversations,
        unauthorized: false,
        source: probe.path,
        probes,
      };
    }
  }

  return { conversations: [], unauthorized, source: null, probes };
}

export async function fetchMessages(context, conversationId, { page } = {}) {
  const paths = [
    `/webapi/bff/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}`,
  ];

  for (const apiPath of paths) {
    const result = page
      ? await fetchJsonViaPage(page, apiPath)
      : await fetchJson(context, apiPath);
    if (!result.ok || !result.data) continue;
    const messages = parseMessagesPayload(result.data);
    if (messages.length) return messages;
  }
  return [];
}

export async function sendMessageViaApi(context, conversationId, text, { page } = {}) {
  const bodies = [
    { text },
    { message: text },
    { body: text },
    { content: text },
    { messageText: text },
  ];
  const paths = [
    `/webapi/bff/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/message`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/message`,
  ];

  const csrfToken = page ? null : await getCsrfToken(context);

  for (const apiPath of paths) {
    for (const data of bodies) {
      let ok = false;
      if (page) {
        ok = await page.evaluate(async ({ base, path, payload }) => {
          const readCookie = (name) => {
            const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
            return match ? decodeURIComponent(match[1]) : '';
          };
          const csrf = readCookie('x-bbx-csrf-token');
          const headers = {
            accept: 'application/json, text/plain, */*',
            'content-type': 'application/json',
          };
          if (csrf) headers['x-bbx-csrf-token'] = csrf;
          const response = await fetch(`${base}${path}`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(payload),
          });
          return response.ok;
        }, { base: BASE, path: apiPath, payload: data });
      } else {
        const response = await context.request.post(`${BASE}${apiPath}`, {
          headers: {
            ...buildHeaders(csrfToken),
            'content-type': 'application/json',
          },
          data,
        });
        ok = response.ok();
      }
      if (ok) return true;
    }
  }
  return false;
}

export function installNetworkCapture(page) {
  const captured = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (!/\/webapi\/(bff\/messenger|messenger|chat|messaging)\//i.test(url)) return;
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
  return /\/webapi\/(bff\/messenger|messenger|chat|messaging)\//i.test(url);
}

export function saveSyncDebug(label, payload) {
  try {
    const dir = path.join(getDataDir(), 'debug');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${label}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    return file;
  } catch {
    return null;
  }
}
