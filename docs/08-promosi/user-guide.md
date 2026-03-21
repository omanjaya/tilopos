# Panduan Pengguna: Modul Promosi

Panduan lengkap untuk mengelola promosi, voucher, program loyalty, dan penjualan kredit (BON) di TiloPOS.

---

## Daftar Isi

1. [Membuat Promosi Baru (Semua Tipe)](#1-membuat-promosi-baru)
2. [Generate Voucher Codes](#2-generate-voucher-codes)
3. [Setting Program Loyalty (Poin, Tier)](#3-setting-program-loyalty)
4. [Membuat Transaksi Kredit (BON)](#4-membuat-transaksi-kredit-bon)
5. [Tracking Piutang dan Cicilan](#5-tracking-piutang-dan-cicilan)
6. [Tips Promosi Efektif untuk UMKM](#6-tips-promosi-efektif-untuk-umkm)
7. [FAQ (Pertanyaan yang Sering Diajukan)](#7-faq)

---

## 1. Membuat Promosi Baru

### Mengakses Halaman Promosi

Buka menu **Promosi** dari sidebar navigasi (`/app/promotions`). Di sini Anda akan melihat daftar semua promosi yang sudah dibuat beserta status masing-masing.

### Langkah-langkah Membuat Promosi

1. Klik tombol **"Tambah Promosi"** di pojok kanan atas (shortcut keyboard: `N`)
2. Isi formulir detail promosi:

#### Field yang Wajib Diisi

| Field | Deskripsi |
|-------|-----------|
| **Nama Promosi** | Nama deskriptif untuk identifikasi (contoh: "Diskon Akhir Tahun 2026") |
| **Tipe Diskon** | Pilih salah satu: Persentase, Nominal, atau BOGO |
| **Nilai Diskon** | Angka sesuai tipe: persentase (0-100) atau nominal (dalam Rupiah) |
| **Berlaku Dari** | Tanggal mulai berlaku promosi |
| **Berlaku Sampai** | Tanggal berakhirnya promosi |

#### Field Opsional

| Field | Deskripsi |
|-------|-----------|
| **Deskripsi** | Penjelasan singkat tentang promosi (opsional, untuk catatan internal) |
| **Minimum Pembelian (Rp)** | Promosi hanya berlaku jika total transaksi mencapai jumlah ini |
| **Maksimum Diskon (Rp)** | Khusus tipe Persentase — membatasi potongan maksimal |
| **Batas Penggunaan** | Berapa kali total promosi bisa digunakan. Kosongkan untuk tidak ada batas |

3. Klik **"Buat Promosi"** untuk menyimpan

### Panduan per Tipe Diskon

#### Tipe Persentase (%)

Diskon berdasarkan persentase dari nilai transaksi atau item.

**Contoh konfigurasi:**
- Nama: "Diskon Weekend 15%"
- Tipe Diskon: Persentase
- Nilai Diskon: 15
- Minimum Pembelian: Rp 50.000
- Maksimum Diskon: Rp 30.000
- Berlaku: Setiap Sabtu-Minggu

**Cara kerja:** Pelanggan belanja Rp 200.000 di hari Sabtu → diskon 15% = Rp 30.000 (tepat di batas maksimum). Pelanggan belanja Rp 300.000 → diskon 15% seharusnya Rp 45.000, tapi dibatasi menjadi Rp 30.000.

#### Tipe Nominal (Rp)

Diskon berupa potongan harga tetap dalam Rupiah.

**Contoh konfigurasi:**
- Nama: "Potongan Rp 25.000"
- Tipe Diskon: Nominal
- Nilai Diskon: 25000
- Minimum Pembelian: Rp 100.000

**Cara kerja:** Pelanggan belanja Rp 150.000 → langsung potong Rp 25.000 → bayar Rp 125.000.

#### Tipe BOGO (Buy 1 Get 1)

Promosi beli satu gratis satu.

**Contoh konfigurasi:**
- Nama: "BOGO Kopi Spesial"
- Tipe Diskon: BOGO
- Nilai Diskon: (otomatis, sesuai harga item)
- Minimum Pembelian: (opsional)

**Cara kerja:** Pelanggan membeli item yang eligible, item kedua (yang sama atau lebih murah) gratis.

### Mengelola Promosi yang Sudah Ada

**Edit promosi:**
1. Di halaman daftar promosi, klik ikon menu (tiga titik) pada baris promosi
2. Pilih **"Edit"**
3. Ubah field yang diinginkan
4. Klik **"Simpan Perubahan"**

**Menghapus/Menonaktifkan promosi:**
1. Klik ikon menu pada baris promosi
2. Pilih **"Hapus"**
3. Konfirmasi — promosi akan dinonaktifkan

### Informasi di Daftar Promosi

| Kolom | Deskripsi |
|-------|-----------|
| Nama | Nama promosi |
| Tipe Diskon | Badge: Persentase, Nominal, atau BOGO |
| Nilai Diskon | 20% / Rp 25.000 / Buy 1 Get 1 |
| Berlaku | Rentang tanggal berlaku |
| Penggunaan | Berapa kali digunakan / batas (contoh: 45 / 100) |
| Status | Aktif (hijau), Kadaluarsa (oranye), Nonaktif (abu) |

---

## 2. Generate Voucher Codes

### Mengakses Halaman Voucher

Buka halaman **Generator Voucher** (`/app/promotions/vouchers`). Halaman ini terbagi menjadi dua bagian: form pembuatan di atas, dan daftar voucher yang sudah dibuat di bawah.

### Langkah-langkah Generate Voucher

1. Isi form **"Buat Voucher Baru"** di bagian atas halaman:

| Field | Deskripsi | Contoh |
|-------|-----------|--------|
| **Prefix Kode** | Awalan untuk kode voucher (otomatis uppercase, maks 10 karakter) | PROMO, WELCOME, RAMADAN |
| **Jumlah Voucher** | Berapa voucher yang akan dibuat (1-1.000) | 50 |
| **Tipe Diskon** | Persentase (%) atau Nominal (Rp) | Persentase |
| **Nilai Diskon** | Sesuai tipe: 0-100 untuk %, atau nominal Rp | 15 |
| **Berlaku Dari** | Tanggal mulai voucher bisa digunakan | 2026-03-01 |
| **Berlaku Sampai** | Tanggal terakhir voucher bisa digunakan | 2026-03-31 |
| **Batas Penggunaan per Voucher** | Berapa kali satu kode voucher bisa dipakai (min 1) | 1 |

2. Klik **"Buat Voucher"**
3. Sistem akan generate sejumlah kode unik dengan prefix yang ditentukan
4. Voucher langsung muncul di daftar di bawah form

### Format Kode Voucher

Kode voucher akan berbentuk: `[PREFIX]-[KODE UNIK]`

Contoh dengan prefix "PROMO":
- PROMO-A7K2M9
- PROMO-B3X8N1
- PROMO-C5Y4P6

Setiap kode dijamin unik dan tidak bisa dipalsukan.

### Export Voucher ke CSV

1. Klik tombol **"Ekspor CSV"** di pojok kanan atas halaman voucher
2. File CSV akan terdownload berisi semua kode voucher beserta detailnya
3. File ini bisa digunakan untuk:
   - Dikirim via email ke pelanggan
   - Diolah di spreadsheet untuk distribusi massal
   - Dicetak sebagai voucher fisik
   - Dikirim ke partner sebagai kode referral

### Monitoring Voucher

Daftar voucher menampilkan informasi lengkap per kode:

| Kolom | Deskripsi |
|-------|-----------|
| Kode Voucher | Kode unik dalam font monospace |
| Tipe Diskon | Badge: Persentase atau Nominal |
| Nilai Diskon | 15% atau Rp 25.000 |
| Masa Berlaku | Rentang tanggal berlaku |
| Penggunaan | Sudah dipakai / batas (contoh: 0 / 1) |
| Status | Aktif, Habis (sudah mencapai batas), Kadaluarsa, Nonaktif |
| Dibuat | Tanggal pembuatan |

Gunakan kolom pencarian **"Cari kode voucher..."** untuk menemukan voucher tertentu.

---

## 3. Setting Program Loyalty

### Mengakses Halaman Loyalty

Buka halaman **Program Loyalti** (`/app/promotions/loyalty`).

### Membuat Program Loyalty (Pertama Kali)

Jika belum ada program loyalty, Anda akan melihat tampilan kosong dengan tombol **"Buat Program"**.

1. Klik **"Buat Program"**
2. Isi konfigurasi program:

| Field | Deskripsi | Contoh |
|-------|-----------|--------|
| **Nama Program** | Nama program loyalty Anda | "Poin Rewards TiloPOS" |
| **Jumlah per Poin (Rp)** | Berapa Rupiah belanja untuk mendapat 1 poin | 10.000 (setiap Rp 10.000 = 1 poin) |
| **Nilai Tukar (Rp per poin)** | Berapa nilai 1 poin saat ditukarkan | 100 (1 poin = Rp 100) |
| **Masa Berlaku Poin (hari)** | Berapa hari poin bertahan. Kosongkan untuk tanpa batas | 365 |

3. Klik **"Buat Program"** untuk menyimpan dan mengaktifkan

### Memahami Konfigurasi

**Contoh perhitungan:**
- Jumlah per Poin: Rp 10.000
- Nilai Tukar: Rp 100/poin
- Pelanggan belanja Rp 150.000 → mendapat 15 poin
- 15 poin bernilai Rp 1.500 jika ditukarkan
- Efektif: cashback 1% untuk pelanggan

**Tips menentukan konfigurasi:**
- Cashback efektif 1-3% cukup menarik tanpa memberatkan margin
- Masa berlaku 365 hari memberikan urgensi tanpa terlalu ketat
- Pastikan nilai tukar masuk akal — pelanggan harus merasa "worth it" untuk mengumpulkan

### Dashboard Loyalty

Setelah program aktif, halaman loyalty menampilkan:

**Kartu ringkasan (4 metric cards):**
- Nama Program
- Jumlah per Poin (berapa belanja per 1 poin)
- Nilai Tukar (berapa nilai per 1 poin)
- Masa Berlaku Poin

**Tabel Tier Loyalti:**

| Kolom | Deskripsi |
|-------|-----------|
| Nama Tier | Bronze, Silver, Gold (atau custom) |
| Min Poin | Minimal poin kumulatif untuk mencapai tier ini |
| Multiplier | Pengali poin (misalnya 2x = poin dua kali lipat) |
| Benefits | Benefit tambahan per tier (misalnya diskon 5%) |

### Cara Kerja Poin di POS

1. Kasir assign pelanggan ke transaksi
2. Transaksi diproses dan dibayar
3. Poin otomatis dihitung dan ditambahkan ke akun pelanggan
4. Pelanggan bisa melihat saldo poin (jika ditampilkan di struk)
5. Saat redemption, kasir mengurangi poin untuk potongan harga

**Penting:** Poin hanya terhitung jika:
- Fitur Customer Loyalty **diaktifkan** untuk bisnis Anda
- Pelanggan **di-assign** ke transaksi sebelum pembayaran
- Program loyalty sudah **dibuat dan aktif**

---

## 4. Membuat Transaksi Kredit (BON)

### Apa Itu BON?

BON (penjualan kredit) adalah transaksi di mana pelanggan mengambil barang/jasa tapi membayar nanti — sebagian atau seluruhnya. Ini umum di toko bangunan, grosir, dan bisnis dengan pelanggan tetap.

### Membuat BON dari POS

1. Proses transaksi di POS seperti biasa (tambah item ke keranjang)
2. **Assign pelanggan** ke transaksi (wajib untuk BON)
3. Saat memilih metode pembayaran, pilih **"Kredit/BON"**
4. Sistem akan mencatat transaksi sebagai penjualan kredit
5. Set tanggal jatuh tempo (kapan diharapkan pembayaran)
6. Konfirmasi transaksi

Transaksi BON akan:
- Tercatat sebagai penjualan (mempengaruhi laporan penjualan)
- Tercatat sebagai piutang (muncul di halaman BON/Piutang)
- Terhubung ke profil pelanggan
- Memiliki status "Belum Lunas"

### Mengakses Halaman BON/Piutang

Buka halaman **BON / Piutang** (`/app/credit-sales`). Halaman ini menampilkan:

**Kartu ringkasan (3 cards):**
- **Total Piutang** — jumlah semua piutang belum lunas (warna kuning/amber)
- **Pelanggan Piutang** — berapa pelanggan dengan piutang aktif
- **Jatuh Tempo** — berapa transaksi yang sudah melewati jatuh tempo (warna merah)

**Dua tab:**
- **Daftar Piutang** — tabel semua transaksi kredit
- **Aging Report** — laporan umur piutang

---

## 5. Tracking Piutang dan Cicilan

### Daftar Piutang

Tab **"Daftar Piutang"** menampilkan tabel semua transaksi kredit:

| Kolom | Deskripsi |
|-------|-----------|
| No. Bon | Nomor referensi transaksi (font monospace) |
| Pelanggan | Nama dan nomor telepon pelanggan |
| Total | Nilai total transaksi BON |
| Dibayar | Jumlah yang sudah dibayar (warna hijau) |
| Sisa | Jumlah yang masih harus dibayar (warna kuning, bold) |
| Status | Belum Lunas / Sebagian / Lunas / Jatuh Tempo |
| Tanggal | Tanggal transaksi + tanggal jatuh tempo (jika ada) |
| Aksi | Tombol "Bayar" dan "Detail" |

### Filter dan Pencarian

- **Search:** Cari berdasarkan nama pelanggan atau nomor bon
- **Filter Status:** Semua Status, Belum Lunas, Sebagian, Lunas, Jatuh Tempo

### Mencatat Pembayaran (Cicilan atau Pelunasan)

1. Di daftar piutang, temukan BON yang akan dibayar
2. Klik tombol **"Bayar"** (ikon uang, warna hijau)
3. Di modal **Record Payment**, masukkan:
   - Jumlah pembayaran (bisa sebagian/cicilan atau penuh)
   - Metode pembayaran
   - Catatan (opsional)
4. Konfirmasi pembayaran
5. Status BON akan otomatis berubah:
   - Jika dibayar penuh → **Lunas**
   - Jika dibayar sebagian → **Sebagian** (sisa piutang berkurang)

### Melihat Detail BON

1. Klik tombol **"Detail"** (ikon mata) pada baris BON
2. Modal detail menampilkan:
   - Informasi transaksi lengkap
   - Riwayat pembayaran (semua cicilan yang sudah dilakukan)
   - Sisa piutang
   - Status terkini

### Aging Report

Tab **"Aging Report"** menampilkan analisis umur piutang — membantu Anda melihat piutang mana yang sudah terlalu lama dan perlu ditindaklanjuti.

Aging report biasanya membagi piutang berdasarkan kategori umur:
- 0-30 hari (masih wajar)
- 31-60 hari (mulai perlu perhatian)
- 61-90 hari (perlu follow-up aktif)
- >90 hari (bermasalah, perlu tindakan tegas)

Gunakan laporan ini untuk:
- Prioritaskan penagihan berdasarkan umur piutang
- Identifikasi pelanggan yang sering terlambat bayar
- Buat kebijakan limit kredit berdasarkan data historis

---

## 6. Tips Promosi Efektif untuk UMKM

### Strategi Promosi Berdasarkan Tujuan

#### Tujuan: Menarik Pelanggan Baru
- Buat **voucher** dengan prefix "WELCOME" atau "NEW"
- Diskon 10-20% untuk kunjungan pertama
- Distribusi via media sosial, flyer, atau partner
- Set batas penggunaan 1x per voucher, masa berlaku 30 hari

#### Tujuan: Meningkatkan Rata-rata Transaksi
- Buat **promosi persentase** dengan minimum pembelian
- Contoh: "Diskon 10% untuk belanja di atas Rp 200.000"
- Pelanggan terdorong untuk menambah item agar mencapai threshold

#### Tujuan: Menghabiskan Stok Tertentu
- Buat **promosi BOGO** untuk produk yang stoknya tinggi
- Atau **promosi nominal**: "Beli produk X, potongan Rp 15.000"
- Set periode pendek (1-2 minggu) untuk urgensi

#### Tujuan: Retensi Pelanggan
- Aktifkan **loyalty program** dengan poin dan tier
- Buat **voucher khusus** untuk pelanggan yang sudah lama tidak datang
- Gunakan segmen pelanggan "Berisiko" sebagai target audience

#### Tujuan: Membangun Komunitas Pelanggan Tetap
- **Tier system** loyalty memberikan eksklusivitas
- Pelanggan Gold mendapat perlakuan khusus — diskon ekstra, early access
- Kombinasikan dengan **BON** untuk pelanggan terpercaya

### Timing Promosi yang Tepat

| Waktu | Jenis Promosi yang Efektif |
|-------|----------------------------|
| Awal bulan | Promosi besar (gajian, daya beli tinggi) |
| Pertengahan bulan | Voucher kecil untuk mempertahankan traffic |
| Akhir bulan | BOGO atau diskon stok lama |
| Weekend | Promosi F&B (family package, bundle) |
| Hari besar (Lebaran, Natal) | Voucher spesial, loyalty double points |
| Musim sepi | Promosi agresif untuk tarik traffic |

### Menghindari Kesalahan Umum

1. **Jangan terlalu sering diskon** — pelanggan akan terbiasa dan hanya belanja saat ada diskon
2. **Selalu set batas** — minimum pembelian, maksimum diskon, atau batas penggunaan
3. **Monitor ROI** — jika promosi tidak menambah revenue netto, evaluasi dan ubah
4. **Jangan diskon produk margin rendah** — fokus diskon pada produk dengan margin tinggi
5. **Komunikasikan dengan jelas** — pelanggan harus tahu syarat dan ketentuan
6. **Set periode yang jelas** — promosi tanpa batas waktu tidak menciptakan urgensi

### Tips Khusus untuk BON/Kredit

1. **Buat kebijakan tertulis** — siapa yang bisa dapat BON, limit berapa, jatuh tempo berapa hari
2. **Mulai dari limit kecil** — tingkatkan limit seiring kepercayaan terbukti
3. **Review aging report mingguan** — jangan biarkan piutang menumpuk
4. **Komunikasi proaktif** — ingatkan pelanggan sebelum jatuh tempo, bukan setelah
5. **Dokumentasi** — semua BON harus tercatat di sistem, bukan di luar
6. **Evaluasi berkala** — review pelanggan mana yang selalu tepat bayar dan mana yang bermasalah

---

## 7. FAQ

### Promosi

**T: Bisakah menjalankan beberapa promosi bersamaan?**
J: Ya. Beberapa promosi bisa aktif secara bersamaan. Namun, aturan penerapan (apakah bisa distack atau hanya satu yang berlaku) tergantung konfigurasi di pengaturan bisnis.

**T: Apakah promosi otomatis berhenti saat melewati tanggal berakhir?**
J: Ya. Status promosi otomatis berubah menjadi "Kadaluarsa" setelah melewati tanggal berakhir. Tidak perlu dimatikan manual.

**T: Apakah promosi bisa diterapkan ke produk tertentu saja?**
J: Saat ini, promosi berlaku untuk seluruh transaksi (bukan per produk). Fitur promosi per produk/kategori adalah pengembangan yang direncanakan.

**T: Siapa yang bisa membuat promosi?**
J: Owner dan Manager bisa membuat, mengedit, dan menghapus promosi. Cashier hanya bisa menerapkan promosi yang sudah aktif saat transaksi.

**T: Bagaimana kasir menerapkan promosi saat transaksi?**
J: Promosi yang aktif dan memenuhi syarat (misalnya minimum pembelian tercapai) akan otomatis tersedia di layar POS. Kasir tinggal memilih promosi yang ingin diterapkan.

### Voucher

**T: Apakah voucher bisa digunakan bersamaan dengan promosi?**
J: Tergantung kebijakan bisnis. Secara default, voucher dan promosi bisa diterapkan terpisah. Aturan kombinasi bisa dikonfigurasi.

**T: Bagaimana cara kasir meng-redeem voucher?**
J: Saat proses pembayaran di POS, kasir menginput kode voucher. Sistem akan memverifikasi validitas kode (aktif, belum habis, belum kadaluarsa) dan menerapkan diskon otomatis.

**T: Apakah voucher yang sudah digunakan bisa dipakai lagi?**
J: Tergantung "Batas Penggunaan per Voucher" yang dikonfigurasi saat generate. Jika batas = 1, voucher hanya sekali pakai. Jika batas = 5, voucher bisa dipakai 5 kali.

**T: Bisakah voucher yang sudah dibuat diedit?**
J: Voucher yang sudah di-generate tidak bisa diedit secara individual. Jika perlu perubahan, buat batch baru dengan konfigurasi yang diinginkan.

**T: Berapa maksimal voucher yang bisa dibuat per batch?**
J: Maksimal 1.000 voucher per batch. Untuk kebutuhan yang lebih besar, buat beberapa batch.

### Loyalty

**T: Apakah poin bisa ditransfer antar pelanggan?**
J: Saat ini tidak. Poin bersifat personal dan terikat ke akun pelanggan masing-masing.

**T: Bagaimana jika transaksi di-refund? Apakah poin dikurangi?**
J: Poin yang sudah diberikan untuk transaksi yang di-refund akan disesuaikan (dikurangi) dari saldo pelanggan.

**T: Apakah pelanggan bisa melihat saldo poin mereka?**
J: Kasir bisa melihat saldo poin saat assign pelanggan ke transaksi. Saldo poin juga bisa ditampilkan di struk. Self-service poin check oleh pelanggan adalah fitur yang direncanakan.

**T: Apakah tier bisa turun jika poin berkurang?**
J: Kebijakan tier bergantung pada konfigurasi. Umumnya, tier berdasarkan poin kumulatif yang pernah dicapai (bukan saldo saat ini), sehingga tier tidak turun saat poin ditukarkan.

**T: Bisakah mengubah konfigurasi loyalty setelah program berjalan?**
J: Ya, konfigurasi bisa diubah. Perubahan akan berlaku untuk transaksi selanjutnya. Poin yang sudah diberikan sebelumnya tidak terpengaruh.

### BON / Credit Sales

**T: Apakah bisa membuat BON tanpa assign pelanggan?**
J: Tidak. BON wajib terhubung ke pelanggan yang terdaftar. Ini untuk memastikan piutang bisa dilacak dan ditagih.

**T: Apakah ada limit kredit per pelanggan?**
J: Saat ini, limit kredit belum diterapkan secara otomatis di sistem. Kebijakan limit kredit ditangani secara manual oleh owner/manager. Fitur auto-limit adalah pengembangan yang direncanakan.

**T: Bagaimana jika pelanggan membayar cicilan dengan metode berbeda?**
J: Setiap cicilan bisa dibayar dengan metode pembayaran yang berbeda. Sistem mencatat metode pembayaran untuk setiap cicilan secara terpisah.

**T: Apakah BON bisa dibatalkan?**
J: BON yang sudah dicatat tidak bisa dibatalkan langsung. Jika ada kesalahan, hubungi Manager/Owner untuk penanganan kasus per kasus.

**T: Bagaimana cara melihat total piutang per pelanggan?**
J: Di halaman BON/Piutang, Anda bisa mencari nama pelanggan untuk melihat semua BON mereka. Aging report juga menampilkan total outstanding per pelanggan.

**T: Apakah ada notifikasi saat piutang jatuh tempo?**
J: Saat ini, monitoring jatuh tempo dilakukan melalui dashboard dan filter status "Jatuh Tempo" di daftar piutang. Notifikasi otomatis adalah fitur yang direncanakan.

### Teknis

**T: Apakah data promosi dan voucher tersinkronisasi antar outlet?**
J: Ya. Promosi dan voucher bersifat per-bisnis, sehingga berlaku di semua outlet. BON bersifat per-outlet (tercatat di outlet tempat transaksi terjadi).

**T: Siapa yang bisa mengakses halaman BON/Piutang?**
J: Owner, Manager, dan Supervisor bisa mengakses dan mengelola piutang. Cashier bisa membuat BON saat transaksi tapi tidak bisa mengakses halaman rekap piutang.

**T: Apakah ada laporan promosi?**
J: Data penggunaan promosi tersedia di halaman promosi (kolom "Penggunaan"). Laporan detail efektivitas promosi per periode tersedia di modul Laporan.

---

*Butuh bantuan lebih lanjut? Hubungi tim support TiloPOS melalui menu Bantuan di aplikasi.*
