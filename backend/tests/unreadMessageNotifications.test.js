const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const {
  UNREAD_DELAY_MS,
  groupDueMessages,
  notifyUnreadMessages,
  threadPathFor
} = require('../services/unreadMessageNotificationService');

test('unread message email delay is ten minutes', () => {
  assert.equal(UNREAD_DELAY_MS, 10 * 60 * 1000);
});

test('due messages are grouped by recipient, conversation, and product', () => {
  const receiverId = new ObjectId();
  const senderId = new ObjectId();
  const productId = new ObjectId();
  const messages = [
    { _id: new ObjectId(), receiverId, senderId, productId, conversationId: 'thread' },
    { _id: new ObjectId(), receiverId, senderId, productId, conversationId: 'thread' },
    { _id: new ObjectId(), receiverId, senderId, productId: new ObjectId(), conversationId: 'thread' }
  ];
  const groups = groupDueMessages(messages);
  assert.equal(groups.length, 2);
  assert.equal(groups.find(group => group.messages.length === 2).messages[0], messages[0]);
});

test('notification links return to the exact product conversation', () => {
  const senderId = new ObjectId();
  const productId = new ObjectId();
  assert.equal(threadPathFor({ senderId, productId }), `/messages/${senderId}?product=${productId}`);
});

test('notification worker delivers a privacy-safe grouped alert and marks only still-unread messages', async () => {
  const senderId = new ObjectId();
  const receiverId = new ObjectId();
  const productId = new ObjectId();
  const message = {
    _id: new ObjectId(), senderId, receiverId, productId, conversationId: 'thread',
    text: 'private content', read: false, createdAt: new Date('2026-10-24T09:40:00Z')
  };
  let firstQuery;
  let updatedMessages;
  const eventUpdates = [];
  let messageFindCount = 0;
  const cursor = rows => ({ sort() { return this; }, async toArray() { return rows; } });
  const db = { collection(name) {
    if (name === 'messages') return {
      find(query) { messageFindCount += 1; if (messageFindCount === 1) firstQuery = query; return cursor([message]); },
      async updateMany(filter, update) { updatedMessages = { filter, update }; return { modifiedCount: 1 }; }
    };
    if (name === 'users') return { async findOne(query) { return query._id.equals(receiverId) ? { _id: receiverId, name: 'Recipient', email: 'recipient@example.com' } : { _id: senderId, name: 'Sender' }; } };
    if (name === 'products') return { async findOne() { return { _id: productId, title: 'Calculator' }; } };
    if (name === 'emailNotificationEvents') return {
      async findOne() { return null; },
      async updateOne(filter, update) { eventUpdates.push({ filter, update }); }
    };
    throw new Error(`Unexpected collection ${name}`);
  } };
  let delivery;
  const result = await notifyUnreadMessages(db, {
    now: new Date('2026-10-24T10:00:00Z'),
    sendNotification: async (...args) => { delivery = args; }
  });

  assert.equal(result.sent, 1);
  assert.equal(firstQuery.read, false);
  assert.equal(firstQuery.createdAt.$lte.toISOString(), '2026-10-24T09:50:00.000Z');
  assert.equal(delivery[2].productTitle, 'Calculator');
  assert.equal(delivery[2].threadPath, `/messages/${senderId}?product=${productId}`);
  assert.equal(JSON.stringify(delivery).includes('private content'), false);
  assert.equal(updatedMessages.filter.read, false);
  assert.ok(updatedMessages.update.$set.emailNotificationSentAt);
  assert.equal(eventUpdates.at(-1).update.$set.status, 'SENT');
});
