import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getSubscriptionInfo, getEducationalMessage } from "@/lib/subscription";
import SubscriptionBadge from "@/components/subscription-badge";
import FeatureCards from "@/components/feature-cards";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Your Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please log in to access your personal dashboard and manage your
            account.
          </p>
          <a
            href="/login"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-block"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from("stripe_step_by_step_profiles")
    .select(
      "billing_email, stripe_customer_id, subscription_status, subscription_price_id, subscription_current_period_end"
    )
    .eq("id", user.id)
    .single();

  // Get subscription info
  let subscription = getSubscriptionInfo(
    profile || {
      subscription_status: null,
      subscription_price_id: null,
      subscription_current_period_end: null,
    }
  );

  // Auto-sync subscription if we have a Stripe customer ID
  if (profile?.stripe_customer_id) {
    try {
      const { forceSyncUserSubscription } = await import(
        "@/lib/subscription-sync"
      );
      const syncResult = await forceSyncUserSubscription(user.id);

      if (syncResult.success && syncResult.subscription) {
        // Re-fetch the updated profile after sync
        const { data: updatedProfile } = await supabase
          .from("stripe_step_by_step_profiles")
          .select(
            "billing_email, stripe_customer_id, subscription_status, subscription_price_id, subscription_current_period_end"
          )
          .eq("id", user.id)
          .single();

        subscription = getSubscriptionInfo(
          updatedProfile || {
            subscription_status: null,
            subscription_price_id: null,
            subscription_current_period_end: null,
          }
        );
      }
    } catch (error) {
      // If sync fails, continue with existing data
      console.warn("Auto-sync failed, using cached data:", error);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user.email?.split("@")[0]}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Here&apos;s an overview of your account and subscription status.
        </p>

        {/* Subscription Status */}
        <div className="mb-6">
          <SubscriptionBadge subscription={subscription} showDetails={true} />
        </div>

        {/* Educational Message */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                Subscription Status
              </h4>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {getEducationalMessage(subscription.planTier)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Account Status
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Email verified and active
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </p>
        </div>

        {/* Subscription Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Subscription
            </h2>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Plan:{" "}
              <span className="font-medium capitalize">
                {subscription.planTier}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Status:{" "}
              <span className="font-medium capitalize">
                {subscription.status || "None"}
              </span>
            </p>
            {subscription.isActive && subscription.currentPeriodEnd && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Next billing:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
          </div>
          <div className="space-y-2">
            <Link
              href="/pricing"
              className="block text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              View pricing plans →
            </Link>
            <Link
              href="/billing"
              className="block text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Manage billing →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <svg
              className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Recent Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Account created successfully
            </div>
            {profile?.subscription_status && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                Subscription {profile.subscription_status}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
              Last login: Today
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Section */}
      <div className="mt-8">
        <FeatureCards currentTier={subscription.planTier} showUpgrade={true} />
      </div>
    </div>
  );
}
