import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { resolvePriceFor } from "@/lib/pricing";

// Helper to check if Stripe is properly configured
const isStripeConfigured = () => {
  const key = process.env.STRIPE_API_KEY;
  return key && !key.includes("your_stripe_secret_key_here") && key.trim() !== "";
};

export async function POST(req: Request) {
  try {
    const { businessName, email, realPhoneNumber, bookingLink, agencyId } = await req.json();

    // Basic validation
    if (!businessName || !email || !realPhoneNumber || !bookingLink) {
      return NextResponse.json(
        { error: "Missing required onboarding fields" },
        { status: 400 }
      );
    }

    if (isStripeConfigured()) {
      const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      // If this email already has a Stripe customer with an active SwarmLeads
      // subscription, BounceBack is an add-on ($9.99) rather than standalone.
      const existing = await prisma.account.findUnique({
        where: { email: email.toLowerCase() },
        select: { stripeCustomerId: true },
      });
      const { priceId, tier, customerId } = await resolvePriceFor(stripe, "bounceback", {
        customerId: existing?.stripeCustomerId,
        email,
      });
      console.log(`[Checkout] BounceBack ${tier} price for ${email}`);

      // Create a Stripe Checkout Session.
      // Note: no `payment_method_types` — Stripe selects eligible methods
      // dynamically from Dashboard settings, which improves conversion.
      const session = await stripe.checkout.sessions.create({
        customer: customerId || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 14,
        },
        success_url: `${appUrl}/onboard/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
        cancel_url: `${appUrl}/onboard?error=cancelled`,
        metadata: {
          businessName,
          email,
          realPhoneNumber,
          bookingLink,
          agencyId: agencyId || "",
          privacyAccepted: "true",
          termsAccepted: "true",
        },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // Mock mode: Redirect to our local mock checkout screen
      console.log("Stripe API key is not configured or is a placeholder. Using mock checkout flow.");
      const query = new URLSearchParams({
        businessName,
        email,
        realPhoneNumber,
        bookingLink,
        agencyId: agencyId || "",
        privacyAccepted: "true",
        termsAccepted: "true",
      }).toString();

      return NextResponse.json({ url: `/onboard/mock-checkout?${query}` });
    }
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate checkout" },
      { status: 500 }
    );
  }
}
