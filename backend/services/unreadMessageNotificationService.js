const { sendNewMessageEmail } = require('./emailService');

const UNREAD_DELAY_MS = 10 * 60 * 1000;

function groupDueMessages(messages) {
  const groups = new Map();
  for (const message of messages) {
    if (!message.productId) continue;
    const key = `${message.receiverId}:${message.conversationId}:${message.productId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(message);
  }
  return Array.from(groups.entries()).map(([key, groupedMessages]) => ({ key, messages: groupedMessages }));
}

function threadPathFor(message) {
  return `/messages/${encodeURIComponent(String(message.senderId))}?product=${encodeURIComponent(String(message.productId))}`;
}

async function notifyUnreadMessages(db, options = {}) {
  const now = options.now || new Date();
  const deliver = options.sendNotification || sendNewMessageEmail;
  const cutoff = new Date(now.getTime() - UNREAD_DELAY_MS);
  const dueMessages = await db.collection('messages').find({
    read: false,
    createdAt: { $lte: cutoff },
    emailNotificationSentAt: { $exists: false },
    productId: { $exists: true }
  }).sort({ createdAt: 1 }).toArray();
  const groups = groupDueMessages(dueMessages);
  const results = { sent: 0, skipped: 0, failed: 0 };

  for (const group of groups) {
    const ids = group.messages.map(message => message._id);
    const eventKey = `unread-message:${group.key}:${ids.map(String).join(',')}`;
    const events = db.collection('emailNotificationEvents');
    const prior = await events.findOne({ eventKey, status: 'SENT' });
    if (prior) {
      results.skipped += 1;
      continue;
    }

    const liveMessages = await db.collection('messages').find({
      _id: { $in: ids },
      read: false,
      emailNotificationSentAt: { $exists: false }
    }).sort({ createdAt: 1 }).toArray();
    if (!liveMessages.length) {
      results.skipped += 1;
      continue;
    }

    const latest = liveMessages[liveMessages.length - 1];
    const [recipient, sender, product] = await Promise.all([
      db.collection('users').findOne({ _id: latest.receiverId }, { projection: { email: 1, name: 1 } }),
      db.collection('users').findOne({ _id: latest.senderId }, { projection: { name: 1 } }),
      db.collection('products').findOne({ _id: latest.productId }, { projection: { title: 1 } })
    ]);
    if (!recipient?.email || !sender) {
      results.skipped += 1;
      continue;
    }

    try {
      await events.updateOne(
        { eventKey },
        { $set: { eventKey, type: 'UNREAD_MESSAGE', status: 'PROCESSING', updatedAt: now } },
        { upsert: true }
      );
      await deliver(recipient, sender, {
        unreadCount: liveMessages.length,
        productTitle: product?.title,
        threadPath: threadPathFor(latest)
      });
      await db.collection('messages').updateMany(
        { _id: { $in: liveMessages.map(message => message._id) }, read: false },
        { $set: { emailNotificationSentAt: now } }
      );
      await events.updateOne({ eventKey }, { $set: { status: 'SENT', sentAt: now } });
      results.sent += 1;
    } catch (error) {
      await events.updateOne({ eventKey }, { $set: { status: 'FAILED', lastErrorAt: now, error: String(error.message || error).slice(0, 300) } });
      results.failed += 1;
    }
  }

  return results;
}

module.exports = { UNREAD_DELAY_MS, groupDueMessages, notifyUnreadMessages, threadPathFor };
