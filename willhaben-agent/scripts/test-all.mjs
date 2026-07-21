import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { parsePriceChart, lookupPrice } from '../src/price-chart.mjs';
import { applyTemplate, loadStore, upsertConversation, saveStore } from '../src/store.mjs';
import {
  parseConversationsPayload,
  parseMessagesPayload,
  attachCapturedPayloads,
  fetchConversations,
  fetchMessages,
  fetchJsonViaPage,
} from '../src/messenger-api.mjs';
import { startServer } from '../src/server.mjs';

const csv = `marke;modell;baujahr;km;wert
Skoda;Superb;2019;85000;18500`;

const chart = parsePriceChart(csv, 't.csv');
if (chart.rowCount !== 1 || chart.rows[0].wertEur !== 18500) throw new Error('price-chart fail');

const match = lookupPrice(chart, { marke: 'Skoda', modell: 'Superb', baujahr: '2019', km: 85000 });
if (!match || match.wertEur !== 18500) throw new Error('lookup fail');

const text = applyTemplate('Hallo {partner}, {angebot_eur} €', { partner: 'Max', angebot_eur: '15000' });
if (!text.includes('Max') || !text.includes('15000')) throw new Error('template fail');

const sampleConversations = {
  conversations: [
    {
      id: 'abc-123',
      partnerName: 'Max Mustermann',
      adTitle: 'BMW 320d 2019',
      lastMessageText: 'Ist das Auto noch verfügbar?',
      lastMessageAt: '2026-07-20T10:00:00.000Z',
      unread: true,
    },
    {
      conversationId: 'def-456',
      counterpart: { name: 'Anna Huber' },
      advert: { heading: 'VW Golf 2020' },
      latestMessage: { text: 'Danke für die Info' },
      updatedAt: '2026-07-19T15:30:00.000Z',
    },
  ],
};

const parsed = parseConversationsPayload(sampleConversations);
if (parsed.length !== 2) throw new Error(`expected 2 conversations, got ${parsed.length}`);
if (parsed[0].partnerName !== 'Max Mustermann') throw new Error('partner parse fail');
if (parsed[1].partnerName !== 'Anna Huber') throw new Error('nested partner parse fail');

const sampleMessages = {
  messages: [
    { id: 'm1', text: 'Hallo', fromSelf: false, createdAt: '2026-07-20T09:00:00.000Z' },
    { id: 'm2', body: 'Guten Tag', outgoing: true, sentAt: '2026-07-20T09:05:00.000Z' },
  ],
};

const messages = parseMessagesPayload(sampleMessages);
if (messages.length !== 2) throw new Error(`expected 2 messages, got ${messages.length}`);
if (messages[0].direction !== 'in' || messages[1].direction !== 'out') throw new Error('direction parse fail');

const merged = attachCapturedPayloads(
  [{ url: 'https://www.willhaben.at/webapi/messenger/conversations', json: sampleConversations }],
  [],
);
if (merged.length !== 2) throw new Error('capture merge fail');

const willhabenApiShape = {
  conversation_summaries: [{
    conversation_uuid: 'wh-uuid-001',
    ad_uuid: 'ad-999',
    ad_title: 'VW Golf 2020 1.5 TSI',
    seller_name: 'Franz Huber',
    last_message_text: 'Guten Tag, ist der Wagen noch da?',
    last_message_at: '2026-07-21T08:00:00.000Z',
    unread_count: 1,
  }],
};
const whParsed = parseConversationsPayload(willhabenApiShape);
if (whParsed.length !== 1 || whParsed[0].id !== 'wh-uuid-001') throw new Error('willhaben conversation_uuid fail');
if (whParsed[0].partnerName !== 'Franz Huber') throw new Error('seller_name fail');
if (whParsed[0].adTitle !== 'VW Golf 2020 1.5 TSI') throw new Error('ad_title fail');
const whMessages = parseMessagesPayload({
  message_list: [
    { message_id: 'x1', message_text: 'Hallo', from_self: false, sent_at: '2026-07-21T07:00:00.000Z' },
    { message_id: 'x2', message_body: 'Servus', is_own_message: true, created_at: '2026-07-21T07:05:00.000Z' },
  ],
});
if (whMessages.length !== 2) throw new Error('willhaben message_list fail');

const junk = parseConversationsPayload({
  conversations: [{
    id: 'opt-1',
    name: 'Optimizely-Generated Audience for Backwards Compatibility',
    title: 'Optimizely segment',
  }],
});
if (junk.length !== 0) throw new Error('optimizely junk should be filtered');

// --- Szinkron integráció (Playwright API mock) ---
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEST_DATA = path.join(ROOT, 'data-test-integration');

function resetData() {
  fs.rmSync(TEST_DATA, { recursive: true, force: true });
  fs.mkdirSync(path.join(TEST_DATA, 'browser-profile'), { recursive: true });
}

const mockConversations = {
  conversations: [{
    id: 'integration-conv-1',
    partnerName: 'Max Mustermann',
    adTitle: 'BMW 320d 2019',
    lastMessageText: 'Ist das Auto noch verfügbar?',
    lastMessageAt: '2026-07-20T10:00:00.000Z',
    unread: true,
  }],
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

resetData();
process.env.AGENT_DATA_DIR = TEST_DATA;

const parsedMock = parseConversationsPayload(mockConversations);
if (parsedMock.length !== 1) throw new Error(`parse fail: ${parsedMock.length}`);

const msgs = parseMessagesPayload(mockMessages);
if (msgs.length !== 2) throw new Error(`messages parse fail: ${msgs.length}`);

const store = loadStore();
upsertConversation(store, { ...parsedMock[0], messages: msgs, syncedAt: new Date().toISOString() });
saveStore(store);

const saved = loadStore();
if (saved.conversations.length !== 1) throw new Error(`store fail: ${saved.conversations.length}`);
if (saved.conversations[0].messages?.length !== 2) throw new Error('messages store fail');

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

// --- DOM thread isolation (sidebar vs pane) ---
{
  const { messageFingerprint, sanitizeDomMessages, domMessagesMatchPartner } = await import('../src/inbox-sync.mjs');
  const fpA = messageFingerprint([{ direction: 'in', text: 'Angela msg' }]);
  const fpB = messageFingerprint([{ direction: 'in', text: 'Sandra msg' }]);
  if (fpA === fpB) throw new Error('fingerprint collision fail');
  if (!fpA.includes('Angela')) throw new Error('fingerprint content fail');

  const dump = sanitizeDomMessages([
    { direction: 'in', text: 'Heute\nHallo Ingrid, Ich biete Ihnen für das Auto 2400€. Lg Robert 09:43\nLeider zu wenig ! 11:19' },
    { direction: 'out', text: 'Hallo Ingrid, Ich biete Ihnen für das Auto 2400€. Lg Robert 09:43' },
    { direction: 'in', text: 'Leider zu wenig ! 11:19' },
  ]);
  if (dump.length !== 2) throw new Error(`sanitize dump fail: ${dump.length}`);
  if (dump.some((m) => /^Heute/i.test(m.text))) throw new Error('Heute dump survived');

  if (domMessagesMatchPartner(dump, 'Sandra')) throw new Error('Sandra should reject Ingrid greetings');
  if (!domMessagesMatchPartner(dump, 'Ingrid')) throw new Error('Ingrid should accept own greetings');

  const { messagesFromPreview } = await import('../src/inbox-sync.mjs');
  const seeded = messagesFromPreview({
    lastPreview: 'Ab 26.07 sind wir wieder vom Urlaub zurück',
    lastMessageAt: '2026-07-21T10:00:00.000Z',
  });
  if (seeded.length !== 1 || !seeded[0].text.includes('26.07')) throw new Error('preview seed fail');

  const { purgeJunkConversations } = await import('../src/store.mjs');
  const purged = purgeJunkConversations([
    { id: '1', partnerName: 'Sandra', adTitle: 'Golf', messages: [], lastPreview: 'hi' },
    { id: '2', partnerName: 'Zuletzt online: Vor 8 Stunden', adTitle: '', messages: [] },
    { id: '3', partnerName: 'willhaben-Code: 2023814886', adTitle: '', messages: [] },
    { id: '4', partnerName: 'Ingrid', adTitle: 'Audi', messages: [{ text: 'a' }], lastPreview: 'a' },
    { id: '5', partnerName: 'Ingrid', adTitle: 'Audi', messages: [], lastPreview: 'b' },
  ]);
  if (purged.some((c) => /zuletzt|willhaben-Code/i.test(c.partnerName))) throw new Error('junk partners survived');
  if (purged.filter((c) => c.partnerName === 'Ingrid').length !== 1) throw new Error('Ingrid not deduped');

  const isoBrowser = await chromium.launch({ headless: true });
  const isoPage = await isoBrowser.newPage();
  const isoHtml = `<!DOCTYPE html><html><body>
    <aside id="list">
      <a href="#angela">Angela Müller<br>BMW 320d<br>Hallo Angela</a>
      <a href="#sandra">Sandra Klein<br>VW Golf<br>Hallo Sandra</a>
    </aside>
    <main>
      <div data-testid="thread">
        <h2>Angela Müller</h2>
        <p>BMW 320d</p>
        <div role="log">
          <div class="thread-messages message-list">
            <div data-testid="message" class="incoming">Heute
Hallo Angela — Auto noch da?
09:00
Ja Angela, noch verfügbar.
09:05</div>
            <div data-testid="message" class="incoming">Hallo Angela — Auto noch da?</div>
            <div data-testid="message" class="outgoing own">Ja Angela, noch verfügbar.</div>
          </div>
        </div>
      </div>
    </main>
  </body></html>`;
  await isoPage.setContent(isoHtml);

  const bodyHasSandra = await isoPage.evaluate(() => document.body.innerText.includes('Sandra Klein'));
  if (!bodyHasSandra) throw new Error('fixture missing sidebar sandra');

  // Simulate leaf-only scrape + sanitize (mirrors readMessagesFromDom)
  const scraped = await isoPage.evaluate(() => {
    const root = document.querySelector('[data-testid="thread"]') || document.querySelector('main');
    const selector = '[data-testid*="message"], [class*="message" i]';
    const nodes = [...root.querySelectorAll(selector)];
    const out = [];
    for (const node of nodes) {
      const childMsgs = [...node.querySelectorAll(selector)].filter((c) => c !== node);
      if (childMsgs.length > 0) continue;
      const text = (node.innerText || '').trim();
      if (!text) continue;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (/^(heute|gestern)\b/i.test(text) && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) continue;
      if (/^(heute|gestern)$/i.test(lines[0] || '')) continue;
      if (lines.length >= 4 && (text.match(/\d{1,2}:\d{2}/g) || []).length >= 2) continue;
      out.push(text);
    }
    return out;
  });
  if (scraped.length !== 2) throw new Error(`expected 2 leaf msgs, got ${scraped.length}: ${JSON.stringify(scraped)}`);
  if (scraped.some((m) => /Sandra/i.test(m))) throw new Error('sandra leaked');
  if (!scraped.every((m) => /Angela/i.test(m))) throw new Error('expected Angela texts');

  await isoBrowser.close();
}

// --- Szerver API: üzenet-izoláció ---
const port = 3870;
process.env.AGENT_PORT = String(port);
const server = await startServer(port);

function httpRequest(method, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ method, hostname: '127.0.0.1', port, path: reqPath }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'),
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const status = await httpRequest('GET', '/api/status');
if (status.status !== 200 || !status.body.version) throw new Error('status fail');
if (status.body.version !== '1.3.6') throw new Error(`version fail: ${status.body.version}`);

// Seed distinct conversations — UI/API must keep messages isolated
{
  const s = loadStore();
  upsertConversation(s, {
    id: 'iso-angela',
    partnerName: 'Angela Müller',
    adTitle: 'BMW 320d',
    messages: [{ id: 'a1', direction: 'in', text: 'Angela egyedi üzenet', at: new Date().toISOString() }],
    syncedAt: new Date().toISOString(),
  });
  upsertConversation(s, {
    id: 'iso-sandra',
    partnerName: 'Sandra Klein',
    adTitle: 'VW Golf',
    messages: [{ id: 's1', direction: 'in', text: 'Sandra egyedi üzenet', at: new Date().toISOString() }],
    syncedAt: new Date().toISOString(),
  });
  saveStore(s);

  const angela = await httpRequest('GET', '/api/conversations/iso-angela');
  const sandra = await httpRequest('GET', '/api/conversations/iso-sandra');
  if (angela.body.conversation?.messages?.[0]?.text !== 'Angela egyedi üzenet') {
    throw new Error('angela isolation fail');
  }
  if (sandra.body.conversation?.messages?.[0]?.text !== 'Sandra egyedi üzenet') {
    throw new Error('sandra isolation fail');
  }
  if (angela.body.conversation.messages[0].text === sandra.body.conversation.messages[0].text) {
    throw new Error('messages wrongly shared');
  }
}

const syncStart = await httpRequest('POST', '/api/sync');
if (syncStart.status !== 202 || !syncStart.body.ok) throw new Error('sync start fail');

await new Promise((r) => setTimeout(r, 3000));

const after = await httpRequest('GET', '/api/status');
if (typeof after.body.syncRunning !== 'boolean') throw new Error('sync status fail');

await new Promise((resolve) => server.close(resolve));

console.log('✓ minden teszt OK (parser + DOM izoláció + szinkron mock + szerver API)');
