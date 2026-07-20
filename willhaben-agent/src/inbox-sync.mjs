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
  fetchConversations,
  fetchMessages,
  installNetworkCapture,
  isMessengerUrl,
  sendMessageViaApi,
} from './messenger-api.mjs';

async function isLoginPage(page) {
  const url = page.url();
  if (/sso\.willhaben\.at|\/auth\/|\/login/i.test(url)) return true;

  const hasLoginHeading = await page.getByRole('heading', { name: /einloggen|anmelden/i })
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (hasLoginHeading) return true;

  const hasPassword = await page.locator('input[type="password"]')
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (hasPassword) return true;

  const hasEmailLogin = await page.locator('input[type="email"], input[name="username"]')
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  const hasLoginButton = await page.getByRole('button', { name: /einloggen|anmelden/i })
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  return hasEmailLogin && hasLoginButton;
}

async function ensureLoggedIn(page) {
  if (await isLoginPage(page)) {
    throw new Error('Nincs bejelentkezve. Futtasd: npm run login');
  }
}

async function waitForChatReady(page, chatUrl, timeoutMs = 45000) {
  const messengerResponse = page.waitForResponse(
    (response) => isMessengerUrl(response.url()) && response.status() === 200,
    { timeout: timeoutMs },
  ).catch(() => null);

  await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await dismissConsent(page);
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
  await messengerResponse;
  await page.waitForTimeout(1500);
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

async function threadMeta(el) {
  const text = ((await el.innerText().catch(() => '')) || '').trim();
  const link = el.locator('a[href*="/iad/myprofile/chat/"], a[href*="conversation"], a[href*="thread"]').first();
  let href = (await link.getAttribute('href').catch(() => null)) || '';
  if (href && !href.startsWith('http')) href = new URL(href, 'https://www.willhaben.at').href;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    id: makeConversationId(href || text),
    url: href || null,
    partnerName: lines[0] || 'Ismeretlen',
    adTitle: lines[1] || '',
    lastPreview: lines.at(-1) || '',
    unread: /ungelesen|neu\b|unread/i.test(text),
    lastMessageAt: new Date().toISOString(),
  };
}

async function listThreadsFromDom(page) {
  await page.waitForTimeout(1500);

  for (const sel of [
    '[data-testid*="conversation-list"] [data-testid*="conversation"]',
    '[data-testid*="conversation"]',
    '[data-testid*="thread"]',
    'a[href*="/iad/myprofile/chat/"]',
    '[role="listitem"]',
    'main li',
  ]) {
    const items = page.locator(sel);
    const count = await items.count().catch(() => 0);
    if (!count) continue;

    const out = [];
    for (let i = 0; i < Math.min(count, 60); i++) {
      try {
        const meta = await threadMeta(items.nth(i));
        if (!meta.partnerName && !meta.adTitle && !meta.lastPreview) continue;
        if (meta.url && meta.url.endsWith('/iad/myprofile/chat')) continue;
        out.push(meta);
      } catch {
        /* skip */
      }
    }
    if (out.length) return out;
  }
  return [];
}

async function readMessagesFromDom(page) {
  await page.waitForTimeout(1000);
  for (const sel of [
    '[data-testid*="message-list"] [data-testid*="message"]',
    '[data-testid*="message"]',
    '[role="log"] > *',
    'main [class*="message"]',
  ]) {
    const nodes = page.locator(sel);
    const count = await nodes.count().catch(() => 0);
    if (!count) continue;
    const msgs = [];
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      const text = ((await node.innerText().catch(() => '')) || '').trim();
      if (!text) continue;
      const cls = ((await node.getAttribute('class')) || '').toLowerCase();
      const aria = ((await node.getAttribute('aria-label')) || '').toLowerCase();
      const direction = /outgoing|sent|own|self|outbound/.test(`${cls} ${aria}`) ? 'out' : 'in';
      msgs.push({ id: `m${i}`, direction, text, at: new Date().toISOString() });
    }
    if (msgs.length) return msgs;
  }
  return [];
}

async function openThread(page, thread, chatUrl) {
  if (thread.url) {
    await page.goto(thread.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } else if (thread.id) {
    await page.goto(`${chatUrl}/${encodeURIComponent(thread.id)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } else {
    await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const link = page.getByText(thread.partnerName, { exact: false }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) await link.click();
  }
  await dismissConsent(page);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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

export async function syncInbox({ onProgress } = {}) {
  const config = loadConfig();
  const { context } = await launchBrowser(getProfileDir(), { headless: true });
  const page = context.pages()[0] || (await context.newPage());
  const captured = installNetworkCapture(page);

  try {
    onProgress?.('Chat megnyitása…');
    await waitForChatReady(page, config.chatUrl);
    await ensureLoggedIn(page);

    onProgress?.('Beszélgetések lekérése…');
    let { conversations, unauthorized, source } = await fetchConversations(context);

    if (unauthorized) {
      throw new Error('Nincs bejelentkezve. Futtasd: npm run login');
    }

    if (!conversations.length && captured.length) {
      conversations = attachCapturedPayloads(captured, []);
    }

    if (!conversations.length) {
      onProgress?.('DOM fallback…');
      conversations = await listThreadsFromDom(page);
    }

    if (!conversations.length) {
      const debugDir = await saveDebugSnapshot(page, 'sync-empty');
      const hint = debugDir
        ? ` Mentett debug: ${debugDir}`
        : '';
      throw new Error(
        `Nem található beszélgetés. Ellenőrizd, hogy van-e üzenet a willhaben chatben, majd futtasd újra: npm run login${hint}`,
      );
    }

    const store = loadStore();
    onProgress?.(`${conversations.length} beszélgetés${source ? ` (${source})` : ''}`);

    for (let i = 0; i < conversations.length; i++) {
      const t = normalizeConversation(conversations[i]);
      onProgress?.(`${i + 1}/${conversations.length}: ${t.partnerName}`);

      let messages = await fetchMessages(context, t.id);
      if (!messages.length) {
        try {
          await openThread(page, t, config.chatUrl);
          messages = await readMessagesFromDom(page);
        } catch {
          /* meta only */
        }
      }

      upsertConversation(store, {
        ...t,
        messages: messages.length ? messages : undefined,
        syncedAt: new Date().toISOString(),
      });
    }

    store.lastSyncAt = new Date().toISOString();
    store.lastSyncError = null;
    saveStore(store);
    return { ok: true, count: conversations.length, source: source || (captured.length ? 'network-capture' : 'dom') };
  } catch (err) {
    const store = loadStore();
    store.lastSyncError = err.message;
    saveStore(store);
    throw err;
  } finally {
    await context.close().catch(() => {});
  }
}

export async function sendReply(conversationId, text) {
  const config = loadConfig();
  const store = loadStore();
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) throw new Error('Nincs ilyen beszélgetés');
  if (!text?.trim()) throw new Error('Üres üzenet');

  const { context } = await launchBrowser(getProfileDir(), { headless: true });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await openThread(page, conv, config.chatUrl);
    await ensureLoggedIn(page);

    const sentViaApi = await sendMessageViaApi(context, conversationId, text.trim());
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
      if (!input) throw new Error('Nincs üzenetmező — jelentkezz be újra: npm run login');

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
