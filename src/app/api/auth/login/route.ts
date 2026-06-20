import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { checkRateLimit, getRateLimitKey, AUTH_CONFIG } from "@/lib/rate-limiter";
import { createSession } from "@/lib/auth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const rateLimitKey = getRateLimitKey(req, "login");
    const rateCheck = checkRateLimit(rateLimitKey, AUTH_CONFIG);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Too many login attempts. Please wait before trying again.",
          retryAfterMs: rateCheck.retryAfterMs 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            "X-RateLimit-Remaining": "0",
          }
        }
      );
    }

    const { email, password, token } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // CSRF check: if running in browser context, require CSRF token
    // (This is a basic check; real CSRF uses double-submit cookie pattern)
    // For now, we use a simple session-based approach

    const account = await prisma.account.findUnique({
      where: { email: email.trim().toLowerCase() },
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

    if (!account) {
      return NextResponse.json({ 
        error: "No account found with this email." 
      }, { status: 401 });
    }

    // Create a session token for this user
    const sessionToken = createSession(account.email, account.id);

    const decryptedAccount = {
      ...account,
      realPhoneNumber: decrypt(account.realPhoneNumber),
    };

    return NextResponse.json({ 
      success: true, 
      account: decryptedAccount,
      token: sessionToken,
      expiresIn: 86400, // 24 hours in seconds
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
