// ==UserScript==
// @name         Willhaben Agent Sync
// @namespace    bocsa.willhaben.agent
// @version      2.0.0
// @description  Willhaben chat → http://127.0.0.1:3860 Agent (saját böngésző session)
// @match        https://www.willhaben.at/iad/myprofile/chat*
// @match        https://www.willhaben.at/iad/messenger*
// @match        https://www.willhaben.at/*/messenger*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  // Inline the same bridge as browser-extension/page-bridge.js
  const s = document.createElement('script');
  s.textContent = `(${function bridge() {
    /* eslint-disable */
    if (window.__whAgentBridge) return;
    window.__whAgentBridge = true;
    const AGENT = 'http://127.0.0.1:3860';
    const captured = [];
    function toast(msg, err) {
      let el = document.getElementById('wh-agent-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'wh-agent-toast';
        el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#1a222d;color:#e8eef5;padding:12px 16px;border-radius:10px;border:1px solid #2f3d4f;max-width:380px;font:14px system-ui';
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
      btn.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:2147483647;background:#3b82f6;color:#fff;border:0;border-radius:999px;padding:12px 18px;font:600 14px system-ui;cursor:pointer';
      btn.addEventListener('click', () => runSync(btn));
      document.documentElement.appendChild(btn);
    }
    function isMessengerUrl(url) {
      return /webapi.*(messenger|chat|messaging|conversation|thread|nachricht|inbox|bff)/i.test(String(url || ''));
    }
    function rememberPayload(url, json) {
      if (!json || typeof json !== 'object') return;
      captured.push({ url: String(url || ''), json, at: Date.now() });
      if (captured.length > 80) captured.shift();
    }
    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const res = await origFetch(input, init);
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (isMessengerUrl(url)) {
          res.clone().json().then((j) => rememberPayload(url, j)).catch(() => {});
        }
      } catch {}
      return res;
    };
    function readCookie(name) {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\\]{}()*+?.,\\\\^$|#\\s]/g, '\\\\$&') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    }
    function findAccessToken() {
      for (const k of Object.keys(localStorage || {})) {
        if (!/token|access|auth|oidc|oauth/i.test(k)) continue;
        let v = localStorage.getItem(k);
        try { const j = JSON.parse(v); v = j.accessToken || j.access_token || j.token || v; } catch {}
        if (typeof v === 'string' && v.length > 20 && !/\\s/.test(v)) return v;
      }
      return null;
    }
    async function apiGet(path, token) {
      const headers = { accept: 'application/json' };
      const csrf = readCookie('x-bbx-csrf-token');
      if (csrf) headers['x-bbx-csrf-token'] = csrf;
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await origFetch(path, { credentials: 'include', headers });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data) rememberPayload(path, data);
      return data;
    }
    function pickArray(obj, pred) {
      const out = [];
      const walk = (x, d) => {
        if (!x || d > 8) return;
        if (Array.isArray(x)) { if (x.length && pred(x[0])) out.push(x); x.forEach(i => walk(i, d + 1)); return; }
        if (typeof x === 'object') Object.values(x).forEach(v => walk(v, d + 1));
      };
      walk(obj, 0);
      return out.sort((a, b) => b.length - a.length)[0] || [];
    }
    function looksConv(o) {
      return o && (o.conversation_uuid || o.conversationId || o.id || o.seller_name || o.last_message_text || o.ad_title);
    }
    function looksMsg(o) {
      return o && (o.message_text || o.message_body || o.text || o.body || o.content);
    }
    function normalizeConv(raw) {
      const id = String(raw.conversation_uuid || raw.conversationUuid || raw.conversationId || raw.id || '');
      if (!id) return null;
      return {
        id,
        partnerName: String(raw.seller_name || raw.partnerName || raw.counterpart?.name || 'Beszélgetés').slice(0, 120),
        adTitle: String(raw.ad_title || raw.adTitle || raw.advert?.heading || '').slice(0, 200),
        lastPreview: String(raw.last_message_text || raw.lastMessageText || raw.lastPreview || '').slice(0, 200),
        lastMessageAt: raw.last_message_at || raw.lastMessageAt || new Date().toISOString(),
        unread: Boolean(raw.unread_count || raw.unread),
      };
    }
    function normalizeMsgs(payload) {
      return pickArray(payload, looksMsg).map((m, i) => {
        const text = String(m.message_text || m.message_body || m.text || m.body || m.content || '').trim();
        if (!text) return null;
        return {
          id: String(m.message_id || m.id || 'm' + i),
          direction: (m.from_self || m.fromSelf || m.outgoing || m.is_own_message) ? 'out' : 'in',
          text,
          at: m.sent_at || m.created_at || m.createdAt || new Date().toISOString(),
        };
      }).filter(Boolean);
    }
    function conversationsFromCaptured() {
      const byId = new Map();
      for (const item of captured) {
        for (const raw of pickArray(item.json, looksConv)) {
          const c = normalizeConv(raw);
          if (c) byId.set(c.id, Object.assign(byId.get(c.id) || {}, c));
        }
      }
      return [...byId.values()];
    }
    async function loadConversations(token) {
      const fromNet = conversationsFromCaptured();
      if (fromNet.length) return fromNet;
      for (const p of ['/webapi/bff/messenger/conversations', '/webapi/bff/messenger/conversations?page=0&size=50', '/webapi/bff/messenger/conversation-summaries', '/webapi/messenger/conversations']) {
        const data = await apiGet(p, token);
        if (!data) continue;
        const list = pickArray(data, looksConv).map(normalizeConv).filter(Boolean);
        if (list.length) return list;
      }
      return [];
    }
    async function loadMessages(id, token) {
      for (const item of [...captured].reverse()) {
        if (!String(item.url).includes(id)) continue;
        const msgs = normalizeMsgs(item.json);
        if (msgs.length) return msgs;
      }
      for (const p of [
        '/webapi/bff/messenger/conversations/' + encodeURIComponent(id) + '/messages',
        '/webapi/messenger/conversations/' + encodeURIComponent(id) + '/messages',
      ]) {
        const data = await apiGet(p, token);
        if (!data) continue;
        const msgs = normalizeMsgs(data);
        if (msgs.length) return msgs;
      }
      return [];
    }
    async function runSync(btn) {
      try {
        btn.disabled = true; btn.textContent = 'Szinkron…';
        const ping = await origFetch(AGENT + '/api/status').then(r => r.ok).catch(() => false);
        if (!ping) throw new Error('Az Agent nem fut (npm start → 127.0.0.1:3860)');
        toast('Szinkron indul…');
        const token = findAccessToken();
        const conversations = await loadConversations(token);
        if (!conversations.length) throw new Error('Nincs beszélgetés — nyisd meg a chat listát, várj, próbáld újra.');
        for (let i = 0; i < conversations.length; i++) {
          btn.textContent = 'Szinkron ' + (i + 1) + '/' + conversations.length;
          const msgs = await loadMessages(conversations[i].id, token);
          conversations[i].messages = msgs.length ? msgs : (conversations[i].lastPreview ? [{ id: 'p1', direction: 'in', text: conversations[i].lastPreview, at: conversations[i].lastMessageAt }] : []);
        }
        const res = await origFetch(AGENT + '/api/import', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ source: 'userscript', replaceAll: true, conversations }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        toast('Kész — ' + data.count + ' beszélgetés → Agent');
      } catch (e) {
        toast(String(e.message || e), true);
      } finally {
        btn.disabled = false; btn.textContent = '⇢ Agent szinkron';
      }
    }
    window.__whAgentRunSync = runSync;
    ensureButton();
    setInterval(ensureButton, 2500);
  }})()`;
  (document.documentElement || document.head).appendChild(s);
  s.remove();
})();
