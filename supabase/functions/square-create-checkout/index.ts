// Called by the signed-in app (supabase.functions.invoke) to get a Square-hosted
// checkout URL for the $39.99/yr annual subscription (the "7-day free trial"
// is a refund-on-request policy, not a $0 Square phase — see
// square-setup-catalog for why). Verifies the caller's Supabase session,
// reuses/creates a Square Customer tied to that account via `reference_id`,
// and records a 'pending' row so the webhook has an email/customer to match
// against once payment completes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { squareFetch } from "../_shared/square.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ANNUAL_PRICE_CENTS = 3999;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("subscriptions")
      .select("square_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existing?.square_customer_id as string | null | undefined;

    if (!customerId) {
      const { ok, data, status } = await squareFetch<{
        customer?: { id: string };
        errors?: unknown[];
      }>("/v2/customers", {
        method: "POST",
        body: JSON.stringify({
          email_address: user.email,
          reference_id: user.id,
        }),
      });
      if (!ok || !data.customer) {
        return new Response(
          JSON.stringify({ error: "Failed to create Square customer", details: data }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      customerId = data.customer.id;
    }

    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        email: user.email,
        square_customer_id: customerId,
        status: "pending",
      },
      { onConflict: "user_id" },
    );

    const planVariationId = Deno.env.get("SQUARE_PLAN_VARIATION_ID");
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");
    if (!planVariationId || !locationId) {
      return new Response(
        JSON.stringify({ error: "SQUARE_PLAN_VARIATION_ID or SQUARE_LOCATION_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { redirectOrigin } = await req.json().catch(() => ({ redirectOrigin: null }));
    const redirectUrl = redirectOrigin
      ? `${redirectOrigin}/?sub=success`
      : Deno.env.get("PUBLIC_APP_URL");

    const { ok, data, status } = await squareFetch<{
      payment_link?: { url: string };
      errors?: unknown[];
    }>("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        quick_pay: {
          name: "Range Roulette Annual",
          price_money: { amount: ANNUAL_PRICE_CENTS, currency: "USD" },
          location_id: locationId,
        },
        checkout_options: {
          subscription_plan_id: planVariationId,
          ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
        },
        pre_populated_data: { buyer_email: user.email },
      }),
    });

    if (!ok || !data.payment_link) {
      return new Response(
        JSON.stringify({ error: "Failed to create checkout link", details: data }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ url: data.payment_link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
