// lib/config.ts
export const config = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
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
