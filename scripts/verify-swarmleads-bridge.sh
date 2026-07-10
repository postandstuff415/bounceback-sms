#!/usr/bin/env bash
#
# Verify the SwarmLeads <-> BounceBack bridge endpoints end-to-end.
#
# Mints a signed HS256 bridge JWT (same algorithm SwarmLeads uses) and exercises:
#   GET  /api/integrations/swarmleads/status   (add-on entitlement)
#   POST /api/integrations/swarmleads/leads    (outreach queue ingest)
#   POST /api/integrations/swarmleads/checkout (add-on purchase; stub activates)
# plus an unauthorized (bad token) negative check.
#
# Prereqs: BounceBack running (npm run dev), DB migrated, deps installed.
#
# Usage:
#   SECRET="<shared-secret>" EMAIL="michael@example.com" \
#     bash scripts/verify-swarmleads-bridge.sh
#
# Optional:
#   BASE_URL   default http://localhost:3000
#   SEED=1     upsert a minimal test Account for EMAIL first (needs `npx prisma`)
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-michael@example.com}"
SECRET="${SECRET:?Set SECRET to the shared SWARMLEADS_BRIDGE_JWT_SECRET}"

# Pretty-print JSON if jq is available, else pass through.
pp() { if command -v jq >/dev/null 2>&1; then jq .; else cat; fi; }

# --- Mint a short-lived bridge JWT (iss=swarmleads, aud=bounceback) ----------
mint_token() {
  SECRET="$SECRET" EMAIL="$EMAIL" node -e '
    const c = require("crypto");
    const b = (s) => Buffer.from(s).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const claims = { iss: "swarmleads", aud: "bounceback", sub: process.env.EMAIL, iat: now, exp: now + 300 };
    const h = b(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const p = b(JSON.stringify(claims));
    const sig = c.createHmac("sha256", process.env.SECRET).update(h + "." + p).digest("base64url");
    process.stdout.write(h + "." + p + "." + sig);
  '
}

# --- Optional: seed a minimal Account so status/leads resolve (not a 404) -----
if [ "${SEED:-0}" = "1" ]; then
  echo "== Seeding test account for ${EMAIL} =="
  EMAIL="$EMAIL" npx prisma db execute --stdin <<SQL || true
INSERT INTO "Account" ("id","email","businessName","realPhoneNumber","bookingLink")
VALUES (gen_random_uuid(), '${EMAIL}', 'Bridge Test Co', '+15125550100', 'https://cal.com/test')
ON CONFLICT ("email") DO NOTHING;
SQL
  echo
fi

TOKEN="$(mint_token)"
AUTH="Authorization: Bearer ${TOKEN}"
echo "Minted bridge token for ${EMAIL} (aud=bounceback, ttl=300s)"
echo "Target: ${BASE_URL}"
echo

echo "== 1) GET /status (initial — expect addonActive:false) =="
curl -s -H "$AUTH" "${BASE_URL}/api/integrations/swarmleads/status" | pp
echo

echo "== 2) POST /leads (enqueue two leads — expect queued:2) =="
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"leads":[
        {"phone":"+15125551234","businessName":"Acme Roofing","metadata":{"source":"swarmleads","angle":"missed-call"}},
        {"phone":"(512) 555-9876","businessName":"Bright Plumbing"}
      ]}' \
  "${BASE_URL}/api/integrations/swarmleads/leads" | pp
echo

echo "== 3) POST /checkout (stub mode activates the add-on) =="
curl -s -X POST -H "$AUTH" "${BASE_URL}/api/integrations/swarmleads/checkout" | pp
echo

echo "== 4) GET /status (after checkout — expect addonActive:true) =="
curl -s -H "$AUTH" "${BASE_URL}/api/integrations/swarmleads/status" | pp
echo

echo "== 5) GET /status with a BAD token (expect 401) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer not.a.validtoken" \
  "${BASE_URL}/api/integrations/swarmleads/status"
echo

echo "Done. Expected: queued:2, addonActive flips false -> true, bad token -> 401."
