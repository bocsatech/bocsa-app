import { parseConversationsPayload, parseMessagesPayload, attachCapturedPayloads } from '../src/messenger-api.mjs';

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
if (parsed[0].adTitle !== 'BMW 320d 2019') throw new Error('adTitle parse fail');
if (!parsed[0].unread) throw new Error('unread parse fail');
if (parsed[1].partnerName !== 'Anna Huber') throw new Error('nested partner parse fail');
if (parsed[1].adTitle !== 'VW Golf 2020') throw new Error('nested advert parse fail');

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

console.log('✓ messenger-api tesztek OK');
