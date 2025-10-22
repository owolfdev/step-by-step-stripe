import { createServerClientWithCookies } from "@/lib/supabase/server";
import ManageBillingButton from "@/components/manage-billing-button";

export default async function BillingPage() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
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
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please log in to view your billing information and manage your
            subscription.
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

  let { data: profile } = await supabase
    .from("stripe_step_by_step_profiles")
    .select(
      "billing_email, stripe_customer_id, subscription_status, subscription_price_id, subscription_current_period_end"
    )
    .eq("id", user.id)
    .single();

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

        profile = updatedProfile;
      }
    } catch (error) {
      // If sync fails, continue with existing data
      console.warn("Auto-sync failed, using cached data:", error);
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case "canceled":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      case "past_due":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Billing Information
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your subscription and view billing details
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Status Card */}
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Subscription Status
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Status:
              </span>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  profile?.subscription_status
                )}`}
              >
                {profile?.subscription_status || "No subscription"}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Plan ID:
              </span>
              <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                {profile?.subscription_price_id || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Next billing date:
              </span>
              <span className="ml-2 text-sm text-gray-900 dark:text-white">
                {formatDate(profile?.subscription_current_period_end)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Information Card */}
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Customer Information
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Email:
              </span>
              <span className="ml-2 text-sm text-gray-900 dark:text-white">
                {profile?.billing_email || user.email}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Customer ID:
              </span>
              <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                {profile?.stripe_customer_id || "Not created yet"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Manage Billing Button */}
      <div className="mt-8 text-center">
        <ManageBillingButton />
      </div>
    </div>
  );
}
