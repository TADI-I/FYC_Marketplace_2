const assert = require('node:assert/strict');
const test = require('node:test');
const { ObjectId } = require('mongodb');
const { configuredOrigins, getJwtSecret } = require('../config/security');
const { createRateLimit } = require('../middleware/rateLimit');
const { requireOwnership } = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');
const { isSupportedImage } = require('../controllers/verificationController');

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test('JWT configuration rejects missing, short, and placeholder secrets', () => {
  assert.throws(() => getJwtSecret({}), /JWT_SECRET/);
  assert.throws(() => getJwtSecret({ JWT_SECRET: 'too-short' }), /JWT_SECRET/);
  assert.throws(() => getJwtSecret({ JWT_SECRET: 'replace-with-at-least-32-random-characters' }), /JWT_SECRET/);
  assert.equal(getJwtSecret({ JWT_SECRET: 'a-secure-test-value-with-32-characters' }), 'a-secure-test-value-with-32-characters');
});

test('CORS origins are exact, normalized values', () => {
  assert.deepEqual(configuredOrigins({
    CORS_ALLOWED_ORIGINS: 'https://marketplace.example/, https://admin.example'
  }), ['https://marketplace.example', 'https://admin.example']);
});

test('authentication rate limiter returns 429 after the allowance', () => {
  const limit = createRateLimit({ windowMs: 60_000, max: 2, message: 'Slow down' });
  const req = { ip: '192.0.2.10' };
  const nextCalls = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = responseRecorder();
    limit(req, res, () => nextCalls.push(attempt));
    if (attempt === 2) {
      assert.equal(res.statusCode, 429);
      assert.equal(res.payload.error, 'Slow down');
      assert.ok(res.headers['Retry-After']);
    }
  }
  assert.equal(nextCalls.length, 2);
});

test('conversation identifiers are derived from both participants', () => {
  assert.equal(
    messageController.canonicalConversationId('bbbbbbbbbbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaaaaaaaaaa'),
    'aaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbbbbbbbbbb'
  );
});

test('message reads are scoped to the authenticated participant', async () => {
  const userId = new ObjectId();
  let capturedFilter;
  const db = {
    collection(name) {
      assert.equal(name, 'messages');
      return {
        find(filter) {
          capturedFilter = filter;
          return { sort() { return { async toArray() { return []; } }; } };
        }
      };
    }
  };
  const req = { user: { id: userId.toString() }, params: { conversationId: 'conversation' } };
  const res = responseRecorder();
  await messageController.getMessages(req, res, db);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter.conversationId, 'conversation');
  assert.equal(capturedFilter.$or[0].senderId.toString(), userId.toString());
  assert.equal(capturedFilter.$or[1].receiverId.toString(), userId.toString());
});

test('message creation rejects a forged conversation identifier', async () => {
  const senderId = new ObjectId();
  const receiverId = new ObjectId();
  const req = {
    user: { id: senderId.toString() },
    body: { receiverId: receiverId.toString(), text: 'Hello', conversationId: 'forged' }
  };
  const res = responseRecorder();
  await messageController.sendMessage(req, res, { collection() { throw new Error('database should not be queried'); } });
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'Invalid conversation');
});

test('marking messages read only updates unread messages received by the authenticated user for that product', async () => {
  const userId = new ObjectId();
  const productId = new ObjectId();
  let capturedFilter;
  const db = { collection(name) {
    assert.equal(name, 'messages');
    return { async updateMany(filter) { capturedFilter = filter; return { modifiedCount: 2 }; } };
  } };
  const req = { user: { id: String(userId) }, params: { conversationId: 'thread' }, body: { productId: String(productId) } };
  const res = responseRecorder();
  await messageController.markMessagesAsRead(req, res, db);
  assert.equal(res.payload.markedRead, 2);
  assert.equal(String(capturedFilter.receiverId), String(userId));
  assert.equal(String(capturedFilter.productId), String(productId));
  assert.equal(capturedFilter.read, false);
});

test('public product feeds do not expose seller WhatsApp numbers', async () => {
  let capturedPipeline;
  const db = { collection(name) {
    assert.equal(name, 'products');
    return { aggregate(pipeline) { capturedPipeline = pipeline; return { async toArray() { return []; } }; } };
  } };
  const req = { query: {} };
  const res = responseRecorder();
  await productController.getProducts(req, res, db);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.stringify(capturedPipeline).includes('sellerWhatsApp'), false);
  assert.equal(JSON.stringify(capturedPipeline).includes('seller.whatsapp'), false);
});

test('authenticated product contact returns only the selected seller contact with no-store caching', async () => {
  const productId = new ObjectId();
  const sellerId = new ObjectId();
  const db = { collection(name) {
    if (name === 'products') return { async findOne() { return { _id: productId, sellerId, title: 'Calculator' }; } };
    if (name === 'users') return { async findOne() { return { _id: sellerId, name: 'Seller', whatsapp: '27821234567', subscribed: true }; } };
    throw new Error(`Unexpected collection ${name}`);
  } };
  const req = { params: { id: String(productId) }, user: { id: String(new ObjectId()) } };
  const res = responseRecorder();
  await productController.getProductContact(req, res, db);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(res.payload.contact, { sellerId, sellerName: 'Seller', whatsapp: '27821234567' });
});

test('users cannot retrieve another account private profile', async () => {
  const req = { user: { id: String(new ObjectId()), type: 'buyer' }, params: { id: String(new ObjectId()) } };
  const res = responseRecorder();
  await userController.getUserProfile(req, res, { collection() { throw new Error('database should not be queried'); } });
  assert.equal(res.statusCode, 403);
});

test('verification uploads require matching image signatures', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.equal(isSupportedImage(png, 'image/png'), true);
  assert.equal(isSupportedImage(Buffer.from('not an image'), 'image/png'), false);
  assert.equal(isSupportedImage(png, 'image/jpeg'), false);
});

test('user ownership accepts verification routes that use the userId parameter', async () => {
  const userId = new ObjectId();
  const req = {
    user: { id: userId.toString(), type: 'seller' },
    params: { userId: userId.toString() }
  };
  const res = responseRecorder();
  let nextCalled = false;
  const db = {
    collection(name) {
      assert.equal(name, 'users');
      return { async findOne(filter) { return { _id: filter._id }; } };
    }
  };

  await requireOwnership('user')(req, res, () => { nextCalled = true; }, db);
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
