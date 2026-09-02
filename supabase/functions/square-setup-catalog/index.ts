// One-time setup: creates the "Range Roulette Annual" subscription plan (7-day
// free trial, then $39.99/year) in Square's Catalog. Trigger it once by GET-ing
// this function's URL with ?key=<SQUARE_SETUP_SECRET>, then copy the
// plan_variation_id from the response into a SQUARE_PLAN_VARIATION_ID secret.
// Safe to re-run — the idempotency keys are fixed, so Square returns the same
// objects instead of creating duplicates.
import { squareFetch } from "../_shared/square.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ANNUAL_PRICE_CENTS = 3999;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const setupSecret = Deno.env.get("SQUARE_SETUP_SECRET");
  if (!setupSecret || url.searchParams.get("key") !== setupSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Quick diagnostic: ?locations=1 returns Square's location list for the
  // configured access token, so a correct Location ID can be confirmed
  // without hunting through the dashboard.
  if (url.searchParams.get("locations")) {
    const { ok, status, data } = await squareFetch("/v2/locations");
    return new Response(JSON.stringify(data), {
      status: ok ? 200 : status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = {
    // A fresh key every call, not a fixed one — Square ties a fixed
    // idempotency_key to the exact request body from its *first* use, and our
    // request body changed across debugging attempts, which kept tripping
    // IDEMPOTENCY_KEY_REUSED even under a new fixed string. This endpoint is
    // already gated by SQUARE_SETUP_SECRET and only meant to run once by
    // hand, so a random key each time (worst case: a harmless duplicate
    // catalog entry if run twice) is simpler than fighting Square's cache.
    idempotency_key: crypto.randomUUID(),
    batches: [
      {
        objects: [
          {
            type: "SUBSCRIPTION_PLAN",
            id: "#rangeroulette-annual-plan",
            subscription_plan_data: {
              name: "Range Roulette Annual",
            },
          },
          {
            type: "SUBSCRIPTION_PLAN_VARIATION",
            id: "#rangeroulette-annual-variation",
            subscription_plan_variation_data: {
              name: "Annual — 7-day free trial",
              subscription_plan_id: "#rangeroulette-annual-plan",
              // `uid` is Square-assigned on creation, not ours to set — supplying
              // one (even a fresh-looking string) makes Square treat it as a
              // reference to an existing phase, which fails with "Received
              // request to update nonexistent object". And per Square's own
              // API_VERSION_INCOMPATIBLE error against Square-Version
              // 2026-07-15, price belongs on `pricing`, not
              // `recurring_price_money` (that field is for older versions).
              phases: [
                {
                  ordinal: 0,
                  cadence: "WEEKLY",
                  periods: 1,
                  pricing: { type: "STATIC", price: { amount: 0, currency: "USD" } },
                },
                {
                  ordinal: 1,
                  cadence: "ANNUAL",
                  pricing: {
                    type: "STATIC",
                    price: { amount: ANNUAL_PRICE_CENTS, currency: "USD" },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const { ok, status, data } = await squareFetch<{
    objects?: {
      type: string;
      id: string;
      subscription_plan_data?: { subscription_plan_variations?: { id: string }[] };
    }[];
    errors?: unknown[];
  }>("/v2/catalog/batch-upsert", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!ok) {
    return new Response(JSON.stringify({ error: "Square rejected the request", details: data }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // The variation comes back nested inside its plan's subscription_plan_data,
  // not as its own top-level entry in `objects`.
  const plan = data.objects?.find((o) => o.type === "SUBSCRIPTION_PLAN");
  const variationId = plan?.subscription_plan_data?.subscription_plan_variations?.[0]?.id;

  return new Response(
    JSON.stringify({
      message: variationId
        ? "Catalog created. Set SQUARE_PLAN_VARIATION_ID to the id below."
        : "Request succeeded but no plan variation came back — check `objects` below.",
      plan_variation_id: variationId ?? null,
      objects: data.objects,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
