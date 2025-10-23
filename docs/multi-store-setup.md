# Multi-Store Setup Guide: Single Stripe Account + Metadata

This guide shows how to set up multiple stores/apps using a single Stripe account with metadata filtering.

## 🏪 **Step 1: Create Products in Stripe Dashboard**

### **Coffee Shop Products**

1. Go to **Stripe Dashboard** → **Products** → **Add Product**
2. **Product Name**: "[T1] Premium Coffee Blend" _(prefix for organization)_
3. **Description**: "High-quality coffee beans from Colombia"
4. **Metadata** (click "Add metadata"):
   ```
   store: coffee-shop
   category: beverages
   tier: premium
   ```
5. **Pricing**: $9.99/month (recurring)
6. **Save Product**

**Note**: The `[T1]` prefix helps organize products in Stripe but will be **automatically removed** in your app display.

### **Clothing Store Products**

1. **Add Product**
2. **Product Name**: "[Fashion] Cotton T-Shirt" _(prefix for organization)_
3. **Description**: "100% organic cotton t-shirt"
4. **Metadata**:
   ```
   store: clothing-store
   category: apparel
   tier: basic
   ```
5. **Pricing**: $24.99/month (recurring)
6. **Save Product**

### **Software SaaS Products**

1. **Add Product**
2. **Product Name**: "[SaaS] Pro Plan" _(prefix for organization)_
3. **Description**: "Advanced features for power users"
4. **Metadata**:
   ```
   store: software-saas
   category: software
   tier: pro
   ```
5. **Pricing**: $49.99/month (recurring)
6. **Save Product**

## 🏷️ **Product Name Prefixes**

### **How It Works**

You can use prefixes in Stripe product names to organize product lines, but they'll be **automatically hidden** in your app:

**Stripe Dashboard:**

```
[T1] Baby Plan
[T1] Premium Plan
[T1] Pro Plan
[SaaS] Basic Plan
[SaaS] Pro Plan
[Fashion] Basic Plan
[Fashion] Premium Plan
```

**Your App Display:**

```
Baby Plan
Premium Plan
Pro Plan
Basic Plan
Pro Plan
Basic Plan
Premium Plan
```

### **Supported Prefix Formats**

- `[T1] Product Name` → `Product Name`
- `[SaaS] Product Name` → `Product Name`
- `[Fashion] Product Name` → `Product Name`
- `[Store] Product Name` → `Product Name`
- `[Category] Product Name` → `Product Name`

### **Benefits**

✅ **Organized Stripe Dashboard** - easy to group related products
✅ **Clean App Display** - users see clean, simple names
✅ **Flexible Organization** - use any prefix format you want
✅ **Automatic Processing** - no manual work needed

### **Important Notes About Prefixing**

> **📝 Prefix Feature**: This app automatically strips product name prefixes like `[T1]`, `[SaaS]`, `[Fashion]`, etc. from Stripe product names when displaying them to users. This allows you to organize products in your Stripe Dashboard while keeping the user interface clean and professional.

**How to Use:**

1. **In Stripe Dashboard**: Create products with prefixes like `[T1] Baby Plan`, `[SaaS] Pro Plan`
2. **In Your App**: Users will see clean names like `Baby Plan`, `Pro Plan`
3. **Prefix Format**: Use square brackets `[PREFIX]` at the start of product names
4. **Automatic**: No configuration needed - prefixes are stripped automatically

**Examples:**

- Stripe: `[Coffee Shop] Premium Blend` → App: `Premium Blend`
- Stripe: `[T1] Basic Plan` → App: `Basic Plan`
- Stripe: `[SaaS] Enterprise` → App: `Enterprise`
- Stripe: `[Fashion] Premium` → App: `Premium`

**Why Use Prefixes?**

- **Organization**: Group related products in Stripe Dashboard
- **Clarity**: Distinguish between different product lines
- **Scalability**: Easy to manage hundreds of products
- **Clean UI**: Users see simple, professional names

## 🔧 **Step 2: Update Environment Variables**

Add store-specific price IDs to your `.env.local`:

```bash
# Coffee Shop Price IDs
COFFEE_SHOP_PRICE_BASIC=price_coffee_basic_123
COFFEE_SHOP_PRICE_PREMIUM=price_coffee_premium_456
COFFEE_SHOP_PRICE_PRO=price_coffee_pro_789

# Clothing Store Price IDs
CLOTHING_STORE_PRICE_BASIC=price_clothing_basic_123
CLOTHING_STORE_PRICE_PREMIUM=price_clothing_premium_456
CLOTHING_STORE_PRICE_PRO=price_clothing_pro_789

# Software SaaS Price IDs
SOFTWARE_SAAS_PRICE_BASIC=price_software_basic_123
SOFTWARE_SAAS_PRICE_PREMIUM=price_software_premium_456
SOFTWARE_SAAS_PRICE_PRO=price_software_pro_789
```

## 📱 **Step 3: Test Different Stores**

### **Coffee Shop App**

```bash
curl "http://localhost:3001/api/pricing?store=coffee-shop"
```

### **Clothing Store App**

```bash
curl "http://localhost:3001/api/pricing?store=clothing-store"
```

### **Software SaaS App**

```bash
curl "http://localhost:3001/api/pricing?store=software-saas"
```

## 🎯 **Step 4: Usage Examples**

### **In Your Apps**

**Coffee Shop App:**

```javascript
const response = await fetch("/api/pricing?store=coffee-shop");
const { plans } = await response.json();
// Shows only coffee shop products
```

**Clothing Store App:**

```javascript
const response = await fetch("/api/pricing?store=clothing-store");
const { plans } = await response.json();
// Shows only clothing products
```

**Software SaaS App:**

```javascript
const response = await fetch("/api/pricing?store=software-saas");
const { plans } = await response.json();
// Shows only software plans
```

## 🏷️ **Metadata Best Practices**

### **Required Metadata**

- `store`: Store identifier (coffee-shop, clothing-store, software-saas)
- `tier`: Plan tier (basic, premium, pro)

### **Optional Metadata**

- `category`: Product category (beverages, apparel, software)
- `region`: Geographic region (north-america, europe, global)
- `featured`: Whether product is featured (true/false)
- `app`: Specific app identifier

### **Example Metadata Structure**

```json
{
  "store": "coffee-shop",
  "category": "beverages",
  "tier": "premium",
  "region": "north-america",
  "featured": "true",
  "app": "coffee-mobile-app"
}
```

## 🔄 **Step 5: Dynamic Store Management**

### **Add New Store**

1. **Create products** in Stripe with new store metadata
2. **Add store config** to `STORE_CONFIGS` in `multi-store-pricing.ts`
3. **Update environment variables** with new price IDs
4. **Deploy** - new store automatically available!

### **Update Store Pricing**

1. **Edit prices** in Stripe Dashboard
2. **Changes reflect immediately** in all apps
3. **No code changes** needed!

## 🚀 **Benefits of This Approach**

✅ **Single Stripe account** - easier management
✅ **Centralized billing** - unified reporting
✅ **Real-time updates** - changes reflect immediately
✅ **Scalable** - easy to add new stores
✅ **Cost-effective** - no multiple account fees
✅ **Flexible** - different pricing per store

## 🛠️ **Advanced Features**

### **Store-Specific Features**

- Different currencies per store
- Store-specific tax settings
- Custom billing intervals
- Store-specific webhooks

### **Cross-Store Analytics**

- Unified reporting across all stores
- Store performance comparison
- Customer behavior analysis
- Revenue optimization

This setup gives you the flexibility of multiple stores while maintaining the simplicity of a single Stripe account! 🎉
