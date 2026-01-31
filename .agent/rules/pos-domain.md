# POS Domain Rules - MokaPOS

## Bisnis Logic

* Semua amount/harga menggunakan DECIMAL(15,2), BUKAN float
* Currency: IDR (Indonesian Rupiah), format: `Rp 1.000.000`
* Tax default: PPN 11%
* Rounding: pembulatan ke angka terdekat sesuai konfigurasi outlet
* Multi-payment dalam 1 transaksi HARUS didukung
* Split bill dan merge bill HARUS didukung untuk F&B

## Transaction Flow

* Cart → Apply Discount/Promo → Calculate Tax → Process Payment → Deduct Stock → Award Loyalty Points → Generate Receipt → Send to KDS (if F&B)
* Setiap transaksi HARUS tercatat meskipun offline — sync kemudian
* Receipt number format: `{OUTLET_CODE}-{YYYYMMDD}-{SEQUENCE}`

## Refund (Improved dari Moka POS)

* Partial refund HARUS bisa per-item (ini keunggulan vs Moka)
* Refund method: cash, original payment method, atau store credit
* Refund harus proportional recalculate tax & discount
* Refund harus reverse stock (add back)
* Refund harus reverse loyalty points (deduct)
* Setiap refund WAJIB audit log

## KDS (Kitchen Display System)

* Real-time via WebSocket
* Order routing by station (grill, drinks, dessert, etc.)
* Cooking timer per item
* Bump/complete functionality
* Priority system untuk urgent orders
* KDS HARUS bisa jalan tanpa internet (offline-capable)

## Stock & Inventory

* Real-time stock deduction saat transaksi
* Low stock alert berdasarkan threshold per outlet
* Ingredient auto-deduction berdasarkan recipe
* Stock transfer antar outlet dengan approval workflow
* Negative stock handling (configurable: allow/block)

## Roles & Permissions

* Super Admin > Owner > Manager > Supervisor > Cashier / Kitchen Staff / Inventory Staff
* Login via PIN (POS terminal) atau email+password (backoffice)
* Sensitive actions (void, refund, discount override) butuh approval dari role yang lebih tinggi
* Semua sensitive actions WAJIB audit log
