import Stripe from "stripe";

/**
 * Cross-product pricing (BounceBack + SwarmLeads share one Stripe account).
 *
 * Whichever product a customer buys FIRST is $29.99/mo (standalone). Adding the
 * OTHER product later costs $9.99/mo (add-on) — in either direction — for a
 * $39.98/mo bundle.
 *
 * Prices are resolved by `lookup_key`, not hardcoded IDs, so the same code works
 * against test and live mode without swapping env vars.
 */

export type App = "bounceback" | "swarmleads";

export const LOOKUP_KEYS: Record<App, { standalone: string; addon: string }> = {
  bounceback: {
    standalone: "bounceback_standalone_monthly", // $29.99
    addon: "bounceback_addon_monthly", // $9.99
  },
  swarmleads: {
    standalone: "swarmleads_standalone_monthly", // $29.99
    addon: "swarmleads_addon_monthly", // $9.99
  },
};

const priceCache = new Map<string, string>();

/** Resolve a Stripe Price id from its stable lookup_key. */
export async function priceIdByLookupKey(stripe: Stripe, lookupKey: string): Promise<string> {
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;

  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = data[0];
  if (!price) {
    throw new Error(
      `Stripe price with lookup_key "${lookupKey}" not found. Run the pricing setup script for this Stripe account.`
    );
  }
  priceCache.set(lookupKey, price.id);
  return price.id;
}

/**
 * Find the Stripe customer for an email. Both apps share one Stripe account and
 * one email identity, so a customer created by BounceBack is discoverable from
 * SwarmLeads and vice-versa — even before the local record has a customer id.
 */
export async function findCustomerIdByEmail(stripe: Stripe, email: string): Promise<string | null> {
  const { data } = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
  return data[0]?.id ?? null;
}

/**
 * Does this customer already have an active subscription to the given app?
 * Matches against that app's two known price ids (standalone + add-on) rather
 * than expanding to the product — Stripe caps expansion at 4 levels.
 */
export async function hasActiveProduct(
  stripe: Stripe,
  customerId: string,
  app: App
): Promise<boolean> {
  const [standalone, addon] = await Promise.all([
    priceIdByLookupKey(stripe, LOOKUP_KEYS[app].standalone),
    priceIdByLookupKey(stripe, LOOKUP_KEYS[app].addon),
  ]);
  const appPriceIds = new Set([standalone, addon]);

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 100,
  });
  return subs.data.some((sub) => sub.items.data.some((item) => appPriceIds.has(item.price.id)));
}

/**
 * Pick the right price for `app`: add-on rate ($9.99) if the customer already
 * owns the OTHER product, otherwise the standalone rate ($29.99).
 *
 * Pass the known customer id if you have one; otherwise pass the email and we
 * look the customer up in the shared Stripe account (covers the case where the
 * customer signed up via the other app first).
 */
export async function resolvePriceFor(
  stripe: Stripe,
  app: App,
  opts: { customerId?: string | null; email?: string | null }
): Promise<{ priceId: string; tier: "standalone" | "addon"; customerId: string | null }> {
  const other: App = app === "bounceback" ? "swarmleads" : "bounceback";

  let customerId = opts.customerId ?? null;
  if (!customerId && opts.email) {
    customerId = await findCustomerIdByEmail(stripe, opts.email);
  }

  let tier: "standalone" | "addon" = "standalone";
  if (customerId && (await hasActiveProduct(stripe, customerId, other))) {
    tier = "addon";
  }

  const priceId = await priceIdByLookupKey(stripe, LOOKUP_KEYS[app][tier]);
  return { priceId, tier, customerId };
}
