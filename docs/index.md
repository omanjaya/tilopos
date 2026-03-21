# TiloPOS — Dokumentasi Lengkap

## Tentang TiloPOS

TiloPOS adalah sistem Point of Sale (POS) untuk UMKM Indonesia. Mendukung berbagai tipe bisnis: F&B (restoran, kafe, fast food), retail (grocery, fashion, hardware, elektronik), layanan (salon, bengkel, laundry), dan grosir/wholesale.

---

## Peta Fitur

| # | Modul | Fitur Utama | Jumlah Sub-fitur | Status |
|---|-------|-------------|------------------|--------|
| 01 | [POS Terminal](./01-pos/) | Kasir, pembayaran, struk | 15+ | Production |
| 02 | [Dashboard](./02-dashboard/) | Analytics, grafik, overview | 10+ | Production |
| 03 | [Produk](./03-produk/) | Manajemen produk, kategori, bundle | 8+ | Production |
| 04 | [Inventori](./04-inventori/) | Stok, opname, transfer, supplier, PO | 12+ | Production |
| 05 | [Laporan](./05-laporan/) | Sales, financial, produk, payment | 10+ | Production |
| 06 | [Pelanggan](./06-pelanggan/) | CRM, segmentasi | 3+ | Production |
| 07 | [Karyawan](./07-karyawan/) | HR, shift management | 3+ | Production |
| 08 | [Promosi](./08-promosi/) | Diskon, voucher, loyalty, BON | 5+ | Production |
| 09 | [Manajemen Meja](./09-manajemen-meja/) | Floor plan, pesanan, waiting list | 4+ | Production |
| 10 | [Layanan](./10-layanan/) | Appointment, work order, item tracking | 3+ | Production |
| 11 | [Saluran Online](./11-saluran-online/) | Online store, self-order QR | 2+ | Production |
| 12 | [Pengaturan](./12-pengaturan/) | 15 halaman konfigurasi | 15 | Production |
| 13 | [KDS](./13-kds/) | Kitchen Display System | 8+ | Production |

---

## Statistik Sistem

- **44 fitur** yang bisa diaktifkan/nonaktifkan per bisnis
- **80+ halaman** unik (desktop + mobile)
- **7 role** dengan hierarki akses
- **12 tipe bisnis** preset + custom
- **9 metode pembayaran** (tunai, QRIS, kartu debit/kredit, GoPay, OVO, DANA, ShopeePay, LinkAja)
- **Offline mode** — transaksi tetap jalan tanpa internet

---

## Hierarki Role

```
Super Admin → Owner → Manager → Supervisor → Cashier / Kitchen / Inventory
```

| Role | Akses |
|------|-------|
| Super Admin | Seluruh sistem, semua bisnis |
| Owner | Seluruh fitur bisnis sendiri |
| Manager | Karyawan, inventory, laporan, POS |
| Supervisor | Operasional: POS, inventory, laporan |
| Cashier | POS, transaksi, pesanan, meja, shift |
| Kitchen | KDS dan pesanan saja |
| Inventory | Produk, bahan baku, semua fitur inventori |

---

## Tipe Bisnis & Fitur Default

### F&B
| Fitur | Restoran | Kafe | Fast Food |
|-------|----------|------|-----------|
| Kitchen Display (KDS) | Ya | Ya | Ya |
| Manajemen Meja | Ya | - | - |
| Waiting List | Ya | - | - |
| Self-Order QR | - | Ya | - |
| Modifier (ukuran, topping) | Ya | Ya | Ya |
| Bahan Baku / Resep | Ya | - | - |
| Loyalty | Ya | Ya | - |

### Retail
| Fitur | Grocery | Fashion | Hardware | Elektronik |
|-------|---------|---------|----------|------------|
| Barcode Scanner | Ya | - | Ya | Ya |
| Stok Management | Ya | Ya | Ya | Ya |
| Transfer Stok | Ya | Ya | Ya | Ya |
| Supplier & PO | Ya | Ya | Ya | Ya |
| Varian Produk | - | Ya | Ya | - |
| Konversi Satuan | - | - | Ya | - |
| Harga Bertingkat | - | - | Ya | - |
| Serial Number | - | - | - | Ya |
| Online Store | - | Ya | - | Ya |
| Credit Sales (BON) | - | - | Ya | - |

### Service
| Fitur | Salon | Bengkel | Laundry |
|-------|-------|---------|---------|
| Appointment | Ya | Ya | - |
| Waiting List | Ya | - | - |
| Work Order | - | Ya | - |
| Item Tracking | - | - | Ya |
| Durasi Layanan | Ya | - | - |

### Wholesale
Semua fitur retail + konversi satuan, harga bertingkat, multi-warehouse, credit sales, decimal quantity.

---

## Struktur Dokumentasi

Setiap modul memiliki 3 dokumen:

1. **sales-pitch.md** — Materi jualan: value proposition, use case, ROI
2. **user-guide.md** — Panduan pengguna: step-by-step, tips, FAQ
3. **feature-audit.md** — Audit fitur: UX evaluation, best practice, gap analysis, roadmap

---

## Quick Links

- [Materi Sales per Tipe Bisnis](./sales/business-types/)
- [Perbandingan vs Kompetitor](./sales/comparison.md)
- [Pricing & Paket](./sales/pricing.md)
