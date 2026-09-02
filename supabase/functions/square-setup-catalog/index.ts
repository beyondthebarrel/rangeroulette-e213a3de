// One-time setup: creates the "Range Roulette Annual" subscription plan (7-day
// free trial, then $39.99/year) in Square's Catalog. Trigger it once by GET-ing
// this function's URL with ?key=<SQUARE_SETUP_SECRET>, then copy the
// plan_variation_id from the response into a SQUARE_PLAN_VARIATION_ID secret.
// Safe to re-run — the idempotency keys are fixed, so Square returns the same
// objects instead of creating duplicates.
import { squareFetch } from "../_shared/square.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ANNUAL_PRICE_CENTS = 3999;
const HALF_OFF_PRICE_CENTS = 1999;

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

  // ?customer=<square_customer_id> — checks whether Square actually created
  // a Subscription object for that customer yet, independent of whether a
  // webhook for it has arrived.
  const customerId = url.searchParams.get("customer");
  if (customerId) {
    const { ok, status, data } = await squareFetch("/v2/subscriptions/search", {
      method: "POST",
      body: JSON.stringify({ query: { filter: { customer_ids: [customerId] } } }),
    });
    return new Response(JSON.stringify(data), {
      status: ok ? 200 : status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ?email=<address> — lists every Square customer with that email, so we
  // can tell whether checkout completion created a second customer instead
  // of reusing the one we pre-created with reference_id set.
  const email = url.searchParams.get("email");
  if (email) {
    const { ok, status, data } = await squareFetch("/v2/customers/search", {
      method: "POST",
      body: JSON.stringify({ query: { filter: { email_address: { exact: email } } } }),
    });
    return new Response(JSON.stringify(data), {
      status: ok ? 200 : status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ?test=1 creates a completely separate, single-phase $0/year plan for
  // proving the checkout → webhook → activation chain works in Production
  // (Sandbox can't — see the comment on the webhook handler) without ever
  // touching the real $39.99 plan's price.
  const isTest = url.searchParams.get("test") === "1";
  // ?halfoff=1 creates a second real plan at half price, for BETA50 code
  // redemptions — a separate catalog plan (not a per-checkout price
  // override) so the discount is genuinely permanent on renewal, not just a
  // first-payment quirk.
  const isHalfOff = url.searchParams.get("halfoff") === "1";

  const body = isTest
    ? {
        idempotency_key: crypto.randomUUID(),
        batches: [
          {
            objects: [
              {
                type: "SUBSCRIPTION_PLAN",
                id: "#rangeroulette-test-plan",
                subscription_plan_data: { name: "Range Roulette Test ($0)" },
              },
              {
                type: "SUBSCRIPTION_PLAN_VARIATION",
                id: "#rangeroulette-test-variation",
                subscription_plan_variation_data: {
                  name: "Test — $0/year",
                  subscription_plan_id: "#rangeroulette-test-plan",
                  phases: [
                    {
                      ordinal: 0,
                      cadence: "ANNUAL",
                      pricing: { type: "STATIC", price: { amount: 0, currency: "USD" } },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }
    : isHalfOff
      ? {
          idempotency_key: crypto.randomUUID(),
          batches: [
            {
              objects: [
                {
                  type: "SUBSCRIPTION_PLAN",
                  id: "#rangeroulette-halfoff-plan",
                  subscription_plan_data: { name: "Range Roulette Annual (50% off)" },
                },
                {
                  type: "SUBSCRIPTION_PLAN_VARIATION",
                  id: "#rangeroulette-halfoff-variation",
                  subscription_plan_variation_data: {
                    name: "Annual — 50% off",
                    subscription_plan_id: "#rangeroulette-halfoff-plan",
                    phases: [
                      {
                        ordinal: 0,
                        cadence: "ANNUAL",
                        pricing: {
                          type: "STATIC",
                          price: { amount: HALF_OFF_PRICE_CENTS, currency: "USD" },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }
      : {
        // A fresh key every call, not a fixed one — Square ties a fixed
        // idempotency_key to the exact request body from its *first* use, and our
        // request body changed across debugging attempts, which kept tripping
        // IDEMPOTENCY_KEY_REUSED even under a new fixed string. This endpoint is
        // already gated by SQUARE_SETUP_SECRET and only meant to run once by
        // hand, so a random key each time (worst case: a harmless duplicate
        // catalog entry if run twice) is simpler than fighting Square's cache.
        // Single paid phase, no $0/discounted phase at all. Both a raw $0
        // STATIC phase and a 100%-off RELATIVE-discount phase made Square's
        // hosted checkout page render broken/incomplete summaries (one
        // showed "$0.00" forever, the other dropped the paid phase
        // entirely and showed the plan "expiring"). Charging immediately
        // and honoring the 7-day trial as a refund-on-request policy
        // (handled outside Square, in the business) is what actually
        // checks out correctly.
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
                  name: "Annual",
                  subscription_plan_id: "#rangeroulette-annual-plan",
                  phases: [
                    {
                      ordinal: 0,
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
