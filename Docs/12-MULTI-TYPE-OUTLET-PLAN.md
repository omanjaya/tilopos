# Multi-Type Outlet Implementation Plan

> Satu owner bisa punya beberapa outlet dengan tipe bisnis berbeda.
> Contoh: Owner Budi punya Toko Bangunan, Restoran, dan Laundry — semua dikelola dari 1 akun.

## Arsitektur Saat Ini

```
Business "Usaha Pak Budi"
├── businessType: "fnb_restaurant"     ← SATU tipe untuk semua
├── BusinessFeature[] (per business)   ← features shared semua outlet
├── Product[] (per business)           ← catalog campur semua outlet
├── Outlet "Cabang A"
└── Outlet "Cabang B"
```

## Arsitektur Target

```
Business "Usaha Pak Budi"
├── businessType: "custom" (legacy, deprecated)
├── Customer[] (shared semua outlet)
├── Outlet "Toko Bangunan Mitra"
│   ├── outletType: "retail_hardware"
│   ├── OutletFeature[]: credit_sales, decimal_quantities, excel_import
│   └── OutletProduct[]: Semen, Besi, Paku, Cat...
├── Outlet "Restoran Sederhana"
│   ├── outletType: "fnb_restaurant"
│   ├── OutletFeature[]: kitchen_display, table_management, self_order
│   └── OutletProduct[]: Nasi Goreng, Es Teh, Sate...
└── Outlet "Laundry Express"
    ├── outletType: "service_laundry"
    ├── OutletFeature[]: work_orders, item_tracking, appointments
    └── OutletProduct[]: Cuci Setrika, Cuci Kering, Express...
```

**Data yang SHARED (level Business):**
- Customer (pelanggan bisa lintas outlet)
- Employee (bisa di-assign ke outlet mana saja)
- Supplier (pemasok bisa supply ke beberapa outlet)

**Data yang PER-OUTLET:**
- Product catalog (via OutletProduct junction)
- Feature flags (via OutletFeature)
- Business type
- Stock, Transaction, Order (sudah per-outlet)

---

## Phase 1: Database Schema (Additive, Non-Breaking)

### Goal
Tambah kolom dan tabel baru tanpa mengubah yang sudah ada. Zero downtime, backward compatible.

### Database Migration

```sql
-- 1. Tambah businessType ke Outlet
ALTER TABLE outlets
  ADD COLUMN outlet_type VARCHAR(30) DEFAULT 'custom',
  ADD COLUMN outlet_type_set_at TIMESTAMPTZ;

-- 2. Tabel OutletFeature (parallel dengan BusinessFeature)
CREATE TABLE outlet_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, feature_key)
);
CREATE INDEX idx_outlet_features_outlet_enabled ON outlet_features(outlet_id, is_enabled);

-- 3. Tabel OutletProduct (junction: product ↔ outlet)
CREATE TABLE outlet_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, product_id)
);
CREATE INDEX idx_outlet_products_outlet ON outlet_products(outlet_id);
CREATE INDEX idx_outlet_products_product ON outlet_products(product_id);

-- 4. Data migration: copy Business.businessType ke semua Outlet-nya
UPDATE outlets o
SET outlet_type = b.business_type,
    outlet_type_set_at = b.business_type_set_at
FROM businesses b
WHERE o.business_id = b.id;

-- 5. Data migration: copy BusinessFeature ke OutletFeature untuk setiap outlet
INSERT INTO outlet_features (outlet_id, feature_key, is_enabled, enabled_at, disabled_at, created_at, updated_at)
SELECT o.id, bf.feature_key, bf.is_enabled, bf.enabled_at, bf.disabled_at, bf.created_at, bf.updated_at
FROM business_features bf
JOIN outlets o ON o.business_id = bf.business_id;

-- 6. Data migration: assign semua produk ke semua outlet yang ada
INSERT INTO outlet_products (outlet_id, product_id, is_active)
SELECT o.id, p.id, p.is_active
FROM outlets o
JOIN products p ON p.business_id = o.business_id;
```

### Prisma Schema Changes

```prisma
model Outlet {
  // ... existing fields ...
  outletType            String    @default("custom") @map("outlet_type") @db.VarChar(30)
  outletTypeSetAt       DateTime? @map("outlet_type_set_at") @db.Timestamptz()

  // New relations
  outletFeatures        OutletFeature[]
  outletProducts        OutletProduct[]
}

model OutletFeature {
  id              String    @id @default(uuid()) @db.Uuid
  outletId        String    @map("outlet_id") @db.Uuid
  featureKey      String    @map("feature_key") @db.VarChar(50)
  isEnabled       Boolean   @default(true) @map("is_enabled")
  enabledAt       DateTime? @map("enabled_at") @db.Timestamptz()
  disabledAt      DateTime? @map("disabled_at") @db.Timestamptz()
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt       DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  outlet          Outlet    @relation(fields: [outletId], references: [id], onDelete: Cascade)

  @@unique([outletId, featureKey])
  @@index([outletId, isEnabled])
  @@map("outlet_features")
}

model OutletProduct {
  id              String    @id @default(uuid()) @db.Uuid
  outletId        String    @map("outlet_id") @db.Uuid
  productId       String    @map("product_id") @db.Uuid
  isActive        Boolean   @default(true) @map("is_active")
  sortOrder       Int       @default(0) @map("sort_order")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  outlet          Outlet    @relation(fields: [outletId], references: [id], onDelete: Cascade)
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([outletId, productId])
  @@index([outletId])
  @@index([productId])
  @@map("outlet_products")
}

model Product {
  // ... existing fields ...
  outletProducts        OutletProduct[]    // NEW relation
}
```

### Files yang Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah OutletFeature, OutletProduct model + Outlet fields |
| `prisma/migrations/YYYYMMDD_multi_type_outlet/migration.sql` | Migration SQL di atas |

### Verifikasi
- `npx prisma migrate dev` sukses
- `npx prisma generate` sukses
- `npm run build:backend` tetap 0 error (tidak ada code change)
- `npm run db:seed` tetap jalan (seed tidak di-update dulu)

---

## Phase 2: Backend — Outlet Feature & Type System

### Goal
Backend endpoints baru untuk manage outlet type dan features per outlet. Dual-mode: baca dari OutletFeature jika ada, fallback ke BusinessFeature.

### File Changes

#### 1. New: Outlet Feature Service
**Path:** `packages/backend/src/modules/business/services/outlet-feature.service.ts`

```typescript
// Semua method sama dengan FeatureService tapi scope ke outletId
// - getOutletFeatures(outletId)
// - getEnabledFeatureKeys(outletId)
// - toggleFeature(outletId, featureKey, enable)
// - initializeFeaturesForOutletType(outletId, outletType)
// - Fallback: jika OutletFeature kosong, baca BusinessFeature
```

#### 2. New: Outlet Type Service
**Path:** `packages/backend/src/modules/business/services/outlet-type.service.ts`

```typescript
// - getOutletType(outletId)
// - changeOutletType(outletId, outletType) → reinitialize OutletFeature
// - getAllPresets() → reuse dari business-types.config.ts
```

#### 3. Update: Feature Controller
**Path:** `packages/backend/src/modules/business/controllers/feature.controller.ts`

```
// Existing endpoints tetap jalan (backward compatible)
// Tambah endpoint baru:
GET  /outlet/:outletId/features/enabled  → OutletFeature keys
GET  /outlet/:outletId/type              → outlet type
PUT  /outlet/:outletId/type              → change outlet type
PUT  /outlet/:outletId/features/:key     → toggle outlet feature
```

#### 4. Update: Existing Feature Endpoints (Dual Read)
**Path:** `packages/backend/src/modules/business/services/feature.service.ts`

```typescript
// getEnabledFeatureKeys(businessId) → tetap baca BusinessFeature
// BARU: getEnabledFeatureKeysForOutlet(outletId) → baca OutletFeature
//   - Jika OutletFeature kosong → fallback ke BusinessFeature
```

### Files yang Diubah

| File | Perubahan |
|------|-----------|
| `services/outlet-feature.service.ts` | **NEW** — OutletFeature CRUD |
| `services/outlet-type.service.ts` | **NEW** — Outlet type management |
| `controllers/feature.controller.ts` | Tambah 4 endpoint baru per-outlet |
| `services/feature.service.ts` | Tambah fallback method |
| `modules/business/business.module.ts` | Register new services |

### Verifikasi
- Backend build 0 error
- Test endpoint baru via curl:
  - `GET /outlet/:id/features/enabled` → return feature keys
  - `PUT /outlet/:id/type` → change type, verify OutletFeature created
  - Fallback: hapus OutletFeature → endpoint return BusinessFeature data

---

## Phase 3: Backend — Product per Outlet

### Goal
Product loading di-scope per outlet via OutletProduct. CRUD product otomatis assign ke outlet aktif.

### File Changes

#### 1. New: Outlet Product Service
**Path:** `packages/backend/src/modules/inventory/services/outlet-product.service.ts`

```typescript
// - getProductsForOutlet(outletId) → JOIN product + outlet_products
// - assignProductToOutlet(outletId, productId)
// - removeProductFromOutlet(outletId, productId)
// - bulkAssignProducts(outletId, productIds[])
// - getUnassignedProducts(outletId) → products not yet in this outlet
```

#### 2. Update: Product Repository
**Path:** `packages/backend/src/infrastructure/repositories/prisma-product.repository.ts`

```typescript
// EXISTING: findByBusinessId(businessId) → tetap jalan
// NEW: findByOutletId(outletId) → query via OutletProduct junction
//   SELECT p.* FROM products p
//   JOIN outlet_products op ON op.product_id = p.id
//   WHERE op.outlet_id = ? AND op.is_active = true AND p.is_active = true
```

#### 3. Update: Inventory Controller
**Path:** `packages/backend/src/modules/inventory/inventory.controller.ts`

```typescript
// GET /inventory/products → UPDATED:
//   - Jika user.outletId ada → findByOutletId (scoped)
//   - Jika user.outletId null (admin) → findByBusinessId (semua)
//
// POST /inventory/products → UPDATED:
//   - Setelah create product, auto-assign ke outlet_id dari JWT
//
// NEW ENDPOINTS:
// GET  /inventory/outlets/:outletId/products → products for specific outlet
// POST /inventory/outlets/:outletId/products/assign → assign products
// DELETE /inventory/outlets/:outletId/products/:productId → unassign
```

#### 4. Update: POS Product Loading
**Path:** Backend endpoint yang dipanggil POS

```typescript
// GET /inventory/products sekarang return per-outlet
// POS frontend tidak perlu diubah karena endpoint sama
```

### Files yang Diubah

| File | Perubahan |
|------|-----------|
| `services/outlet-product.service.ts` | **NEW** — Outlet-product assignment |
| `prisma-product.repository.ts` | Tambah `findByOutletId()` method |
| `inventory.controller.ts` | Update GET + tambah assignment endpoints |
| `inventory.module.ts` | Register OutletProductService |

### Verifikasi
- `GET /inventory/products` (dengan outletId di JWT) → return hanya produk outlet itu
- `GET /inventory/products` (tanpa outletId / admin) → return semua produk business
- Create product → otomatis ter-assign ke outlet aktif
- Assign/unassign product endpoint bekerja

---

## Phase 4: Frontend — Feature Loading per Outlet

### Goal
Feature store load features berdasarkan outlet aktif, bukan business. Saat switch outlet → reload features.

### File Changes

#### 1. Update: Feature Store
**Path:** `packages/web/src/stores/feature.store.ts`

```typescript
interface FeatureState {
  enabledFeatures: string[];
  isLoaded: boolean;
  businessType: string | null;      // DEPRECATED, keep for compat
  outletType: string | null;        // NEW
  currentOutletId: string | null;   // NEW - track which outlet features loaded for
  // ... methods
}
```

#### 2. Update: Features API
**Path:** `packages/web/src/api/endpoints/features.api.ts`

```typescript
// NEW endpoints:
// getOutletFeatures(outletId) → GET /outlet/:outletId/features/enabled
// getOutletType(outletId) → GET /outlet/:outletId/type
// changeOutletType(outletId, type) → PUT /outlet/:outletId/type
```

#### 3. Update: App Layout — Reload on Outlet Switch
**Path:** `packages/web/src/components/layout/app-layout.tsx`

```typescript
// SEBELUM:
useEffect(() => {
  featuresApi.getEnabledFeatures().then(setEnabledFeatures)...
  featuresApi.getBusinessType().then(...)...
}, []);

// SESUDAH:
const selectedOutletId = useUIStore((s) => s.selectedOutletId);
useEffect(() => {
  if (selectedOutletId) {
    // Load per-outlet features
    featuresApi.getOutletFeatures(selectedOutletId).then(setEnabledFeatures)...
    featuresApi.getOutletType(selectedOutletId).then(setOutletType)...
  } else {
    // Fallback ke business-level (backward compat)
    featuresApi.getEnabledFeatures().then(setEnabledFeatures)...
  }
}, [selectedOutletId]); // ← re-run saat outlet switch!
```

#### 4. Update: useBusinessFeatures Hook
**Path:** `packages/web/src/hooks/use-business-features.ts`

```typescript
// Rename ke useOutletFeatures (keep alias useBusinessFeatures)
// - isFnB, isRetail, dll sekarang baca outletType bukan businessType
// - Semua computed features tetap sama
```

### Files yang Diubah

| File | Perubahan |
|------|-----------|
| `stores/feature.store.ts` | Tambah outletType, currentOutletId |
| `api/endpoints/features.api.ts` | Tambah outlet-level API calls |
| `components/layout/app-layout.tsx` | Reload features saat outlet switch |
| `hooks/use-business-features.ts` | Baca outletType, keep backward compat |

### Verifikasi
- Login sebagai user dengan outlet type "retail_hardware" → sidebar tampil credit_sales
- Switch ke outlet type "fnb_restaurant" → sidebar tampil KDS, table management
- Switch balik → features kembali sesuai outlet type
- Feature-gated routes (e.g., /app/credit-sales) tersembunyi jika tidak aktif

---

## Phase 5: Frontend — UI Outlet Type & Product Management

### Goal
UI untuk pilih tipe outlet, manage product assignment per outlet.

### File Changes

#### 1. New: Outlet Type Selector
**Path:** `packages/web/src/features/settings/outlet-type-page.tsx`

```
Page di Settings untuk manage outlet type:
- Dropdown/card selector untuk pilih tipe outlet
- Preview features yang akan aktif
- Tombol "Terapkan" → call PUT /outlet/:id/type
- Warning jika ada feature yang akan di-disable
```

#### 2. New: Product Assignment Page
**Path:** `packages/web/src/features/settings/outlet-products-page.tsx`

```
Page untuk manage produk per outlet:
- Daftar produk yang sudah di-assign (with toggle active/inactive)
- Tombol "Tambah Produk" → modal pilih dari catalog business
- Bulk assign/unassign
- Search & filter
```

#### 3. Update: Outlet Settings
**Path:** `packages/web/src/features/settings/outlets-page.tsx`

```
Tambah kolom "Tipe Bisnis" di tabel outlet list
Tambah link ke outlet type selector page
```

#### 4. Update: POS Product Loading
**Path:** `packages/web/src/api/endpoints/pos.api.ts`

```typescript
// getProducts() sekarang otomatis return per-outlet
// (backend sudah di-update di Phase 3)
// TIDAK PERLU perubahan frontend karena endpoint sama
```

#### 5. Update: Routes
**Path:** `packages/web/src/routes/app-routes.tsx` + `lazy-imports.ts`

```
Tambah routes:
/app/settings/outlet-type → OutletTypePage
/app/settings/outlet-products → OutletProductsPage
```

### Files yang Diubah

| File | Perubahan |
|------|-----------|
| `features/settings/outlet-type-page.tsx` | **NEW** — Outlet type selector UI |
| `features/settings/outlet-products-page.tsx` | **NEW** — Product assignment UI |
| `features/settings/outlets-page.tsx` | Tambah tipe bisnis column |
| `routes/app-routes.tsx` | Tambah routes |
| `routes/lazy-imports.ts` | Tambah lazy imports |

### Verifikasi
- Buka Settings > Outlet > pilih outlet → bisa ganti tipe
- Ganti tipe → features otomatis berubah, sidebar update
- Product assignment → POS hanya tampilkan produk yang di-assign
- Buat outlet baru → bisa pilih tipe saat create

---

## Phase 6: Seeder, Cleanup & Backward Compatibility

### Goal
Update seeder untuk demo multi-type, cleanup deprecated code.

### Changes

#### 1. Update Seeder
```
Seeder baru:
- Business "Usaha Pak Budi"
  - Outlet "Toko Bangunan Mitra" (retail_hardware) + 10 produk bangunan
  - Outlet "Restoran Sederhana" (fnb_restaurant) + 10 menu
  - Outlet "Laundry Express" (service_laundry) + 5 layanan
- Masing-masing punya OutletFeature sesuai preset
- OutletProduct mapping correct
```

#### 2. Deprecation (Soft)
```
- Business.businessType → masih ada, default "custom"
- BusinessFeature → masih ada, dipakai sebagai fallback
- TIDAK dihapus untuk backward compatibility
- Comment: @deprecated — use Outlet.outletType instead
```

#### 3. Onboarding Flow Update
```
- Wizard baru: saat buat outlet, pilih tipe bisnis
- Bukan lagi saat setup business
```

### Files yang Diubah

| File | Perubahan |
|------|-----------|
| `seeders/index.ts` | Multi-outlet multi-type seed data |
| `seeders/outlets.seeder.ts` | **NEW** — seed outlet types + features |
| `seeders/products.seeder.ts` | Update assign produk per outlet |
| `prisma/schema.prisma` | Deprecation comments |
| `onboarding-wizard.tsx` | Update flow (outlet type selector) |

### Verifikasi
- `npm run db:seed` → 3 outlet berbeda tipe, masing-masing punya produk sendiri
- Login → dashboard menampilkan data per-outlet
- Switch outlet → features, produk, dan sidebar berubah sesuai tipe

---

## Ringkasan Impact per Phase

| Phase | Files Baru | Files Diubah | Breaking? | Bisa Deploy Sendiri? |
|-------|-----------|-------------|-----------|---------------------|
| 1. DB Schema | 1 migration | 1 schema | No | Yes |
| 2. Backend Features | 2 services | 3 files | No (additive) | Yes |
| 3. Backend Products | 1 service | 3 files | No (fallback) | Yes |
| 4. Frontend Features | 0 | 4 files | No (backward compat) | Yes |
| 5. Frontend UI | 2 pages | 3 files | No | Yes |
| 6. Cleanup & Seed | 1 seeder | 4 files | No | Yes |

**Total estimasi: ~15 file baru, ~18 file diubah**

---

## Dependency Graph

```
Phase 1 (DB Schema)
  ├── Phase 2 (Backend Features) ── Phase 4 (Frontend Features)
  │                                      └── Phase 5 (Frontend UI)
  └── Phase 3 (Backend Products) ────────────┘
                                              └── Phase 6 (Cleanup & Seed)
```

Phase 1 harus duluan. Phase 2 & 3 bisa parallel. Phase 4 & 5 setelah Phase 2. Phase 6 terakhir.
