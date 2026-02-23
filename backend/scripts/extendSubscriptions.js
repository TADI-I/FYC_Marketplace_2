// scripts/extendSubscriptions.js
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'your_db_name'; // ← change this

const EXTENSION_DAYS = 30;

async function extendAllSubscriptions() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Find all subscribed users
    const users = await db.collection('users').find({
      subscribed: true || { $exists: false }, // Include users without the field (treat as subscribed)
      type: 'seller'
    }).toArray();

    console.log(`📋 Found ${users.length} subscribed users`);

    let extended = 0;
    let skipped = 0;

    for (const user of users) {
      const now = new Date();

      // If they have an end date, extend from it; otherwise extend from now
      const baseDate = user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now
        ? new Date(user.subscriptionEndDate)
        : now;

      const newEndDate = new Date(baseDate.getTime() + EXTENSION_DAYS * 24 * 60 * 60 * 1000);

      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            subscriptionEndDate: newEndDate,
            subscriptionStatus: 'active',
            subscribed: true,
            updatedAt: now
          }
        }
      );

      console.log(`✅ ${user.name} (${user.email}): extended to ${newEndDate.toDateString()}`);
      extended++;
    }

    console.log(`\n🎉 Done! Extended: ${extended}, Skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

extendAllSubscriptions();