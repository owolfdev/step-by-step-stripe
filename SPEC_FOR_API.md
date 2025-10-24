# Stripe Platform Service — API Spec (v1.0)

A centralized service that owns all Stripe secrets, webhooks, and billing logic for multiple apps (“SaaS 1/2/3”). Consuming apps talk to this service via a small HTTPS API and a private SDK. The service normalizes product names (strips dashboard prefixes like `[S1]`) and exposes clean pricing + subscription data per app.

---

## 1) Goals / Non-Goals

**Goals**

- One place to configure Stripe and handle all webhooks.
- Multi-app (multi-tenant) pricing & subscriptions via `app_id`.
- Clean public pricing feed, checkout/portal session creation, and entitlement lookup.
- Name normalization (strip prefixes) before returning to apps.
- Mirrored data in Supabase for analytics, support, and caching.

**Non-Goals**

- No direct Stripe secret usage from consuming apps.
- No per-app webhooks (optional future “fan-out” event bus).

---

## 2) Identity & Metadata Conventions

- **Apps**: stable identifier `app_id` (e.g., `saas1`, `saas2`, `saas3`).
- **Stripe Product metadata**

  - `app_id`: `"saas1"`
  - `tier`: `"baby" | "premium" | "pro"`

- **Stripe Price metadata (optional)**

  - `interval`: `"month" | "year"`
  - `features`: CSV or JSON flags (optional)

- **Dashboard Name Convention (internal only)**

  - Product `name`: `"[S1] Baby"` etc.
  - Service strips `/^\[(S\d+|[A-Z0-9]+)\]\s*/` before returning to clients.

---

## 3) AuthN / AuthZ

- **App-to-Service**: Short-lived **JWT** (RS256) minted by the service via a server-action handshake. Claims include: `sub` (user_id), `app_id`, `exp`.
- **Public endpoints**: No auth; read-only, cacheable.
- **Admin endpoints**: HMAC header `X-App-Signature: sha256=<hex>` using shared per-app secret; or admin JWT with `role: "admin"`.

---

## 4) API Surface

### 4.1 Public (cacheable)

`GET /public/apps/{app_id}/pricing`

- Returns normalized products grouped by tier with active prices.
- **Query**: `?interval=month|year` (optional)
- **Response**

```json
{
  "app_id": "saas1",
  "plans": [
    {
      "tier": "baby",
      "product_id": "prod_123",
      "name": "Baby",
      "description": "Starter plan",
      "prices": [
        {
          "price_id": "price_abc",
          "unit_amount": 900,
          "currency": "usd",
          "interval": "month"
        }
      ]
    }
  ],
  "updated_at": "2025-10-24T00:00:00Z"
}
```

`GET /public/apps/{app_id}/features`

- Returns plan → features mapping for marketing/pricing tables.

### 4.2 Customer & Session (authenticated via JWT)

`POST /apps/{app_id}/customers/sync`

- Body: `{ "user_id": "u_123", "email": "a@b.com" }`
- Upserts internal customer + Stripe customer.
- Response: `{ "stripe_customer_id": "cus_...", "customer_id": "cust_db_id" }`

`POST /apps/{app_id}/checkout`

- Body:

```json
{
  "user_id": "u_123",
  "price_id": "price_abc",
  "success_url": "https://app.example.com/account?status=success",
  "cancel_url": "https://app.example.com/pricing?status=cancel",
  "mode": "subscription",
  "trial_days": 0,
  "quantity": 1
}
```

- Response: `{ "url": "https://checkout.stripe.com/..." }`

`POST /apps/{app_id}/portal`

- Body: `{ "user_id": "u_123", "return_url": "https://..." }`
- Response: `{ "url": "https://billing.stripe.com/p/session/..." }`

`GET /apps/{app_id}/subscription?user_id=u_123`

- Returns current sub summary (normalized).

```json
{
  "status": "active",
  "current_period_end": "2025-11-10T00:00:00Z",
  "tier": "premium",
  "product_id": "prod_...",
  "price_id": "price_...",
  "interval": "month",
  "quantity": 1
}
```

`GET /apps/{app_id}/entitlements?user_id=u_123`

- Returns feature flags computed from plan (and optional add-ons).

```json
{
  "features": {
    "seats": 3,
    "limits.max_projects": 5,
    "flags.priority_support": false
  }
}
```

`POST /apps/{app_id}/usage/report`

- For metered features.
- Body: `{ "user_id": "u_123", "meter_key": "transcriptions", "quantity": 17, "timestamp": "2025-10-24T00:00:00Z" }`
- Response: `{ "ok": true, "event_id": "evt_local_..." }`

### 4.3 Admin / Maintenance (protected)

`POST /admin/stripe/sync`

- Pull latest products/prices/customers/subscriptions from Stripe; upsert mirrors.

`POST /admin/stripe/reconcile`

- Reconcile subscriptions vs entitlement rows; report discrepancies.

`GET /admin/apps`

- List apps known to the platform with status.

---

## 5) Error Model

- JSON errors with stable codes:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Price not found",
    "details": { "price_id": "price_abc" },
    "request_id": "req_123"
  }
}
```

Common codes: `UNAUTHENTICATED`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INVALID_ARGUMENT`, `FAILED_PRECONDITION`, `STRIPE_ERROR`, `INTERNAL`.

---

## 6) Idempotency & Rate Limits

- All **POST** endpoints accept optional `Idempotency-Key` header; stored for 24h.
- Default limits: 60 req/min per app_id; bursts allowed (token bucket).
- 429 includes `Retry-After`.

---

## 7) Name Normalization Rules

- Remove dashboard prefixes before responding:

  - Regex: `/^\[(?:S\d+|[A-Z0-9]+)\]\s*/`
  - Collapse repeated spaces.

- Don’t mutate stored Stripe objects; keep normalization in the response layer.

---

## 8) Data Model (Supabase)

**apps**
`id (pk text)`, `slug text unique`, `name text`, `status text check in ('active','disabled')`, `created_at timestamptz`

**products** (mirror)
`id (pk)`, `app_id fk apps.id`, `tier text`, `name text`, `raw jsonb`, `active bool`, `description text`, `created_at`, `updated_at`

**prices** (mirror)
`id (pk)`, `product_id fk products.id`, `interval text`, `unit_amount int`, `currency text`, `raw jsonb`, `active bool`, `created_at`, `updated_at`

**customers**
`id (uuid pk)`, `app_id fk`, `user_external_id text`, `email text`, `stripe_customer_id text unique`, `raw jsonb`, `created_at`

**subscriptions** (mirror)
`id (pk)`, `app_id fk`, `customer_id fk customers.id`, `status text`, `price_id fk prices.id`, `quantity int`, `current_period_end timestamptz`, `raw jsonb`, `created_at`, `updated_at`

**entitlements** (derived)
`id (uuid pk)`, `app_id fk`, `user_external_id text`, `features jsonb`, `source text`, `updated_at`

**usage_events**
`id (uuid pk)`, `app_id fk`, `user_external_id text`, `meter_key text`, `quantity int`, `timestamp timestamptz`, `created_at`

**events_log**
`id (uuid pk)`, `source text`, `event_type text`, `payload jsonb`, `received_at`

Indexes on `app_id`, `user_external_id`, `stripe_customer_id`, `event_type`, `created_at`.

---

## 9) Webhooks (single endpoint)

`POST /stripe/webhook`

- Verify signature via `STRIPE_WEBHOOK_SECRET`.
- Handle events:

  - `product.created|updated|deleted`
  - `price.created|updated|deleted`
  - `customer.created|updated`
  - `checkout.session.completed`
  - `customer.subscription.created|updated|deleted`
  - `invoice.paid|payment_failed`

- On product/price events: upsert mirrors; extract `app_id`, `tier`, `interval`; mark inactive on deletions.
- On subscription events: map by `customer` → local `customers`; upsert `subscriptions`; recompute `entitlements`.
- Persist raw payload to `events_log` (for audit/replay).

---

## 10) Entitlement Computation

- Base on plan tier mapping (config per `app_id`), e.g.:

```json
{
  "saas1": {
    "baby": { "seats": 1, "limits": { "max_projects": 1 } },
    "premium": {
      "seats": 3,
      "limits": { "max_projects": 10 },
      "flags": { "priority_support": true }
    },
    "pro": {
      "seats": 10,
      "limits": { "max_projects": 50 },
      "flags": { "priority_support": true }
    }
  }
}
```

- Optional add-ons: merge with base via price metadata (e.g., `addon: "extra_seats=5"`).

---

## 11) Caching

- `/public/...` endpoints: `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- Server-side in Redis (optional): cache pricing by `app_id + interval`.
- Invalidate on webhook product/price updates.

---

## 12) SDKs (private packages)

`@platform/stripe-sdk` (fetchers for server actions)

- `getPricing({ appId, interval? })`
- `syncCustomer({ appId, userId, email })`
- `createCheckoutSession({ appId, token, priceId, successUrl, cancelUrl, trialDays?, quantity? })`
- `createPortalSession({ appId, token, returnUrl })`
- `getSubscription({ appId, token })`
- `getEntitlements({ appId, token })`
- Types: `Plan`, `Price`, `Subscription`, `Entitlements`

`@platform/stripe-ui` (headless + styled React)

- `<PricingGrid appId token intervalDefault="month" />`
- `<SubscribeButton priceId onRedirect />`
- `<ManageSubscriptionButton />`
- `<PlanBadge />` (reads subscription context)
- All components consume the SDK; server-component friendly (Next.js 15).

---

## 13) Security

- Secrets only in central service; apps never see Stripe secret keys.
- JWT audience `aud: "billing-platform"`; verify `app_id` in claims vs route.
- HSTS, strict CORS (per app origin allowlist), TLS only.
- PII: store minimal (email); encrypt at rest; purge on request.

---

## 14) Observability

- Structured logs with `request_id`, `app_id`, `user_id`.
- Metrics: webhook latency, sync durations, checkout conversion, 4xx/5xx rates.
- Alerts on webhook failures and Stripe API errors (>= 2% in 5m).

---

## 15) Versioning

- Header `X-API-Version: 2025-10-01`.
- Backward-compatible changes additive; breaking changes require new version and parallel endpoints.

---

## 16) Environment

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PLATFORM_JWT_PRIVATE_KEY`, `PLATFORM_JWT_PUBLIC_KEY`
- `APP_ORIGINS` (CSV), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Optional: `REDIS_URL`

---

## 17) Migration & Seeding

1. Create `apps` and register each (`saas1`, `saas2`, …).
2. Seed entitlement config per app/tier.
3. Initial **/admin/stripe/sync** full import.
4. Enable webhooks; verify mirrors update on change.

---

## 18) Testing Matrix

- Unit: normalization, entitlement merge, JWT verify.
- Integration: checkout + portal flows, webhook replay.
- E2E: app loads pricing, purchase, entitlement flips to premium.

---

## 19) Example Responses

**Pricing (normalized)**

```json
{
  "app_id": "saas2",
  "plans": [
    {
      "tier": "baby",
      "product_id": "prod_A",
      "name": "Baby",
      "description": null,
      "prices": [
        {
          "price_id": "price_m",
          "unit_amount": 1200,
          "currency": "usd",
          "interval": "month"
        },
        {
          "price_id": "price_y",
          "unit_amount": 12000,
          "currency": "usd",
          "interval": "year"
        }
      ]
    }
  ],
  "updated_at": "2025-10-24T00:00:00Z"
}
```

**Subscription**

```json
{
  "status": "trialing",
  "current_period_end": "2025-11-05T12:00:00Z",
  "tier": "pro",
  "product_id": "prod_P",
  "price_id": "price_Pm",
  "interval": "month",
  "quantity": 5
}
```

---

## 20) Minimal Pseudocode (Normalization)

```ts
function normalizeProduct(p: Stripe.Product, prices: Stripe.Price[]) {
  const name = p.name
    .replace(/^\[(?:S\d+|[A-Z0-9]+)\]\s*/, "")
    .replace(/\s{2,}/g, " ");
  return {
    product_id: p.id,
    app_id: p.metadata.app_id,
    tier: p.metadata.tier,
    name,
    description: p.description ?? null,
    prices: prices
      .filter((pr) => pr.product === p.id && pr.active)
      .map((pr) => ({
        price_id: pr.id,
        unit_amount: pr.unit_amount ?? 0,
        currency: pr.currency,
        interval:
          pr.recurring?.interval ??
          (pr.metadata.interval as string | undefined),
      })),
  };
}
```

---

If you want, I can follow up with:

- Supabase SQL for the tables above,
- a Next.js 15 route handler for `/public/apps/:app_id/pricing`, and
- the webhook handler skeleton wired to Stripe’s SDK.
