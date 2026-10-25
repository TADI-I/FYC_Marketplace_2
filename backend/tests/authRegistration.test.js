const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
process.env.JWT_SECRET = 'test-only-jwt-secret-with-32-characters';
process.env.RESEND_API_KEY = 're_test-only-not-a-live-key';
process.env.EMAIL_FROM = 'Campus Cart <marketplace@example.test>';
process.env.FRONTEND_URL = 'https://marketplace.example.test';
process.env.EMAIL_DELIVERY_DISABLED = 'true';
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
  assert.equal(res.payload.token, undefined);
  assert.equal(res.payload.requiresEmailVerification, true);
  assert.equal(state.insertedUser.emailVerified, false);
  assert.match(state.insertedUser.emailVerificationTokenHash, /^[a-f0-9]{64}$/);
  assert.equal(state.insertedUser.emailVerificationToken, undefined);
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

test('an accredited residence stores a private point and returns only a location summary', async () => {
  const { db, state } = registrationDb();
  const req = { body: {
    name: 'Residence Seller',
    email: 'residence@example.test',
    password: 'password123',
    campus: 'other',
    locationLabel: 'Example Accredited Residence',
    location: { latitude: -25.745, longitude: 28.19, accuracy: 15 },
    type: 'seller'
  } };
  const res = responseRecorder();

  await authController.register(req, res, db);

  assert.equal(res.statusCode, 201);
  assert.equal(state.insertedUser.locationLabel, 'Example Accredited Residence');
  assert.deepEqual(state.insertedUser.pickupLocation.coordinates, [28.19, -25.745]);
  assert.equal(res.payload.user.locationLabel, 'Example Accredited Residence');
  assert.equal(res.payload.user.hasCustomLocation, true);
  assert.equal('pickupLocation' in res.payload.user, false);
});

test('Other location registration requires both a label and a valid shared point', async () => {
  const { db } = registrationDb();
  const req = { body: {
    name: 'Residence Seller',
    email: 'missing-location@example.test',
    password: 'password123',
    campus: 'other',
    locationLabel: 'Example Residence',
    type: 'seller'
  } };
  const res = responseRecorder();

  await authController.register(req, res, db);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'CUSTOM_LOCATION_REQUIRED');
});
