const assert = require('node:assert/strict');
const test = require('node:test');
const paymentService = require('../services/paymentService');

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
