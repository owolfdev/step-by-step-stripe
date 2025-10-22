/**
 * Subscription utilities for feature gating and plan management
 * Educational approach - shows all features but indicates subscription level
 */

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "trialing"
  | null;

export type PlanTier = "free" | "baby" | "premium" | "pro";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  planTier: PlanTier;
  priceId: string | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
}

export interface PlanFeatures {
  name: string;
  tier: PlanTier;
  description: string;
  features: string[];
  color: string;
  icon: string;
}

/**
 * Determine plan tier based on subscription price ID
 */
export function getPlanTier(priceId: string | null): PlanTier {
  if (!priceId) return "free";

  // Map Stripe price IDs to plan tiers
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY) return "baby";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM)
    return "premium";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO) return "pro";

  return "free";
}

/**
 * Get plan tier priority for comparison (higher number = higher tier)
 */
export function getPlanTierPriority(tier: PlanTier): number {
  switch (tier) {
    case "free":
      return 0;
    case "baby":
      return 1;
    case "premium":
      return 2;
    case "pro":
      return 3;
    default:
      return 0;
  }
}

/**
 * Get the highest tier from multiple price IDs
 */
export function getHighestPlanTier(priceIds: string[]): PlanTier {
  if (priceIds.length === 0) return "free";

  const tiers = priceIds.map(getPlanTier);
  const highestTier = tiers.reduce((highest, current) => {
    return getPlanTierPriority(current) > getPlanTierPriority(highest)
      ? current
      : highest;
  });

  return highestTier;
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Get subscription info from profile data
 */
export function getSubscriptionInfo(profile: {
  subscription_status: SubscriptionStatus;
  subscription_price_id: string | null;
  subscription_current_period_end: string | null;
}): SubscriptionInfo {
  const planTier = getPlanTier(profile.subscription_price_id);
  const isActive = isSubscriptionActive(profile.subscription_status);

  return {
    status: profile.subscription_status,
    planTier,
    priceId: profile.subscription_price_id,
    currentPeriodEnd: profile.subscription_current_period_end,
    isActive,
  };
}

/**
 * Get plan features configuration
 */
export function getPlanFeatures(): PlanFeatures[] {
  return [
    {
      name: "Free",
      tier: "free",
      description: "Get started with basic features",
      features: [
        "Account dashboard",
        "Basic analytics",
        "Email support",
        "Standard features",
      ],
      color: "gray",
      icon: "👤",
    },
    {
      name: "Baby",
      tier: "baby",
      description: "Entry level with essential features",
      features: [
        "All Free features",
        "Enhanced analytics",
        "Priority email support",
        "Basic integrations",
      ],
      color: "blue",
      icon: "🌱",
    },
    {
      name: "Premium",
      tier: "premium",
      description: "Most popular with advanced features",
      features: [
        "All Baby features",
        "Advanced analytics",
        "API access",
        "Priority support",
        "Custom dashboards",
      ],
      color: "indigo",
      icon: "⭐",
    },
    {
      name: "Pro",
      tier: "pro",
      description: "Full access to all features",
      features: [
        "All Premium features",
        "24/7 phone support",
        "Custom integrations",
        "White-label options",
        "Dedicated account manager",
      ],
      color: "purple",
      icon: "🚀",
    },
  ];
}

/**
 * Get features for a specific plan tier
 */
export function getFeaturesForTier(tier: PlanTier): string[] {
  const allPlans = getPlanFeatures();
  const plan = allPlans.find((p) => p.tier === tier);
  return plan?.features || [];
}

/**
 * Get plan info by tier
 */
export function getPlanByTier(tier: PlanTier): PlanFeatures | null {
  const allPlans = getPlanFeatures();
  return allPlans.find((p) => p.tier === tier) || null;
}

/**
 * Check if user has access to a specific feature
 * For educational purposes, we'll show all features but indicate the required tier
 */
export function hasFeatureAccess(tier: PlanTier, feature: string): boolean {
  const features = getFeaturesForTier(tier);
  return features.includes(feature);
}

/**
 * Get upgrade suggestions for current tier
 */
export function getUpgradeSuggestions(currentTier: PlanTier): PlanFeatures[] {
  const allPlans = getPlanFeatures();
  const currentIndex = allPlans.findIndex((p) => p.tier === currentTier);

  if (currentIndex === -1 || currentIndex === allPlans.length - 1) {
    return []; // No upgrades available
  }

  return allPlans.slice(currentIndex + 1);
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: SubscriptionStatus): {
  text: string;
  color: string;
  variant: "success" | "warning" | "error" | "info";
} {
  switch (status) {
    case "active":
      return { text: "Active", color: "green", variant: "success" };
    case "trialing":
      return { text: "Trial", color: "blue", variant: "info" };
    case "past_due":
      return { text: "Past Due", color: "yellow", variant: "warning" };
    case "canceled":
      return { text: "Canceled", color: "red", variant: "error" };
    case "incomplete":
      return { text: "Incomplete", color: "orange", variant: "warning" };
    default:
      return { text: "No Subscription", color: "gray", variant: "info" };
  }
}

/**
 * Get educational message about subscription benefits
 */
export function getEducationalMessage(tier: PlanTier): string {
  switch (tier) {
    case "free":
      return "You're currently on the free plan. Upgrade to unlock additional features and support our development!";
    case "baby":
      return "Great! You're on the Baby plan. This gives you access to enhanced features and priority support.";
    case "premium":
      return "Excellent! You're on our most popular Premium plan with advanced features and API access.";
    case "pro":
      return "Amazing! You're on our Pro plan with full access to all features and premium support.";
    default:
      return "Welcome! Choose a plan to get started with our features.";
  }
}
