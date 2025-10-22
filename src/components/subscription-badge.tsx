import {
  SubscriptionInfo,
  formatSubscriptionStatus,
  getPlanByTier,
} from "@/lib/subscription";

interface SubscriptionBadgeProps {
  subscription: SubscriptionInfo;
  showDetails?: boolean;
}

export default function SubscriptionBadge({
  subscription,
  showDetails = false,
}: SubscriptionBadgeProps) {
  const plan = getPlanByTier(subscription.planTier);
  const statusInfo = formatSubscriptionStatus(subscription.status);

  const getStatusColor = (variant: string) => {
    switch (variant) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "info":
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "baby":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "premium":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "pro":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      {/* Plan Badge */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{plan?.icon || "👤"}</span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(
            subscription.planTier
          )}`}
        >
          {plan?.name || "Free"} Plan
        </span>
      </div>

      {/* Status Badge */}
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
          statusInfo.variant
        )}`}
      >
        {statusInfo.text}
      </span>

      {/* Additional Details */}
      {showDetails &&
        subscription.isActive &&
        subscription.currentPeriodEnd && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Renews{" "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
    </div>
  );
}
