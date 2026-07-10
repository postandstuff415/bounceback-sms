import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { issueUserToken } from "@/lib/bridge-auth";

export const dynamic = "force-dynamic";

/**
 * Magic-link verification endpoint.
 *
 * The emailed link points here (/api/auth/verify?token=...). We validate the
 * one-time login token and mark it used. Then, depending on origin:
 *  - cross-app login (`returnTo` set) → redirect to SwarmLeads with a signed
 *    user JWT (no BounceBack session created here — SwarmLeads owns its session).
 *  - normal BounceBack login → mint a session and redirect back to the app.
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${appUrl}/?authError=missing_token`);
  }

  const loginToken = await prisma.loginToken.findUnique({ where: { token } });

  if (
    !loginToken ||
    loginToken.usedAt !== null ||
    loginToken.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.redirect(`${appUrl}/?authError=invalid_or_expired`);
  }

  // One-time use: mark consumed before issuing any token.
  await prisma.loginToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  // Cross-app unified login: hand SwarmLeads a signed user JWT and bounce back.
  if (loginToken.returnTo) {
    const userToken = issueUserToken(loginToken.email);
    const sep = loginToken.returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(
      `${loginToken.returnTo}${sep}token=${encodeURIComponent(userToken)}`
    );
  }

  const sessionToken = await createSession(loginToken.email, loginToken.accountId);

  const redirectUrl =
    `${appUrl}/?authToken=${encodeURIComponent(sessionToken)}` +
    `&email=${encodeURIComponent(loginToken.email)}`;

  return NextResponse.redirect(redirectUrl);
}
