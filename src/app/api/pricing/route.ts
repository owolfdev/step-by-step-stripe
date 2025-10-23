/**
 * API route to fetch live pricing data from Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import { getLivePlanData } from "@/lib/stripe-pricing";
import { handleApiError } from "@/lib/error-handling";
import { logger } from "@/lib/logging";
import { config } from "@/lib/config";

// Export types for client-side use
export type { PlanData } from "@/lib/stripe-pricing";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store") || "default";
    const appId = searchParams.get("app") || config.app.id;

    logger.info("Fetching live pricing data", {
      operation: "pricing_api_request",
      storeId,
      appId,
    });

    // Use multi-store pricing if store parameter is provided
    if (storeId !== "default") {
      const { getStorePlanData } = await import("@/lib/multi-store-pricing");
      const plans = await getStorePlanData(storeId);

      logger.info("Successfully fetched store-specific pricing data", {
        operation: "store_pricing_api_success",
        storeId,
        planCount: plans.length,
      });

      return NextResponse.json({ storeId, appId, plans });
    }

    // Default behavior with app metadata filtering
    const { getLivePlanData } = await import("@/lib/stripe-pricing");
    const plans = await getLivePlanData(appId);

    logger.info("Successfully fetched live pricing data", {
      operation: "pricing_api_success",
      appId,
      planCount: plans.length,
    });

    return NextResponse.json({ appId, plans });
  } catch (error) {
    return handleApiError(error, {
      operation: "pricing_api_error",
      endpoint: "/api/pricing",
    });
  }
}
