# Saluran Online TiloPOS: Jual Online Tanpa Effort Tambahan

## Headline

**Buka saluran penjualan baru dalam hitungan menit. Toko online dan QR table ordering yang sinkron langsung dengan POS Anda -- tanpa perlu kelola dua sistem.**

---

## Masalah Penjualan Online bagi UMKM Indonesia

Bisnis F&B dan retail di Indonesia menghadapi dilema: pelanggan semakin mengharapkan kemudahan pesan online, tapi:

- **Membuat toko online itu ribet** -- harus buat website/marketplace, upload produk satu-satu, kelola stok terpisah.
- **Data tidak sinkron** -- produk dan harga di POS beda dengan di toko online. Stok habis di toko tapi masih tampil tersedia di online.
- **Butuh staf tambahan** -- butuh orang khusus untuk terima pesanan online, update stok, dan proses pengiriman.
- **Self-order QR belum umum** -- pelanggan masih harus antri atau panggil pelayan untuk pesan, padahal banyak yang lebih nyaman pesan dari HP.
- **Biaya marketplace tinggi** -- komisi GoFood, GrabFood, Shopee Food bisa 20-30% per pesanan.

---

## Solusi: TiloPOS Saluran Online

### 1. Toko Online (Online Store)

**Buat toko online Anda sendiri -- langsung sinkron dengan produk POS.**

- **Buat toko online dalam 1 menit**:
  - Buka halaman Toko Online (`/app/online-store`).
  - Klik "Buat Toko", isi nama toko dan slug URL.
  - Selesai. Toko online Anda langsung live di URL unik: `/online-store/s/nama-toko-anda`.

- **Storefront publik yang menarik**:
  - Halaman toko online menampilkan header dengan nama toko, deskripsi, dan logo.
  - **Katalog produk** diambil langsung dari database produk POS -- tidak perlu input ulang.
  - Produk ditampilkan dalam grid dengan gambar, nama, harga, dan badge kategori.
  - **Filter kategori** dan **pencarian** untuk pelanggan menemukan produk dengan cepat.
  - Modal detail produk dengan gambar besar, varian (size/flavor), dan modifier groups.

- **Checkout flow lengkap**:
  - Pelanggan tambahkan produk ke keranjang.
  - Cart panel menampilkan item, quantity, subtotal.
  - Checkout flow multi-step: informasi pelanggan (nama, telepon, email) --> pilih metode pengiriman (delivery/pickup) --> review order --> submit.
  - Order success page dengan nomor pesanan.

- **Katalog sinkronisasi**:
  - Endpoint sync catalog: sinkronkan semua produk aktif dari POS ke toko online.
  - **Stock check real-time**: produk yang stoknya habis otomatis ditandai sebagai out-of-stock.
  - **Harga konsisten**: harga diambil dari database produk server-side -- client tidak bisa manipulasi harga.
  - **Selective sync**: bisa pilih produk mana saja yang ditampilkan di toko online.
  - **Price override**: bisa set harga berbeda untuk channel online (misalnya markup untuk delivery).

- **Manajemen pesanan**:
  - Pesanan online masuk dan bisa dilihat per toko.
  - Status pesanan: pending --> confirmed --> processing --> shipped --> delivered (atau cancelled).
  - **Integrasi KDS otomatis**: pesanan online otomatis membuat kitchen order yang muncul di KDS, sehingga dapur langsung mulai menyiapkan.
  - **Inventory reserve**: saat pesanan dibuat, stok langsung direservasi agar tidak oversell.

- **Pengaturan toko**:
  - Delivery radius, minimum order amount, delivery fee.
  - Free delivery threshold (gratis ongkir di atas nominal tertentu).
  - Toggle delivery dan pickup enabled/disabled.
  - Jam operasional toko online.

- **Perhitungan ongkir**:
  - Tiga mode shipping: distance-based (zona jarak), flat rate, atau free shipping.
  - Zona jarak default: 0-5km gratis, 5-10km Rp 10.000, 10-20km Rp 20.000, 20+ km Rp 35.000.
  - Bisa custom flat rate amount.

- **Analytics toko**:
  - Total pesanan, total revenue, rata-rata nilai pesanan.
  - Produk terpopuler (by quantity dan revenue).
  - Breakdown pesanan per status.
  - Pesanan 7 hari terakhir.

- **Inventory status**:
  - Lihat status stok semua produk di toko online.
  - Kategorisasi: in stock, low stock, out of stock.
  - Summary: total produk, jumlah per kategori stok.

### 2. Self-Order QR (Pemesanan Mandiri via QR)

**Kurangi beban staf -- pelanggan pesan sendiri dari meja menggunakan HP mereka.**

- **Konsep sederhana**: setiap meja di restoran memiliki QR code unik. Pelanggan scan, halaman menu terbuka di browser HP mereka, pilih item, submit pesanan -- langsung masuk ke POS dan KDS.

- **Cara kerja (3 langkah)**:
  1. Pelanggan scan QR code di meja --> membuka halaman self-order (`/order/:sessionCode`).
  2. Buka menu dan pilih pesanan -- browse produk dengan gambar, harga, dan modifier.
  3. Pesanan masuk ke POS dan KDS otomatis -- langsung muncul di terminal kasir dan kitchen display.

- **Halaman konfigurasi** (`/app/self-order`):
  - Penjelasan cara kerja self-order (workflow visual 3 langkah).
  - QR Code Generator -- generate QR code per meja (saat ini memerlukan konfigurasi meja terlebih dahulu).
  - Preview Menu -- lihat tampilan menu yang akan dilihat pelanggan. Menampilkan semua produk dengan gambar, harga, kategori, dan badge ketersediaan.
  - Pilih outlet untuk preview menu.

- **Halaman pelanggan (Customer Self-Order Page)**:
  - **Header** dengan kode sesi, kolom pencarian, filter kategori, dan ikon keranjang.
  - **Menu Grid** -- produk ditampilkan dalam grid card dengan gambar, nama, harga. Klik untuk detail.
  - **Product Detail Modal** -- gambar besar, deskripsi, varian, modifier, catatan, tombol add to cart.
  - **Product Lightbox** -- zoom gambar produk.
  - **Product Recommendations** -- rekomendasi produk populer (jika tidak ada filter aktif).
  - **Sticky Cart Footer** -- footer sticky yang menampilkan jumlah item dan total. Klik untuk buka keranjang.
  - **Cart Drawer** -- slide-up drawer menampilkan isi keranjang, update quantity, hapus item, tombol submit order.
  - **Order Confirmation** -- setelah submit, halaman konfirmasi menampilkan nomor pesanan, total, dan estimasi waktu.
  - **Offline indicator** -- jika koneksi internet terputus, indikator muncul dan pesanan ditahan hingga koneksi pulih.
  - **Session management** -- setiap sesi punya kode unik dan waktu kadaluarsa. Sesi bisa diperpanjang.

- **Backend self-order**:
  - Create session (per meja/outlet).
  - Get session by code.
  - Get menu by outlet (dengan support multi-bahasa: ID/EN).
  - Add item to session.
  - Submit session --> otomatis buat order di database + emit event ke KDS.
  - Calculate session total.
  - Payment: QRIS, GoPay, OVO, Dana, ShopeePay (infrastruktur siap).
  - Session extend (perpanjang waktu sesi).
  - i18n translations endpoint.
  - Menu translations management.

---

## Kenapa Ini Penting?

### Toko Online: Revenue Channel Baru

| Aspek | Tanpa Toko Online | Dengan Toko Online TiloPOS |
|-------|-------------------|-----------------------------|
| Jangkauan pelanggan | Hanya yang datang ke toko | Plus pelanggan yang pesan online |
| Jam operasional | Terbatas jam buka toko | 24 jam (pesanan masuk kapan saja) |
| Biaya per pesanan | Komisi marketplace 20-30% | 0% komisi -- toko Anda sendiri |
| Data pelanggan | Milik marketplace | Milik Anda sepenuhnya |
| Branding | Seragam marketplace | Custom (nama, logo, deskripsi) |
| Stok | Kelola manual 2 sistem | Otomatis sinkron |

### QR Self-Order: Efisiensi Operasional

| Aspek | Tanpa Self-Order | Dengan Self-Order QR |
|-------|------------------|-----------------------|
| Proses pesan | Pelanggan antri / panggil pelayan | Scan QR, pesan dari HP |
| Staf dibutuhkan | 1 kasir per 10-15 meja | 1 kasir bisa handle 30+ meja |
| Waktu pesan | 3-5 menit (tunggu pelayan) | 1-2 menit (langsung pesan) |
| Kesalahan pesanan | Sering (verbal miscommunication) | Minimal (pelanggan input sendiri) |
| Upsell | Tergantung skill pelayan | Rekomendasi produk otomatis |
| Peak hour handling | Bottleneck di kasir | Pelanggan pesan paralel |

---

## Return on Investment (ROI)

### Toko Online

- **Revenue tambahan**: bisnis yang buka channel online rata-rata mendapat tambahan 15-30% omzet dari pesanan online.
- **Penghematan komisi marketplace**: jika sebelumnya pakai GoFood/GrabFood dengan komisi 25%, beralih ke toko online sendiri menghemat Rp 250.000 per Rp 1.000.000 penjualan.
- **Data pelanggan**: email dan telepon pelanggan online menjadi aset untuk marketing direct (promo, loyalty program).

### Self-Order QR

- **Pengurangan kebutuhan staf**: di jam ramai, 1-2 staf bisa di-realokasi dari kasir/pelayan ke area lain.
- **Table turnover lebih cepat**: pelanggan tidak perlu menunggu pelayan, langsung pesan begitu duduk. Estimasi penghematan 5-10 menit per meja.
- **Average order value meningkat**: pelanggan yang pesan sendiri cenderung explore menu lebih lama dan memesan lebih banyak (10-15% peningkatan).
- **Error rate menurun**: kesalahan pesanan dari miscommunication verbal berkurang drastis.

### Potensi Integrasi Marketplace

Infrastruktur toko online TiloPOS didesain dengan extensibility. Kedepannya, catalog sync dan order management bisa digunakan sebagai basis untuk:
- Integrasi GoBiz / GrabMerchant sebagai additional channel (bukan pengganti).
- Sinkronisasi menu dan harga ke marketplace dari satu sumber data.
- Konsolidasi pesanan dari semua channel ke satu dashboard.

---

## Siapa yang Cocok Menggunakan?

### Toko Online

| Tipe Bisnis | Use Case |
|-------------|----------|
| Restoran/kafe | Terima pesanan delivery/takeaway langsung tanpa komisi marketplace |
| Toko kue/bakery | Pelanggan pesan kue custom dan pilih pickup date |
| Toko retail | Katalog online untuk pelanggan yang mau pesan dari rumah |
| Catering | Customer lihat menu dan place order untuk event |

### Self-Order QR

| Tipe Bisnis | Use Case |
|-------------|----------|
| Restoran dine-in | Pelanggan pesan dari meja tanpa panggil pelayan |
| Kafe/coffee shop | Antrian berkurang drastis di jam peak |
| Food court | Setiap tenant bisa punya QR masing-masing |
| Bar/pub | Pelanggan order tambahan tanpa harus ke bar counter |

---

## Feature Flags

- `online_store` -- Toko Online (storefront, catalog sync, order management, analytics, shipping)
- `self_order_qr` -- Self-Order QR (session management, customer self-order page, payment, menu i18n)

Kedua fitur bisa diaktifkan bersamaan atau terpisah sesuai kebutuhan bisnis.

---

## Kesimpulan

Saluran Online TiloPOS menghilangkan barrier utama UMKM untuk jualan online: kerumitan dan double-entry. Produk yang sudah ada di POS langsung tersedia di toko online dan menu self-order. Stok sinkron otomatis. Pesanan masuk ke satu tempat.

Dengan toko online, Anda mendapat revenue channel baru tanpa komisi marketplace. Dengan QR self-order, Anda mengoptimalkan operasional restoran tanpa menambah staf.

**Saatnya bisnis Anda hadir di mana saja pelanggan berada -- online dan di meja.**
