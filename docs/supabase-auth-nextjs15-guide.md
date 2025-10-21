# Supabase Authentication with Next.js 15 App Router

Setting up authentication in modern web applications can be complex, but with Supabase and Next.js 15's App Router, it becomes surprisingly straightforward. This guide will walk you through setting up a complete authentication system with login, signup, logout, and protected routes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Dashboard Setup](#supabase-dashboard-setup)
3. [Next.js Project Setup](#nextjs-project-setup)
4. [Environment Configuration](#environment-configuration)
5. [Supabase Client Configuration](#supabase-client-configuration)
6. [Authentication Components](#authentication-components)
7. [Server Actions](#server-actions)
8. [Middleware Setup](#middleware-setup)
9. [Protected Routes](#protected-routes)
10. [Testing the Implementation](#testing-the-implementation)

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available)
- Basic knowledge of React and Next.js

## Supabase Dashboard Setup

### Step 1: Create a New Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `your-app-name`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### Step 2: Configure Authentication Settings

1. Navigate to **Authentication** → **Settings**
2. Configure the following:

   **Site URL:**

   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

   **Redirect URLs:**
   Add these URLs (one per line):

   ```
   http://localhost:3000/auth/confirm
   http://localhost:3000/auth/error
   http://localhost:3000/dashboard
   http://localhost:3000/
   ```

3. **Important for Development**:
   - Go to **Authentication** → **Providers**
   - Ensure **Email** provider is enabled
   - **Disable "Enable email confirmations"** for immediate login during development

### Step 3: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them for environment variables):
   - **Project URL** (starts with `https://`)
   - **Anon public key** (starts with `eyJ`)
   - **Service role key** (starts with `eyJ` - keep this secret!)

## Next.js Project Setup

### Step 1: Create Next.js Project

```bash
npx create-next-app@latest my-auth-app
cd my-auth-app
```

### Step 2: Install Supabase Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Environment Configuration

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important**: Replace the placeholder values with your actual Supabase credentials.

## Supabase Client Configuration

### Client-Side Client (`lib/supabase/client.ts`)

```typescript
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anonKey);
}
```

### Server-Side Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClientWithCookies() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Next 15 returns an Iterable; convert to array of { name, value }
          return cookieStore
            .getAll()
            .map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // options is CookieOptions from @supabase/ssr
            cookieStore.set(name, value, options as CookieOptions);
          });
        },
      },
    }
  );

  return supabase;
}
```

### Admin Client (`lib/supabase/admin.ts`)

```typescript
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "my-app" } },
  }
);
```

## Authentication Components

### Auth Button Component (`components/auth-button.tsx`)

```typescript
import { createServerClientWithCookies } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

export default async function AuthButton() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm opacity-80">Signed in as {user.email}</span>
        <LogoutButton />
      </div>
    );
  }

  return (
    <a className="rounded px-3 py-1 border" href="/login">
      Log in / Sign up
    </a>
  );
}
```

### Logout Button Component (`components/logout-button.tsx`)

```typescript
import { logout } from "@/lib/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button className="rounded px-3 py-1 border" type="submit">
        Log out
      </button>
    </form>
  );
}
```

### Login/Signup Page (`app/login/page.tsx`)

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    // If email confirmations are ON, user must confirm by email before login.
    router.push("/"); // or show a "check your email" page
  };

  const logIn = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">Log in / Sign up</h1>
      <div className="space-y-2">
        <label className="block text-sm">Email</label>
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Password</label>
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          className="rounded px-4 py-2 border"
          onClick={logIn}
          disabled={busy}
        >
          Log in
        </button>
        <button
          className="rounded px-4 py-2 border"
          onClick={signUp}
          disabled={busy}
        >
          Sign up
        </button>
      </div>
      <p className="text-xs opacity-70">
        Tip: For local dev, you can temporarily disable "Email confirmations" in
        Supabase Auth → Providers.
      </p>
    </div>
  );
}
```

## Server Actions

### Auth Actions (`lib/actions/auth.ts`)

```typescript
"use server";

import { createServerClientWithCookies } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createServerClientWithCookies();

  await supabase.auth.signOut();

  redirect("/");
}
```

## Middleware Setup

### Middleware (`middleware.ts`)

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // This creates a temporary supabase client to refresh cookies if needed
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies
            .getAll()
            .map(({ name, value }) => ({ name, value }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // This call refreshes the session if it's close to expiring
  await supabase.auth.getUser();

  return res;
}

// Only run on app pages (avoid static files)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
```

## Protected Routes

### Dashboard Page (`app/dashboard/page.tsx`)

```typescript
import { createServerClientWithCookies } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p>
          You're not signed in.{" "}
          <a className="underline" href="/login">
            Log in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm opacity-80">Signed in as: {user.email}</p>
      <p className="text-sm">Welcome to your protected dashboard!</p>
    </div>
  );
}
```

### Root Layout with Auth Button (`app/layout.tsx`)

```typescript
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
              <Link href="/">My App</Link>
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
```

## Testing the Implementation

### Step 1: Start the Development Server

```bash
npm run dev
```

### Step 2: Test the Authentication Flow

1. **Visit** `http://localhost:3000`
2. **Click** "Log in / Sign up" in the header
3. **Sign up** with a new email and password
4. **Verify** you're automatically logged in (if email confirmations are disabled)
5. **Visit** `/dashboard` to see the protected content
6. **Click** "Log out" to test logout functionality
7. **Try logging in** with the same credentials

### Step 3: Verify Session Persistence

1. **Refresh** the page - you should remain logged in
2. **Close and reopen** the browser - you should remain logged in
3. **Check** the browser's Application tab → Cookies to see Supabase session cookies

## Key Features of This Implementation

### ✅ **Server-Side Rendering (SSR)**

- Auth state is available on the server
- No flash of unauthenticated content
- SEO-friendly protected pages

### ✅ **Automatic Session Management**

- Middleware handles session refresh
- Cookies are managed automatically
- No manual session checking needed

### ✅ **Type Safety**

- Full TypeScript support
- Proper error handling
- Environment variable validation

### ✅ **Modern Next.js Patterns**

- Uses App Router
- Server Components where possible
- Client Components only when needed
- Server Actions for mutations

## Production Considerations

### Email Confirmations

For production, enable email confirmations in Supabase and create proper email templates.

### Environment Variables

Ensure all environment variables are properly set in your production environment.

### Security

- Never expose the service role key to the client
- Use HTTPS in production
- Consider implementing rate limiting

### Error Handling

Add proper error boundaries and user-friendly error messages.

## Conclusion

This setup provides a complete, production-ready authentication system with Supabase and Next.js 15. The combination of server-side rendering, automatic session management, and modern React patterns creates a seamless user experience while maintaining security best practices.

The beauty of this approach is its simplicity - most of the complexity is handled by Supabase and Next.js, allowing you to focus on building your application's core features.
