"use server";

import { createServerClientWithCookies } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createServerClientWithCookies();

  await supabase.auth.signOut();

  redirect("/");
}
