require('dotenv').config();
const { MongoClient } = require('mongodb');
const { assertEmailConfiguration } = require('../config/email');
const { sendSubscriptionReminderEmail } = require('../services/emailService');

const REMINDER_DAYS = [7, 1];

async function run() {
  assertEmailConfiguration();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(process.env.DB_NAME || 'tut_marketplace');
    const events = db.collection('emailNotificationEvents');
    await events.createIndex({ eventKey: 1 }, { unique: true });
    const now = new Date();

    for (const daysRemaining of REMINDER_DAYS) {
      const rangeStart = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
      const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
      const users = await db.collection('users').find({
        type: 'seller',
        subscribed: true,
        email: { $type: 'string' },
        subscriptionEndDate: { $gte: rangeStart, $lt: rangeEnd }
      }).project({ name: 1, email: 1, subscriptionEndDate: 1 }).toArray();

      for (const user of users) {
        const eventKey = `subscription-reminder:${user._id}:${user.subscriptionEndDate.toISOString()}:${daysRemaining}`;
        const sent = await events.findOne({ eventKey, status: 'SENT' });
        if (sent) continue;
        try {
          await sendSubscriptionReminderEmail(user, daysRemaining);
          await events.updateOne(
            { eventKey },
            { $set: { eventKey, userId: user._id, type: 'SUBSCRIPTION_REMINDER', daysRemaining, status: 'SENT', sentAt: new Date() } },
            { upsert: true }
          );
        } catch (error) {
          await events.updateOne(
            { eventKey },
            { $set: { eventKey, userId: user._id, type: 'SUBSCRIPTION_REMINDER', daysRemaining, status: 'FAILED', lastErrorAt: new Date() } },
            { upsert: true }
          );
          console.error(`Reminder delivery failed for user ${user._id}:`, error.message);
        }
      }
    }
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Email reminder job failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
