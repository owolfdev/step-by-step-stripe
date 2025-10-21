import "./globals.css";
import type { ReactNode } from "react";
import AuthButton from "@/components/auth-button";
import Link from "next/link";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="w-full border-b">
          <div className="mx-auto max-w-3xl py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">Stripe x Supabase</Link>
              <Link
                href="/dashboard"
                className="text-sm opacity-80 hover:opacity-100"
              >
                Dashboard
              </Link>
            </div>
            <AuthButton />
          </div>
        </header>
        <main className="mx-auto max-w-3xl p-4">{children}</main>
      </body>
    </html>
  );
}
