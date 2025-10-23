// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger, createLogContext } from "@/lib/logging";
import {
  Errors,
  validateRequiredFields,
  validatePriceId,
  handleApiError,
} from "@/lib/error-handling";

export const runtime = "nodejs"; // ensure Node runtime (not Edge)

type Body = {
  priceId: string;
  mode?: "subscription" | "payment";
};

async function getOrCreateCustomer({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  // Read (and possibly update) via RLS-enabled user client
  const supabase = await createServerClientWithCookies();

  // 1) Read existing customer id
  const { data: profile, error: readErr } = await supabase
    .from("stripe_step_by_step_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  // If profile exists and has customer ID, return it
  if (!readErr && profile?.stripe_customer_id) {
    return profile.stripe_customer_id as string;
  }

  // 2) Create in Stripe
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  // 3) Upsert to profiles table using admin client (bypasses RLS)
  const { error: upsertErr } = await supabaseAdmin
    .from("stripe_step_by_step_profiles")
    .upsert({
      id: userId,
      stripe_customer_id: customer.id,
      billing_email: email,
      subscription_status: null,
      subscription_price_id: null,
      subscription_current_period_end: null,
    });

  if (upsertErr) throw upsertErr;
  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    logger.apiRequest("POST", "/api/checkout", { operation: "checkout_start" });

    const supabase = await createServerClientWithCookies();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw Errors.unauthorized(
        "User must be logged in to create checkout session"
      );
    }

    // Parse and validate request body
    let requestBody: Body;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw Errors.invalidInput("Invalid JSON in request body");
    }

    const { priceId, mode = "subscription" } = requestBody;

    // Validate required fields
    validateRequiredFields({ priceId }, ["priceId"]);

    // Validate price ID
    validatePriceId(priceId);

    logger.info(
      "Creating checkout session",
      createLogContext({
        userId: user.id,
        priceId,
        mode,
        operation: "checkout_creation",
      })
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Ensure we have a Stripe customer for this user
    let customerId: string;
    try {
      customerId = await getOrCreateCustomer({
        userId: user.id,
        email: user.email ?? null,
      });
    } catch (error) {
      throw Errors.stripeError("create_customer", error);
    }

    logger.info(
      "Customer ID obtained/created",
      createLogContext({
        userId: user.id,
        stripeCustomerId: customerId,
        operation: "customer_creation",
      })
    );

    // Check for existing active subscriptions and cancel them
    if (mode === "subscription") {
      try {
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 10,
        });

        if (existingSubscriptions.data.length > 0) {
          logger.info(
            "Found existing active subscriptions, cancelling them",
            createLogContext({
              userId: user.id,
              stripeCustomerId: customerId,
              existingCount: existingSubscriptions.data.length,
              operation: "subscription_cleanup",
            })
          );

          // Cancel all existing active subscriptions
          for (const subscription of existingSubscriptions.data) {
            try {
              await stripe.subscriptions.cancel(subscription.id);
              logger.info(
                "Cancelled existing subscription",
                createLogContext({
                  userId: user.id,
                  stripeCustomerId: customerId,
                  cancelledSubscriptionId: subscription.id,
                  operation: "subscription_cancellation",
                })
              );
            } catch (cancelError) {
              logger.warn(
                "Failed to cancel existing subscription",
                createLogContext({
                  userId: user.id,
                  stripeCustomerId: customerId,
                  cancelledSubscriptionId: subscription.id,
                  operation: "subscription_cancellation_failed",
                })
              );
              // Continue with other cancellations
            }
          }
        }
      } catch (err) {
        logger.error(
          "Failed to check/cancel existing subscriptions",
          createLogContext({
            userId: user.id,
            stripeCustomerId: customerId,
            operation: "subscription_cleanup_error",
          }),
          err instanceof Error ? err : new Error(String(err))
        );
        // Continue with checkout even if cleanup fails
      }
    }

    // Create Checkout Session
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode, // "subscription" | "payment"
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/billing?status=success`,
        cancel_url: `${siteUrl}/billing?status=cancelled`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        // automatic_tax: { enabled: true }, // enable later if you need Stripe Tax
      });
    } catch (error) {
      throw Errors.stripeError("create_checkout_session", error);
    }

    logger.stripeOperation(
      "create_checkout_session",
      session.id,
      createLogContext({
        userId: user.id,
        stripeCustomerId: customerId,
        operation: "checkout_session_created",
        sessionId: session.id,
        mode,
      })
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error, {
      operation: "checkout_error",
      endpoint: "/api/checkout",
    });
  }
}
