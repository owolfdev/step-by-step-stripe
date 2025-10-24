/**
 * Subscription synchronization utility
 * Syncs Stripe subscription data with Supabase database
 */

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlanTier, getPlanTierPriority } from "./subscription";
import { logger, createLogContext } from "./logging";

export interface StripeSubscriptionInfo {
  id: string;
  status: string;
  priceId: string | null;
  currentPeriodEnd: number | null;
  tier: string;
  priority: number;
}

/**
 * Get all active subscriptions for a customer from Stripe
 */
export async function getActiveStripeSubscriptions(
  customerId: string
): Promise<StripeSubscriptionInfo[]> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    return subscriptions.data.map((sub) => {
      const priceId = sub.items?.data?.[0]?.price?.id || null;
      const tier = getPlanTier(priceId);
      const priority = getPlanTierPriority(tier);

      return {
        id: sub.id,
        status: sub.status,
        priceId,
        currentPeriodEnd: (sub as unknown as Record<string, unknown>)
          .current_period_end as number,
        tier,
        priority,
      };
    });
  } catch (error) {
    logger.error(
      "Failed to fetch Stripe subscriptions",
      createLogContext({
        customerId,
        operation: "stripe_subscription_fetch",
      }),
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * Get the highest priority active subscription
 */
export function getHighestPrioritySubscription(
  subscriptions: StripeSubscriptionInfo[]
): StripeSubscriptionInfo | null {
  if (subscriptions.length === 0) return null;

  return subscriptions.reduce((highest, current) => {
    return current.priority > highest.priority ? current : highest;
  });
}

/**
 * Sync subscription data from Stripe to Supabase
 */
export async function syncSubscriptionToDatabase(
  userId: string,
  customerId: string
): Promise<{
  success: boolean;
  subscription?: StripeSubscriptionInfo;
  error?: string;
}> {
  try {
    logger.info(
      "Starting subscription sync",
      createLogContext({
        userId,
        customerId,
        operation: "subscription_sync_start",
      })
    );

    // Get active subscriptions from Stripe
    const activeSubscriptions = await getActiveStripeSubscriptions(customerId);

    if (activeSubscriptions.length === 0) {
      // No active subscriptions - update to free
      const { error } = await supabaseAdmin
        .from("stripe_step_by_step_profiles")
        .update({
          subscription_status: null,
          subscription_price_id: null,
          subscription_current_period_end: null,
        })
        .eq("id", userId);

      if (error) {
        logger.databaseError(
          "update",
          "stripe_step_by_step_profiles",
          error,
          createLogContext({
            userId,
            customerId,
            operation: "subscription_sync_no_active",
          })
        );
        return { success: false, error: error.message };
      }

      logger.info(
        "Updated profile to free tier (no active subscriptions)",
        createLogContext({
          userId,
          customerId,
          operation: "subscription_sync_no_active_success",
        })
      );

      return { success: true };
    }

    // Get the highest priority subscription
    const highestSubscription =
      getHighestPrioritySubscription(activeSubscriptions);

    if (!highestSubscription) {
      return { success: false, error: "No valid subscription found" };
    }

    // Update database with highest subscription
    const { error } = await supabaseAdmin
      .from("stripe_step_by_step_profiles")
      .update({
        subscription_status: highestSubscription.status,
        subscription_price_id: highestSubscription.priceId,
        subscription_current_period_end: highestSubscription.currentPeriodEnd
          ? new Date(highestSubscription.currentPeriodEnd * 1000).toISOString()
          : null,
      })
      .eq("id", userId);

    if (error) {
      logger.databaseError(
        "update",
        "stripe_step_by_step_profiles",
        error,
        createLogContext({
          userId,
          customerId,
          operation: "subscription_sync_update",
          subscriptionId: highestSubscription.id,
          tier: highestSubscription.tier,
        })
      );
      return { success: false, error: error.message };
    }

    logger.info(
      "Successfully synced subscription to database",
      createLogContext({
        userId,
        customerId,
        operation: "subscription_sync_success",
        subscriptionId: highestSubscription.id,
        tier: highestSubscription.tier,
        priority: highestSubscription.priority,
        totalActiveSubscriptions: activeSubscriptions.length,
      })
    );

    return { success: true, subscription: highestSubscription };
  } catch (error) {
    logger.error(
      "Subscription sync failed",
      createLogContext({
        userId,
        customerId,
        operation: "subscription_sync_error",
      }),
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Force sync subscription for a user (useful for debugging)
 */
export async function forceSyncUserSubscription(userId: string): Promise<{
  success: boolean;
  subscription?: StripeSubscriptionInfo;
  error?: string;
}> {
  try {
    // Get user's customer ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("stripe_step_by_step_profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return { success: false, error: "No Stripe customer ID found" };
    }

    return await syncSubscriptionToDatabase(userId, profile.stripe_customer_id);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
