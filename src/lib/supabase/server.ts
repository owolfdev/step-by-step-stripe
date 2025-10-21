// lib/supabase/server.ts
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
