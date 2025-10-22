import { createServerClientWithCookies } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

export default async function AuthButton() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Signed in as{" "}
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {user.email}
          </span>
        </span>
        <LogoutButton />
      </div>
    );
  }

  return (
    <a
      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
      href="/login"
    >
      Log in / Sign up
    </a>
  );
}
