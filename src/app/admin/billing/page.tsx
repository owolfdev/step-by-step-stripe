import { createServerClientWithCookies } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminBillingPage() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6">
        <p>Please log in to view admin data.</p>
      </div>
    );
  }

  // Get current user's profile data
  const { data: profile } = await supabase
    .from("stripe_step_by_step_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get recent webhook events for this user
  const { data: payments } = await supabaseAdmin
    .from("stripe_step_by_step_payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get all recent webhook events (for debugging)
  const { data: allPayments } = await supabaseAdmin
    .from("stripe_step_by_step_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin Billing Diagnostics</h1>

      {/* Current User Profile */}
      <section>
        <h2 className="text-xl font-medium mb-3">Current User Profile</h2>
        <pre className=" p-4 rounded text-sm overflow-auto">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </section>

      {/* User's Webhook Events */}
      <section>
        <h2 className="text-xl font-medium mb-3">
          Your Webhook Events (Last 20)
        </h2>
        <div className="space-y-2">
          {payments?.length ? (
            payments.map((payment) => (
              <div key={payment.id} className="border p-3 rounded text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <strong>Type:</strong> {payment.type} |
                    <strong> Event ID:</strong> {payment.stripe_event_id} |
                    <strong> Amount:</strong>{" "}
                    {payment.amount_total
                      ? `$${(payment.amount_total / 100).toFixed(2)}`
                      : "N/A"}{" "}
                    |<strong> Currency:</strong> {payment.currency || "N/A"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(payment.created_at).toLocaleString()}
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer ">View Raw Data</summary>
                  <pre className="mt-2  p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(payment.raw, null, 2)}
                  </pre>
                </details>
              </div>
            ))
          ) : (
            <p className="">No webhook events found for this user.</p>
          )}
        </div>
      </section>

      {/* All Webhook Events (for debugging) */}
      <section>
        <h2 className="text-xl font-medium mb-3">
          All Webhook Events (Last 20)
        </h2>
        <div className="space-y-2">
          {allPayments?.length ? (
            allPayments.map((payment) => (
              <div key={payment.id} className="border p-3 rounded text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <strong>Type:</strong> {payment.type} |
                    <strong> User ID:</strong> {payment.user_id || "Unknown"} |
                    <strong> Event ID:</strong> {payment.stripe_event_id} |
                    <strong> Amount:</strong>{" "}
                    {payment.amount_total
                      ? `$${(payment.amount_total / 100).toFixed(2)}`
                      : "N/A"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(payment.created_at).toLocaleString()}
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">
                    View Raw Data
                  </summary>
                  <pre className="mt-2 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(payment.raw, null, 2)}
                  </pre>
                </details>
              </div>
            ))
          ) : (
            <p className="text-gray-500">
              No webhook events found in database.
            </p>
          )}
        </div>
      </section>

      {/* Webhook Testing Instructions */}
      <section>
        <h2 className="text-xl font-medium mb-3">Webhook Testing</h2>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h3 className="font-medium mb-2">To test webhooks locally:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>
              Install Stripe CLI:{" "}
              <code>brew install stripe/stripe-cli/stripe</code>
            </li>
            <li>
              Login: <code>stripe login</code>
            </li>
            <li>
              Forward webhooks:{" "}
              <code>
                stripe listen --forward-to localhost:3000/api/webhooks/stripe
              </code>
            </li>
            <li>
              Copy the webhook secret and add it to your <code>.env.local</code>{" "}
              file
            </li>
            <li>Try creating a subscription from the pricing page</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
