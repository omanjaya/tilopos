# Business Templates & Guided Setup

> Design doc untuk sistem template bisnis dan guided onboarding pengguna baru TiloPOS.

## 1. Problem

Pengguna baru register → masuk dashboard kosong → bingung harus mulai dari mana. Mereka harus manual setup: tambah produk satu-satu, atur kategori, payment method, pajak, dll. Proses ini memakan waktu dan membuat banyak user drop-off sebelum transaksi pertama.

## 2. Goal

**Pengguna baru bisa transaksi pertama dalam < 5 menit setelah register.**

- Pilih tipe bisnis → dapat template yang relevan
- Guided wizard memandu setup essentials step-by-step
- Data template langsung siap pakai, tinggal edit sesuai kebutuhan
- Independent per outlet — data template menjadi milik outlet setelah di-apply

## 3. User Flow

```
Register (email + PIN)
    │
    ▼
┌─────────────────────────┐
│  Step 1: Profil Bisnis   │  Nama toko, alamat, no. telp, logo
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 2: Tipe Bisnis     │  Pilih dari 12 preset (card grid)
│                          │  → Auto-enable fitur sesuai tipe
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 3: Pilih Template  │  Checklist data yang mau di-apply:
│                          │  ☑ Kategori produk (Makanan, Minuman, ...)
│                          │  ☑ Produk contoh (10 item populer)
│                          │  ☑ Modifier (Level gula, Es, Ukuran)
│                          │  ☑ Satuan (pcs, porsi, kg, ...)
│                          │  ☐ Meja contoh (10 meja)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 4: Pembayaran      │  Centang metode yang diterima:
│                          │  ☑ Tunai
│                          │  ☑ QRIS
│                          │  ☐ Transfer Bank
│                          │  ☐ Kartu Debit/Kredit
│                          │  + Atur pajak (PPN 11%)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 5: Karyawan        │  Tambah minimal 1 kasir (opsional, bisa skip)
│                          │  Nama, email, PIN
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 6: Selesai! 🎉     │  Ringkasan setup
│                          │  [Buka Dashboard] [Langsung ke POS]
└─────────────────────────┘
```

## 4. Business Type Templates

### 4.1 Tipe Bisnis yang Didukung

Mengacu pada `docs/10-BUSINESS-TYPE-CONFIGURATION.md`, 12 preset:

| Code | Label | Template Tersedia |
|------|-------|-------------------|
| `fnb_restaurant` | Restoran | Kategori, produk, modifier, meja, satuan |
| `fnb_cafe` | Kafe | Kategori, produk, modifier, satuan |
| `fnb_fastfood` | Fast Food | Kategori, produk, modifier, satuan |
| `retail_grocery` | Toko Kelontong | Kategori, produk, satuan |
| `retail_fashion` | Toko Fashion | Kategori, produk, modifier (ukuran), satuan |
| `retail_hardware` | Toko Bangunan | Kategori, produk, satuan |
| `retail_electronics` | Toko Elektronik | Kategori, produk, satuan |
| `service_salon` | Salon & Barbershop | Kategori, layanan, satuan |
| `service_laundry` | Laundry | Kategori, layanan, satuan |
| `service_workshop` | Bengkel | Kategori, layanan + produk, satuan |
| `wholesale` | Grosir | Kategori, produk, satuan, price tiers |
| `custom` | Kustom | Tidak ada template, user setup manual |

### 4.2 Struktur Template Data

Setiap tipe bisnis punya JSON template file:

```
packages/backend/src/infrastructure/database/templates/
├── fnb_restaurant.json
├── fnb_cafe.json
├── fnb_fastfood.json
├── retail_grocery.json
├── retail_fashion.json
├── retail_hardware.json
├── retail_electronics.json
├── service_salon.json
├── service_laundry.json
├── service_workshop.json
└── wholesale.json
```

### 4.3 Template Schema

```jsonc
{
  "type": "fnb_restaurant",
  "label": "Restoran",
  "description": "Template untuk restoran, rumah makan, warung makan",

  "categories": [
    { "name": "Makanan", "sortOrder": 1 },
    { "name": "Minuman", "sortOrder": 2 },
    { "name": "Snack & Dessert", "sortOrder": 3 },
    { "name": "Paket Hemat", "sortOrder": 4 }
  ],

  "products": [
    {
      "name": "Nasi Goreng",
      "category": "Makanan",
      "price": 25000,
      "unit": "porsi",
      "type": "product"        // "product" | "service"
    },
    {
      "name": "Es Teh Manis",
      "category": "Minuman",
      "price": 8000,
      "unit": "gelas",
      "type": "product"
    }
    // ... 10-20 produk contoh per template
  ],

  "modifierGroups": [
    {
      "name": "Level Pedas",
      "required": false,
      "maxSelect": 1,
      "options": [
        { "name": "Tidak Pedas", "price": 0 },
        { "name": "Pedas", "price": 0 },
        { "name": "Ekstra Pedas", "price": 2000 }
      ]
    },
    {
      "name": "Topping",
      "required": false,
      "maxSelect": 3,
      "options": [
        { "name": "Telur Ceplok", "price": 5000 },
        { "name": "Kerupuk", "price": 2000 }
      ]
    }
  ],

  "units": ["porsi", "gelas", "pcs", "mangkok"],

  "tables": [
    { "name": "Meja 1", "capacity": 4 },
    { "name": "Meja 2", "capacity": 4 },
    { "name": "Meja 3", "capacity": 2 },
    { "name": "Meja 4", "capacity": 6 },
    { "name": "Meja 5", "capacity": 8 }
  ],

  "paymentMethods": ["cash", "qris"],

  "taxRate": 11     // PPN 11% (opsional, bisa 0)
}
```

### 4.4 Contoh Template per Tipe

#### Restoran (`fnb_restaurant`)
- **Kategori**: Makanan, Minuman, Snack & Dessert, Paket Hemat
- **Produk**: Nasi Goreng, Mie Goreng, Ayam Bakar, Es Teh, Jus Jeruk, dll (15 item)
- **Modifier**: Level Pedas, Topping, Level Es, Level Gula
- **Meja**: Meja 1-10
- **Satuan**: porsi, gelas, pcs, mangkok

#### Kafe (`fnb_cafe`)
- **Kategori**: Kopi, Non-Kopi, Makanan Ringan, Pastry
- **Produk**: Americano, Latte, Cappuccino, Matcha, Croissant, dll (15 item)
- **Modifier**: Ukuran (Small/Medium/Large), Susu (Regular/Oat/Almond), Shot Espresso, Topping
- **Meja**: Meja 1-8
- **Satuan**: cup, pcs

#### Toko Fashion (`retail_fashion`)
- **Kategori**: Atasan, Bawahan, Outerwear, Aksesoris, Sepatu
- **Produk**: Kaos Polos, Kemeja, Celana Jeans, Jaket, Topi, dll (12 item)
- **Modifier**: Ukuran (S/M/L/XL/XXL), Warna
- **Satuan**: pcs

#### Salon (`service_salon`)
- **Kategori**: Potong Rambut, Perawatan, Styling, Manicure & Pedicure
- **Produk** (type=service): Potong Pria, Potong Wanita, Creambath, Smoothing, Cat Rambut, dll (10 item)
- **Satuan**: layanan

#### Laundry (`service_laundry`)
- **Kategori**: Cuci Regular, Cuci Express, Dry Clean, Setrika
- **Produk** (type=service): Cuci Reguler/kg, Cuci Express/kg, Dry Clean/pcs, Setrika/pcs, dll (8 item)
- **Satuan**: kg, pcs

## 5. Backend Implementation

### 5.1 API Endpoints

```
POST   /api/v1/templates/apply
GET    /api/v1/templates/:typeCode          — preview template content
GET    /api/v1/templates                    — list all available templates
POST   /api/v1/onboarding/setup             — complete guided setup (all-in-one)
```

### 5.2 Apply Template Endpoint

```
POST /api/v1/templates/apply
Authorization: Bearer <token>

{
  "outletId": "uuid",              // outlet target
  "typeCode": "fnb_restaurant",
  "sections": {                     // user pilih mana yang di-apply
    "categories": true,
    "products": true,
    "modifiers": true,
    "tables": true,
    "units": true
  }
}
```

**Response:**
```json
{
  "applied": {
    "categories": 4,
    "products": 15,
    "modifierGroups": 3,
    "tables": 10,
    "units": 4
  }
}
```

### 5.3 Guided Setup Endpoint (All-in-One)

Dipakai oleh onboarding wizard — satu request untuk semua step:

```
POST /api/v1/onboarding/setup
Authorization: Bearer <token>

{
  "business": {
    "name": "Warung Pak Joko",
    "phone": "08123456789",
    "address": "Jl. Sudirman No. 1"
  },
  "businessType": "fnb_restaurant",
  "template": {
    "sections": {
      "categories": true,
      "products": true,
      "modifiers": true,
      "tables": false,
      "units": true
    }
  },
  "paymentMethods": ["cash", "qris"],
  "taxRate": 11,
  "employee": {                      // opsional
    "name": "Kasir 1",
    "email": "kasir1@warung.com",
    "pin": "123456",
    "role": "cashier"
  }
}
```

**Backend flow:**
1. Update business profile + set businessType
2. Enable fitur sesuai tipe bisnis (insert `BusinessFeature` records)
3. Load template JSON, create selected data (categories, products, modifiers, dll)
4. Set payment methods + tax
5. Create employee (if provided)
6. Mark onboarding as completed

### 5.4 Service Layer

```
packages/backend/src/modules/templates/
├── templates.module.ts
├── templates.controller.ts
├── templates.service.ts
└── dto/
    ├── apply-template.dto.ts
    └── guided-setup.dto.ts
```

`TemplatesService`:
- `getTemplates()` — list all template metadata
- `getTemplate(typeCode)` — load full template JSON
- `applyTemplate(outletId, typeCode, sections)` — apply to outlet
- `guidedSetup(businessId, dto)` — all-in-one onboarding

### 5.5 Data Independence

Template data di-copy ke tabel existing (bukan tabel baru):
- `categories` → INSERT ke `Category` table
- `products` → INSERT ke `Product` table + `OutletProduct` junction
- `modifiers` → INSERT ke `ModifierGroup` + `ModifierOption`
- `tables` → INSERT ke `Table` table

Setelah apply, data milik outlet sepenuhnya. Tidak ada referensi balik ke template.

## 6. Frontend Implementation

### 6.1 Enhanced Onboarding Wizard

Modifikasi `packages/web/src/features/onboarding/onboarding-wizard.tsx`:

```
packages/web/src/features/onboarding/
├── onboarding-wizard.tsx            ← Modify: tambah steps
├── onboarding-provider.tsx          ← Existing
├── use-onboarding.ts                ← Existing
└── steps/
    ├── welcome-step.tsx             ← Existing (keep)
    ├── business-step.tsx            ← Existing (integrate ke wizard)
    ├── outlet-step.tsx              ← Existing (integrate ke wizard)
    ├── business-type-step.tsx       ← NEW: card grid pilih tipe bisnis
    ├── template-step.tsx            ← NEW: checklist template data
    ├── payment-step.tsx             ← NEW: payment methods + tax
    ├── employee-step.tsx            ← NEW: tambah kasir pertama
    └── complete-step.tsx            ← NEW: ringkasan + CTA
```

### 6.2 Business Type Selection (Step 2)

Card grid dengan icon + deskripsi per tipe bisnis:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🍽️ Restoran  │  │  ☕ Kafe      │  │  🍔 Fast Food │
│  Rumah makan, │  │  Coffee shop,│  │  Burger, ayam │
│  warung, dll  │  │  kedai kopi  │  │  goreng, dll  │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🛒 Kelontong │  │  👕 Fashion  │  │  🔧 Bangunan  │
│  Toko, mini-  │  │  Baju, sepatu│  │  Material,    │
│  market       │  │  aksesoris   │  │  perkakas     │
└──────────────┘  └──────────────┘  └──────────────┘
         ...            ...              ...
```

### 6.3 Template Selection (Step 3)

Preview + checklist apa yang mau di-apply:

```
Template Restoran                          [Preview]
─────────────────────────────────────────────
☑ Kategori produk (4 kategori)
    Makanan, Minuman, Snack & Dessert, Paket Hemat

☑ Produk contoh (15 produk)
    Nasi Goreng, Mie Goreng, Ayam Bakar, ...

☑ Modifier (3 grup)
    Level Pedas, Topping, Level Es

☑ Satuan (4 unit)
    porsi, gelas, pcs, mangkok

☐ Meja contoh (10 meja)
    Meja 1-10
```

### 6.4 State Management

Wizard state disimpan di Zustand store (persist ke localStorage agar tidak hilang kalau refresh):

```typescript
interface OnboardingSetupState {
  currentStep: number;
  business: { name: string; phone: string; address: string } | null;
  businessType: string | null;
  templateSections: {
    categories: boolean;
    products: boolean;
    modifiers: boolean;
    tables: boolean;
    units: boolean;
  };
  paymentMethods: string[];
  taxRate: number;
  employee: { name: string; email: string; pin: string } | null;
}
```

### 6.5 Kapan Wizard Ditampilkan

- **User baru** (setelah register) → otomatis tampil, tidak bisa skip
- **User existing** yang belum complete onboarding → tampil saat login pertama
- **User existing** yang sudah complete → tidak tampil, bisa buka via Help button
- **Buat outlet baru** → tampil Step 2-3 saja (pilih tipe + template)

## 7. Database Changes

### 7.1 Table Baru: `business_templates` (opsional, Phase 2)

Untuk phase 1, template disimpan sebagai JSON files di backend. Phase 2 bisa pindah ke database untuk admin management.

```sql
CREATE TABLE business_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code   VARCHAR(50) UNIQUE NOT NULL,    -- "fnb_restaurant"
  label       VARCHAR(100) NOT NULL,          -- "Restoran"
  description TEXT,
  icon        VARCHAR(50),                     -- emoji atau icon name
  template    JSONB NOT NULL,                  -- full template data
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Tracking: `onboarding_progress`

Track progress onboarding user:

```sql
ALTER TABLE businesses ADD COLUMN onboarding_step INT DEFAULT 0;
ALTER TABLE businesses ADD COLUMN onboarding_data JSONB DEFAULT '{}';
```

## 8. Implementation Phases

### Phase 1 — Template Engine (Backend)
**Scope:** Template JSON files + apply API + preview API
**Files:**
- `packages/backend/src/infrastructure/database/templates/*.json` (11 files)
- `packages/backend/src/modules/templates/` (module, controller, service, DTOs)
- Migration: add `onboarding_step` + `onboarding_data` to businesses

**Deliverable:** `POST /api/v1/templates/apply` bisa apply template ke outlet

### Phase 2 — Guided Onboarding Wizard (Frontend)
**Scope:** Enhanced wizard dengan 6 steps
**Files:**
- `packages/web/src/features/onboarding/onboarding-wizard.tsx` (modify)
- `packages/web/src/features/onboarding/steps/` (4 new step components)
- `packages/web/src/features/onboarding/onboarding-setup.store.ts` (new)

**Deliverable:** User baru bisa complete setup via guided wizard

### Phase 3 — Guided Setup API (Backend)
**Scope:** All-in-one `POST /api/v1/onboarding/setup` endpoint
**Files:**
- `packages/backend/src/modules/onboarding/` (new module)

**Deliverable:** Single API call untuk complete semua onboarding steps

### Phase 4 — Template saat Buat Outlet Baru
**Scope:** Integrate template selection ke create outlet flow
**Files:**
- `packages/web/src/features/settings/outlets/` (modify create outlet page)

**Deliverable:** Buat outlet baru → pilih tipe → apply template

## 9. Template Data Examples

### `fnb_restaurant.json` (ringkasan)

| Data | Jumlah | Contoh |
|------|--------|--------|
| Kategori | 4 | Makanan, Minuman, Snack, Paket Hemat |
| Produk | 15 | Nasi Goreng (25k), Ayam Bakar (35k), Es Teh (8k), ... |
| Modifier | 4 | Level Pedas, Topping, Level Es, Level Gula |
| Meja | 10 | Meja 1-10, kapasitas 2-8 orang |
| Satuan | 4 | porsi, gelas, pcs, mangkok |

### `retail_fashion.json` (ringkasan)

| Data | Jumlah | Contoh |
|------|--------|--------|
| Kategori | 5 | Atasan, Bawahan, Outerwear, Aksesoris, Sepatu |
| Produk | 12 | Kaos Polos (89k), Kemeja (150k), Celana Jeans (250k), ... |
| Modifier | 2 | Ukuran (S/M/L/XL/XXL), Warna |
| Satuan | 1 | pcs |

### `service_salon.json` (ringkasan)

| Data | Jumlah | Contoh |
|------|--------|--------|
| Kategori | 4 | Potong Rambut, Perawatan, Styling, Nail |
| Produk | 10 | Potong Pria (35k), Creambath (75k), Smoothing (200k), ... |
| Satuan | 1 | layanan |

## 10. Verification Checklist

### Phase 1 (Backend)
- [ ] `GET /api/v1/templates` returns 11 templates
- [ ] `GET /api/v1/templates/fnb_restaurant` returns full template preview
- [ ] `POST /api/v1/templates/apply` creates categories + products di database
- [ ] Data yang di-create benar-benar independent (no template reference)
- [ ] Partial apply works (hanya categories tanpa products)

### Phase 2 (Frontend)
- [ ] Register → wizard otomatis tampil
- [ ] Step 1: isi profil bisnis → data tersimpan
- [ ] Step 2: pilih tipe bisnis → card selected
- [ ] Step 3: preview template → checklist bisa toggle
- [ ] Step 4: payment methods → centang yang mau
- [ ] Step 5: tambah kasir (opsional, bisa skip)
- [ ] Step 6: complete → data ter-apply, redirect ke dashboard/POS
- [ ] Refresh di tengah wizard → progress tidak hilang
- [ ] User existing → wizard tidak tampil ulang

### Phase 3 (All-in-One API)
- [ ] `POST /api/v1/onboarding/setup` creates semua data dalam 1 transaction
- [ ] Rollback jika gagal di tengah (atomic)
- [ ] Business type + features ter-set
- [ ] Onboarding marked complete

### Phase 4 (New Outlet)
- [ ] Create outlet → pilih tipe → apply template
- [ ] Template data hanya untuk outlet baru (tidak affect outlet lain)
