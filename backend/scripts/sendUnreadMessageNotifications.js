require('dotenv').config();
const { MongoClient } = require('mongodb');
const { assertEmailConfiguration } = require('../config/email');
const { notifyUnreadMessages } = require('../services/unreadMessageNotificationService');

async function run() {
  assertEmailConfiguration();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(process.env.DB_NAME || 'tut_marketplace');
    await db.collection('emailNotificationEvents').createIndex({ eventKey: 1 }, { unique: true });
    const result = await notifyUnreadMessages(db);
    console.log(`Unread message notifications: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  run().catch(error => {
    console.error('Unread message notification job failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
