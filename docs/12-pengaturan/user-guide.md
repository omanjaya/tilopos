# Panduan Pengguna: Pengaturan TiloPOS

Panduan lengkap untuk mengkonfigurasi semua pengaturan TiloPOS sesuai kebutuhan bisnis Anda.

---

## Daftar Isi

1. [Setup Awal Bisnis Baru](#1-setup-awal-bisnis-baru)
2. [Mengatur Informasi Bisnis](#2-mengatur-informasi-bisnis)
3. [Menambah dan Mengelola Outlet](#3-menambah-dan-mengelola-outlet)
4. [Konfigurasi Pajak (PPN)](#4-konfigurasi-pajak-ppn)
5. [Kustomisasi Struk Pembayaran](#5-kustomisasi-struk-pembayaran)
6. [Setting Metode Pembayaran](#6-setting-metode-pembayaran)
7. [Setup Printer](#7-setup-printer)
8. [Mengatur Jam Operasional](#8-mengatur-jam-operasional)
9. [Membuat Modifier Groups](#9-membuat-modifier-groups)
10. [Memilih Tipe Bisnis](#10-memilih-tipe-bisnis)
11. [Mengaktifkan dan Menonaktifkan Fitur](#11-mengaktifkan-dan-menonaktifkan-fitur)
12. [Mengubah Tampilan (Theme dan Warna)](#12-mengubah-tampilan-theme-dan-warna)
13. [Mengelola Perangkat](#13-mengelola-perangkat)
14. [Mengatur Notifikasi](#14-mengatur-notifikasi)
15. [Jadwal Laporan Otomatis](#15-jadwal-laporan-otomatis)
16. [Manajemen Langganan dan Billing](#16-manajemen-langganan-dan-billing)
17. [Checklist Setup Lengkap untuk Bisnis Baru](#17-checklist-setup-lengkap-untuk-bisnis-baru)
18. [FAQ (Pertanyaan yang Sering Diajukan)](#18-faq)

---

## 1. Setup Awal Bisnis Baru

Saat pertama kali menggunakan TiloPOS, ikuti urutan setup berikut untuk hasil optimal:

**Langkah 1: Pilih Tipe Bisnis**
Buka **Pengaturan > Tipe Bisnis**. Pilih tipe yang paling sesuai (Restoran, Kafe, Retail, Salon, dll). Sistem akan otomatis mengaktifkan fitur yang relevan dan membuat template produk, kategori, modifier, serta meja.

**Langkah 2: Lengkapi Informasi Bisnis**
Buka **Pengaturan > Pengaturan Bisnis**. Isi nama bisnis, email, telepon, dan alamat.

**Langkah 3: Konfigurasi Outlet**
Buka **Pengaturan > Kelola Outlet**. Pastikan outlet utama sudah terisi lengkap. Tambah outlet baru jika diperlukan.

**Langkah 4: Atur Pajak**
Buka **Pengaturan > Pengaturan Pajak**. Sesuaikan tarif PPN (default 11%) dan tentukan apakah harga sudah termasuk pajak.

**Langkah 5: Setup Metode Pembayaran**
Buka **Pengaturan > Metode Pembayaran**. Tambahkan metode pembayaran yang Anda terima (tunai, QRIS, e-wallet, dll).

**Langkah 6: Konfigurasi Printer**
Buka **Pengaturan > Konfigurasi Printer**. Hubungkan printer struk dan printer dapur jika menggunakan KDS.

**Langkah 7: Kustomisasi Struk**
Buka **Pengaturan > Template Struk**. Sesuaikan tampilan struk dengan logo dan pesan kamu.

**Langkah 8: Review Fitur**
Buka **Pengaturan > Fitur**. Periksa fitur-fitur yang aktif dan sesuaikan jika ada yang perlu diubah.

---

## 2. Mengatur Informasi Bisnis

**Lokasi:** Pengaturan > Pengaturan Bisnis

Halaman ini berisi informasi dasar bisnis Anda yang akan tampil di struk, laporan, dan profil bisnis.

**Field yang tersedia:**

| Field | Keterangan | Wajib |
|-------|-----------|-------|
| Nama Bisnis | Nama usaha Anda (minimal 2 karakter) | Ya |
| Email | Email bisnis untuk korespondensi | Tidak |
| Telepon | Nomor telepon bisnis | Tidak |
| Alamat | Alamat lengkap bisnis | Tidak |

**Cara mengubah:**
1. Buka halaman **Pengaturan Bisnis**
2. Edit field yang ingin diubah
3. Klik tombol **Simpan**
4. Akan muncul notifikasi "Pengaturan bisnis berhasil disimpan"

**Catatan:** Nama bisnis akan muncul di semua struk dan laporan. Pastikan penulisan sudah benar.

---

## 3. Menambah dan Mengelola Outlet

**Lokasi:** Pengaturan > Kelola Outlet

Multi-outlet memungkinkan Anda mengelola beberapa cabang dari satu akun.

### Menambah Outlet Baru

1. Klik tombol **Tambah Outlet**
2. Isi formulir:
   - **Nama** (wajib): Nama outlet, contoh "Cabang Kemang"
   - **Kode** (opsional): Kode singkat, contoh "KMG"
   - **Alamat** (opsional): Alamat lengkap outlet
   - **Telepon** (opsional): Nomor telepon outlet
   - **Tarif Pajak**: Persentase PPN untuk outlet ini (default 11%)
   - **Service Charge**: Persentase biaya layanan (default 0%)
3. **Terapkan Template Bisnis** (opsional): Centang opsi ini untuk langsung menambahkan kategori, produk, modifier, dan meja dari template. Pilih tipe template yang sesuai (Restoran, Kafe, Retail, dll).
4. Klik **Tambah**

### Mengedit Outlet

1. Pada tabel outlet, klik ikon menu (tiga titik) di baris outlet yang ingin diedit
2. Pilih **Edit**
3. Ubah informasi yang diperlukan
4. Klik **Simpan**

### Menonaktifkan Outlet

1. Klik ikon menu di baris outlet
2. Pilih **Nonaktifkan**
3. Outlet akan ditandai sebagai nonaktif (data tidak dihapus)

**Informasi yang ditampilkan di tabel outlet:** Nama, Kode, Alamat, Telepon, Tarif Pajak, Service Charge, Status (Aktif/Nonaktif)

---

## 4. Konfigurasi Pajak (PPN)

**Lokasi:** Pengaturan > Pengaturan Pajak

### Tarif Pajak dan Biaya Layanan

| Pengaturan | Keterangan | Default |
|-----------|-----------|---------|
| Tarif PPN (%) | Persentase pajak pertambahan nilai | 11% |
| Biaya Layanan (%) | Persentase service charge | 0% |
| Harga Termasuk Pajak | Apakah harga produk sudah termasuk pajak | Ya (aktif) |

**Cara mengatur:**
1. Buka halaman **Pengaturan Pajak**
2. Masukkan tarif PPN dan biaya layanan (0-100%)
3. Aktifkan/nonaktifkan toggle **Harga Termasuk Pajak**
   - **Aktif (Tax-inclusive):** Harga yang ditampilkan sudah termasuk pajak. Contoh: harga Rp 25.000 berarti sudah include PPN.
   - **Nonaktif (Tax-exclusive):** Pajak ditambahkan di atas harga. Contoh: harga Rp 25.000 + PPN 11% = Rp 27.750.
4. Klik **Simpan**

### Aturan Pembebasan Pajak

Anda bisa membuat aturan khusus untuk membebaskan pajak pada kondisi tertentu.

**Menambah aturan:**
1. Scroll ke bagian **Aturan Pembebasan Pajak**
2. Isi **Nama aturan** (contoh: "Makanan Pokok")
3. Isi **Deskripsi** (opsional, contoh: "Beras, gula, garam dibebaskan dari PPN")
4. Klik **Tambah Aturan**

**Mengelola aturan:**
- Toggle switch untuk mengaktifkan/menonaktifkan aturan
- Klik ikon tempat sampah untuk menghapus aturan

---

## 5. Kustomisasi Struk Pembayaran

**Lokasi:** Pengaturan > Template Struk

Halaman ini dibagi menjadi dua panel: **Pengaturan** (kiri) dan **Pratinjau** (kanan).

### Elemen Struk

Aktifkan atau nonaktifkan elemen berikut:

| Elemen | Keterangan | Default |
|--------|-----------|---------|
| Tampilkan Logo | Logo bisnis di bagian atas struk | Aktif |
| Tampilkan Alamat | Alamat outlet di bawah nama bisnis | Aktif |
| Tampilkan Rincian Pajak | Breakdown PPN dan service charge | Aktif |
| Tampilkan Barcode | Barcode di bagian bawah struk | Nonaktif |
| Tampilkan QR Code | QR code di bagian bawah struk | Nonaktif |

### Teks dan Ukuran

| Pengaturan | Keterangan |
|-----------|-----------|
| Teks Header | Pesan custom di bagian atas struk (di bawah logo/alamat) |
| Teks Footer | Pesan custom di bagian bawah struk. Contoh: "Terima kasih atas kunjungan Anda!" |
| Ukuran Kertas | 58mm (kecil/hemat) atau 80mm (standar) |

### Cara menggunakan:
1. Atur elemen dan teks sesuai kebutuhan
2. Lihat perubahan langsung di panel **Pratinjau Struk** di sebelah kanan
3. Klik **Simpan** setelah puas dengan hasilnya

**Tips:** Preview struk menampilkan contoh transaksi lengkap dengan item, subtotal, pajak, total, pembayaran, dan kembalian sehingga Anda bisa melihat tampilan struk yang sesungguhnya.

---

## 6. Setting Metode Pembayaran

**Lokasi:** Pengaturan > Metode Pembayaran

### Menambah Metode Pembayaran

1. Klik **Tambah Metode**
2. Isi formulir:
   - **Nama**: Nama metode pembayaran (contoh: "GoPay", "BCA Virtual Account")
   - **Tipe**: Pilih kategori — Tunai, Kartu, E-Wallet, QRIS, atau Transfer Bank
   - **Processing Fee (%)**: Biaya pemrosesan per transaksi (0 = gratis). Contoh: 1.5% untuk transaksi kartu kredit.
3. Klik **Tambah**

### Mengelola Metode Pembayaran

Metode pembayaran ditampilkan dalam grup berdasarkan tipe:

- **Tunai** — Ikon uang kertas, warna hijau
- **Kartu** — Ikon kartu kredit, warna biru
- **E-Wallet** — Ikon smartphone, warna kuning
- **QRIS** — Ikon QR code, warna ungu
- **Transfer Bank** — Ikon bank, warna abu-abu

Untuk setiap metode, Anda bisa:
- **Toggle aktif/nonaktif:** Gunakan switch untuk mengaktifkan atau menonaktifkan metode di POS
- **Edit:** Klik ikon pensil untuk mengubah nama, tipe, atau processing fee
- **Nonaktifkan:** Klik ikon tempat sampah untuk menonaktifkan metode (tidak dihapus permanen)

---

## 7. Setup Printer

**Lokasi:** Pengaturan > Konfigurasi Printer

### Menambah Printer

1. Klik **Tambah Printer**
2. Isi konfigurasi:
   - **Nama Printer**: Identifikasi printer (contoh: "Printer Kasir 1", "Printer Dapur")
   - **Tipe**: Receipt (struk), Kitchen (dapur), atau Label (barcode)
   - **Koneksi**: Jaringan (IP), USB, atau Bluetooth
   - **IP Address** dan **Port**: Hanya untuk koneksi jaringan (default port: 9100)
   - **Outlet**: Pilih outlet tempat printer ini terpasang
   - **Auto-print**: Aktifkan jika ingin struk langsung tercetak setelah transaksi
   - **Jumlah Cetak**: Berapa lembar yang dicetak per transaksi (1-5)
3. Klik **Tambah**

### Tipe Printer

| Tipe | Kegunaan | Label |
|------|---------|-------|
| Receipt | Mencetak struk untuk pelanggan | Struk |
| Kitchen | Mencetak pesanan untuk dapur | Dapur |
| Label | Mencetak label barcode produk | Label |

### Jenis Koneksi

| Koneksi | Keterangan | Kebutuhan |
|---------|-----------|-----------|
| Jaringan (IP) | Printer terhubung via WiFi/LAN | IP address dan port |
| USB | Printer terhubung langsung via USB | Kabel USB |
| Bluetooth | Printer portable via Bluetooth | Pairing Bluetooth |

### Test Print

Setelah printer ditambahkan, klik tombol **Test Print** pada kartu printer untuk memastikan printer terhubung dan berfungsi dengan baik.

### Mengelola Printer

- **Toggle aktif/nonaktif:** Gunakan switch di pojok kanan atas kartu printer
- **Edit:** Klik tombol **Edit** untuk mengubah konfigurasi
- **Hapus:** Klik ikon tempat sampah untuk menghapus printer

---

## 8. Mengatur Jam Operasional

**Lokasi:** Pengaturan > Jam Operasional

### Jadwal Mingguan

Atur jam buka-tutup untuk setiap hari dalam seminggu:

1. Untuk setiap hari (Senin - Minggu):
   - **Toggle Buka/Tutup:** Aktifkan switch jika outlet buka di hari tersebut
   - **Jam Buka:** Atur waktu buka (format HH:mm, contoh: 08:00)
   - **Jam Tutup:** Atur waktu tutup (format HH:mm, contoh: 22:00)
2. Jika toggle dimatikan, hari tersebut ditandai sebagai **Tutup**

**Default jadwal:**
- Senin - Jumat: 08:00 - 22:00
- Sabtu - Minggu: 09:00 - 23:00

### Hari Khusus / Libur

Tambahkan jadwal khusus untuk hari libur atau event tertentu:

1. Scroll ke bagian **Hari Khusus / Libur**
2. Isi:
   - **Nama**: Contoh "Hari Raya Idul Fitri", "Anniversary Promo"
   - **Tanggal**: Pilih tanggal
   - **Buka di hari ini**: Toggle jika outlet tetap buka (dengan jam khusus)
   - **Jam Buka/Tutup**: Hanya muncul jika toggle buka diaktifkan
3. Klik **Tambah**

**Catatan:** Hari khusus akan menimpa jadwal mingguan pada tanggal tersebut.

---

## 9. Membuat Modifier Groups

**Lokasi:** Pengaturan > Modifier

Modifier groups memungkinkan pelanggan mengkustomisasi pesanan mereka (contoh: pilih ukuran, level gula, topping tambahan).

### Membuat Grup Modifier Baru

1. Klik **Tambah Grup**
2. Isi:
   - **Nama Grup**: Contoh "Ukuran", "Level Gula", "Topping"
   - **Wajib Dipilih**: Aktifkan jika pelanggan harus memilih salah satu opsi
   - **Min Pilihan**: Jumlah minimum modifier yang harus dipilih (contoh: 1)
   - **Maks Pilihan**: Jumlah maksimum modifier yang boleh dipilih (contoh: 3 untuk topping)

3. Tambahkan item modifier:
   - Isi **Nama** modifier (contoh: "Regular", "Large")
   - Isi **Harga** (contoh: 0 untuk regular, 5000 untuk large)
   - Klik tombol **+** untuk menambahkan
   - Ulangi untuk setiap opsi

4. Klik **Simpan**

### Contoh Grup Modifier

| Nama Grup | Wajib | Min | Maks | Item |
|-----------|-------|-----|------|------|
| Ukuran | Ya | 1 | 1 | Regular (Rp0), Large (+Rp5.000) |
| Level Gula | Ya | 1 | 1 | Normal (Rp0), Less (Rp0), No Sugar (Rp0) |
| Topping | Tidak | 0 | 3 | Boba (+Rp5.000), Jelly (+Rp3.000), Pudding (+Rp4.000) |
| Extra | Tidak | 0 | 5 | Extra Shot (+Rp5.000), Oat Milk (+Rp8.000) |

### Mengelola Modifier

- **Cari:** Gunakan kolom pencarian untuk menemukan grup modifier
- **Edit:** Klik menu > Edit untuk mengubah grup
- **Hapus:** Klik menu > Hapus (akan muncul konfirmasi)
- **Toggle item:** Aktifkan/nonaktifkan modifier individual dalam grup

---

## 10. Memilih Tipe Bisnis

**Lokasi:** Pengaturan > Tipe Bisnis

### Cara Memilih atau Mengubah Tipe Bisnis

1. Buka halaman **Tipe Bisnis**
2. Lihat tipe bisnis saat ini (jika sudah dipilih sebelumnya) di bagian atas
3. Telusuri kategori yang tersedia:
   - **Food & Beverage:** Restoran, Kafe, Warung, Street Food, dll
   - **Retail:** Minimarket, Toko Fashion, Toko Kelontong, dll
   - **Layanan:** Salon, Barbershop, Laundry, dll
   - **Grosir:** Supplier, Distributor
   - **Custom:** Konfigurasi manual
4. Klik kartu tipe bisnis yang ingin dipilih
5. Klik **Terapkan**
6. Konfirmasi perubahan di dialog yang muncul

### Apa yang Terjadi Saat Mengubah Tipe Bisnis?

- Fitur yang relevan dengan tipe baru akan **otomatis diaktifkan**
- Template produk, kategori, modifier, dan meja dari tipe baru akan **dibuat**
- Data lama (produk, kategori, dll) **tidak dihapus** — hanya dinonaktifkan dan bisa diaktifkan kembali secara manual
- Cache dan query data akan di-refresh otomatis

**Peringatan:** Mengubah tipe bisnis adalah perubahan besar yang memengaruhi fitur, produk, dan konfigurasi. Pastikan Anda sudah yakin sebelum mengonfirmasi.

---

## 11. Mengaktifkan dan Menonaktifkan Fitur

**Lokasi:** Pengaturan > Fitur

### Cara Mengelola Fitur

1. Buka halaman **Fitur**
2. Fitur dikelompokkan berdasarkan kategori:
   - **Penjualan:** Fitur terkait transaksi dan POS
   - **Inventori:** Fitur manajemen stok
   - **Pemasaran:** Loyalty, promosi, voucher
   - **Layanan:** Self-order, KDS, toko online
   - **Lanjutan:** Audit log, import, integrasi
3. Gunakan toggle switch di setiap fitur untuk mengaktifkan/menonaktifkan

### Sistem Dependency Fitur

Beberapa fitur memiliki ketergantungan. Contoh:
- Menonaktifkan **Inventori** akan otomatis menonaktifkan **Transfer Stok** dan **Multi-Gudang**
- Badge "Butuh: [nama fitur]" menunjukkan dependency yang diperlukan

Jika fitur utama dinonaktifkan, sistem akan menampilkan notifikasi berisi daftar fitur terkait yang juga dinonaktifkan.

### Pengaruh Fitur terhadap Menu Sidebar

Menonaktifkan fitur akan **menyembunyikan menu terkait** dari sidebar navigasi. Misalnya, menonaktifkan fitur "Inventori" akan menghilangkan menu Inventori dari sidebar.

---

## 12. Mengubah Tampilan (Theme dan Warna)

**Lokasi:** Pengaturan > Tampilan

### Mengubah Warna Brand

1. Buka halaman **Tampilan**
2. **Pilih warna preset:** Klik salah satu warna yang tersedia di grid preset. Setiap preset menampilkan preview warna dan label.
3. **Atau masukkan warna custom:** Ketik kode hex di field custom color (contoh: #0284c7). Indikator "Valid" akan muncul jika format benar.
4. Perubahan warna langsung terlihat di **panel Preview** di sebelah kanan:
   - Preview sidebar dengan menu aktif
   - Preview tombol (primary dan outline)
   - Preview indikator aktif
5. Klik **Simpan** untuk menyimpan ke server
6. Klik **Reset ke Default** untuk mengembalikan warna standar TiloPOS

**Catatan:** Warna brand akan diterapkan ke semua elemen UI termasuk sidebar, tombol, badge, dan indikator. Perubahan berlaku di semua perangkat yang login ke akun bisnis ini.

---

## 13. Mengelola Perangkat

**Lokasi:** Pengaturan > Perangkat

### Informasi Perangkat

Tabel perangkat menampilkan:
- **Nama:** Nama perangkat yang terdaftar
- **Tipe:** POS Terminal, KDS Display, Mobile, Desktop, atau Tablet
- **Platform:** Sistem operasi perangkat
- **Outlet:** Outlet tempat perangkat terhubung
- **Terakhir Sync:** Waktu sinkronisasi terakhir
- **Status:** Online (hijau), Syncing (kuning), atau Offline (abu-abu) — diperbarui secara real-time via WebSocket

### Aksi yang Tersedia

- **Sync:** Trigger sinkronisasi manual untuk memperbarui data di perangkat
- **Hapus:** Hapus perangkat dari sistem (muncul dialog konfirmasi)

---

## 14. Mengatur Notifikasi

**Lokasi:** Pengaturan > Notifikasi

### Pengaturan Notifikasi

Setiap tipe notifikasi bisa diaktifkan atau dinonaktifkan:

| Tipe Notifikasi | Keterangan |
|----------------|-----------|
| Stok Rendah | Dikirim saat stok produk di bawah minimum |
| Pesanan Baru | Dikirim saat ada pesanan masuk |
| Pesanan Selesai | Dikirim saat pesanan telah selesai |
| Pembayaran Diterima | Dikirim saat pembayaran berhasil |
| Shift Dimulai | Dikirim saat karyawan membuka shift |
| Shift Berakhir | Dikirim saat karyawan menutup shift |
| Permintaan Refund | Dikirim saat ada permintaan pengembalian dana |
| Transfer Stok | Dikirim saat ada transfer stok antar outlet |

### Channel Notifikasi

Setiap notifikasi bisa dikirim melalui: Email, Push Notification, SMS, atau Dalam Aplikasi.

### Log Notifikasi

Di bagian bawah halaman, Anda bisa melihat riwayat notifikasi yang telah terkirim:
1. Masukkan **ID Penerima**
2. Klik **Cari**
3. Tabel log akan menampilkan tipe, pesan, status (Dibaca/Belum Dibaca), dan tanggal
4. Klik **Tandai Dibaca** untuk menandai notifikasi yang sudah dilihat

---

## 15. Jadwal Laporan Otomatis

**Lokasi:** Pengaturan > Jadwal Laporan

### Menambah Jadwal Laporan

1. Klik **Tambah Jadwal**
2. Pilih:
   - **Tipe Laporan:** Penjualan, Keuangan, atau Inventori
   - **Frekuensi:** Harian, Mingguan, atau Bulanan
   - **Penerima Email:** Masukkan alamat email. Pisahkan dengan koma untuk beberapa penerima. Contoh: `admin@bisnis.com, owner@bisnis.com`
3. Klik **Tambah**

### Mengelola Jadwal

- **Toggle aktif/nonaktif:** Pause jadwal tanpa menghapus konfigurasi
- **Edit:** Ubah tipe, frekuensi, atau penerima
- **Hapus:** Hapus jadwal (muncul dialog konfirmasi)

Jadwal ditampilkan dalam kartu dengan ikon sesuai tipe laporan:
- Penjualan (hijau)
- Keuangan (biru)
- Inventori (kuning)

---

## 16. Manajemen Langganan dan Billing

**Lokasi:** Pengaturan > Langganan & Billing

### Paket yang Tersedia

**Free (Gratis selamanya):**
- POS dan transaksi unlimited
- Produk unlimited
- 1 outlet
- Laporan dasar
- Manajemen stok
- Manajemen pelanggan

**Premium:**
- Semua fitur Free, ditambah:
- Multi outlet, laporan lanjutan, self-order QR, toko online, program loyalty, promosi dan voucher, segmentasi pelanggan, integrasi API, audit log, import Excel, multi gudang
- Harga: Rp 149.000/bulan atau Rp 1.190.000/tahun (hemat 33%)

### Upgrade ke Premium

1. Klik **Upgrade ke Premium** atau **Upgrade Sekarang**
2. Pilih siklus pembayaran: **Tahunan** (hemat 33%) atau **Bulanan**
3. Klik **Bayar Sekarang**
4. Anda akan diarahkan ke halaman pembayaran
5. Setelah pembayaran berhasil, fitur Premium langsung aktif

### Trial Premium

Jika Anda memiliki trial aktif, informasi sisa hari trial akan ditampilkan di halaman billing. Upgrade sebelum trial habis agar tidak kehilangan akses fitur Premium.

### Membatalkan Langganan

1. Klik **Batalkan Langganan** (hanya tersedia untuk pengguna Premium aktif)
2. Konfirmasi di dialog yang muncul
3. Fitur Premium tetap aktif sampai akhir periode langganan
4. Setelah periode berakhir, akun otomatis beralih ke paket Free

### Riwayat Invoice

Semua invoice ditampilkan di bagian bawah halaman dengan informasi:
- Nomor invoice
- Status: Lunas, Menunggu, Gagal, atau Kadaluarsa
- Tanggal dan provider pembayaran
- Jumlah

---

## 17. Checklist Setup Lengkap untuk Bisnis Baru

Gunakan checklist ini untuk memastikan semua pengaturan sudah dikonfigurasi:

- [ ] Pilih tipe bisnis (Pengaturan > Tipe Bisnis)
- [ ] Isi informasi bisnis: nama, email, telepon, alamat (Pengaturan > Pengaturan Bisnis)
- [ ] Periksa dan lengkapi data outlet utama (Pengaturan > Kelola Outlet)
- [ ] Atur tarif PPN dan opsi tax-inclusive (Pengaturan > Pengaturan Pajak)
- [ ] Tambahkan metode pembayaran yang diterima (Pengaturan > Metode Pembayaran)
- [ ] Hubungkan dan konfigurasi printer (Pengaturan > Konfigurasi Printer)
- [ ] Test print untuk memastikan printer berfungsi
- [ ] Kustomisasi struk: logo, header, footer (Pengaturan > Template Struk)
- [ ] Atur jam operasional (Pengaturan > Jam Operasional)
- [ ] Buat modifier groups jika diperlukan (Pengaturan > Modifier)
- [ ] Review fitur yang aktif (Pengaturan > Fitur)
- [ ] Sesuaikan warna brand (Pengaturan > Tampilan)
- [ ] Jadwalkan laporan otomatis (Pengaturan > Jadwal Laporan)
- [ ] Setup notifikasi (Pengaturan > Notifikasi)
- [ ] Pertimbangkan upgrade ke Premium jika membutuhkan fitur lanjutan (Pengaturan > Langganan & Billing)

---

## 18. FAQ

### Umum

**Q: Siapa yang bisa mengakses halaman Pengaturan?**
A: Hanya pengguna dengan role **Owner** atau **Manager** yang dapat mengakses dan mengubah pengaturan. Cashier, Kitchen Staff, dan role lainnya tidak memiliki akses.

**Q: Apakah perubahan pengaturan langsung berlaku?**
A: Ya, sebagian besar perubahan langsung berlaku setelah klik Simpan. Beberapa perubahan (seperti tipe bisnis) membutuhkan refresh data yang dilakukan secara otomatis.

### Outlet

**Q: Berapa maksimal outlet yang bisa ditambahkan?**
A: Paket Free hanya mendukung 1 outlet. Paket Premium mendukung multi-outlet tanpa batas.

**Q: Apakah data outlet yang dinonaktifkan hilang?**
A: Tidak. Data outlet yang dinonaktifkan tetap tersimpan dan bisa diaktifkan kembali.

### Pajak

**Q: Apa bedanya tax-inclusive dan tax-exclusive?**
A: Tax-inclusive berarti harga yang ditampilkan sudah termasuk pajak (pelanggan bayar sesuai harga yang tertera). Tax-exclusive berarti pajak ditambahkan di atas harga (total yang dibayar lebih tinggi dari harga yang tertera).

**Q: Apakah tarif pajak bisa berbeda per outlet?**
A: Ya, setiap outlet bisa memiliki tarif pajak dan service charge sendiri yang diatur saat menambah atau mengedit outlet.

### Printer

**Q: Printer apa yang didukung TiloPOS?**
A: TiloPOS mendukung printer thermal 58mm dan 80mm dengan koneksi jaringan (IP), USB, atau Bluetooth.

**Q: Bagaimana jika test print gagal?**
A: Pastikan printer menyala, terhubung ke jaringan yang sama, dan IP address serta port sudah benar. Untuk koneksi USB, pastikan driver printer terinstall.

### Fitur

**Q: Apakah menonaktifkan fitur menghapus data terkait?**
A: Tidak. Menonaktifkan fitur hanya menyembunyikan menu dan fungsionalitas terkait. Data tetap tersimpan dan akan muncul kembali saat fitur diaktifkan.

### Billing

**Q: Apakah ada biaya per transaksi?**
A: Tidak. TiloPOS tidak mengenakan biaya per transaksi. Anda hanya membayar biaya langganan bulanan atau tahunan.

**Q: Apa yang terjadi jika trial habis dan belum upgrade?**
A: Akun otomatis beralih ke paket Free. Fitur Premium tidak bisa diakses, tetapi data tetap tersimpan. Anda bisa upgrade kapan saja untuk mendapatkan kembali akses.
