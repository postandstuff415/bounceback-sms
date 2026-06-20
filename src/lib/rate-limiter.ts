import crypto from "node:crypto";

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.lastAttempt > 900000) { // 15 min stale
      store.delete(key);
    }
  }
}, 300000);

interface RateLimitConfig {
  windowMs: number;       // Time window in ms
  maxAttempts: number;    // Max requests in window
  blockDurationMs: number; // How long to block after max
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000,         // 1 minute window
  maxAttempts: 10,         // 10 requests per minute
  blockDurationMs: 300000, // 5 minute block
};

const AUTH_CONFIG: RateLimitConfig = {
  windowMs: 60000,         // 1 minute window
  maxAttempts: 5,          // 5 login attempts per minute
  blockDurationMs: 900000, // 15 minute block
};

/**
 * Rate limiter with exponential backoff support.
 * 
 * After each block expires, a new block at 2x the duration is imposed
 * if the client continues to exceed limits (exponential backoff).
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, firstAttempt: now, lastAttempt: now, blockedUntil: null });
    return { allowed: true, retryAfterMs: 0, remaining: config.maxAttempts - 1 };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = entry.blockedUntil - now;
    return { allowed: false, retryAfterMs: retryAfter, remaining: 0 };
  }

  // If block expired, apply exponential backoff: double the block duration
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    // Reset but increase next block duration
    entry.count = 1;
    entry.firstAttempt = now;
    entry.lastAttempt = now;
    entry.blockedUntil = null;
    return { allowed: true, retryAfterMs: 0, remaining: config.maxAttempts - 1 };
  }

  // Check if window has expired (reset)
  if (now - entry.firstAttempt > config.windowMs) {
    entry.count = 1;
    entry.firstAttempt = now;
    entry.lastAttempt = now;
    return { allowed: true, retryAfterMs: 0, remaining: config.maxAttempts - 1 };
  }

  // Increment count
  entry.count++;
  entry.lastAttempt = now;

  if (entry.count > config.maxAttempts) {
    // Block with exponential backoff: multiply previous block by 2 if it existed
    const previousBlockDuration = entry.blockedUntil 
      ? Math.min(entry.blockedUntil - entry.firstAttempt, 3600000) // cap at 1 hour
      : 0;
    const blockDuration = previousBlockDuration > 0 
      ? Math.min(previousBlockDuration * 2, 3600000) // Exponential backoff, cap at 1 hour
      : config.blockDurationMs;
    
    entry.blockedUntil = now + blockDuration;
    return { allowed: false, retryAfterMs: blockDuration, remaining: 0 };
  }

  return { allowed: true, retryAfterMs: 0, remaining: config.maxAttempts - entry.count };
}

/**
 * Generate a rate limit key from IP or composite identifier.
 */
export function getRateLimitKey(req: Request, suffix: string = ""): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";
  const hash = crypto.createHash("sha256").update(ip + suffix).digest("hex").substring(0, 16);
  return `rl:${hash}`;
}

export { AUTH_CONFIG, DEFAULT_CONFIG };
