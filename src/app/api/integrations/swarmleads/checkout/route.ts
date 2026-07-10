import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { authenticateBridgeRequest } from "@/lib/bridge-auth";

export const dynamic = "force-dynamic";

// The SwarmLeads $9.99/mo add-on, billed through the BounceBack Stripe account.
const ADDON_PRICE_CENTS = 999;

const isStripeConfigured = () => {
  const key = process.env.STRIPE_API_KEY;
  return key && !key.includes("your_stripe_secret_key_here") && key.trim() !== "";
};

/**
 * POST /api/integrations/swarmleads/checkout
 * Start (or stub) the $9.99 SwarmLeads add-on purchase for the caller's account.
 *
 * Per the current phase decision, real charging is stubbed until unified auth
 * ships: when Stripe is not configured we activate the entitlement immediately
 * and return a mock URL, so the full flag/status path is exercisable end-to-end
 * without charging anyone. When Stripe IS configured, we create a real Checkout
 * Session tagged `addon: "true"`; the webhook flips the flag on completion.
 */
export async function POST(req: Request) {
  const claims = authenticateBridgeRequest(req);
  if (!claims?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = claims.sub.toLowerCase();

  const account = await prisma.account.findUnique({ where: { email } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const swarmleadsUrl = process.env.SWARMLEADS_APP_URL || "http://localhost:3000";
  const successUrl = `${swarmleadsUrl}/?addon=success`;
  const cancelUrl = `${swarmleadsUrl}/?addon=cancelled`;

  if (isStripeConfigured()) {
    try {
      const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: account.stripeCustomerId || undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "SwarmLeads BounceBack Add-on",
                description: "Missed-call auto-text add-on for SwarmLeads leads",
              },
              unit_amount: ADDON_PRICE_CENTS, // $9.99/month
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { addon: "true", email },
      });

      return NextResponse.json({ url: session.url });
    } catch (error: any) {
      console.error("[SwarmLeads Checkout] Stripe error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to initiate add-on checkout" },
        { status: 500 }
      );
    }
  }

  // Stub mode: no charge — activate the entitlement so the flow is testable.
  console.log(`[SwarmLeads Checkout] Stripe not configured; activating add-on (stub) for ${email}`);
  await prisma.account.update({
    where: { email },
    data: { swarmleadsAddonActive: true, swarmleadsAddonSince: new Date() },
  });

  return NextResponse.json({ url: successUrl, stubbed: true });
}
