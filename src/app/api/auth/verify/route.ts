import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Magic-link verification endpoint.
 *
 * The emailed link points here (/api/auth/verify?token=...). We validate the
 * one-time login token, mark it used, mint a real session, and redirect the
 * browser back to the app with the session token so the SPA can store it.
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

  // One-time use: mark consumed before issuing the session.
  await prisma.loginToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  const sessionToken = await createSession(loginToken.email, loginToken.accountId);

  const redirectUrl =
    `${appUrl}/?authToken=${encodeURIComponent(sessionToken)}` +
    `&email=${encodeURIComponent(loginToken.email)}`;

  return NextResponse.redirect(redirectUrl);
}
