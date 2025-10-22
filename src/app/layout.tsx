import "./globals.css";
import type { ReactNode } from "react";
import AuthButton from "@/components/auth-button";
import Link from "next/link";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <header className="w-full border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="container mx-auto py-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                StripePay
              </Link>
              <nav className="flex gap-6">
                <Link
                  href="/dashboard"
                  className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Pricing
                </Link>
                <Link
                  href="/billing"
                  className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  Billing
                </Link>
              </nav>
            </div>
            <AuthButton />
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
