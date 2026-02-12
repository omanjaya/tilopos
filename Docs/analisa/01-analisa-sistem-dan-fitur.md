# Analisa Sistem & Fitur TiloPOS

> Tanggal: 12 Februari 2026
> Scope: Full-stack analysis — Backend (NestJS) + Frontend (React)

---

## Daftar Isi

1. [Registrasi & First-Time Setup](#1-registrasi--first-time-setup)
2. [POS / Kasir — Flow Transaksi](#2-pos--kasir--flow-transaksi)
3. [Produk & Inventori](#3-produk--inventori)
4. [Backoffice & Dashboard](#4-backoffice--dashboard)
5. [Fitur yang Belum Ada / Perlu Ditambah](#5-fitur-yang-belum-ada--perlu-ditambah)
6. [Rekomendasi Flow Ideal First-Time User](#6-rekomendasi-flow-ideal-first-time-user)

---

## 1. Registrasi & First-Time Setup

### 1.1 Flow Registrasi (4 Langkah)

| Step | Nama | Isi |
|------|------|-----|
| 1 | Account Info | Nama owner, email, PIN (6 digit), telepon |
| 2 | Tipe Bisnis | Pilih preset (FnB, Retail, Service, dll) — auto-enable features |
| 3 | Info Bisnis | Nama bisnis, telepon, alamat, nama outlet, kode outlet, tarif pajak (default 11%) |
| 4 | Success | Konfirmasi + redirect ke dashboard |

**Backend (RegisterUseCase) dalam 1 transaksi database:**
1. Validasi PIN match + email unik + tipe bisnis valid
2. Create Business record
3. Create Outlet pertama (dengan tax rate)
4. Create Employee (role: owner, PIN di-bcrypt)
5. Initialize features berdasarkan tipe bisnis
6. Generate JWT token → return ke frontend

### 1.2 Flow Login

- Email + PIN (6 digit, `inputMode="numeric"`)
- Support MFA (TOTP) jika enabled per employee
- JWT payload: `{ sub: employeeId, businessId, outletId, role }`
- 401 → auto-logout + redirect ke `/login`

### 1.3 Setelah Login Pertama

- Onboarding wizard: 2 step (welcome + tour) — disimpan di localStorage
- Redirect ke Dashboard (`/app`)
- Dashboard menampilkan KPI cards, chart, quick actions

### 1.4 Yang Sudah Bagus

- Registrasi 4 langkah cukup simpel
- Auto-create outlet + employee owner
- Feature otomatis aktif sesuai tipe bisnis
- PIN 6 digit lebih mudah dari password
- MFA optional (tidak memaksa)

### 1.5 Yang Kurang / Bermasalah

| Masalah | Dampak |
|---------|--------|
| Tidak ada **setup checklist** di dashboard | Owner baru bingung "habis ini ngapain?" |
| Tidak ada **guided setup** untuk: tambah produk pertama, atur pembayaran, tambah karyawan | Owner harus cari sendiri |
| Settings punya **11 sub-menu** tanpa penjelasan | Overwhelming untuk pengguna baru |
| Feature toggle punya **20+ opsi** tanpa rekomendasi | Owner tidak tahu mana yang penting |
| Onboarding wizard hanya 2 step (welcome + tour) | Terlalu singkat, tidak actionable |

---

## 2. POS / Kasir — Flow Transaksi

### 2.1 Layout POS

**Desktop:** 65% product grid (kiri) + 35% cart panel (kanan)
**Mobile:** Fullscreen product grid + cart via bottom sheet/floating button

**Header POS:**
- Nama employee + outlet
- Order type selector (Dine-in / Takeaway / Delivery)
- Customer selector
- Table selector (jika TABLE_MANAGEMENT aktif)
- Diskon badge
- Held bills counter
- Tombol transaksi hari ini
- Keyboard shortcuts help

### 2.2 Flow Transaksi Lengkap

```
User klik Produk
├── Punya varian/modifier?
│   ├── YA → Product Modal (pilih varian, modifier, qty, notes)
│   └── TIDAK → Langsung masuk keranjang
│
Cart Updated → recalculate() → Update Subtotal, Tax, Total
    ↓
User klik "Uang Pas" atau "Bayar Lainnya"
├── Quick Cash: Auto bayar tunai dengan total pas
├── Bayar Lainnya: Payment Panel terbuka
│   ├── Pilih metode → Input jumlah → Tambah pembayaran
│   └── Bisa multiple payment methods
    ↓
Klik "Selesai" (Complete)
    ↓
handleCheckoutComplete()
├── Cek shift aktif (GET /employees/shifts/current)
├── Jika tidak ada shift → Error toast + block transaksi
├── Build request + POST /pos/transactions
├── Sukses:
│   ├── Toast dengan nomor receipt
│   ├── Buka receipt preview modal
│   ├── Clear cart + payments
│   └── Siap transaksi berikutnya
└── Gagal: Error toast
```

### 2.3 Metode Pembayaran

| Kategori | Metode |
|----------|--------|
| Tunai | Cash |
| QRIS | QR Code |
| Kartu | Debit Card, Credit Card |
| E-Wallet | GoPay, OVO, DANA, ShopeePay, LinkAja |

- Support multiple payment (split bill)
- Reference number untuk non-cash
- Quick amount presets untuk cash (10k, 50k, 100k, 200k)

### 2.4 Fitur Diskon

- 2 tipe: Persentase (%) atau Nominal (Rp)
- Preset buttons (5%, 10%, 15%, 20%, 25%, 50% / 5k, 10k, 20k, 50k, 100k)
- Numpad untuk input manual
- Live preview (subtotal → diskon → setelah diskon)
- Hanya 1 tipe aktif sekaligus

### 2.5 Held Bills (Tahan Pesanan)

- Simpan seluruh state cart (items, customer, table, notes, timestamp)
- Resume kapan saja dari header badge
- Hapus bill individual
- **Limitasi:** Hanya di localStorage browser — hilang jika ganti device

### 2.6 Receipt

- Header: Nama bisnis, outlet, alamat, telepon, NPWP
- Info: No. transaksi, tanggal, jam, kasir, pelanggan, meja
- Items: Qty x nama (varian), modifier indent, notes italic
- Totals: Subtotal, diskon, biaya layanan, pajak, TOTAL
- Payments: Per metode + kembalian
- Footer: "Terima Kasih!", disclaimer, bukti pembayaran
- Print via `window.print()` + format 80mm thermal

### 2.7 Order Types

| Tipe | Label | Efek |
|------|-------|------|
| `dine_in` | Makan di Tempat | Service charge berlaku |
| `takeaway` | Bawa Pulang | Tanpa service charge |
| `delivery` | Delivery | Tanpa service charge |

### 2.8 Yang Sudah Bagus

- Product search + category filter + barcode scan
- Quick Cash checkout (1 klik untuk bayar tunai pas)
- Mobile: touch-optimized 44px buttons
- Variants & modifiers: modal jelas dengan required indicator
- Discount: real-time preview dengan presets
- Cart persistence di localStorage
- Keyboard shortcuts lengkap

### 2.9 Yang Bermasalah

| Masalah | Dampak | Severity |
|---------|--------|----------|
| **Tidak ada tombol "Mulai Shift"** di POS | Kasir baru → checkout → error "Tidak Ada Shift Aktif" → bingung | CRITICAL |
| Shift harus dimulai dari halaman Karyawan | Kasir harus keluar POS untuk mulai shift | CRITICAL |
| **Tidak ada tombol "Tutup Shift"** di POS | Kasir selesai kerja tidak tahu cara tutup | HIGH |
| Settlement di halaman terpisah | Flow putus: shift → transaksi → settlement tidak terhubung | HIGH |
| Held bills hanya di localStorage | Pindah device = hilang | MEDIUM |
| Diskon hanya 1 tipe sekaligus | Kurang fleksibel | LOW |

---

## 3. Produk & Inventori

### 3.1 Cara Tambah Produk (4 Metode)

| Metode | Waktu | Cocok Untuk |
|--------|-------|-------------|
| Quick Add (shortcut Q) | 30 detik | 1-3 produk cepat |
| Bulk Add (shortcut B) | 5-10 menit | 5-20 produk sekaligus |
| Form Lengkap (shortcut N) | 2-5 menit/produk | Produk detail dengan varian |
| Import Excel | 10-30 menit | 20+ produk dari spreadsheet |

### 3.2 Kategori Produk

- CRUD via side sheet (CategoryManager)
- Inline editing dengan save/cancel
- Support hierarki (parentId) tapi belum exposed di UI
- Soft delete (toggle isActive)

### 3.3 Product Variants

- Single-choice per produk (contoh: S, M, L, XL)
- Setiap varian punya harga + cost price + SKU + barcode sendiri
- **Limitasi:** Tidak bisa tambah varian setelah produk dibuat

### 3.4 Stock Management

- Tracking per outlet per produk per varian
- 3 tipe adjustment: Add (Penerimaan), Remove (Pengeluaran), Set (Setel)
- Indikator status: Hijau (normal), Kuning (low), Merah (habis)
- Low stock alert berdasarkan `minStock` threshold
- Audit trail lengkap (StockMovement table)

### 3.5 Stock Transfer

**Flow 4 langkah:**
```
REQUESTED → APPROVED → SHIPPED → RECEIVED
              ↓
          CANCELLED (kapan saja)
```

- WebSocket real-time untuk status update
- Transfer templates untuk transfer rutin
- Quantity received bisa berbeda dari quantity sent

### 3.6 Harga Bertingkat (Price Tiers)

- Tier berdasarkan quantity: Retail (1-10), Wholesale (11-100), Bulk (100+)
- Bisa set harga tetap atau diskon persentase
- Feature-gated (harus diaktifkan dulu)

### 3.7 Supplier Management

- CRUD supplier (nama, contact person, email, phone, alamat)
- Supplier comparison modal
- Reorder alerts modal
- Supplier detail view

### 3.8 Import/Export

- Import Excel: drag-and-drop, multi-sheet, column mapping, preview, error per row
- Max 10MB file size
- Export belum exposed di UI tapi backend support

### 3.9 Yang Sudah Bagus

- 4 metode input produk (quick, bulk, form, import)
- Keyboard shortcuts (N, Q, B, /)
- Real-time WebSocket untuk transfer stok
- Audit trail stok lengkap
- Auto-assign produk ke semua outlet
- Multi-outlet stock tracking

### 3.10 Yang Bermasalah

| Masalah | Dampak |
|---------|--------|
| **Varian tidak bisa ditambah setelah produk dibuat** | Harus hapus & buat ulang |
| Tidak ada **template produk** per tipe bisnis | Owner FnB harus input dari nol |
| Transfer stok butuh **4 langkah approval** | Terlalu rumit untuk UMKM kecil |
| Tidak ada **barcode generator** | Hanya input manual |
| Import error: harus ulang dari awal | Tidak bisa resume partial import |
| Price Tiers tersembunyi di balik feature flag | Owner tidak tahu fitur ini ada |

---

## 4. Backoffice & Dashboard

### 4.1 Dashboard Utama (`/app`)

- Greeting kontekstual (Selamat Pagi/Siang/Sore/Malam)
- Period selector: Hari Ini, Minggu Ini, Bulan Ini
- KPI Cards: Total Penjualan, Transaksi, Rata-rata Order, Pelanggan
- Bento grid: Sales Trend, Financial Summary, Customer Insights, Payment Methods, Top Products
- Widget per tipe bisnis: FnB (table/KDS), Retail (stock), Service (appointment)
- Quick Actions

### 4.2 Owner Dashboard (`/app/dashboard/owner`)

- Mode Live (update 30 detik via WebSocket)
- Critical alerts banner (max 3 alert)
- Multi-outlet comparison chart
- Tab Financial: Revenue vs Expense, Profit per Outlet, Cash Flow, Payment Methods
- Tab Staff: Leaderboard, Individual performance cards

### 4.3 Reports

| Report | Selalu Tampil |
|--------|---------------|
| Penjualan (Sales) | Ya |
| Produk (Product) | Ya |
| Keuangan (Financial) | Ya |
| Pembayaran (Payment) | Ya |
| Inventaris | Jika stock_management aktif |
| Dapur | Jika kitchen_display + fnb aktif |
| Meja | Jika table_management + fnb aktif |
| Staff | Jika staff_commission + service aktif |
| Reservasi | Jika appointments + service aktif |

### 4.4 Employee Management

- List dengan search, filter role, filter status
- Form: Nama, Email, Telepon, PIN, Role, Outlet, Tarif per Jam
- Role hierarchy: Super Admin > Owner > Manager > Supervisor > Cashier / Kitchen / Inventory
- Soft delete (deactivate, bukan hapus)

### 4.5 Sidebar Navigation

**6 section:**
```
Quick Access     — Dashboard, POS Terminal, KDS
Penjualan        — Transaksi, Pesanan, Meja, Shift, Daftar Tunggu, Penyelesaian (6 item)
Produk & Inventori — Produk, Stok, Transfer, Supplier, dll (11 item)
Pelanggan        — Pelanggan, Promosi, Loyalty, Toko Online, dll (10 item)
Laporan & Tim    — Laporan, Karyawan, Audit Log
Pengaturan       — Settings (11 sub-page)
```

- Role-based visibility
- Favorites/pin (max 5 per user)
- "Lihat semua" progressive disclosure
- Command Palette (Cmd+K) dengan 65 command

### 4.6 Settings (11 Sub-page)

1. Bisnis (nama, email, telepon, alamat)
2. Outlet (multi-location management)
3. Perangkat (device management)
4. Notifikasi (alert preferences)
5. Pajak (PPN, biaya layanan, aturan pengecualian)
6. Struk (receipt template, header/footer)
7. Jam Operasional (per hari/outlet)
8. Modifier (modifier groups untuk produk)
9. Tipe Bisnis (pilih/ganti tipe bisnis)
10. Fitur (toggle 20+ feature flags)
11. Tampilan (theme, warna, logo)

### 4.7 Fitur Tambahan

- **Self-Order:** Customer scan QR → pesan dari HP → masuk ke POS & KDS
- **KDS (Kitchen Display):** Queue order real-time, bump item, timing
- **Customer Management:** List, CRUD, loyalty points (feature-gated)
- **Command Palette:** Cmd+K, fuzzy search, recent commands, 65 navigasi + aksi

### 4.8 Yang Bermasalah

| Masalah | Dampak | Severity |
|---------|--------|----------|
| **3 tempat lihat data penjualan** tanpa penjelasan | Bingung Dashboard vs Owner Dashboard vs Reports | HIGH |
| **Tidak ada Payment Gateway setup** | Owner tidak bisa atur integrasi pembayaran digital | CRITICAL |
| **Tidak ada printer config** | Tidak bisa setup thermal/kitchen printer | HIGH |
| Tidak ada **customer communication** (email/SMS) | Loyalty & promosi tidak bisa di-push | MEDIUM |
| Tidak ada **data export/backup** | Tidak bisa download data ke Excel | MEDIUM |
| Tidak ada **custom roles** | Hanya role bawaan, tidak bisa customize permission | MEDIUM |
| UI hanya **Bahasa Indonesia** hardcoded | Tidak bisa ganti bahasa | LOW |

---

## 5. Fitur yang Belum Ada / Perlu Ditambah

### 5.1 CRITICAL — Harus Ada

| Fitur | Kenapa Penting |
|-------|---------------|
| **Shift Management di POS** | Kasir harus bisa mulai & tutup shift langsung dari layar POS |
| **Getting Started Checklist** | Dashboard pertama kali: "1. Tambah produk 2. Atur pembayaran 3. Tambah karyawan 4. Coba transaksi" |
| **Payment Gateway Config** | Settings untuk setup QRIS provider, EDC, e-wallet |
| **Printer Setup** | Settings untuk pair thermal printer (receipt) dan kitchen printer |

### 5.2 HIGH — Sangat Meningkatkan UX

| Fitur | Kenapa Penting |
|-------|---------------|
| **Onboarding Wizard Actionable** | Langsung ajak user buat produk, atur outlet, tambah kasir |
| **Product Templates per Bisnis** | FnB: template kopi, makanan. Retail: template pakaian |
| **Simplified Transfer** | 1-step transfer untuk UMKM kecil |
| **Edit Varian Setelah Produk Dibuat** | Jangan harus hapus & buat ulang |
| **Contextual Help Tooltips** | Icon "?" di setiap halaman |
| **Shift Summary saat Tutup Shift** | Total transaksi, total cash, selisih kas — di POS |

### 5.3 MEDIUM — Nice to Have

| Fitur | Kenapa Penting |
|-------|---------------|
| Customer Import (Excel/CSV) | Owner bisa import database customer |
| Barcode Generator & Print | Generate + print label barcode |
| Report Scheduling | Laporan otomatis ke email owner |
| Invitation Link untuk Karyawan | Kirim link, karyawan setup sendiri |
| Held Bills sync ke server | Tidak hilang saat ganti device |
| Settings Reorganization | Group: Umum, Pembayaran, Notifikasi, Tampilan |

---

## 6. Rekomendasi Flow Ideal First-Time User

```
REGISTRASI (sudah ada, bagus)
    ↓
LOGIN PERTAMA
    ↓
┌─────────────────────────────────────────┐
│  SETUP WIZARD (perlu dibuat)            │
│                                         │
│  Step 1: "Tambah produk pertamamu"      │
│  → Quick Add 3-5 produk contoh          │
│  → Atau pilih template per bisnis       │
│                                         │
│  Step 2: "Atur metode pembayaran"       │
│  → Aktifkan Cash, QRIS, E-wallet       │
│                                         │
│  Step 3: "Tambah karyawan" (optional)   │
│  → Atau "Nanti saja, saya kasir juga"  │
│                                         │
│  Step 4: "Setup printer" (optional)     │
│  → Pair thermal printer                 │
│  → Atau "Print dari browser saja"       │
│                                         │
│  Step 5: "Coba transaksi pertama!"      │
│  → Redirect ke POS dengan dummy order   │
└─────────────────────────────────────────┘
    ↓
DASHBOARD dengan Checklist Progress
  ✅ Buat akun
  ✅ Tambah produk (3/5)
  ○  Atur pembayaran
  ○  Tambah karyawan
  ○  Transaksi pertama
    ↓
DAILY OPERATION
  Kasir: Buka POS → Mulai Shift (di POS!) → Transaksi → Tutup Shift (di POS!)
  Owner: Buka Dashboard → Lihat KPI → Cek laporan → Manage stok
```

### Rekomendasi Onboarding per Role

**Owner (Hari 1-3):**
```
Hari 1: Setup (45 menit)
  1. Buat 5-10 kategori produk
  2. Quick Add 20 produk pertama
  3. Upload gambar produk

Hari 2: Inventori (30 menit)
  1. Set stok per outlet
  2. Set minimum stok
  3. Test adjustment stok
  4. Setup supplier

Hari 3: Advanced (30 menit)
  1. Setup price tiers jika perlu
  2. Buat transfer template
  3. Test transfer antar outlet
  4. Setup reorder alerts
```

**Kasir (Hari 1):**
```
  1. Login dengan email + PIN
  2. Mulai shift (tombol di POS)
  3. Coba 3 transaksi (cash, QRIS, e-wallet)
  4. Coba hold/resume bill
  5. Coba diskon
  6. Tutup shift → lihat summary
```

---

## Database Key Models

```
Business
├── id, name, email, phone, address
├── businessType (fnb, retail, service, etc.)
├── subscriptionPlan (basic, standard, premium, enterprise)
└── status (active, suspended, cancelled)

Outlet
├── id, businessId (FK)
├── name, code, address
├── taxRate, serviceCharge, isActive

Employee
├── id, businessId (FK), outletId (FK)
├── name, email, phone, pin (bcrypt)
├── role (owner, manager, supervisor, cashier, kitchen, inventory)
├── isActive, onboardingCompleted
└── mfaEnabled, mfaSecret

Product
├── id, businessId (FK)
├── name, sku, description, imageUrl
├── basePrice, costPrice
├── hasVariants, trackStock, isActive
└── variants: ProductVariant[]

ProductVariant
├── id, productId (FK)
├── name, sku, barcode
├── price, costPrice, isActive

StockLevel
├── outletId, productId, variantId
├── quantity, lowStockAlert

StockTransfer
├── transferNumber, status
├── sourceOutletId, destinationOutletId
├── requestedBy, approvedBy, receivedBy
└── items: StockTransferItem[]
```

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 + TypeScript |
| Database | PostgreSQL 15 + Prisma 5 |
| Cache | Redis 7 (ioredis) |
| Queue | RabbitMQ + BullMQ |
| Frontend | React 18 + Vite 6 + TypeScript |
| State | Zustand 5 + TanStack Query 5 |
| UI | shadcn/ui + Radix UI + Tailwind CSS 3 |
| Testing | Jest + Vitest + Playwright |
| Monitoring | Sentry + Winston |
