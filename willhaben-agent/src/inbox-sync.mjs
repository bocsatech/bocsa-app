import { loadConfig, getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';
import { loadStore, saveStore, upsertConversation, makeConversationId } from './store.mjs';

const CHAT_PATH = /\/iad\/myprofile\/chat/i;

async function waitForLogin(page) {
  const loginHint = page.locator('input[type="password"], form[action*="login"]');
  if (await loginHint.first().isVisible({ timeout: 2500 }).catch(() => false)) {
    throw new Error('Nincs bejelentkezve. Futtasd: npm run login');
  }
}

async function extractThreadMeta(item) {
  const text = ((await item.innerText().catch(() => '')) || '').trim();
  const link = item.locator('a[href*="chat"], a[href*="nachricht"]').first();
  let href = '';
  try {
    href = (await link.getAttribute('href')) || '';
  } catch {
    href = (await item.getAttribute('href')) || '';
  }
  if (href && !href.startsWith('http')) {
    href = new URL(href, 'https://www.willhaben.at').href;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const partnerName = lines[0] || 'Ismeretlen';
  const adTitle = lines.find((l) => l.length > 3 && l !== partnerName && !/^\d/.test(l)) || '';
  const lastPreview = lines[lines.length - 1] || '';
  const unread = /ungelesen|neu\b|unread/i.test(text);

  const id = makeConversationId(href || `${partnerName}|${adTitle}|${lastPreview}`);

  return {
    id,
    url: href || null,
    partnerName,
    adTitle,
    lastPreview,
    unread,
    lastMessageAt: new Date().toISOString(),
  };
}

async function scrapeThreadList(page) {
  await page.waitForTimeout(1500);

  const selectors = [
    '[data-testid*="conversation"]',
    '[data-testid*="chat-list"] li',
    '[data-testid*="ChatList"] [role="listitem"]',
    'main li a[href*="chat"]',
    'a[href*="/iad/myprofile/chat/"]',
  ];

  for (const sel of selectors) {
    const items = page.locator(sel);
    const count = await items.count().catch(() => 0);
    if (count > 0) {
      const threads = [];
      const limit = Math.min(count, 80);
      for (let i = 0; i < limit; i++) {
        try {
          threads.push(await extractThreadMeta(items.nth(i)));
        } catch {
          /* skip broken row */
        }
      }
      if (threads.length) return threads;
    }
  }

  const links = page.locator('a[href*="chat"]');
  const count = await links.count().catch(() => 0);
  const threads = [];
  for (let i = 0; i < Math.min(count, 80); i++) {
    try {
      threads.push(await extractThreadMeta(links.nth(i)));
    } catch {
      /* skip */
    }
  }
  return threads;
}

async function scrapeMessages(page) {
  await page.waitForTimeout(1200);
  const messages = [];

  const bubbleSelectors = [
    '[data-testid*="message"]',
    '[class*="MessageBubble"]',
    '[class*="chat-message"]',
    '[role="log"] > *',
    'main [class*="message"]',
  ];

  for (const sel of bubbleSelectors) {
    const nodes = page.locator(sel);
    const count = await nodes.count().catch(() => 0);
    if (count < 1) continue;

    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      const text = ((await node.innerText().catch(() => '')) || '').trim();
      if (!text || text.length < 1) continue;
      const cls = ((await node.getAttribute('class')) || '').toLowerCase();
      const testId = ((await node.getAttribute('data-testid')) || '').toLowerCase();
      const direction =
        /outgoing|sent|own|self|outbound/.test(`${cls} ${testId}`) ? 'out' : 'in';
      messages.push({
        id: `${i}-${text.slice(0, 24)}`,
        direction,
        text,
        at: new Date().toISOString(),
      });
    }
    if (messages.length) break;
  }

  if (!messages.length) {
    const mainText = ((await page.locator('main').innerText().catch(() => '')) || '').trim();
    if (mainText) {
      messages.push({
        id: 'fallback-1',
        direction: 'in',
        text: mainText.slice(0, 4000),
        at: new Date().toISOString(),
      });
    }
  }

  return messages;
}

async function openThread(page, thread) {
  if (thread.url) {
    await page.goto(thread.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissConsent(page);
    return;
  }

  const byName = page.getByText(thread.partnerName, { exact: false }).first();
  if (await byName.isVisible({ timeout: 3000 }).catch(() => false)) {
    await byName.click({ timeout: 8000 });
    await page.waitForTimeout(1200);
  }
}

export async function syncInbox({ onProgress } = {}) {
  const config = loadConfig();
  const profileDir = getProfileDir();
  const { context } = await launchBrowser(profileDir, { headless: true });
  const page = context.pages()[0] || (await context.newPage());

  try {
    onProgress?.('Willhaben chat megnyitása…');
    await page.goto(config.chatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissConsent(page);
    await waitForLogin(page);

    onProgress?.('Beszélgetések listázása…');
    const threads = await scrapeThreadList(page);
    const store = loadStore();

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      onProgress?.(`Üzenetek: ${i + 1}/${threads.length} — ${thread.partnerName}`);

      let messages = [];
      try {
        await openThread(page, thread);
        messages = await scrapeMessages(page);
        await page.goto(config.chatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(800);
      } catch {
        /* keep list meta only */
      }

      upsertConversation(store, {
        ...thread,
        messages: messages.length ? messages : undefined,
        syncedAt: new Date().toISOString(),
      });
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
  if (!conv) throw new Error('Ismeretlen beszélgetés');
  if (!text?.trim()) throw new Error('Üres üzenet');

  const profileDir = getProfileDir();
  const { context } = await launchBrowser(profileDir, { headless: true });
  const page = context.pages()[0] || (await context.newPage());

  try {
    const target = conv.url || config.chatUrl;
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissConsent(page);
    await waitForLogin(page);

    if (!conv.url) {
      await openThread(page, conv);
    }

    const textareaSelectors = [
      '[data-testid*="message-input"] textarea',
      '[data-testid*="mailContent"]',
      'textarea[placeholder*="Nachricht"]',
      'textarea',
      '[contenteditable="true"][role="textbox"]',
    ];

    let input = null;
    for (const sel of textareaSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
        input = loc;
        break;
      }
    }

    if (!input) {
      throw new Error('Nincs üzenetmező — ellenőrizd a bejelentkezést');
    }

    await input.click({ timeout: 5000 });
    await input.fill(text.trim());

    const sendSelectors = [
      '[data-testid*="send"]',
      'button[type="submit"]',
      page.getByRole('button', { name: /senden|absenden|send/i }),
    ];

    let sent = false;
    for (const sel of sendSelectors) {
      try {
        const btn = typeof sel === 'string' ? page.locator(sel).first() : sel.first();
        if (await btn.isVisible({ timeout: 1500 })) {
          await btn.click({ timeout: 8000 });
          sent = true;
          break;
        }
      } catch {
        /* next */
      }
    }

    if (!sent) {
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(config.sendDelayMs ?? 1500);

    const { appendOutboundMessage } = await import('./store.mjs');
    appendOutboundMessage(store, conversationId, text.trim());
    saveStore(store);

    return { ok: true };
  } finally {
    await context.close().catch(() => {});
  }
}

export { CHAT_PATH };
