# Panduan Pengguna — Modul Inventori TiloPOS

Panduan lengkap untuk mengelola inventaris bisnis Anda menggunakan TiloPOS. Panduan ini mencakup semua 12 sub-fitur modul Inventori.

---

## Daftar Isi

1. [Melihat Stok per Outlet](#1-melihat-stok-per-outlet)
2. [Melakukan Stock Adjustment](#2-melakukan-stock-adjustment)
3. [Membuat Sesi Stock Opname](#3-membuat-sesi-stock-opname)
4. [Transfer Stok Antar Outlet](#4-transfer-stok-antar-outlet)
5. [Mengelola Supplier](#5-mengelola-supplier)
6. [Membuat Purchase Order dan Receiving](#6-membuat-purchase-order-dan-receiving)
7. [Setting Harga Bertingkat (Price Tiers)](#7-setting-harga-bertingkat-price-tiers)
8. [Konversi Satuan](#8-konversi-satuan)
9. [Tracking Batch dan Kadaluarsa](#9-tracking-batch-dan-kadaluarsa)
10. [Tracking Serial Number](#10-tracking-serial-number)
11. [Assign Produk ke Outlet](#11-assign-produk-ke-outlet)
12. [Melihat Riwayat Harga Pokok](#12-melihat-riwayat-harga-pokok)
13. [Tips dan Best Practices](#13-tips-dan-best-practices)
14. [FAQ](#14-faq)

---

## 1. Melihat Stok per Outlet

### Akses Menu

Navigasi ke **Backoffice > Inventori > Stok** atau gunakan sidebar menu **Inventori > Stok Produk**.

### Melihat Ringkasan Stok

1. Halaman stok menampilkan daftar semua produk dengan kolom: nama produk, SKU, kategori, stok saat ini, stok minimum, satuan, dan status.
2. Gunakan **dropdown outlet** di bagian atas halaman untuk memilih outlet yang ingin dilihat. Pilih "Semua Outlet" untuk melihat stok gabungan.
3. Status stok ditandai dengan warna:
   - **Hijau**: Stok aman (di atas stok minimum)
   - **Kuning**: Stok menipis (mendekati stok minimum)
   - **Merah**: Stok kritis (di bawah stok minimum atau habis)

### Filter dan Pencarian

- Gunakan **search bar** untuk mencari berdasarkan nama produk atau SKU.
- Filter berdasarkan **kategori**, **status stok** (aman/menipis/kritis/habis), atau **supplier**.
- Klik header kolom untuk sorting berdasarkan nama, stok, atau nilai inventaris.

### Melihat Detail Stok Produk

1. Klik pada baris produk untuk membuka detail.
2. Halaman detail menampilkan:
   - Stok per outlet (jika multi-outlet)
   - Riwayat pergerakan stok (masuk, keluar, adjustment)
   - Grafik tren stok dalam periode tertentu
   - Informasi batch dan kadaluarsa (jika fitur aktif)
   - Serial number yang tersedia (jika fitur aktif)
   - HPP saat ini dan riwayat perubahan

### Reorder Alert

- Produk yang stoknya di bawah minimum akan muncul di **widget Reorder Alert** pada dashboard.
- Klik notifikasi alert untuk langsung membuat Purchase Order.
- Atur stok minimum per produk di halaman edit produk: **Produk > Edit > Stok Minimum**.

---

## 2. Melakukan Stock Adjustment

Stock adjustment digunakan untuk menambah atau mengurangi stok secara manual — misalnya karena barang rusak, hilang, sampel, penggunaan internal, atau koreksi data.

### Membuat Adjustment

1. Navigasi ke **Inventori > Stock Adjustment** lalu klik **Buat Adjustment Baru**.
2. Pilih **outlet** tempat adjustment dilakukan.
3. Pilih **tipe adjustment**:
   - **Tambah Stok** — menambah stok (contoh: barang ditemukan, donasi masuk)
   - **Kurang Stok** — mengurangi stok (contoh: barang rusak, hilang, sampel)
4. Tambahkan produk yang akan di-adjust:
   - Klik **Tambah Produk** atau scan barcode.
   - Masukkan **jumlah** yang akan ditambah atau dikurangi.
   - Jika fitur batch aktif, pilih **batch** mana yang di-adjust.
   - Jika fitur serial number aktif, pilih **serial number** spesifik.
5. Isi **alasan adjustment** — field ini wajib untuk audit trail.
6. Tambahkan **catatan** tambahan jika perlu.
7. Klik **Simpan** untuk menyimpan sebagai draft, atau **Simpan & Terapkan** untuk langsung mengeksekusi adjustment.

### Review dan Approval

- Adjustment yang disimpan sebagai draft bisa di-review oleh Manager/Owner sebelum diterapkan.
- Buka draft adjustment, review detail, lalu klik **Terapkan** atau **Tolak**.
- Setelah diterapkan, stok langsung terupdate dan tidak bisa di-undo (harus buat adjustment baru untuk membalikkan).

### Dampak pada HPP

- Adjustment **tambah stok** akan mempengaruhi HPP jika Anda mengisi harga pokok pada adjustment tersebut. Jika tidak diisi, sistem menggunakan HPP terakhir.
- Adjustment **kurang stok** tidak mempengaruhi HPP, hanya mengurangi kuantitas.

---

## 3. Membuat Sesi Stock Opname

Stock opname adalah proses menghitung fisik barang yang ada dan mencocokkan dengan catatan di sistem.

### Tahap 1: Membuat Sesi Opname (Draft)

1. Navigasi ke **Inventori > Stock Opname** lalu klik **Buat Opname Baru**.
2. Isi detail sesi:
   - **Nama sesi**: contoh "Opname Bulanan Januari 2026"
   - **Outlet**: pilih outlet yang akan di-opname
   - **Scope**: pilih apakah opname seluruh produk, per kategori, atau per area/rak
   - **Petugas**: assign karyawan yang akan melakukan penghitungan
   - **Tanggal rencana**: tanggal pelaksanaan opname
3. Klik **Simpan sebagai Draft**. Status sesi: **Draft**.

### Tahap 2: Memulai Penghitungan (In Progress)

1. Buka sesi opname yang berstatus Draft.
2. Klik **Mulai Opname**. Status berubah menjadi **In Progress**.
3. Sistem akan menampilkan daftar produk yang harus dihitung (berdasarkan scope yang dipilih). Stok sistem **tidak ditampilkan** selama penghitungan untuk menghindari bias.
4. Input hitungan fisik:

   **Via Desktop:**
   - Masukkan jumlah hitungan di kolom "Qty Fisik" untuk setiap produk.
   - Gunakan tombol **Tab** untuk berpindah antar baris dengan cepat.
   - Klik **Scan Barcode** untuk input via scanner — sistem otomatis menambah qty produk yang di-scan.

   **Via Mobile:**
   - Buka sesi opname di perangkat mobile.
   - Gunakan kamera untuk scan barcode produk.
   - Masukkan qty hitungan, lalu swipe ke produk berikutnya.
   - Data tersinkronisasi real-time ke server.

5. Untuk produk yang belum ditemukan atau belum dihitung, statusnya tetap "Belum Dihitung".
6. Anda bisa **pause** dan **lanjutkan** penghitungan — data tersimpan otomatis.

### Tahap 3: Review Selisih dan Menyelesaikan

1. Setelah semua produk dihitung, klik **Review Hasil**.
2. Sistem menampilkan **Discrepancy Report**:
   - Produk dengan selisih positif (fisik lebih banyak dari sistem)
   - Produk dengan selisih negatif (fisik lebih sedikit dari sistem)
   - Produk yang cocok (tidak ada selisih)
   - Total nilai selisih dalam Rupiah
3. Untuk setiap produk yang ada selisih, Anda bisa menambahkan **catatan penyebab**: hilang, rusak, salah input sebelumnya, dan lain-lain.
4. Klik **Selesaikan Opname** untuk menerapkan hasil. Status berubah menjadi **Completed**.
5. Sistem otomatis membuat stock adjustment berdasarkan hasil opname.
6. Laporan opname tersimpan dan bisa diakses kapan saja di riwayat.

### Tips Opname

- Lakukan opname saat jam operasional sepi atau setelah tutup toko agar tidak ada transaksi yang mengganggu.
- Untuk toko besar, lakukan opname per kategori secara berkala (rolling opname) daripada seluruh toko sekaligus.
- Selalu assign minimal 2 petugas untuk cross-check penghitungan.

---

## 4. Transfer Stok Antar Outlet

### Membuat Transfer Baru

1. Navigasi ke **Inventori > Transfer Stok** lalu klik **Buat Transfer Baru**.
2. Pilih **outlet asal** (pengirim) dan **outlet tujuan** (penerima).
3. Tambahkan produk yang akan ditransfer:
   - Klik **Tambah Produk** atau scan barcode.
   - Masukkan **jumlah** yang akan ditransfer.
   - Jika fitur batch aktif, pilih batch mana yang ditransfer.
   - Jika fitur serial number aktif, pilih serial number spesifik.
4. Tambahkan **catatan** jika perlu (misalnya: nomor resi pengiriman).
5. Klik **Kirim Transfer**.

### Status Transfer dan Timeline

Transfer memiliki alur status berikut:

1. **Draft** — Transfer dibuat tapi belum dikirim. Masih bisa diedit atau dibatalkan.
2. **Dikirim (Sent)** — Stok sudah dikurangi dari outlet asal. Menunggu konfirmasi penerimaan di outlet tujuan.
3. **Diterima (Received)** — Outlet tujuan mengkonfirmasi penerimaan. Stok ditambahkan ke outlet tujuan.
4. **Diterima Sebagian (Partially Received)** — Tidak semua barang diterima lengkap. Selisih dicatat.
5. **Dibatalkan (Cancelled)** — Transfer dibatalkan sebelum diterima. Stok dikembalikan ke outlet asal (jika sudah dikirim).

Setiap perubahan status tercatat di **timeline** dengan waktu dan nama petugas.

### Menerima Transfer

1. Di outlet tujuan, buka **Inventori > Transfer Stok > Tab "Masuk"**.
2. Klik transfer yang berstatus "Dikirim".
3. Verifikasi jumlah yang diterima untuk setiap produk.
4. Jika ada selisih, masukkan jumlah aktual yang diterima dan catatan selisih.
5. Klik **Konfirmasi Penerimaan**.

### Menggunakan Transfer Template

1. Buka **Inventori > Transfer Stok > Template**.
2. Klik **Buat Template Baru**.
3. Isi nama template, outlet asal, outlet tujuan, dan daftar produk beserta jumlah standar.
4. Simpan template.
5. Saat membuat transfer baru, klik **Dari Template** dan pilih template yang sudah dibuat. Semua data terisi otomatis, tinggal sesuaikan jumlah jika perlu.

---

## 5. Mengelola Supplier

### Menambahkan Supplier Baru

1. Navigasi ke **Inventori > Supplier** lalu klik **Tambah Supplier**.
2. Isi informasi supplier:
   - **Nama perusahaan** (wajib)
   - **Nama kontak person**
   - **Telepon** dan **email**
   - **Alamat** lengkap
   - **Syarat pembayaran**: COD, Net 7, Net 14, Net 30, dan lain-lain
   - **NPWP** (jika ada)
   - **Rekening bank** untuk pembayaran
   - **Catatan** internal
3. Klik **Simpan**.

### Mengelola Produk Supplier

1. Buka detail supplier, lalu buka tab **Produk**.
2. Klik **Hubungkan Produk** untuk menambahkan produk yang disupply oleh supplier ini.
3. Untuk setiap produk, masukkan:
   - **Kode produk supplier** (SKU supplier)
   - **Harga beli** dari supplier ini
   - **Minimum order**
   - **Lead time** (waktu pengiriman dalam hari)
4. Satu produk bisa memiliki beberapa supplier. Ini berguna untuk perbandingan harga.

### Perbandingan Supplier

1. Buka halaman produk, lalu buka tab **Supplier**.
2. Sistem menampilkan semua supplier yang menyediakan produk tersebut beserta harga masing-masing.
3. Bandingkan berdasarkan: harga, lead time, minimum order, dan reliability (berdasarkan riwayat PO).

### Analytics Supplier

Di halaman detail supplier, tab **Analytics** menampilkan:
- Total pembelian per periode
- Rata-rata lead time aktual vs yang dijanjikan
- Persentase PO yang diterima tepat waktu dan lengkap
- Tren harga produk dari supplier ini

---

## 6. Membuat Purchase Order dan Receiving

### Membuat Purchase Order (PO)

1. Navigasi ke **Inventori > Purchase Order** lalu klik **Buat PO Baru**.
2. Pilih **supplier** dari daftar.
3. Pilih **outlet/gudang** tujuan penerimaan barang.
4. Tambahkan produk:
   - Klik **Tambah Produk** — sistem menampilkan produk yang terhubung dengan supplier ini beserta harga terakhir.
   - Atur **jumlah pesan** dan **harga beli** (otomatis terisi dari data supplier, bisa diedit).
   - Jika fitur unit conversion aktif, pilih **satuan pembelian** (misalnya: karton, box, sak).
5. Review **subtotal**, tambahkan **diskon PO** atau **biaya tambahan** (ongkir, pajak) jika ada.
6. Isi **tanggal pengiriman diharapkan**.
7. Tambahkan **catatan** untuk supplier.
8. Klik **Simpan sebagai Draft** atau **Kirim ke Supplier**.

### Alur Status PO

1. **Draft** — PO dibuat, belum dikirim ke supplier. Masih bisa diedit bebas.
2. **Dikirim (Sent)** — PO sudah dikirim ke supplier. Menunggu pengiriman barang.
3. **Diterima Sebagian (Partially Received)** — Sebagian barang sudah diterima, sisanya masih menunggu.
4. **Diterima Lengkap (Fully Received)** — Semua barang sudah diterima.
5. **Dibatalkan (Cancelled)** — PO dibatalkan.

### Menerima Barang (Receiving)

1. Buka PO yang berstatus "Dikirim" atau "Diterima Sebagian".
2. Klik **Terima Barang**.
3. Untuk setiap produk, masukkan **jumlah yang diterima**.
   - Jika fitur batch aktif: masukkan **nomor batch** dan **tanggal kadaluarsa** untuk setiap batch yang diterima.
   - Jika fitur serial number aktif: scan atau input **serial number** setiap unit.
4. Jika ada produk yang **jumlahnya berbeda** dari PO, catat di kolom catatan.
5. Jika ada produk yang **rusak saat diterima**, masukkan jumlah rusak dan alasan.
6. Klik **Konfirmasi Penerimaan**.

Setelah penerimaan dikonfirmasi:
- Stok otomatis bertambah di outlet/gudang tujuan.
- HPP dihitung ulang menggunakan metode moving average.
- Batch dan serial number tercatat di sistem.

### Tracking Pembayaran PO

1. Buka PO, lalu buka tab **Pembayaran**.
2. Klik **Catat Pembayaran** untuk mencatat pembayaran ke supplier.
3. Masukkan **jumlah bayar**, **tanggal bayar**, **metode bayar**, dan **referensi** (nomor transfer, dan lain-lain).
4. PO bisa dibayar sekaligus atau dicicil (partial payment).
5. Status pembayaran: Belum Bayar → Bayar Sebagian → Lunas.

---

## 7. Setting Harga Bertingkat (Price Tiers)

### Mengaktifkan Fitur

Fitur price tiers harus diaktifkan terlebih dahulu di **Pengaturan > Fitur Bisnis > Price Tiers > Aktifkan**.

### Membuat Tier Harga

1. Navigasi ke **Produk > Edit Produk > Tab Harga**.
2. Di bagian **Harga Bertingkat**, klik **Tambah Tier**.
3. Pilih **tipe tier**:

   **Berdasarkan Kuantitas:**
   - Masukkan rentang kuantitas dan harga untuk rentang tersebut.
   - Contoh:
     - 1-11 pcs: Rp 10.000 (harga retail)
     - 12-47 pcs: Rp 9.000 (harga lusin)
     - 48+ pcs: Rp 8.000 (harga grosir)

   **Berdasarkan Tipe Pelanggan:**
   - Masukkan harga per tipe pelanggan.
   - Contoh:
     - Umum: Rp 10.000
     - Member: Rp 9.500
     - Reseller: Rp 8.500
     - Distributor: Rp 7.500

4. Klik **Simpan**.

### Penggunaan di POS

- Saat transaksi di POS, harga otomatis menyesuaikan berdasarkan kuantitas yang dimasukkan.
- Jika pelanggan terdaftar dan memiliki tipe tertentu, harga tier pelanggan otomatis diterapkan.
- Kasir bisa melihat breakdown harga tier di detail item.

---

## 8. Konversi Satuan

### Mengaktifkan Fitur

Aktifkan di **Pengaturan > Fitur Bisnis > Konversi Satuan > Aktifkan**.

### Mendefinisikan Satuan dan Konversi

1. Navigasi ke **Pengaturan > Satuan** untuk mengelola daftar satuan: pcs, box, karton, lusin, kg, gram, liter, ml, meter, roll, sak, dan lain-lain.
2. Buka **Produk > Edit Produk > Tab Satuan**.
3. Tentukan **satuan dasar** (satuan terkecil) — misalnya: pcs.
4. Tambahkan **satuan konversi**:
   - 1 lusin = 12 pcs
   - 1 box = 24 pcs
   - 1 karton = 48 pcs
5. Untuk setiap satuan konversi, Anda bisa menentukan:
   - **Harga beli** dalam satuan tersebut
   - **Harga jual** dalam satuan tersebut
   - **Barcode** khusus untuk satuan tersebut

### Penggunaan di POS dan PO

**Di POS:**
- Kasir bisa memilih satuan jual: apakah menjual per pcs, per lusin, atau per box.
- Harga dan pengurangan stok otomatis dihitung berdasarkan konversi.
- Barcode berbeda per satuan — scan barcode box otomatis masuk sebagai 1 box.

**Di Purchase Order:**
- Saat membuat PO, pilih satuan pembelian (misalnya: karton).
- Saat receiving, stok otomatis dikonversi ke satuan dasar (pcs) di sistem.

---

## 9. Tracking Batch dan Kadaluarsa

### Mengaktifkan Fitur

Aktifkan di **Pengaturan > Fitur Bisnis > Batch & Expiry Tracking > Aktifkan**.

### Memasukkan Data Batch

Data batch dimasukkan saat **menerima barang** (receiving PO) atau saat **stock adjustment tambah**:

1. Saat receiving PO, untuk produk yang batch tracking-nya aktif, kolom tambahan muncul:
   - **Nomor Batch**: masukkan nomor batch dari supplier (contoh: "BTH-2026-0215")
   - **Tanggal Produksi**: tanggal produksi batch
   - **Tanggal Kadaluarsa**: tanggal kadaluarsa batch
   - **Jumlah**: berapa unit dalam batch ini
2. Satu PO receive bisa memiliki beberapa batch berbeda untuk satu produk.

### Melihat Stok per Batch

1. Buka detail produk, lalu buka tab **Batch**.
2. Sistem menampilkan semua batch yang masih memiliki stok:
   - Nomor batch, tanggal kadaluarsa, jumlah tersisa
   - Status: aktif, hampir kadaluarsa, kadaluarsa
3. Batch diurutkan berdasarkan tanggal kadaluarsa (FIFO) — batch terdekat kadaluarsa di atas.

### Alert Kadaluarsa

- Sistem mengirim alert saat batch mendekati tanggal kadaluarsa.
- Konfigurasi interval alert di **Pengaturan > Inventori > Alert Kadaluarsa**:
  - Alert pertama: X hari sebelum kadaluarsa (default: 30 hari)
  - Alert kedua: X hari sebelum kadaluarsa (default: 14 hari)
  - Alert kritis: X hari sebelum kadaluarsa (default: 7 hari)
- Alert muncul di dashboard dan di notifikasi.
- Dari alert, Anda bisa langsung membuat promosi diskon untuk menghabiskan stok yang akan kadaluarsa.

### FIFO Otomatis

- Saat penjualan di POS, sistem otomatis mengurangi stok dari batch dengan tanggal kadaluarsa paling dekat.
- Kasir tidak perlu memilih batch secara manual — semuanya otomatis.
- Laporan FIFO tersedia di **Laporan > Inventori > Pergerakan Batch**.

---

## 10. Tracking Serial Number

### Mengaktifkan Fitur

Aktifkan di **Pengaturan > Fitur Bisnis > Serial Number Tracking > Aktifkan**. Kemudian aktifkan per produk di halaman edit produk.

### Memasukkan Serial Number

Saat **receiving PO** untuk produk dengan serial tracking aktif:

1. Untuk setiap unit yang diterima, masukkan serial number-nya.
2. Cara input:
   - **Manual**: ketik serial number satu per satu.
   - **Scan barcode**: scan barcode serial number dari kemasan produk.
   - **Bulk import**: upload file CSV berisi daftar serial number.
3. Setiap serial number harus unik — sistem menolak duplikat.

### Melihat Stok Serial Number

1. Buka detail produk, lalu buka tab **Serial Number**.
2. Sistem menampilkan semua serial number beserta statusnya:
   - **Tersedia (In Stock)**: siap dijual
   - **Terjual (Sold)**: sudah terjual, tercatat ke pelanggan dan transaksi mana
   - **Dalam Transfer (In Transit)**: sedang dalam proses transfer antar outlet
   - **Rusak (Damaged)**: ditandai sebagai rusak via stock adjustment
   - **Dikembalikan (Returned)**: dikembalikan oleh pelanggan
3. Filter dan cari serial number tertentu.

### Penjualan di POS

1. Saat menjual produk dengan serial tracking, kasir harus scan atau input serial number.
2. Sistem memvalidasi bahwa serial number tersedia di outlet tersebut.
3. Serial number tercatat di struk penjualan.
4. Berguna untuk: klaim garansi, retur, dan tracking unit individu.

### Garansi dan Retur

- Saat pelanggan klaim garansi, input serial number untuk melihat tanggal pembelian dan status garansi.
- Saat retur, serial number dikembalikan ke status "Tersedia" atau "Rusak" sesuai kondisi.

---

## 11. Assign Produk ke Outlet

### Mengaktifkan Fitur

Fitur ini relevan jika bisnis Anda memiliki lebih dari satu outlet. Aktifkan di **Pengaturan > Fitur Bisnis > Assign Produk per Outlet**.

### Assign Produk Satu per Satu

1. Buka **Produk > Edit Produk > Tab Outlet**.
2. Centang outlet mana saja yang menjual produk ini.
3. Produk yang tidak di-assign ke suatu outlet tidak akan muncul di POS outlet tersebut.

### Bulk Assignment

1. Navigasi ke **Inventori > Assign Produk**.
2. Pilih **outlet tujuan**.
3. Pilih produk yang akan di-assign:
   - Pilih per kategori: "Assign semua produk kategori Minuman ke Outlet Cabang 2"
   - Pilih manual: centang produk satu per satu
   - Upload CSV: untuk assign massal
4. Klik **Assign**.

### Melihat Availability per Outlet

1. Di halaman **Inventori > Assign Produk**, pilih outlet.
2. Sistem menampilkan daftar semua produk beserta status assign-nya:
   - Hijau: sudah di-assign (tersedia di outlet)
   - Abu-abu: belum di-assign (tidak tersedia di outlet)
3. Toggle assign/unassign langsung dari daftar ini.

---

## 12. Melihat Riwayat Harga Pokok

### Akses Menu

Navigasi ke **Inventori > Riwayat HPP** atau buka detail produk kemudian buka tab **HPP**.

### Informasi yang Ditampilkan

Untuk setiap produk, sistem menampilkan:

1. **HPP Saat Ini**: harga pokok terkini berdasarkan moving average.
2. **Grafik Tren HPP**: grafik garis yang menunjukkan perubahan HPP dari waktu ke waktu.
3. **Riwayat Detail**: tabel kronologis setiap perubahan HPP:
   - Tanggal perubahan
   - HPP sebelum dan sesudah
   - Penyebab perubahan (PO receive, adjustment, dan lain-lain)
   - Referensi dokumen (nomor PO, nomor adjustment)
   - Jumlah unit yang masuk dan harga unitnya

### Cara Kalkulasi Moving Average

Setiap kali stok masuk (PO receive atau adjustment tambah stok dengan harga), HPP dihitung ulang:

```
HPP Baru = ((Stok Lama x HPP Lama) + (Stok Masuk x Harga Beli Baru)) / (Stok Lama + Stok Masuk)
```

**Contoh:**
- Stok saat ini: 100 pcs dengan HPP Rp 10.000
- Terima PO: 50 pcs dengan harga Rp 12.000
- HPP baru: ((100 x 10.000) + (50 x 12.000)) / (100 + 50) = Rp 10.667

### Analisis dan Perbandingan

- Filter riwayat berdasarkan **periode waktu** untuk melihat tren.
- **Bandingkan harga** dari berbagai PO untuk melihat apakah supplier menaikkan harga.
- Gunakan data ini untuk **negosiasi** dengan supplier.
- **Export** data ke CSV/Excel untuk analisis lebih lanjut.

---

## 13. Tips dan Best Practices

### Kapan Harus Melakukan Stock Opname?

| Jenis Bisnis | Frekuensi Opname yang Disarankan | Metode |
|---|---|---|
| Minimarket / Grocery | Mingguan (per kategori, rolling) | Rolling per kategori |
| Restoran / Kafe | Harian (bahan baku mahal) + Mingguan (lengkap) | Harian untuk item high-value |
| Toko Elektronik | Bulanan (semua) + Real-time (serial number) | Full opname bulanan |
| Toko Bangunan | Bulanan (fast-moving) + Quarterly (semua) | Per area toko |
| Fashion | Quarterly atau saat ganti musim/koleksi | Full opname per ganti musim |
| Apotek | Mingguan (obat resep) + Bulanan (semua) | Rolling per rak |

### Cara Mengoptimasi Stok Minimum

1. **Analisis data penjualan** 3-6 bulan terakhir untuk mengetahui rata-rata penjualan per hari per produk.
2. **Hitung lead time** dari supplier: berapa hari dari PO sampai barang diterima.
3. **Rumus stok minimum**: Rata-rata penjualan per hari x Lead time (hari) x Safety factor (1.2 - 1.5).
4. **Review berkala**: sesuaikan stok minimum setiap 3 bulan berdasarkan tren terbaru.
5. **Pertimbangkan musim**: untuk produk seasonal, naikkan stok minimum menjelang peak season.

### Tips Efisiensi Stock Opname

- Gunakan **barcode scanner** untuk mempercepat penghitungan — 3x lebih cepat dari input manual.
- Lakukan opname saat **toko tutup** atau jam sepi untuk menghindari transaksi yang mengganggu hitungan.
- Untuk toko besar, gunakan metode **rolling opname**: setiap minggu opname 1-2 kategori, sehingga dalam sebulan semua produk teropname tanpa perlu menutup toko seharian.
- Assign **2 petugas** per area untuk double-counting dan akurasi.
- **Freeze zone**: saat menghitung area tertentu, pastikan tidak ada barang yang dipindahkan masuk/keluar area tersebut.

### Tips Purchase Order

- Buat **jadwal rutin** pemesanan per supplier (misal: supplier A setiap hari Senin, supplier B setiap Kamis).
- Manfaatkan **reorder alert** — jangan tunggu sampai stok benar-benar habis.
- Review **supplier comparison** sebelum membuat PO untuk mendapat harga terbaik.
- Catat **semua biaya** di PO (ongkir, pajak) agar HPP akurat.

### Tips Transfer Stok

- Buat **template transfer** untuk pola distribusi rutin.
- Selalu **verifikasi penerimaan** di outlet tujuan — jangan biarkan status transfer menggantung di "Dikirim".
- Lakukan transfer berdasarkan **data penjualan** outlet tujuan, bukan estimasi.

---

## 14. FAQ

### Umum

**T: Apakah semua fitur inventori harus diaktifkan sekaligus?**
J: Tidak. Setiap sub-fitur memiliki feature flag sendiri dan bisa diaktifkan/dinonaktifkan kapan saja sesuai kebutuhan bisnis Anda. Mulai dari yang paling dasar (Stock Management, Stock Opname) lalu aktifkan fitur lain seiring kebutuhan.

**T: Apakah mengaktifkan fitur baru akan mempengaruhi data yang sudah ada?**
J: Tidak. Mengaktifkan fitur baru hanya menambah fungsionalitas tanpa mengubah data existing. Misalnya, mengaktifkan batch tracking tidak akan mempengaruhi stok yang sudah tercatat — batch tracking berlaku untuk penerimaan barang baru ke depannya.

**T: Bagaimana jika saya salah melakukan stock adjustment?**
J: Stock adjustment yang sudah diterapkan tidak bisa di-undo secara langsung. Anda perlu membuat adjustment baru yang membalikkan adjustment sebelumnya. Misalnya, jika salah mengurangi 10, buat adjustment tambah 10 dengan catatan "Koreksi adjustment #XX".

### Stock Opname

**T: Apakah transaksi penjualan terhenti selama stock opname?**
J: Tidak, penjualan tetap bisa berjalan selama opname. Namun, untuk akurasi terbaik, disarankan melakukan opname saat jam sepi atau setelah tutup toko. Sistem akan memperhitungkan transaksi yang terjadi selama proses opname.

**T: Bagaimana jika ada produk yang tidak ditemukan saat opname?**
J: Masukkan qty fisik = 0. Saat review, produk ini akan muncul sebagai selisih negatif. Tambahkan catatan "Tidak ditemukan" agar tercatat untuk investigasi.

**T: Bisakah saya membatalkan sesi opname yang sudah selesai?**
J: Sesi opname yang sudah berstatus "Completed" tidak bisa dibatalkan karena adjustment stok sudah diterapkan. Anda bisa membuat sesi opname baru jika hasilnya perlu dikoreksi.

### Purchase Order

**T: Bagaimana jika barang yang diterima berbeda jumlahnya dari PO?**
J: Saat receiving, masukkan jumlah aktual yang diterima. Jika lebih sedikit, PO akan berstatus "Diterima Sebagian" dan sisa bisa diterima nanti atau PO bisa ditutup secara manual. Jika lebih banyak dari PO, sistem akan meminta konfirmasi untuk menerima kelebihan.

**T: Apakah HPP langsung berubah saat menerima PO?**
J: Ya, HPP dihitung ulang secara otomatis menggunakan metode moving average saat Anda mengkonfirmasi penerimaan barang.

### Transfer

**T: Bagaimana jika barang yang ditransfer rusak di perjalanan?**
J: Saat menerima transfer di outlet tujuan, masukkan jumlah aktual yang diterima dalam kondisi baik. Selisih antara jumlah dikirim dan diterima akan tercatat. Buat stock adjustment di outlet asal untuk mencatat barang yang rusak.

**T: Bisakah transfer dilakukan antar gudang (bukan outlet)?**
J: Ya, gudang diperlakukan sama seperti outlet dalam sistem. Anda bisa transfer dari gudang ke outlet, outlet ke gudang, atau gudang ke gudang.

### Harga dan Satuan

**T: Bagaimana jika harga grosir berubah? Apakah harus edit satu per satu?**
J: Anda bisa mengupdate harga tier di halaman produk. Perubahan berlaku langsung untuk transaksi selanjutnya. Untuk update massal, gunakan fitur import/export di halaman Produk.

**T: Bagaimana konversi satuan mempengaruhi stok?**
J: Stok selalu disimpan dalam satuan dasar (terkecil). Konversi satuan hanya mempengaruhi tampilan dan kalkulasi. Jika menjual 1 box (= 24 pcs), stok berkurang 24 pcs di sistem.

### Batch dan Serial Number

**T: Apakah bisa mengaktifkan batch tracking hanya untuk produk tertentu?**
J: Ya, batch tracking bisa diaktifkan per produk. Tidak semua produk harus menggunakan batch tracking — hanya yang memiliki tanggal kadaluarsa atau perlu dilacak batch-nya.

**T: Berapa batas serial number yang bisa dimasukkan?**
J: Tidak ada batas jumlah serial number. Namun, perlu diperhatikan bahwa setiap unit harus di-input serial number-nya saat receiving, yang membutuhkan waktu lebih. Untuk produk dengan volume sangat tinggi, pertimbangkan apakah serial tracking benar-benar diperlukan.

**T: Bagaimana jika barcode serial number produk hilang atau rusak?**
J: Serial number tetap tercatat di sistem. Anda bisa mencari serial number melalui pencarian di halaman Serial Number. Untuk penjualan, kasir bisa input manual serial number tanpa scan barcode.
