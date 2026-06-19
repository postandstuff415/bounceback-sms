import crypto from "node:crypto";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Session {
  email: string;
  accountId: string;
  createdAt: number;
  expiresAt: number;
}

const sessionStore = new Map<string, Session>();

// Clean expired sessions every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    if (now > session.expiresAt) {
      sessionStore.delete(token);
    }
  }
}, 900000);

/**
 * Create a session for a user account.
 * Returns a bearer token that can be used for subsequent API requests.
 */
export function createSession(email: string, accountId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessionStore.set(token, {
    email,
    accountId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  });
  return token;
}

/**
 * Validate a bearer token and return session data.
 * Returns null if invalid or expired.
 */
export function validateSession(token: string): Session | null {
  const session = sessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }
  return session;
}

/**
 * Extract the bearer token from a request's Authorization header.
 */
export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim();
}

/**
 * Authenticate a request. Returns session data or null if unauthorized.
 */
export function authenticateRequest(req: Request): Session | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return validateSession(token);
}

/**
 * Destroy a session (logout).
 */
export function destroySession(token: string): void {
  sessionStore.delete(token);
}

export type { Session };
