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
 * The customer we should BILL against for this email.
 *
 * One email can own SEVERAL Stripe customers — the old checkout never passed
 * `customer`, so Stripe Checkout minted a fresh one per session (which is how a
 * user ended up with two parallel BounceBack subscriptions). Prefer a customer
 * that already holds a subscription so we don't strand charges on an empty
 * duplicate; otherwise take the oldest for stability.
 */
export async function findCustomerIdByEmail(stripe: Stripe, email: string): Promise<string | null> {
  const { data } = await stripe.customers.list({ email: email.toLowerCase(), limit: 100 });
  if (data.length === 0) return null;
  if (data.length === 1) return data[0].id;

  for (const customer of data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 1 });
    if (subs.data.length > 0) return customer.id;
  }
  // Stripe lists newest-first; fall back to the oldest so we stay stable.
  return data[data.length - 1].id;
}

/** Resolve-or-create exactly ONE Stripe customer for this email. */
export async function ensureCustomerForEmail(stripe: Stripe, email: string): Promise<string> {
  const existing = await findCustomerIdByEmail(stripe, email);
  if (existing) return existing;
  const created = await stripe.customers.create({ email: email.toLowerCase() });
  return created.id;
}

/**
 * Does this customer already hold the given app?
 *
 * Delegates to the entitlements module, which counts `trialing` and `past_due`
 * — NOT just `active`. Onboarding starts every customer on a 14-day trial, so
 * checking only `active` meant a trialing customer adding their second product
 * was charged the $29.99 standalone rate instead of the $9.99 add-on.
 */
export async function hasActiveProduct(
  stripe: Stripe,
  customerId: string,
  app: App
): Promise<boolean> {
  const { computeEntitlements, grantsAccess } = await import("@/lib/entitlements");
  const entitlements = await computeEntitlements(stripe, customerId);
  return grantsAccess(entitlements[app]);
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
  const { computeEntitlements, computeEntitlementsForEmail, grantsAccess } = await import(
    "@/lib/entitlements"
  );

  let customerId = opts.customerId ?? null;

  // Ownership is resolved by EMAIL across every customer holding it — one email
  // can own several customers, and the subscription proving ownership may sit on
  // any of them.
  let ownsOther = false;
  if (opts.email) {
    const entitlements = await computeEntitlementsForEmail(stripe, opts.email);
    ownsOther = grantsAccess(entitlements[other]);
    customerId ??= await findCustomerIdByEmail(stripe, opts.email);
  } else if (customerId) {
    const entitlements = await computeEntitlements(stripe, customerId);
    ownsOther = grantsAccess(entitlements[other]);
  }

  const tier: "standalone" | "addon" = ownsOther ? "addon" : "standalone";
  const priceId = await priceIdByLookupKey(stripe, LOOKUP_KEYS[app][tier]);
  return { priceId, tier, customerId };
}
