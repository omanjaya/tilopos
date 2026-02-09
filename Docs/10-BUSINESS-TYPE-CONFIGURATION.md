# 10. Business Type & Feature Configuration

## Overview

TiloPOS adalah sistem POS **universal** yang dapat digunakan untuk berbagai jenis bisnis, mulai dari coffee shop, restoran, toko retail, salon, hingga toko bangunan. Sistem ini menggunakan pendekatan **Feature Toggle** dimana setiap bisnis dapat mengaktifkan/menonaktifkan fitur sesuai kebutuhan operasionalnya.

---

## 1. Business Type Presets

### 1.1 Daftar Business Type

| Code | Label | Deskripsi | Contoh Bisnis |
|------|-------|-----------|---------------|
| `fnb_restaurant` | Restoran | Full-service restaurant dengan meja | Restoran Padang, Seafood, Chinese Food |
| `fnb_cafe` | Cafe & Coffee Shop | Quick-service F&B | Coffee Shop, Bubble Tea, Juice Bar |
| `fnb_fastfood` | Fast Food | Counter service, takeaway focus | Fried Chicken, Burger, Pizza |
| `retail_grocery` | Toko Kelontong | Retail dengan barcode | Minimarket, Supermarket, Warung |
| `retail_fashion` | Fashion & Boutique | Variant size/color | Toko Baju, Sepatu, Aksesoris |
| `retail_hardware` | Toko Bangunan | Produk dengan satuan beragam | Toko Bangunan, Material, Alat |
| `retail_electronics` | Elektronik | Serial number tracking | HP, Laptop, Aksesoris Elektronik |
| `service_salon` | Salon & Barbershop | Appointment-based | Salon, Barbershop, Spa |
| `service_laundry` | Laundry | Item tracking | Laundry Kiloan, Dry Cleaning |
| `service_workshop` | Bengkel & Service | Work order | Bengkel Motor, Service AC |
| `wholesale` | Grosir | Harga bertingkat | Distributor, Agen |
| `custom` | Custom | Pilih fitur manual | Bisnis unik |

### 1.2 Preset Feature Matrix

```
Feature                    | fnb_rest | fnb_cafe | retail | hardware | salon | custom
---------------------------|----------|----------|--------|----------|-------|--------
kitchen_display            |    ✅    |    ✅    |   ❌   |    ❌    |   ❌  |   🔧
table_management           |    ✅    |    ⚠️    |   ❌   |    ❌    |   ❌  |   🔧
order_management           |    ✅    |    ✅    |   ❌   |    ❌    |   ❌  |   🔧
waiting_list               |    ✅    |    ❌    |   ❌   |    ❌    |   ✅  |   🔧
ingredient_tracking        |    ✅    |    ✅    |   ❌   |    ❌    |   ❌  |   🔧
modifiers                  |    ✅    |    ✅    |   ❌   |    ❌    |   ❌  |   🔧
self_order_qr              |    ✅    |    ✅    |   ❌   |    ❌    |   ❌  |   🔧
barcode_scanning           |    ❌    |    ❌    |   ✅   |    ✅    |   ❌  |   🔧
stock_management           |    ⚠️    |    ⚠️    |   ✅   |    ✅    |   ⚠️  |   🔧
supplier_management        |    ⚠️    |    ⚠️    |   ✅   |    ✅    |   ❌  |   🔧
purchase_orders            |    ⚠️    |    ⚠️    |   ✅   |    ✅    |   ❌  |   🔧
product_variants           |    ⚠️    |    ⚠️    |   ✅   |    ✅    |   ❌  |   🔧
unit_conversion            |    ❌    |    ❌    |   ⚠️   |    ✅    |   ❌  |   🔧
serial_number_tracking     |    ❌    |    ❌    |   ⚠️   |    ⚠️    |   ❌  |   🔧
appointments               |    ❌    |    ❌    |   ❌   |    ❌    |   ✅  |   🔧
staff_assignment           |    ⚠️    |    ⚠️    |   ❌   |    ❌    |   ✅  |   🔧
customer_loyalty           |    ✅    |    ✅    |   ✅   |    ⚠️    |   ✅  |   🔧
promotions                 |    ✅    |    ✅    |   ✅   |    ✅    |   ✅  |   🔧
multi_outlet               |    ⚠️    |    ⚠️    |   ✅   |    ⚠️    |   ⚠️  |   🔧
online_store               |    ⚠️    |    ⚠️    |   ✅   |    ⚠️    |   ❌  |   🔧

Legend: ✅ = Enabled by default, ⚠️ = Optional (off by default), ❌ = Hidden, 🔧 = User toggleable
```

---

## 2. Feature Modules

### 2.1 Core Features (Selalu Aktif)

Fitur ini **tidak bisa dinonaktifkan** karena merupakan inti dari sistem POS:

| Feature | Deskripsi |
|---------|-----------|
| `pos_terminal` | Antarmuka kasir untuk transaksi |
| `transactions` | Histori transaksi & refund |
| `products` | Manajemen produk/layanan |
| `payments` | Pembayaran multi-metode |
| `shifts` | Buka/tutup kasir & handover |
| `settlements` | Rekonsiliasi akhir hari |
| `employees` | Manajemen karyawan & PIN |
| `reports_basic` | Laporan penjualan dasar |
| `settings_basic` | Pengaturan bisnis & pajak |

### 2.2 Toggleable Features

#### A. F&B Features

| Feature Key | Label | Deskripsi |
|-------------|-------|-----------|
| `kitchen_display` | Kitchen Display (KDS) | Tampilan dapur untuk pesanan masuk |
| `table_management` | Manajemen Meja | Denah meja, status, merge/split bill |
| `order_management` | Pesanan Dapur | Order queue, status tracking |
| `waiting_list` | Daftar Tunggu | Reservasi & antrian |
| `ingredient_tracking` | Tracking Bahan Baku | Resep, HPP, deduct otomatis |
| `modifiers` | Modifier Produk | Size, topping, level, dll |
| `self_order_qr` | Self Order QR | Customer order via scan QR |
| `order_types` | Tipe Pesanan | Dine-in, Takeaway, Delivery |

#### B. Retail Features

| Feature Key | Label | Deskripsi |
|-------------|-------|-----------|
| `barcode_scanning` | Barcode Scanner | Input produk via barcode |
| `stock_management` | Manajemen Stok | Stock opname, stock alert |
| `stock_transfer` | Transfer Stok | Transfer antar outlet |
| `supplier_management` | Manajemen Supplier | Database supplier |
| `purchase_orders` | Purchase Order | PO & receiving |
| `product_variants` | Varian Produk | Size, color, dll |
| `unit_conversion` | Konversi Satuan | Beli dus, jual pcs |
| `serial_number` | Serial Number | Tracking per unit (elektronik) |
| `batch_tracking` | Batch/Lot Tracking | Expired date tracking |
| `price_tiers` | Harga Bertingkat | Harga grosir vs retail |

#### C. Service Features

| Feature Key | Label | Deskripsi |
|-------------|-------|-----------|
| `appointments` | Appointment/Booking | Jadwal layanan |
| `staff_assignment` | Penugasan Staff | Assign service ke karyawan |
| `service_duration` | Durasi Layanan | Estimasi waktu per layanan |
| `work_orders` | Work Order | Tracking pekerjaan (bengkel) |
| `item_tracking` | Tracking Item Customer | Item laundry, service |

#### D. Marketing Features

| Feature Key | Label | Deskripsi |
|-------------|-------|-----------|
| `customer_loyalty` | Program Loyalty | Poin & reward |
| `promotions` | Promosi | Diskon, buy X get Y |
| `vouchers` | Voucher | Kode voucher |
| `customer_segments` | Segmentasi Pelanggan | Grouping customer |
| `online_store` | Toko Online | Integrasi marketplace |

#### E. Advanced Features

| Feature Key | Label | Deskripsi |
|-------------|-------|-----------|
| `multi_outlet` | Multi Outlet | Kelola banyak outlet |
| `multi_warehouse` | Multi Gudang | Stok di beberapa lokasi |
| `reports_advanced` | Laporan Lanjutan | Custom report builder |
| `audit_log` | Audit Log | Tracking semua aktivitas |
| `api_integration` | Integrasi API | Marketplace, accounting |
| `offline_mode` | Mode Offline | Transaksi tanpa internet |

---

## 3. Feature Configuration Workflow

### 3.1 Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SETUP BISNIS BARU                            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Informasi Bisnis                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Nama Bisnis: [________________]                              │    │
│  │ Telepon:     [________________]                              │    │
│  │ Alamat:      [________________]                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Pilih Jenis Bisnis                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ○ 🍽️  Restoran (meja, dapur, pesanan)                       │    │
│  │ ○ ☕ Cafe & Coffee Shop (cepat saji, takeaway)              │    │
│  │ ○ 🛒 Toko Retail (barcode, stok)                            │    │
│  │ ○ 🔧 Toko Bangunan (satuan, stok besar)                     │    │
│  │ ○ 👔 Fashion & Boutique (ukuran, warna)                     │    │
│  │ ○ 💇 Salon & Barbershop (booking, staff)                    │    │
│  │ ○ 🧺 Laundry (tracking item)                                │    │
│  │ ○ ⚙️  Custom (pilih fitur manual)                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Konfirmasi Fitur (jika Custom atau ingin edit)             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Fitur Aktif untuk "Toko Bangunan":                          │    │
│  │                                                              │    │
│  │ ✅ Barcode Scanner                    ✅ Manajemen Stok      │    │
│  │ ✅ Purchase Order                     ✅ Supplier            │    │
│  │ ✅ Konversi Satuan                    ✅ Harga Bertingkat    │    │
│  │ ⬜ Kitchen Display                    ⬜ Self Order QR       │    │
│  │                                                              │    │
│  │ [Edit Fitur]                          [Lanjut →]            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Setup Outlet Pertama                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Nama Outlet:    [Cabang Pusat__________]                    │    │
│  │ Alamat:         [________________]                          │    │
│  │ Timezone:       [Asia/Jakarta (WIB)___]                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  SETUP COMPLETE ✅  │
                    │  Redirect ke POS    │
                    └─────────────────────┘
```

### 3.2 Feature Settings Page

Setelah onboarding, bisnis dapat mengubah fitur kapan saja:

```
Settings → Business Settings → Fitur & Modul
┌─────────────────────────────────────────────────────────────────────┐
│  KONFIGURASI FITUR                                                  │
│  Aktifkan atau nonaktifkan fitur sesuai kebutuhan bisnis            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📦 FITUR PENJUALAN                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Kitchen Display (KDS)                                    [🔘 ON ] │
│  Tampilan dapur untuk melihat pesanan masuk                         │
├─────────────────────────────────────────────────────────────────────┤
│  Manajemen Meja                                           [⚪ OFF] │
│  Denah meja, status occupied, merge/split bill                      │
├─────────────────────────────────────────────────────────────────────┤
│  Modifier Produk                                          [🔘 ON ] │
│  Tambahkan opsi seperti ukuran, topping, level pedas                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📊 FITUR INVENTORI                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Barcode Scanner                                          [🔘 ON ] │
│  Input produk dengan scan barcode                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Konversi Satuan                                          [🔘 ON ] │
│  Beli dalam dus, jual per pcs                                       │
│  ⚠️ Memerlukan: Manajemen Stok                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Serial Number Tracking                                   [⚪ OFF] │
│  Tracking per unit produk (untuk elektronik)                        │
└─────────────────────────────────────────────────────────────────────┘

                                    [💾 Simpan Perubahan]
```

---

## 4. Database Schema

### 4.1 Business Features Table

```sql
-- Fitur yang diaktifkan per bisnis
CREATE TABLE business_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  feature_key     VARCHAR(50) NOT NULL,
  is_enabled      BOOLEAN DEFAULT true,
  enabled_at      TIMESTAMPTZ,
  disabled_at     TIMESTAMPTZ,
  
  UNIQUE(business_id, feature_key)
);

-- Index untuk query cepat
CREATE INDEX idx_business_features_business ON business_features(business_id);
CREATE INDEX idx_business_features_enabled ON business_features(business_id, is_enabled);
```

### 4.2 Business Type Field

```sql
-- Tambah kolom di tabel businesses
ALTER TABLE businesses ADD COLUMN business_type VARCHAR(30) DEFAULT 'custom';
ALTER TABLE businesses ADD COLUMN business_type_set_at TIMESTAMPTZ;

-- Enum values
-- fnb_restaurant, fnb_cafe, fnb_fastfood
-- retail_grocery, retail_fashion, retail_hardware, retail_electronics
-- service_salon, service_laundry, service_workshop
-- wholesale, custom
```

### 4.3 Feature Registry (Static Config)

```typescript
// packages/shared/src/config/features.config.ts

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: 'sales' | 'inventory' | 'marketing' | 'service' | 'advanced';
  dependencies?: string[];  // Fitur yang harus aktif
  conflicts?: string[];     // Fitur yang tidak bisa bersamaan
  defaultFor: string[];     // Business types yang default ON
  menuItems?: string[];     // Menu yang di-show/hide
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    key: 'kitchen_display',
    label: 'Kitchen Display (KDS)',
    description: 'Tampilan dapur untuk melihat pesanan masuk',
    category: 'sales',
    dependencies: ['order_management'],
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'fnb_fastfood'],
    menuItems: ['/kds', '/app/orders'],
  },
  {
    key: 'barcode_scanning',
    label: 'Barcode Scanner',
    description: 'Input produk dengan scan barcode',
    category: 'inventory',
    defaultFor: ['retail_grocery', 'retail_fashion', 'retail_hardware', 'retail_electronics'],
    menuItems: [],
  },
  // ... more features
];
```

---

## 5. UI/UX Adaptation

### 5.1 Sidebar Menu Filtering

Menu sidebar akan di-filter berdasarkan fitur yang aktif:

```typescript
// components/layout/sidebar.tsx

const useFilteredNavSections = () => {
  const enabledFeatures = useBusinessFeatures();
  
  return navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Check if this menu item requires a feature
        const requiredFeature = menuToFeatureMap[item.to];
        if (!requiredFeature) return true; // Core menu, always show
        return enabledFeatures.includes(requiredFeature);
      })
    }))
    .filter(section => section.items.length > 0);
};
```

### 5.2 POS Terminal Adaptation

POS Terminal akan berubah sesuai fitur yang aktif:

| Fitur Aktif | Perubahan di POS |
|-------------|------------------|
| `table_management` | Tampilkan "Pilih Meja" button |
| `order_types` | Tampilkan tab Dine-in/Takeaway/Delivery |
| `modifiers` | Tampilkan modifier selector saat add item |
| `barcode_scanning` | Tampilkan input barcode & camera scanner |
| `customer_loyalty` | Tampilkan poin & reward info di checkout |
| `appointments` | Tampilkan "Pilih Jadwal" untuk service |

### 5.3 Dashboard Widgets

Dashboard menampilkan widget berbeda berdasarkan business type:

**F&B Dashboard:**
- Orders in Kitchen
- Average Preparation Time
- Table Occupancy
- Popular Menu Items

**Retail Dashboard:**
- Low Stock Alerts
- Fast Moving Products
- Pending Purchase Orders
- Supplier Payments Due

**Service Dashboard:**
- Today's Appointments
- Staff Schedule
- Customer Queue
- Service Completion Rate

---

## 6. Reports Adaptation

### 6.1 Report Types per Business

| Report | F&B | Retail | Service | Description |
|--------|-----|--------|---------|-------------|
| Sales Summary | ✅ | ✅ | ✅ | Total penjualan harian/mingguan/bulanan |
| Product Performance | ✅ | ✅ | ✅ | Best seller, slow mover |
| Category Analysis | ✅ | ✅ | ✅ | Penjualan per kategori |
| Payment Methods | ✅ | ✅ | ✅ | Cash vs non-cash breakdown |
| Hourly Sales | ✅ | ✅ | ⚠️ | Peak hours analysis |
| **Kitchen Performance** | ✅ | ❌ | ❌ | Prep time, order completion |
| **Table Turnover** | ✅ | ❌ | ❌ | Rata-rata durasi makan |
| **Stock Report** | ⚠️ | ✅ | ⚠️ | Inventory valuation |
| **Purchase Report** | ⚠️ | ✅ | ❌ | PO & receiving |
| **Staff Performance** | ⚠️ | ⚠️ | ✅ | Service per karyawan |
| **Appointment Report** | ❌ | ❌ | ✅ | Booking analytics |
| **Customer Report** | ✅ | ✅ | ✅ | Customer behavior |
| **Loyalty Report** | ✅ | ✅ | ✅ | Point earning & redemption |

### 6.2 Report Page Filtering

```typescript
// features/reports/reports-page.tsx

const availableReports = useMemo(() => {
  return ALL_REPORTS.filter(report => {
    // Check if report requires specific features
    if (report.requiredFeatures) {
      return report.requiredFeatures.every(f => enabledFeatures.includes(f));
    }
    return true;
  });
}, [enabledFeatures]);
```

---

## 7. API Design

### 7.1 Feature Management Endpoints

```typescript
// GET /api/v1/business/features
// Response: List of all features with current status
{
  "features": [
    {
      "key": "kitchen_display",
      "label": "Kitchen Display (KDS)",
      "isEnabled": true,
      "category": "sales",
      "dependencies": ["order_management"]
    },
    // ...
  ]
}

// PUT /api/v1/business/features/:featureKey
// Body: { "isEnabled": true }
// Toggle specific feature

// PUT /api/v1/business/type
// Body: { "businessType": "retail_hardware" }
// Change business type and reset features to preset
```

### 7.2 Feature Check Middleware

```typescript
// Backend middleware untuk protect routes based on feature
@FeatureGuard('kitchen_display')
@Controller('kds')
export class KdsController {
  // Hanya bisa diakses jika kitchen_display enabled
}
```

---

## 8. Implementation Phases (Detailed)

### Phase 1: Database & Backend Core (Week 1)

#### 1.1 Database Schema
| Task | File | Status |
|------|------|--------|
| Create migration for business_type column | `prisma/migrations/xxx_add_business_type.sql` | ⬜ |
| Create business_features table | `prisma/migrations/xxx_create_business_features.sql` | ⬜ |
| Update Prisma schema | `prisma/schema.prisma` | ⬜ |
| Generate Prisma client | `npx prisma generate` | ⬜ |

```sql
-- Migration: add_business_type
ALTER TABLE businesses ADD COLUMN business_type VARCHAR(30) DEFAULT 'custom';
ALTER TABLE businesses ADD COLUMN business_type_set_at TIMESTAMPTZ;

-- Migration: create_business_features
CREATE TABLE business_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  feature_key     VARCHAR(50) NOT NULL,
  is_enabled      BOOLEAN DEFAULT true,
  enabled_at      TIMESTAMPTZ DEFAULT NOW(),
  disabled_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, feature_key)
);
CREATE INDEX idx_business_features_lookup ON business_features(business_id, is_enabled);
```

#### 1.2 Feature Registry (Shared Config)
| Task | File | Status |
|------|------|--------|
| Create feature definitions | `packages/shared/src/config/features.config.ts` | ⬜ |
| Create business type presets | `packages/shared/src/config/business-types.config.ts` | ⬜ |
| Export from shared | `packages/shared/src/index.ts` | ⬜ |

#### 1.3 Backend Services
| Task | File | Status |
|------|------|--------|
| Create FeatureService | `src/modules/business/services/feature.service.ts` | ⬜ |
| Create FeatureGuard decorator | `src/common/guards/feature.guard.ts` | ⬜ |
| Create BusinessTypeService | `src/modules/business/services/business-type.service.ts` | ⬜ |
| Update BusinessModule | `src/modules/business/business.module.ts` | ⬜ |

#### 1.4 Backend API Endpoints
| Task | Endpoint | Method | Status |
|------|----------|--------|--------|
| Get all features | `/api/v1/business/features` | GET | ⬜ |
| Toggle feature | `/api/v1/business/features/:key` | PUT | ⬜ |
| Bulk update features | `/api/v1/business/features/bulk` | PUT | ⬜ |
| Get business type | `/api/v1/business/type` | GET | ⬜ |
| Set business type | `/api/v1/business/type` | PUT | ⬜ |
| Get feature presets | `/api/v1/business/types/presets` | GET | ⬜ |

**Phase 1 Deliverables:**
- ✅ Database siap dengan tabel business_features
- ✅ API endpoint untuk manage features
- ✅ Feature guard middleware
- ✅ Business type presets tersedia

---

### Phase 2: Frontend Feature Store & Sidebar (Week 2)

#### 2.1 Feature Store & Hooks
| Task | File | Status |
|------|------|--------|
| Create feature store | `packages/web/src/stores/feature.store.ts` | ⬜ |
| Create useBusinessFeatures hook | `packages/web/src/hooks/use-business-features.ts` | ⬜ |
| Create useFeatureFlag hook | `packages/web/src/hooks/use-feature-flag.ts` | ⬜ |
| Add API functions | `packages/web/src/lib/api/business.api.ts` | ⬜ |

```typescript
// Example: useFeatureFlag hook
export function useFeatureFlag(featureKey: string): boolean {
  const features = useFeatureStore((s) => s.enabledFeatures);
  return features.includes(featureKey);
}

// Usage in component
const hasKds = useFeatureFlag('kitchen_display');
if (!hasKds) return null;
```

#### 2.2 Sidebar Menu Filtering
| Task | File | Status |
|------|------|--------|
| Add feature mapping to nav items | `packages/web/src/components/layout/sidebar.tsx` | ⬜ |
| Create menu-to-feature map | `packages/web/src/config/menu-features.config.ts` | ⬜ |
| Implement useFilteredNavSections | `packages/web/src/components/layout/sidebar.tsx` | ⬜ |
| Add loading state for features | `packages/web/src/components/layout/sidebar.tsx` | ⬜ |

```typescript
// Menu-to-Feature mapping
export const MENU_FEATURE_MAP: Record<string, string> = {
  '/kds': 'kitchen_display',
  '/app/orders': 'order_management',
  '/app/tables': 'table_management',
  '/app/waiting-list': 'waiting_list',
  '/app/ingredients': 'ingredient_tracking',
  '/app/inventory/stock': 'stock_management',
  '/app/inventory/transfers': 'stock_transfer',
  '/app/inventory/suppliers': 'supplier_management',
  '/app/inventory/purchase-orders': 'purchase_orders',
  '/app/self-order': 'self_order_qr',
  '/app/online-store': 'online_store',
  '/app/loyalty': 'customer_loyalty',
  '/app/settings/modifiers': 'modifiers',
};
```

#### 2.3 Feature Settings Page
| Task | File | Status |
|------|------|--------|
| Create FeatureSettingsPage | `packages/web/src/features/settings/feature-settings-page.tsx` | ⬜ |
| Create FeatureToggleCard component | `packages/web/src/features/settings/components/feature-toggle-card.tsx` | ⬜ |
| Create FeatureCategorySection | `packages/web/src/features/settings/components/feature-category-section.tsx` | ⬜ |
| Add route | `packages/web/src/router.tsx` | ⬜ |
| Add menu item | `packages/web/src/components/layout/sidebar.tsx` | ⬜ |

**Phase 2 Deliverables:**
- ✅ Sidebar menu dinamis berdasarkan features
- ✅ Feature Settings page functional
- ✅ Toggle feature instant update (no refresh)

---

### Phase 3: POS Terminal & Dashboard Adaptation (Week 3)

#### 3.1 POS Terminal Conditional UI
| Task | File | Status |
|------|------|--------|
| Add feature checks to POS | `packages/web/src/features/pos/pos-page.tsx` | ⬜ |
| Conditional table selector | `packages/web/src/features/pos/components/table-selector.tsx` | ⬜ |
| Conditional order type tabs | `packages/web/src/features/pos/components/order-type-selector.tsx` | ⬜ |
| Conditional barcode input | `packages/web/src/features/pos/components/barcode-input.tsx` | ⬜ |
| Conditional modifier panel | `packages/web/src/features/pos/components/modifier-panel.tsx` | ⬜ |

```tsx
// POS Page with feature flags
export function POSPage() {
  const hasTableManagement = useFeatureFlag('table_management');
  const hasOrderTypes = useFeatureFlag('order_types');
  const hasBarcode = useFeatureFlag('barcode_scanning');
  const hasModifiers = useFeatureFlag('modifiers');

  return (
    <div>
      {hasBarcode && <BarcodeInput />}
      {hasTableManagement && <TableSelector />}
      {hasOrderTypes && <OrderTypeTabs />}
      {/* ... */}
    </div>
  );
}
```

#### 3.2 Dashboard Widget Filtering
| Task | File | Status |
|------|------|--------|
| Create widget-feature map | `packages/web/src/features/dashboard/config/widgets.config.ts` | ⬜ |
| Update DashboardPage | `packages/web/src/features/dashboard/dashboard-page.tsx` | ⬜ |
| Create F&B widgets | `packages/web/src/features/dashboard/widgets/fnb/` | ⬜ |
| Create Retail widgets | `packages/web/src/features/dashboard/widgets/retail/` | ⬜ |
| Create Service widgets | `packages/web/src/features/dashboard/widgets/service/` | ⬜ |

**Widget Examples:**
```typescript
export const DASHBOARD_WIDGETS = [
  // F&B Widgets
  { id: 'orders_in_kitchen', requiredFeature: 'kitchen_display', component: OrdersInKitchen },
  { id: 'table_occupancy', requiredFeature: 'table_management', component: TableOccupancy },
  { id: 'avg_prep_time', requiredFeature: 'kitchen_display', component: AvgPrepTime },
  
  // Retail Widgets
  { id: 'low_stock_alerts', requiredFeature: 'stock_management', component: LowStockAlerts },
  { id: 'pending_pos', requiredFeature: 'purchase_orders', component: PendingPOs },
  
  // Service Widgets
  { id: 'today_appointments', requiredFeature: 'appointments', component: TodayAppointments },
  { id: 'staff_schedule', requiredFeature: 'staff_assignment', component: StaffSchedule },
  
  // Universal Widgets (no feature required)
  { id: 'sales_today', component: SalesToday },
  { id: 'top_products', component: TopProducts },
];
```

#### 3.3 Backend Feature Guards
| Task | File | Status |
|------|------|--------|
| Apply guard to KDS Controller | `src/modules/kds/kds.controller.ts` | ⬜ |
| Apply guard to Orders Controller | `src/modules/orders/orders.controller.ts` | ⬜ |
| Apply guard to Tables Controller | `src/modules/tables/tables.controller.ts` | ⬜ |
| Apply guard to Ingredients Controller | `src/modules/ingredients/ingredients.controller.ts` | ⬜ |
| Apply guard to Self-Order Controller | `src/modules/self-order/self-order.controller.ts` | ⬜ |

```typescript
// Example: KDS Controller with Feature Guard
@Controller('kds')
@UseGuards(AuthGuard, FeatureGuard)
@RequireFeature('kitchen_display')
export class KdsController {
  // All routes require kitchen_display feature
}
```

**Phase 3 Deliverables:**
- ✅ POS Terminal adapts to enabled features
- ✅ Dashboard shows relevant widgets only
- ✅ Backend routes protected by feature guards

---

### Phase 4: Onboarding & Business Type Selection (Week 4)

#### 4.1 Onboarding Wizard Updates
| Task | File | Status |
|------|------|--------|
| Create BusinessTypeStep | `packages/web/src/features/onboarding/steps/business-type-step.tsx` | ⬜ |
| Create FeatureConfirmStep | `packages/web/src/features/onboarding/steps/feature-confirm-step.tsx` | ⬜ |
| Update OnboardingWizard | `packages/web/src/features/onboarding/onboarding-wizard.tsx` | ⬜ |
| Create BusinessTypeCard | `packages/web/src/features/onboarding/components/business-type-card.tsx` | ⬜ |
| Add onboarding API | `packages/web/src/lib/api/onboarding.api.ts` | ⬜ |

#### 4.2 Business Type Cards UI
```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│     🍽️ Restoran      │  │    ☕ Cafe/Coffee    │  │    🛒 Retail         │
│                      │  │                      │  │                      │
│  Full-service dining │  │  Quick service F&B   │  │  Barcode & inventory │
│  dengan KDS & meja   │  │  takeaway focused    │  │  focused             │
│                      │  │                      │  │                      │
│  ○ Table Management  │  │  ○ Kitchen Display   │  │  ○ Barcode Scanner   │
│  ○ Kitchen Display   │  │  ○ Self Order QR     │  │  ○ Stock Management  │
│  ○ Order Management  │  │  ○ Modifiers         │  │  ○ Purchase Orders   │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

#### 4.3 Feature Editing Modal
| Task | File | Status |
|------|------|--------|
| Create FeatureEditModal | `packages/web/src/features/onboarding/components/feature-edit-modal.tsx` | ⬜ |
| Create FeatureCheckbox | `packages/web/src/features/onboarding/components/feature-checkbox.tsx` | ⬜ |
| Handle dependency warnings | Show warning jika disable fitur yang required | ⬜ |

#### 4.4 Migration Prompt (Existing Users)
| Task | File | Status |
|------|------|--------|
| Create MigrationPromptModal | `packages/web/src/components/modals/business-type-migration-modal.tsx` | ✅ |
| Add check in App.tsx | `packages/web/src/components/layout/app-layout.tsx` | ✅ |
| Store "prompted" flag | `localStorage` | ✅ |

**Phase 4 Deliverables:**
- ✅ New user can select business type during onboarding
- ✅ User can customize features before completing setup
- ✅ Existing users prompted to select business type

---

### Phase 5: Reports & Analytics Adaptation (Week 5)

#### 5.1 Report Filtering
| Task | File | Status |
|------|------|--------|
| Add requiredFeature to reports config | `packages/web/src/features/reports/config/reports.config.ts` | ⬜ |
| Update ReportsPage | `packages/web/src/features/reports/reports-page.tsx` | ⬜ |
| Filter report list | Based on enabled features | ⬜ |

```typescript
// Reports config with feature requirements
export const REPORTS_CONFIG = [
  // Universal Reports
  { id: 'sales_summary', label: 'Ringkasan Penjualan', icon: BarChart },
  { id: 'product_performance', label: 'Performa Produk', icon: Package },
  { id: 'payment_methods', label: 'Metode Pembayaran', icon: CreditCard },
  
  // F&B Reports
  { id: 'kitchen_performance', label: 'Performa Dapur', icon: ChefHat, 
    requiredFeature: 'kitchen_display' },
  { id: 'table_turnover', label: 'Table Turnover', icon: Table, 
    requiredFeature: 'table_management' },
  
  // Retail Reports
  { id: 'stock_report', label: 'Laporan Stok', icon: Warehouse, 
    requiredFeature: 'stock_management' },
  { id: 'purchase_report', label: 'Laporan Pembelian', icon: Truck, 
    requiredFeature: 'purchase_orders' },
  { id: 'supplier_report', label: 'Laporan Supplier', icon: Building, 
    requiredFeature: 'supplier_management' },
  
  // Service Reports
  { id: 'appointment_report', label: 'Laporan Booking', icon: Calendar, 
    requiredFeature: 'appointments' },
  { id: 'staff_performance', label: 'Performa Staff', icon: Users, 
    requiredFeature: 'staff_assignment' },
];
```

#### 5.2 New Reports for Different Business Types
| Report | For Business Type | Status |
|--------|------------------|--------|
| Stock Valuation Report (InventoryReport) | Retail, Hardware | ✅ |
| Supplier Payment Due | Retail, Hardware | ⬜ |
| Unit Conversion Summary | Hardware | ⬜ |
| Appointment Analytics (AppointmentReport) | Service | ✅ |
| Staff Commission Report (StaffReport) | Service | ✅ |
| Recipe Cost Analysis | F&B | ⬜ |
| Kitchen Performance (KitchenReport) | F&B | ✅ |
| Table Turnover (TableReport) | F&B | ✅ |

#### 5.3 Report Export with Business Context
| Task | File | Status |
|------|------|--------|
| Add business type to report header | Report templates | ⬜ |
| Export only relevant columns | Based on features | ⬜ |

#### 5.4 Implemented Report Components
| Component | For Business Type | Status |
|-----------|------------------|--------|
| InventoryReport | Retail | ✅ |
| KitchenReport | F&B | ✅ |
| TableReport | F&B | ✅ |
| StaffReport | Service | ✅ |
| AppointmentReport | Service | ✅ |

**Phase 5 Deliverables:**
- ✅ Reports page shows only relevant reports
- ✅ New specialized reports per business type
- ⬜ Export includes business type context

---

### Phase 6: Testing & Polish (Week 6)

#### 6.1 Unit Tests
| Test | File | Status |
|------|------|--------|
| FeatureService tests | `src/modules/business/services/__tests__/feature.service.spec.ts` | ⬜ |
| FeatureGuard tests | `src/common/guards/__tests__/feature.guard.spec.ts` | ⬜ |
| useFeatureFlag hook tests | `packages/web/src/hooks/__tests__/use-feature-flag.test.ts` | ⬜ |
| Sidebar filtering tests | `packages/web/src/components/layout/__tests__/sidebar.test.tsx` | ⬜ |

#### 6.2 E2E Tests
| Test Scenario | Status |
|---------------|--------|
| Onboarding with Restoran type → correct features enabled | ⬜ |
| Onboarding with Retail type → KDS menu hidden | ⬜ |
| Toggle feature → sidebar updates immediately | ⬜ |
| Change business type → features reset to preset | ⬜ |
| POS adapts correctly for F&B vs Retail | ⬜ |

#### 6.3 Combination Testing Matrix
Test semua kombinasi business type untuk memastikan tidak ada bug:

| Business Type | Test Areas | Status |
|---------------|------------|--------|
| fnb_restaurant | KDS, Tables, Orders, Modifiers, Ingredients | ⬜ |
| fnb_cafe | KDS, Orders, Modifiers, Self-Order | ⬜ |
| retail_grocery | Barcode, Stock, Suppliers, PO | ⬜ |
| retail_hardware | Barcode, Stock, Unit Conversion, Price Tiers | ⬜ |
| retail_fashion | Barcode, Stock, Variants | ⬜ |
| service_salon | Appointments, Staff Assignment | ⬜ |
| custom | Mixed features, edge cases | ⬜ |

#### 6.4 Performance Testing
| Test | Target | Status |
|------|--------|--------|
| Feature check latency | < 5ms | ⬜ |
| Sidebar render with filtering | < 100ms | ⬜ |
| Dashboard load with widgets | < 500ms | ⬜ |

**Phase 6 Deliverables:**
- ✅ All unit tests passing
- ✅ E2E tests for all business types
- ✅ Performance benchmarks met

---

### Phase 7: Documentation & Release (Week 7)

#### 7.1 User Documentation
| Document | Status |
|----------|--------|
| Getting Started Guide per Business Type | ⬜ |
| Feature Toggle How-To | ⬜ |
| FAQ: Choosing Business Type | ⬜ |
| Video Tutorial: Setup Business | ⬜ |

#### 7.2 Developer Documentation
| Document | Status |
|----------|--------|
| Adding New Features Guide | ⬜ |
| Feature Guard Usage | ⬜ |
| Business Type Preset Guide | ⬜ |
| API Documentation Update | ⬜ |

#### 7.3 Release Checklist
| Task | Status |
|------|--------|
| Database migration tested on staging | ⬜ |
| Feature flags deployed | ⬜ |
| Rollback plan documented | ⬜ |
| Analytics tracking added | ⬜ |
| Error monitoring configured | ⬜ |
| Release notes written | ⬜ |

**Phase 7 Deliverables:**
- ✅ Complete user documentation
- ✅ Developer documentation updated
- ✅ Production-ready release

---

## 8.1 Timeline Summary

```
Week 1: ████████████████████░░░░░░░░░░░░░░░░░░░░ Phase 1 - Database & Backend
Week 2: ░░░░░░░░░░░░░░░░░░░░████████████████████ Phase 2 - Frontend Store
Week 3: ░░░░░░░░░░░░░░░░░░░░████████████████████ Phase 3 - POS & Dashboard
Week 4: ░░░░░░░░░░░░░░░░░░░░████████████████████ Phase 4 - Onboarding
Week 5: ░░░░░░░░░░░░░░░░░░░░████████████████████ Phase 5 - Reports
Week 6: ░░░░░░░░░░░░░░░░░░░░████████████████████ Phase 6 - Testing
Week 7: ░░░░░░░░░░░░░░░░░░░░████████████████████ Phase 7 - Documentation
```

## 8.2 Dependencies Between Phases

```
Phase 1 (Backend) ──┬──> Phase 2 (Frontend Store)
                    │
                    └──> Phase 3 (POS & Dashboard) ──> Phase 4 (Onboarding)
                                                            │
                                                            ▼
                                                    Phase 5 (Reports)
                                                            │
                                                            ▼
                                                    Phase 6 (Testing)
                                                            │
                                                            ▼
                                                    Phase 7 (Release)
```

---

## 9. Migration Strategy

Untuk bisnis yang sudah exist:

1. **Default to `custom`** - Existing businesses akan di-set ke `custom` type
2. **Enable all** - Semua fitur akan di-enable by default
3. **Prompt to optimize** - Tampilkan prompt untuk memilih business type saat login pertama kali setelah update

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Onboarding completion rate | > 90% |
| Feature toggle usage | > 30% businesses customize |
| Support tickets (wrong features) | < 5% |
| User satisfaction | > 4.5/5 |

---

*Document Version: 1.0*  
*Last Updated: 2026-02-08*  
*Author: AI Assistant*
