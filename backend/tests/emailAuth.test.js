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
