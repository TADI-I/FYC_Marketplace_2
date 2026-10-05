const crypto = require('crypto');

const READY_CACHE_MS = 30_000;
const READY_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const RETRYABLE_GATEWAY_STATUSES = new Set([502, 503, 504]);
let readyAt = 0;
let readyBaseUrl = null;
let readyInFlight = null;

function paymentServiceConfig() {
  const baseUrl = process.env.PAYMENT_SERVICE_URL?.trim();
  const keyId = process.env.PAYMENT_SERVICE_KEY_ID?.trim();
  const secret = process.env.PAYMENT_SERVICE_SECRET?.trim();
  if (!baseUrl || !keyId || !secret) {
    const error = new Error('Payment Service is not configured.');
    error.code = 'PAYMENT_SERVICE_NOT_CONFIGURED';
    throw error;
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), keyId, secret };
}

async function waitUntilReady(config) {
  if (readyBaseUrl === config.baseUrl && Date.now() - readyAt < READY_CACHE_MS) return;
  if (readyInFlight) return readyInFlight;

  readyInFlight = (async () => {
    try {
      const response = await fetch(`${config.baseUrl}/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(READY_TIMEOUT_MS)
      });
      if (!response.ok) throw new Error(`Health check returned HTTP ${response.status}.`);
      readyBaseUrl = config.baseUrl;
      readyAt = Date.now();
    } catch (cause) {
      const error = new Error('Payment service is still starting. Please try again in a moment.');
      error.code = 'PAYMENT_SERVICE_WAKING';
      error.cause = cause;
      throw error;
    } finally {
      readyInFlight = null;
    }
  })();

  return readyInFlight;
}

async function request(path, options = {}) {
  const config = paymentServiceConfig();
  await waitUntilReady(config);

  return requestOnce(config, path, options, true);
}

async function requestOnce(config, path, options, allowGatewayRetry) {
  let response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${config.keyId}.${config.secret}`,
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (cause) {
    const error = new Error('Payment service is unavailable.');
    error.code = 'PAYMENT_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    if (allowGatewayRetry && !payload && RETRYABLE_GATEWAY_STATUSES.has(response.status)) {
      readyAt = 0;
      readyBaseUrl = null;
      await waitUntilReady(config);
      return requestOnce(config, path, options, false);
    }
    const fallbackMessage = RETRYABLE_GATEWAY_STATUSES.has(response.status)
      ? 'Payment service is temporarily unavailable. Please try again.'
      : `Payment service request failed (HTTP ${response.status || 'unknown'}).`;
    const error = new Error(payload?.error || fallbackMessage);
    error.code = payload?.code || 'PAYMENT_SERVICE_ERROR';
    error.status = response.status;
    throw error;
  }
  return payload;
}

exports.createPayment = (input) => request('/api/v1/payments', {
  method: 'POST',
  headers: { 'idempotency-key': input.idempotencyKey },
  body: JSON.stringify({
    tenantId: input.tenantId,
    orderId: input.orderId,
    customerId: input.customerId,
    amount: input.amount,
    currency: input.currency,
    customer: { email: input.email },
    returnUrl: input.returnUrl,
    metadata: input.metadata
  })
});

exports.signatureFor = (secret, timestamp, rawBody) => crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

exports.safeEqual = (left, right) => {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

exports.verifyCallback = ({ rawBody, signature, timestamp, now = Date.now() }) => {
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(now - timestampSeconds * 1000) > 5 * 60 * 1000) return false;
  const secret = process.env.PAYMENT_SERVICE_CALLBACK_SECRET;
  if (!secret || secret.length < 32) return false;
  return exports.safeEqual(exports.signatureFor(secret, timestamp, rawBody), signature);
};

exports.validateCallbackPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  if (!['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED'].includes(payload.type)) return false;
  const payment = payload.payment;
  return typeof payload.id === 'string'
    && typeof payload.occurredAt === 'string'
    && payment && typeof payment === 'object'
    && payment.product === 'marketplace'
    && typeof payment.id === 'string'
    && typeof payment.tenantId === 'string'
    && typeof payment.orderId === 'string'
    && typeof payment.reference === 'string'
    && Number.isSafeInteger(payment.amount) && payment.amount > 0
    && typeof payment.currency === 'string'
    && typeof payment.status === 'string';
};

exports.subscriptionPeriod = (user, now = new Date()) => {
  const currentEnd = user?.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
  const start = user?.subscribed && currentEnd && currentEnd > now ? currentEnd : now;
  return { start, end: new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000) };
};
