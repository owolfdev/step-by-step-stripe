/**
 * Multi-store pricing utilities
 * Supports multiple stores/apps with different products and pricing
 */

import { stripe } from "./stripe";
import { logger, createLogContext } from "./logging";
import {
  StripeProduct,
  StripePrice,
  PlanData,
  formatPrice,
  stripProductPrefix,
} from "@/types/pricing";

export interface StoreConfig {
  storeId: string;
  storeName: string;
  appId: string;
  appName: string;
  currency: string;
  metadata: Record<string, string>;
}

// Example store configurations
export const STORE_CONFIGS: Record<string, StoreConfig> = {
  "coffee-shop": {
    storeId: "coffee-shop",
    storeName: "Premium Coffee Co.",
    appId: "coffee-app",
    appName: "Coffee App",
    currency: "usd",
    metadata: {
      category: "food-beverage",
      region: "north-america",
    },
  },
  "clothing-store": {
    storeId: "clothing-store",
    storeName: "Fashion Forward",
    appId: "fashion-app",
    appName: "Fashion App",
    currency: "usd",
    metadata: {
      category: "apparel",
      region: "north-america",
    },
  },
  "software-saas": {
    storeId: "software-saas",
    storeName: "Tech Solutions Inc.",
    appId: "software-app",
    appName: "Software App",
    currency: "usd",
    metadata: {
      category: "software",
      region: "global",
    },
  },
};

/**
 * Get products and prices for a specific store
 */
export async function getStoreProductsAndPrices(storeId: string): Promise<{
  products: StripeProduct[];
  prices: StripePrice[];
  storeConfig: StoreConfig;
}> {
  const storeConfig = STORE_CONFIGS[storeId];
  if (!storeConfig) {
    throw new Error(`Store configuration not found for: ${storeId}`);
  }

  try {
    logger.info("Fetching products and prices for store", {
      operation: "store_pricing_fetch",
      storeId,
      storeName: storeConfig.storeName,
    });

    // Fetch products filtered by store metadata
    const productsResponse = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Filter products by store metadata
    const storeProducts = productsResponse.data.filter(
      (product) => product.metadata?.store === storeId
    );

    // Fetch prices filtered by store metadata
    const pricesResponse = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    // Filter prices by store metadata
    const storePrices = pricesResponse.data.filter(
      (price) => price.metadata?.store === storeId
    );

    const products = storeProducts.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
    }));

    const prices = storePrices.map((price) => ({
      id: price.id,
      product:
        typeof price.product === "string" ? price.product : price.product.id,
      active: price.active,
      currency: price.currency,
      unit_amount: price.unit_amount,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            interval_count: price.recurring.interval_count,
          }
        : null,
      metadata: price.metadata,
    }));

    logger.info("Successfully fetched store products and prices", {
      operation: "store_pricing_success",
      storeId,
      productCount: products.length,
      priceCount: prices.length,
    });

    return { products, prices, storeConfig };
  } catch (error) {
    logger.error(
      "Failed to fetch store products and prices",
      {
        operation: "store_pricing_error",
        storeId,
      },
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Map Stripe data to store-specific plan structure
 */
export function mapStoreDataToPlans(
  products: StripeProduct[],
  prices: StripePrice[],
  storeConfig: StoreConfig
): PlanData[] {
  const plans: PlanData[] = [];

  // Define plan tiers based on store type
  const tierMapping = getTierMappingForStore(storeConfig.storeId);
  const tierFeatures = getTierFeaturesForStore(storeConfig.storeId);

  // Process each price for this store
  for (const price of prices) {
    const product = products.find((p) => p.id === price.product);
    if (!product) continue;

    // Determine tier from metadata or price amount
    const tier = determineTierFromPrice(price, tierMapping);

    plans.push({
      product,
      price,
      tier,
      features: tierFeatures[tier] || [],
      popular: tier === "premium", // Premium is typically most popular
    });
  }

  // Sort by tier priority
  const tierPriority = { free: 0, baby: 1, premium: 2, pro: 3 };
  plans.sort((a, b) => tierPriority[a.tier] - tierPriority[b.tier]);

  return plans;
}

/**
 * Get tier mapping based on store type
 */
function getTierMappingForStore(storeId: string): Record<string, string> {
  switch (storeId) {
    case "coffee-shop":
      return {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!]: "baby",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!]: "premium",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!]: "pro",
      };
    case "clothing-store":
      return {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!]: "baby",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!]: "premium",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!]: "pro",
      };
    case "software-saas":
      return {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!]: "baby",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!]: "premium",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!]: "pro",
      };
    default:
      return {};
  }
}

/**
 * Get tier features based on store type
 */
function getTierFeaturesForStore(storeId: string): Record<string, string[]> {
  switch (storeId) {
    case "coffee-shop":
      return {
        baby: ["Basic coffee", "Email support", "Standard delivery"],
        premium: [
          "All Baby features",
          "Priority support",
          "Express delivery",
          "Loyalty rewards",
        ],
        pro: [
          "All Premium features",
          "24/7 support",
          "Same-day delivery",
          "Custom blends",
          "Bulk discounts",
        ],
      };
    case "clothing-store":
      return {
        baby: ["Basic clothing", "Email support", "Standard shipping"],
        premium: [
          "All Baby features",
          "Priority support",
          "Free shipping",
          "Size guides",
        ],
        pro: [
          "All Premium features",
          "24/7 support",
          "Express shipping",
          "Personal styling",
          "VIP access",
        ],
      };
    case "software-saas":
      return {
        baby: ["Basic features", "Email support", "Standard usage"],
        premium: [
          "All Baby features",
          "Priority support",
          "Advanced analytics",
          "API access",
        ],
        pro: [
          "All Premium features",
          "24/7 phone support",
          "Custom integrations",
          "White-label options",
        ],
      };
    default:
      return {};
  }
}

/**
 * Determine tier from price metadata or amount
 */
function determineTierFromPrice(
  price: StripePrice,
  tierMapping: Record<string, string>
): "free" | "baby" | "premium" | "pro" {
  // First check metadata
  if (price.metadata?.tier) {
    return price.metadata.tier as "free" | "baby" | "premium" | "pro";
  }

  // Then check price ID mapping
  if (tierMapping[price.id]) {
    return tierMapping[price.id] as "free" | "baby" | "premium" | "pro";
  }

  // Finally, determine by price amount
  if (!price.unit_amount) return "free";

  const amount = price.unit_amount / 100;
  if (amount < 10) return "baby";
  if (amount < 50) return "premium";
  return "pro";
}

/**
 * Get all plan data for a specific store
 */
export async function getStorePlanData(storeId: string): Promise<PlanData[]> {
  try {
    const { products, prices, storeConfig } = await getStoreProductsAndPrices(
      storeId
    );
    return mapStoreDataToPlans(products, prices, storeConfig);
  } catch (error) {
    logger.error(
      "Failed to get store plan data",
      {
        operation: "store_plan_data_error",
        storeId,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Return fallback data for this store
    return getFallbackStorePlanData(storeId);
  }
}

/**
 * Fallback plan data for specific store
 */
function getFallbackStorePlanData(storeId: string): PlanData[] {
  const storeConfig = STORE_CONFIGS[storeId];
  if (!storeConfig) return [];

  logger.warn("Using fallback plan data for store", {
    operation: "fallback_store_plan_data",
    storeId,
  });

  // Return store-specific fallback data
  switch (storeId) {
    case "coffee-shop":
      return [
        {
          product: {
            id: "fallback-coffee-basic",
            name: "Basic Coffee Plan",
            description: "Essential coffee features",
            active: true,
            metadata: { store: storeId },
          },
          price: {
            id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!,
            product: "fallback-coffee-basic",
            active: true,
            currency: storeConfig.currency,
            unit_amount: 500, // $5.00
            recurring: { interval: "month", interval_count: 1 },
            metadata: { store: storeId },
          },
          tier: "baby",
          features: ["Basic coffee", "Email support", "Standard delivery"],
          popular: false,
        },
        // Add more fallback plans...
      ];
    default:
      return [];
  }
}

/**
 * Get all available stores
 */
export function getAvailableStores(): StoreConfig[] {
  return Object.values(STORE_CONFIGS);
}
