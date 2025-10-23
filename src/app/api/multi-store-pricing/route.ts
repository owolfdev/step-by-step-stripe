/**
 * Multi-store pricing API route
 * Supports different stores/apps with different products and pricing
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getStorePlanData,
  getAvailableStores,
} from "@/lib/multi-store-pricing";
import { handleApiError } from "@/lib/error-handling";
import { logger } from "@/lib/logging";

export const runtime = "nodejs";

// GET /api/pricing?store=coffee-shop
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store") || "default";

    logger.info("Fetching pricing data for store", {
      operation: "multi_store_pricing_api_request",
      storeId,
    });

    // Get available stores for reference
    const availableStores = getAvailableStores();

    // Get plan data for specific store
    const plans = await getStorePlanData(storeId);

    logger.info("Successfully fetched store pricing data", {
      operation: "multi_store_pricing_api_success",
      storeId,
      planCount: plans.length,
    });

    return NextResponse.json({
      storeId,
      plans,
      availableStores: availableStores.map((store) => ({
        storeId: store.storeId,
        storeName: store.storeName,
        appName: store.appName,
      })),
    });
  } catch (error) {
    return handleApiError(error, {
      operation: "multi_store_pricing_api_error",
      endpoint: "/api/pricing",
    });
  }
}
