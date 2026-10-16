# Panduan Pengguna: Saluran Online TiloPOS

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Setting Up Online Store (Toko Online)](#2-setting-up-online-store)
3. [Generate QR Code per Meja](#3-generate-qr-code-per-meja)
4. [Konfigurasi Self-Order](#4-konfigurasi-self-order)
5. [Melihat Pesanan Masuk dari Online](#5-melihat-pesanan-masuk-dari-online)
6. [Tips: Promosi Online dan Customer Experience](#6-tips-promosi-online-dan-customer-experience)
7. [FAQ (Pertanyaan yang Sering Diajukan)](#7-faq)

---

## 1. Pendahuluan

Modul Saluran Online TiloPOS terdiri dari dua sub-modul:

| Sub-modul | Path | Feature Flag | Fungsi |
|-----------|------|-------------|--------|
| Toko Online | `/app/online-store` | `online_store` | Buat dan kelola toko online |
| Self-Order | `/app/self-order` | `self_order_qr` | Konfigurasi pemesanan mandiri via QR |

Halaman publik (tanpa login):
- **Storefront**: `/store/s/:slug` -- halaman toko online untuk pelanggan.
- **Customer Self-Order**: `/order/:sessionCode` -- halaman pemesanan mandiri untuk pelanggan.

**Prasyarat:**
- Login dengan akun yang memiliki role Cashier ke atas (untuk konfigurasi). Owner/Manager diperlukan untuk pengaturan toko.
- Outlet dan produk harus sudah dikonfigurasi.
- Feature flag `online_store` dan/atau `self_order_qr` harus aktif.

---

## 2. Setting Up Online Store

### 2.1 Membuka Halaman Toko Online

1. Klik menu **Toko Online** di sidebar navigasi.
2. Halaman menampilkan daftar toko online yang sudah dibuat (jika ada), atau empty state jika belum ada toko.

### 2.2 Membuat Toko Online Baru

1. Klik tombol **Buat Toko** di pojok kanan atas.
2. Dialog pembuatan toko akan muncul. Isi field-field berikut:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| Nama Toko | Ya | Nama toko yang akan ditampilkan ke pelanggan (contoh: "Kedai Kopi Nusantara") |
| Slug | Ya | URL unik toko. Otomatis di-generate dari nama toko. Hanya huruf kecil, angka, dan strip. (contoh: "kedai-kopi-nusantara") |
| Deskripsi | Tidak | Deskripsi singkat toko yang ditampilkan di storefront |

3. **Slug otomatis**: saat Anda mengetik nama toko, slug otomatis di-generate. Anda bisa mengedit slug secara manual jika perlu.
4. Di bawah field slug, preview URL toko ditampilkan: `/online-store/s/slug-anda`.
5. Klik **Buat Toko**.
6. Jika berhasil, notifikasi "Toko berhasil dibuat" muncul dan toko baru ditampilkan di daftar.

### 2.3 Melihat Daftar Toko

Setiap toko ditampilkan sebagai kartu dengan informasi:
- **Ikon toko** dan **nama toko**.
- **Slug** (URL path).
- **Badge status**: Aktif (hijau) atau Nonaktif.
- **Deskripsi** (jika ada).
- Tombol **Lihat Toko** -- membuka storefront di tab baru.

### 2.4 Mengunjungi Storefront

1. Klik tombol **Lihat Toko** pada kartu toko, atau buka URL: `{base_url}/online-store/s/{slug}`.
2. Storefront menampilkan:
   - **Header toko**: nama toko, deskripsi, kolom pencarian, ikon keranjang.
   - **Grid produk**: semua produk aktif dari bisnis Anda ditampilkan dengan gambar, nama, harga, dan kategori.
   - **Filter kategori**: sidebar atau tab kategori untuk memfilter produk.

### 2.5 Alur Belanja Pelanggan di Storefront

Berikut alur yang dialami pelanggan saat mengakses storefront Anda:

**Langkah 1: Browse Produk**
- Pelanggan membuka URL toko online.
- Melihat katalog produk lengkap dengan gambar, harga, dan kategori.
- Bisa filter kategori dan search produk.

**Langkah 2: Pilih Produk**
- Klik produk untuk melihat detail: gambar besar, deskripsi, pilih varian (jika ada), pilih modifier (jika ada), atur quantity.
- Klik "Add to Cart".

**Langkah 3: Review Keranjang**
- Klik ikon keranjang di header untuk membuka cart panel.
- Review item: ubah quantity, hapus item, lihat subtotal per item.
- Klik "Checkout" untuk lanjut.

**Langkah 4: Informasi Pelanggan**
- Isi form: nama, nomor telepon, email (opsional).
- Form customer info ini diisi di step pertama checkout flow.

**Langkah 5: Pilih Metode Pengiriman**
- Pilih delivery (kirim ke alamat) atau pickup (ambil di toko).
- Jika delivery, isi alamat pengiriman.

**Langkah 6: Review & Submit**
- Review ringkasan pesanan: item, subtotal, ongkir, total.
- Klik "Submit Order".

**Langkah 7: Konfirmasi**
- Halaman Order Success menampilkan: nomor pesanan, total, metode pengiriman, data pelanggan.
- Pelanggan bisa klik "Belanja Lagi" untuk kembali ke storefront.

### 2.6 Sinkronisasi Katalog

Produk di toko online diambil langsung dari database produk POS. Untuk memastikan katalog terbaru:

1. **Sync otomatis**: setiap kali storefront dibuka, sistem mengambil produk aktif terbaru dari database.
2. **Manual sync** (untuk admin): gunakan endpoint `POST /api/v1/online-store/stores/:id/sync-catalog` untuk trigger sync penuh. Sync ini juga mengecek ketersediaan stok.
3. **Selective sync**: gunakan endpoint `POST /api/v1/online-store/catalog/sync` untuk sync produk tertentu dengan opsi price override.

### 2.7 Pengaturan Toko

Pengaturan toko dikelola melalui API `PUT /api/v1/online-store/stores/:storeId/settings` (memerlukan role Owner atau Manager). Pengaturan yang tersedia:

| Setting | Tipe | Keterangan |
|---------|------|------------|
| deliveryRadius | number | Radius pengiriman dalam km |
| minOrderAmount | number | Minimum order amount (Rp) |
| deliveryFee | number | Biaya pengiriman default (Rp) |
| freeDeliveryThreshold | number | Minimum order untuk gratis ongkir (Rp) |
| isDeliveryEnabled | boolean | Aktifkan/nonaktifkan opsi delivery |
| isPickupEnabled | boolean | Aktifkan/nonaktifkan opsi pickup |
| operatingHoursStart | string | Jam buka toko online (format "HH:MM") |
| operatingHoursEnd | string | Jam tutup toko online (format "HH:MM") |

### 2.8 Mode Pengiriman (Shipping)

Toko online mendukung tiga mode pengiriman:

**Distance-based (default):**
| Zona | Jarak | Biaya | Estimasi |
|------|-------|-------|----------|
| Gratis Ongkir | 0 - 5 km | Rp 0 | Hari yang sama |
| Zona 1 | 5 - 10 km | Rp 10.000 | 1 hari |
| Zona 2 | 10 - 20 km | Rp 20.000 | 1 hari |
| Zona 3 | 20+ km | Rp 35.000 | 2 hari |

**Flat rate:**
Biaya pengiriman tetap untuk semua jarak. Nominal bisa dikonfigurasi di settings.

**Free shipping:**
Gratis ongkir untuk semua pesanan.

---

## 3. Generate QR Code per Meja

### 3.1 Konsep QR Code Self-Order

Setiap meja di restoran memiliki QR code unik yang mengarahkan pelanggan ke halaman pemesanan. Saat pelanggan scan QR code, sistem membuat "sesi" (session) yang menghubungkan pesanan dengan meja tersebut.

### 3.2 Membuka Halaman Self-Order

1. Klik menu **Self-Order** di sidebar navigasi.
2. Halaman menampilkan:
   - **Cara Kerja Self-Order** -- penjelasan visual 3 langkah.
   - **QR Code Generator** -- area generate QR code.
   - **Preview Menu** -- preview tampilan menu pelanggan.

### 3.3 Generate QR Code

1. Di bagian QR Code Generator, pilih **outlet** dari dropdown.
2. Saat ini, QR code generator memerlukan fitur meja dikonfigurasi terlebih dahulu (tabel meja harus ada di database).
3. Setelah meja dikonfigurasi, setiap meja akan mendapatkan QR code yang unik yang mengarah ke URL: `/order/{sessionCode}`.

**Cara membuat session secara manual (via API):**
1. Hit endpoint `POST /api/v1/self-order/sessions` dengan body: `{ "outletId": "xxx", "tableId": "yyy" }`.
2. Response berisi `sessionCode` yang unik.
3. QR code di-generate dari URL: `{base_url}/order/{sessionCode}`.

### 3.4 Mencetak QR Code

Setelah QR code di-generate:
1. QR code bisa dicetak dan ditempel di setiap meja.
2. Pastikan QR code cukup besar (minimal 3x3 cm) agar mudah di-scan.
3. Tambahkan teks instruksi di bawah QR code: "Scan untuk pesan".
4. Laminasi QR code agar tahan lama.

---

## 4. Konfigurasi Self-Order

### 4.1 Preview Menu

Sebelum mengaktifkan self-order untuk pelanggan, preview terlebih dahulu tampilan menu:

1. Di halaman Self-Order (`/app/self-order`), scroll ke bagian **Preview Menu**.
2. Pilih outlet dari dropdown (jika belum dipilih).
3. Klik tombol **Preview Menu**.
4. Sistem akan mengambil semua produk aktif dari outlet tersebut.
5. Menu ditampilkan dalam grid 2 kolom, setiap produk menampilkan:
   - Gambar produk (atau placeholder jika tidak ada gambar).
   - Nama produk dan kategori.
   - Harga.
   - Badge ketersediaan: "Tersedia" (hijau) atau "Habis" (abu-abu).
6. Di atas grid, ditampilkan jumlah total produk dan jumlah yang tersedia.

### 4.2 Yang Perlu Disiapkan Sebelum Aktivasi

Checklist sebelum mengaktifkan self-order:

- [ ] **Produk sudah diinput** -- pastikan semua produk yang ingin ditampilkan sudah ada di database dengan nama, harga, dan kategori yang benar.
- [ ] **Gambar produk** -- upload gambar untuk setiap produk. Menu tanpa gambar terlihat kurang menarik.
- [ ] **Kategori terorganisir** -- kelompokkan produk ke kategori yang jelas (Makanan, Minuman, Snack, dll).
- [ ] **Harga akurat** -- periksa semua harga sudah benar karena pelanggan akan langsung melihatnya.
- [ ] **Meja dikonfigurasi** -- tambahkan meja melalui modul Manajemen Meja agar bisa generate QR code per meja.
- [ ] **KDS aktif** (opsional tapi disarankan) -- agar pesanan self-order langsung muncul di layar dapur.

### 4.3 Pengalaman Pelanggan Self-Order

Berikut yang dialami pelanggan saat menggunakan self-order:

**Langkah 1: Scan QR Code**
- Pelanggan membuka kamera HP dan scan QR code di meja.
- Browser membuka halaman self-order (`/order/{sessionCode}`).

**Langkah 2: Browse Menu**
- Header menampilkan kode sesi dan outlet.
- Filter kategori di bagian atas: "Semua", "Makanan", "Minuman", dll.
- Kolom pencarian untuk cari produk spesifik.
- Grid produk dengan gambar, nama, harga.
- Rekomendasi produk populer ditampilkan di bagian atas (jika tidak ada filter aktif).

**Langkah 3: Pilih Produk**
- Klik produk untuk membuka detail modal.
- Lihat gambar besar, deskripsi, pilih varian (jika ada).
- Klik "Add to Cart".

**Langkah 4: Review Keranjang**
- Sticky footer di bawah layar menampilkan jumlah item dan total.
- Klik footer untuk buka keranjang (cart drawer).
- Di keranjang: ubah quantity, hapus item, lihat total.

**Langkah 5: Submit Pesanan**
- Klik "Pesan" di keranjang.
- Pesanan di-submit ke server.
- Loading indicator muncul selama proses.

**Langkah 6: Konfirmasi**
- Halaman konfirmasi menampilkan: nomor pesanan, total, estimasi waktu penyajian (15 menit).
- Pelanggan bisa klik "Pesan Lagi" untuk kembali ke menu.

### 4.4 Multi-Bahasa

Self-order mendukung multi-bahasa (saat ini: Indonesia dan English):

- **Endpoint bahasa**: `GET /api/v1/self-order/i18n/:locale` mengembalikan semua string terjemahan untuk UI.
- **Menu multi-bahasa**: `GET /api/v1/self-order/menu/:outletId?lang=en` mengembalikan menu dengan terjemahan nama produk (jika tersedia).
- **Kelola terjemahan**: `POST /api/v1/self-order/menu/translations` untuk menyimpan terjemahan nama dan deskripsi produk per bahasa.

### 4.5 Session Management

Setiap self-order session memiliki:
- **Session code** unik untuk identifikasi.
- **Waktu kadaluarsa** -- sesi otomatis expired setelah durasi tertentu.
- **Perpanjangan sesi**: endpoint `PUT /api/v1/self-order/sessions/:code/extend` untuk memperpanjang waktu sesi (opsional, parameter `minutes`).
- **Status sesi**: active (bisa tambah item), submitted (sudah submit pesanan).

### 4.6 Pembayaran Self-Order

Infrastruktur pembayaran self-order sudah disiapkan:

- **Hitung total**: `GET /api/v1/self-order/sessions/:code/total`
- **Buat pembayaran**: `POST /api/v1/self-order/sessions/:code/pay` dengan method: QRIS, GoPay, OVO, Dana, ShopeePay.
- **QRIS shortcut**: `POST /api/v1/self-order/sessions/:code/pay/qris` untuk pembayaran QRIS langsung.
- **Cek status pembayaran**: `GET /api/v1/self-order/sessions/:code/payment-status`
- **Webhook callback**: `POST /api/v1/self-order/payment/callback` untuk menerima notifikasi status pembayaran dari payment gateway.

---

## 5. Melihat Pesanan Masuk dari Online

### 5.1 Pesanan Toko Online

Pesanan dari toko online bisa dilihat melalui:

1. **Per toko**: gunakan endpoint `GET /api/v1/online-store/s/:slug/orders` untuk mendapat daftar pesanan per toko. Bisa filter berdasarkan status.
2. **Update status**: `PUT /api/v1/online-store/orders/:id/status` untuk mengubah status pesanan. Status yang valid: pending, confirmed, processing, shipped, delivered, cancelled.
3. **Fulfill pesanan**: `PUT /api/v1/online-store/orders/:id/fulfill` untuk menandai pesanan sebagai shipped dengan tracking number dan shipping provider.

### 5.2 Pesanan Self-Order

Pesanan dari self-order otomatis masuk sebagai order biasa di sistem:

1. Saat pelanggan submit pesanan, sistem membuat record Order dengan tipe `dine_in` dan terhubung ke meja.
2. Pesanan muncul di halaman **Pesanan** (`/app/orders`) bersama pesanan lainnya.
3. Pesanan juga muncul di **KDS** (Kitchen Display System) secara real-time melalui WebSocket.
4. Staf dapur memproses pesanan seperti biasa: pending --> preparing --> ready --> served.

### 5.3 Notifikasi Pesanan Baru

- **KDS**: pesanan baru langsung muncul di Kitchen Display System melalui event `OrderStatusChangedEvent` yang di-publish via EventBus.
- **Halaman Pesanan**: auto-refresh setiap 30 detik (atau real-time via WebSocket jika KDS aktif).

---

## 6. Tips: Promosi Online dan Customer Experience

### 6.1 Optimalkan Storefront

- **Upload gambar produk berkualitas** -- foto produk yang menarik meningkatkan conversion rate signifikan. Gunakan foto dengan pencahayaan yang baik dan background bersih.
- **Tulis deskripsi yang menggugah** -- jangan hanya tulis nama produk. Tambahkan deskripsi singkat yang menjelaskan bahan, rasa, atau keunikan.
- **Kategorisasi yang logis** -- kelompokkan produk sesuai cara pelanggan berpikir: "Makanan Berat", "Camilan", "Minuman Dingin", "Minuman Panas".
- **Harga yang kompetitif** -- jika Anda juga ada di marketplace, pertimbangkan harga toko online sedikit lebih murah (karena tidak ada komisi marketplace).

### 6.2 Promosi Toko Online

- **Share URL toko online** ke media sosial (Instagram, WhatsApp, Facebook).
- **Tambahkan di bio Instagram**: link ke storefront Anda.
- **WhatsApp Business**: set auto-reply yang menyertakan link toko online.
- **Banner promo**: manfaatkan deskripsi toko untuk mengumumkan promo terbaru.
- **Promo gratis ongkir**: set free delivery threshold (misalnya Rp 100.000) untuk mendorong pelanggan belanja lebih banyak.

### 6.3 Self-Order Best Practices

- **QR code di setiap meja** -- pastikan QR code tercetak jelas, tidak rusak, dan mudah di-scan.
- **Tambahkan instruksi** -- tempel stiker kecil di dekat QR: "Scan untuk pesan sendiri. Tidak perlu antri!"
- **Edukasi staf** -- staf harus bisa membantu pelanggan yang kesulitan scan atau navigasi menu.
- **Menu lengkap di digital** -- pastikan semua produk yang tersedia di menu fisik juga ada di menu digital.
- **Update ketersediaan** -- jika ada produk yang habis, segera update agar tidak muncul di menu self-order.
- **Test sebelum deploy** -- scan QR code sendiri dan coba alur pemesanan lengkap sebelum memberikannya ke pelanggan.

### 6.4 Handling Masalah Umum

| Masalah | Solusi |
|---------|--------|
| QR code tidak bisa di-scan | Cek pencahayaan, ukuran QR (min 3x3 cm), kebersihan permukaan |
| Menu tidak muncul | Pastikan produk sudah diinput dan outlet sudah dikonfigurasi |
| Pesanan tidak masuk ke KDS | Pastikan KDS aktif dan terhubung via WebSocket |
| Pelanggan bilang "loading terus" | Cek koneksi internet restoran, terutama WiFi untuk pelanggan |
| Session expired | Perpanjang sesi via API atau minta pelanggan scan ulang QR |

---

## 7. FAQ

### Q: Berapa toko online yang bisa saya buat?
**A:** Tidak ada batasan. Anda bisa membuat beberapa toko online dengan slug berbeda, misalnya satu untuk menu reguler dan satu untuk menu catering.

### Q: Apakah pelanggan perlu registrasi untuk pesan di toko online?
**A:** Tidak. Toko online TiloPOS tidak memerlukan registrasi pelanggan. Pelanggan cukup mengisi nama, telepon, dan (opsional) email saat checkout.

### Q: Bagaimana cara memastikan stok akurat di toko online?
**A:** Stok diperiksa secara real-time saat pesanan dibuat. Produk yang stoknya habis ditandai sebagai out-of-stock. Saat pesanan dibuat, stok langsung direservasi (inventory reserve) sehingga tidak terjadi oversell.

### Q: Apakah saya bisa set harga berbeda untuk toko online?
**A:** Ya. Gunakan fitur price override di catalog sync (`POST /api/v1/online-store/catalog/sync`) untuk set harga khusus channel online. Misalnya, markup Rp 5.000 untuk delivery.

### Q: Bagaimana alur pembayaran toko online?
**A:** Saat ini, pesanan toko online dibuat dengan status "pending". Pembayaran diproses terpisah (COD atau transfer). Integrasi payment gateway langsung di storefront ada di roadmap.

### Q: Apakah pelanggan self-order bisa bayar langsung dari HP?
**A:** Infrastruktur pembayaran sudah disiapkan di backend (QRIS, GoPay, OVO, Dana, ShopeePay). Integrasi dengan payment gateway spesifik perlu dikonfigurasi sesuai kebutuhan bisnis.

### Q: Apa yang terjadi jika internet di restoran mati saat pelanggan sedang self-order?
**A:** Halaman self-order memiliki offline indicator. Jika koneksi terputus, pelanggan akan melihat pesan bahwa mereka sedang offline. Pesanan yang sedang dalam proses ditahan di browser hingga koneksi pulih. Jika submit gagal, error alert ditampilkan.

### Q: Bagaimana cara menambah bahasa baru untuk menu self-order?
**A:** Saat ini mendukung Bahasa Indonesia (id) dan English (en). Terjemahan menu dikelola melalui endpoint `POST /api/v1/self-order/menu/translations`. Untuk menambah bahasa baru, terjemahan UI perlu ditambahkan di file `i18n.ts` di backend.

### Q: Apakah self-order bisa digunakan tanpa modul Manajemen Meja?
**A:** Secara teknis, session self-order bisa dibuat tanpa tableId (parameter opsional). Namun, workflow ideal adalah mengaitkan setiap QR code dengan meja tertentu agar pesanan terhubung dengan meja.

### Q: Bagaimana jika pelanggan memesan item yang sudah habis di self-order?
**A:** Saat ini, ketersediaan produk di menu self-order ditandai dengan field `isAvailable`. Staf perlu memperbarui ketersediaan produk secara manual. Integrasi otomatis dengan stok real-time ada di roadmap.

### Q: Berapa lama sesi self-order aktif?
**A:** Setiap sesi memiliki waktu kadaluarsa yang ditentukan saat pembuatan. Jika pelanggan memerlukan waktu lebih lama, sesi bisa diperpanjang melalui endpoint `PUT /api/v1/self-order/sessions/:code/extend`.

### Q: Apakah pesanan online otomatis masuk ke KDS?
**A:** Ya. Baik pesanan dari toko online maupun self-order, keduanya membuat record Order di database dan memancarkan event `OrderStatusChangedEvent` melalui EventBus. KDS yang terhubung via WebSocket akan menampilkan pesanan baru secara real-time.
