const assert = require('node:assert/strict');
const test = require('node:test');
const paymentService = require('../services/paymentService');

test('service credentials ignore accidental environment whitespace', async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.PAYMENT_SERVICE_URL;
  const originalKeyId = process.env.PAYMENT_SERVICE_KEY_ID;
  const originalSecret = process.env.PAYMENT_SERVICE_SECRET;
  let request;

  process.env.PAYMENT_SERVICE_URL = '  https://payments.example.test/  ';
  process.env.PAYMENT_SERVICE_KEY_ID = ' marketplace_local\n';
  process.env.PAYMENT_SERVICE_SECRET = '  service-secret-service-secret-1234\n';
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ payment: { id: 'payment-1' }, authorizationUrl: 'https://checkout.example.test' })
    };
  };

  try {
    await paymentService.createPayment({
      idempotencyKey: 'marketplace:test-order:seller-subscription',
      tenantId: 'tenant-1',
      orderId: 'order-1',
      customerId: 'customer-1',
      email: 'buyer@example.test',
      amount: 2500,
      currency: 'ZAR',
      returnUrl: 'https://marketplace.example.test',
      metadata: {}
    });
    assert.equal(request.url, 'https://payments.example.test/api/v1/payments');
    assert.equal(
      request.options.headers.authorization,
      'Bearer marketplace_local.service-secret-service-secret-1234'
    );
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.PAYMENT_SERVICE_URL;
    else process.env.PAYMENT_SERVICE_URL = originalUrl;
    if (originalKeyId === undefined) delete process.env.PAYMENT_SERVICE_KEY_ID;
    else process.env.PAYMENT_SERVICE_KEY_ID = originalKeyId;
    if (originalSecret === undefined) delete process.env.PAYMENT_SERVICE_SECRET;
    else process.env.PAYMENT_SERVICE_SECRET = originalSecret;
  }
});

test('checkout waits for a cold payment service before creating the payment', async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.PAYMENT_SERVICE_URL;
  const originalKeyId = process.env.PAYMENT_SERVICE_KEY_ID;
  const originalSecret = process.env.PAYMENT_SERVICE_SECRET;
  const calls = [];

  process.env.PAYMENT_SERVICE_URL = 'https://cold-payments.example.test';
  process.env.PAYMENT_SERVICE_KEY_ID = 'marketplace_test';
  process.env.PAYMENT_SERVICE_SECRET = 'service-secret-service-secret-1234';
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/health')) {
      return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
    }
    return {
      ok: true,
      status: 201,
      json: async () => ({ payment: { id: 'payment-cold' }, authorizationUrl: 'https://checkout.example.test/cold' })
    };
  };

  try {
    const result = await paymentService.createPayment({
      idempotencyKey: 'marketplace:cold-order:seller-subscription',
      tenantId: 'tenant-cold',
      orderId: 'order-cold',
      customerId: 'customer-cold',
      email: 'seller@example.test',
      amount: 2500,
      currency: 'ZAR',
      returnUrl: 'https://marketplace.example.test',
      metadata: {}
    });
    assert.equal(calls[0].url, 'https://cold-payments.example.test/health');
    assert.equal(calls[1].url, 'https://cold-payments.example.test/api/v1/payments');
    assert.equal(result.authorizationUrl, 'https://checkout.example.test/cold');
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.PAYMENT_SERVICE_URL;
    else process.env.PAYMENT_SERVICE_URL = originalUrl;
    if (originalKeyId === undefined) delete process.env.PAYMENT_SERVICE_KEY_ID;
    else process.env.PAYMENT_SERVICE_KEY_ID = originalKeyId;
    if (originalSecret === undefined) delete process.env.PAYMENT_SERVICE_SECRET;
    else process.env.PAYMENT_SERVICE_SECRET = originalSecret;
  }
});

test('signed callbacks accept a current valid signature', () => {
  process.env.PAYMENT_SERVICE_CALLBACK_SECRET = 'callback-secret-callback-secret-1234';
  const now = Date.parse('2026-10-01T12:00:00.000Z');
  const timestamp = String(Math.floor(now / 1000));
  const rawBody = JSON.stringify({ id: 'event-1' });
  const signature = paymentService.signatureFor(process.env.PAYMENT_SERVICE_CALLBACK_SECRET, timestamp, rawBody);
  assert.equal(paymentService.verifyCallback({ rawBody, signature, timestamp, now }), true);
});

test('callbacks reject invalid signatures and replayed timestamps', () => {
  process.env.PAYMENT_SERVICE_CALLBACK_SECRET = 'callback-secret-callback-secret-1234';
  const now = Date.parse('2026-10-01T12:00:00.000Z');
  const oldTimestamp = String(Math.floor((now - 10 * 60 * 1000) / 1000));
  const rawBody = '{}';
  assert.equal(paymentService.verifyCallback({ rawBody, signature: 'invalid', timestamp: String(Math.floor(now / 1000)), now }), false);
  const oldSignature = paymentService.signatureFor(process.env.PAYMENT_SERVICE_CALLBACK_SECRET, oldTimestamp, rawBody);
  assert.equal(paymentService.verifyCallback({ rawBody, signature: oldSignature, timestamp: oldTimestamp, now }), false);
});

test('callback payload validation enforces Marketplace product and integer minor units', () => {
  const payload = {
    id: 'event-1',
    type: 'PAYMENT_SUCCESS',
    occurredAt: '2026-10-01T12:00:00.000Z',
    payment: {
      id: 'payment-1', product: 'marketplace', tenantId: 'user-1', orderId: 'order-1',
      reference: 'LBG-MKT-ORDER1-ABC', amount: 2500, currency: 'ZAR', status: 'SUCCESS'
    }
  };
  assert.equal(paymentService.validateCallbackPayload(payload), true);
  assert.equal(paymentService.validateCallbackPayload({ ...payload, payment: { ...payload.payment, product: 'ticketing' } }), false);
  assert.equal(paymentService.validateCallbackPayload({ ...payload, payment: { ...payload.payment, amount: 25.5 } }), false);
  assert.equal(paymentService.validateCallbackPayload({ event: 'bad' }), false);
});

test('subscription periods extend active access but do not depend on callback retry count', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');
  const newPeriod = paymentService.subscriptionPeriod({ subscribed: false }, now);
  assert.equal(newPeriod.start.toISOString(), now.toISOString());
  assert.equal(newPeriod.end.toISOString(), '2026-10-31T12:00:00.000Z');

  const renewal = paymentService.subscriptionPeriod({ subscribed: true, subscriptionEndDate: '2026-10-15T12:00:00.000Z' }, now);
  assert.equal(renewal.start.toISOString(), '2026-10-15T12:00:00.000Z');
  assert.equal(renewal.end.toISOString(), '2026-11-14T12:00:00.000Z');
});
