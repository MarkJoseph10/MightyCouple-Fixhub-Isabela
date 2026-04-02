import { ApiError } from "../utils/ApiError.js";

function getRequestKey(req) {
  const forwardedIp = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const ip = forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";
  const email = String(req.body?.email || "").trim().toLowerCase();

  return `${ip}:${email}`;
}

export function createRateLimiter({ windowMs = 10 * 60 * 1000, maxAttempts = 5, message } = {}) {
  const attempts = new Map();

  return function rateLimit(req, _, next) {
    const key = getRequestKey(req);
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || now > entry.resetAt) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxAttempts) {
      const minutesLeft = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
      next(new ApiError(429, message || `Too many attempts. Try again in ${minutesLeft} minute(s).`));
      return;
    }

    entry.count += 1;
    attempts.set(key, entry);
    next();
  };
}

export function recordRateLimitFailure(req, { windowMs = 10 * 60 * 1000 } = {}) {
  const store = failureStore;
  const key = getRequestKey(req);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
  store.set(key, entry);
}

export function clearRateLimitFailures(req) {
  failureStore.delete(getRequestKey(req));
}

const failureStore = new Map();

export function loginRateLimit(req, _, next) {
  const key = getRequestKey(req);
  const now = Date.now();
  const entry = failureStore.get(key);
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 5;

  if (!entry || now > entry.resetAt) {
    failureStore.set(key, { count: 0, resetAt: now + windowMs });
    next();
    return;
  }

  if (entry.count >= maxAttempts) {
    const minutesLeft = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
    next(new ApiError(429, `Too many login attempts. Try again in ${minutesLeft} minute(s).`));
    return;
  }

  next();
}
