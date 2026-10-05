const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const {
  satisfiesEligibilityRules,
  claimOffer
} = require('../services/sellerOfferService');

function eligibleUser(userId = new ObjectId()) {
  return {
    _id: userId,
    type: 'seller',
    hasHadSellerAccess: true,
    subscribed: false,
    subscriptionStatus: 'PAYMENT_REQUIRED'
  };
}

function reactivationOffer(offerId = new ObjectId()) {
  return {
    _id: offerId,
    active: true,
    type: 'FREE_PERIOD',
    durationMonths: 2,
    price: 0,
    currency: 'ZAR',
    eligibilityRules: {
      accountTypes: ['seller'],
      subscriptionStatuses: ['PAYMENT_REQUIRED'],
      requiresPreviousSellerAccess: true,
      requiresInactiveSubscription: true,
      maxClaimsPerUser: 1
    }
  };
}

test('reactivation eligibility is data-driven and excludes new or already-claimed sellers', () => {
  const offer = reactivationOffer();
  assert.equal(satisfiesEligibilityRules(eligibleUser(), offer, 0), true);
  assert.equal(satisfiesEligibilityRules({ ...eligibleUser(), hasHadSellerAccess: false }, offer, 0), false);
  assert.equal(satisfiesEligibilityRules(eligibleUser(), offer, 1), false);
  assert.equal(satisfiesEligibilityRules({ ...eligibleUser(), subscribed: true, subscriptionEndDate: '2099-01-01' }, offer, 0), false);
});

test('claiming an offer creates claim and subscription records before reactivating access', async () => {
  const user = eligibleUser();
  const offer = reactivationOffer();
  const claimId = new ObjectId();
  const subscriptionId = new ObjectId();
  const operations = [];
  const db = {
    collection(name) {
      if (name === 'sellerOfferClaims') {
        return {
          async countDocuments() { return 0; },
          async insertOne(document) {
            operations.push({ name, operation: 'insertOne', document });
            return { insertedId: claimId };
          },
          async updateOne(filter, update) {
            operations.push({ name, operation: 'updateOne', filter, update });
          },
          async deleteOne() {}
        };
      }
      if (name === 'sellerSubscriptions') {
        return {
          async insertOne(document) {
            operations.push({ name, operation: 'insertOne', document });
            return { insertedId: subscriptionId };
          },
          async deleteOne() {}
        };
      }
      if (name === 'users') {
        return {
          async updateOne(filter, update) {
            operations.push({ name, operation: 'updateOne', filter, update });
          }
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    }
  };
  const now = new Date('2026-10-31T10:00:00.000Z');

  const result = await claimOffer(db, user, offer, now);

  assert.equal(result.claimId, claimId);
  assert.equal(result.subscriptionId, subscriptionId);
  assert.equal(result.startsAt.toISOString(), now.toISOString());
  assert.equal(result.expiresAt.toISOString(), '2026-12-31T10:00:00.000Z');
  assert.equal(operations[0].name, 'sellerOfferClaims');
  assert.equal(operations[1].name, 'sellerSubscriptions');
  assert.equal(operations[2].name, 'users');
  assert.equal(operations[2].update.$set.subscriptionSource, 'OFFER');
  assert.equal(operations[2].update.$set.currentOfferClaimId, claimId);
  assert.equal(operations[3].update.$set.status, 'CLAIMED');
});

test('an already-claimed offer cannot be claimed again', async () => {
  const db = {
    collection(name) {
      assert.equal(name, 'sellerOfferClaims');
      return { async countDocuments() { return 1; } };
    }
  };

  await assert.rejects(
    claimOffer(db, eligibleUser(), reactivationOffer()),
    error => error.code === 'OFFER_NOT_ELIGIBLE' && error.status === 409
  );
});
