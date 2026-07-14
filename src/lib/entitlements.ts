import Stripe from "stripe";
import { LOOKUP_KEYS, priceIdByLookupKey, type App } from "@/lib/pricing";

/**
 * Per-product entitlement, derived from Stripe (the source of truth).
 *
 * BounceBack and SwarmLeads share ONE Stripe customer, so a customer can hold
 * subscriptions to both products. Webhook handlers historically keyed only on
 * `stripeCustomerId` and had no idea WHICH product an event concerned, which
 * meant cancelling one product silently deactivated the other. Rather than try
 * to patch each event type, we recompute the whole picture from Stripe on every
 * relevant event — that is idempotent, order-independent, and immune to the
 * cross-product contamination.
 */

export type Entitlement = "active" | "trialing" | "past_due" | "inactive";

export interface Entitlements {
  bounceback: Entitlement;
  swarmleads: Entitlement;
}

/** Statuses that grant the customer access to the product. */
export function grantsAccess(e: Entitlement): boolean {
  return e === "active" || e === "trialing";
}

/**
 * Stripe subscription statuses we care about. `trialing` MUST be included —
 * onboarding uses a 14-day trial, so a brand-new paying customer is `trialing`,
 * not `active`. Treating them as "no product" made them pay the $29.99
 * standalone rate for their second product instead of the $9.99 add-on.
 */
function normalize(status: Stripe.Subscription.Status): Entitlement | null {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    // canceled / unpaid / incomplete / incomplete_expired / paused => no entitlement
    default:
      return null;
  }
}

/** Rank so the strongest entitlement wins if a customer somehow has duplicates. */
const RANK: Record<Entitlement, number> = { active: 3, trialing: 2, past_due: 1, inactive: 0 };

/** The 4 catalog price ids, used as the exact-match classifier. */
async function catalogPriceIds(stripe: Stripe): Promise<Map<string, App>> {
  const map = new Map<string, App>();
  for (const app of ["bounceback", "swarmleads"] as const) {
    for (const key of [LOOKUP_KEYS[app].standalone, LOOKUP_KEYS[app].addon]) {
      map.set(await priceIdByLookupKey(stripe, key), app);
    }
  }
  return map;
}

/** price id -> app, memoised. Prices are immutable, so this never goes stale. */
const priceAppCache = new Map<string, App | null>();

/**
 * Classify a LEGACY product by name.
 *
 * Products auto-created by Stripe from inline `price_data` are immutable —
 * Stripe rejects metadata writes on them ("created by Stripe automatically and
 * cannot be updated"), so they can never be tagged. These names are the exact
 * strings our own pre-catalog checkout code emitted.
 *
 * Order matters: "SwarmLeads BounceBack Add-on" sells BOUNCEBACK service to a
 * SwarmLeads user, so `bounceback` must win over the `swarmleads` substring.
 */
function appForLegacyProductName(name: string | undefined): App | null {
  const n = (name ?? "").toLowerCase();
  if (n.includes("bounceback")) return "bounceback";
  if (n.includes("swarmleads")) return "swarmleads";
  return null;
}

/**
 * Which app does this price belong to?
 *
 * Subscriptions created before the price catalog used ad-hoc inline prices — no
 * `lookup_key`, on an untaggable auto-created product. Classifying only by the 4
 * catalog price ids made every one of those subscriptions invisible, so real
 * customers appeared to own nothing and were quoted the $29.99 standalone rate
 * for their second product instead of the $9.99 add-on.
 *
 * Prices must be retrieved individually with `expand: ["product"]` —
 * `subscriptions.list` cannot expand `data.items.data.price.product` (Stripe
 * caps expansion at 4 levels).
 */
async function appForPrice(
  stripe: Stripe,
  priceId: string,
  catalog: Map<string, App>
): Promise<App | null> {
  const cached = priceAppCache.get(priceId);
  if (cached !== undefined) return cached;

  let app: App | null = catalog.get(priceId) ?? null;

  if (!app) {
    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
      const product = price.product as Stripe.Product;
      const tag = product?.metadata?.app;
      if (tag === "bounceback" || tag === "swarmleads") {
        app = tag;
      } else {
        app = appForLegacyProductName(product?.name);
      }
    } catch (err) {
      console.warn(`[Entitlements] Could not retrieve price ${priceId}: ${(err as Error).message}`);
    }
  }

  if (!app) {
    console.warn(`[Entitlements] Unclassified price ${priceId} — a customer may be paying for something we don't recognise`);
  }

  priceAppCache.set(priceId, app);
  return app;
}

async function foldSubscriptions(
  stripe: Stripe,
  subs: Stripe.Subscription[],
  catalog: Map<string, App>,
  result: Entitlements
): Promise<void> {
  for (const sub of subs) {
    const entitlement = normalize(sub.status);
    if (!entitlement) continue;
    for (const item of sub.items.data) {
      const app = await appForPrice(stripe, item.price.id, catalog);
      if (!app) continue;
      if (RANK[entitlement] > RANK[result[app]]) result[app] = entitlement;
    }
  }
}

/** What this customer is entitled to, per product, straight from Stripe. */
export async function computeEntitlements(
  stripe: Stripe,
  customerId: string
): Promise<Entitlements> {
  const result: Entitlements = { bounceback: "inactive", swarmleads: "inactive" };
  const [catalog, subs] = await Promise.all([
    catalogPriceIds(stripe),
    // `status: "all"` so we see trialing/past_due, not just active.
    stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }),
  ]);
  await foldSubscriptions(stripe, subs.data, catalog, result);
  return result;
}

/**
 * What this EMAIL is entitled to, unioned across every Stripe customer holding
 * it. The old checkout minted a fresh Customer per session, so one email can own
 * several customers; reading only the first missed the subscription that mattered.
 */
export async function computeEntitlementsForEmail(
  stripe: Stripe,
  email: string
): Promise<Entitlements> {
  const result: Entitlements = { bounceback: "inactive", swarmleads: "inactive" };

  const [catalog, customers] = await Promise.all([
    catalogPriceIds(stripe),
    stripe.customers.list({ email: email.toLowerCase(), limit: 100 }),
  ]);

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 100,
    });
    await foldSubscriptions(stripe, subs.data, catalog, result);
  }

  return result;
}
