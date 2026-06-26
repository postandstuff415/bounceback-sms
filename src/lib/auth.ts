import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Session {
  email: string;
  accountId: string;
}

/**
 * Create a persistent session for a user account.
 * Returns a bearer token used for subsequent API requests.
 *
 * Sessions are stored in the database (not in-memory) so they survive server
 * restarts and work across serverless / multi-instance deployments.
 */
export async function createSession(email: string, accountId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { token, email, accountId, expiresAt },
  });
  return token;
}

/**
 * Validate a bearer token and return session data.
 * Returns null if invalid or expired (and prunes the expired row).
 */
export async function validateSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return { email: session.email, accountId: session.accountId };
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
export async function authenticateRequest(req: Request): Promise<Session | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return validateSession(token);
}

/**
 * Destroy a session (logout).
 */
export async function destroySession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

export type { Session };
