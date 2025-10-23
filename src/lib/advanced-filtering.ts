/**
 * Enhanced filtering options for products and prices
 */

export interface FilterOptions {
  appId: string;
  storeId?: string;
  region?: string;
  segment?: string;
  experiment?: string;
  campaign?: string;
  tier?: string;
}

/**
 * Advanced filtering function
 */
export function filterProductsAndPrices(
  products: StripeProduct[],
  prices: StripePrice[],
  filters: FilterOptions
): { products: StripeProduct[]; prices: StripePrice[] } {
  // Filter products by app metadata
  let filteredProducts = products.filter(
    (product) => product.metadata?.app === filters.appId
  );

  // Apply additional product filters
  if (filters.storeId) {
    filteredProducts = filteredProducts.filter(
      (product) => product.metadata?.store === filters.storeId
    );
  }

  if (filters.tier) {
    filteredProducts = filteredProducts.filter(
      (product) => product.metadata?.tier === filters.tier
    );
  }

  // Filter prices with multiple criteria
  let filteredPrices = prices.filter((price) => {
    // Must be associated with filtered products
    const isAssociated = filteredProducts.some(
      (product) => product.id === price.product
    );

    if (!isAssociated) return false;

    // Apply price-level filters
    if (filters.region && price.metadata?.region !== filters.region) {
      return false;
    }

    if (filters.segment && price.metadata?.segment !== filters.segment) {
      return false;
    }

    if (
      filters.experiment &&
      price.metadata?.experiment !== filters.experiment
    ) {
      return false;
    }

    if (filters.campaign && price.metadata?.campaign !== filters.campaign) {
      return false;
    }

    return true;
  });

  return { products: filteredProducts, prices: filteredPrices };
}

/**
 * Get pricing for specific region
 */
export async function getRegionalPricing(
  appId: string,
  region: string
): Promise<PlanData[]> {
  const { products, prices } = await getStripeProductsAndPrices();

  const { products: filteredProducts, prices: filteredPrices } =
    filterProductsAndPrices(products, prices, {
      appId,
      region,
    });

  return mapStripeDataToPlans(filteredProducts, filteredPrices, appId);
}

/**
 * Get pricing for specific customer segment
 */
export async function getSegmentPricing(
  appId: string,
  segment: string
): Promise<PlanData[]> {
  const { products, prices } = await getStripeProductsAndPrices();

  const { products: filteredProducts, prices: filteredPrices } =
    filterProductsAndPrices(products, prices, {
      appId,
      segment,
    });

  return mapStripeDataToPlans(filteredProducts, filteredPrices, appId);
}
