const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const authController = require('../controllers/authController');

function responseRecorder() {
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

function registrationDb() {
  const state = { insertedUser: null };
  return {
    state,
    db: {
      collection(name) {
        assert.equal(name, 'users');
        return {
          async findOne() {
            return null;
          },
          async insertOne(user) {
            state.insertedUser = user;
            return { insertedId: new ObjectId() };
          }
        };
      }
    }
  };
}

test('seller registration does not automatically start a free period', async () => {
  const { db, state } = registrationDb();
  const req = { body: {
    name: 'Seller One',
    email: 'seller@example.test',
    password: 'password123',
    campus: 'pretoria-main',
    whatsapp: '+27 71 234 5678',
    type: 'seller'
  } };
  const res = responseRecorder();

  await authController.register(req, res, db);

  assert.equal(res.statusCode, 201);
  assert.equal(state.insertedUser.type, 'seller');
  assert.equal(state.insertedUser.hasHadSellerAccess, false);
  assert.equal(state.insertedUser.subscriptionStatus, 'PAYMENT_REQUIRED');
  assert.equal(state.insertedUser.subscribed, false);
  assert.equal(state.insertedUser.subscriptionStartDate, undefined);
  assert.equal(res.payload.user.subscriptionStatus, 'PAYMENT_REQUIRED');
  assert.equal(res.payload.user.hasHadSellerAccess, false);
  assert.ok(res.payload.token);
});

test('buyer registration starts without seller access or an automatic offer claim', async () => {
  const { db, state } = registrationDb();
  const req = { body: {
    name: 'Buyer One',
    email: 'buyer@example.test',
    password: 'password123',
    campus: 'pretoria-main',
    type: 'buyer'
  } };
  const res = responseRecorder();

  await authController.register(req, res, db);

  assert.equal(res.statusCode, 201);
  assert.equal(state.insertedUser.type, 'buyer');
  assert.equal(state.insertedUser.hasHadSellerAccess, false);
  assert.equal(state.insertedUser.subscriptionStatus, 'NONE');
  assert.equal(state.insertedUser.subscribed, false);
  assert.equal(state.insertedUser.subscriptionStartDate, undefined);
});
