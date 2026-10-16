# Panduan Pengguna: Modul Pelanggan

Panduan lengkap untuk mengelola data pelanggan di TiloPOS — dari menambah pelanggan baru hingga membuat segmentasi untuk promosi yang tepat sasaran.

---

## Daftar Isi

1. [Menambah Pelanggan Baru](#1-menambah-pelanggan-baru)
2. [Import Data Pelanggan dari Excel](#2-import-data-pelanggan-dari-excel)
3. [Mencari dan Filter Pelanggan](#3-mencari-dan-filter-pelanggan)
4. [Assign Pelanggan ke Transaksi di POS](#4-assign-pelanggan-ke-transaksi-di-pos)
5. [Melihat Riwayat Belanja Pelanggan](#5-melihat-riwayat-belanja-pelanggan)
6. [Membuat Segmen Pelanggan](#6-membuat-segmen-pelanggan)
7. [Tips CRM untuk UMKM](#7-tips-crm-untuk-umkm)
8. [FAQ (Pertanyaan yang Sering Diajukan)](#8-faq)

---

## 1. Menambah Pelanggan Baru

### Dari Halaman Pelanggan (Backoffice)

1. Buka menu **Pelanggan** dari sidebar navigasi (`/app/customers`)
2. Klik tombol **"Tambah Pelanggan"** di pojok kanan atas (shortcut keyboard: `N`)
3. Isi formulir informasi pelanggan:

| Field | Wajib? | Keterangan |
|-------|--------|------------|
| Nama Pelanggan | Ya | Minimal 2 karakter. Gunakan nama lengkap untuk memudahkan pencarian |
| Email | Tidak | Format email valid. Berguna untuk pengiriman struk digital |
| Telepon | Tidak | Nomor HP pelanggan. Sangat direkomendasikan untuk diisi |
| Tanggal Lahir | Tidak | Untuk ucapan ulang tahun atau promo birthday |
| Alamat | Tidak | Alamat lengkap pelanggan |
| Catatan | Tidak | Catatan internal (misal: "alergi kacang", "kontraktor proyek A") |

4. Klik **"Tambah Pelanggan"** untuk menyimpan

**Tips:**
- Minimal isi nama dan nomor telepon — dua data ini sudah cukup untuk mulai membangun database yang berguna
- Field catatan sangat berguna untuk informasi yang tidak tertangkap di field standar, misalnya preferensi khusus pelanggan

### Dari Layar POS (Saat Transaksi)

Anda juga bisa menambah pelanggan baru langsung dari layar POS tanpa harus pindah ke halaman backoffice. Saat mencari pelanggan untuk di-assign ke transaksi dan tidak ditemukan, gunakan opsi **"Tambah Baru"** yang tersedia di panel pencarian pelanggan.

---

## 2. Import Data Pelanggan dari Excel

Jika Anda sudah memiliki data pelanggan dalam format spreadsheet, gunakan fitur import untuk memindahkan semuanya sekaligus.

### Langkah-langkah Import

1. Dari halaman Pelanggan, klik tombol **"Import Excel"**
2. Sistem akan mengarahkan Anda ke halaman import (`/app/import?type=customers`)
3. Download template Excel yang disediakan agar format kolom sesuai
4. Isi template dengan data pelanggan Anda
5. Upload file yang sudah diisi
6. Preview data yang akan diimport — periksa apakah ada kesalahan
7. Konfirmasi import

### Format Template Excel

| Kolom | Contoh | Wajib? |
|-------|--------|--------|
| name | Budi Santoso | Ya |
| email | budi@email.com | Tidak |
| phone | 081234567890 | Tidak |
| address | Jl. Merdeka No. 10, Jakarta | Tidak |
| dateOfBirth | 1990-05-15 | Tidak |
| notes | Pelanggan reguler | Tidak |

**Tips:**
- Pastikan tidak ada baris duplikat (nama dan telepon yang sama)
- Format tanggal lahir gunakan YYYY-MM-DD
- Bersihkan data sebelum import — hapus baris kosong, spasi berlebih, atau karakter aneh

---

## 3. Mencari dan Filter Pelanggan

### Pencarian

Di halaman Pelanggan, gunakan kolom pencarian **"Cari pelanggan..."** untuk menemukan pelanggan berdasarkan:
- Nama pelanggan
- Email
- Nomor telepon

Pencarian bersifat instan — hasil akan diperbarui saat Anda mengetik.

### Pengurutan (Sorting)

Klik header kolom pada tabel untuk mengurutkan data. Kolom yang bisa diurutkan:
- **Nama** — A-Z atau Z-A
- **Total Belanja** — terbesar ke terkecil atau sebaliknya
- **Kunjungan** — terbanyak ke tersedikit atau sebaliknya

### Paginasi

Jika jumlah pelanggan melebihi 15 per halaman (default), gunakan navigasi halaman di bagian bawah tabel untuk berpindah antar halaman.

### Informasi yang Ditampilkan di Tabel

| Kolom | Deskripsi |
|-------|-----------|
| Nama | Nama lengkap pelanggan |
| Email | Alamat email (tanda "-" jika kosong) |
| Telepon | Nomor telepon (tanda "-" jika kosong) |
| Total Belanja | Akumulasi total belanja pelanggan dalam format Rupiah |
| Kunjungan | Jumlah kali pelanggan melakukan transaksi |
| Poin | Poin loyalti (hanya muncul jika fitur loyalty diaktifkan) |
| Status | Aktif atau Nonaktif |

### Tampilan Mobile

Di perangkat mobile, halaman pelanggan ditampilkan dalam format yang dioptimalkan untuk layar kecil. Data tetap sama, namun layout disesuaikan untuk kenyamanan penggunaan dengan sentuhan.

---

## 4. Assign Pelanggan ke Transaksi di POS

Menghubungkan pelanggan ke transaksi adalah langkah kunci untuk mengumpulkan data yang berguna. Berikut caranya:

### Langkah-langkah

1. Saat berada di layar POS dengan keranjang belanja yang sudah terisi
2. Cari dan klik opsi **"Pilih Pelanggan"** atau ikon pelanggan di panel transaksi
3. Ketik nama atau nomor telepon pelanggan di kolom pencarian
4. Pilih pelanggan yang sesuai dari daftar hasil pencarian
5. Nama pelanggan akan muncul di panel transaksi, menandakan bahwa transaksi ini sudah terhubung ke pelanggan tersebut
6. Lanjutkan proses pembayaran seperti biasa

### Apa yang Terjadi Setelah Assign?

- **Total belanja** pelanggan bertambah sesuai nilai transaksi
- **Jumlah kunjungan** bertambah 1
- **Poin loyalti** (jika fitur diaktifkan) dihitung dan ditambahkan otomatis
- Transaksi tercatat dalam **riwayat belanja** pelanggan
- Data bisa digunakan untuk **segmentasi** dan analisis

### Tips

- Biasakan kasir untuk selalu menanyakan "Apakah sudah punya member?" sebelum proses pembayaran
- Untuk pelanggan yang belum terdaftar, tawarkan pendaftaran cepat — hanya perlu nama dan nomor telepon
- Assign pelanggan tidak memperlambat proses transaksi — pencarian instan hanya butuh beberapa detik

---

## 5. Melihat Riwayat Belanja Pelanggan

### Dari Halaman Edit Pelanggan

1. Buka halaman Pelanggan (`/app/customers`)
2. Klik ikon menu (tiga titik) pada baris pelanggan yang ingin dilihat
3. Pilih **"Edit"**
4. Di halaman edit, Anda akan melihat ringkasan statistik pelanggan di bagian atas:

| Statistik | Deskripsi |
|-----------|-----------|
| Total Belanja | Akumulasi seluruh nilai transaksi pelanggan dalam format Rupiah |
| Kunjungan | Total jumlah transaksi yang dilakukan pelanggan |
| Poin Loyalti | Saldo poin saat ini (hanya jika fitur loyalty aktif) |

### Informasi yang Tersedia

- **Total belanja kumulatif** — berapa banyak uang yang sudah dibelanjakan pelanggan
- **Jumlah kunjungan** — frekuensi pelanggan bertransaksi
- **Poin loyalti aktif** — saldo poin yang bisa ditukarkan (jika program loyalty aktif)

---

## 6. Membuat Segmen Pelanggan

Segmentasi memungkinkan Anda mengelompokkan pelanggan berdasarkan kriteria tertentu. Fitur ini sangat berguna untuk promosi yang ditargetkan.

### Mengakses Halaman Segmen

Buka menu **Segmen Pelanggan** (`/app/customers/segments`).

### Segmen Bawaan (Preset)

Sistem menyediakan beberapa segmen otomatis berdasarkan tipe umum:

| Tipe Segmen | Deskripsi |
|-------------|-----------|
| Pelanggan Baru | Pelanggan yang baru pertama kali atau sedikit bertransaksi |
| Reguler | Pelanggan dengan frekuensi dan belanja rata-rata |
| VIP | Pelanggan dengan total belanja atau frekuensi tinggi |
| Berisiko (At Risk) | Pelanggan yang sudah lama tidak bertransaksi |
| Churned | Pelanggan yang kemungkinan sudah tidak aktif |

Segmen preset tidak bisa dihapus — hanya segmen kustom yang bisa dihapus.

### Membuat Segmen Kustom

1. Klik tombol **"Buat Segmen"** (shortcut keyboard: `N`)
2. Isi informasi segmen:
   - **Nama Segmen** — nama deskriptif, contoh: "Pelanggan VIP Jakarta"
   - **Deskripsi** — penjelasan singkat tentang segmen
3. Tambahkan **kriteria** (minimal satu):

| Kriteria | Contoh Penggunaan |
|----------|-------------------|
| Min. Belanja (Rp) | Pelanggan yang total belanjanya >= jumlah tertentu |
| Maks. Belanja (Rp) | Pelanggan yang total belanjanya <= jumlah tertentu |
| Min. Kunjungan | Pelanggan yang sudah berkunjung >= N kali |
| Maks. Kunjungan | Pelanggan yang berkunjung <= N kali |
| Tier Loyalty | Pelanggan di tier tertentu (gold, silver, bronze) |
| Min Hari Sejak Kunjungan | Pelanggan yang tidak datang >= N hari |
| Max Hari Sejak Kunjungan | Pelanggan yang terakhir datang <= N hari lalu |

4. Anda bisa menambah **beberapa kriteria** sekaligus dengan klik tombol **"Tambah"** — semua kriteria berlaku secara bersamaan (AND logic)
5. Klik **"Buat Segmen"** untuk menyimpan

### Contoh Segmen yang Berguna

**Segmen "Pelanggan VIP":**
- Min. Belanja: Rp 5.000.000
- Min. Kunjungan: 10

**Segmen "Pelanggan Berisiko Churn":**
- Min Hari Sejak Kunjungan: 30
- Min. Kunjungan: 5 (pelanggan yang tadinya aktif tapi sekarang menghilang)

**Segmen "Pelanggan Baru Potensial":**
- Maks. Kunjungan: 3
- Max Hari Sejak Kunjungan: 14 (baru datang dalam 2 minggu terakhir)

### Melihat Pelanggan dalam Segmen

1. Klik ikon menu (tiga titik) pada baris segmen
2. Pilih **"Lihat Pelanggan"**
3. Dialog akan menampilkan daftar pelanggan yang memenuhi kriteria segmen, lengkap dengan nama, email, telepon, total belanja, dan jumlah kunjungan

### Menghapus Segmen

Hanya segmen bertipe **Kustom** yang bisa dihapus. Segmen bawaan (preset) tidak bisa dihapus.

1. Klik ikon menu pada segmen kustom
2. Pilih **"Hapus"**
3. Konfirmasi penghapusan

---

## 7. Tips CRM untuk UMKM

### Mulai dari yang Sederhana

Anda tidak perlu langsung menggunakan semua fitur. Mulai dengan langkah-langkah kecil:

1. **Minggu 1-2:** Biasakan kasir untuk menanyakan dan mencatat nama + nomor telepon pelanggan
2. **Minggu 3-4:** Mulai assign pelanggan ke setiap transaksi
3. **Bulan 2:** Review data — siapa pelanggan terbaik? Siapa yang mulai jarang datang?
4. **Bulan 3:** Buat segmen pertama dan jalankan promosi pertama yang ditargetkan

### Buat Insentif untuk Pendaftaran

Pelanggan akan lebih mau memberikan datanya jika ada manfaat langsung:
- "Daftar member gratis, dapatkan diskon 10% untuk transaksi hari ini"
- "Member mendapatkan poin setiap belanja — tukarkan dengan potongan harga"
- "Ucapan selamat ulang tahun + voucher spesial untuk member"

### Manfaatkan Data Tanggal Lahir

Jika Anda mengumpulkan data tanggal lahir, gunakan untuk:
- Kirim ucapan selamat ulang tahun via WhatsApp
- Berikan voucher diskon atau free item di bulan ulang tahun
- Pelanggan akan merasa spesial dan lebih loyal

### Segmentasi: Less is More

Jangan membuat terlalu banyak segmen. Mulai dengan 3-4 segmen inti:
1. **VIP** — pelanggan terbaik yang harus dipertahankan
2. **Reguler** — mayoritas pelanggan, target untuk di-upgrade ke VIP
3. **Berisiko** — pelanggan yang mulai menghilang, perlu ditarik kembali
4. **Baru** — pelanggan baru yang perlu dibuat nyaman agar kembali

### Konsistensi adalah Kunci

Manfaat CRM baru terasa setelah data terkumpul cukup banyak. Pastikan:
- **Setiap** transaksi di-assign ke pelanggan (target: > 70% transaksi ter-assign)
- Data diisi dengan **konsisten** — format nama seragam, nomor telepon lengkap
- Review data secara **berkala** — minimal sebulan sekali

### Jaga Privasi Pelanggan

- Jangan membagikan data pelanggan ke pihak lain tanpa izin
- Gunakan data hanya untuk kepentingan bisnis Anda
- Berikan opsi ke pelanggan untuk opt-out dari komunikasi promosi
- Simpan data dengan aman — TiloPOS sudah menangani keamanan teknis, tapi kebijakan penggunaan ada di tangan Anda

---

## 8. FAQ

### Umum

**T: Apakah ada batasan jumlah pelanggan yang bisa disimpan?**
J: Tidak ada batasan hard limit. TiloPOS dirancang untuk menangani ribuan data pelanggan tanpa masalah performa.

**T: Apakah data pelanggan aman?**
J: Ya. Data pelanggan disimpan di server yang terenkripsi dan hanya bisa diakses oleh akun yang memiliki izin (berdasarkan role dan businessId).

**T: Siapa yang bisa mengakses data pelanggan?**
J: Berdasarkan role — Owner, Manager, dan Supervisor bisa mengelola data pelanggan. Cashier bisa melihat dan assign pelanggan saat transaksi.

### Pengelolaan Data

**T: Bagaimana jika ada pelanggan duplikat?**
J: Saat ini, pengecekan duplikat dilakukan secara manual. Pastikan untuk mencari terlebih dahulu sebelum menambah pelanggan baru. Untuk data import, bersihkan duplikat di spreadsheet sebelum upload.

**T: Apakah pelanggan yang dihapus benar-benar hilang?**
J: Tidak. Saat Anda "menghapus" pelanggan, statusnya diubah menjadi **Nonaktif**. Data historis tetap tersimpan. Ini memastikan riwayat transaksi tetap konsisten.

**T: Bisakah saya mengedit data pelanggan yang sudah ada?**
J: Ya. Buka halaman pelanggan, klik menu (tiga titik) pada baris pelanggan, pilih "Edit", lakukan perubahan, dan simpan.

**T: Format file apa yang didukung untuk import?**
J: Format Excel (.xlsx). Download template yang disediakan untuk memastikan format kolom sesuai.

### Segmentasi

**T: Apakah segmen di-update secara otomatis?**
J: Ya. Segmen bersifat dinamis — pelanggan yang memenuhi kriteria secara otomatis masuk ke segmen, dan yang tidak lagi memenuhi akan keluar.

**T: Bisakah satu pelanggan masuk ke beberapa segmen sekaligus?**
J: Ya. Seorang pelanggan bisa masuk ke segmen "VIP" sekaligus segmen "Pelanggan Tier Gold" jika memenuhi kriteria keduanya.

**T: Bagaimana cara menggunakan segmen untuk promosi?**
J: Saat ini, segmen berfungsi untuk analisis dan identifikasi kelompok pelanggan. Anda bisa melihat daftar pelanggan di setiap segmen dan menggunakannya sebagai basis untuk menjalankan promosi melalui kanal komunikasi Anda (WhatsApp, SMS, dll).

### Loyalty & Poin

**T: Mengapa kolom Poin tidak muncul di tabel pelanggan?**
J: Kolom Poin hanya muncul jika fitur **Customer Loyalty** diaktifkan untuk bisnis Anda. Periksa pengaturan fitur bisnis untuk mengaktifkannya.

**T: Bagaimana cara pelanggan mendapatkan poin?**
J: Poin dihitung otomatis saat pelanggan di-assign ke transaksi. Besaran poin bergantung pada konfigurasi program loyalty (lihat modul Promosi > Program Loyalti).

### Teknis

**T: Apakah data pelanggan tersinkronisasi antar outlet?**
J: Ya. Data pelanggan bersifat per-bisnis (bukan per-outlet), sehingga pelanggan yang terdaftar di outlet A juga bisa dicari dan di-assign di outlet B.

**T: Bisakah saya mengekspor data pelanggan?**
J: Saat ini fitur export langsung dari halaman pelanggan belum tersedia. Untuk kebutuhan export, hubungi tim support TiloPOS.

**T: Apakah ada API untuk integrasi dengan sistem lain?**
J: TiloPOS menyediakan API endpoint untuk data pelanggan (`/api/v1/customers`). Hubungi tim teknis untuk dokumentasi API lengkap.

---

*Butuh bantuan lebih lanjut? Hubungi tim support TiloPOS melalui menu Bantuan di aplikasi.*
