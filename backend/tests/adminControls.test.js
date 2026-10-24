const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const userController = require('../controllers/userController');

const responseRecorder = () => {
  const record = { statusCode: 200, payload: null };
  return {
    record,
    res: {
      status(code) { record.statusCode = code; return this; },
      json(payload) { record.payload = payload; return this; }
    }
  };
};

test('admin overview returns operational marketplace totals', async () => {
  const values = { users: 14, products: 8, verificationRequests: 2 };
  let userCalls = 0;
  const db = {
    collection(name) {
      return {
        async countDocuments() {
          if (name === 'users') return [values.users, 5, 3, 1][userCalls++];
          return values[name];
        }
      };
    }
  };
  const { record, res } = responseRecorder();
  await userController.getAdminOverview({}, res, db);
  assert.equal(record.statusCode, 200);
  assert.deepEqual(record.payload.overview, {
    users: 14,
    sellers: 5,
    activeSellers: 3,
    products: 8,
    pendingVerifications: 2,
    suspendedUsers: 1
  });
});

test('admin can suspend a user and the audit fields are recorded', async () => {
  const adminId = new ObjectId();
  const target = { _id: new ObjectId(), name: 'Seller', email: 'seller@example.test', type: 'seller' };
  const users = {
    async findOne(filter) {
      if (filter.email) return null;
      return target;
    },
    async updateOne(_filter, update) { Object.assign(target, update.$set); return { matchedCount: 1 }; }
  };
  const db = { collection(name) { assert.equal(name, 'users'); return users; } };
  const { record, res } = responseRecorder();
  await userController.adminUpdateUser({
    params: { id: target._id.toString() },
    user: { id: adminId.toString(), type: 'admin' },
    body: { accountStatus: 'suspended' }
  }, res, db);

  assert.equal(record.statusCode, 200);
  assert.equal(target.accountStatus, 'suspended');
  assert.equal(target.suspendedBy.toString(), adminId.toString());
  assert.ok(target.suspendedAt instanceof Date);
});

test('administrator cannot suspend their own account', async () => {
  const adminId = new ObjectId();
  const db = { collection() { return { async findOne() { return { _id: adminId, type: 'admin' }; } }; } };
  const { record, res } = responseRecorder();
  await userController.adminUpdateUser({
    params: { id: adminId.toString() },
    user: { id: adminId.toString(), type: 'admin' },
    body: { accountStatus: 'suspended' }
  }, res, db);
  assert.equal(record.statusCode, 400);
  assert.match(record.payload.error, /cannot suspend/i);
});
