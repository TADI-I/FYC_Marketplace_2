const assert = require('node:assert/strict');
const test = require('node:test');
const { probeDependency } = require('../services/serviceWarmup');

test('service warm-up calls the Payment Service health endpoint', async () => {
  let requestedUrl = '';
  const result = await probeDependency('payment-service', 'https://payments.example/', async (input) => {
    requestedUrl = String(input);
    return new Response('{}', { status: 200 });
  });

  assert.equal(requestedUrl, 'https://payments.example/health');
  assert.equal(result.status, 'ready');
  assert.equal(result.httpStatus, 200);
});

test('a cold dependency does not make warm-up throw', async () => {
  const result = await probeDependency('payment-service', 'https://payments.example', async () => {
    throw new Error('cold start timeout');
  });

  assert.equal(result.status, 'waking');
  assert.equal(result.httpStatus, null);
});
