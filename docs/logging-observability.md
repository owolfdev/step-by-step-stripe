# Logging & Observability Guide

This document outlines the comprehensive logging system implemented in the Stripe + Next.js + Supabase application and where to find logs for debugging and monitoring.

## Overview

The application uses a centralized logging utility (`src/lib/logging.ts`) that provides:

- Structured logging with consistent formatting
- Context-aware logging with operation tracking
- Error tracking with stack traces
- Deduplication of webhook events
- Different log levels (info, warn, error, debug)

## Log Structure

All logs follow this structured format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Webhook event received: checkout.session.completed",
  "context": {
    "stripeEventId": "evt_1234567890",
    "stripeCustomerId": "cus_1234567890",
    "userId": "user-uuid",
    "operation": "webhook_processing"
  }
}
```

## Where to Check Logs

### 1. Vercel Logs (Production)

**Location**: Vercel Dashboard → Your Project → Functions → View Function Logs

**What you'll see**:

- All server-side console.log output
- API route execution logs
- Webhook processing logs
- Error stack traces

**How to access**:

1. Go to [vercel.com](https://vercel.com) and sign in
2. Select your project
3. Navigate to "Functions" tab
4. Click "View Function Logs"
5. Filter by function name (e.g., `api/webhooks/stripe`)

**Sample log entries**:

```
[2024-01-15T10:30:00.000Z] [INFO] Webhook event received: checkout.session.completed {"stripeEventId":"evt_1234567890","operation":"webhook_processing"}
[2024-01-15T10:30:01.000Z] [INFO] Successfully updated profile {"stripeEventId":"evt_1234567890","userId":"user-uuid","operation":"profile_update"}
```

### 2. Stripe Dashboard (Webhook Events)

**Location**: Stripe Dashboard → Developers → Webhooks → Your Endpoint → Events

**What you'll see**:

- Webhook delivery attempts
- Response codes and timing
- Retry attempts
- Event payloads

**How to access**:

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Navigate to "Developers" → "Webhooks"
3. Click on your webhook endpoint
4. View "Events" tab
5. Click on individual events to see details

**Key metrics to monitor**:

- Success rate (should be 100%)
- Response time (should be < 2 seconds)
- Retry attempts (should be minimal)

### 3. Supabase Logs (Database Operations)

**Location**: Supabase Dashboard → Logs → Database

**What you'll see**:

- Database query logs
- RLS policy violations
- Connection issues
- Performance metrics

**How to access**:

1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project
3. Navigate to "Logs" in the sidebar
4. Select "Database" tab
5. Filter by time range and query type

**Sample queries to monitor**:

```sql
-- Check recent webhook events
SELECT * FROM stripe_step_by_step_payments
ORDER BY created_at DESC
LIMIT 20;

-- Check user profiles with Stripe data
SELECT id, stripe_customer_id, subscription_status, billing_email
FROM stripe_step_by_step_profiles
WHERE stripe_customer_id IS NOT NULL;
```

### 4. Local Development Logs

**Location**: Terminal where you run `npm run dev`

**What you'll see**:

- All console.log output
- Structured log objects (in development mode)
- Error stack traces
- Debug information

**Sample output**:

```
[2024-01-15T10:30:00.000Z] [INFO] API request: POST /api/checkout {"operation":"checkout_start"}
[2024-01-15T10:30:00.000Z] [INFO] Creating checkout session {"userId":"user-uuid","priceId":"price_123","operation":"checkout_creation"}
Structured log: {
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Creating checkout session",
  "context": {
    "userId": "user-uuid",
    "priceId": "price_123",
    "operation": "checkout_creation"
  }
}
```

## Log Categories

### 1. Webhook Events

- **Operation**: `webhook_*`
- **Key fields**: `stripeEventId`, `stripeCustomerId`, `eventType`
- **Examples**: Event received, processing started, user lookup, database updates

### 2. API Requests

- **Operation**: `api_*`, `checkout_*`, `portal_*`
- **Key fields**: `userId`, `method`, `endpoint`
- **Examples**: Request started, authentication, validation, Stripe operations

### 3. Database Operations

- **Operation**: `database_*`
- **Key fields**: `table`, `operation`, `userId`
- **Examples**: Profile updates, payment logging, user lookups

### 4. Stripe Operations

- **Operation**: `stripe_*`
- **Key fields**: `stripeResourceId`, `stripeCustomerId`
- **Examples**: Customer creation, checkout session creation, portal session creation

## Monitoring & Alerting

### Key Metrics to Track

1. **Webhook Success Rate**

   - Should be 100% for production
   - Monitor in Stripe Dashboard

2. **API Response Times**

   - Checkout creation: < 2 seconds
   - Portal creation: < 1 second
   - Monitor in Vercel Logs

3. **Database Performance**

   - Query execution time
   - Connection pool usage
   - Monitor in Supabase Logs

4. **Error Rates**
   - Webhook processing errors
   - API authentication failures
   - Database connection issues

### Common Issues & Debugging

#### 1. Webhook Duplicates

**Symptoms**: Same event processed multiple times
**Check**: Look for "Duplicate webhook event received" warnings
**Solution**: Deduplication is already implemented using `stripe_event_id`

#### 2. User Not Found

**Symptoms**: "No user found for customer" warnings
**Check**: Customer metadata in Stripe vs. user profiles in Supabase
**Solution**: Ensure customer creation includes `supabase_user_id` metadata

#### 3. Database Errors

**Symptoms**: "Database error" logs with specific table/operation
**Check**: Supabase logs for detailed error information
**Solution**: Check RLS policies, connection limits, or data constraints

#### 4. Stripe API Errors

**Symptoms**: "Stripe error" logs with operation details
**Check**: Stripe Dashboard → Events for API call details
**Solution**: Verify API keys, rate limits, or request parameters

## Development vs Production

### Development Mode

- All log levels are shown
- Structured log objects are printed
- Debug information is included
- More verbose output

### Production Mode

- Only info, warn, and error levels
- Compact log format
- No debug information
- Optimized for performance

## Best Practices

1. **Always include context** in log messages
2. **Use appropriate log levels** (debug for development, info for important events)
3. **Include operation names** for easy filtering
4. **Log errors with full context** including user IDs and resource IDs
5. **Monitor log volume** to avoid overwhelming the logging system
6. **Set up alerts** for critical errors in production

## Troubleshooting Commands

### Check Recent Webhook Events

```sql
SELECT
  stripe_event_id,
  type,
  amount_total,
  currency,
  created_at
FROM stripe_step_by_step_payments
ORDER BY created_at DESC
LIMIT 10;
```

### Check User Subscription Status

```sql
SELECT
  id,
  stripe_customer_id,
  subscription_status,
  subscription_price_id,
  subscription_current_period_end
FROM stripe_step_by_step_profiles
WHERE subscription_status IS NOT NULL;
```

### Check for Failed Webhook Events

```sql
SELECT
  stripe_event_id,
  type,
  created_at
FROM stripe_step_by_step_payments
WHERE user_id IS NULL
AND type = 'subscription'
ORDER BY created_at DESC;
```

This comprehensive logging system ensures you can quickly identify and resolve issues in your Stripe + Next.js + Supabase application.
