// lib/config.ts
export const config = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  app: {
    id: process.env.NEXT_PUBLIC_APP_ID ?? "stripe-step-by-step",
    name: process.env.NEXT_PUBLIC_APP_NAME ?? "Stripe Step by Step",
    store: process.env.NEXT_PUBLIC_APP_STORE ?? "default",
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // may be undefined in dev before CLI
    priceIds: {
      baby: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!,
      premium: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!,
      pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
    },
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
} as const;
