# Stripe Metadata Setup Guide

This guide shows how to add metadata to your Stripe products to filter them for specific apps.

## 🏷️ **Step 1: Add Metadata to Your Stripe Products**

### **In Stripe Dashboard:**

1. **Go to Products** → Select your existing products
2. **Click "Edit"** on each product
3. **Add Metadata** (click "Add metadata"):

**Required Metadata for each product:**

```json
app: stripe-step-by-step
store: default
tier: [baby/premium/pro]
```

### **Example Setup:**

**Product 1: Baby Plan**

- **Product Name**: `[T1] Baby Plan`
- **Metadata**:
  ```
  app: stripe-step-by-step
  store: default
  tier: baby
  ```

**Product 2: Premium Plan**

- **Product Name**: `[T1] Premium Plan`
- **Metadata**:
  ```
  app: stripe-step-by-step
  store: default
  tier: premium
  ```

**Product 3: Pro Plan**

- **Product Name**: `[T1] Pro Plan`
- **Metadata**:
  ```
  app: stripe-step-by-step
  store: default
  tier: pro
  ```

## 🔧 **Step 2: Add Metadata to Prices**

**For each price object:**

1. **Go to Products** → Select product → **Pricing** tab
2. **Click "Edit"** on each price
3. **Add Metadata**:

**Required Metadata for each price:**

```json
app: stripe-step-by-step
store: default
tier: [baby/premium/pro]
```

### **Example Price Metadata:**

**Baby Plan Price**

- **Price ID**: `price_baby_123`
- **Metadata**:
  ```
  app: stripe-step-by-step
  store: default
  tier: baby
  ```

**Premium Plan Price**

- **Price ID**: `price_premium_456`
- **Metadata**:
  ```
  app: stripe-step-by-step
  store: default
  tier: premium
  ```

**Pro Plan Price**

- **Price ID**: `price_pro_789`
- **Metadata**:
  ```
  app: stripe-step-by-step
  store: default
  tier: pro
  ```

## 🎯 **Step 3: Test the Filtering**

### **Test API Calls:**

**Default app filtering:**

```bash
curl "http://localhost:3001/api/pricing"
# Shows only products with app: stripe-step-by-step
```

**Specific app filtering:**

```bash
curl "http://localhost:3001/api/pricing?app=stripe-step-by-step"
# Shows only products with app: stripe-step-by-step
```

**Different app (should show no products):**

```bash
curl "http://localhost:3001/api/pricing?app=other-app"
# Shows no products (empty array)
```

## 📊 **Step 4: Verify Filtering Works**

### **What Gets Filtered:**

✅ **Included**: Products with `app: stripe-step-by-step`
❌ **Excluded**: Products without metadata
❌ **Excluded**: Products with different app metadata
❌ **Excluded**: Inactive products

### **Example Scenario:**

**Your Stripe Account:**

```
Products:
├── "[T1] Baby Plan" (app: stripe-step-by-step) ✅ SHOWS
├── "[T1] Premium Plan" (app: stripe-step-by-step) ✅ SHOWS
├── "[T1] Pro Plan" (app: stripe-step-by-step) ✅ SHOWS
├── "Old Product" (no metadata) ❌ HIDDEN
├── "Test Product" (app: test-app) ❌ HIDDEN
└── "Another Product" (app: stripe-step-by-step) ✅ SHOWS
```

**Your App Display:**

```
Baby Plan
Premium Plan
Pro Plan
Another Product
```

## 🚀 **Step 5: Benefits of Metadata Filtering**

### **Why Use Metadata Filtering:**

✅ **App Isolation**: Only show products meant for your app
✅ **Clean Separation**: Hide test/development products
✅ **Scalable**: Easy to add new apps without interference
✅ **Flexible**: Change filtering without code changes
✅ **Secure**: Prevent accidental exposure of wrong products

### **Use Cases:**

- **Multiple Apps**: Different apps show different products
- **Development**: Hide test products in production
- **A/B Testing**: Show different products to different users
- **Regional**: Different products for different regions
- **Tier-based**: Different products for different user tiers

## 🔍 **Step 6: Debugging Metadata**

### **Check Your Metadata:**

1. **Stripe Dashboard** → **Products** → Select product
2. **Scroll down** to "Metadata" section
3. **Verify** all required fields are present

### **Common Issues:**

❌ **Missing metadata**: Product won't appear
❌ **Wrong app value**: Product won't appear
❌ **Typos in metadata**: Product won't appear
❌ **Missing price metadata**: Product won't appear

### **Debug API Response:**

```bash
curl "http://localhost:3001/api/pricing" | jq
```

Look for:

- `appId`: Should be "stripe-step-by-step"
- `plans`: Array of filtered products
- `planCount`: Number of products found

## 📝 **Step 7: Metadata Best Practices**

### **Required Fields:**

- `app`: App identifier (e.g., "stripe-step-by-step")
- `store`: Store identifier (e.g., "default")
- `tier`: Plan tier (e.g., "baby", "premium", "pro")

### **Optional Fields:**

- `category`: Product category
- `region`: Geographic region
- `featured`: Whether product is featured
- `version`: Product version

### **Naming Conventions:**

- Use lowercase with hyphens: `stripe-step-by-step`
- Be consistent across all products
- Use descriptive names: `premium-plan` not `p1`

This setup ensures your app only displays the products you want, keeping your user experience clean and focused! 🎯
