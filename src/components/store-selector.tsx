/**
 * Store selector component for multi-store pricing
 */

"use client";

import { useState } from "react";

interface StoreSelectorProps {
  currentStore: string;
  onStoreChange: (storeId: string) => void;
  availableStores: Array<{
    storeId: string;
    storeName: string;
    appName: string;
  }>;
}

export default function StoreSelector({
  currentStore,
  onStoreChange,
  availableStores,
}: StoreSelectorProps) {
  return (
    <div className="mb-8">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Store/App
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {availableStores.map((store) => (
            <button
              key={store.storeId}
              onClick={() => onStoreChange(store.storeId)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStore === store.storeId
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {store.storeName}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Each store has different products and pricing
        </p>
      </div>
    </div>
  );
}
