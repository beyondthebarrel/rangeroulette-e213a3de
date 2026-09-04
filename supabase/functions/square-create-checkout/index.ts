// Called by the signed-in app (supabase.functions.invoke) to get a Square-hosted
// checkout URL for either the $39.99/yr annual plan or the $19.99/6-month
// plan. Verifies the caller's Supabase session, reuses/creates a Square
// Customer tied to that account via `reference_id`, and records a 'pending'
// row so the webhook has an email/customer to match against once payment
// completes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { squareFetch } from "../_shared/square.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ANNUAL_PRICE_CENTS = 3999;
const HALF_OFF_PRICE_CENTS = 1999;
const SIX_MONTH_PRICE_CENTS = 1999;

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

    const { redirectOrigin, plan, promoCode } = await req
      .json()
      .catch(() => ({ redirectOrigin: null, plan: "annual", promoCode: null }));
    const isSixMonth = plan === "six_month";

    if (isSixMonth && promoCode) {
      return new Response(JSON.stringify({ error: "Promo codes only work with the Annual plan." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let discountType: "free" | "half_off" | "free_year" | null = null;
    if (promoCode) {
      const normalizedCode = String(promoCode).trim().toUpperCase();
      const { data: promo } = await admin
        .from("promo_codes")
        .select("code, discount_type, max_redemptions, redemption_count")
        .eq("code", normalizedCode)
        .maybeSingle();

      if (!promo || promo.redemption_count >= promo.max_redemptions) {
        return new Response(JSON.stringify({ error: "That code isn't valid or has been fully redeemed." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: redemptionError } = await admin
        .from("promo_redemptions")
        .insert({ code: normalizedCode, user_id: user.id });
      if (redemptionError) {
        // Unique violation on (code, user_id) — already redeemed by this account.
        return new Response(JSON.stringify({ error: "You've already used this code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin
        .from("promo_codes")
        .update({ redemption_count: promo.redemption_count + 1 })
        .eq("code", normalizedCode);

      discountType = promo.discount_type as "free" | "half_off" | "free_year";
    }

    if (discountType === "free") {
      await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          email: user.email,
          status: "active",
        },
        { onConflict: "user_id" },
      );
      return new Response(JSON.stringify({ granted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // A promo code only ever discounts the annual plan — six_month has its
    // own standing lower price already, so discountType is ignored there.
    const planVariationId = isSixMonth
      ? Deno.env.get("SQUARE_SIX_MONTH_PLAN_VARIATION_ID")
      : discountType === "half_off"
        ? Deno.env.get("SQUARE_HALF_OFF_PLAN_VARIATION_ID")
        : Deno.env.get("SQUARE_PLAN_VARIATION_ID");
    const priceCents = isSixMonth
      ? SIX_MONTH_PRICE_CENTS
      : discountType === "half_off"
        ? HALF_OFF_PRICE_CENTS
        : ANNUAL_PRICE_CENTS;
    const planName = isSixMonth
      ? "Range Roulette 6-Month"
      : discountType === "half_off"
        ? "Range Roulette Annual (50% off)"
        : "Range Roulette Annual";
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");
    if (!planVariationId || !locationId) {
      return new Response(
        JSON.stringify({ error: "Plan variation ID or SQUARE_LOCATION_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
          name: planName,
          price_money: { amount: priceCents, currency: "USD" },
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
