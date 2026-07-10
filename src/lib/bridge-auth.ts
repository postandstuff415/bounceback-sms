/**
 * Cross-app bridge auth (SwarmLeads <-> BounceBack).
 *
 * BounceBack owns identity; SwarmLeads calls a small, stable API surface. Those
 * calls are authenticated with a signed HS256 JWT whose shared secret
 * (SWARMLEADS_BRIDGE_JWT_SECRET) must match SwarmLeads' signer.
 *
 * Implemented with node:crypto (like src/lib/auth.ts) so it needs no extra
 * dependency; standard HS256 JWTs are interoperable across libraries, so the
 * tokens SwarmLeads mints with its own signer verify here unchanged.
 */
import crypto from "node:crypto";

const BRIDGE_ISS = "swarmleads"; // issuer of inbound machine-to-machine tokens
const BRIDGE_AUD = "bounceback"; // this app is the audience
const USER_TOKEN_TTL_SECONDS = 60 * 60; // 1h for shared user-session tokens

export interface BridgeClaims {
  iss: string;
  aud: string;
  sub?: string; // subject: the user's email (or userId) shared across apps
  iat: number;
  exp: number;
  [key: string]: unknown;
}

function secret(): string {
  const s = process.env.SWARMLEADS_BRIDGE_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SWARMLEADS_BRIDGE_JWT_SECRET is not configured (min 16 chars)");
  }
  return s;
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(claims: BridgeClaims): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/** Parse + cryptographically verify a bridge JWT. Returns claims or null. */
export function verifyBridgeToken(token: string): BridgeClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${header}.${payload}`)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  let claims: BridgeClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp < now) return null;
  if (claims.iss !== BRIDGE_ISS || claims.aud !== BRIDGE_AUD) return null;

  return claims;
}

/** Extract + verify the bridge token from a request's Authorization header. */
export function authenticateBridgeRequest(req: Request): BridgeClaims | null {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  return verifyBridgeToken(header.substring(7).trim());
}

/**
 * Issue a shared user-session JWT that SwarmLeads validates for unified login
 * (Phase 2 groundwork). BounceBack is the issuer/identity owner here, so the
 * iss/aud are flipped relative to inbound M2M tokens.
 */
export function issueUserToken(subjectEmail: string): string {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    iss: BRIDGE_AUD, // "bounceback" issues user tokens
    aud: BRIDGE_ISS, // "swarmleads" consumes them
    sub: subjectEmail,
    iat: now,
    exp: now + USER_TOKEN_TTL_SECONDS,
  });
}
