import fs from 'fs';
import path from 'path';
import { loadConfig, getProfileDir, getDataDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';
import {
  loadStore,
  saveStore,
  upsertConversation,
  makeConversationId,
  appendOutbound,
  pruneMissingConversations,
} from './store.mjs';
import {
  attachCapturedPayloads,
  extractAccessToken,
  fetchConversations,
  fetchMessages,
  installNetworkCapture,
  isMessengerUrl,
  parseMessagesPayload,
  saveCapturedRaw,
  saveSyncDebug,
  sendMessageViaApi,
  deleteConversationViaApi,
  deleteMessageViaApi,
} from './messenger-api.mjs';

async function isLoginPage(page) {
  const url = page.url();
  if (/sso\.willhaben\.at|\/auth\/|\/iad\/myprofile\/login/i.test(url)) return true;

  const hasPassword = await page.locator('input[type="password"]')
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (hasPassword) return true;

  const hasLoginHeading = await page.getByRole('heading', { name: /einloggen|anmelden/i })
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  return hasLoginHeading;
}

async function ensureLoggedIn(page) {
  if (await isLoginPage(page)) {
    throw new Error('Nincs bejelentkezve. Futtasd az asztali LOGIN ikont, vagy: wh-agent login');
  }
}

async function warmSession(page) {
  await page.goto('https://www.willhaben.at/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await dismissConsent(page);
  await page.waitForTimeout(1000);
}

async function waitForChatReady(page, chatUrl, timeoutMs = 90000) {
  await warmSession(page);

  const messengerResponse = page.waitForResponse(
    (response) => (isMessengerUrl(response.url()) || /webapi.*(conversation|thread|messenger|chat)/i.test(response.url()))
      && response.status() === 200,
    { timeout: timeoutMs },
  ).catch(() => null);

  await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await dismissConsent(page);
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
  await messengerResponse;

  // Give the SPA time to hydrate with OAuth token + load inbox
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(1500);
    const hasList = await page.locator(
      'a[href*="/iad/myprofile/chat/"], [data-testid*="conversation"], [role="listitem"], main li, main button',
    ).first().isVisible({ timeout: 500 }).catch(() => false);
    if (hasList) break;
  }
}

async function saveDebugSnapshot(page, label) {
  try {
    const dir = path.join(getDataDir(), 'debug');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = `${label}-${Date.now()}`;
    await page.screenshot({ path: path.join(dir, `${stamp}.png`), fullPage: true }).catch(() => {});
    const html = await page.content().catch(() => '');
    if (html) fs.writeFileSync(path.join(dir, `${stamp}.html`), html);
    return dir;
  } catch {
    return null;
  }
}

function normalizeConversation(thread) {
  const id = thread.id || makeConversationId(thread.url || `${thread.partnerName}:${thread.adTitle}`);
  return {
    id,
    url: thread.url || null,
    partnerName: thread.partnerName || 'Ismeretlen',
    adTitle: thread.adTitle || '',
    lastPreview: thread.lastPreview || '',
    unread: Boolean(thread.unread),
    lastMessageAt: thread.lastMessageAt || new Date().toISOString(),
  };
}

/** Extract conversation list from the live DOM after SPA render. */
async function listThreadsFromDom(page) {
  const items = await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const junkLine = (t) => /zuletzt online|willhaben-?code|vor \d|ungelesen|cookie|datenschutz|einloggen|anmelden|hilfe|^(heute|gestern|today|yesterday)$/i.test(String(t || '').trim());

    const candidates = [
      ...document.querySelectorAll('a[href*="/iad/myprofile/chat/"]'),
      ...document.querySelectorAll('a[href*="/iad/messenger"]'),
      ...document.querySelectorAll('[data-testid*="conversation"]'),
      ...document.querySelectorAll('[data-testid*="thread"]'),
      ...document.querySelectorAll('[role="listitem"]'),
      ...document.querySelectorAll('main li'),
      ...document.querySelectorAll('aside button, nav button, [class*="conversation"] button, [class*="thread"] button'),
    ];

    for (const el of candidates) {
      const href = el.getAttribute?.('href') || el.querySelector?.('a')?.getAttribute('href') || '';
      const text = (el.innerText || el.textContent || '').trim();
      if (!text || text.length < 2) continue;
      if (/einloggen|anmelden|cookie|datenschutz|hilfe/i.test(text) && text.length < 40) continue;

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length || junkLine(lines[0])) continue;
      // Metadata rows mistaken as conversations
      if (lines.every((l) => junkLine(l) || /^\d{1,2}:\d{2}$/.test(l))) continue;

      const key = href || lines.slice(0, 2).join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      let fullHref = href;
      if (fullHref && !fullHref.startsWith('http')) {
        fullHref = new URL(fullHref, location.origin).href;
      }
      if (fullHref && /\/iad\/myprofile\/chat\/?$/.test(fullHref)) continue;
      if (fullHref && /\/iad\/messenger\/?(\?.*)?$/.test(fullHref)) continue;

      out.push({
        href: fullHref || null,
        lines,
        text: text.slice(0, 400),
      });
    }
    return out.slice(0, 80);
  });

  return items.map((item) => {
    const seed = item.href || item.text;
    return {
      id: makeConversationId(seed),
      url: item.href,
      partnerName: item.lines[0] || 'Ismeretlen',
      adTitle: item.lines[1] || '',
      lastPreview: item.lines.at(-1) || '',
      unread: /ungelesen|neu\b|unread/i.test(item.text),
      lastMessageAt: new Date().toISOString(),
      _dom: true,
    };
  }).filter((t) => !isJunkListPartner(t.partnerName, t.adTitle, t.lastPreview));
}

function isJunkListPartner(...parts) {
  const blob = parts.filter(Boolean).join(' ');
  return /zuletzt online|willhaben-?code|optimizely|audience|feature.?flag|^(heute|gestern)$/i.test(blob);
}

/**
 * Leaf message bubbles only — never the whole thread container
 * (which produced the grey "Heute + all messages" dump).
 */
async function readMessagesFromDom(page) {
  const msgs = await page.evaluate(() => {
    const pickRoot = () => {
      const candidates = [
        document.querySelector('[data-testid*="thread"]'),
        document.querySelector('[data-testid*="chat-thread"]'),
        document.querySelector('[role="log"]'),
        document.querySelector('main [class*="thread" i]'),
        document.querySelector('main [class*="chat" i]'),
        document.querySelector('main'),
        document.querySelector('[role="main"]'),
      ].filter(Boolean);
      return candidates[0] || document.body;
    };
    const root = pickRoot();
    const selector = [
      '[data-testid*="message"]',
      '[class*="message" i]',
      '[class*="Message"]',
      '[role="log"] > *',
    ].join(', ');
    const nodes = [...root.querySelectorAll(selector)];

    const out = [];
    const seen = new Set();

    for (const node of nodes) {
      if (node.closest('aside, nav, [role="navigation"], [class*="conversation-list" i]')) continue;

      // Skip containers that wrap other message nodes (the dump bubble)
      const childMsgs = [...node.querySelectorAll(selector)].filter((c) => c !== node);
      if (childMsgs.length > 0) continue;

      const text = (node.innerText || node.textContent || '').trim();
      if (!text || text.length < 1 || text.length > 2000) continue;

      // Date-header dumps: "Heute\n…\n09:43\n…" (newlines OR flattened to spaces)
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (/^(heute|gestern|today|yesterday)\b/i.test(text) && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) continue;
      if (/^(heute|gestern|today|yesterday)$/i.test(lines[0] || '')) continue;
      if (lines.length >= 4 && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) continue;
      if (lines.length > 6) continue;

      // Pure timestamps / metadata
      if (/^(heute|gestern|\d{1,2}:\d{2}|zuletzt online)/i.test(text) && lines.length <= 2) continue;

      if (seen.has(text)) continue;
      seen.add(text);

      const cls = `${node.className || ''} ${node.getAttribute('aria-label') || ''}`.toLowerCase();
      let direction = /outgoing|sent|own|self|outbound|me\b|from-me|message--out/i.test(cls) ? 'out' : 'in';
      // Heuristic: our offers often contain "Ich biete" / "Lg Robert"
      if (/ich biete|lg\s+robert|würde ich|mein angebot/i.test(text)) direction = 'out';
      out.push({ text, direction });
    }
    return out.slice(0, 200);
  });

  return sanitizeDomMessages(msgs.map((m, i) => ({
    id: `m${i}`,
    direction: m.direction,
    text: m.text,
    at: new Date().toISOString(),
  })));
}

/** Drop dump-like / duplicate concatenated bubbles. */
export function sanitizeDomMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const cleaned = list.filter((m) => {
    const text = String(m?.text || '').trim();
    if (!text) return false;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (/^(heute|gestern|today|yesterday)\b/i.test(text) && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) return false;
    if (/^(heute|gestern|today|yesterday)$/i.test(lines[0] || '') && lines.length > 1) return false;
    if (lines.length >= 4 && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) return false;
    if (lines.length > 8) return false;
    return true;
  });

  // Drop a bubble whose text is just the concatenation of other bubbles
  const texts = cleaned.map((m) => m.text.trim());
  return cleaned.filter((m, idx) => {
    const t = m.text.trim();
    const others = texts.filter((_, i) => i !== idx);
    if (others.length < 2) return true;
    const joined = others.join('\n');
    if (t === joined || t.replace(/\s+/g, ' ') === others.join(' ')) return false;
    // Contains two+ other full messages → dump remnant
    let hits = 0;
    for (const o of others) {
      if (o.length > 12 && t.includes(o)) hits += 1;
    }
    return hits < 2;
  });
}

/**
 * Reject DOM messages that greet a different person than the conversation partner.
 */
export function domMessagesMatchPartner(messages, partnerName) {
  const first = String(partnerName || '').trim().split(/\s+/)[0];
  if (!first || first.length < 3) return true;
  const want = first.toLowerCase();
  const greets = [];
  for (const m of messages || []) {
    const re = /hallo\s+([A-Za-zÄÖÜäöüß]{2,40})/gi;
    let match;
    while ((match = re.exec(String(m.text || '')))) {
      greets.push(match[1].toLowerCase());
    }
  }
  if (!greets.length) return true;
  // At least one greeting should match this partner; none may be only-others
  if (greets.some((g) => g === want || want.startsWith(g) || g.startsWith(want))) return true;
  return false;
}

/**
 * Verify the *active thread pane header / message log* — not the sidebar list
 * (list lives inside main on Willhaben, so main.innerText always has every name).
 */
async function verifyActiveThread(page, thread) {
  const partner = String(thread.partnerName || '').trim();
  const ad = String(thread.adTitle || '').trim();
  const id = String(thread.id || '').trim();

  return page.evaluate(
    ({ partner, ad, id }) => {
      const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const p = norm(partner);
      const a = norm(ad);
      const cid = norm(id);
      const href = norm(location.href);
      const first = p.split(/\s+/)[0];

      if (cid && href.includes(cid)) return true;

      // Prefer message log + its nearby header — NOT the whole main (contains list)
      const log = document.querySelector('[role="log"]')
        || document.querySelector('[data-testid*="message-list"]')
        || document.querySelector('[data-testid*="thread"]');

      const headerCandidates = [];
      if (log) {
        const pane = log.closest('section, article, [class*="thread" i], [class*="chat" i]') || log.parentElement;
        if (pane) {
          const heads = pane.querySelectorAll('h1, h2, h3, header, [class*="header" i], [class*="title" i]');
          for (const h of heads) headerCandidates.push(norm(h.innerText || h.textContent || ''));
        }
        // First few lines above the log
        const prev = log.previousElementSibling;
        if (prev) headerCandidates.push(norm(prev.innerText || '').slice(0, 200));
      }

      for (const h of headerCandidates) {
        if (!h || h.length < 2) continue;
        if (first && h.includes(first)) return true;
        if (p && h.includes(p)) return true;
        if (a && a.length > 8 && h.includes(a)) return true;
      }

      // Fallback: only the log text (bubbles) — partner name rarely there, but id might be
      if (log) {
        const t = norm(log.innerText || '').slice(0, 3000);
        if (cid && t.includes(cid)) return true;
        // Greeting to this partner inside the open thread
        if (first && first.length >= 3) {
          const re = new RegExp(`hallo\\s+${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
          if (re.test(t)) return true;
        }
      }

      return false;
    },
    { partner, ad, id },
  ).catch(() => false);
}

async function isWillhaben404(page) {
  return page.evaluate(() => {
    const t = (document.body?.innerText || '').slice(0, 2000);
    return /Die Seite wurde nicht gefunden|page was not found|Bring mich zur Startseite/i.test(t);
  }).catch(() => false);
}

/**
 * Opens a conversation safely via the inbox list.
 * Avoids /iad/messenger?conversation=… and /chat/{id} deep-links that 404.
 */
async function openThread(page, thread, chatUrl) {
  const inbox = chatUrl || 'https://www.willhaben.at/iad/myprofile/chat';
  const partner = String(thread.partnerName || '').trim();
  const realUrl = thread.url
    && /\/iad\/myprofile\/chat\//i.test(thread.url)
    && !/\/iad\/myprofile\/chat\/?$/i.test(thread.url)
    ? thread.url
    : null;

  if (realUrl) {
    await page.goto(realUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await dismissConsent(page);
    await page.waitForTimeout(1000);
    if (!(await isWillhaben404(page)) && (await verifyActiveThread(page, thread))) {
      return true;
    }
  }

  await page.goto(inbox, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissConsent(page);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);

  if (await isWillhaben404(page)) {
    // Rare: inbox itself broken
    return false;
  }

  if (partner) {
    const clicked = await page.evaluate((n) => {
      const want = String(n).toLowerCase();
      const nodes = [...document.querySelectorAll('a, button, [role="button"], [role="link"], li, [role="listitem"]')];
      for (const el of nodes) {
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (!t || t.length < 2 || t.length > 220) continue;
        if (!t.includes(want)) continue;
        // Prefer short list rows
        if (t.split('\n').length > 8) continue;
        (el.closest('a, button, [role="button"], [role="link"], li') || el).click();
        return true;
      }
      return false;
    }, partner).catch(() => false);

    if (clicked) {
      await page.waitForTimeout(1800);
      if (await isWillhaben404(page)) {
        await page.goto(inbox, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
        return false;
      }
      if (await verifyActiveThread(page, thread)) return true;
      // Soft accept: partner name visible after click and not on 404
      const soft = await page.evaluate((n) => {
        const main = document.querySelector('main') || document.body;
        return (main?.innerText || '').toLowerCase().includes(String(n).toLowerCase());
      }, partner).catch(() => false);
      if (soft) return true;
    }
  }

  return false;
}

export function messageFingerprint(messages) {
  return (messages || [])
    .map((m) => `${m.direction}:${String(m.text || '').trim()}`)
    .join('\n');
}

/** Click each conversation in the list and scrape messages — most reliable for SPA. */
async function importViaDomClicks(page, chatUrl, onProgress) {
  await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissConsent(page);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const threads = await listThreadsFromDom(page);
  if (!threads.length) return [];

  const results = [];
  const seenFingerprints = new Map();
  for (let i = 0; i < Math.min(threads.length, 40); i++) {
    const t = threads[i];
    onProgress?.(`DOM ${i + 1}/${threads.length}: ${t.partnerName}`);

    try {
      const opened = await openThread(page, t, chatUrl);
      let messages = [];
      if (opened) {
        const domMsgs = await readMessagesFromDom(page);
        if (domMsgs.length && domMessagesMatchPartner(domMsgs, t.partnerName)) {
          messages = domMsgs;
          const fp = messageFingerprint(messages);
          if (fp && seenFingerprints.has(fp)) {
            onProgress?.(`  ⚠ DOM üzenetütközés, skip: ${t.partnerName}`);
            messages = [];
          } else if (fp) {
            seenFingerprints.set(fp, t.id);
          }
        }
      }
      results.push({
        ...normalizeConversation(t),
        messages: messages.length ? messages : undefined,
        syncedAt: new Date().toISOString(),
      });
    } catch {
      results.push({ ...normalizeConversation(t), syncedAt: new Date().toISOString() });
    }
  }
  return results;
}

function messagesFromCaptured(captured, conversationId) {
  if (!conversationId) return [];
  const all = [];
  for (const item of captured) {
    if (!item?.json) continue;
    const url = item.url || '';
    // CSAK az ehhez a beszélgetéshez tartozó válaszok — ne másoljuk az összes üzenetet mindenhova
    const urlMatch = url.includes(encodeURIComponent(conversationId)) || url.includes(conversationId);
    if (!urlMatch) continue;

    const msgs = parseMessagesPayload(item.json);
    for (const m of msgs) all.push({ ...m });
  }
  const seen = new Set();
  return all.filter((m) => {
    const k = `${m.direction}:${m.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function messagesFromConversationRaw(conv) {
  if (!conv) return [];
  if (Array.isArray(conv.messages) && conv.messages.length) {
    return conv.messages.map((m) => ({ ...m }));
  }
  if (conv._raw) {
    const nested = parseMessagesPayload(conv._raw);
    if (nested.length) return nested.map((m) => ({ ...m }));
  }
  return [];
}

/** Ha nincs message lista, legalább az előnézet jelenjen meg (lista ↔ részlet egyezés). */
export function messagesFromPreview(conv) {
  const text = String(conv?.lastPreview || '').trim();
  if (!text || text.length < 2) return [];
  if (/zuletzt online|willhaben-?code/i.test(text)) return [];
  return [{
    id: 'preview-1',
    direction: 'in',
    text,
    at: conv.lastMessageAt || new Date().toISOString(),
  }];
}

function ensureConversationMessages(t, messages, previousMessages) {
  let out = sanitizeDomMessages(messages || []);
  if (out.length && !domMessagesMatchPartner(out, t.partnerName)) {
    out = [];
  }
  if (!out.length) {
    out = messagesFromPreview(t);
  }
  if (!out.length && previousMessages?.length) {
    const prev = sanitizeDomMessages(previousMessages.map((m) => ({ ...m })));
    if (prev.length && domMessagesMatchPartner(prev, t.partnerName)) {
      out = prev;
    }
  }
  return out;
}

async function runSyncAttempt({ headless, onProgress }) {
  const config = loadConfig();
  const { context } = await launchBrowser(getProfileDir(), { headless });
  const page = context.pages()[0] || (await context.newPage());

  // CRITICAL: capture SPA traffic BEFORE any navigation — SPA has OAuth token
  const captured = installNetworkCapture(page);

  try {
    onProgress?.('Chat megnyitása…');
    await waitForChatReady(page, config.chatUrl);
    await ensureLoggedIn(page);

    const accessToken = await extractAccessToken(page);
    onProgress?.(accessToken ? 'Token OK — API lekérés…' : 'Token nincs — SPA capture + DOM…');

    let conversations = [];
    let source = null;
    let probes = [];
    let rawSamples = [];

    // 1) Network capture from SPA's own authenticated requests
    if (captured.length) {
      conversations = attachCapturedPayloads(captured, []);
      if (conversations.length) source = 'spa-network-capture';
    }

    // 2) API with bearer token from localStorage
    if (!conversations.length) {
      const api = await fetchConversations(context, { page, accessToken });
      conversations = api.conversations;
      probes = api.probes;
      rawSamples = api.rawSamples;
      if (conversations.length) source = api.source;
      if (api.unauthorized && !accessToken) {
        // not fatal yet — try DOM
      }
    }

    // 3) DOM list
    if (!conversations.length) {
      onProgress?.('DOM lista…');
      conversations = await listThreadsFromDom(page);
      if (conversations.length) source = 'dom-list';
    }

    const capturedFile = saveCapturedRaw(captured);
    const debugFile = saveSyncDebug('sync-probe', {
      headless,
      pageUrl: page.url(),
      hasAccessToken: Boolean(accessToken),
      capturedCount: captured.length,
      capturedUrls: captured.map((c) => c.url).slice(0, 40),
      capturedFile,
      probes,
      rawSamples,
      conversationCount: conversations.length,
      source,
    });

    // 4) Full DOM click-through import (most reliable when API shape unknown)
    if (!conversations.length) {
      onProgress?.('DOM kattintásos import…');
      const domConvs = await importViaDomClicks(page, config.chatUrl, onProgress);
      if (domConvs.length) {
        const store = loadStore();
        for (const c of domConvs) upsertConversation(store, c);
        store.lastSyncAt = new Date().toISOString();
        store.lastSyncError = null;
        store.lastSyncDebug = { source: 'dom-click', debugFile, capturedFile };
        saveStore(store);
        return { ok: true, count: domConvs.length, source: 'dom-click' };
      }
    }

    if (!conversations.length) {
      const debugDir = await saveDebugSnapshot(page, 'sync-empty');
      throw new Error(
        'Nem található beszélgetés. '
        + '1) Asztali LOGIN → várj a chat listára → zárd be. '
        + '2) SZINKRON újra. '
        + (debugDir ? `Debug: ${debugDir}` : '')
        + (capturedFile ? ` Capture: ${capturedFile}` : ''),
      );
    }

    const store = loadStore();
    // Ne töröld előre az összes üzenetet — ha a fetch üres, megmaradhat a jó előző / preview
    const previousById = new Map(
      (store.conversations || []).map((c) => [c.id, Array.isArray(c.messages) ? c.messages : []]),
    );
    onProgress?.(`${conversations.length} beszélgetés (${source})`);

    const seenFingerprints = new Map(); // fingerprint -> conversation id

    for (let i = 0; i < conversations.length; i++) {
      const rawConv = conversations[i];
      const t = normalizeConversation(rawConv);
      onProgress?.(`${i + 1}/${conversations.length}: ${t.partnerName}`);

      let messages = messagesFromConversationRaw(rawConv);
      if (!messages.length) {
        messages = await fetchMessages(context, t.id, { page, accessToken });
      }
      if (!messages.length) {
        messages = messagesFromCaptured(captured, t.id);
      }
      messages = sanitizeDomMessages(messages);

      // DOM csak üres API esetén, és csak ha a szál + partner stimmel
      if (!messages.length) {
        try {
          const opened = await openThread(page, rawConv, config.chatUrl);
          if (opened) {
            const domMsgs = await readMessagesFromDom(page);
            if (
              domMsgs.length
              && domMessagesMatchPartner(domMsgs, t.partnerName)
            ) {
              messages = domMsgs.map((m) => ({ ...m }));
            }
          }
        } catch {
          /* keep empty */
        }
      }

      // Ütközés / rossz partner → ne oszd szét, de preview / előző maradhat
      let fp = messageFingerprint(messages);
      if (fp && seenFingerprints.has(fp)) {
        onProgress?.(`  ⚠ üzenetütközés, egyedi forrás nélkül: ${t.partnerName}`);
        messages = [];
        fp = '';
      }
      if (messages.length && !domMessagesMatchPartner(messages, t.partnerName)) {
        onProgress?.(`  ⚠ rossz partnerüzenet: ${t.partnerName}`);
        messages = [];
        fp = '';
      }

      messages = ensureConversationMessages(t, messages, previousById.get(t.id));
      fp = messageFingerprint(messages);
      // Preview-only fingerprint (ugyanaz a szöveg több listában) — engedjük, de ne blokkoljuk a többit tévesen
      if (fp && messages.length > 1 && seenFingerprints.has(fp)) {
        messages = ensureConversationMessages(t, [], previousById.get(t.id));
        fp = messageFingerprint(messages);
      }
      if (fp && messages.length > 1) seenFingerprints.set(fp, t.id);

      upsertConversation(store, {
        ...t,
        messages: messages.map((m) => ({ ...m })),
        syncedAt: new Date().toISOString(),
      });
    }

    // Willhabenről törölt / eltűnt beszélgetések → helyi törlés
    const remoteIds = conversations.map((raw) => normalizeConversation(raw).id).filter(Boolean);
    const pruned = pruneMissingConversations(store, remoteIds);
    if (pruned) onProgress?.(`${pruned} eltűnt beszélgetés törölve`);

    store.lastSyncAt = new Date().toISOString();
    store.lastSyncError = null;
    store.lastSyncDebug = { source, probes, debugFile, capturedFile, hasAccessToken: Boolean(accessToken), pruned };
    saveStore(store);
    return { ok: true, count: conversations.length, source, pruned };
  } catch (err) {
    const store = loadStore();
    store.lastSyncError = err.message;
    saveSyncDebug('sync-error', { headless, message: err.message, stack: err.stack });
    saveStore(store);
    throw err;
  } finally {
    await context.close().catch(() => {});
  }
}

export async function syncInbox({ onProgress } = {}) {
  // Visible browser first — same profile as login, SPA can load OAuth
  try {
    return await runSyncAttempt({ headless: false, onProgress });
  } catch (err) {
    if (/bejelentkezve|LOGIN/i.test(err.message)) throw err;
    onProgress?.('Újrapróbálás headless…');
    return runSyncAttempt({ headless: true, onProgress });
  }
}

export async function sendReply(conversationId, text) {
  const config = loadConfig();
  const store = loadStore();
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) throw new Error('Nincs ilyen beszélgetés');
  if (!text?.trim()) throw new Error('Üres üzenet');

  const { context } = await launchBrowser(getProfileDir(), { headless: false });
  const page = context.pages()[0] || (await context.newPage());

  try {
    const opened = await openThread(page, conv, config.chatUrl);
    await ensureLoggedIn(page);
    if (!opened) {
      throw new Error(`Nem sikerült megnyitni a beszélgetést: ${conv.partnerName || conversationId}`);
    }
    const accessToken = await extractAccessToken(page);

    const sentViaApi = await sendMessageViaApi(context, conversationId, text.trim(), { page, accessToken });
    if (!sentViaApi) {
      const selectors = [
        'textarea[placeholder*="Nachricht"]',
        '[data-testid*="message-input"] textarea',
        'textarea',
        '[contenteditable="true"][role="textbox"]',
      ];
      let input = null;
      for (const sel of selectors) {
        const loc = page.locator(sel).first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          input = loc;
          break;
        }
      }
      if (!input) throw new Error('Nincs üzenetmező — futtasd újra a LOGIN ikont');

      await input.fill(text.trim());
      const send = page.getByRole('button', { name: /senden|absenden|send/i }).first();
      if (await send.isVisible({ timeout: 2000 }).catch(() => false)) {
        await send.click({ timeout: 8000 });
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(config.sendDelayMs ?? 1500);
    }

    appendOutbound(store, conversationId, text.trim());
    saveStore(store);
    return { ok: true };
  } finally {
    await context.close().catch(() => {});
  }
}

/** DOM: menü → Löschen / Delete a nyitott beszélgetésen. */
async function deleteOpenThreadViaDom(page) {
  const menuSelectors = [
    'main button[aria-label*="Mehr" i]',
    'main button[aria-label*="Option" i]',
    'main button[aria-label*="Menü" i]',
    'main button[aria-label*="menu" i]',
    'main button[aria-label*="More" i]',
    'main [data-testid*="more" i]',
    'main [data-testid*="menu" i]',
    'main button[aria-haspopup="menu"]',
    'header button[aria-haspopup="menu"]',
    'button[aria-label*="Mehr" i]',
    'button[aria-haspopup="menu"]',
  ];

  for (const sel of menuSelectors) {
    const buttons = page.locator(sel);
    const n = await buttons.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 5); i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible({ timeout: 400 }).catch(() => false))) continue;
      await btn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
      const deleteBtn = page.getByRole('menuitem', { name: /löschen|delete|entfernen|archivieren/i }).first()
        .or(page.getByRole('button', { name: /löschen|delete|entfernen|chat löschen|konversation löschen/i }).first())
        .or(page.locator('[role="menuitem"], button, a').filter({ hasText: /löschen|delete|archivieren/i }).first());
      if (await deleteBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await deleteBtn.click({ timeout: 5000 });
        await page.waitForTimeout(500);
        const confirm = page.getByRole('button', { name: /löschen|bestätigen|ja|ok|delete|confirm|entfernen/i }).last();
        if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirm.click({ timeout: 5000 }).catch(() => {});
        }
        await page.waitForTimeout(1500);
        return true;
      }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  return false;
}

/** Lista soron: partner → menü → Löschen */
async function deleteFromInboxListViaDom(page, partnerName) {
  const partner = String(partnerName || '').trim();
  if (!partner) return false;

  const openedMenu = await page.evaluate((n) => {
    const want = String(n).toLowerCase();
    const rows = [...document.querySelectorAll('a, button, [role="button"], [role="listitem"], li')];
    for (const el of rows) {
      const t = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (!t || !t.includes(want) || t.length > 280) continue;
      const row = el.closest('li, [role="listitem"], a, button') || el;
      const menu = row.querySelector('button[aria-haspopup="menu"], button[aria-label*="Mehr" i], button[aria-label*="More" i], button[aria-label*="Option" i], [data-testid*="more" i]');
      if (menu) {
        menu.click();
        return 'menu';
      }
      row.click();
      return 'open';
    }
    return null;
  }, partner).catch(() => null);

  await page.waitForTimeout(800);

  if (openedMenu === 'menu') {
    const deleteBtn = page.getByRole('menuitem', { name: /löschen|delete|entfernen|archiv/i }).first()
      .or(page.locator('[role="menuitem"], button').filter({ hasText: /löschen|delete|archivieren/i }).first());
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click({ timeout: 5000 });
      await page.waitForTimeout(400);
      const confirm = page.getByRole('button', { name: /löschen|bestätigen|ja|ok|delete|confirm/i }).last();
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.click({ timeout: 4000 }).catch(() => {});
      }
      await page.waitForTimeout(1200);
      return true;
    }
  }

  if (openedMenu === 'open') {
    return deleteOpenThreadViaDom(page);
  }
  return false;
}

/**
 * Törlés Willhabenről + helyi store.
 * Inbox + API → lista DOM → thread DOM. Nincs /iad/messenger deep-link (404).
 */
export async function deleteConversationRemote(conversationId) {
  const config = loadConfig();
  const store = loadStore();
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) throw new Error('Nincs ilyen beszélgetés');

  const inbox = config.chatUrl || 'https://www.willhaben.at/iad/myprofile/chat';
  const { context } = await launchBrowser(getProfileDir(), { headless: false });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(inbox, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissConsent(page);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await ensureLoggedIn(page);

    if (await isWillhaben404(page)) {
      throw new Error('Willhaben chat oldal 404 — nem érhető el a messenger.');
    }

    const accessToken = await extractAccessToken(page);
    let remote = await deleteConversationViaApi(context, conversationId, { page, accessToken });

    if (!remote.ok) {
      const listOk = await deleteFromInboxListViaDom(page, conv.partnerName);
      if (listOk) remote = { ok: true, via: 'dom-list' };
    }

    if (!remote.ok) {
      const opened = await openThread(page, conv, inbox);
      if (opened && !(await isWillhaben404(page))) {
        const domOk = await deleteOpenThreadViaDom(page);
        if (domOk) remote = { ok: true, via: 'dom-thread' };
      }
    }

    if (!remote.ok) {
      // Ne rejtsük el örökre — sync visszahozza Willhabenről
      const { deleteConversation } = await import('./store.mjs');
      deleteConversation(store, conversationId);
      saveStore(store);
      return {
        ok: true,
        remote,
        warning: `Agentől ideiglenesen törölve, Willhabenről NEM. `
          + 'Szinkron után visszajön. Töröld manuálisan a Willhaben chaten, vagy próbáld újra.',
      };
    }

    const { deleteConversation } = await import('./store.mjs');
    deleteConversation(store, conversationId);
    saveStore(store);
    return { ok: true, remote };
  } finally {
    await context.close().catch(() => {});
  }
}

export async function deleteMessageRemote(conversationId, messageId) {
  const config = loadConfig();
  const store = loadStore();
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) throw new Error('Nincs ilyen beszélgetés');

  const inbox = config.chatUrl || 'https://www.willhaben.at/iad/myprofile/chat';
  const { context } = await launchBrowser(getProfileDir(), { headless: false });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(inbox, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissConsent(page);
    await ensureLoggedIn(page);
    const accessToken = await extractAccessToken(page);

    const remote = await deleteMessageViaApi(context, conversationId, messageId, { page, accessToken });
    const { deleteMessage } = await import('./store.mjs');
    if (!deleteMessage(store, conversationId, messageId)) {
      throw new Error('Nincs ilyen üzenet');
    }
    saveStore(store);

    if (!remote.ok) {
      return {
        ok: true,
        remote,
        warning: 'Helyben törölve. Willhaben üzenet-törlés API nem elérhető — beszélgetést töröld, ha teljesen kell.',
      };
    }
    return { ok: true, remote };
  } finally {
    await context.close().catch(() => {});
  }
}
