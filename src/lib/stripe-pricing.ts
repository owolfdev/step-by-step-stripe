/**
 * Live Stripe pricing utilities
 * Fetches real-time pricing data from Stripe API
 */

import { stripe } from "./stripe";
import { logger, createLogContext } from "./logging";
import {
  StripeProduct,
  StripePrice,
  PlanData,
  formatPrice,
} from "@/types/pricing";
import { config } from "./config";

// Re-export types for convenience
export type { StripeProduct, StripePrice, PlanData } from "@/types/pricing";

/**
 * Fetch all active products and prices from Stripe
 */
export async function getStripeProductsAndPrices(): Promise<{
  products: StripeProduct[];
  prices: StripePrice[];
}> {
  try {
    logger.info("Fetching products and prices from Stripe", {
      operation: "stripe_pricing_fetch",
    });

    // Fetch products
    const productsResponse = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Fetch prices
    const pricesResponse = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    const products = productsResponse.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
    }));

    const prices = pricesResponse.data.map((price) => ({
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

    logger.info("Successfully fetched products and prices", {
      operation: "stripe_pricing_success",
      productCount: products.length,
      priceCount: prices.length,
    });

    return { products, prices };
  } catch (error) {
    logger.error(
      "Failed to fetch products and prices from Stripe",
      {
        operation: "stripe_pricing_error",
      },
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Map Stripe data to our plan structure
 */
export function mapStripeDataToPlans(
  products: StripeProduct[],
  prices: StripePrice[],
  appId: string = config.app.id
): PlanData[] {
  const plans: PlanData[] = [];

  // Filter products by app metadata
  const appProducts = products.filter(
    (product) => product.metadata?.app === appId
  );

  // Filter prices by app metadata OR by being associated with app products
  const appPrices = prices.filter(
    (price) =>
      price.metadata?.app === appId ||
      appProducts.some((product) => product.id === price.product)
  );

  logger.info("Filtered products and prices by app metadata", {
    operation: "app_metadata_filtering",
    appId,
    totalProducts: products.length,
    filteredProducts: appProducts.length,
    totalPrices: prices.length,
    filteredPrices: appPrices.length,
  });

  // Define features for each tier
  const tierFeatures = {
    baby: [
      "Basic features",
      "Email support",
      "Standard usage",
      "Basic analytics",
    ],
    premium: [
      "All Baby features",
      "Priority support",
      "Advanced analytics",
      "API access",
      "Custom dashboards",
    ],
    pro: [
      "All Premium features",
      "24/7 phone support",
      "Custom integrations",
      "White-label options",
      "Dedicated account manager",
    ],
  };

  // Process each app-specific price
  for (const price of appPrices) {
    const product = appProducts.find((p) => p.id === price.product);
    if (!product) {
      logger.warn(`Product not found for app price ${price.id}`, {
        operation: "app_plan_mapping",
        priceId: price.id,
        productId: price.product,
        appId,
      });
      continue;
    }

    // Determine tier from metadata or fallback to price ID mapping
    let tier: "baby" | "premium" | "pro" = "baby";

    if (price.metadata?.tier) {
      tier = price.metadata.tier as "baby" | "premium" | "pro";
    } else {
      // Fallback to price ID mapping for backward compatibility
      const tierMapping = {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!]: "baby",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!]: "premium",
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!]: "pro",
      } as const;

      tier = tierMapping[price.id] || "baby";
    }

    plans.push({
      product,
      price,
      tier,
      features: tierFeatures[tier] || [],
      popular: tier === "premium", // Premium is marked as popular
    });
  }

  // Sort by tier priority
  const tierPriority: Record<string, number> = {
    free: 0,
    baby: 1,
    premium: 2,
    pro: 3,
  };
  plans.sort(
    (a, b) => (tierPriority[a.tier] || 0) - (tierPriority[b.tier] || 0)
  );

  logger.info("Successfully mapped app-specific plans", {
    operation: "app_plan_mapping_success",
    appId,
    planCount: plans.length,
  });

  return plans;
}

/**
 * Get all plan data with live Stripe pricing
 */
export async function getLivePlanData(
  appId: string = config.app.id
): Promise<PlanData[]> {
  try {
    const { products, prices } = await getStripeProductsAndPrices();
    return mapStripeDataToPlans(products, prices, appId);
  } catch (error) {
    logger.error(
      "Failed to get live plan data",
      {
        operation: "live_plan_data_error",
        appId,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    // Return fallback data if Stripe is unavailable
    return getFallbackPlanData();
  }
}

/**
 * Fallback plan data when Stripe is unavailable
 */
function getFallbackPlanData(): PlanData[] {
  logger.warn("Using fallback plan data", {
    operation: "fallback_plan_data",
  });

  return [
    {
      product: {
        id: "fallback-baby",
        name: "Baby Plan",
        description: "Entry level with essential features",
        active: true,
        metadata: {},
      },
      price: {
        id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!,
        product: "fallback-baby",
        active: true,
        currency: "usd",
        unit_amount: 100, // $1.00
        recurring: {
          interval: "month",
          interval_count: 1,
        },
        metadata: {},
      },
      tier: "baby",
      features: ["Basic features", "Email support", "Standard usage"],
      popular: false,
    },
    {
      product: {
        id: "fallback-premium",
        name: "Premium Plan",
        description: "Most popular with advanced features",
        active: true,
        metadata: {},
      },
      price: {
        id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!,
        product: "fallback-premium",
        active: true,
        currency: "usd",
        unit_amount: 999, // $9.99
        recurring: {
          interval: "month",
          interval_count: 1,
        },
        metadata: {},
      },
      tier: "premium",
      features: [
        "All Baby features",
        "Priority support",
        "Advanced analytics",
        "API access",
      ],
      popular: true,
    },
    {
      product: {
        id: "fallback-pro",
        name: "Pro Plan",
        description: "Full access to all features",
        active: true,
        metadata: {},
      },
      price: {
        id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
        product: "fallback-pro",
        active: true,
        currency: "usd",
        unit_amount: 2999, // $29.99
        recurring: {
          interval: "month",
          interval_count: 1,
        },
        metadata: {},
      },
      tier: "pro",
      features: [
        "All Premium features",
        "24/7 phone support",
        "Custom integrations",
        "White-label options",
      ],
      popular: false,
    },
  ];
}
