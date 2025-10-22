import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { logger, createLogContext } from "@/lib/logging";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    logger.apiRequest("GET", "/api/debug-stripe", {
      operation: "debug_stripe_start",
    });

    const supabase = await createServerClientWithCookies();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("stripe_step_by_step_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer ID found" },
        { status: 400 }
      );
    }

    // Get all subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      limit: 10,
    });

    // Get customer details
    const customer = await stripe.customers.retrieve(
      profile.stripe_customer_id
    );

    logger.info(
      "Debug Stripe data retrieved",
      createLogContext({
        userId: user.id,
        stripeCustomerId: profile.stripe_customer_id,
        subscriptionsCount: subscriptions.data.length,
        operation: "debug_stripe_success",
      })
    );

    return NextResponse.json({
      customer: {
        id: customer.id,
        email: (customer as any).email,
        created: (customer as any).created,
      },
      subscriptions: subscriptions.data.map((sub) => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        price_id: sub.items?.data?.[0]?.price?.id,
        amount: sub.items?.data?.[0]?.price?.unit_amount,
        currency: sub.items?.data?.[0]?.price?.currency,
        created: sub.created,
      })),
      total_subscriptions: subscriptions.data.length,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.apiError("GET", "/api/debug-stripe", error, {
      operation: "debug_stripe_error",
    });
    return NextResponse.json(
      { error: "Failed to fetch Stripe data" },
      { status: 500 }
    );
  }
}
