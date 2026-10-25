const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
process.env.EMAIL_DELIVERY_DISABLED = 'true';
const userController = require('../controllers/userController');

const responseRecorder = () => ({
  statusCode: 200,
  payload: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; }
});

test('an existing seller can save an accredited residence without exposing its coordinates', async () => {
  const userId = new ObjectId();
  const original = {
    _id: userId,
    name: 'Seller',
    email: 'seller@example.test',
    campus: 'arts',
    type: 'seller',
    subscribed: true,
    emailVerified: true
  };
  let savedUpdate;
  let lookup = 0;
  const db = { collection(name) {
    assert.equal(name, 'users');
    return {
      async findOne() {
        lookup += 1;
        if (lookup === 1) return null;
        if (lookup === 2) return original;
        return { ...original, ...savedUpdate.$set };
      },
      async updateOne(_filter, update) {
        savedUpdate = update;
        return { matchedCount: 1 };
      }
    };
  } };
  const res = responseRecorder();

  await userController.updateUserProfile({
    params: { id: String(userId) },
    body: {
      name: 'Seller',
      email: 'seller@example.test',
      whatsapp: null,
      campus: 'other',
      locationLabel: 'Example Accredited Residence',
      location: { latitude: -25.745, longitude: 28.19, accuracy: 12 }
    }
  }, res, db);

  assert.equal(res.statusCode, 200);
  assert.equal(savedUpdate.$set.campus, 'other');
  assert.equal(savedUpdate.$set.locationLabel, 'Example Accredited Residence');
  assert.deepEqual(savedUpdate.$set.pickupLocation.coordinates, [28.19, -25.745]);
  assert.equal(res.payload.user.hasCustomLocation, true);
  assert.equal('pickupLocation' in res.payload.user, false);
});
