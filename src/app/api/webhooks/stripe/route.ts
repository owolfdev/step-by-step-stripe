import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin"; // service-role client
import Stripe from "stripe";

export const runtime = "nodejs"; // required for Stripe SDK
export const dynamic = "force-dynamic"; // make sure body isn't cached

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error(
      "Webhook signature verification failed:",
      err instanceof Error ? err.message : String(err)
    );
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId = s.customer as string | undefined;
        const email = s.customer_details?.email as string | undefined;

        if (customerId) {
          // try to map to user via customer metadata (we set this at creation time)
          const customer = await stripe.customers.retrieve(customerId);
          const supabaseUserId = (customer as Stripe.Customer)?.metadata
            ?.supabase_user_id as string | undefined;

          console.log(
            `[WEBHOOK] Customer ${customerId}, Supabase User ID: ${supabaseUserId}`
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
              console.error(`[WEBHOOK] Error updating profile:`, error);
            } else {
              console.log(
                `[WEBHOOK] Successfully updated profile for user ${supabaseUserId}`
              );
            }
          } else {
            console.log(
              `[WEBHOOK] No supabase_user_id found in customer metadata`
            );
          }
        }

        // log one-time vs subscription checkout
        await supabaseAdmin.from("stripe_step_by_step_payments").insert({
          user_id: null, // set on subscription events below; may not know user here
          stripe_event_id: event.id,
          type: s.mode === "subscription" ? "subscription" : "one_time",
          amount_total: s.amount_total ?? null,
          currency: s.currency ?? null,
          raw: s,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        console.log(
          `[WEBHOOK] Subscription ${event.type} for customer ${customerId}, status: ${sub.status}`
        );

        // Find user by stripe_customer_id
        const { data: profs } = await supabaseAdmin
          .from("stripe_step_by_step_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .limit(1);

        const userId = profs?.[0]?.id ?? null;
        console.log(
          `[WEBHOOK] Found user ID: ${userId} for customer ${customerId}`
        );

        // Update subscription snapshot
        if (userId) {
          // Extract current_period_end with proper typing
          const currentPeriodEnd = (sub as unknown as Record<string, unknown>)
            .current_period_end as number | undefined;

          const { error } = await supabaseAdmin
            .from("stripe_step_by_step_profiles")
            .update({
              subscription_status: sub.status, // 'active', 'canceled', etc.
              subscription_price_id: sub.items?.data?.[0]?.price?.id ?? null,
              subscription_current_period_end: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : null,
            })
            .eq("id", userId);

          if (error) {
            console.error(`[WEBHOOK] Error updating subscription:`, error);
          } else {
            console.log(
              `[WEBHOOK] Successfully updated subscription for user ${userId}`
            );
          }
        } else {
          console.log(`[WEBHOOK] No user found for customer ${customerId}`);
        }

        // record an entry too (optional)
        await supabaseAdmin.from("stripe_step_by_step_payments").insert({
          user_id: userId,
          stripe_event_id: event.id,
          type: "subscription",
          amount_total: null,
          currency: null,
          raw: sub,
        });

        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Map to user
        const { data: profs } = await supabaseAdmin
          .from("stripe_step_by_step_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .limit(1);

        const userId = profs?.[0]?.id ?? null;

        await supabaseAdmin.from("stripe_step_by_step_payments").insert({
          user_id: userId,
          stripe_event_id: event.id,
          type: "invoice",
          amount_total: invoice.amount_paid ?? invoice.amount_due ?? null,
          currency: invoice.currency ?? null,
          raw: invoice,
        });

        break;
      }

      default:
        // no-op
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
