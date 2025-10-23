/**
 * Shared types for pricing functionality
 * Can be used on both client and server side
 */

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
}

export interface StripePrice {
  id: string;
  product: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  metadata: Record<string, string>;
}

export interface PlanData {
  product: StripeProduct;
  price: StripePrice;
  tier: "free" | "baby" | "premium" | "pro";
  features: string[];
  popular: boolean;
}

/**
 * Format price for display
 */
export function formatPrice(price: StripePrice): string {
  if (!price.unit_amount) return "Free";

  const amount = price.unit_amount / 100; // Convert from cents
  const currency = price.currency.toUpperCase();

  if (price.recurring) {
    const interval = price.recurring.interval;
    const intervalCount = price.recurring.interval_count;

    let intervalText = interval;
    if (intervalCount > 1) {
      intervalText = `${intervalCount} ${interval}s`;
    }

    return `${currency} ${amount.toFixed(2)}/${intervalText}`;
  }

  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * Strip product line prefixes from product names
 * Removes patterns like [T1], [ProductLine], etc.
 */
export function stripProductPrefix(name: string): string {
  // Remove common prefix patterns:
  // [T1] Product Name -> Product Name
  // [ProductLine] Product Name -> Product Name
  // [Store] Product Name -> Product Name
  // [Category] Product Name -> Product Name

  return name.replace(/^\[[^\]]+\]\s*/, "").trim();
}

/**
 * Get product line prefix (if any)
 * Extracts [T1], [ProductLine], etc. from product names
 */
export function getProductPrefix(name: string): string | null {
  const match = name.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}
