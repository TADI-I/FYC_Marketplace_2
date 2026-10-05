const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const { activateSubscriptionForPaidOrder } = require('../controllers/subscriptionPaymentController');

test('verified payment automatically reactivates seller access and resolves pending requests', async () => {
  const updates = [];
  const db = {
    collection(name) {
      return {
        async updateOne(filter, update) {
          updates.push({ operation: 'updateOne', name, filter, update });
        },
        async updateMany(filter, update) {
          updates.push({ operation: 'updateMany', name, filter, update });
        }
      };
    }
  };
  const userId = new ObjectId();
  const orderId = new ObjectId();
  const servicePeriodStart = new Date('2026-10-04T09:00:00.000Z');
  const servicePeriodEnd = new Date('2026-11-03T09:00:00.000Z');
  const activatedAt = new Date('2026-10-04T09:05:00.000Z');

  await activateSubscriptionForPaidOrder(db, {
    _id: orderId,
    userId,
    plan: 'monthly',
    amount: 2500,
    currency: 'ZAR',
    servicePeriodStart,
    servicePeriodEnd
  }, {
    paidAt: '2026-10-04T09:04:00.000Z'
  }, activatedAt);

  assert.equal(updates.length, 4);
  assert.equal(updates[0].name, 'sellerSubscriptions');
  assert.deepEqual(updates[0].filter, { _id: orderId });
  assert.equal(updates[0].update.$setOnInsert.source, 'PAYMENT');

  assert.deepEqual(updates[1].filter, { _id: userId });
  assert.equal(updates[1].update.$set.type, 'seller');
  assert.equal(updates[1].update.$set.subscribed, true);
  assert.equal(updates[1].update.$set.subscriptionStatus, 'ACTIVE');
  assert.equal(updates[1].update.$set.hasHadSellerAccess, true);
  assert.equal(updates[1].update.$set.subscriptionPaymentId, orderId.toString());
  assert.equal(updates[1].update.$max.subscriptionEndDate, servicePeriodEnd);

  assert.deepEqual(updates[2].filter, { _id: orderId });
  assert.equal(updates[2].update.$set.status, 'PAID');
  assert.equal(updates[2].update.$set.paidAt.toISOString(), '2026-10-04T09:04:00.000Z');

  assert.equal(updates[3].operation, 'updateMany');
  assert.deepEqual(updates[3].filter, { userId, status: 'pending' });
  assert.equal(updates[3].update.$set.status, 'approved');
  assert.equal(updates[3].update.$set.subscriptionPaymentId, orderId.toString());
});
