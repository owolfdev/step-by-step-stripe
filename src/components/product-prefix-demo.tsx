/**
 * Product prefix demo component
 * Shows how prefixes work in Stripe vs. App display
 */

"use client";

import { stripProductPrefix, getProductPrefix } from "@/types/pricing";

interface ProductDemoProps {
  stripeName: string;
  description: string;
  price: string;
}

export default function ProductDemo({
  stripeName,
  description,
  price,
}: ProductDemoProps) {
  const displayName = stripProductPrefix(stripeName);
  const prefix = getProductPrefix(stripeName);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stripe Dashboard View */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Stripe Dashboard
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Product Name (with prefix):
            </div>
            <div className="font-medium text-gray-900 dark:text-white mb-2">
              {stripeName}
            </div>
            {prefix && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                Prefix: [{prefix}]
              </div>
            )}
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {description}
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {price}
            </div>
          </div>
        </div>

        {/* App Display View */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            App Display
          </h3>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Product Name (prefix removed):
            </div>
            <div className="font-medium text-gray-900 dark:text-white mb-2">
              {displayName}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {description}
            </div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {price}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
