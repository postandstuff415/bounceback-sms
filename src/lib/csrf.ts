import crypto from "node:crypto";

// In-memory CSRF token store
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of tokenStore.entries()) {
    if (now > entry.expiresAt) tokenStore.delete(id);
  }
}, 300000);

/**
 * Generate a CSRF token for a given session or email identifier.
 */
export function generateCsrfToken(identifier: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  tokenStore.set(identifier, { token, expiresAt: Date.now() + CSRF_TOKEN_TTL });
  return token;
}

/**
 * Validate a CSRF token for a given identifier.
 */
export function validateCsrfToken(identifier: string, token: string): boolean {
  const entry = tokenStore.get(identifier);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(identifier);
    return false;
  }
  const isValid = crypto.timingSafeEqual(
    Buffer.from(entry.token),
    Buffer.from(token)
  );
  if (isValid) tokenStore.delete(identifier); // One-time use
  return isValid;
}
