import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { checkRateLimit, getRateLimitKey, AUTH_CONFIG } from "@/lib/rate-limiter";
import { createSession } from "@/lib/auth";
import { sendMagicLink } from "@/lib/email";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In production we require the secure magic-link flow. In non-production
// (local/staging) we allow an instant login so the team and the client can
// click through staging without waiting on email delivery. This can also be
// force-enabled with ALLOW_DEV_LOGIN=true if a hosted staging env needs it.
const isProduction = process.env.NODE_ENV === "production";
const allowInstantLogin = !isProduction || process.env.ALLOW_DEV_LOGIN === "true";

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const rateLimitKey = getRateLimitKey(req, "login");
    const rateCheck = checkRateLimit(rateLimitKey, AUTH_CONFIG);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please wait before trying again.",
          retryAfterMs: rateCheck.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const account = await prisma.account.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        businessName: true,
        realPhoneNumber: true,
        assignedTwilioNum: true,
        bookingLink: true,
        subscriptionStatus: true,
      },
    });

    // ---- Non-production: instant login (keeps staging/demo click-through) ----
    if (allowInstantLogin) {
      if (!account) {
        return NextResponse.json(
          { error: "No account found with this email." },
          { status: 401 }
        );
      }

      const sessionToken = await createSession(account.email, account.id);
      return NextResponse.json({
        success: true,
        bypass: true,
        account: { ...account, realPhoneNumber: decrypt(account.realPhoneNumber) },
        token: sessionToken,
        expiresIn: 86400,
      });
    }

    // ---- Production: passwordless magic-link ----
    // Always return a generic success so we never reveal which emails exist.
    if (account) {
      const loginToken = crypto.randomBytes(32).toString("hex");
      await prisma.loginToken.create({
        data: {
          token: loginToken,
          email: account.email,
          accountId: account.id,
          expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const link = `${appUrl}/api/auth/verify?token=${loginToken}`;
      await sendMagicLink(account.email, link);
    }

    return NextResponse.json({
      success: true,
      magicLink: true,
      message: "If an account exists for that email, a secure sign-in link is on its way.",
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
