import "./globals.css";
import type { ReactNode } from "react";
import AuthButton from "@/components/auth-button";
import Link from "next/link";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="w-full border-b">
          <div className="mx-auto  py-3 px-4 flex items-center justify-between px-8">
            <div className="flex items-center gap-6">
              <Link href="/">Stripe x Supabase</Link>
              <nav className="flex gap-4 text-sm">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/pricing">Pricing</Link>
                <Link href="/billing">Billing</Link>
              </nav>
            </div>
            <AuthButton />
          </div>
        </header>
        <main className="mx-auto max-w-3xl p-4">{children}</main>
      </body>
    </html>
  );
}
