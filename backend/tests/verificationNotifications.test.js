const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');

const { notifyAdminsOfVerificationRequest } = require('../services/verificationNotificationService');

test('a new seller verification notifies each active administrator email once', async () => {
  const requestId = new ObjectId();
  const seller = { name: 'Seller One', email: 'seller@example.test' };
  const admins = [
    { name: 'Admin One', email: 'admin@example.test' },
    { name: 'Duplicate Admin', email: ' ADMIN@example.test ' },
    { name: 'Admin Two', email: 'second-admin@example.test' },
    { name: 'Missing Email' }
  ];
  let query;
  let projection;
  const sent = [];
  const db = {
    collection(name) {
      assert.equal(name, 'users');
      return {
        find(filter) {
          query = filter;
          return {
            project(fields) {
              projection = fields;
              return { async toArray() { return admins; } };
            }
          };
        }
      };
    }
  };

  const result = await notifyAdminsOfVerificationRequest(
    db,
    seller,
    requestId,
    async (admin, submittedSeller, submittedRequestId) => {
      sent.push({ admin, submittedSeller, submittedRequestId });
    }
  );

  assert.deepEqual(query, {
    type: 'admin',
    email: { $type: 'string' },
    accountStatus: { $ne: 'suspended' }
  });
  assert.deepEqual(projection, { name: 1, email: 1 });
  assert.deepEqual(result, { attempted: 2, delivered: 2, failed: 0 });
  assert.deepEqual(sent.map(({ admin }) => admin.email), ['admin@example.test', 'second-admin@example.test']);
  assert.equal(sent[0].submittedSeller, seller);
  assert.equal(sent[0].submittedRequestId, requestId.toString());
});

test('one failed administrator email does not stop the remaining notifications', async () => {
  const db = {
    collection() {
      return {
        find() {
          return {
            project() {
              return {
                async toArray() {
                  return [
                    { email: 'first-admin@example.test' },
                    { email: 'second-admin@example.test' }
                  ];
                }
              };
            }
          };
        }
      };
    }
  };
  const attempted = [];

  const result = await notifyAdminsOfVerificationRequest(
    db,
    { name: 'Seller' },
    new ObjectId(),
    async (admin) => {
      attempted.push(admin.email);
      if (admin.email.startsWith('first')) throw new Error('Delivery rejected');
    }
  );

  assert.deepEqual(attempted, ['first-admin@example.test', 'second-admin@example.test']);
  assert.deepEqual(result, { attempted: 2, delivered: 1, failed: 1 });
});
