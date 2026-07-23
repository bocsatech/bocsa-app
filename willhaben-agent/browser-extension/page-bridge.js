/* Injected into the Willhaben page (MAIN world) — uses your login session. */
(function () {
  if (window.__whAgentBridge) return;
  window.__whAgentBridge = true;

  const AGENT = 'http://127.0.0.1:3860';
  const captured = [];

  function toast(msg, err) {
    let el = document.getElementById('wh-agent-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wh-agent-toast';
      el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#1a222d;color:#e8eef5;padding:12px 16px;border-radius:10px;border:1px solid #2f3d4f;max-width:380px;font:14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.4)';
      document.documentElement.appendChild(el);
    }
    el.style.borderColor = err ? '#ef4444' : '#3b82f6';
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 7000);
  }

  function ensureButton() {
    if (document.getElementById('wh-agent-sync-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'wh-agent-sync-btn';
    btn.type = 'button';
    btn.textContent = '⇢ Agent szinkron';
    btn.title = 'Üzenetek küldése a helyi Willhaben Agentre (127.0.0.1:3860)';
    btn.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:2147483647;background:#3b82f6;color:#fff;border:0;border-radius:999px;padding:12px 18px;font:600 14px system-ui;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    btn.addEventListener('click', () => runSync(btn));
    document.documentElement.appendChild(btn);
  }

  function isMessengerUrl(url) {
    return /webapi.*(messenger|chat|messaging|conversation|thread|nachricht|inbox|bff)/i.test(String(url || ''));
  }

  function rememberPayload(url, json) {
    if (!json || typeof json !== 'object') return;
    if (!isMessengerUrl(url) && !looksConvPayload(json)) return;
    captured.push({ url: String(url || ''), json, at: Date.now() });
    if (captured.length > 80) captured.shift();
  }

  function looksConvPayload(json) {
    const arr = pickArray(json, looksConv);
    return arr.length > 0;
  }

  // Capture what Willhaben already loads with the real session
  const origFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const res = await origFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : (input?.url || '');
      if (isMessengerUrl(url)) {
        const clone = res.clone();
        clone.json().then((j) => rememberPayload(url, j)).catch(() => {});
      }
    } catch { /* ignore */ }
    return res;
  };

  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__whUrl = url;
    return XO.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      try {
        if (!isMessengerUrl(this.__whUrl)) return;
        const ct = this.getResponseHeader('content-type') || '';
        if (!/json/i.test(ct) && !this.responseText?.trim()?.startsWith('{')) return;
        rememberPayload(this.__whUrl, JSON.parse(this.responseText));
      } catch { /* ignore */ }
    });
    return XS.apply(this, args);
  };

  function readCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function findAccessToken() {
    const keys = Object.keys(localStorage || {});
    for (const k of keys) {
      if (!/token|access|auth|oidc|oauth|session/i.test(k)) continue;
      let v = localStorage.getItem(k);
      if (!v) continue;
      try {
        const j = JSON.parse(v);
        v = j.accessToken || j.access_token || j.token || j.id_token || v;
      } catch { /* plain */ }
      if (typeof v === 'string' && v.length > 20 && !/\s/.test(v)) return v;
    }
    for (const k of keys) {
      try {
        const flat = JSON.stringify(JSON.parse(localStorage.getItem(k) || ''));
        const m = flat.match(/"access[_-]?token"\s*:\s*"([^"]{20,})"/i);
        if (m) return m[1];
      } catch { /* */ }
    }
    return null;
  }

  async function apiGet(path, token) {
    const headers = { accept: 'application/json' };
    const csrf = readCookie('x-bbx-csrf-token') || readCookie('XSRF-TOKEN') || readCookie('csrf');
    if (csrf) {
      headers['x-bbx-csrf-token'] = csrf;
      headers['x-xsrf-token'] = csrf;
      headers['x-csrf-token'] = csrf;
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await origFetch(path, { credentials: 'include', headers });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (data) rememberPayload(path, data);
    return data;
  }

  function pickArray(obj, pred) {
    const out = [];
    const walk = (x, depth) => {
      if (!x || depth > 8) return;
      if (Array.isArray(x)) {
        if (x.length && pred(x[0])) out.push(x);
        x.forEach((i) => walk(i, depth + 1));
        return;
      }
      if (typeof x === 'object') Object.values(x).forEach((v) => walk(v, depth + 1));
    };
    walk(obj, 0);
    return out.sort((a, b) => b.length - a.length)[0] || [];
  }

  function looksConv(o) {
    if (!o || typeof o !== 'object') return false;
    return Boolean(
      o.conversation_uuid || o.conversationUuid || o.conversationId || o.messageThreadId
      || o.seller_name || o.partnerName || o.last_message_text || o.ad_title || o.ad_uuid,
    );
  }

  function looksMsg(o) {
    if (!o || typeof o !== 'object') return false;
    return Boolean(o.message_text || o.message_body || o.messageText || o.text || o.body || o.content);
  }

  function normalizeConv(raw) {
    const id = String(
      raw.conversation_uuid || raw.conversationUuid || raw.conversationId
      || raw.messageThreadId || raw.id || '',
    );
    if (!id || id === 'undefined') return null;
    const partnerName = raw.seller_name || raw.partnerName || raw.counterpart?.name
      || raw.buyer?.name || raw.participant?.name || raw.displayName || raw.name || 'Beszélgetés';
    const adTitle = raw.ad_title || raw.adTitle || raw.advert?.heading || raw.heading || raw.title || '';
    const lastPreview = raw.last_message_text || raw.lastMessageText || raw.lastPreview
      || raw.lastMessage?.text || raw.latestMessage?.text || '';
    return {
      id,
      partnerName: String(partnerName).slice(0, 120),
      adTitle: String(adTitle).slice(0, 200),
      lastPreview: String(lastPreview).slice(0, 200),
      lastMessageAt: raw.last_message_at || raw.lastMessageAt || raw.updatedAt || new Date().toISOString(),
      unread: Boolean(raw.unread_count || raw.unread),
    };
  }

  function normalizeMsgs(payload) {
    const arr = pickArray(payload, looksMsg);
    return arr.map((m, i) => {
      const text = String(
        m.message_text || m.message_body || m.messageText || m.text || m.body || m.content || '',
      ).trim();
      if (!text || text.length > 5000) return null;
      const out = m.from_self || m.fromSelf || m.outgoing || m.is_own_message || m.isOwn || m.own;
      return {
        id: String(m.message_id || m.id || `m${i}`),
        direction: out ? 'out' : 'in',
        text,
        at: m.sent_at || m.created_at || m.createdAt || m.sentAt || new Date().toISOString(),
      };
    }).filter(Boolean);
  }

  const CONV_PATHS = [
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
    '/webapi/messenger/inbox',
    '/webapi/messenger/conversation-summaries',
    '/webapi/chat/conversations',
  ];

  function conversationsFromCaptured() {
    const byId = new Map();
    for (const item of captured) {
      const arr = pickArray(item.json, looksConv);
      for (const raw of arr) {
        const c = normalizeConv(raw);
        if (!c) continue;
        const prev = byId.get(c.id) || {};
        byId.set(c.id, {
          ...prev,
          ...c,
          lastPreview: c.lastPreview || prev.lastPreview || '',
          adTitle: c.adTitle || prev.adTitle || '',
          partnerName: c.partnerName !== 'Beszélgetés' ? c.partnerName : (prev.partnerName || c.partnerName),
        });
      }
      // messages payloads tied to a conversation id in the URL
      const mid = String(item.url).match(/conversations\/([^/?#]+)\/messages/i)?.[1]
        || String(item.url).match(/conversations\/([^/?#]+)/i)?.[1];
      if (mid) {
        const msgs = normalizeMsgs(item.json);
        if (msgs.length) {
          const cur = byId.get(decodeURIComponent(mid)) || {
            id: decodeURIComponent(mid),
            partnerName: 'Beszélgetés',
            adTitle: '',
            lastPreview: '',
            lastMessageAt: new Date().toISOString(),
          };
          cur.messages = msgs;
          if (!cur.lastPreview) cur.lastPreview = msgs[msgs.length - 1].text.slice(0, 200);
          byId.set(cur.id, cur);
        }
      }
    }
    return [...byId.values()];
  }

  async function loadConversations(token) {
    const fromNet = conversationsFromCaptured();
    if (fromNet.length) return fromNet;

    for (const p of CONV_PATHS) {
      const data = await apiGet(p, token);
      if (!data) continue;
      const arr = pickArray(data, looksConv);
      const list = arr.map(normalizeConv).filter(Boolean);
      if (list.length) return list;
    }
    return listFromDom();
  }

  function listFromDom() {
    const nodes = [...document.querySelectorAll(
      'a[href*="/iad/myprofile/chat/"], a[href*="conversation"], [role="listitem"], [data-testid*="conversation"]',
    )];
    const out = [];
    const seen = new Set();
    for (const el of nodes) {
      const text = (el.innerText || '').trim();
      if (!text || text.length < 2) continue;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const href = el.getAttribute('href') || '';
      const idMatch = href.match(/chat\/([^/?#]+)/) || href.match(/conversation[=/]([^/?#]+)/);
      const id = idMatch?.[1] || `dom-${lines[0]}-${lines[1] || ''}`.slice(0, 48);
      if (seen.has(id)) continue;
      seen.add(id);
      const preview = lines.at(-1) || '';
      out.push({
        id,
        partnerName: lines[0] || 'Beszélgetés',
        adTitle: lines[1] || '',
        lastPreview: preview,
        lastMessageAt: new Date().toISOString(),
        url: href.startsWith('http') ? href : (href ? `https://www.willhaben.at${href}` : null),
        messages: preview ? [{ id: 'p1', direction: 'in', text: preview, at: new Date().toISOString() }] : [],
      });
    }
    return out.slice(0, 80);
  }

  async function loadMessages(convId, token) {
    // Prefer already-captured traffic for this conversation
    for (const item of [...captured].reverse()) {
      if (!String(item.url).includes(encodeURIComponent(convId)) && !String(item.url).includes(convId)) continue;
      const msgs = normalizeMsgs(item.json);
      if (msgs.length) return msgs;
    }
    const paths = [
      `/webapi/bff/messenger/conversations/${encodeURIComponent(convId)}/messages`,
      `/webapi/messenger/conversations/${encodeURIComponent(convId)}/messages`,
      `/webapi/messenger/v1/conversations/${encodeURIComponent(convId)}/messages`,
      `/webapi/bff/messenger/conversations/${encodeURIComponent(convId)}`,
      `/webapi/messenger/conversations/${encodeURIComponent(convId)}`,
    ];
    for (const p of paths) {
      const data = await apiGet(p, token);
      if (!data) continue;
      const msgs = normalizeMsgs(data);
      if (msgs.length) return msgs;
    }
    return [];
  }

  async function pingAgent() {
    try {
      const res = await origFetch(`${AGENT}/api/status`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function runSync(btn) {
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Szinkron…';
      }
      if (!(await pingAgent())) {
        throw new Error('Az Agent nem fut. Indítsd: npm start → http://127.0.0.1:3860');
      }
      toast('Szinkron indul (saját Willhaben session)…');
      const token = findAccessToken();
      let conversations = await loadConversations(token);
      if (!conversations.length) {
        throw new Error('Nincs beszélgetés — nyisd meg a chat listát, várj 2 mp-et, próbáld újra.');
      }

      for (let i = 0; i < conversations.length; i++) {
        const c = conversations[i];
        if (btn) btn.textContent = `Szinkron ${i + 1}/${conversations.length}`;
        if (!c.messages?.length) {
          const msgs = await loadMessages(c.id, token);
          if (msgs.length) c.messages = msgs;
          else if (c.lastPreview) {
            c.messages = [{ id: 'preview-1', direction: 'in', text: c.lastPreview, at: c.lastMessageAt }];
          }
        }
      }

      const res = await origFetch(`${AGENT}/api/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: 'browser-extension',
          replaceAll: true,
          conversations,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const withMsg = conversations.filter((c) => c.messages?.length).length;
      toast(`Kész — ${data.count} beszélgetés (${withMsg} üzenettel) → Agent`);
      try { window.open(`${AGENT}/`, '_blank', 'noopener'); } catch { /* popup blocked */ }
    } catch (e) {
      toast(String(e.message || e), true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⇢ Agent szinkron';
      }
    }
  }

  window.__whAgentRunSync = runSync;
  ensureButton();
  setInterval(ensureButton, 2500);
})();
