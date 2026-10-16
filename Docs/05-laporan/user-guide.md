# Panduan Pengguna — Modul Laporan TiloPOS

## Daftar Isi

1. [Cara Akses Laporan](#cara-akses-laporan)
2. [Navigasi Halaman Laporan](#navigasi-halaman-laporan)
3. [Laporan Penjualan](#laporan-penjualan)
4. [Laporan Produk](#laporan-produk)
5. [Laporan Keuangan](#laporan-keuangan)
6. [Laporan Pembayaran](#laporan-pembayaran)
7. [Laporan Inventaris](#laporan-inventaris)
8. [Laporan Dapur](#laporan-dapur)
9. [Laporan Meja](#laporan-meja)
10. [Laporan Staff](#laporan-staff)
11. [Laporan Reservasi](#laporan-reservasi)
12. [Riwayat Transaksi](#riwayat-transaksi)
13. [Penyelesaian (Settlements)](#penyelesaian-settlements)
14. [Invoice](#invoice)
15. [Export Data](#export-data)
16. [Jadwal Laporan Otomatis](#jadwal-laporan-otomatis)
17. [Tips Membaca Laporan](#tips-membaca-laporan)
18. [FAQ](#faq)

---

## Cara Akses Laporan

### Desktop

1. Login ke TiloPOS dan masuk ke backoffice (`/app`)
2. Di sidebar kiri, klik menu **Laporan** untuk membuka halaman utama laporan
3. Untuk laporan penjualan detail, klik **Laporan Penjualan** di sidebar
4. Untuk riwayat transaksi, klik **Transaksi** di sidebar
5. Untuk penyelesaian, klik **Penyelesaian** di sidebar
6. Untuk invoice, klik **Invoice** di sidebar

### Mobile

1. Login ke TiloPOS dari browser HP
2. Navigasi ke halaman **Laporan** melalui menu navigasi bawah
3. Interface mobile menggunakan layout yang dioptimasi untuk layar kecil:
   - Pemilihan periode menggunakan bottom sheet (bukan dropdown)
   - Tab laporan menggunakan grid 4 kolom yang bisa di-scroll horizontal
   - Grafik dan tabel otomatis menyesuaikan lebar layar

### Hak Akses

| Role | Akses Laporan |
|------|---------------|
| Super Admin | Semua laporan, semua bisnis |
| Owner | Semua laporan bisnis sendiri |
| Manager | Semua laporan outlet yang ditugaskan |
| Supervisor | Laporan operasional (penjualan, produk, transaksi) |
| Cashier | Riwayat transaksi shift sendiri |
| Kitchen | Tidak ada akses laporan |
| Inventory | Laporan inventaris |

---

## Navigasi Halaman Laporan

### Memilih Periode

Di bagian atas halaman Laporan, tersedia 5 opsi periode:

1. **Hari Ini** — data dari pukul 00:00 sampai sekarang
2. **Minggu Ini** — Senin sampai hari ini
3. **Bulan Ini** — tanggal 1 sampai hari ini
4. **Tahun Ini** — 1 Januari sampai hari ini
5. **Custom** — jika dipilih, muncul date range picker untuk memilih tanggal mulai dan tanggal selesai

Periode yang dipilih berlaku untuk semua tab laporan di halaman tersebut. Jika Anda pindah tab dari Penjualan ke Produk, periode yang sama tetap digunakan.

### Memilih Tab Laporan

Di bawah pemilih periode, tersedia tab-tab laporan. Tab yang muncul bergantung pada tipe bisnis dan fitur yang aktif:

**Selalu tersedia:**
- Penjualan
- Produk
- Keuangan
- Pembayaran

**Muncul jika fitur terkait aktif:**
- Inventaris — jika manajemen stok diaktifkan
- Dapur — jika KDS diaktifkan (khusus F&B)
- Meja — jika manajemen meja diaktifkan (khusus F&B)
- Staff — jika komisi staff diaktifkan (khusus layanan)
- Reservasi — jika appointment diaktifkan (khusus layanan)

### Timestamp Data

Setiap laporan menampilkan timestamp kapan data terakhir diperbarui. Data laporan memiliki cache selama 5 menit — artinya jika Anda membuka laporan yang sama dalam waktu 5 menit, data yang ditampilkan adalah data cache tanpa memanggil server ulang. Setelah 5 menit, data akan otomatis di-refresh.

---

## Laporan Penjualan

### Ringkasan (Halaman Utama Laporan)

Saat membuka tab Penjualan di halaman Laporan, Anda akan melihat 4 kartu metrik:

1. **Total Penjualan** — jumlah total grand total dari semua transaksi selesai
2. **Transaksi** — jumlah transaksi yang berhasil diproses
3. **Rata-rata Order** — Total Penjualan dibagi Jumlah Transaksi (Average Order Value / AOV)
4. **Pelanggan** — jumlah pelanggan unik yang bertransaksi

Di bawah metrik, terdapat grafik bar chart **Penjualan per Hari** yang menampilkan total penjualan setiap hari dalam periode yang dipilih.

**Cara membaca grafik:**
- Sumbu X (horizontal) = tanggal
- Sumbu Y (vertikal) = nominal penjualan dalam Rupiah (diformat kompak, misal "1,5 Jt")
- Hover mouse di bar untuk melihat angka pasti
- Bar yang lebih tinggi = penjualan lebih banyak
- Perhatikan pola: apakah ada hari-hari yang konsisten tinggi (biasanya weekend) atau rendah

### Laporan Penjualan Detail

Halaman terpisah yang diakses melalui sidebar **Laporan Penjualan**. Memiliki 8 sub-bagian:

#### Ringkasan
Overview penjualan dengan metrik utama dan grafik tren. Menampilkan performa keseluruhan dalam periode yang dipilih.

#### Laba Kotor
Menampilkan perhitungan laba kotor per item. Berguna untuk melihat produk mana yang memberikan margin terbaik dan mana yang marginnya tipis.

#### Pembayaran
Breakdown penjualan berdasarkan metode pembayaran. Sama dengan Laporan Pembayaran di halaman utama, tapi konteksnya dalam laporan penjualan detail.

#### Item
Penjualan per item produk. Tabel menampilkan nama produk, quantity terjual, dan pendapatan. Bisa diurutkan untuk melihat top seller atau lowest seller.

#### Kategori
Penjualan dikelompokkan per kategori produk. Berguna untuk melihat performa per kategori (misal: Minuman vs Makanan vs Snack).

#### Diskon
Total diskon yang diberikan selama periode tersebut. Menampilkan berapa banyak uang yang "hilang" karena diskon. Bandingkan dengan peningkatan jumlah transaksi untuk evaluasi apakah promo efektif.

#### Pajak
Akumulasi PPN dan pajak lain yang terkumpul dari transaksi. Data ini bisa langsung digunakan untuk pelaporan SPT.

#### Kasir
Penjualan yang diproses oleh masing-masing kasir/karyawan. Berguna untuk evaluasi produktivitas per individu.

**Navigasi sub-bagian:**
- Di desktop: sidebar di sisi kiri layar dengan ikon dan label
- Di mobile: chip horizontal yang bisa di-scroll ke kanan/kiri

---

## Laporan Produk

### Metrik Utama

- **Total Produk Terjual** — jumlah jenis produk yang berbeda yang laku dalam periode tersebut (bukan total quantity)

### Grafik Top 10 Produk

Horizontal bar chart yang menampilkan 10 produk dengan pendapatan tertinggi.

**Cara membaca:**
- Sumbu Y (vertikal) = nama produk (dipotong jika terlalu panjang)
- Sumbu X (horizontal) = pendapatan dalam Rupiah
- Hover untuk melihat angka pasti
- Produk di urutan teratas = produk dengan pendapatan tertinggi

### Tabel Detail Produk

Tabel dengan kolom:
- **Nama Produk** — nama lengkap produk
- **Kategori** — kategori produk (atau "-" jika tidak dikategorikan)
- **Qty Terjual** — jumlah unit yang terjual
- **Pendapatan** — total pendapatan dari produk tersebut

**Tips identifikasi Best Seller vs Slow Mover:**
- **Best Seller**: produk dengan quantity tinggi DAN pendapatan tinggi. Ini adalah produk andalan — pastikan stok selalu tersedia.
- **High Revenue, Low Qty**: produk mahal yang tidak sering dibeli tapi memberikan kontribusi besar. Pertahankan kualitasnya.
- **High Qty, Low Revenue**: produk murah yang sering dibeli. Cek apakah marginnya masih sehat.
- **Slow Mover**: produk yang tidak muncul di daftar atau muncul di bagian paling bawah. Pertimbangkan untuk memberikan promo atau menghentikan produksi/pemesanan.

---

## Laporan Keuangan

### 4 Metrik yang Ditampilkan

1. **Pendapatan** = Total Penjualan - Refund
   Angka ini menunjukkan berapa uang yang benar-benar masuk dari penjualan.

2. **HPP (Harga Pokok Penjualan)** = Jumlah (Cost Price x Quantity) per item terjual
   Untuk mendapatkan data HPP yang akurat, pastikan setiap produk sudah diisi harga beli/cost price-nya di pengaturan produk.

3. **Laba Kotor** = Pendapatan - HPP
   Keuntungan sebelum dikurangi biaya operasional (sewa, listrik, gaji, dll).

4. **Margin Laba Kotor** = (Laba Kotor / Pendapatan) x 100%
   Persentase keuntungan dari setiap rupiah penjualan.

### Cara Interpretasi

**Margin Laba Kotor yang sehat per industri:**
- F&B (restoran/kafe): 60-70%
- Retail (grocery): 20-35%
- Retail (fashion): 40-60%
- Layanan (salon): 70-85%
- Wholesale/grosir: 10-25%

**Jika margin menurun:**
1. Cek apakah harga bahan baku/supplier naik (periksa HPP)
2. Cek apakah ada diskon berlebihan (periksa Laporan Diskon di Penjualan Detail)
3. Cek apakah ada produk dengan margin negatif (cost price > selling price)

**Jika margin meningkat:**
1. Evaluasi apakah harga jual terlalu tinggi (cek tren jumlah transaksi — jika menurun, mungkin pelanggan keberatan)
2. Jika jumlah transaksi tetap/naik, berarti efisiensi membaik

### Tooltip Calculation Help

Setiap metrik memiliki ikon tanda tanya di sampingnya. Klik ikon tersebut untuk melihat:
- **Judul** rumus yang digunakan
- **Formula** perhitungan
- **Deskripsi** penjelasan dalam Bahasa Indonesia

Fitur ini membantu pengguna yang tidak familiar dengan istilah akuntansi untuk memahami angka yang ditampilkan.

---

## Laporan Pembayaran

### Metrik Total Pembayaran

Menampilkan akumulasi semua pembayaran yang diterima dari semua metode.

### Pie Chart Distribusi

Visualisasi proporsi setiap metode pembayaran dalam bentuk pie chart.

**Cara membaca:**
- Setiap warna mewakili satu metode pembayaran
- Label persentase ditampilkan langsung di chart
- Legend di bawah chart menunjukkan korespondensi warna dan metode
- Hover untuk melihat persentase pasti

**Palet warna:** Primary, hijau, kuning, merah, ungu, pink, cyan — masing-masing untuk 7 metode pembayaran pertama.

### Tabel Detail Metode Pembayaran

Kolom yang ditampilkan:
- **Metode Bayar** — nama metode (Tunai, QRIS, dll)
- **Jumlah Transaksi** — berapa kali metode ini digunakan
- **Total** — nominal total dalam Rupiah
- **Persentase** — kontribusi metode ini terhadap total pembayaran

### Rekonsiliasi Pembayaran

Untuk rekonsiliasi antara data di TiloPOS dengan mutasi bank:
1. Buka Laporan Pembayaran untuk periode yang ingin direkonsiliasi
2. Catat total per metode non-tunai (QRIS, Debit, Credit, e-wallet)
3. Cocokkan dengan mutasi rekening bank atau dashboard payment gateway
4. Jika ada selisih, gunakan halaman **Penyelesaian (Settlements)** untuk tracking

---

## Laporan Inventaris

> Laporan ini hanya muncul jika fitur manajemen stok diaktifkan atau tipe bisnis adalah retail.

### 4 Kartu Ringkasan

1. **Total Produk** — jumlah produk yang terdaftar di sistem
2. **Nilai Stok** — total valuasi inventaris (quantity x harga beli per produk)
3. **Stok Rendah** (kartu kuning) — produk yang stoknya di bawah minimum yang ditetapkan. Ini adalah produk yang perlu segera di-restock.
4. **Stok Habis** (kartu merah) — produk yang stoknya 0. Produk ini tidak bisa dijual sampai restok dilakukan.

### Produk Terlaris

Ranking produk berdasarkan jumlah pergerakan stok (masuk dan keluar). Ditampilkan dalam format:
- Nomor urut (1, 2, 3, ...)
- Nama produk
- Jumlah pergerakan

### Produk Lambat Terjual

Daftar produk yang sudah lama tidak terjual. Ditampilkan:
- Nama produk
- Jumlah hari sejak terakhir terjual

**Tindakan yang disarankan untuk produk lambat terjual:**
- Jika > 14 hari: pertimbangkan diskon atau bundling
- Jika > 30 hari: pertimbangkan clearance sale
- Jika > 60 hari: pertimbangkan retur ke supplier atau write-off

---

## Laporan Dapur

> Laporan ini hanya muncul jika KDS (Kitchen Display System) diaktifkan dan tipe bisnis adalah F&B.

### 4 Kartu Ringkasan

1. **Total Pesanan** — jumlah pesanan yang masuk ke dapur
2. **Rata-rata Waktu** — rata-rata waktu persiapan per pesanan, dibandingkan dengan target
3. **Tepat Waktu** — persentase pesanan yang selesai dalam target waktu. Kartu berwarna hijau jika >= 85%, kuning jika < 85%.
4. **Tingkat Selesai** — persentase pesanan yang berhasil diselesaikan. Menampilkan juga jumlah pesanan yang dibatalkan.

### Jam Sibuk

Ranking jam berdasarkan jumlah pesanan. Ditampilkan dengan progress bar relatif (jam tersibuk = bar penuh).

**Cara menggunakan data ini:**
- Identifikasi 2-3 jam paling sibuk
- Pastikan ada cukup cook/chef di jam tersebut
- Pertimbangkan prep work sebelum jam sibuk dimulai

### Menu Terpopuler

Ranking menu berdasarkan jumlah pesanan. Menampilkan:
- Nama menu
- Jumlah pesanan (badge)
- Rata-rata waktu persiapan per menu

### Menu dengan Waktu Persiapan Lama (Alert)

Ditampilkan dalam kartu berwarna kuning. Ini adalah menu yang secara konsisten membutuhkan waktu persiapan di atas rata-rata.

**Tindakan yang disarankan:**
- Evaluasi resep dan teknik persiapan
- Pertimbangkan pre-preparation untuk bahan yang bisa disiapkan sebelumnya
- Jika memang membutuhkan waktu lama, sesuaikan target prep time di KDS

---

## Laporan Meja

> Laporan ini hanya muncul jika fitur manajemen meja diaktifkan dan tipe bisnis F&B.

### 4 Kartu Ringkasan

1. **Total Meja** — jumlah meja yang terdaftar
2. **Rata-rata Okupansi** — persentase meja yang terisi, dengan progress bar
3. **Durasi Makan** — rata-rata waktu pelanggan di meja (dari buka sampai tutup meja)
4. **Table Turnover** — berapa kali rata-rata setiap meja digunakan per hari

### Performa Meja

Ranking meja berdasarkan revenue. Ditampilkan:
- Nama meja
- Jumlah turnover dan rata-rata waktu
- Total revenue dari meja tersebut
- Badge "Top" untuk 3 meja terbaik, "Low" untuk sisanya

**Cara menggunakan data ini:**
- Meja dengan revenue tinggi dan turnover tinggi: pertahankan posisi dan ukurannya
- Meja dengan turnover rendah: apakah lokasinya kurang strategis? Perlu pindah?
- Meja dengan durasi makan lama tapi revenue rendah: mungkin digunakan pelanggan yang hanya minum

### Jam Ramai

Distribusi okupansi per jam. Ditampilkan dengan progress bar dan persentase.

### Statistik Tamu

3 metrik utama:
- **Total Tamu** — akumulasi seluruh tamu
- **Rata-rata per Meja** — berapa orang rata-rata per meja
- **Tamu per Hari per Meja** — indikator utilisasi

---

## Laporan Staff

> Laporan ini hanya muncul jika fitur komisi staff diaktifkan dan tipe bisnis layanan.

### 4 Kartu Ringkasan

1. **Total Staff** — jumlah karyawan aktif
2. **Total Layanan** — jumlah layanan yang selesai
3. **Rating Rata-rata** — dari feedback pelanggan (dengan bintang)
4. **Waktu Layanan** — rata-rata waktu per layanan

### Performa Staff (Leaderboard)

Daftar ranking staff berdasarkan revenue. Setiap entry menampilkan:
- Ranking (1, 2, 3 dengan warna emas, perak, perunggu)
- Avatar dengan inisial nama
- Nama staff
- Jumlah layanan dan rating
- Revenue yang dihasilkan
- Komisi yang didapat (warna hijau)

**Cara menggunakan data ini:**
- Berikan apresiasi/bonus untuk staff top performer
- Identifikasi staff yang perlu pelatihan tambahan
- Gunakan sebagai dasar penjadwalan: staff terbaik di jam sibuk

### Breakdown Layanan

Distribusi layanan berdasarkan tipe. Ditampilkan:
- Nama layanan
- Jumlah kali dilakukan
- Progress bar relatif
- Rata-rata waktu pengerjaan

---

## Laporan Reservasi

> Laporan ini hanya muncul jika fitur appointment diaktifkan dan tipe bisnis layanan.

### 4 Kartu Ringkasan

1. **Total Booking** — reservasi yang diterima
2. **Selesai** (kartu hijau) — booking yang berhasil diselesaikan, dengan progress bar
3. **Batal / No Show** (kartu merah) — booking yang dibatalkan atau pelanggan tidak datang
4. **Rata-rata Nilai** — nilai rata-rata per booking

### Booking per Hari

Distribusi reservasi di setiap hari dalam seminggu. Ditampilkan dengan progress bar relatif.

**Cara menggunakan data ini:**
- Hari dengan booking tertinggi: pastikan staff cukup
- Hari dengan booking terendah: pertimbangkan promo khusus hari tersebut

### Sumber Booking

Dari mana pelanggan melakukan reservasi (walk-in, online, telepon, dll). Ditampilkan dengan badge jumlah dan persentase.

### Layanan Populer

Top layanan berdasarkan jumlah booking. Ditampilkan dalam grid card dengan ranking, nama, dan jumlah booking.

---

## Riwayat Transaksi

Halaman riwayat transaksi diakses melalui menu sidebar **Transaksi**.

### Filter

Tersedia di bagian atas halaman:
- **Pilih Outlet** — dropdown untuk memilih outlet tertentu atau "Semua Outlet"
- **Tanggal** — date picker untuk memilih tanggal spesifik
- **Search** — cari berdasarkan nomor receipt

### 4 Tab

#### Tab Transaksi (Semua)
Menampilkan semua transaksi. Kolom: Outlet, Waktu, Diproses Oleh, Item, Total Harga.
Summary cards: Transaksi, Total Terkumpul, Penjualan Bersih.

#### Tab Pesanan Sukses
Filter hanya transaksi dengan status "completed". Kolom dan summary sama dengan tab "Semua".

#### Tab Pesanan Batal
Menampilkan transaksi yang di-refund (status "refunded" atau "partial_refund"). Kolom: Outlet, Waktu Batal, Dibatalkan Oleh, Alasan Batal, Total Harga.
Summary cards: Transaksi, Total Dibatalkan.

#### Tab Item Void
Menampilkan item-item yang di-void dari transaksi. Kolom: Waktu Void, Order ID, Nama Item, Qty, Alasan Void, Di-void Oleh, Total Harga.
Summary cards: Total Item Void, Total Harga Void.

### Aksi per Transaksi

Klik tombol titik tiga (...) di setiap baris untuk melihat opsi:
1. **Lihat Detail** — buka halaman detail transaksi
2. **Void** (hanya untuk transaksi completed) — membatalkan seluruh transaksi. Harus isi alasan void.
3. **Refund** (hanya untuk transaksi completed) — mengembalikan pembayaran. Harus isi alasan refund.
4. **Cetak Ulang** — cetak ulang struk/receipt

### Void Transaksi

1. Klik tombol titik tiga > Void
2. Dialog konfirmasi muncul dengan nomor transaksi
3. Isi alasan void (wajib)
4. Klik "Void Transaksi"
5. Transaksi akan berpindah ke tab "Item Void"

### Refund Transaksi

1. Klik tombol titik tiga > Refund
2. Dialog konfirmasi muncul
3. Isi alasan refund (wajib)
4. Klik "Proses Refund"
5. Transaksi akan berpindah ke tab "Pesanan Batal"

---

## Penyelesaian (Settlements)

Halaman ini diakses melalui menu sidebar **Penyelesaian**. Digunakan untuk rekonsiliasi pembayaran dengan setoran bank.

### 3 Kartu Metrik

1. **Total Diselesaikan** — jumlah settlement yang sudah dikonfirmasi
2. **Menunggu Penyelesaian** — settlement yang masih pending
3. **Dipersengketakan** — settlement dengan selisih/masalah

### Filter

- **Status**: Semua, Tertunda, Selesai, Dipersengketakan
- **Tanggal Mulai** dan **Tanggal Akhir**

### Tabel Settlement

Kolom: Tanggal, Outlet, Total Penjualan, Tunai, Non-Tunai, Status.

### Detail Settlement

Klik ikon mata di setiap baris untuk melihat detail:
- **Total Penjualan** — nominal total dari semua transaksi
- **Tunai** — total pembayaran tunai
- **Non-Tunai** — total pembayaran non-tunai
- **Rincian Metode Pembayaran** — tabel dengan metode, jumlah transaksi, dan total per metode
- **Status** — badge status saat ini
- **Tanggal Diselesaikan** — jika sudah settled

### Konfirmasi Penyelesaian

Untuk settlement berstatus "Tertunda", klik tombol **Konfirmasi Penyelesaian** di dialog detail. Ini menandai bahwa uang sudah diterima/disetorkan.

---

## Invoice

Halaman Invoice diakses melalui menu sidebar **Invoice**. Digunakan untuk manajemen faktur B2B.

### 3 Tab

1. **Invoice** — daftar semua faktur. Bisa memilih invoice untuk melihat detailnya.
2. **Transaksi** — transaksi yang terkait dengan faktur
3. **Detail Item** — rincian item per faktur

### Date Range

Gunakan date picker di kanan atas untuk mengubah rentang tanggal. Default: awal bulan ini sampai hari ini.

### Invoice Detail Modal

Klik sebuah invoice untuk membuka modal detail yang menampilkan informasi lengkap faktur.

---

## Export Data

### Tombol Export

Setiap halaman laporan yang mendukung export menampilkan tombol **Export** di area header laporan. Tombol ini biasanya terletak di sebelah kanan, sejajar dengan timestamp data.

### Format yang Tersedia

1. **PDF**
   - Laporan berformat rapi dengan:
     - Header: nama bisnis, nama outlet
     - Judul laporan dan periode
     - Tabel data
     - Summary/ringkasan di bagian bawah
   - Cocok untuk: presentasi, lampiran email, arsip cetak

2. **Excel**
   - File .xlsx dengan data tabular
   - Kolom angka sudah diformat sebagai Rupiah
   - Cocok untuk: analisis lanjutan, import ke software akuntansi, pivot table

### Penamaan File

File export otomatis diberi nama dengan format: `[nama_laporan]_[periode]_[outlet_id].[ext]`

Contoh: `laporan_penjualan_2026-02_outlet123.pdf`

### Halaman yang Mendukung Export

- Laporan Penjualan (tab utama)
- Laporan Produk (tab utama)
- Laporan Keuangan (tab utama)
- Laporan Pembayaran (tab utama)
- Riwayat Transaksi (semua tab)

---

## Jadwal Laporan Otomatis

### Cara Akses

1. Buka menu **Pengaturan** di sidebar
2. Klik **Jadwal Laporan**

> Hanya role Owner dan Super Admin yang bisa mengakses pengaturan ini.

### Konfigurasi

Atur jadwal pengiriman laporan otomatis via email:
- Pilih jenis laporan yang ingin dikirim
- Atur frekuensi: harian, mingguan, atau bulanan
- Masukkan alamat email penerima
- Pilih format laporan (PDF atau Excel)

### Kegunaan

- Owner yang tidak setiap hari membuka TiloPOS bisa tetap memantau bisnis dari email
- Akuntan bisa menerima laporan bulanan otomatis tanpa harus login
- Manager multi-outlet bisa menerima ringkasan dari semua outlet

---

## Tips Membaca Laporan untuk Pengambilan Keputusan

### 1. Bandingkan Periode ke Periode

Jangan hanya lihat angka absolut. Bandingkan:
- Bulan ini vs bulan lalu: apakah ada pertumbuhan?
- Minggu ini vs minggu yang sama bulan lalu: apakah ada pola musiman?
- Hari ini vs hari yang sama minggu lalu: apakah ada anomali?

Gunakan fitur "Custom" date range untuk membandingkan periode yang spesifik.

### 2. Fokus pada Tren, Bukan Angka Tunggal

Satu hari penjualan rendah bukan masalah. Tapi jika 4 minggu berturut-turut menurun, itu tren yang perlu ditindaklanjuti.

### 3. Perhatikan Korelasi Antar Laporan

- Total penjualan naik TAPI margin turun? Mungkin diskon terlalu besar.
- Jumlah transaksi naik TAPI AOV turun? Mungkin pelanggan beli lebih sedikit per kunjungan.
- Revenue per meja turun TAPI okupansi naik? Mungkin pelanggan berlama-lama tanpa order banyak.

### 4. Gunakan Laporan Produk untuk Keputusan Stok

- Top 10 produk: pastikan selalu tersedia
- Produk slow mover > 30 hari: siapkan rencana diskon
- Produk baru: pantau performanya di minggu pertama

### 5. Gunakan Laporan Pembayaran untuk Strategi Digital

- Jika > 50% masih tunai: dorong pelanggan ke cashless dengan promo QRIS
- Jika satu e-wallet dominan: pertimbangkan kerjasama promo dengan provider tersebut

### 6. Pantau Void dan Refund Secara Rutin

Void dan refund yang tinggi bisa mengindikasikan:
- Masalah kualitas produk (banyak komplain)
- Masalah operasional (salah input order)
- Potensi kecurangan (void fiktif)

Review alasan void secara berkala di tab "Item Void" dan "Pesanan Batal".

### 7. Manfaatkan Export untuk Analisis Mendalam

Data di TiloPOS sudah informatif, tapi untuk analisis lebih mendalam:
- Export ke Excel
- Buat pivot table untuk segmentasi
- Buat grafik tren bulanan
- Bandingkan antar outlet (jika multi-outlet)

---

## FAQ

### Q: Mengapa angka di laporan berbeda dengan total di kasir?

**A:** Laporan menggunakan data transaksi yang sudah selesai (status completed). Transaksi yang masih pending, draft, atau sedang diproses belum masuk ke laporan. Selain itu, transaksi yang di-void atau di-refund akan mengurangi total. Pastikan juga Anda melihat periode yang sama.

### Q: Kenapa Laporan Keuangan menampilkan HPP = Rp 0?

**A:** HPP dihitung dari harga beli (cost price) per produk. Jika Anda belum mengisi harga beli di pengaturan produk, HPP akan tampil Rp 0 dan margin akan tampil 100%. Solusi: buka Manajemen Produk, edit setiap produk, dan isi field "Harga Beli" / "Cost Price".

### Q: Kenapa tab Inventaris / Dapur / Meja / Staff / Reservasi tidak muncul?

**A:** Tab laporan muncul secara dinamis berdasarkan fitur yang aktif dan tipe bisnis. Misalnya:
- Tab Inventaris hanya muncul jika fitur manajemen stok diaktifkan
- Tab Dapur hanya muncul jika KDS diaktifkan DAN tipe bisnis F&B
- Tab Meja hanya muncul jika manajemen meja diaktifkan DAN tipe bisnis F&B
- Tab Staff hanya muncul jika komisi staff diaktifkan DAN tipe bisnis layanan
- Tab Reservasi hanya muncul jika appointment diaktifkan DAN tipe bisnis layanan

Untuk mengaktifkan fitur, buka Pengaturan > Fitur Bisnis.

### Q: Seberapa real-time data laporan?

**A:** Data laporan menggunakan cache 5 menit (staleTime: 5 menit). Artinya setelah Anda membuka laporan, data akan di-cache dan tidak akan memanggil server ulang selama 5 menit. Setelah 5 menit, data akan di-refresh otomatis saat Anda membuka halaman laporan lagi. Jika Anda perlu data terbaru segera, refresh halaman browser.

### Q: Bagaimana cara melihat laporan untuk outlet tertentu?

**A:** Pada halaman utama Laporan, data sudah di-filter berdasarkan outlet yang sedang aktif (ditampilkan di header/navbar). Untuk mengganti outlet, gunakan pemilih outlet di navigation bar. Pada halaman Transaksi, ada dropdown filter outlet yang bisa digunakan untuk memilih outlet spesifik atau "Semua Outlet".

### Q: Apakah bisa export laporan untuk periode yang panjang (misal 1 tahun)?

**A:** Ya, gunakan filter "Tahun Ini" atau "Custom" dengan rentang tanggal 1 tahun. Namun perlu diperhatikan bahwa semakin panjang periode, semakin lama waktu loading dan semakin besar file export. Untuk analisis tahunan, disarankan export per bulan lalu gabungkan di Excel.

### Q: Siapa saja yang bisa melakukan void dan refund transaksi?

**A:** Void dan refund hanya tersedia di halaman Riwayat Transaksi. Hanya role dengan akses ke halaman tersebut (biasanya Manager ke atas) yang bisa melakukannya. Setiap void dan refund wajib mengisi alasan, dan tercatat siapa yang melakukannya sebagai audit trail.

### Q: Bagaimana cara mencetak ulang struk?

**A:** Buka Riwayat Transaksi, cari transaksi yang dimaksud, klik tombol titik tiga (...), lalu pilih "Cetak Ulang". Pastikan printer struk terhubung dan dikonfigurasi di Pengaturan > Printer.

### Q: Apakah laporan bisa diakses offline?

**A:** Tidak. Laporan membutuhkan koneksi internet untuk mengambil data dari server. Namun, data yang sudah di-load akan tetap tampil selama tab browser tidak ditutup, meskipun koneksi terputus sementara.

### Q: Format apa yang tersedia untuk export?

**A:** Saat ini tersedia PDF dan Excel (.xlsx). CSV belum tersedia secara langsung, tapi Anda bisa membuka file Excel dan save as CSV jika diperlukan.
