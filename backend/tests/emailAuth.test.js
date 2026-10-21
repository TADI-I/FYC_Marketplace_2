const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-jwt-secret-with-32-characters';
process.env.RESEND_API_KEY = 're_test-only-not-a-live-key';
process.env.EMAIL_FROM = 'FYC Marketplace <marketplace@example.test>';
process.env.FRONTEND_URL = 'https://marketplace.example.test';
process.env.EMAIL_DELIVERY_DISABLED = 'true';

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { createAccountToken, hashAccountToken } = require('../services/accountTokenService');
const { escapeHtml } = require('../services/emailService');
const { authenticateToken } = require('../middleware/authMiddleware');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test('account tokens are random and only their SHA-256 hashes need storage', () => {
  const first = createAccountToken();
  const second = createAccountToken();
  assert.notEqual(first.token, second.token);
  assert.equal(first.hash, hashAccountToken(first.token));
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.equal(first.hash.includes(first.token), false);
});

test('email verification consumes a current matching token', async () => {
  const token = createAccountToken();
  let updateFilter;
  let updateDocument;
  const db = { collection(name) {
    assert.equal(name, 'users');
    return { async updateOne(filter, update) { updateFilter = filter; updateDocument = update; return { matchedCount: 1 }; } };
  } };
  const req = { body: { token: token.token }, query: {} };
  const res = responseRecorder();

  await authController.verifyEmail(req, res, db);

  assert.equal(res.statusCode, 200);
  assert.equal(updateFilter.emailVerificationTokenHash, token.hash);
  assert.equal(updateDocument.$set.emailVerified, true);
  assert.equal(updateDocument.$unset.emailVerificationTokenHash, '');
});

test('password reset replaces the hash and consumes the reset token', async () => {
  const token = createAccountToken();
  const userId = new ObjectId();
  let updateDocument;
  const db = { collection(name) {
    assert.equal(name, 'users');
    return {
      async findOne(filter) {
        assert.equal(filter.passwordResetTokenHash, token.hash);
        return { _id: userId };
      },
      async updateOne(_filter, update) { updateDocument = update; return { matchedCount: 1 }; }
    };
  } };
  const res = responseRecorder();

  await authController.resetPassword({ body: { token: token.token, password: 'new-password-123' } }, res, db);

  assert.equal(res.statusCode, 200);
  assert.notEqual(updateDocument.$set.password, 'new-password-123');
  assert.equal(updateDocument.$unset.passwordResetTokenHash, '');
  assert.equal(updateDocument.$unset.passwordResetExpiresAt, '');
});

test('password reset requests use a generic response and store only a token hash', async () => {
  const userId = new ObjectId();
  let savedUpdate;
  const db = { collection() { return {
    async findOne() { return { _id: userId, name: 'Student', email: 'student@example.test' }; },
    async updateOne(_filter, update) { savedUpdate = update; return { matchedCount: 1 }; }
  }; } };
  const res = responseRecorder();

  await authController.forgotPassword({ body: { email: 'STUDENT@example.test' } }, res, db);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.message, 'If an account exists for that email, a reset link has been sent.');
  assert.match(savedUpdate.$set.passwordResetTokenHash, /^[a-f0-9]{64}$/);
  assert.ok(savedUpdate.$set.passwordResetExpiresAt > new Date());
});

test('confirming an email change consumes a current token and promotes only the pending address', async () => {
  const token = createAccountToken();
  const userId = new ObjectId();
  let updateFilter;
  let updateDocument;
  let findCount = 0;
  const db = { collection() { return {
    async findOne(filter) {
      findCount += 1;
      if (findCount === 1) {
        assert.equal(filter.pendingEmailTokenHash, token.hash);
        return { _id: userId, email: 'old@example.test', pendingEmail: 'new@example.test' };
      }
      return null;
    },
    async updateOne(filter, update) { updateFilter = filter; updateDocument = update; return { matchedCount: 1 }; },
    async updateMany() { return { matchedCount: 0 }; }
  }; } };
  const res = responseRecorder();

  await userController.confirmEmailChange({ body: { token: token.token }, query: {} }, res, db);

  assert.equal(res.statusCode, 200);
  assert.equal(updateFilter.pendingEmailTokenHash, token.hash);
  assert.equal(updateDocument.$set.email, 'new@example.test');
  assert.equal(updateDocument.$unset.pendingEmailTokenHash, '');
  assert.equal(updateDocument.$unset.pendingEmail, '');
});

test('expired email-change tokens are rejected and cleared without changing email', async () => {
  const token = createAccountToken();
  let cleared = false;
  const db = { collection() { return {
    async findOne() { return null; },
    async updateMany(filter, update) {
      assert.equal(filter.pendingEmailTokenHash, token.hash);
      assert.equal(update.$unset.pendingEmail, '');
      cleared = true;
      return { matchedCount: 1 };
    }
  }; } };
  const res = responseRecorder();

  await userController.confirmEmailChange({ body: { token: token.token }, query: {} }, res, db);

  assert.equal(res.statusCode, 400);
  assert.equal(cleared, true);
});

test('profile email changes stay pending for exactly ten minutes', async () => {
  const userId = new ObjectId();
  const original = {
    _id: userId,
    name: 'Student',
    email: 'old@example.test',
    campus: 'arts',
    type: 'buyer',
    subscribed: false,
    emailVerified: true
  };
  let storedSet;
  let lookupCount = 0;
  const db = { collection() { return {
    async findOne() {
      lookupCount += 1;
      if (lookupCount === 1) return null;
      if (lookupCount === 2) return original;
      return { ...original, ...storedSet };
    },
    async updateOne(_filter, update) { storedSet = update.$set; return { matchedCount: 1 }; }
  }; } };
  const res = responseRecorder();
  const before = Date.now();

  await userController.updateUserProfile({
    params: { id: userId.toString() },
    body: { name: 'Student', campus: 'arts', email: 'new@example.test', whatsapp: '27123456789' }
  }, res, db);

  assert.equal(res.statusCode, 200);
  assert.equal(storedSet.email, undefined);
  assert.equal(storedSet.pendingEmail, 'new@example.test');
  assert.ok(storedSet.pendingEmailTokenHash);
  assert.equal(storedSet.pendingEmailExpiresAt.getTime() - storedSet.updatedAt.getTime(), 10 * 60 * 1000);
  assert.ok(storedSet.updatedAt.getTime() >= before);
  assert.equal(res.payload.user.email, 'old@example.test');
  assert.equal(res.payload.user.pendingEmail, 'new@example.test');
});

test('email templates escape user-controlled HTML', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});

test('password changes revoke JWTs issued before the change', async () => {
  const userId = new ObjectId();
  const token = jwt.sign({ id: userId.toString(), type: 'buyer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = {
    headers: { authorization: `Bearer ${token}` },
    db: { collection() { return { async findOne() { return { emailVerified: true, passwordChangedAt: new Date(Date.now() + 1000) }; } }; } }
  };
  const res = responseRecorder();
  let nextCalled = false;

  await authenticateToken(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.code, 'SESSION_REVOKED');
});
