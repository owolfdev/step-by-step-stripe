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
