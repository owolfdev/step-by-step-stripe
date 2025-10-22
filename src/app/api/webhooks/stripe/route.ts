import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin"; // service-role client
import { logger, createLogContext } from "@/lib/logging";
import Stripe from "stripe";

export const runtime = "nodejs"; // required for Stripe SDK
export const dynamic = "force-dynamic"; // make sure body isn't cached

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    logger.warn("Webhook request missing signature", {
      operation: "webhook_validation",
    });
    return new NextResponse("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.webhookError("signature_verification", "unknown", error, {
      operation: "webhook_validation",
    });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Check for duplicate events using stripe_event_id
  try {
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_step_by_step_payments")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .limit(1);

    if (existingEvent && existingEvent.length > 0) {
      logger.warn(
        "Duplicate webhook event received",
        createLogContext({
          stripeEventId: event.id,
          operation: "webhook_deduplication",
        })
      );
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    logger.error(
      "Failed to check for duplicate events",
      createLogContext({
        stripeEventId: event.id,
        operation: "webhook_deduplication",
      }),
      err instanceof Error ? err : new Error(String(err))
    );
    // Continue processing even if deduplication check fails
  }

  try {
    logger.webhookEvent(event.type, event.id, {
      operation: "webhook_processing",
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId = s.customer as string | undefined;
        const email = s.customer_details?.email as string | undefined;

        logger.info(
          "Processing checkout session completed",
          createLogContext({
            stripeEventId: event.id,
            stripeCustomerId: customerId,
            operation: "checkout_completed",
            mode: s.mode,
            amountTotal: s.amount_total,
            currency: s.currency,
          })
        );

        if (customerId) {
          try {
            // try to map to user via customer metadata (we set this at creation time)
            const customer = await stripe.customers.retrieve(customerId);
            const supabaseUserId = (customer as Stripe.Customer)?.metadata
              ?.supabase_user_id as string | undefined;

            logger.info(
              "Retrieved customer metadata",
              createLogContext({
                stripeEventId: event.id,
                stripeCustomerId: customerId,
                userId: supabaseUserId,
                operation: "customer_lookup",
              })
            );

            if (supabaseUserId) {
              // update our profiles table
              const { error } = await supabaseAdmin
                .from("stripe_step_by_step_profiles")
                .update({
                  stripe_customer_id: customerId,
                  billing_email: email ?? null,
                })
                .eq("id", supabaseUserId);

              if (error) {
                logger.databaseError(
                  "update",
                  "stripe_step_by_step_profiles",
                  error,
                  createLogContext({
                    stripeEventId: event.id,
                    userId: supabaseUserId,
                    stripeCustomerId: customerId,
                  })
                );
              } else {
                logger.info(
                  "Successfully updated profile",
                  createLogContext({
                    stripeEventId: event.id,
                    userId: supabaseUserId,
                    stripeCustomerId: customerId,
                    operation: "profile_update",
                  })
                );
              }
            } else {
              logger.warn(
                "No supabase_user_id found in customer metadata",
                createLogContext({
                  stripeEventId: event.id,
                  stripeCustomerId: customerId,
                  operation: "customer_metadata_lookup",
                })
              );
            }
          } catch (err) {
            logger.stripeError(
              "retrieve_customer",
              customerId,
              err instanceof Error ? err : new Error(String(err)),
              createLogContext({
                stripeEventId: event.id,
                operation: "customer_retrieval",
              })
            );
          }
        }

        // log one-time vs subscription checkout
        try {
          await supabaseAdmin.from("stripe_step_by_step_payments").insert({
            user_id: null, // set on subscription events below; may not know user here
            stripe_event_id: event.id,
            type: s.mode === "subscription" ? "subscription" : "one_time",
            amount_total: s.amount_total ?? null,
            currency: s.currency ?? null,
            raw: s,
          });

          logger.databaseOperation(
            "insert",
            "stripe_step_by_step_payments",
            createLogContext({
              stripeEventId: event.id,
              operation: "payment_logging",
              type: s.mode === "subscription" ? "subscription" : "one_time",
            })
          );
        } catch (err) {
          logger.databaseError(
            "insert",
            "stripe_step_by_step_payments",
            err instanceof Error ? err : new Error(String(err)),
            createLogContext({
              stripeEventId: event.id,
              operation: "payment_logging",
            })
          );
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        logger.info(
          "Processing subscription event",
          createLogContext({
            stripeEventId: event.id,
            stripeCustomerId: customerId,
            operation: "subscription_event",
            eventType: event.type,
            subscriptionStatus: sub.status,
            subscriptionId: sub.id,
          })
        );

        // Find user by stripe_customer_id
        let userId: string | null = null;
        try {
          const { data: profs, error } = await supabaseAdmin
            .from("stripe_step_by_step_profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .limit(1);

          if (error) {
            logger.databaseError(
              "select",
              "stripe_step_by_step_profiles",
              error,
              createLogContext({
                stripeEventId: event.id,
                stripeCustomerId: customerId,
                operation: "user_lookup",
              })
            );
          } else {
            userId = profs?.[0]?.id ?? null;
            logger.info(
              "User lookup completed",
              createLogContext({
                stripeEventId: event.id,
                stripeCustomerId: customerId,
                userId: userId || undefined,
                operation: "user_lookup",
              })
            );
          }
        } catch (err) {
          logger.databaseError(
            "select",
            "stripe_step_by_step_profiles",
            err instanceof Error ? err : new Error(String(err)),
            createLogContext({
              stripeEventId: event.id,
              stripeCustomerId: customerId,
              operation: "user_lookup",
            })
          );
        }

        // Update subscription snapshot - get the highest active subscription
        if (userId) {
          try {
            // Get all active subscriptions for this customer
            const activeSubscriptions = await stripe.subscriptions.list({
              customer: customerId,
              status: "active",
              limit: 10,
            });

            let highestSubscription = sub;
            let highestTier = "free";

            if (activeSubscriptions.data.length > 0) {
              // Find the highest tier subscription
              const subscriptionTiers = activeSubscriptions.data.map((s) => ({
                subscription: s,
                tier: s.items?.data?.[0]?.price?.id || null,
              }));

              // Sort by tier priority and get the highest
              const sortedSubscriptions = subscriptionTiers.sort((a, b) => {
                const tierA =
                  a.tier === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY
                    ? "baby"
                    : a.tier === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM
                    ? "premium"
                    : a.tier === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO
                    ? "pro"
                    : "free";
                const tierB =
                  b.tier === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY
                    ? "baby"
                    : b.tier === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM
                    ? "premium"
                    : b.tier === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO
                    ? "pro"
                    : "free";

                const priorityA =
                  tierA === "free"
                    ? 0
                    : tierA === "baby"
                    ? 1
                    : tierA === "premium"
                    ? 2
                    : 3;
                const priorityB =
                  tierB === "free"
                    ? 0
                    : tierB === "baby"
                    ? 1
                    : tierB === "premium"
                    ? 2
                    : 3;

                return priorityB - priorityA;
              });

              highestSubscription = sortedSubscriptions[0].subscription;
              highestTier =
                sortedSubscriptions[0].tier ===
                process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY
                  ? "baby"
                  : sortedSubscriptions[0].tier ===
                    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM
                  ? "premium"
                  : sortedSubscriptions[0].tier ===
                    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO
                  ? "pro"
                  : "free";
            }

            // Extract current_period_end with proper typing
            const currentPeriodEnd = (
              highestSubscription as unknown as Record<string, unknown>
            ).current_period_end as number | undefined;

            const { error } = await supabaseAdmin
              .from("stripe_step_by_step_profiles")
              .update({
                subscription_status: highestSubscription.status, // 'active', 'canceled', etc.
                subscription_price_id:
                  highestSubscription.items?.data?.[0]?.price?.id ?? null,
                subscription_current_period_end: currentPeriodEnd
                  ? new Date(currentPeriodEnd * 1000).toISOString()
                  : null,
              })
              .eq("id", userId);

            if (error) {
              logger.databaseError(
                "update",
                "stripe_step_by_step_profiles",
                error,
                createLogContext({
                  stripeEventId: event.id,
                  userId,
                  stripeCustomerId: customerId,
                  operation: "subscription_update",
                  subscriptionStatus: highestSubscription.status,
                })
              );
            } else {
              logger.info(
                "Successfully updated subscription with highest tier",
                createLogContext({
                  stripeEventId: event.id,
                  userId,
                  stripeCustomerId: customerId,
                  operation: "subscription_update",
                  subscriptionStatus: highestSubscription.status,
                  subscriptionPriceId:
                    highestSubscription.items?.data?.[0]?.price?.id,
                  highestTier,
                  activeSubscriptionsCount: activeSubscriptions.data.length,
                })
              );
            }
          } catch (err) {
            logger.databaseError(
              "update",
              "stripe_step_by_step_profiles",
              err instanceof Error ? err : new Error(String(err)),
              createLogContext({
                stripeEventId: event.id,
                userId,
                stripeCustomerId: customerId,
                operation: "subscription_update",
              })
            );
          }
        } else {
          logger.warn(
            "No user found for customer",
            createLogContext({
              stripeEventId: event.id,
              stripeCustomerId: customerId,
              operation: "user_lookup",
            })
          );
        }

        // record an entry too (optional)
        try {
          await supabaseAdmin.from("stripe_step_by_step_payments").insert({
            user_id: userId,
            stripe_event_id: event.id,
            type: "subscription",
            amount_total: null,
            currency: null,
            raw: sub,
          });

          logger.databaseOperation(
            "insert",
            "stripe_step_by_step_payments",
            createLogContext({
              stripeEventId: event.id,
              userId: userId || undefined,
              operation: "subscription_logging",
            })
          );
        } catch (err) {
          logger.databaseError(
            "insert",
            "stripe_step_by_step_payments",
            err instanceof Error ? err : new Error(String(err)),
            createLogContext({
              stripeEventId: event.id,
              userId: userId || undefined,
              operation: "subscription_logging",
            })
          );
        }

        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        logger.info(
          "Processing invoice event",
          createLogContext({
            stripeEventId: event.id,
            stripeCustomerId: customerId,
            operation: "invoice_event",
            eventType: event.type,
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid,
            amountDue: invoice.amount_due,
          })
        );

        // Map to user
        let userId: string | null = null;
        try {
          const { data: profs, error } = await supabaseAdmin
            .from("stripe_step_by_step_profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .limit(1);

          if (error) {
            logger.databaseError(
              "select",
              "stripe_step_by_step_profiles",
              error,
              createLogContext({
                stripeEventId: event.id,
                stripeCustomerId: customerId,
                operation: "user_lookup",
              })
            );
          } else {
            userId = profs?.[0]?.id ?? null;
            logger.info(
              "User lookup completed for invoice",
              createLogContext({
                stripeEventId: event.id,
                stripeCustomerId: customerId,
                userId: userId || undefined,
                operation: "user_lookup",
              })
            );
          }
        } catch (err) {
          logger.databaseError(
            "select",
            "stripe_step_by_step_profiles",
            err instanceof Error ? err : new Error(String(err)),
            createLogContext({
              stripeEventId: event.id,
              stripeCustomerId: customerId,
              operation: "user_lookup",
            })
          );
        }

        try {
          await supabaseAdmin.from("stripe_step_by_step_payments").insert({
            user_id: userId,
            stripe_event_id: event.id,
            type: "invoice",
            amount_total: invoice.amount_paid ?? invoice.amount_due ?? null,
            currency: invoice.currency ?? null,
            raw: invoice,
          });

          logger.databaseOperation(
            "insert",
            "stripe_step_by_step_payments",
            createLogContext({
              stripeEventId: event.id,
              userId: userId || undefined,
              operation: "invoice_logging",
              amountTotal: invoice.amount_paid ?? invoice.amount_due,
            })
          );
        } catch (err) {
          logger.databaseError(
            "insert",
            "stripe_step_by_step_payments",
            err instanceof Error ? err : new Error(String(err)),
            createLogContext({
              stripeEventId: event.id,
              userId: userId || undefined,
              operation: "invoice_logging",
            })
          );
        }

        break;
      }

      default:
        logger.info(
          "Unhandled webhook event type",
          createLogContext({
            stripeEventId: event.id,
            operation: "unhandled_event",
            eventType: event.type,
          })
        );
        break;
    }

    logger.info(
      "Webhook processing completed successfully",
      createLogContext({
        stripeEventId: event.id,
        operation: "webhook_completion",
      })
    );

    return NextResponse.json({ received: true });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.webhookError("processing", event.id, error, {
      operation: "webhook_error",
    });
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
