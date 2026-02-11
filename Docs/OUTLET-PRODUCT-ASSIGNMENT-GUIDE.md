# Outlet-Specific Product Assignment Guide

## Overview
Setiap outlet bisa punya produk yang berbeda. Outlet A bisa jual produk A, Outlet B jual produk B.

## Backend API Endpoints

### 1. Get Products for Specific Outlet
```http
GET /api/v1/inventory/outlets/:outletId/products
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "prod-1",
    "name": "Nasi Goreng",
    "basePrice": 25000,
    "category": { "name": "Main Course" }
  }
]
```

### 2. Get Unassigned Products (untuk assign)
```http
GET /api/v1/inventory/outlets/:outletId/products/unassigned
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "prod-2",
    "name": "Mie Goreng",
    "basePrice": 20000,
    "category": { "name": "Main Course" }
  }
]
```

### 3. Assign Products to Outlet (Bulk)
```http
POST /api/v1/inventory/outlets/:outletId/products/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "productIds": ["prod-2", "prod-3", "prod-4"]
}
```

**Response:**
```json
{
  "assigned": 3
}
```

### 4. Remove Product from Outlet
```http
DELETE /api/v1/inventory/outlets/:outletId/products/:productId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Product removed from outlet"
}
```

### 5. List Products (Auto-filtered by User's Outlet)
```http
GET /api/v1/inventory/products
Authorization: Bearer {token}
```

**Behavior:**
- **Owner/Super Admin**: See ALL products (all outlets)
- **Cashier/Staff with outlet**: Only see products assigned to their outlet
- **Staff without outlet**: See all products (backward compatibility)

---

## Frontend Usage

### Product Assignment Page
Already available at: `packages/web/src/features/inventory/product-assignment-page.tsx`

**Route:** `/app/inventory/product-assignment`

**Features:**
- View products assigned to each outlet
- Drag & drop to assign/unassign products
- Bulk assignment
- Search and filter products

---

## Use Cases

### Scenario 1: Coffee Shop Chain
- **Outlet A (Canggu)**: Sells coffee + pastries
- **Outlet B (Ubud)**: Sells coffee + local food
- **Outlet C (Seminyak)**: Sells coffee + sandwiches

Each outlet only sees their specific products in POS.

### Scenario 2: Restaurant with Multiple Concepts
- **Outlet A (Japanese)**: Sushi, Ramen, Sashimi
- **Outlet B (Italian)**: Pizza, Pasta, Risotto
- **Outlet C (Indonesian)**: Nasi Goreng, Sate, Gado-gado

### Scenario 3: Retail Chain
- **Outlet A (Electronics)**: Phones, Laptops, Accessories
- **Outlet B (Fashion)**: Clothes, Shoes, Bags
- **Outlet C (Groceries)**: Food, Drinks, Household items

---

## Database Schema

```sql
CREATE TABLE "outlet_products" (
  "id" UUID PRIMARY KEY,
  "outlet_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "sort_order" INT DEFAULT 0,
  "created_at" TIMESTAMPTZ,

  UNIQUE ("outlet_id", "product_id"),
  FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id"),
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
);
```

---

## How It Works

### 1. Product Creation
When a product is created:
- By default, it's **auto-assigned to ALL outlets** of that business
- Owner can then customize which outlets should have it

### 2. POS Product List
When cashier opens POS:
- If user has `outletId` assigned → Only see products for that outlet
- If owner/admin → See all products (can switch outlets)

### 3. Product Assignment Logic
```typescript
// Service layer
async getProductsForOutlet(outletId: string) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      outletProducts: {
        some: { outletId, isActive: true }
      }
    }
  });
}
```

---

## Migration Status
✅ `20260213000000_multi_type_outlet`
- Creates `outlet_products` table
- Auto-assigns all existing products to all outlets
- Sets up indexes for performance

---

## Testing

### Test 1: Create Product
```bash
# Product should be auto-assigned to all outlets
POST /api/v1/inventory/products
{
  "name": "Test Product",
  "basePrice": 10000
}

# Verify: Should appear in all outlets
GET /api/v1/inventory/outlets/{outlet-a}/products
GET /api/v1/inventory/outlets/{outlet-b}/products
```

### Test 2: Remove from Outlet
```bash
# Remove from outlet B
DELETE /api/v1/inventory/outlets/{outlet-b}/products/{product-id}

# Verify: Should only appear in outlet A
GET /api/v1/inventory/outlets/{outlet-a}/products  # ✅ Has product
GET /api/v1/inventory/outlets/{outlet-b}/products  # ❌ No product
```

### Test 3: POS Filtering
```bash
# Login as cashier assigned to outlet A
# POS should only show outlet A products

# Login as owner
# POS should show all products (can switch outlets)
```

---

## Troubleshooting

### Issue: Products not showing in POS
**Solution:**
1. Check if user has `outletId` assigned
2. Verify product is assigned to that outlet:
   ```sql
   SELECT * FROM outlet_products
   WHERE outlet_id = 'xxx' AND product_id = 'yyy';
   ```
3. Check if product is active: `is_active = true`

### Issue: All outlets show all products
**Solution:**
- This is expected for Owner/Admin
- For staff, assign them to specific outlet in employee settings

### Issue: Need to assign product to all outlets
**Solution:**
Use the service method:
```typescript
await outletProductService.assignToAllOutlets(businessId, productId);
```

---

## Next Steps
1. Run migration: `npm run db:migrate`
2. Access product assignment page: `/app/inventory/product-assignment`
3. Customize products per outlet
4. Test in POS with different outlets
