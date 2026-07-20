import { parsePriceChart, lookupPrice } from '../src/price-chart.mjs';
import { applyTemplate } from '../src/store.mjs';
import {
  parseConversationsPayload,
  parseMessagesPayload,
  attachCapturedPayloads,
} from '../src/messenger-api.mjs';

const csv = `marke;modell;baujahr;km;wert
Skoda;Superb;2019;85000;18500`;

const chart = parsePriceChart(csv, 't.csv');
if (chart.rowCount !== 1 || chart.rows[0].wertEur !== 18500) {
  throw new Error('price-chart fail');
}

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

console.log('✓ minden teszt OK');
