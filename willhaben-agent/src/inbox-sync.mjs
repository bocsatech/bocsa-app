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

    const candidates = [
      ...document.querySelectorAll('a[href*="/iad/myprofile/chat/"]'),
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
      const key = href || lines.slice(0, 2).join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      let fullHref = href;
      if (fullHref && !fullHref.startsWith('http')) {
        fullHref = new URL(fullHref, location.origin).href;
      }
      if (fullHref && /\/iad\/myprofile\/chat\/?$/.test(fullHref)) continue;

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
  });
}

async function readMessagesFromDom(page) {
  const msgs = await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll('[data-testid*="message"]'),
      ...document.querySelectorAll('[role="log"] > *'),
      ...document.querySelectorAll('[class*="message"]'),
      ...document.querySelectorAll('main [class*="Message"]'),
    ];
    const out = [];
    const seen = new Set();
    for (const node of nodes) {
      const text = (node.innerText || node.textContent || '').trim();
      if (!text || text.length < 1 || text.length > 4000) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      const cls = `${node.className || ''} ${node.getAttribute('aria-label') || ''}`.toLowerCase();
      const direction = /outgoing|sent|own|self|outbound|me\b/.test(cls) ? 'out' : 'in';
      out.push({ text, direction });
    }
    return out.slice(0, 200);
  });

  return msgs.map((m, i) => ({
    id: `m${i}`,
    direction: m.direction,
    text: m.text,
    at: new Date().toISOString(),
  }));
}

async function openThread(page, thread, chatUrl) {
  if (thread.url) {
    await page.goto(thread.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } else if (thread.id && !thread._dom) {
    await page.goto(`${chatUrl}/${encodeURIComponent(thread.id)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } else {
    await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const link = page.getByText(thread.partnerName, { exact: false }).first();
    if (await link.isVisible({ timeout: 4000 }).catch(() => false)) {
      await link.click({ timeout: 8000 }).catch(() => {});
    }
  }
  await dismissConsent(page);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
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
  for (let i = 0; i < Math.min(threads.length, 40); i++) {
    const t = threads[i];
    onProgress?.(`DOM ${i + 1}/${threads.length}: ${t.partnerName}`);

    try {
      if (t.url) {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } else {
        await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const clickable = page.getByText(t.partnerName, { exact: false }).first();
        if (await clickable.isVisible({ timeout: 3000 }).catch(() => false)) {
          await clickable.click({ timeout: 8000 });
        }
      }
      await page.waitForTimeout(1500);
      const messages = await readMessagesFromDom(page);
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
    onProgress?.(`${conversations.length} beszélgetés (${source})`);

    for (let i = 0; i < conversations.length; i++) {
      const rawConv = conversations[i];
      const t = normalizeConversation(rawConv);
      onProgress?.(`${i + 1}/${conversations.length}: ${t.partnerName}`);

      // Üzenetek CSAK ebből a beszélgetésből — soha ne a globális capture dumpból mindenkinek
      let messages = messagesFromConversationRaw(rawConv);
      if (!messages.length) {
        messages = await fetchMessages(context, t.id, { page, accessToken });
      }
      if (!messages.length) {
        messages = messagesFromCaptured(captured, t.id);
      }

      // Legmegbízhatóbb: nyisd meg a szálat és olvasd a DOM-ból
      try {
        const beforeUrl = page.url();
        await openThread(page, rawConv, config.chatUrl);
        await page.waitForTimeout(800);
        const domMsgs = await readMessagesFromDom(page);
        if (domMsgs.length) {
          // Ha a DOM más oldalt mutat, ne használjuk
          const stillSameThread = !t.url || page.url().includes(t.id) || page.url() !== beforeUrl;
          if (stillSameThread) messages = domMsgs.map((m) => ({ ...m }));
        }
      } catch {
        /* keep previous */
      }

      upsertConversation(store, {
        ...t,
        messages: messages.length ? messages.map((m) => ({ ...m })) : [],
        syncedAt: new Date().toISOString(),
      });
    }

    store.lastSyncAt = new Date().toISOString();
    store.lastSyncError = null;
    store.lastSyncDebug = { source, probes, debugFile, capturedFile, hasAccessToken: Boolean(accessToken) };
    saveStore(store);
    return { ok: true, count: conversations.length, source };
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
    await openThread(page, conv, config.chatUrl);
    await ensureLoggedIn(page);
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
