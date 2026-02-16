# TiloPOS API Integration Test Plan

Dokumen ini berisi rencana lengkap API integration testing untuk memastikan semua fitur yang saling terhubung bekerja dengan benar.

## Daftar Isi

- [Overview](#overview)
- [Dependency Map](#dependency-map)
- [Test Levels & Urutan Eksekusi](#test-levels--urutan-eksekusi)
- [Test Suites](#test-suites)
  - [Suite 0: Auth](#suite-0-auth)
  - [Suite 1: Master Data](#suite-1-master-data)
  - [Suite 2: Inventory & Stock Setup](#suite-2-inventory--stock-setup)
  - [Suite 3: POS Transaksi](#suite-3-pos-transaksi)
  - [Suite 4: Dashboard & Reports](#suite-4-dashboard--reports)
  - [Suite 5: Refund & Void](#suite-5-refund--void)
  - [Suite 6: KDS & Table Flow](#suite-6-kds--table-flow)
  - [Suite 7: Loyalty & Customer](#suite-7-loyalty--customer)
  - [Suite 8: Promotion & Voucher](#suite-8-promotion--voucher)
  - [Suite 9: Stock Transfer](#suite-9-stock-transfer)
  - [Suite 10: Shift & Settlement](#suite-10-shift--settlement)
  - [Suite 11: Bundle Package](#suite-11-bundle-package)
  - [Suite 12: Ingredients & Recipe](#suite-12-ingredients--recipe)
  - [Suite 13: Self-Order](#suite-13-self-order)
  - [Suite 14: Online Store](#suite-14-online-store)
- [Event Chain Reactions](#event-chain-reactions)
- [Shared Test Data](#shared-test-data)
- [Tracking Checklist](#tracking-checklist)

---

## Overview

**Tipe test:** API Integration Test (tanpa browser, langsung hit endpoint)
**Tool:** Jest (packages/backend)
**Base URL:** `http://localhost:3001/api/v1`
**Autentikasi:** JWT Bearer token dari `POST /auth/login`

### Prinsip

1. Test menggunakan **real database** (test database terpisah)
2. Setiap suite punya **setup** (seed data) dan **teardown** (cleanup)
3. Urutan eksekusi berdasarkan **dependency level** — level rendah jalan duluan
4. Setiap transaksi diverifikasi **side effect**-nya (stock, loyalty, reports, dll)
5. Tidak ada mock — semua hit real API endpoint

---

## Dependency Map

```
Level 0: Auth
    │
Level 1: Master Data (Products, Employees, Customers, Tables, Ingredients, Promotions)
    │
Level 2: Setup (Stock Levels, Recipes, Bundles, Price Tiers, Start Shift)
    │
Level 3: Core Operations (POS Transaksi, Self-Order, Stock Transfer)
    │
Level 4: Verification (Dashboard, Reports, Refund/Void, KDS, End Shift, Settlement)
    │
Level 5: Cross-cutting Verification (Stock deducted, Ingredients deducted, Loyalty earned, Dashboard accurate)
```

### Koneksi Antar Fitur

```
EMPLOYEE ──(shift)──▶ POS TRANSAKSI ◀──(products)── PRODUCTS/INVENTORY
                           │
           ┌───────────────┼───────────────────┐
           ▼               ▼                   ▼
     STOCK DEDUCTION   ORDER (KDS)      LOYALTY POINTS
           │               │                   │
           ▼               ▼                   ▼
     LOW STOCK ALERT   TABLE STATUS      TIER UPGRADE
           │                                   │
           ▼                                   ▼
     STOCK TRANSFER    DASHBOARD/REPORTS   REDEEM DISKON
```

---

## Test Levels & Urutan Eksekusi

| Level | Suite | Dependency | Estimasi |
|-------|-------|------------|----------|
| 0 | Auth | Tidak ada | ~1 detik |
| 1 | Master Data | Auth | ~3 detik |
| 2 | Inventory & Stock Setup | Master Data | ~2 detik |
| 3 | POS Transaksi | Stock Setup + Shift | ~3 detik |
| 3 | Self-Order | Stock Setup | ~2 detik |
| 3 | Stock Transfer | Stock Setup + 2 Outlets | ~2 detik |
| 4 | Dashboard & Reports | Transaksi | ~2 detik |
| 4 | Refund & Void | Transaksi | ~2 detik |
| 4 | KDS & Table Flow | Transaksi dine_in | ~2 detik |
| 4 | Shift & Settlement | Transaksi | ~2 detik |
| 5 | Cross-cutting Verification | Semua di atas | ~3 detik |

---

## Test Suites

---

### Suite 0: Auth

**Endpoint:** `POST /auth/login`
**Tujuan:** Dapatkan JWT token untuk semua role yang dibutuhkan

#### Test Cases

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 0.1 | Login sebagai Owner | POST | `/auth/login` | 200 + JWT token |
| 0.2 | Login sebagai Manager | POST | `/auth/login` | 200 + JWT token |
| 0.3 | Login sebagai Cashier | POST | `/auth/login` | 200 + JWT token |
| 0.4 | Login dengan PIN salah | POST | `/auth/login` | 401 Unauthorized |
| 0.5 | Get current user profile | GET | `/auth/me` | 200 + user data + role |

#### Token yang Disimpan

```
ownerToken    → untuk semua management endpoints
managerToken  → untuk approval & reports
cashierToken  → untuk POS & transaksi
```

---

### Suite 1: Master Data

**Prasyarat:** Token dari Suite 0
**Tujuan:** Buat semua data master yang dibutuhkan suite berikutnya

#### 1A. Products & Categories

| # | Test Case | Method | Endpoint | Expected | Verify |
|---|-----------|--------|----------|----------|--------|
| 1.1 | Buat kategori "Makanan" | POST | `/inventory/categories` | 201 + categoryId | — |
| 1.2 | Buat kategori "Minuman" | POST | `/inventory/categories` | 201 + categoryId | — |
| 1.3 | Buat produk "Nasi Goreng" (trackStock=true, costPrice=15000, basePrice=25000) | POST | `/inventory/products` | 201 + productId | Auto-assigned ke semua outlet |
| 1.4 | Buat produk "Es Teh" (trackStock=true, costPrice=3000, basePrice=8000) | POST | `/inventory/products` | 201 + productId | Auto-assigned ke semua outlet |
| 1.5 | Buat produk "Mie Ayam" (trackStock=true, costPrice=12000, basePrice=22000) | POST | `/inventory/products` | 201 + productId | — |
| 1.6 | Buat produk "Kopi Susu" (trackStock=false) | POST | `/inventory/products` | 201 + productId | Tidak ada StockLevel |
| 1.7 | List products | GET | `/inventory/products` | 200 + 4 products | — |
| 1.8 | Get product detail | GET | `/inventory/products/:id` | 200 + variants, modifiers | — |

#### 1B. Employees

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1.9 | List employees | GET | `/employees` | 200 + existing employees |
| 1.10 | Buat employee "Kasir Test" (role: cashier) | POST | `/employees` | 201 + employeeId |

#### 1C. Customers

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1.11 | Buat customer "Budi" (phone, email) | POST | `/customers` | 201 + customerId |
| 1.12 | Buat customer "Siti" | POST | `/customers` | 201 + customerId |
| 1.13 | List customers | GET | `/customers` | 200 + 2 customers |

#### 1D. Tables

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1.14 | Buat table "T1" (capacity: 4) | POST | `/tables` | 201 + tableId |
| 1.15 | Buat table "T2" (capacity: 6) | POST | `/tables` | 201 + tableId |
| 1.16 | List tables | GET | `/tables` | 200 + status: available |

#### 1E. Ingredients

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1.17 | Buat ingredient "Beras" (unit: kg) | POST | `/ingredients` | 201 + ingredientId |
| 1.18 | Buat ingredient "Teh" (unit: gram) | POST | `/ingredients` | 201 + ingredientId |
| 1.19 | Buat ingredient "Minyak Goreng" (unit: liter) | POST | `/ingredients` | 201 + ingredientId |

#### 1F. Promotions & Vouchers

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1.20 | Buat promotion "Diskon 20%" (type: percentage, value: 20) | POST | `/promotions` | 201 + promotionId |
| 1.21 | Generate 10 voucher untuk promotion | POST | `/promotions/vouchers/generate` | 201 + 10 voucher codes |
| 1.22 | Validate voucher code | POST | `/promotions/vouchers/validate` | 200 + valid: true |

#### 1G. Loyalty Program

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1.23 | Setup loyalty program (1 poin per 10000) | POST | `/loyalty/program` | 201 + programId |
| 1.24 | Setup loyalty tier Bronze (0-99 poin) | POST | `/loyalty/tiers` | 201 |
| 1.25 | Setup loyalty tier Silver (100-499 poin) | POST | `/loyalty/tiers` | 201 |

---

### Suite 2: Inventory & Stock Setup

**Prasyarat:** Products dari Suite 1
**Tujuan:** Set stock level, buat recipe, buat bundle

#### 2A. Stock Levels

| # | Test Case | Method | Endpoint | Expected | Verify |
|---|-----------|--------|----------|----------|--------|
| 2.1 | Set stock Nasi Goreng = 100 | POST | `/inventory/stock/adjust` | 200 | StockMovement type: 'adjustment' |
| 2.2 | Set stock Es Teh = 200 | POST | `/inventory/stock/adjust` | 200 | StockMovement tercatat |
| 2.3 | Set stock Mie Ayam = 50 | POST | `/inventory/stock/adjust` | 200 | StockMovement tercatat |
| 2.4 | Get stock levels outlet | GET | `/inventory/stock/:outletId` | 200 + 3 items dengan qty benar | — |
| 2.5 | Get low stock (threshold) | GET | `/inventory/stock/:outletId/low` | 200 + empty (semua masih cukup) | — |

#### 2B. Ingredient Stock

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 2.6 | Set stock Beras = 50kg | POST | `/ingredients/stock/adjust` | 200 |
| 2.7 | Set stock Teh = 5000g | POST | `/ingredients/stock/adjust` | 200 |
| 2.8 | Set stock Minyak = 20L | POST | `/ingredients/stock/adjust` | 200 |

#### 2C. Recipes

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 2.9 | Buat recipe: Nasi Goreng = Beras 0.3kg + Minyak 0.05L | POST | `/ingredients/recipes` | 201 |
| 2.10 | Buat recipe: Es Teh = Teh 5g | POST | `/ingredients/recipes` | 201 |
| 2.11 | Get recipes for Nasi Goreng | GET | `/ingredients/recipes?productId=X` | 200 + 2 ingredients |

#### 2D. Bundle Package

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 2.12 | Buat bundle "Paket Hemat" (Nasi Goreng + Es Teh = 30000) | POST | `/bundle-packages` | 201 + bundleId |
| 2.13 | Get bundle detail | GET | `/bundle-packages/:id` | 200 + 2 component items |

#### 2E. Start Shift

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 2.14 | Start shift (cashier, openingCash: 500000) | POST | `/employees/shifts/start` | 201 + shiftId |
| 2.15 | Get current shift | GET | `/employees/shifts/current` | 200 + status: open |
| 2.16 | Coba start shift kedua (harus gagal) | POST | `/employees/shifts/start` | 400 + "shift already open" |

---

### Suite 3: POS Transaksi

**Prasyarat:** Stock setup + Shift aktif dari Suite 2
**Tujuan:** Buat transaksi dan verifikasi semua side effect

#### 3A. Transaksi Cash Sederhana

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.1 | Buat transaksi: Nasi Goreng × 2, Es Teh × 1 (cash 58000) | POST | `/pos/transactions` | 201 + receiptNumber |
| 3.2 | ↳ Verify: stock Nasi Goreng = 98 | GET | `/inventory/stock/:outletId` | qty: 98 |
| 3.3 | ↳ Verify: stock Es Teh = 199 | GET | `/inventory/stock/:outletId` | qty: 199 |
| 3.4 | ↳ Verify: ingredient Beras = 49.4kg (50 - 0.3×2) | GET | `/ingredients/stock/:outletId` | qty: 49.4 |
| 3.5 | ↳ Verify: ingredient Teh = 4995g (5000 - 5×1) | GET | `/ingredients/stock/:outletId` | qty: 4995 |
| 3.6 | ↳ Verify: StockMovement tercatat | GET | `/inventory/stock/movements` | type: 'sale', qty: -2 |
| 3.7 | Get transaction detail | GET | `/pos/transactions/:id` | 200 + items, payments, totals |

**Nilai yang harus cocok:**

```
subtotal     = (25000 × 2) + (8000 × 1) = 58000
tax (11%)    = 6380
grandTotal   = 64380
grossProfit  = 58000 - (15000×2 + 3000×1) = 25000
```

#### 3B. Transaksi dengan Customer + Loyalty

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.8 | Buat transaksi: Mie Ayam × 1, customerId: Budi (cash) | POST | `/pos/transactions` | 201 |
| 3.9 | ↳ Verify: Budi loyalty points earned | GET | `/loyalty/customer/:customerId` | points > 0 |
| 3.10 | ↳ Verify: customer visit count +1 | GET | `/customers/:id` | visitCount: 1 |
| 3.11 | ↳ Verify: customer totalSpent bertambah | GET | `/customers/:id` | totalSpent = grandTotal |

#### 3C. Transaksi Dine-in dengan Table

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.12 | Buat transaksi dine_in: Nasi Goreng × 1, tableId: T1 | POST | `/pos/transactions` | 201 |
| 3.13 | ↳ Verify: Order KDS dibuat otomatis | GET | `/kds/orders?outletId=X` | 1 order, status: pending |
| 3.14 | ↳ Verify: Table T1 status occupied | GET | `/tables` | T1.status: occupied |

#### 3D. Transaksi Multi-Payment

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.15 | Buat transaksi: Nasi Goreng × 1 (cash 15000 + QRIS 10380) | POST | `/pos/transactions` | 201 |
| 3.16 | ↳ Verify: 2 payment records | GET | `/pos/transactions/:id` | payments.length = 2 |
| 3.17 | ↳ Verify: change = 0 | — | — | change: 0 |

#### 3E. Transaksi dengan Bundle

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.18 | Buat transaksi: Paket Hemat × 1 (bundleId) | POST | `/pos/transactions` | 201 |
| 3.19 | ↳ Verify: stock Nasi Goreng berkurang 1 (component) | GET | `/inventory/stock/:outletId` | qty berkurang |
| 3.20 | ↳ Verify: stock Es Teh berkurang 1 (component) | GET | `/inventory/stock/:outletId` | qty berkurang |

#### 3F. Transaksi dengan Voucher

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.21 | Validate voucher sebelum pakai | POST | `/promotions/vouchers/validate` | valid: true |
| 3.22 | Buat transaksi pakai voucher diskon 20% | POST | `/pos/transactions` | 201, discountAmount > 0 |
| 3.23 | ↳ Verify: voucher sudah used | POST | `/promotions/vouchers/validate` | valid: false (already used) |
| 3.24 | ↳ Verify: promotion usedCount +1 | GET | `/promotions/:id` | usedCount bertambah |

#### 3G. Edge Cases

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 3.25 | Transaksi tanpa shift (harus gagal) | POST | `/pos/transactions` | 400 |
| 3.26 | Transaksi stok habis (harus gagal) | POST | `/pos/transactions` | 400 InsufficientStock |
| 3.27 | Transaksi payment kurang dari total | POST | `/pos/transactions` | 400 INVALID_PAYMENT |
| 3.28 | Transaksi product tidak aktif | POST | `/pos/transactions` | 400 PRODUCT_NOT_FOUND |
| 3.29 | Hold bill | POST | `/pos/hold` | 200 + billId |
| 3.30 | List held bills | GET | `/pos/held-bills` | 200 + 1 bill |
| 3.31 | Resume held bill | POST | `/pos/resume/:billId` | 200 + cart data |

---

### Suite 4: Dashboard & Reports

**Prasyarat:** Transaksi dari Suite 3
**Tujuan:** Verifikasi dashboard menampilkan data akurat dari transaksi yang sudah dibuat

#### 4A. Dashboard Summary

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 4.1 | Get dashboard summary (today) | GET | `/reports/dashboard/summary?outletId=X&startDate=today&endDate=today` | — |
| 4.2 | ↳ Verify: grossSales = total semua subtotal | — | — | Cocok dengan jumlah Suite 3 |
| 4.3 | ↳ Verify: netSales = total semua grandTotal | — | — | Cocok |
| 4.4 | ↳ Verify: transactions = jumlah transaksi di Suite 3 | — | — | Count cocok |
| 4.5 | ↳ Verify: grossProfit = grossSales - totalCost | — | — | Hitung manual |
| 4.6 | ↳ Verify: grossMargin = (grossProfit / grossSales) × 100 | — | — | Persentase benar |
| 4.7 | ↳ Verify: averageSalePerTransaction = netSales / transactions | — | — | Pembagian benar |
| 4.8 | ↳ Verify: salesByHour[currentHour] > 0 | — | — | Ada data di jam sekarang |
| 4.9 | ↳ Verify: salesByDayOfWeek[today] > 0 | — | — | Ada data di hari ini |

#### 4B. Dashboard Items

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 4.10 | Get dashboard items | GET | `/reports/dashboard/items?outletId=X&startDate=today&endDate=today` | — |
| 4.11 | ↳ Verify: topItems berisi "Nasi Goreng" di posisi atas | — | — | Qty & sales cocok |
| 4.12 | ↳ Verify: categoryByVolume "Makanan" > "Minuman" | — | — | Persentase benar |
| 4.13 | ↳ Verify: categoryBySales "Makanan" > "Minuman" | — | — | Persentase benar |

#### 4C. Outlet Comparison

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 4.14 | Get outlet comparison | GET | `/reports/dashboard/outlet-comparison?startDate=today&endDate=today` | — |
| 4.15 | ↳ Verify: outlet metrics cocok dengan transaksi | — | — | Per-outlet breakdown benar |

#### 4D. Date Range Filtering

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 4.16 | Get dashboard kemarin (seharusnya kosong) | GET | `/reports/dashboard/summary?startDate=yesterday&endDate=yesterday` | grossSales: 0, transactions: 0 |
| 4.17 | Get dashboard bulan ini (harus include hari ini) | GET | `/reports/dashboard/summary?startDate=monthStart&endDate=today` | Sama dengan 4.1 |

#### 4E. Owner Analytics

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 4.18 | Get real-time metrics | GET | `/owner/analytics/real-time-metrics` | todaySales > 0 |
| 4.19 | Get overview | GET | `/owner/analytics/overview?dateRange=today` | totalSales cocok |
| 4.20 | Get critical alerts | GET | `/owner/analytics/critical-alerts` | Cek low stock alerts |
| 4.21 | Get outlets comparison | GET | `/owner/analytics/outlets-comparison` | Per-outlet data ada |

---

### Suite 5: Refund & Void

**Prasyarat:** Transaksi completed dari Suite 3
**Tujuan:** Verifikasi refund/void mengembalikan semua side effect

#### 5A. Partial Refund

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 5.1 | Catat stock SEBELUM refund | GET | `/inventory/stock/:outletId` | Simpan snapshot |
| 5.2 | Refund 1 item dari transaksi 3.1 (Nasi Goreng × 1) | POST | `/pos/refunds` | 201 |
| 5.3 | ↳ Verify: stock Nasi Goreng bertambah 1 | GET | `/inventory/stock/:outletId` | qty: snapshot + 1 |
| 5.4 | ↳ Verify: refund transaction tercatat | GET | `/pos/transactions?status=refund` | 1 refund record |
| 5.5 | ↳ Verify: dashboard grossSales berkurang | GET | `/reports/dashboard/summary` | Berkurang sebesar refund |

#### 5B. Void Transaction

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 5.6 | Catat stock + ingredient SEBELUM void | GET | multiple endpoints | Simpan snapshot |
| 5.7 | Void transaksi 3.8 (Mie Ayam + customer Budi) | POST | `/pos/void` | 200 |
| 5.8 | ↳ Verify: stock Mie Ayam kembali | GET | `/inventory/stock/:outletId` | qty: snapshot + 1 |
| 5.9 | ↳ Verify: loyalty points Budi di-reverse | GET | `/loyalty/customer/:customerId` | points berkurang |
| 5.10 | ↳ Verify: dashboard transactions berkurang | GET | `/reports/dashboard/summary` | transactions - 1 |
| 5.11 | Void transaksi yang sudah void (harus gagal) | POST | `/pos/void` | 400 |
| 5.12 | Void transaksi yang sudah refund (harus gagal) | POST | `/pos/void` | 400 |

---

### Suite 6: KDS & Table Flow

**Prasyarat:** Transaksi dine_in dari Suite 3 (test 3.12)
**Tujuan:** Verifikasi order KDS flow dari pending sampai served

#### 6A. KDS Order Lifecycle

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 6.1 | Get KDS orders | GET | `/kds/orders?outletId=X&status=pending` | 1+ order dari transaksi dine_in |
| 6.2 | Mark item "preparing" | PUT | `/kds/items/:id/preparing` | status: preparing |
| 6.3 | Mark item "ready" | PUT | `/kds/items/:id/ready` | status: ready |
| 6.4 | Bump order (semua item ready) | POST | `/kds/bump` | order.status: ready |
| 6.5 | ↳ Verify: table masih occupied | GET | `/tables` | T1.status: occupied |
| 6.6 | Complete order (served) | PUT | `/orders/:id/status` | status: served/completed |
| 6.7 | ↳ Verify: table available kembali | GET | `/tables` | T1.status: available |

#### 6B. KDS Analytics

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 6.8 | Get kitchen analytics | GET | `/kds/analytics?outletId=X` | Data ada |
| 6.9 | Get kitchen performance | GET | `/kds/performance?outletId=X` | Avg prep time > 0 |
| 6.10 | Get overdue orders | GET | `/kds/overdue` | Sesuai SLA setting |

---

### Suite 7: Loyalty & Customer

**Prasyarat:** Customer + Loyalty program dari Suite 1, Transaksi dari Suite 3
**Tujuan:** Verifikasi full loyalty lifecycle

#### 7A. Points Earning

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 7.1 | Get loyalty balance Budi | GET | `/loyalty/customer/:id` | Points dari transaksi |
| 7.2 | Get loyalty history | GET | `/loyalty/customer/:id/history` | type: 'earned' records |
| 7.3 | Manual earn points | POST | `/loyalty/earn` | Points bertambah |
| 7.4 | ↳ Verify: balance updated | GET | `/loyalty/customer/:id` | Balance cocok |

#### 7B. Points Redemption

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 7.5 | Redeem points untuk diskon | POST | `/loyalty/redeem` | discountAmount > 0 |
| 7.6 | ↳ Verify: balance berkurang | GET | `/loyalty/customer/:id` | Points dikurangi |
| 7.7 | Redeem melebihi balance (gagal) | POST | `/loyalty/redeem` | 400 insufficient points |

#### 7C. Tier Management

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|----------|
| 7.8 | Earn banyak points sampai upgrade tier | POST | `/loyalty/earn` (multiple) | tier: Bronze → Silver |
| 7.9 | ↳ Verify: tier changed | GET | `/loyalty/customer/:id` | currentTier: Silver |

#### 7D. Customer Segments

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 7.10 | Get customer segments | GET | `/customers/segments` | Segment counts |
| 7.11 | Get "returning" segment | GET | `/customers/segments/returning` | Budi di sini (visit > 1) |
| 7.12 | Get purchase history | GET | `/customers/:id/history` | Semua transaksi Budi |

---

### Suite 8: Promotion & Voucher

**Prasyarat:** Promotion + Vouchers dari Suite 1
**Tujuan:** Verifikasi promotion lifecycle

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 8.1 | Apply promotion ke cart | POST | `/promotions/apply` | bestPromotion returned |
| 8.2 | Get promotion setelah transaksi 3.22 | GET | `/promotions/:id` | usedCount bertambah |
| 8.3 | Validate voucher yang sudah dipakai | POST | `/promotions/vouchers/validate` | valid: false |
| 8.4 | Validate voucher baru (belum dipakai) | POST | `/promotions/vouchers/validate` | valid: true |
| 8.5 | Export vouchers CSV | GET | `/promotions/vouchers/export` | CSV file |
| 8.6 | Buat transaksi pakai voucher terakhir, lalu cek usedCount mencapai limit | — | — | Promosi tidak bisa dipakai lagi |

---

### Suite 9: Stock Transfer

**Prasyarat:** 2 Outlets dengan stock dari Suite 2
**Tujuan:** Verifikasi inter-outlet stock transfer workflow

#### 9A. Full Transfer Workflow

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 9.1 | Catat stock kedua outlet SEBELUM transfer | GET | `/inventory/stock/:outletId` × 2 | Snapshot |
| 9.2 | Request transfer: Nasi Goreng × 10 dari Outlet A → B | POST | `/stock-transfers` | 201 + status: pending |
| 9.3 | Approve transfer (manager) | PUT | `/stock-transfers/:id/approve` | status: approved |
| 9.4 | Ship transfer | PUT | `/stock-transfers/:id/ship` | status: shipped |
| 9.5 | ↳ Verify: Outlet A stock berkurang 10 | GET | `/inventory/stock/:outletAId` | qty: snapshot - 10 |
| 9.6 | Receive transfer | PUT | `/stock-transfers/:id/receive` | status: completed |
| 9.7 | ↳ Verify: Outlet B stock bertambah 10 | GET | `/inventory/stock/:outletBId` | qty: snapshot + 10 |
| 9.8 | ↳ Verify: StockMovement di kedua outlet | GET | movements | type: transfer_out / transfer_in |

#### 9B. Direct Transfer

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 9.9 | Direct transfer (skip approval) | POST | `/stock-transfers/direct` | status: completed langsung |
| 9.10 | ↳ Verify: stock kedua outlet berubah | GET | `/inventory/stock/:id` × 2 | Cocok |

#### 9C. Transfer Edge Cases

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 9.11 | Transfer melebihi stok (gagal) | POST | `/stock-transfers` | 400 |
| 9.12 | Get transfer discrepancies | GET | `/stock-transfers/discrepancies` | Report accurate |

---

### Suite 10: Shift & Settlement

**Prasyarat:** Shift + Transaksi dari Suite 2 & 3
**Tujuan:** Verifikasi shift end reconciliation dan payment settlement

#### 10A. Cash Management

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 10.1 | Cash in 100000 ke shift | POST | `/pos/cash-in` | shift.cashIn += 100000 |
| 10.2 | Cash out 50000 dari shift | POST | `/pos/cash-out` | shift.cashOut += 50000 |
| 10.3 | Get current shift | GET | `/employees/shifts/current` | cashIn, cashOut benar |

#### 10B. End Shift & Reconciliation

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 10.4 | End shift (actualCash: X) | POST | `/employees/shifts/:id/end` | status: closed |
| 10.5 | ↳ Verify: expectedCash = openingCash + totalCashSales - totalCashRefunds + cashIn - cashOut | — | — | Kalkulasi benar |
| 10.6 | ↳ Verify: difference = actualCash - expectedCash | — | — | Selisih terdeteksi |
| 10.7 | Get shift report | GET | `/employees/:id/shifts/report` | Summary lengkap |

#### 10C. Settlement Reconciliation

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 10.8 | Get settlements | GET | `/settlements?outletId=X` | Settlements listed |
| 10.9 | Get reconciliation report | GET | `/settlements/reconciliation?startDate=today&endDate=today` | — |
| 10.10 | ↳ Verify: payment method breakdown cocok | — | — | Cash, QRIS amounts match |
| 10.11 | ↳ Verify: discrepancies terdeteksi (jika ada) | — | — | Unmatched payments flagged |

---

### Suite 11: Bundle Package

**Prasyarat:** Bundle dari Suite 2, Stock setup
**Tujuan:** Verifikasi bundle deducts semua component stock

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 11.1 | Catat stock semua component SEBELUM | GET | `/inventory/stock/:outletId` | Snapshot |
| 11.2 | Buat transaksi bundle "Paket Hemat" × 3 | POST | `/pos/transactions` | 201 |
| 11.3 | ↳ Verify: stock Nasi Goreng berkurang 3 | GET | `/inventory/stock/:outletId` | snapshot - 3 |
| 11.4 | ↳ Verify: stock Es Teh berkurang 3 | GET | `/inventory/stock/:outletId` | snapshot - 3 |
| 11.5 | ↳ Verify: ingredient Beras berkurang (0.3 × 3 = 0.9kg) | GET | `/ingredients/stock/:outletId` | Cocok |
| 11.6 | ↳ Verify: ingredient Teh berkurang (5 × 3 = 15g) | GET | `/ingredients/stock/:outletId` | Cocok |
| 11.7 | ↳ Verify: dashboard items menampilkan bundle | GET | `/reports/dashboard/items` | Bundle tercatat |

---

### Suite 12: Ingredients & Recipe

**Prasyarat:** Ingredients + Recipes dari Suite 1 & 2
**Tujuan:** Verifikasi ingredient deduction dan low stock alerting

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 12.1 | Get ingredient stock | GET | `/ingredients/stock/:outletId` | Current levels |
| 12.2 | Buat transaksi Nasi Goreng × 10 | POST | `/pos/transactions` | 201 |
| 12.3 | ↳ Verify: Beras berkurang 3kg (0.3 × 10) | GET | `/ingredients/stock/:outletId` | Cocok |
| 12.4 | ↳ Verify: Minyak berkurang 0.5L (0.05 × 10) | GET | `/ingredients/stock/:outletId` | Cocok |
| 12.5 | Get low stock alerts | GET | `/ingredients/low-stock?outletId=X` | Alert jika di bawah threshold |
| 12.6 | Get recipe cost history | GET | `/ingredients/recipes/:id/cost-history` | Cost data ada |
| 12.7 | Manual adjust stock ingredient | POST | `/ingredients/stock/adjust` | 200 |
| 12.8 | ↳ Verify: stock updated | GET | `/ingredients/stock/:outletId` | Cocok |

---

### Suite 13: Self-Order

**Prasyarat:** Products + Stock dari Suite 1 & 2
**Tujuan:** Verifikasi customer self-ordering flow

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 13.1 | Create self-order session | POST | `/self-order/sessions` | 201 + sessionCode |
| 13.2 | Get menu (public) | GET | `/self-order/menu?outletId=X` | Products listed |
| 13.3 | Add item ke session | POST | `/self-order/sessions/:code/items` | 200 |
| 13.4 | Get session total | GET | `/self-order/sessions/:code/total` | Hitung benar |
| 13.5 | Submit order | POST | `/self-order/sessions/:code/submit` | 200 + order created |
| 13.6 | ↳ Verify: order muncul di KDS | GET | `/kds/orders?outletId=X` | Order baru ada |
| 13.7 | Create QRIS payment | POST | `/self-order/sessions/:code/pay/qris` | QR code / payment URL |
| 13.8 | Get payment status | GET | `/self-order/sessions/:code/payment-status` | Status updated |

---

### Suite 14: Online Store

**Prasyarat:** Products + Stock dari Suite 1 & 2
**Tujuan:** Verifikasi online store catalog sync dan order flow

| # | Test Case | Method | Endpoint | Verify |
|---|-----------|--------|----------|--------|
| 14.1 | Create online store | POST | `/online-store/stores` | 201 + storeId + slug |
| 14.2 | Sync catalog | POST | `/online-store/stores/:id/sync-catalog` | Products synced |
| 14.3 | Get public storefront | GET | `/online-store/s/:slug` | Products visible |
| 14.4 | Check stock (public) | GET | `/online-store/stock-check?productId=X` | Available qty |
| 14.5 | Place order (public) | POST | `/online-store/s/:slug/checkout` | 201 + orderId |
| 14.6 | ↳ Verify: stock berkurang | GET | `/inventory/stock/:outletId` | qty berkurang |
| 14.7 | Fulfill order | PUT | `/online-store/orders/:id/fulfill` | status: fulfilled |
| 14.8 | Get store analytics | GET | `/online-store/stores/:id/analytics` | Sales data ada |

---

## Event Chain Reactions

Referensi side effect yang harus diverifikasi per event:

### TransactionCreatedEvent

```
Trigger: POST /pos/transactions (success)
Side effects:
  ├─ [DB] StockLevel dikurangi per item (jika trackStock=true)
  ├─ [DB] StockMovement tercatat (type: sale)
  ├─ [DB] IngredientStockLevel dikurangi via recipe
  ├─ [DB] IngredientStockMovement tercatat
  ├─ [DB] Order KDS dibuat (jika dine_in)
  ├─ [DB] Table status → occupied (jika tableId)
  ├─ [DB] LoyaltyTransaction dibuat (jika customerId + program aktif)
  ├─ [DB] Customer points/visitCount/totalSpent updated
  ├─ [DB] Promotion usedCount +1 (jika pakai promo)
  ├─ [DB] Voucher usedAt set (jika pakai voucher)
  ├─ [Cache] Dashboard cache invalidated
  └─ [WS] WebSocket broadcast: transaction:created
```

### TransactionVoidedEvent

```
Trigger: POST /pos/void (success)
Side effects:
  ├─ [DB] StockLevel dikembalikan
  ├─ [DB] StockMovement tercatat (type: void_reversal)
  ├─ [DB] IngredientStockLevel dikembalikan
  ├─ [DB] LoyaltyTransaction reversed
  ├─ [DB] Customer points/totalSpent dikurangi
  ├─ [DB] Customer tier downgrade (jika perlu)
  ├─ [Cache] Dashboard cache invalidated
  └─ [WS] WebSocket broadcast
```

### StockLevelChangedEvent

```
Trigger: Stock adjustment, transaction, refund, void, transfer
Side effects:
  ├─ [Check] Jika qty ≤ lowStockAlert → NotificationLog dibuat
  ├─ [WS] WebSocket broadcast: inventory:stock_changed
  └─ [Push] Push notification ke Manager/Owner
```

### OrderStatusChangedEvent

```
Trigger: KDS bump, status update
Side effects:
  ├─ [DB] AuditLog tercatat
  ├─ [DB] Table status update (jika completed → available)
  ├─ [WS] WebSocket broadcast ke KDS displays
  └─ [WS] Audio/visual alert di KDS
```

### ShiftEndedEvent

```
Trigger: POST /employees/shifts/:id/end
Side effects:
  ├─ [DB] Shift aggregation (totalSales, cashPayments, etc.)
  ├─ [Calc] Expected vs actual cash difference
  └─ [WS] WebSocket broadcast: shift:ended
```

---

## Shared Test Data

Data yang dibuat di awal dan dipakai lintas suite:

```typescript
// IDs yang disimpan di shared context
const testData = {
  // Auth
  ownerToken: string,
  managerToken: string,
  cashierToken: string,

  // Business
  businessId: string,
  outletAId: string,
  outletBId: string,

  // Products
  nasiGorengId: string,      // trackStock: true, cost: 15000, price: 25000
  esTehId: string,           // trackStock: true, cost: 3000, price: 8000
  mieAyamId: string,         // trackStock: true, cost: 12000, price: 22000
  kopiSusuId: string,        // trackStock: false

  // Categories
  makananCategoryId: string,
  minumanCategoryId: string,

  // Employees
  cashierEmployeeId: string,

  // Customers
  budiCustomerId: string,
  sitiCustomerId: string,

  // Tables
  tableT1Id: string,
  tableT2Id: string,

  // Ingredients
  berasId: string,           // unit: kg
  tehId: string,             // unit: gram
  minyakId: string,          // unit: liter

  // Bundles
  paketHematBundleId: string,

  // Promotions
  diskon20PromotionId: string,
  voucherCodes: string[],

  // Shift
  currentShiftId: string,

  // Transactions (created in Suite 3)
  txnCashSimpleId: string,       // 3A: Nasi Goreng ×2 + Es Teh ×1
  txnWithCustomerId: string,     // 3B: Mie Ayam ×1 + Budi
  txnDineInId: string,           // 3C: Nasi Goreng ×1 + Table T1
  txnMultiPaymentId: string,     // 3D: Multi-payment
  txnBundleId: string,           // 3E: Paket Hemat
  txnVoucherId: string,          // 3F: Dengan voucher

  // Snapshots (for before/after comparison)
  stockSnapshot: Record<string, number>,
  ingredientSnapshot: Record<string, number>,
  dashboardSnapshot: DashboardSummary,
}
```

---

## Tracking Checklist

### Suite Progress

| Suite | Status | Test Count | Pass | Fail | Notes |
|-------|--------|------------|------|------|-------|
| 0: Auth | ⬜ Belum | 5 | - | - | — |
| 1: Master Data | ⬜ Belum | 25 | - | - | — |
| 2: Stock Setup | ⬜ Belum | 16 | - | - | — |
| 3: POS Transaksi | ⬜ Belum | 31 | - | - | Core suite |
| 4: Dashboard & Reports | ⬜ Belum | 21 | - | - | Data accuracy |
| 5: Refund & Void | ⬜ Belum | 12 | - | - | Reversal verification |
| 6: KDS & Table | ⬜ Belum | 10 | - | - | Real-time flow |
| 7: Loyalty & Customer | ⬜ Belum | 12 | - | - | Points lifecycle |
| 8: Promotion & Voucher | ⬜ Belum | 6 | - | - | Usage tracking |
| 9: Stock Transfer | ⬜ Belum | 12 | - | - | Inter-outlet |
| 10: Shift & Settlement | ⬜ Belum | 11 | - | - | Cash reconciliation |
| 11: Bundle Package | ⬜ Belum | 7 | - | - | Component deduction |
| 12: Ingredients | ⬜ Belum | 8 | - | - | Recipe deduction |
| 13: Self-Order | ⬜ Belum | 8 | - | - | Customer flow |
| 14: Online Store | ⬜ Belum | 8 | - | - | E-commerce flow |
| **TOTAL** | | **192** | | | |

### Cross-Cutting Verification

| Verification | Tested In | Status |
|---|---|---|
| Stock deducted after transaction | Suite 3A, 3E, 11 | ⬜ |
| Stock restored after refund | Suite 5A | ⬜ |
| Stock restored after void | Suite 5B | ⬜ |
| Ingredient deducted via recipe | Suite 3A, 12 | ⬜ |
| Ingredient restored after void | Suite 5B | ⬜ |
| Loyalty points earned | Suite 3B, 7A | ⬜ |
| Loyalty points reversed on void | Suite 5B | ⬜ |
| Dashboard accurate after transactions | Suite 4 | ⬜ |
| Dashboard accurate after refund/void | Suite 5 | ⬜ |
| KDS order auto-created | Suite 3C, 6 | ⬜ |
| Table status changes | Suite 6 | ⬜ |
| Promotion usage tracked | Suite 3F, 8 | ⬜ |
| Voucher marked as used | Suite 3F, 8 | ⬜ |
| Bundle components deducted | Suite 3E, 11 | ⬜ |
| Shift cash reconciliation | Suite 10 | ⬜ |
| Settlement payment matching | Suite 10C | ⬜ |
| Stock transfer both outlets | Suite 9 | ⬜ |
| Low stock alert triggered | Suite 12 | ⬜ |
| Date range filter accurate | Suite 4D | ⬜ |
