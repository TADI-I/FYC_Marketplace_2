const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const userController = require('../controllers/userController');

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('expired seller activation presents an offer without starting it', async () => {
  const userId = new ObjectId();
  const offerId = new ObjectId();
  const user = {
    _id: userId,
    name: 'Returning Seller',
    email: 'seller@example.test',
    password: 'secret-hash',
    type: 'seller',
    hasHadSellerAccess: true,
    subscribed: false,
    subscriptionStatus: 'PAYMENT_REQUIRED',
    subscriptionEndDate: new Date('2026-09-01T00:00:00.000Z')
  };
  const offer = {
    _id: offerId,
    code: 'SELLER_REACTIVATION_2_MONTHS',
    name: '2 Months Free Reactivation',
    description: 'Return free for two months.',
    type: 'FREE_PERIOD',
    durationMonths: 2,
    price: 0,
    currency: 'ZAR',
    active: true,
    eligibilityRules: {
      accountTypes: ['seller'],
      subscriptionStatuses: ['PAYMENT_REQUIRED'],
      requiresPreviousSellerAccess: true,
      requiresInactiveSubscription: true,
      maxClaimsPerUser: 1
    }
  };
  let userUpdates = 0;
  const db = {
    collection(name) {
      if (name === 'users') {
        return {
          async findOne() { return { ...user }; },
          async updateOne() { userUpdates += 1; return { matchedCount: 1 }; }
        };
      }
      if (name === 'sellerOffers') {
        return {
          find() {
            return { sort() { return { async toArray() { return [offer]; } }; } };
          }
        };
      }
      if (name === 'sellerOfferClaims') {
        return {
          aggregate() { return { async toArray() { return []; } }; }
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    }
  };
  const req = { params: { id: userId.toString() }, user: { id: userId.toString(), type: 'seller' } };
  const res = createResponse();

  await userController.upgradeUserToSeller(req, res, db);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.activation, 'OFFER_AVAILABLE');
  assert.equal(res.payload.claimRequired, true);
  assert.equal(res.payload.offers.length, 1);
  assert.equal(res.payload.offers[0].id, offerId);
  assert.equal(res.payload.user.subscribed, false);
  assert.equal(res.payload.user.password, undefined);
  assert.equal(userUpdates, 0);
});
