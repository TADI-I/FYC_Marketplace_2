import { useEffect } from 'react';

const storageKey = 'lbg-marketplace-last-warmup';
const minimumIntervalMs = 5 * 60 * 1000;
let lastWarmupAt = 0;

const apiBase = (process.env.REACT_APP_API_BASE || 'http://localhost:5001').replace(/\/+$/, '');
const paymentServiceUrl = process.env.REACT_APP_PAYMENT_SERVICE_URL?.replace(/\/+$/, '');

function storedWarmupAt(): number {
  try {
    return Number(window.sessionStorage.getItem(storageKey) || 0);
  } catch {
    return 0;
  }
}

function recordWarmup(value: number) {
  lastWarmupAt = value;
  try {
    window.sessionStorage.setItem(storageKey, String(value));
  } catch {
    // In-memory throttling remains active when browser storage is unavailable.
  }
}

function warmServices() {
  const now = Date.now();
  const previous = Math.max(lastWarmupAt, storedWarmupAt());
  if (now - previous < minimumIntervalMs) return;

  recordWarmup(now);
  const requests = [fetch(`${apiBase}/api/warmup`, {
    cache: 'no-store',
    keepalive: true
  })];
  if (paymentServiceUrl) {
    requests.push(fetch(`${paymentServiceUrl}/health`, {
      cache: 'no-store',
      keepalive: true,
      mode: 'no-cors'
    }));
  }
  void Promise.allSettled(requests);
}

export default function ServiceWarmup() {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') warmServices();
    };

    warmServices();
    window.addEventListener('focus', warmServices);
    window.addEventListener('pageshow', warmServices);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', warmServices);
      window.removeEventListener('pageshow', warmServices);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
