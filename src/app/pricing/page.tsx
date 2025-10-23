// src/app/pricing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PlanData, formatPrice, stripProductPrefix } from "@/types/pricing";
import StoreSelector from "@/components/store-selector";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [currentStore, setCurrentStore] = useState<string>("default");
  const [availableStores, setAvailableStores] = useState<
    Array<{
      storeId: string;
      storeName: string;
      appName: string;
    }>
  >([]);

  // Fetch live pricing data
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const url =
          currentStore === "default"
            ? "/api/pricing"
            : `/api/pricing?store=${currentStore}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch pricing data");
        }
        const data = await response.json();
        setPlans(data.plans);

        // Set available stores if provided
        if (data.availableStores) {
          setAvailableStores(data.availableStores);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        setPlansError("Failed to load pricing information");
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, [currentStore]);

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

  // Loading state
  if (plansLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Loading pricing information...
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-pulse"
            >
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
              <div className="space-y-3 mb-8">
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                  ></div>
                ))}
              </div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (plansError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-600 dark:text-red-400 mb-4">{plansError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Store Selector */}
      {availableStores.length > 0 && (
        <StoreSelector
          currentStore={currentStore}
          onStoreChange={setCurrentStore}
          availableStores={availableStores}
        />
      )}

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan, index) => (
          <div
            key={plan.price.id}
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
                {stripProductPrefix(plan.product.name)}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {plan.product.description}
              </p>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatPrice(plan.price)}
              </div>
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
              onClick={() => startCheckout(plan.price.id)}
              disabled={loading === plan.price.id}
            >
              {loading === plan.price.id ? "Redirecting…" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
