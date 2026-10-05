const assert = require('node:assert/strict');
const test = require('node:test');
const {
  SUBSCRIPTION_STATUS,
  addMonthsClamped,
  hasHistoricalSellerActivation,
  hasActiveSellerAccess,
  syncExpiredSellerAccess
} = require('../services/sellerSubscriptionService');

test('calendar month addition preserves valid end-of-month dates', () => {
  assert.equal(
    addMonthsClamped(new Date('2024-12-31T00:00:00.000Z'), 2).toISOString(),
    '2025-02-28T00:00:00.000Z'
  );
  assert.equal(
    addMonthsClamped(new Date('2023-12-29T00:00:00.000Z'), 2).toISOString(),
    '2024-02-29T00:00:00.000Z'
  );
});

test('previous access is separate from merely selecting the seller account type', () => {
  assert.equal(hasHistoricalSellerActivation({ type: 'buyer', hasHadSellerAccess: false }), false);
  assert.equal(hasHistoricalSellerActivation({ type: 'seller', hasHadSellerAccess: false }), false);
  assert.equal(hasHistoricalSellerActivation({ type: 'seller', hasHadSellerAccess: true }), true);
  assert.equal(hasHistoricalSellerActivation({ type: 'buyer', subscriptionPaymentId: 'paid-order' }), true);
  assert.equal(hasHistoricalSellerActivation({ type: 'buyer', hasUsedSellerTrial: true }), true);
});

test('seller access requires seller type, subscribed state, and an unexpired period', () => {
  const now = new Date('2026-10-05T12:00:00.000Z');
  assert.equal(hasActiveSellerAccess({
    type: 'seller',
    subscribed: true,
    subscriptionEndDate: '2026-10-06T12:00:00.000Z'
  }, now), true);
  assert.equal(hasActiveSellerAccess({
    type: 'seller',
    subscribed: true,
    subscriptionEndDate: '2026-10-05T12:00:00.000Z'
  }, now), false);
  assert.equal(hasActiveSellerAccess({ type: 'buyer', subscribed: true }, now), false);
});

test('expiring access updates both the user snapshot and subscription record', async () => {
  const userId = new (require('mongodb').ObjectId)();
  const subscriptionId = new (require('mongodb').ObjectId)();
  const updates = [];
  const db = {
    collection(name) {
      return {
        async updateOne(filter, update) {
          updates.push({ name, operation: 'updateOne', filter, update });
        },
        async updateMany(filter, update) {
          updates.push({ name, operation: 'updateMany', filter, update });
        }
      };
    }
  };
  const now = new Date('2026-10-05T12:00:00.000Z');
  const user = {
    _id: userId,
    type: 'seller',
    subscribed: true,
    subscriptionStatus: 'ACTIVE',
    subscriptionEndDate: '2026-10-01T12:00:00.000Z',
    currentSellerSubscriptionId: subscriptionId
  };

  const synced = await syncExpiredSellerAccess(db, user, now);

  assert.equal(synced.subscribed, false);
  assert.equal(synced.subscriptionStatus, 'PAYMENT_REQUIRED');
  assert.equal(updates[0].name, 'users');
  assert.equal(updates[1].name, 'sellerSubscriptions');
  assert.deepEqual(updates[1].filter, {
    userId,
    status: 'ACTIVE',
    expiresAt: { $lte: now }
  });
  assert.equal(updates[1].update.$set.status, 'EXPIRED');
});
