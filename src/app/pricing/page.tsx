// src/app/pricing/page.tsx
"use client";

import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      name: "Baby",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY!,
      desc: "Entry plan",
    },
    {
      name: "Premium",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!,
      desc: "Standard plan",
    },
    {
      name: "Pro",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
      desc: "All features",
    },
  ];

  const startCheckout = async (priceId: string) => {
    setLoading(priceId);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, mode: "subscription" }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(null);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Pricing</h1>
      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.priceId}
            className="border rounded-lg p-4 flex flex-col items-center"
          >
            <h2 className="font-medium text-lg">{plan.name}</h2>
            <p className="text-sm opacity-70">{plan.desc}</p>
            <button
              className="mt-4 rounded border px-4 py-2"
              onClick={() => startCheckout(plan.priceId)}
              disabled={loading === plan.priceId}
            >
              {loading === plan.priceId ? "Redirecting…" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
