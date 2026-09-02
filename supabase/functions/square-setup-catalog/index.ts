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

  const body = {
    idempotency_key: "rangeroulette-annual-plan-setup-v1",
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
              phases: [
                {
                  uid: "trial",
                  ordinal: 0,
                  cadence: "WEEKLY",
                  periods: 1,
                  pricing: { type: "STATIC", price: { amount: 0, currency: "USD" } },
                },
                {
                  uid: "paid",
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
    objects?: { type: string; id: string }[];
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

  const variation = data.objects?.find((o) => o.type === "SUBSCRIPTION_PLAN_VARIATION");

  return new Response(
    JSON.stringify({
      message: variation
        ? "Catalog created. Set SQUARE_PLAN_VARIATION_ID to the id below."
        : "Request succeeded but no plan variation came back — check `objects` below.",
      plan_variation_id: variation?.id ?? null,
      objects: data.objects,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
