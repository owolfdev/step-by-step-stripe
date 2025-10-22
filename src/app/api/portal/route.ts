// src/app/api/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { logger, createLogContext } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    logger.apiRequest("POST", "/api/portal", { operation: "portal_start" });

    const supabase = await createServerClientWithCookies();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Unauthorized portal access attempt", {
        operation: "portal_auth",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info(
      "User authenticated for portal access",
      createLogContext({
        userId: user.id,
        operation: "portal_auth_success",
      })
    );

    // Read customer's stripe_customer_id
    const { data: profile, error } = await supabase
      .from("stripe_step_by_step_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (error) {
      logger.databaseError(
        "select",
        "stripe_step_by_step_profiles",
        error,
        createLogContext({
          userId: user.id,
          operation: "portal_profile_lookup",
        })
      );
      throw error;
    }

    if (!profile?.stripe_customer_id) {
      logger.warn(
        "No Stripe customer found for user",
        createLogContext({
          userId: user.id,
          operation: "portal_customer_lookup",
        })
      );
      return NextResponse.json(
        { error: "No Stripe customer found for user" },
        { status: 400 }
      );
    }

    logger.info(
      "Stripe customer found for portal",
      createLogContext({
        userId: user.id,
        stripeCustomerId: profile.stripe_customer_id,
        operation: "portal_customer_found",
      })
    );

    const returnUrl =
      process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/billing`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    logger.stripeOperation(
      "create_billing_portal_session",
      portal.id,
      createLogContext({
        userId: user.id,
        stripeCustomerId: profile.stripe_customer_id,
        operation: "portal_session_created",
        portalId: portal.id,
      })
    );

    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.apiError("POST", "/api/portal", error, {
      operation: "portal_error",
    });
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
