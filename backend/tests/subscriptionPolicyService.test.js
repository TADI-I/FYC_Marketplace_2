const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUBSCRIPTION_MODE,
  normalizeSubscriptionPolicy,
  setSubscriptionPaymentsEnabled,
  sellerHasAccessUnderPolicy
} = require('../services/subscriptionPolicyService');

test('subscription policy defaults to free seller access', () => {
  const policy = normalizeSubscriptionPolicy(null, new Date('2026-10-27T10:00:00.000Z'));
  assert.equal(policy.mode, SUBSCRIPTION_MODE.FREE);
  assert.equal(sellerHasAccessUnderPolicy({ type: 'seller', subscribed: false }, policy), true);
  assert.equal(sellerHasAccessUnderPolicy({ type: 'seller', subscribed: false, accountStatus: 'suspended' }, policy), false);
});

test('enabling payments starts one notice period and does not restart it', async () => {
  let document = null;
  const collection = {
    async findOne() { return document; },
    async updateOne(filter, update) {
      document = { ...(document || {}), _id: filter._id, ...(update.$setOnInsert || {}), ...update.$set };
    }
  };
  const db = { collection(name) { assert.equal(name, 'marketplaceSettings'); return collection; } };
  const startedAt = new Date('2026-10-27T10:00:00.000Z');
  const first = await setSubscriptionPaymentsEnabled(db, true, 'admin-1', startedAt);
  assert.equal(first.mode, SUBSCRIPTION_MODE.NOTICE);
  assert.equal(first.paymentsRequiredAt.toISOString(), '2026-11-26T10:00:00.000Z');

  const later = new Date('2026-11-01T10:00:00.000Z');
  const second = await setSubscriptionPaymentsEnabled(db, true, 'admin-1', later);
  assert.equal(second.paymentsRequiredAt.toISOString(), first.paymentsRequiredAt.toISOString());
});

test('paid enforcement begins after the notice deadline', () => {
  const document = {
    paymentsEnabled: true,
    noticeStartedAt: new Date('2026-10-01T00:00:00.000Z'),
    paymentsRequiredAt: new Date('2026-10-31T00:00:00.000Z')
  };
  const policy = normalizeSubscriptionPolicy(document, new Date('2026-11-01T00:00:00.000Z'));
  assert.equal(policy.mode, SUBSCRIPTION_MODE.PAID);
  assert.equal(sellerHasAccessUnderPolicy({ type: 'seller', subscribed: false }, policy), false);
  assert.equal(sellerHasAccessUnderPolicy({ type: 'seller', subscribed: true, subscriptionEndDate: '2026-12-01T00:00:00.000Z' }, policy), true);
});
