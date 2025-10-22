# Plan: Stripe + Next.js (Vercel) + Supabase

1. Create a fresh **Next.js 15** app (TypeScript, App Router).
2. Install dependencies: `stripe`, `@supabase/supabase-js`, `zod` (and `stripe-cli` for local testing).
3. Add **`.env.local`** with Stripe + Supabase keys and base URLs.
4. Create tiny helpers: **`lib/stripe.ts`** (Stripe server SDK) and **`lib/supabase.ts`** (server/client).
5. Wire **Supabase Auth** in Next.js (server-side session access).
6. Prepare **Supabase schema**:

   - Extend `profiles` with Stripe columns.
   - Create `payments` log table.
   - Enable RLS + minimal policies.

7. Build minimal **UI pages**:

   - `/pricing` (buttons for one-time + subscription).
   - `/billing` (status + “Manage billing” portal link).

8. Add **API routes**:

   - `POST /api/checkout` (creates Checkout Session; payment/subscription).
   - `POST /api/portal` (opens Customer Portal).

9. Add **webhook endpoint**:

   - `POST /api/webhooks/stripe` (Node runtime, raw body).
   - Handle `checkout.session.completed`, `customer.subscription.*`, `invoice.*`.
   - Upsert to Supabase (`profiles`, `payments`) with service role key.

10. Run **Stripe CLI** locally:

    - `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
    - Capture `STRIPE_WEBHOOK_SECRET`.

11. **Test flows** (dev):

    - Trigger test events; complete a test checkout; verify DB updates.
    - Check Stripe Dashboard → Events/Logs.

12. Add a simple **Admin/Diagnostics page** (e.g., `/admin/billing`):

    - Show current user profile Stripe fields.
    - List recent `payments` table entries.
    - Show last 20 webhook deliveries (from DB) + statuses.

13. Add **logging/observability**:

    - Server-side `console` logs with event type + IDs.
    - Ensure unique `stripe_event_id` to de-dupe.
    - Note where to check: Vercel Logs, Stripe Logs, Supabase query logs.

14. Gate **Pro features** in UI:

    - Read `subscription_status` to enable/disable features.

15. **Error handling** touchups:

    - Clear 401s for unauthenticated routes.
    - Defensive checks for missing customer/price IDs.

16. **Production deploy** to Vercel:

    - Set all env vars on Vercel.
    - Point Stripe live webhooks to your deployed endpoint.

17. Optional enhancements:

    - Product/price sync scripts.
    - Tax settings, coupons, trials.
    - Email notifications on invoice failures.
