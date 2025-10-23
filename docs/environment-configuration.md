# Environment Variables Configuration

This guide shows how to configure your app's metadata filtering using environment variables.

## 🔧 **Environment Variables**

Add these to your `.env.local` file:

```bash
# App Configuration
NEXT_PUBLIC_APP_ID=stripe-step-by-step
NEXT_PUBLIC_APP_NAME=Stripe Step by Step
NEXT_PUBLIC_APP_STORE=default

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_ID_BABY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🏷️ **App Configuration Explained**

### **NEXT_PUBLIC_APP_ID**

- **Purpose**: Identifies which app this is (used for Stripe metadata filtering)
- **Default**: `stripe-step-by-step`
- **Example**: `my-saas-app`, `coffee-shop-app`, `fashion-store`

### **NEXT_PUBLIC_APP_NAME**

- **Purpose**: Human-readable app name (for display purposes)
- **Default**: `Stripe Step by Step`
- **Example**: `My SaaS App`, `Coffee Shop`, `Fashion Store`

### **NEXT_PUBLIC_APP_STORE**

- **Purpose**: Store/business unit identifier (for multi-store setups)
- **Default**: `default`
- **Example**: `main-store`, `coffee-shop`, `clothing-store`

## 🎯 **How Filtering Works**

### **Stripe Products Must Have:**

```json
{
  "app": "stripe-step-by-step", // Must match NEXT_PUBLIC_APP_ID
  "store": "default", // Must match NEXT_PUBLIC_APP_STORE
  "tier": "baby" // Plan tier
}
```

### **Filtering Logic:**

1. **Fetch all products** from Stripe
2. **Filter by app metadata**: `product.metadata.app === config.app.id`
3. **Filter by store metadata**: `product.metadata.store === config.app.store`
4. **Display only matching products**

## 🔄 **Changing App Configuration**

### **For Different Apps:**

**Coffee Shop App:**

```bash
NEXT_PUBLIC_APP_ID=coffee-shop-app
NEXT_PUBLIC_APP_NAME=Coffee Shop
NEXT_PUBLIC_APP_STORE=coffee-shop
```

**Fashion Store App:**

```bash
NEXT_PUBLIC_APP_ID=fashion-store-app
NEXT_PUBLIC_APP_NAME=Fashion Store
NEXT_PUBLIC_APP_STORE=clothing-store
```

**Software SaaS App:**

```bash
NEXT_PUBLIC_APP_ID=software-saas-app
NEXT_PUBLIC_APP_NAME=Software SaaS
NEXT_PUBLIC_APP_STORE=software-saas
```

### **For Multi-Store Setup:**

**Main Store:**

```bash
NEXT_PUBLIC_APP_ID=my-business-app
NEXT_PUBLIC_APP_STORE=main-store
```

**Coffee Shop Store:**

```bash
NEXT_PUBLIC_APP_ID=my-business-app
NEXT_PUBLIC_APP_STORE=coffee-shop
```

## 🚀 **Benefits of Environment Configuration**

✅ **Flexible**: Change app identity without code changes
✅ **Deployable**: Different configs for dev/staging/prod
✅ **Scalable**: Easy to create multiple app instances
✅ **Secure**: No hardcoded values in source code
✅ **Maintainable**: Centralized configuration management

## 🔍 **Testing Configuration**

### **Check Current Config:**

```bash
curl "http://localhost:3001/api/pricing" | jq '.appId'
# Should return your NEXT_PUBLIC_APP_ID value
```

### **Override via URL:**

```bash
curl "http://localhost:3001/api/pricing?app=test-app"
# Uses test-app instead of config value
```

### **Verify Filtering:**

1. **Add test product** in Stripe with different app metadata
2. **Check it doesn't appear** in your app
3. **Change NEXT_PUBLIC_APP_ID** to match test product
4. **Verify it now appears** in your app

This configuration system gives you complete control over which products appear in your app! 🎯
