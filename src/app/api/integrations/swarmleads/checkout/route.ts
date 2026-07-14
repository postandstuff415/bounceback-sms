import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { authenticateBridgeRequest } from "@/lib/bridge-auth";
import { resolvePriceFor, ensureCustomerForEmail } from "@/lib/pricing";

export const dynamic = "force-dynamic";

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

      // The customer is coming from SwarmLeads, so BounceBack is the SECOND
      // product — resolvePriceFor returns the $9.99 add-on rate when they
      // already hold an active SwarmLeads subscription, else $29.99 standalone.
      const { priceId, tier } = await resolvePriceFor(stripe, "bounceback", {
        customerId: account.stripeCustomerId,
        email,
      });

      // Always bill against ONE customer per email — never let Checkout mint a
      // duplicate (that's how parallel subscriptions got created).
      const customerId =
        account.stripeCustomerId ?? (await ensureCustomerForEmail(stripe, email));

      console.log(`[SwarmLeads Checkout] BounceBack ${tier} price for ${email} (customer ${customerId})`);

      // No `payment_method_types` — let Stripe pick eligible methods dynamically.
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
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
