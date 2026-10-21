function clientAddress(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimit({ windowMs, max, message }) {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = clientAddress(req);
    const current = requests.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    requests.set(key, entry);

    const remaining = Math.max(0, max - entry.count);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ success: false, error: message });
    }

    if (requests.size > 10_000) {
      for (const [address, value] of requests) {
        if (value.resetAt <= now) requests.delete(address);
      }
    }

    return next();
  };
}

module.exports = { createRateLimit };
