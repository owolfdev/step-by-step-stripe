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
          You’re not signed in.{" "}
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
      {/* We'll show subscription status here after we add Stripe webhooks */}
      <p className="text-sm">
        Subscription: <em>(not wired yet)</em>
      </p>
    </div>
  );
}
