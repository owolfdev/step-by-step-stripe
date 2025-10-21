import { createServerClientWithCookies } from "@/lib/supabase/server";
import ManageBillingButton from "@/components/manage-billing-button";

export default async function BillingPage() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return (
      <p>
        Please{" "}
        <a className="underline" href="/login">
          log in
        </a>{" "}
        to view billing.
      </p>
    );

  const { data: profile } = await supabase
    .from("stripe_step_by_step_profiles")
    .select(
      "billing_email, stripe_customer_id, subscription_status, subscription_price_id, subscription_current_period_end"
    )
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Billing</h1>
      <pre className=" border rounded p-3 text-sm">
        {JSON.stringify(profile, null, 2)}
      </pre>
      <ManageBillingButton />
    </div>
  );
}
