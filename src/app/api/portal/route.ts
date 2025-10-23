// src/app/api/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { logger, createLogContext } from "@/lib/logging";
import { Errors, handleApiError } from "@/lib/error-handling";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    logger.apiRequest("POST", "/api/portal", { operation: "portal_start" });

    const supabase = await createServerClientWithCookies();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw Errors.unauthorized(
        "User must be logged in to access billing portal"
      );
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
      throw Errors.databaseError("select_profile", error);
    }

    if (!profile?.stripe_customer_id) {
      throw Errors.stripeCustomerNotFound("No Stripe customer found for user");
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

    let portal;
    try {
      portal = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: returnUrl,
      });
    } catch (error) {
      throw Errors.stripeError("create_billing_portal_session", error);
    }

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
  } catch (error) {
    return handleApiError(error, {
      operation: "portal_error",
      endpoint: "/api/portal",
    });
  }
}
