import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import {
  parseConversationsPayload,
  parseMessagesPayload,
  fetchConversations,
  fetchMessages,
  fetchJsonViaPage,
} from '../src/messenger-api.mjs';
import { loadStore, upsertConversation, saveStore } from '../src/store.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEST_DATA = path.join(ROOT, 'data-test-integration');

function resetData() {
  fs.rmSync(TEST_DATA, { recursive: true, force: true });
  fs.mkdirSync(path.join(TEST_DATA, 'browser-profile'), { recursive: true });
}

const mockConversations = {
  conversations: [
    {
      id: 'integration-conv-1',
      partnerName: 'Max Mustermann',
      adTitle: 'BMW 320d 2019',
      lastMessageText: 'Ist das Auto noch verfügbar?',
      lastMessageAt: '2026-07-20T10:00:00.000Z',
      unread: true,
    },
  ],
};

const mockMessages = {
  messages: [
    { id: 'm1', text: 'Ist das Auto noch verfügbar?', fromSelf: false, createdAt: '2026-07-20T09:00:00.000Z' },
    { id: 'm2', text: 'Ja, noch verfügbar.', fromSelf: true, createdAt: '2026-07-20T09:05:00.000Z' },
  ],
};

const chatHtml = `<!DOCTYPE html><html><body><main>
  <div data-testid="conversation-list">
    <a href="/iad/myprofile/chat/integration-conv-1">Max Mustermann</a>
  </div>
</main></body></html>`;

// 1) Parser + store
resetData();
process.env.AGENT_DATA_DIR = TEST_DATA;

const parsed = parseConversationsPayload(mockConversations);
if (parsed.length !== 1) throw new Error(`parse fail: ${parsed.length}`);

const msgs = parseMessagesPayload(mockMessages);
if (msgs.length !== 2) throw new Error(`messages parse fail: ${msgs.length}`);

const store = loadStore();
upsertConversation(store, { ...parsed[0], messages: msgs, syncedAt: new Date().toISOString() });
saveStore(store);

const saved = loadStore();
if (saved.conversations.length !== 1) throw new Error(`store fail: ${saved.conversations.length}`);
if (saved.conversations[0].messages?.length !== 2) throw new Error('messages store fail');

// 2) Playwright page.fetch + API mock (valós böngésző session)
const profileDir = path.join(TEST_DATA, 'browser-profile');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.route('**/iad/myprofile/chat**', (route) => {
  route.fulfill({ status: 200, contentType: 'text/html', body: chatHtml });
});

await page.route('**/webapi/**', (route) => {
  const url = route.request().url();
  if (url.includes('/messages')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMessages),
    });
  }
  if (/messenger|chat\/conversations/.test(url)) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConversations),
    });
  }
  return route.continue();
});

await context.addCookies([{
  name: 'x-bbx-csrf-token',
  value: 'integration-test-csrf',
  domain: 'www.willhaben.at',
  path: '/',
}]);

await page.goto('https://www.willhaben.at/iad/myprofile/chat', { waitUntil: 'domcontentloaded' });

const apiResult = await fetchJsonViaPage(page, '/webapi/bff/messenger/conversations');
if (!apiResult.ok || !apiResult.data) throw new Error(`page.fetch fail: ${apiResult.status}`);

const fromApi = parseConversationsPayload(apiResult.data);
if (fromApi.length !== 1) throw new Error(`page.fetch parse fail: ${fromApi.length}`);

const { conversations, source } = await fetchConversations(context, { page });
if (conversations.length !== 1) throw new Error(`fetchConversations fail: ${conversations.length}`);
if (!source) throw new Error('missing source');

const loadedMessages = await fetchMessages(context, conversations[0].id, { page });
if (loadedMessages.length !== 2) throw new Error(`fetchMessages fail: ${loadedMessages.length}`);

await browser.close();
resetData();

console.log('✓ szinkron integrációs teszt OK (parser + store + Playwright API mock)');
