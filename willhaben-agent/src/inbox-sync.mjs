import { loadConfig, getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';
import { loadStore, saveStore, upsertConversation, makeConversationId, appendOutbound } from './store.mjs';

async function ensureLoggedIn(page) {
  if (await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false)) {
    throw new Error('Nincs bejelentkezve. Futtasd: npm run login');
  }
}

async function threadMeta(el) {
  const text = ((await el.innerText().catch(() => '')) || '').trim();
  const link = el.locator('a[href*="chat"], a[href*="nachricht"]').first();
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

async function listThreads(page) {
  await page.waitForTimeout(1200);
  for (const sel of [
    '[data-testid*="conversation"]',
    'a[href*="/iad/myprofile/chat"]',
    'main li',
  ]) {
    const items = page.locator(sel);
    const count = await items.count().catch(() => 0);
    if (count > 0) {
      const out = [];
      for (let i = 0; i < Math.min(count, 60); i++) {
        try {
          out.push(await threadMeta(items.nth(i)));
        } catch {
          /* skip */
        }
      }
      if (out.length) return out;
    }
  }
  return [];
}

async function readMessages(page) {
  await page.waitForTimeout(1000);
  for (const sel of ['[data-testid*="message"]', '[role="log"] > *', 'main [class*="message"]']) {
    const nodes = page.locator(sel);
    const count = await nodes.count().catch(() => 0);
    if (!count) continue;
    const msgs = [];
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      const text = ((await node.innerText().catch(() => '')) || '').trim();
      if (!text) continue;
      const cls = ((await node.getAttribute('class')) || '').toLowerCase();
      const direction = /outgoing|sent|own|self/.test(cls) ? 'out' : 'in';
      msgs.push({ id: `m${i}`, direction, text, at: new Date().toISOString() });
    }
    if (msgs.length) return msgs;
  }
  return [];
}

async function openThread(page, thread, chatUrl) {
  if (thread.url) {
    await page.goto(thread.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } else {
    await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const link = page.getByText(thread.partnerName, { exact: false }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) await link.click();
  }
  await dismissConsent(page);
}

export async function syncInbox({ onProgress } = {}) {
  const config = loadConfig();
  const { context } = await launchBrowser(getProfileDir(), { headless: true });
  const page = context.pages()[0] || (await context.newPage());
  try {
    onProgress?.('Chat megnyitása…');
    await page.goto(config.chatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissConsent(page);
    await ensureLoggedIn(page);

    const threads = await listThreads(page);
    const store = loadStore();
    onProgress?.(`${threads.length} beszélgetés`);

    for (let i = 0; i < threads.length; i++) {
      const t = threads[i];
      onProgress?.(`${i + 1}/${threads.length}: ${t.partnerName}`);
      let messages = [];
      try {
        await openThread(page, t, config.chatUrl);
        messages = await readMessages(page);
        await page.goto(config.chatUrl, { waitUntil: 'domcontentloaded' });
      } catch {
        /* meta only */
      }
      upsertConversation(store, { ...t, messages: messages.length ? messages : undefined, syncedAt: new Date().toISOString() });
    }

    store.lastSyncAt = new Date().toISOString();
    store.lastSyncError = null;
    saveStore(store);
    return { ok: true, count: threads.length };
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

    appendOutbound(store, conversationId, text.trim());
    saveStore(store);
    return { ok: true };
  } finally {
    await context.close().catch(() => {});
  }
}
