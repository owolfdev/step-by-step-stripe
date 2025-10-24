import { NextResponse } from "next/server";
import { logger } from "@/lib/logging";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Check environment variables (without exposing secrets)
    const envCheck = {
      // Public variables (safe to expose)
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_APP_ID: !!process.env.NEXT_PUBLIC_APP_ID,
      NEXT_PUBLIC_APP_NAME: !!process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_STORE: !!process.env.NEXT_PUBLIC_APP_STORE,
      NEXT_PUBLIC_STRIPE_PRICE_ID_BABY:
        !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY,
      NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM:
        !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM,
      NEXT_PUBLIC_STRIPE_PRICE_ID_PRO:
        !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,

      // Server variables (check existence only)
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

      // App config values
      appId: process.env.NEXT_PUBLIC_APP_ID || "stripe-step-by-step",
      appName: process.env.NEXT_PUBLIC_APP_NAME || "Stripe Step by Step",
      appStore: process.env.NEXT_PUBLIC_APP_STORE || "default",
    };

    // Check for missing required variables
    const missing = Object.entries(envCheck)
      .filter(([key, exists]) => !exists && key.startsWith("NEXT_PUBLIC_"))
      .map(([key]) => key);

    logger.info("Environment check completed", {
      operation: "env_debug",
      missingVariables: missing,
      totalChecked: Object.keys(envCheck).length,
    });

    return NextResponse.json({
      status: "success",
      environment: envCheck,
      missing: missing,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Environment debug failed",
      {
        operation: "env_debug_error",
      },
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
