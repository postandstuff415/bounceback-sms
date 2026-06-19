import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import Stripe from "stripe";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

// Current policy versions — bump these when policies change
export const PRIVACY_POLICY_VERSION = "2026-06-17-v1";
export const TERMS_VERSION = "2026-06-17-v1";

const isProduction = process.env.NODE_ENV === "production";

// Helper to check if Stripe is properly configured
const isStripeConfigured = () => {
  const key = process.env.STRIPE_API_KEY;
  return key && !key.includes("your_stripe_secret_key_here") && key.trim() !== "";
};

// Helper to check if Twilio is properly configured
const isTwilioConfigured = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  return (
    sid &&
    token &&
    !sid.includes("your_twilio_account_sid_here") &&
    !token.includes("your_twilio_auth_token_here") &&
    sid.trim() !== "" &&
    token.trim() !== ""
  );
};

// Generate a realistic mock phone number using the US area code of realPhoneNumber
function generateMockNumber(realPhoneNumber: string): string {
  const digits = realPhoneNumber.replace(/\D/g, "");
  const hasCountryCode = digits.startsWith("1") && digits.length === 11;
  const areaCode = hasCountryCode ? digits.substring(1, 4) : digits.substring(0, 3);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `+1${areaCode || "512"}555${randomSuffix}`;
}

export async function POST(req: Request) {
  try {
    const isMockRequest = req.headers.get("x-mock-request") === "true" && !isProduction;
    const rawBody = await req.text();
    let event: any;

    if ((!isStripeConfigured() || isMockRequest) && !isProduction) {
      // Bypassing signature verification ONLY in non-production for simulated mock runs
      console.log("[Stripe Webhook] Processing in mock/simulation mode.");
      try {
        event = JSON.parse(rawBody);
      } catch (err) {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    } else {
      // Real Stripe signature verification (REQUIRED in Production)
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
      }

      const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
      });

      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return NextResponse.json({ error: "Signature verification failed: " + err.message }, { status: 400 });
      }
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Core business logic triggers on checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata) {
        console.error("[Stripe Webhook] No metadata found in checkout session. Aborting.");
        return NextResponse.json({ error: "Missing session metadata" }, { status: 400 });
      }

      const { businessName, email, realPhoneNumber, bookingLink, agencyId } = metadata;
      const stripeCustomerId = session.customer;

      if (!businessName || !email || !realPhoneNumber || !bookingLink) {
        console.error("[Stripe Webhook] Incomplete metadata in session:", metadata);
        return NextResponse.json({ error: "Incomplete metadata fields" }, { status: 400 });
      }

      console.log(`[Stripe Webhook] Processing successful onboarding for: ${businessName} (${email})`);

      // Check if the privacy and terms acceptance flags are in metadata
      const privacyAccepted = metadata.privacyAccepted === "true";
      const termsAccepted = metadata.termsAccepted === "true";

      // 1. Check if the user already has a provisioned Twilio number
      const existingAccount = await prisma.account.findUnique({
        where: { email: email.toLowerCase() },
      });

      let assignedTwilioNum = existingAccount ? existingAccount.assignedTwilioNum : null;

      // 2. Buy Twilio number if not already assigned
      if (!assignedTwilioNum) {
        if (isTwilioConfigured()) {
          try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
            
            // Extract 3-digit area code from realPhoneNumber
            const digits = realPhoneNumber.replace(/\D/g, "");
            const hasCountryCode = digits.startsWith("1") && digits.length === 11;
            const areaCode = hasCountryCode ? digits.substring(1, 4) : digits.substring(0, 3);

            console.log(`[Twilio Search] Looking for numbers in area code: ${areaCode}`);
            let localNumbers: any[] = [];
            try {
              localNumbers = await client.availablePhoneNumbers("US").local.list({
                areaCode: areaCode,
                limit: 1,
              });
            } catch (err) {
              console.warn(`[Twilio Warning] No numbers found in area code: ${areaCode}`);
            }

            if (localNumbers.length === 0) {
              localNumbers = await client.availablePhoneNumbers("US").local.list({
                limit: 1,
              });
            }

            if (localNumbers.length > 0) {
              const selectedNum = localNumbers[0].phoneNumber;
              console.log(`[Twilio Purchasing] Purchasing number: ${selectedNum}`);

              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              const voiceUrl = `${appUrl}/api/webhooks/twilio-voice`;

              const purchased = await client.incomingPhoneNumbers.create({
                phoneNumber: selectedNum,
                voiceUrl: voiceUrl,
              });

              assignedTwilioNum = purchased.phoneNumber;
              console.log(`[Twilio Success] Purchased number ${assignedTwilioNum} successfully.`);
            } else {
              throw new Error("No phone numbers available to purchase in US.");
            }
          } catch (twilioErr: any) {
            console.error("[Twilio Error] Number provisioning failed:", twilioErr.message);
            assignedTwilioNum = generateMockNumber(realPhoneNumber);
          }
        } else {
          console.log("[Twilio Webhook] Twilio keys not configured. Falling back to mock number.");
          assignedTwilioNum = generateMockNumber(realPhoneNumber);
        }
      }

      // 3. Upsert Account record to database with policy version tracking
      const now = new Date();
      await prisma.account.upsert({
        where: { email: email.toLowerCase() },
        update: {
          businessName,
          realPhoneNumber: encrypt(realPhoneNumber),
          assignedTwilioNum,
          bookingLink,
          stripeCustomerId,
          subscriptionStatus: "active",
          agencyId: agencyId && agencyId.trim() !== "" ? agencyId : null,
          // Record privacy/terms acceptance with version tracking
          ...(privacyAccepted ? {
            privacyAccepted: true,
            privacyAcceptedAt: existingAccount?.privacyAcceptedAt || now,
            privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          } : {}),
          ...(termsAccepted ? {
            termsAccepted: true,
            termsAcceptedAt: existingAccount?.termsAcceptedAt || now,
            termsVersion: TERMS_VERSION,
          } : {}),
        },
        create: {
          email: email.toLowerCase(),
          businessName,
          realPhoneNumber: encrypt(realPhoneNumber),
          assignedTwilioNum,
          bookingLink,
          stripeCustomerId,
          subscriptionStatus: "active",
          agencyId: agencyId && agencyId.trim() !== "" ? agencyId : null,
          privacyAccepted,
          privacyAcceptedAt: privacyAccepted ? now : null,
          privacyPolicyVersion: privacyAccepted ? PRIVACY_POLICY_VERSION : null,
          termsAccepted,
          termsAcceptedAt: termsAccepted ? now : null,
          termsVersion: termsAccepted ? TERMS_VERSION : null,
        },
      });

      console.log(`[Database Success] Account ${email} created/updated with Twilio number ${assignedTwilioNum}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook Error] Fatal error in webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
