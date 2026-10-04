const cacheWindowMs = 30_000;
let cachedAt = 0;
let cached = null;
let inFlight = null;

async function probeDependency(name, baseUrl, fetchImpl = fetch, timeoutMs = 20_000) {
  const startedAt = Date.now();
  if (!baseUrl) {
    return { name, status: 'not-configured', httpStatus: null, durationMs: 0 };
  }

  try {
    const healthUrl = new URL('health', `${baseUrl.replace(/\/+$/, '')}/`);
    const response = await fetchImpl(healthUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    });
    return {
      name,
      status: response.ok ? 'ready' : 'waking',
      httpStatus: response.status,
      durationMs: Date.now() - startedAt
    };
  } catch {
    return { name, status: 'waking', httpStatus: null, durationMs: Date.now() - startedAt };
  }
}

async function warmRequiredServices() {
  const now = Date.now();
  if (cached && now - cachedAt < cacheWindowMs) return cached;
  if (inFlight) return inFlight;

  inFlight = Promise.all([
    probeDependency('payment-service', process.env.PAYMENT_SERVICE_URL)
  ]).then((result) => {
    cached = result;
    cachedAt = Date.now();
    return result;
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { probeDependency, warmRequiredServices };
