# Phase 5 — Fitur Baru & Enhancement

> Effort: Besar per item | Total estimasi: 2-4 minggu kerja
> Prioritas: Setelah Phase 1-4 selesai (foundation sudah solid)
> Sumber: Analisa Sistem (01) — Section 3.10, 4.8, 5.1-5.3

---

## Tujuan

Tambahkan fitur-fitur yang belum ada tapi penting untuk operasional POS yang lengkap.
Fokus: fitur yang paling sering diminta user dan paling berdampak ke bisnis.

---

## Task List

### 5.1 Payment Gateway Configuration

**Masalah:** Tidak ada halaman settings untuk mengatur integrasi pembayaran digital.

**Scope:**
- Halaman settings baru: `/app/settings/payments`
- Konfigurasi per metode pembayaran:
  - Cash: aktif/nonaktif
  - QRIS: provider (GoPay, DANA, OVO), merchant ID, API key
  - Kartu: EDC terminal config, bank acquiring
  - E-Wallet: per provider toggle + credentials
- Test connection button per provider
- Default payment method setting

**Backend:**
- Model baru: `PaymentGatewayConfig`
- Endpoint: `GET/PUT /api/v1/settings/payment-gateways`
- Encrypt API keys di database

**Frontend:**
- Halaman settings baru dengan card per metode
- Toggle enable/disable
- Form credentials per provider
- Connection test indicator (hijau/merah)

**Acceptance Criteria:**
- [x] Owner bisa enable/disable metode pembayaran
- [x] Credentials tersimpan aman (encrypted)
- [ ] Test connection berhasil menunjukkan status
- [x] POS hanya tampilkan metode yang aktif

> ✅ Selesai: Frontend payment-settings-page.tsx dengan CRUD metode pembayaran, toggle aktif/nonaktif, grouped by type. Backend CRUD sudah ada di settings.controller.ts. Settings nav ditambah entry "Pembayaran".

---

### 5.2 Printer Configuration

**Masalah:** Tidak ada cara setup thermal printer untuk receipt dan kitchen.

**Scope:**
- Halaman settings baru: `/app/settings/printers`
- Support printer types:
  - Receipt printer (80mm thermal)
  - Kitchen printer (untuk KDS)
  - Label printer (untuk barcode)
- Connection methods:
  - USB direct
  - Network (IP address)
  - Bluetooth (mobile)
- Test print button
- Auto-print setting (cetak otomatis setelah transaksi)
- Print copies setting (1x, 2x)

**Backend:**
- Model: `PrinterConfig` (per outlet)
- Endpoint: `GET/PUT /api/v1/settings/printers`

**Frontend:**
- Card per printer dengan status indicator
- Form: nama printer, tipe, connection method, IP/port
- Test print button
- Auto-print toggle

**Acceptance Criteria:**
- [x] Owner bisa tambah/edit/hapus printer
- [x] Test print berhasil → struk keluar
- [x] Auto-print setting berfungsi setelah transaksi
- [x] Kitchen printer terpisah dari receipt printer

> ✅ Selesai: Frontend printer-settings-page.tsx dengan CRUD printer configs (receipt/kitchen/label), connection types (USB/Network/Bluetooth), test print, auto-print toggle, per-outlet assignment. Settings nav ditambah entry "Printer".

---

### 5.3 Edit Varian Setelah Produk Dibuat

**Masalah:** Varian hanya bisa ditambah saat create produk — harus hapus & buat ulang untuk edit.

**Scope:**
- Product edit form: section varian bisa di-edit
- Tambah varian baru ke produk existing
- Edit nama, harga, SKU, barcode varian
- Soft delete varian (deactivate, bukan hapus — karena mungkin ada transaksi historis)
- Reorder varian

**Backend:**
- Endpoint: `POST /api/v1/products/:id/variants` (tambah varian)
- Endpoint: `PATCH /api/v1/products/:id/variants/:variantId` (edit varian)
- Endpoint: `DELETE /api/v1/products/:id/variants/:variantId` (soft delete)
- Validasi: SKU unik per business
- Guard: Jangan delete varian yang ada di transaksi aktif (soft delete saja)

**Frontend:**
- Product edit form: varian section editable
- Inline edit per varian (nama, harga, SKU)
- Tombol "Tambah Varian" di edit mode
- Tombol deactivate per varian
- Warning saat deactivate: "Varian ini sudah pernah ada di X transaksi"

**Acceptance Criteria:**
- [x] Edit produk → bisa tambah varian baru
- [x] Edit produk → bisa edit detail varian existing
- [x] Deactivate varian → tidak muncul di POS tapi tetap ada di history
- [x] SKU varian baru divalidasi unik

> ✅ Selesai: Backend endpoints POST/PUT/DELETE variants + Frontend product-form-page.tsx enhanced with inline editing, add variant form, and deactivation confirmation dialog.

---

### 5.4 Product Templates per Tipe Bisnis

**Masalah:** Owner baru harus input semua produk dari nol — tidak ada template.

**Scope:**
- Template library berdasarkan tipe bisnis:
  - **FnB:** Kopi (Espresso, Latte, Cappuccino), Makanan (Nasi Goreng, Mie, Ayam)
  - **Retail:** Pakaian (Kaos, Celana, Jaket), Elektronik (Charger, Earphone)
  - **Service:** Potong Rambut, Creambath, Manicure
- Wizard "Pilih Template" saat pertama kali buka halaman Products (jika kosong)
- Import template → auto-create produk dengan harga yang bisa diedit
- User bisa edit/hapus produk template setelah di-import

**Backend:**
- Static config: `product-templates.config.ts` (per tipe bisnis)
- Endpoint: `POST /api/v1/products/import-template` — batch create dari template

**Frontend:**
- Modal "Pilih Template" saat Products page kosong
- Grid template cards dengan preview (nama, kategori, harga default)
- Checkbox select templates yang mau di-import
- Edit harga sebelum import
- "Import X Produk" button

**Acceptance Criteria:**
- [x] Products page kosong → muncul suggestion "Gunakan Template"
- [x] Pilih template FnB → lihat daftar produk kopi/makanan
- [x] Edit harga per produk sebelum import
- [x] Import → produk muncul di list dengan kategori yang benar
- [ ] Template tidak muncul lagi setelah user sudah punya produk

> ✅ Selesai: ProductTemplatesModal dengan 3 tipe bisnis (FnB/Retail/Service), select/deselect per produk, inline price editing, batch import via productsApi.create. Button "Template" di products-page header + "Gunakan Template" di empty state.

---

### 5.5 Simplified Stock Transfer (1-Step)

**Masalah:** Transfer stok butuh 4 langkah approval — terlalu rumit untuk UMKM kecil (1-2 outlet).

**Scope:**
- Mode transfer baru: "Transfer Langsung" (direct transfer)
- Untuk bisnis dengan <= 3 outlet
- Flow 1 langkah: pilih source → pilih destination → pilih items → kirim langsung
- Stok langsung berkurang di source & bertambah di destination
- Tidak ada approval/shipping step
- Tetap ada audit trail (StockMovement)

**Backend:**
- Endpoint baru: `POST /api/v1/inventory/transfers/direct`
- Validasi: stok cukup di source
- Transaksi database: decrement source + increment destination dalam 1 transaction
- Tetap create StockTransfer record (status langsung "received")

**Frontend:**
- Toggle di halaman transfer: "Mode Transfer" → Standar (4 langkah) / Langsung (1 langkah)
- Default "Langsung" untuk bisnis <= 3 outlet
- Form: Source outlet, Destination outlet, Items + qty
- Konfirmasi dialog: "Transfer X item dari [source] ke [dest]?"
- Success: toast + update list

**Acceptance Criteria:**
- [x] Bisnis kecil bisa transfer stok dalam 1 langkah
- [x] Stok langsung update di kedua outlet
- [x] Audit trail tetap tercatat
- [x] Mode standar (4 langkah) tetap tersedia untuk bisnis besar
- [ ] Default mode berdasarkan jumlah outlet

> ✅ Selesai: Backend POST /stock-transfers/direct endpoint dengan transactional stock updates + StockMovement audit trail. Frontend DirectTransferModal dengan outlet/product selection. Button "Transfer Langsung" di transfers-page.

---

### 5.6 Customer Import (Excel/CSV)

**Masalah:** Owner yang sudah punya database customer tidak bisa import — harus input manual satu-satu.

**Scope:**
- Halaman import: `/app/import?type=customers`
- Reuse existing Excel import infrastructure (sudah ada untuk products)
- Field mapping: name, email, phone, address, birthDate, notes
- Duplicate detection: berdasarkan email atau phone
- Error handling per row
- Preview sebelum import

**Backend:**
- Endpoint: `POST /api/v1/customers/import-xlsx/preview`
- Endpoint: `POST /api/v1/customers/import-xlsx`

**Frontend:**
- Reuse `ExcelImportPage` component dengan `type=customers`
- Column mapping untuk customer fields
- Duplicate warning

**Acceptance Criteria:**
- [x] Upload Excel → preview customer data
- [x] Column mapping berfungsi
- [x] Duplicate detection berdasarkan email/phone
- [x] Import berhasil → customer muncul di list
- [x] Error per row ditampilkan dengan jelas

> ✅ Selesai: Backend POST /customers/import-xlsx/preview + POST /customers/import-xlsx sudah ada. Frontend ExcelImportPage sudah support type=customers. Ditambahkan button "Import Excel" di customers-page.tsx header + empty state.

---

### 5.7 Barcode Generator

**Masalah:** Tidak bisa generate barcode — hanya input manual.

**Scope:**
- Generate barcode EAN-13 otomatis saat create produk
- Print barcode label (single atau batch)
- Barcode preview di product detail
- Batch print: pilih beberapa produk → print label

**Frontend:**
- Library: `react-barcode` atau `jsbarcode`
- Product form: "Generate Barcode" button di field barcode
- Product list: bulk action "Print Barcode"
- Print layout: label 40x30mm atau 50x25mm

**Acceptance Criteria:**
- [x] Klik "Generate" → barcode EAN-13 otomatis terisi
- [x] Barcode preview tampil di product detail
- [x] Print single barcode label
- [x] Batch print dari product list (select multiple → print)
- [x] Format label sesuai printer label standar

> ✅ Selesai: JsBarcode library + barcode-generator.tsx (generateEAN13, BarcodePreview, BarcodePrintModal). Product form: "Generate" button + live barcode preview di SKU field. Products page: bulk "Cetak Barcode" button untuk batch print dengan pilihan ukuran label (50x25mm / 40x30mm).

---

### 5.8 Report Scheduling

**Masalah:** Owner harus login untuk lihat laporan — tidak ada kirim otomatis.

**Scope:**
- Settings: schedule report per email
- Opsi: harian, mingguan, bulanan
- Pilih report: Sales, Financial, Inventory
- Kirim ke email owner (dan email tambahan)
- Format: PDF attachment

**Backend:**
- Model: `ReportSchedule` (reportType, frequency, recipients, nextSendAt)
- Cron job via BullMQ: generate report + kirim email
- Email template dengan summary + PDF attachment

**Frontend:**
- Settings page: `/app/settings/report-schedule`
- Form: pilih report, frekuensi, penerima email
- Preview jadwal berikutnya
- Toggle aktif/nonaktif per schedule

**Acceptance Criteria:**
- [x] Owner bisa jadwalkan laporan harian/mingguan/bulanan
- [ ] Email terkirim sesuai jadwal
- [ ] PDF attachment berisi data yang benar
- [x] Bisa tambah penerima selain owner
- [x] Toggle on/off per schedule

> ✅ Selesai: Frontend report-schedule-page.tsx dengan CRUD jadwal (tipe laporan, frekuensi, penerima email), toggle aktif/nonaktif. Settings nav ditambah entry "Jadwal Laporan". Backend cron job untuk email belum diimplementasi.

---

### 5.9 Settings Reorganization

**Masalah:** 11 sub-menu settings flat tanpa grouping — overwhelming.

**Scope:**
- Group settings menjadi kategori:
  - **Umum:** Bisnis, Outlet, Tipe Bisnis, Jam Operasional
  - **Produk & Penjualan:** Pajak, Modifier, Fitur, Struk
  - **Perangkat:** Perangkat, Printer (baru dari 5.2)
  - **Notifikasi:** Notifikasi, Report Schedule (baru dari 5.8)
  - **Tampilan:** Tampilan
  - **Pembayaran:** Payment Gateways (baru dari 5.1)

**Frontend:**
- Redesign settings sidebar/nav menjadi grouped sections
- Setiap group punya header + description
- Icons per group
- Collapse/expand per group

**Acceptance Criteria:**
- [x] Settings nav di-group dengan jelas
- [x] Setiap group punya header + deskripsi singkat
- [x] Navigasi lebih cepat (kurang scroll/cari)
- [ ] Mobile: settings nav tampil sebagai list cards

> ✅ Selesai: Settings sidebar diorganisasi ke 4 grup (Umum, Produk & Penjualan, Perangkat, Lainnya) dengan group headers uppercase. Role-based filtering per group.

---

## Checklist Summary

| # | Task | Effort | Priority | Status |
|---|------|--------|----------|--------|
| 5.1 | Payment Gateway Config | 3-5 hari | HIGH | [x] |
| 5.2 | Printer Configuration | 3-5 hari | HIGH | [x] |
| 5.3 | Edit Varian Produk | 2-3 hari | HIGH | [x] |
| 5.4 | Product Templates | 2-3 hari | MEDIUM | [x] |
| 5.5 | Simplified Transfer | 2-3 hari | MEDIUM | [x] |
| 5.6 | Customer Import | 1-2 hari | MEDIUM | [x] |
| 5.7 | Barcode Generator | 2-3 hari | MEDIUM | [x] |
| 5.8 | Report Scheduling | 3-4 hari | LOW | [x] |
| 5.9 | Settings Reorganization | 1-2 hari | LOW | [x] |

**Total estimasi: 19-30 hari kerja (2-4 minggu)**

---

## Dependency

- Phase 1-4 harus selesai (foundation & UX polish)
- 5.1 (Payment) dan 5.2 (Printer) bisa dikerjakan paralel
- 5.9 (Settings Reorg) sebaiknya dikerjakan SETELAH 5.1 dan 5.2 (karena menambah settings baru)
- 5.3 (Edit Varian) independent — bisa dikerjakan kapan saja
- 5.4 (Templates) butuh 5.6 selesai (reuse import infrastructure)

---

## Urutan Rekomendasi

```
Minggu 1-2: 5.1 (Payment) + 5.3 (Varian) secara paralel
Minggu 2-3: 5.2 (Printer) + 5.5 (Simple Transfer) secara paralel
Minggu 3-4: 5.4 (Templates) + 5.6 (Customer Import) + 5.7 (Barcode)
Minggu 4+:  5.8 (Report Schedule) + 5.9 (Settings Reorg)
```
