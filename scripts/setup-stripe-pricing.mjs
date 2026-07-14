#!/usr/bin/env node
/**
 * Create the BounceBack + SwarmLeads product catalog in a Stripe account.
 *
 *   BounceBack SMS  $29.99/mo standalone   |  $9.99/mo add-on
 *   SwarmLeads      $29.99/mo standalone   |  $9.99/mo add-on
 *
 * Whichever product a customer buys FIRST is $29.99; adding the OTHER later is
 * $9.99 (either direction) => $39.98/mo bundle. Both products must live in the
 * SAME Stripe account so one Customer can hold both subscriptions.
 *
 * Idempotent: prices are keyed by `lookup_key`, so re-running is safe — it skips
 * anything that already exists.
 *
 * Usage (test):  STRIPE_API_KEY=sk_test_... node scripts/setup-stripe-pricing.mjs
 * Usage (live):  STRIPE_API_KEY=sk_live_... node scripts/setup-stripe-pricing.mjs
 */
import Stripe from "stripe";

const key = process.env.STRIPE_API_KEY;
if (!key) {
  console.error("Set STRIPE_API_KEY (sk_test_... or sk_live_...)");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";

const CATALOG = [
  {
    app: "bounceback",
    productName: "BounceBack SMS",
    prices: [
      { lookupKey: "bounceback_standalone_monthly", amount: 2999, kind: "standalone" },
      { lookupKey: "bounceback_addon_monthly", amount: 999, kind: "addon" },
    ],
  },
  {
    app: "swarmleads",
    productName: "SwarmLeads",
    prices: [
      { lookupKey: "swarmleads_standalone_monthly", amount: 2999, kind: "standalone" },
      { lookupKey: "swarmleads_addon_monthly", amount: 999, kind: "addon" },
    ],
  },
];

async function findProductByApp(app) {
  const { data } = await stripe.products.search({ query: `metadata['app']:'${app}' AND active:'true'` });
  return data[0] ?? null;
}

async function findPriceByLookupKey(lookupKey) {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return data[0] ?? null;
}

console.log(`Setting up Stripe catalog in ${mode} mode…\n`);
const results = [];

for (const entry of CATALOG) {
  let product = await findProductByApp(entry.app);
  if (product) {
    console.log(`= product exists: ${entry.productName} (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: entry.productName,
      metadata: { app: entry.app },
    });
    console.log(`+ product created: ${entry.productName} (${product.id})`);
  }

  for (const p of entry.prices) {
    let price = await findPriceByLookupKey(p.lookupKey);
    if (price) {
      console.log(`  = price exists:  ${p.lookupKey} (${price.id})`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: p.lookupKey,
        metadata: { app: entry.app, kind: p.kind },
      });
      console.log(`  + price created: ${p.lookupKey} (${price.id})`);
    }
    results.push({ lookupKey: p.lookupKey, amount: p.amount / 100, priceId: price.id });
  }
}

console.log(`\n${mode} Price IDs:\n`);
for (const r of results) {
  console.log(`  ${r.lookupKey.padEnd(30)} $${r.amount.toFixed(2)}/mo   ${r.priceId}`);
}
console.log(
  "\nThe app resolves prices by lookup_key at runtime, so no Price IDs need to be pasted into env."
);
