import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const BASE = 'https://www.willhaben.at';

export const CONVERSATION_PATHS = [
  '/webapi/bff/messenger/conversations',
  '/webapi/bff/messenger/conversations?page=0&size=50',
  '/webapi/bff/messenger/v1/conversations',
  '/webapi/bff/messenger/v2/conversations',
  '/webapi/bff/messenger/inbox',
  '/webapi/bff/messenger/threads',
  '/webapi/bff/messenger/conversation-summaries',
  '/webapi/messenger/conversations?page=0&size=50',
  '/webapi/messenger/v1/conversations?limit=50',
  '/webapi/messenger/conversations',
  '/webapi/messenger/v2/conversations',
  '/webapi/messenger/threads?page=0&size=50',
  '/webapi/messenger/v1/threads',
  '/webapi/messenger/inbox',
  '/webapi/messenger/conversation-summaries',
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
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = asString(obj[key]);
      if (value) return value;
    }
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
  for (const [key, value] of Object.entries(obj)) {
    if (!/id|uuid|conversation|thread|chat/i.test(key)) continue;
    const s = asString(value);
    if (s && /^[0-9a-f-]{8,}$/i.test(s)) return s;
  }
  return null;
}

const JUNK_RE = /optimizely|audience|backwards.?compatibility|experiment|feature.?flag|segment.?id|cdn\.|google-analytics|gtm\.|hotjar|fullstory|datadog|sentry|newrelic|cookiebot|didomi|consent/i;

function isJunkText(...parts) {
  return parts.some((p) => p && JUNK_RE.test(String(p)));
}

function isJunkObject(obj) {
  if (!obj || typeof obj !== 'object') return true;
  const blob = JSON.stringify(obj).slice(0, 2000);
  if (JUNK_RE.test(blob) && !pick(obj, ['conversation_uuid', 'conversationUuid', 'last_message_text', 'message_text'])) {
    return true;
  }
  const name = pick(obj, ['name', 'title', 'displayName', 'display_name']);
  if (name && JUNK_RE.test(name)) return true;
  return false;
}

const ID_KEYS = [
  'id', 'conversationId', 'threadId', 'chatId', 'messageThreadId',
  'messengerConversationId', 'conversationUuid', 'conversation_uuid',
];

// NE használd a sima "name" mezőt elsőnek — Optimizely is "name"-et ad
const PARTNER_KEYS = [
  'partnerName', 'counterpartName', 'buyerName', 'sellerName', 'participantName',
  'userName', 'displayName', 'partnerDisplayName', 'contactName',
  'interlocutorName', 'seller_name', 'buyer_name', 'participant_name',
  'display_name', 'contact_name', 'partner_name', 'counterpart_name',
];

const AD_TITLE_KEYS = [
  'adTitle', 'advertTitle', 'listingTitle', 'subject', 'advertHeading',
  'heading', 'advertName', 'adHeading', 'itemTitle',
  'ad_title', 'advert_title', 'listing_title', 'ad_heading',
];

const PREVIEW_KEYS = [
  'lastPreview', 'preview', 'snippet', 'lastMessageText',
  'messagePreview', 'lastMessagePreview', 'lastMessageContent',
  'last_message_text', 'last_message_preview', 'message_preview',
  'preview_text', 'snippet_text', 'latest_message_text',
];

const MESSAGE_TEXT_KEYS = [
  'text', 'body', 'message', 'messageText', 'messageContent',
  'message_text', 'message_body', 'message_content', 'body_text', 'content_text',
];

function pickId(obj) {
  return pick(obj, ID_KEYS) || (
    pick(obj, ['conversation_uuid', 'conversationUuid']) ? pick(obj, ['conversation_uuid', 'conversationUuid']) : null
  ) || findUuidLike(obj);
}

function looksLikeConversation(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (isJunkObject(obj)) return false;

  const hasConvId = Boolean(pick(obj, ['conversation_uuid', 'conversationUuid', 'conversationId', 'messageThreadId']));
  const hasAd = Boolean(pick(obj, ['ad_uuid', 'adUuid', 'ad_id', 'advertId', 'adId', ...AD_TITLE_KEYS]));
  const hasMsg = Boolean(
    pick(obj, PREVIEW_KEYS)
    || obj.messages || obj.message_list
    || pickNested(obj, [['lastMessage', 'text'], ['last_message', 'text'], ['latestMessage', 'text']])
  );

  // Strict: real messenger threads have conversation id + (ad or message)
  if (hasConvId && (hasAd || hasMsg || pick(obj, PARTNER_KEYS))) return true;
  if (hasAd && hasMsg && pick(obj, PARTNER_KEYS)) return true;

  return false;
}

function looksLikeMessage(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (isJunkObject(obj)) return false;
  const text = pick(obj, MESSAGE_TEXT_KEYS) || pickNested(obj, [
    ['content', 'text'], ['payload', 'text'], ['message', 'text'], ['message', 'body'],
  ]);
  if (!text || isJunkText(text)) return false;
  if (text.length > 5000) return false;
  return true;
}

function findArrays(node, predicate, depth = 0, out = []) {
  if (!node || depth > 14) return out;
  if (Array.isArray(node)) {
    if (node.length && node.every((item) => item && typeof item === 'object') && node.some(predicate)) {
      out.push(node);
    }
    for (const item of node) findArrays(item, predicate, depth + 1, out);
    return out;
  }
  if (typeof node === 'object') {
    for (const key of [
      'conversations', 'threads', 'items', 'content', 'data', 'results',
      'conversationList', 'messagethreads', 'messageThreads', 'entries',
      'elements', 'conversationSummaries', 'summaries', 'conversation_summaries',
      'message_list', 'messageList', 'messages',
    ]) {
      if (Array.isArray(node[key]) && node[key].some(predicate)) out.push(node[key]);
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
    if (isJunkObject(raw)) return null;
    const id = pickId(raw);
    if (!id || seen.has(id)) return null;
    seen.add(id);

    let partnerName = pick(raw, PARTNER_KEYS) || pickNested(raw, [
      ['partner', 'name'], ['partner', 'displayName'], ['counterpart', 'name'],
      ['buyer', 'name'], ['seller', 'name'], ['participant', 'name'],
      ['otherParticipant', 'name'], ['contact', 'name'], ['interlocutor', 'name'],
      ['participant', 'display_name'],
    ]);

    if (!partnerName) {
      const first = pick(raw, ['first_name', 'firstName']);
      const last = pick(raw, ['last_name', 'lastName']);
      if (first || last) partnerName = [first, last].filter(Boolean).join(' ');
    }

    const adTitle = pick(raw, AD_TITLE_KEYS) || pickNested(raw, [
      ['advert', 'heading'], ['advert', 'title'], ['advert', 'ad_title'],
      ['ad', 'title'], ['listing', 'title'], ['adDetail', 'heading'],
    ]) || '';

    const lastPreview = pick(raw, PREVIEW_KEYS) || pickNested(raw, [
      ['lastMessage', 'text'], ['lastMessage', 'body'], ['lastMessage', 'content'],
      ['last_message', 'text'], ['latestMessage', 'text'], ['mostRecentMessage', 'text'],
      ['latest_message', 'text'],
    ]) || '';

    if (isJunkText(partnerName, adTitle, lastPreview)) return null;

    // Ha nincs partnernév: használd a hirdetés címét, ne "Ismeretlen"
    if (!partnerName || partnerName === 'name') {
      partnerName = adTitle || (lastPreview ? lastPreview.slice(0, 60) : 'Beszélgetés');
    }

    const lastMessageAt = parseTimestamp(
      pick(raw, [
        'lastMessageAt', 'updatedAt', 'modifiedAt', 'lastUpdated', 'timestamp',
        'lastModified', 'last_message_at', 'updated_at', 'modified_at',
      ])
      || pickNested(raw, [
        ['lastMessage', 'createdAt'], ['lastMessage', 'sentAt'],
        ['last_message', 'sent_at'], ['last_message', 'created_at'],
      ])
    ) || new Date().toISOString();

    const unread = Boolean(
      raw.unread || raw.hasUnreadMessages || raw.has_unread_messages
      || raw.unreadCount > 0 || raw.unread_count > 0
      || raw.isUnread || raw.is_unread
    );

    const url = pick(raw, ['url', 'conversationUrl', 'chatUrl', 'link'])
      || `${BASE}/iad/myprofile/chat/${encodeURIComponent(id)}`;

    return {
      id, url, partnerName, adTitle, lastPreview, unread, lastMessageAt, _raw: raw,
    };
  }).filter(Boolean);
}

export function parseMessagesPayload(payload) {
  const arrays = findArrays(payload, looksLikeMessage);
  const best = arrays.sort((a, b) => b.length - a.length)[0] || [];

  return best.map((raw, index) => {
    const text = pick(raw, MESSAGE_TEXT_KEYS) || pickNested(raw, [
      ['content', 'text'], ['payload', 'text'], ['message', 'text'], ['message', 'body'],
    ]);
    if (!text) return null;

    const directionRaw = (
      pick(raw, [
        'direction', 'messageDirection', 'type', 'senderType', 'authorType',
        'messageType', 'message_type', 'sender_type',
      ]) || ''
    ).toLowerCase();

    const fromSelf = raw.fromSelf ?? raw.from_self ?? raw.isOwnMessage ?? raw.is_own_message
      ?? raw.ownMessage ?? raw.own_message ?? raw.sentByMe ?? raw.sent_by_me
      ?? raw.outgoing ?? raw.mine ?? raw.is_sender ?? raw.isSender
      ?? /out|own|self|sent|seller|me|outgoing|author/.test(directionRaw);

    const at = parseTimestamp(
      pick(raw, [
        'at', 'sentAt', 'sent_at', 'createdAt', 'created_at', 'timestamp',
        'messageDate', 'message_date', 'date', 'sentDate', 'sent_date',
      ])
    ) || new Date().toISOString();

    return {
      id: pick(raw, ['id', 'messageId', 'message_id', 'uuid']) || `m${index}`,
      direction: fromSelf ? 'out' : 'in',
      text,
      at,
    };
  }).filter(Boolean);
}

export function attachCapturedPayloads(captured, conversations = []) {
  const byId = new Map(conversations.map((c) => [c.id, c]));
  for (const item of captured) {
    if (!item?.json) continue;
    for (const conv of parseConversationsPayload(item.json)) {
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

export async function extractAccessToken(page) {
  return page.evaluate(() => {
    const keys = [
      'accessToken', 'access_token', 'token', 'authToken', 'auth_token',
      'bbxAccessToken', 'bbx_access_token', 'oidc.user',
    ];
    const stores = [localStorage, sessionStorage];
    for (const store of stores) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key) continue;
        const val = store.getItem(key);
        if (!val) continue;
        if (/access.?token|auth.?token/i.test(key) && val.length > 20 && !val.startsWith('{')) {
          return val.replace(/^Bearer\s+/i, '');
        }
        try {
          const json = JSON.parse(val);
          for (const k of keys) {
            if (typeof json?.[k] === 'string' && json[k].length > 20) {
              return json[k].replace(/^Bearer\s+/i, '');
            }
          }
          if (typeof json?.access_token === 'string') return json.access_token;
          if (typeof json?.accessToken === 'string') return json.accessToken;
        } catch {
          /* not json */
        }
      }
    }
    return null;
  }).catch(() => null);
}

export async function getCsrfToken(context) {
  const cookies = await context.cookies(BASE);
  return cookies.find((c) => c.name === 'x-bbx-csrf-token')?.value || null;
}

function buildHeaders(csrfToken, accessToken) {
  const headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'de-AT,de;q=0.9',
  };
  if (csrfToken) headers['x-bbx-csrf-token'] = csrfToken;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
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

export async function fetchJsonViaPage(page, apiPath, accessToken) {
  return page.evaluate(async ({ base, path, token }) => {
    const readCookie = (name) => {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : '';
    };
    const csrf = readCookie('x-bbx-csrf-token');
    const headers = { accept: 'application/json, text/plain, */*' };
    if (csrf) headers['x-bbx-csrf-token'] = csrf;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${base}${path}`, { credentials: 'include', headers });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    return {
      ok: response.ok,
      status: response.status,
      data,
      text: text.slice(0, 800),
      unauthorized: response.status === 401 || response.status === 403,
      source: 'page.fetch',
      hadCsrf: Boolean(csrf),
      hadToken: Boolean(token),
    };
  }, { base: BASE, path: apiPath, token: accessToken || null });
}

export async function fetchJson(context, apiPath, { page, accessToken } = {}) {
  if (page) return fetchJsonViaPage(page, apiPath, accessToken);

  const csrfToken = await getCsrfToken(context);
  const response = await context.request.get(`${BASE}${apiPath}`, {
    headers: buildHeaders(csrfToken, accessToken),
  });
  const { data, text } = await parseResponseBody(response);
  const unauthorized = response.status() === 401 || response.status() === 403;
  return {
    ok: response.ok(),
    status: response.status(),
    data,
    text,
    unauthorized,
    source: 'context.request',
    hadToken: Boolean(accessToken),
  };
}

export async function fetchConversations(context, { page, accessToken } = {}) {
  const probes = [];
  let unauthorizedCount = 0;
  let best = null;
  const rawSamples = [];

  for (const apiPath of CONVERSATION_PATHS) {
    const result = await fetchJson(context, apiPath, { page, accessToken });
    const parsedCount = result.data ? parseConversationsPayload(result.data).length : 0;
    probes.push({
      path: apiPath,
      status: result.status,
      ok: result.ok,
      unauthorized: result.unauthorized,
      parsedCount,
      hadToken: result.hadToken,
      preview: result.text?.slice(0, 120) || '',
    });
    if (result.unauthorized) unauthorizedCount += 1;
    if (!result.ok || !result.data) continue;

    rawSamples.push({
      path: apiPath,
      parsedCount,
      keys: typeof result.data === 'object' ? Object.keys(result.data).slice(0, 20) : [],
    });

    const conversations = parseConversationsPayload(result.data);
    if (conversations.length && (!best || conversations.length > best.conversations.length)) {
      best = { conversations, source: apiPath, probes, rawSamples };
    }
  }

  if (best) return { ...best, unauthorized: false };
  return {
    conversations: [],
    unauthorized: unauthorizedCount === CONVERSATION_PATHS.length,
    source: null,
    probes,
    rawSamples,
  };
}

export async function fetchMessages(context, conversationId, { page, accessToken } = {}) {
  const paths = [
    `/webapi/bff/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}`,
  ];
  for (const apiPath of paths) {
    const result = await fetchJson(context, apiPath, { page, accessToken });
    if (!result.ok || !result.data) continue;
    const messages = parseMessagesPayload(result.data);
    if (messages.length) return messages;
  }
  return [];
}

export async function sendMessageViaApi(context, conversationId, text, { page, accessToken } = {}) {
  const bodies = [{ text }, { message: text }, { body: text }, { content: text }, { messageText: text }];
  const paths = [
    `/webapi/bff/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    `/webapi/messenger/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
  ];
  const csrfToken = page ? null : await getCsrfToken(context);

  for (const apiPath of paths) {
    for (const data of bodies) {
      let ok = false;
      if (page) {
        ok = await page.evaluate(async ({ base, path, payload, token }) => {
          const readCookie = (name) => {
            const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
            return match ? decodeURIComponent(match[1]) : '';
          };
          const csrf = readCookie('x-bbx-csrf-token');
          const headers = { accept: 'application/json', 'content-type': 'application/json' };
          if (csrf) headers['x-bbx-csrf-token'] = csrf;
          if (token) headers.Authorization = `Bearer ${token}`;
          const response = await fetch(`${base}${path}`, {
            method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload),
          });
          return response.ok;
        }, { base: BASE, path: apiPath, payload: data, token: accessToken || null });
      } else {
        const response = await context.request.post(`${BASE}${apiPath}`, {
          headers: { ...buildHeaders(csrfToken, accessToken), 'content-type': 'application/json' },
          data,
        });
        ok = response.ok();
      }
      if (ok) return true;
    }
  }
  return false;
}

/** Capture ALL JSON responses from willhaben — the SPA has the OAuth token. */
export function installNetworkCapture(page) {
  const captured = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (!/willhaben\.at/i.test(url)) return;
      if (JUNK_RE.test(url)) return;
      if (!response.ok()) return;
      const ct = (response.headers()['content-type'] || '').toLowerCase();
      if (!ct.includes('json') && !/webapi|messenger|chat|bff|graphql/i.test(url)) return;

      const json = await response.json().catch(() => null);
      if (!json) return;
      if (isJunkObject(json) && !/webapi.*(messenger|chat|conversation)/i.test(url)) return;

      const interesting = /webapi.*(messenger|chat|messaging|conversation|thread|nachricht|inbox|bff)/i.test(url)
        || parseConversationsPayload(json).length > 0
        || parseMessagesPayload(json).length > 0;

      if (interesting) {
        captured.push({
          url,
          json,
          status: response.status(),
          at: new Date().toISOString(),
        });
      }
    } catch {
      /* ignore */
    }
  });

  return captured;
}

export function isJunkConversation(conv) {
  if (!conv) return true;
  return isJunkText(conv.partnerName, conv.adTitle, conv.lastPreview, conv.id);
}

export function isMessengerUrl(url) {
  return /\/webapi\/(bff\/messenger|messenger|chat|messaging)\//i.test(url)
    || /conversation|nachricht|inbox/i.test(url);
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

export function saveCapturedRaw(captured) {
  try {
    const dir = path.join(getDataDir(), 'debug');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `captured-${Date.now()}.json`);
    const slim = captured.map((c) => ({
      url: c.url,
      status: c.status,
      topKeys: c.json && typeof c.json === 'object' ? Object.keys(c.json).slice(0, 30) : [],
      conversationCount: parseConversationsPayload(c.json).length,
      messageCount: parseMessagesPayload(c.json).length,
      sample: JSON.stringify(c.json).slice(0, 2000),
    }));
    fs.writeFileSync(file, JSON.stringify(slim, null, 2));
    return file;
  } catch {
    return null;
  }
}
