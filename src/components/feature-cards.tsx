import { PlanTier, getPlanFeatures, getPlanByTier } from "@/lib/subscription";
import Link from "next/link";

interface FeatureCardsProps {
  currentTier: PlanTier;
  showUpgrade?: boolean;
}

export default function FeatureCards({
  currentTier,
  showUpgrade = true,
}: FeatureCardsProps) {
  const allPlans = getPlanFeatures();
  const currentPlan = getPlanByTier(currentTier);

  const getTierColor = (tier: PlanTier) => {
    switch (tier) {
      case "free":
        return "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50";
      case "baby":
        return "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20";
      case "premium":
        return "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20";
      case "pro":
        return "border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20";
      default:
        return "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50";
    }
  };

  const getTierAccent = (tier: PlanTier) => {
    switch (tier) {
      case "free":
        return "text-gray-600 dark:text-gray-400";
      case "baby":
        return "text-blue-600 dark:text-blue-400";
      case "premium":
        return "text-indigo-600 dark:text-indigo-400";
      case "pro":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Available Features
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          All features are visible for educational purposes. Your current plan
          is highlighted.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {allPlans.map((plan) => {
          const isCurrentPlan = plan.tier === currentTier;
          const isUpgrade =
            ["baby", "premium", "pro"].includes(plan.tier) &&
            plan.tier !== currentTier;

          return (
            <div
              key={plan.tier}
              className={`relative rounded-xl border-2 p-6 transition-all ${
                isCurrentPlan
                  ? `${getTierColor(plan.tier)} ring-2 ring-opacity-50 ${
                      plan.tier === "free"
                        ? "ring-gray-400"
                        : plan.tier === "baby"
                        ? "ring-blue-400"
                        : plan.tier === "premium"
                        ? "ring-indigo-400"
                        : "ring-purple-400"
                    }`
                  : getTierColor(plan.tier)
              }`}
            >
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Your Plan
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">{plan.icon}</div>
                <h3
                  className={`text-lg font-semibold ${getTierAccent(
                    plan.tier
                  )}`}
                >
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {plan.description}
                </p>
              </div>

              {/* Features List */}
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <svg
                      className={`w-4 h-4 mr-2 mt-0.5 shrink-0 ${
                        isCurrentPlan
                          ? getTierAccent(plan.tier)
                          : "text-gray-400"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span
                      className={
                        isCurrentPlan
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-600 dark:text-gray-400"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              {isUpgrade && showUpgrade && (
                <Link
                  href="/pricing"
                  className={`block w-full text-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    plan.tier === "baby"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : plan.tier === "premium"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  Upgrade to {plan.name}
                </Link>
              )}

              {isCurrentPlan && (
                <div className="text-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ✓ Currently Active
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Educational Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 shrink-0"
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
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Educational Transparency
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This app demonstrates subscription gating concepts. In a real
              application, features would be restricted based on subscription
              level. Here, all features are visible to show how the system
              works.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
