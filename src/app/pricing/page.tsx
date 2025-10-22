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
      features: ["Basic features", "Email support", "Standard usage"],
      popular: false,
    },
    {
      name: "Premium",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM!,
      desc: "Standard plan",
      features: [
        "All Baby features",
        "Priority support",
        "Advanced analytics",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Pro",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
      desc: "All features",
      features: [
        "All Premium features",
        "24/7 phone support",
        "Custom integrations",
        "White-label options",
      ],
      popular: false,
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
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Select the perfect plan for your needs. All plans include our core
          features.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan, index) => (
          <div
            key={plan.priceId}
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col ${
              plan.popular
                ? "ring-2 ring-indigo-600 dark:ring-indigo-400 transform scale-105"
                : "border border-gray-200 dark:border-gray-700"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plan.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {plan.desc}
              </p>
            </div>

            <div className="flex-1 mb-8">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <svg
                      className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                plan.popular
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
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
