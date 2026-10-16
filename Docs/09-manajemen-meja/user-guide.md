# Panduan Pengguna: Manajemen Meja TiloPOS

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Membuat Denah Meja (Floor Plan Editor)](#2-membuat-denah-meja-floor-plan-editor)
3. [Mengubah Status Meja](#3-mengubah-status-meja)
4. [Membuat Pesanan untuk Meja](#4-membuat-pesanan-untuk-meja)
5. [Tracking Pesanan (Preparing - Ready - Served)](#5-tracking-pesanan)
6. [Merge dan Split Bill](#6-merge-dan-split-bill)
7. [Mengelola Waiting List](#7-mengelola-waiting-list)
8. [Reservasi](#8-reservasi)
9. [Tips Manajemen Meja Restoran](#9-tips-manajemen-meja-restoran)
10. [FAQ (Pertanyaan yang Sering Diajukan)](#10-faq)

---

## 1. Pendahuluan

Modul Manajemen Meja TiloPOS membantu Anda mengelola seluruh aspek operasional meja restoran: dari denah visual, pelacakan pesanan, pengelolaan tagihan, hingga antrian pelanggan. Modul ini dapat diakses melalui menu sidebar di bawah bagian **Manajemen Meja**.

**Halaman-halaman yang tersedia:**

| Menu | Path | Fungsi |
|------|------|--------|
| Manajemen Meja | `/app/tables` | Denah meja, split/merge bill |
| Pesanan | `/app/orders` | Daftar dan tracking pesanan dapur |
| Detail Pesanan | `/app/orders/:id` | Detail lengkap satu pesanan |
| Daftar Tunggu | `/app/waiting-list` | Antrian pelanggan |

**Prasyarat:**
- Anda harus login dengan akun yang memiliki role Cashier ke atas.
- Outlet harus sudah dikonfigurasi di pengaturan bisnis.
- Feature flag `table_management`, `order_management`, dan/atau `waiting_list` harus aktif untuk bisnis Anda.

---

## 2. Membuat Denah Meja (Floor Plan Editor)

### 2.1 Beralih ke Tampilan Denah

1. Buka halaman **Manajemen Meja** (`/app/tables`).
2. Di pojok kanan atas, Anda akan melihat tombol toggle tampilan: **Daftar** dan **Denah**.
3. Klik tombol **Denah** (ikon grid) untuk beralih ke tampilan layout editor.

### 2.2 Memahami Komponen Denah

Denah meja terdiri dari beberapa komponen:

- **Toolbar** (atas): filter area/seksi, kontrol zoom (zoom in, zoom out, reset), tombol simpan dan reset posisi.
- **Legend**: keterangan warna status meja -- Tersedia (hijau), Terisi (merah), Direservasi (biru), Digabung (kuning), Maintenance (abu-abu).
- **Canvas**: area grid tempat meja-meja diposisikan. Grid ini memiliki background garis bantu untuk memudahkan penempatan.
- **Panel Detail**: muncul di sisi kanan ketika Anda klik salah satu meja. Menampilkan detail meja terpilih.
- **Summary** (bawah): ringkasan jumlah meja per status.

### 2.3 Memposisikan Meja (Drag and Drop)

1. Pastikan mode **editable** aktif (secara default sudah aktif).
2. Klik dan tahan (atau sentuh dan tahan di mobile) pada sebuah meja.
3. Seret meja ke posisi yang diinginkan di grid.
4. Lepaskan untuk menempatkan meja di posisi baru.
5. Ulangi untuk meja-meja lainnya.

Ketika ada perubahan posisi yang belum disimpan, indikator "unsaved changes" akan muncul di toolbar.

### 2.4 Menyimpan Posisi Meja

1. Setelah mengatur posisi semua meja, klik tombol **Simpan** di toolbar.
2. Sistem akan menyimpan posisi semua meja yang telah dipindahkan.
3. Notifikasi sukses akan muncul: "Posisi meja disimpan -- X meja berhasil diperbarui."

### 2.5 Mereset Posisi

Jika Anda ingin mengembalikan posisi meja ke posisi sebelum perubahan:
1. Klik tombol **Reset** di toolbar.
2. Semua meja akan kembali ke posisi tersimpan terakhir.

### 2.6 Filter berdasarkan Area/Seksi

1. Di toolbar, gunakan dropdown atau tab **seksi** untuk memfilter meja berdasarkan area.
2. Hanya meja di area yang dipilih yang akan ditampilkan di canvas.
3. Pilih "Semua" untuk menampilkan semua meja.

### 2.7 Zoom

- Klik tombol **+** untuk zoom in (memperbesar tampilan).
- Klik tombol **-** untuk zoom out (memperkecil tampilan).
- Klik tombol **reset zoom** untuk kembali ke skala default.
- Zoom berguna ketika denah memiliki banyak meja dan Anda perlu melihat detail di area tertentu.

### 2.8 Melihat Detail Meja

1. Klik pada sebuah meja di canvas.
2. Panel detail akan muncul di sisi kanan, menampilkan:
   - **Nama meja** (misalnya "Meja 1", "VIP-A")
   - **Status** dengan badge berwarna
   - **Kapasitas** (jumlah orang)
   - **Area** (seksi/zona)
   - **Posisi** di grid (koordinat X, Y)
   - **Durasi** -- jika meja berstatus "occupied", durasi sejak meja ditempati
   - **Order ID** -- jika ada pesanan aktif di meja tersebut
3. Klik tombol **X** di panel detail untuk menutup.

---

## 3. Mengubah Status Meja

Status meja dapat diubah melalui API backend. Berikut status yang tersedia:

| Status | Keterangan |
|--------|------------|
| `available` | Meja kosong, siap digunakan |
| `occupied` | Meja sedang digunakan pelanggan |
| `reserved` | Meja sudah direservasi untuk pelanggan tertentu |
| `cleaning` | Meja sedang dibersihkan setelah pelanggan pergi |

Perubahan status terjadi secara otomatis dalam beberapa skenario:
- Ketika pelanggan dari **waiting list di-seat** ke meja, status meja otomatis berubah menjadi `occupied`.
- Ketika **reservasi di-check-in**, status meja berubah menjadi `occupied`.
- Ketika **reservasi dibatalkan**, status meja kembali ke `available`.

Staf juga dapat mengubah status meja secara manual melalui endpoint `PUT /api/v1/tables/:id/status`.

---

## 4. Membuat Pesanan untuk Meja

### 4.1 Membuat Pesanan dari POS

1. Buka halaman **POS** (`/pos`).
2. Pilih meja untuk pesanan dine-in.
3. Tambahkan item-item ke keranjang.
4. Proses pesanan -- pesanan akan terhubung dengan meja yang dipilih.

### 4.2 Membuat Pesanan dari Self-Order

Jika fitur Self-Order QR aktif:
1. Pelanggan scan QR code di meja.
2. Pelanggan memilih item dari menu digital.
3. Pesanan masuk secara otomatis ke sistem dan terhubung dengan meja yang sesuai.
4. Pesanan langsung muncul di halaman Pesanan dan KDS.

---

## 5. Tracking Pesanan

### 5.1 Membuka Halaman Pesanan

1. Buka halaman **Pesanan** (`/app/orders`).
2. Anda akan melihat daftar semua pesanan dengan kolom: No. Pesanan, Meja (jika `table_management` aktif), Tipe, Items, Status, Kasir, dan Waktu.

### 5.2 Filter Pesanan berdasarkan Status

Gunakan tab di bagian atas untuk filter:
- **Semua** -- semua pesanan
- **Menunggu** -- pesanan baru yang belum diproses
- **Diproses** -- pesanan sedang disiapkan di dapur
- **Siap** -- pesanan selesai disiapkan, siap disajikan
- **Disajikan** -- pesanan sudah diantar ke meja
- **Selesai** -- pesanan selesai

**Keyboard shortcut**: Tekan angka 1-5 pada keyboard untuk berpindah tab dengan cepat.

### 5.3 Mengubah Status Pesanan

1. Di kolom aksi (titik tiga) pada baris pesanan, klik untuk membuka menu dropdown.
2. Pilih aksi yang sesuai:
   - Pesanan **Menunggu**: "Proses" (ubah ke Diproses) atau "Batalkan"
   - Pesanan **Diproses**: "Tandai Siap"
   - Pesanan **Siap**: "Tandai Disajikan"
   - Pesanan **Disajikan**: "Selesai"
3. Dialog konfirmasi akan muncul. Klik tombol konfirmasi untuk melanjutkan.

### 5.4 Melihat Detail Pesanan

1. Klik "Lihat Detail" di menu aksi pesanan, atau klik ikon mata pada pesanan yang sudah selesai/dibatalkan.
2. Halaman **Detail Pesanan** menampilkan:
   - **Ringkasan**: status, tipe order (Dine In / Take Away / Delivery), meja, kasir, pelanggan, waktu.
   - **Catatan Pesanan**: jika ada catatan khusus.
   - **Tabel Item Pesanan**: daftar semua produk yang dipesan, qty, catatan per item, dan status per item.
3. Anda juga bisa mengubah status pesanan langsung dari halaman detail menggunakan tombol aksi di header.
4. Klik **Kembali** untuk kembali ke daftar pesanan.

### 5.5 Auto-Refresh

Daftar pesanan otomatis di-refresh setiap 30 detik untuk memastikan data selalu terbaru tanpa perlu reload halaman manual.

---

## 6. Merge dan Split Bill

### 6.1 Split Bill (Bagi Tagihan)

Split bill memungkinkan Anda membagi satu tagihan menjadi beberapa bagian pembayaran terpisah.

**Cara menggunakan:**

1. Buka halaman **Manajemen Meja** (`/app/tables`) dengan tampilan **Daftar**.
2. Klik kartu **Split Bill** atau klik tombol "Split Bill".
3. Dialog Split Bill akan terbuka.
4. Masukkan **ID Transaksi** yang ingin di-split.
5. Tentukan **Jumlah Bagian** (minimal 2, maksimal 10).
6. Klik tombol **Split Bill**.
7. Jika berhasil, notifikasi "Bill berhasil di-split" akan muncul.

**Jenis split yang didukung (backend):**
- **Equal** -- bagi rata ke semua bagian.
- **By Item** -- pilih item mana yang masuk ke bagian mana.
- **By Amount** -- tentukan nominal untuk setiap bagian.

### 6.2 Merge Bill (Gabung Tagihan)

Merge bill memungkinkan Anda menggabungkan beberapa tagihan dari meja berbeda menjadi satu tagihan.

**Cara menggunakan:**

1. Buka halaman **Manajemen Meja** (`/app/tables`) dengan tampilan **Daftar**.
2. Klik kartu **Merge Bill** atau klik tombol "Merge Bill".
3. Dialog Merge Bill akan terbuka.
4. Masukkan **ID Transaksi** yang ingin digabung, pisahkan dengan tanda koma (contoh: `txn-001, txn-002, txn-003`). Minimal 2 transaksi.
5. Klik tombol **Merge Bill**.
6. Jika berhasil, notifikasi "Bill berhasil di-merge" akan muncul.

---

## 7. Mengelola Waiting List

### 7.1 Membuka Halaman Daftar Tunggu

Buka halaman **Daftar Tunggu** (`/app/waiting-list`). Halaman ini menampilkan:
- **Statistik**: Total Menunggu, Rata-rata Waktu Tunggu, Waktu Tunggu Terlama.
- **Tabel Antrian**: daftar semua pelanggan yang menunggu dengan kolom Pelanggan, Jumlah Orang, Waktu Tunggu, Status, Meja, Catatan, dan Waktu Daftar.

### 7.2 Menambah Pelanggan ke Antrian

1. Klik tombol **Tambah Pelanggan** di pojok kanan atas.
2. Dialog akan terbuka. Isi data:
   - **Nama Pelanggan** (wajib)
   - **Jumlah Rombongan / Party Size** (wajib)
   - **Nomor Telepon** (opsional, berguna untuk notifikasi)
   - **Preferensi Area** (opsional, misalnya "Outdoor" atau "VIP")
   - **Catatan Khusus** (opsional)
3. Klik **Simpan** untuk menambahkan pelanggan ke antrian.

### 7.3 Mengirim Notifikasi ke Pelanggan

Ketika meja sudah siap untuk pelanggan yang menunggu:
1. Klik ikon titik tiga pada baris pelanggan yang bersangkutan.
2. Pilih **Kirim Notifikasi**.
3. Konfirmasi di dialog yang muncul.
4. Status pelanggan akan berubah menjadi "notified" dan waktu notifikasi dicatat.

### 7.4 Mendudukkan Pelanggan (Seat)

1. Klik ikon titik tiga pada baris pelanggan.
2. Pilih **Dudukkan**.
3. Dialog pemilihan meja akan terbuka.
4. Pilih meja yang tersedia (status `available`).
5. Klik **Dudukkan**.
6. Status pelanggan berubah menjadi "seated" dan status meja berubah menjadi "occupied".

### 7.5 Membatalkan Antrian

1. Klik ikon titik tiga pada baris pelanggan.
2. Pilih **Batalkan**.
3. Konfirmasi di dialog.
4. Pelanggan dihapus dari antrian aktif.

### 7.6 Menandai Tidak Datang (No-Show)

1. Klik ikon titik tiga pada baris pelanggan.
2. Pilih **Tidak Datang**.
3. Konfirmasi di dialog.
4. Pelanggan ditandai sebagai no-show. Data ini berguna untuk analisis.

### 7.7 Filter Antrian

Gunakan tab di bagian atas untuk filter:
- **Semua** -- semua entri antrian
- **Menunggu** -- pelanggan yang masih menunggu
- **Duduk** -- pelanggan yang sudah duduk
- **Dibatalkan** -- antrian yang dibatalkan

---

## 8. Reservasi

### 8.1 Membuat Reservasi

1. Reservasi dibuat melalui API endpoint `POST /api/v1/tables/reservations`.
2. Data yang diperlukan:
   - **tableId** -- ID meja yang ingin direservasi
   - **customerName** -- nama pelanggan
   - **customerPhone** -- nomor telepon pelanggan
   - **partySize** -- jumlah rombongan
   - **reservedAt** -- waktu reservasi (format ISO datetime)
   - **notes** -- catatan (opsional)
3. Sistem akan memeriksa apakah meja tersebut sudah memiliki reservasi lain dalam jendela waktu 2 jam. Jika ada konflik, reservasi ditolak.

### 8.2 Melihat Reservasi

1. Gunakan endpoint `GET /api/v1/tables/reservations?outletId=xxx&date=yyyy-mm-dd`.
2. Akan menampilkan semua reservasi untuk outlet dan tanggal tersebut.

### 8.3 Check-in Reservasi

Ketika pelanggan yang sudah reservasi datang:
1. Gunakan endpoint `PUT /api/v1/tables/reservations/:id/check-in`.
2. Status reservasi berubah menjadi "seated" dan meja berubah menjadi "occupied".

### 8.4 Membatalkan Reservasi

1. Gunakan endpoint `PUT /api/v1/tables/reservations/:id/cancel`.
2. Status reservasi berubah menjadi "cancelled".
3. Jika meja berstatus "reserved", status meja kembali ke "available".

---

## 9. Tips Manajemen Meja Restoran

### 9.1 Optimalkan Denah

- Posisikan meja di denah sesuai dengan layout fisik restoran agar staf mudah mengenali.
- Gunakan seksi/area untuk memisahkan zona (Indoor, Outdoor, VIP).
- Simpan denah setelah mengatur posisi agar tersedia saat berikutnya membuka halaman.

### 9.2 Percepat Table Turnover

- Pantau durasi meja "occupied" -- jika ada meja yang sudah sangat lama terisi, koordinasikan dengan staf.
- Gunakan status "cleaning" setelah pelanggan pergi, lalu ubah ke "available" setelah meja dibersihkan.
- Manfaatkan waiting list untuk langsung mendudukkan pelanggan begitu meja kosong.

### 9.3 Kelola Antrian dengan Baik

- Selalu catat nomor telepon pelanggan di waiting list agar bisa mengirim notifikasi.
- Gunakan informasi "party size" untuk mencocokkan pelanggan dengan meja yang kapasitasnya sesuai.
- Pantau statistik waktu tunggu -- jika rata-rata terlalu tinggi, pertimbangkan untuk menambah area duduk.

### 9.4 Manfaatkan Split/Merge Bill

- Informasikan ke pelanggan bahwa split bill tersedia -- ini sering kali menjadi pain point di restoran.
- Untuk rombongan besar yang duduk di beberapa meja, gunakan merge bill di akhir makan.

### 9.5 Reservasi

- Atur jendela konflik reservasi sesuai dengan rata-rata durasi makan di restoran Anda (default 2 jam).
- Hubungi pelanggan yang sudah reservasi 1 jam sebelum waktu kedatangan sebagai reminder.
- Manfaatkan data no-show untuk mengidentifikasi pelanggan yang sering membatalkan tanpa konfirmasi.

---

## 10. FAQ

### Q: Apakah saya bisa menggunakan fitur pesanan tanpa fitur denah meja?
**A:** Ya. Feature flag `order_management` bisa diaktifkan terpisah dari `table_management`. Anda tetap bisa mengelola pesanan tanpa denah meja. Kolom "Meja" di tabel pesanan hanya muncul jika `table_management` aktif.

### Q: Berapa jumlah meja maksimal yang bisa ditampilkan di denah?
**A:** Secara teknis tidak ada batasan keras. Grid denah menggunakan sistem kolom dan baris yang bisa menampung puluhan hingga ratusan meja. Gunakan fitur zoom dan filter area untuk navigasi denah besar.

### Q: Apakah perubahan status meja bisa real-time di semua device?
**A:** Data pesanan di-refresh otomatis setiap 30 detik. Untuk real-time yang lebih instan, sistem menggunakan WebSocket melalui Socket.IO yang diintegrasikan dengan KDS. Denah meja saat ini perlu refresh manual atau otomatis.

### Q: Bagaimana jika pelanggan ingin split bill per item, bukan rata?
**A:** Backend mendukung tiga jenis split: equal (rata), by_item (per item), dan by_amount (per nominal). Saat ini antarmuka frontend menyediakan split dengan jumlah bagian. Untuk split per item, bisa dilakukan melalui API langsung.

### Q: Apa yang terjadi jika saya mendudukkan pelanggan dari waiting list ke meja yang sudah terisi?
**A:** Sistem akan menolak aksi tersebut dan menampilkan pesan error. Hanya meja dengan status "available" yang bisa dipilih untuk mendudukkan pelanggan dari waiting list.

### Q: Apakah data waiting list dan reservasi disimpan di database?
**A:** Ya. Keduanya disimpan di tabel `waiting_list` di database PostgreSQL. Reservasi dibedakan dari waiting list biasa melalui prefix `[RESERVATION]` di kolom notes. Semua data tersedia untuk analisis dan laporan.

### Q: Bagaimana cara menambah meja baru ke sistem?
**A:** Saat ini, meja baru bisa ditambahkan melalui API endpoint `POST /api/v1/tables` dengan data: outletId, nama meja, kapasitas, seksi, dan posisi. Fitur CRUD meja melalui antarmuka visual sedang dalam pengembangan.

### Q: Bisakah saya melihat riwayat reservasi yang sudah lewat?
**A:** Ya. Gunakan endpoint `GET /api/v1/tables/reservations` dengan parameter tanggal yang diinginkan. Semua reservasi dengan status waiting, notified, seated, dan cancelled akan ditampilkan.

### Q: Apakah notifikasi waiting list dikirim via SMS?
**A:** Sistem sudah menyiapkan infrastruktur notifikasi dengan mencatat nomor telepon pelanggan dan waktu notifikasi. Integrasi dengan penyedia SMS (seperti Twilio atau penyedia lokal) bisa dikonfigurasi sesuai kebutuhan bisnis.

### Q: Apakah fitur ini tersedia di semua paket berlangganan?
**A:** Fitur Manajemen Meja dikontrol melalui feature flags yang diatur per bisnis. Ketersediaan bergantung pada paket berlangganan yang dipilih. Hubungi tim TiloPOS untuk informasi lebih lanjut.
