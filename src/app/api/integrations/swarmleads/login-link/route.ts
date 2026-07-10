import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authenticateBridgeRequest, issueUserToken } from "@/lib/bridge-auth";
import { sendMagicLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const isProduction = process.env.NODE_ENV === "production";
const allowInstantLogin = !isProduction || process.env.ALLOW_DEV_LOGIN === "true";

/**
 * POST /api/integrations/swarmleads/login-link
 *
 * Cross-app login initiation. SwarmLeads calls this (server-to-server, bridge
 * JWT) with the user's email + its callback URL. BounceBack owns identity:
 *  - non-prod / ALLOW_DEV_LOGIN → returns a signed SwarmLeads user JWT instantly
 *  - prod → emails a magic link that, once clicked, redirects the browser back
 *    to `returnTo` carrying the signed user JWT (see /api/auth/verify).
 *
 * Never reveals whether an email exists in the production path.
 */
export async function POST(req: Request) {
  const claims = authenticateBridgeRequest(req);
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; returnTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  // Only allow returnTo pointing at the configured SwarmLeads app (no open redirect).
  const swarmleadsUrl = process.env.SWARMLEADS_APP_URL || "http://localhost:3000";
  const returnTo = body.returnTo && body.returnTo.startsWith(swarmleadsUrl)
    ? body.returnTo
    : `${swarmleadsUrl}/auth/callback`;

  const account = await prisma.account.findUnique({ where: { email } });

  // ---- Non-production: instant token (keeps staging/demo click-through) ----
  if (allowInstantLogin) {
    if (!account) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 401 });
    }
    return NextResponse.json({ instant: true, token: issueUserToken(account.email) });
  }

  // ---- Production: passwordless magic-link carrying returnTo ----
  if (account) {
    const loginToken = crypto.randomBytes(32).toString("hex");
    await prisma.loginToken.create({
      data: {
        token: loginToken,
        email: account.email,
        accountId: account.id,
        returnTo,
        expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${appUrl}/api/auth/verify?token=${loginToken}`;
    await sendMagicLink(account.email, link);
  }

  return NextResponse.json({
    magicLink: true,
    message: "If an account exists for that email, a secure sign-in link is on its way.",
  });
}
