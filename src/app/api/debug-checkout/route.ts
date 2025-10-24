import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logging";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    logger.info("Debug checkout API called", {
      operation: "debug_checkout_start",
    });

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid JSON in request body",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 400 }
      );
    }

    const { priceId, mode = "subscription" } = requestBody;

    // Check authentication
    const supabase = await createServerClientWithCookies();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          status: "error",
          error: "Authentication failed",
          details: authError?.message || "No user found",
        },
        { status: 401 }
      );
    }

    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from("stripe_step_by_step_profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        {
          status: "error",
          error: "Profile lookup failed",
          details: profileError.message,
        },
        { status: 400 }
      );
    }

    // Check Stripe connection
    let stripeCustomer;
    try {
      if (profile.stripe_customer_id) {
        stripeCustomer = await stripe.customers.retrieve(
          profile.stripe_customer_id
        );
      }
    } catch (stripeError) {
      return NextResponse.json(
        {
          status: "error",
          error: "Stripe customer lookup failed",
          details:
            stripeError instanceof Error
              ? stripeError.message
              : String(stripeError),
        },
        { status: 500 }
      );
    }

    // Check price ID validity
    const validPriceIds = [
      config.stripe.priceIds.baby,
      config.stripe.priceIds.premium,
      config.stripe.priceIds.pro,
    ].filter(Boolean);

    const isValidPriceId = validPriceIds.includes(priceId);

    logger.info("Debug checkout completed", {
      operation: "debug_checkout_success",
      userId: user.id,
      hasProfile: !!profile,
      hasStripeCustomer: !!stripeCustomer,
      isValidPriceId,
      priceId,
      mode,
    });

    return NextResponse.json({
      status: "success",
      debug: {
        user: {
          id: user.id,
          email: user.email,
        },
        profile: {
          exists: !!profile,
          stripeCustomerId: profile?.stripe_customer_id,
          email: profile?.email,
        },
        stripe: {
          customerExists: !!stripeCustomer,
          customerId: stripeCustomer?.id,
        },
        request: {
          priceId,
          mode,
          isValidPriceId,
          validPriceIds,
        },
        config: {
          appId: config.app.id,
          appName: config.app.name,
          appStore: config.app.store,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Debug checkout failed",
      {
        operation: "debug_checkout_error",
      },
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        status: "error",
        error: "Debug checkout failed",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
