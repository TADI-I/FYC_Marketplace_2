require('dotenv').config();
const { MongoClient } = require('mongodb');
const { ensureCampusLocations, CAMPUSES } = require('../services/campusLocationService');

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'tut_marketplace');
    await ensureCampusLocations(db);
    console.log(`Backfilled ${CAMPUSES.length} verified campus locations.`);
  } finally {
    await client.close();
  }
};

run().catch(error => {
  console.error('Campus location backfill failed:', error.message);
  process.exitCode = 1;
});
