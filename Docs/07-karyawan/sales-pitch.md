# Tim Terkelola, Operasional Lancar

**Tagline:** *Kelola karyawan, atur akses, pantau performa — semua dari satu dashboard.*

---

## Mengapa Manajemen Karyawan Penting untuk UMKM?

Bisnis UMKM seringkali dimulai dari satu orang yang mengerjakan segalanya. Tapi begitu bisnis berkembang — ada kasir, ada staf dapur, ada yang urus gudang — masalah mulai muncul. Siapa yang buka kasir hari ini? Berapa kas yang seharusnya ada di mesin kasir? Kenapa stok berkurang tapi tidak ada transaksi? Apakah semua karyawan seharusnya bisa lihat laporan keuangan?

Tanpa sistem yang jelas, pengelolaan karyawan menjadi sumber masalah:
- **Kehilangan kas** karena tidak ada pencatatan shift yang rapi
- **Data sensitif bocor** karena semua orang punya akses yang sama
- **Tidak bisa melacak siapa yang melakukan apa** saat ada masalah
- **Operasional kacau** saat karyawan berganti tanpa prosedur yang jelas

TiloPOS menghadirkan modul Karyawan yang dirancang untuk memberikan kendali penuh kepada pemilik bisnis atas tim mereka — tanpa ribet, tanpa software HR terpisah, dan tanpa biaya tambahan.

---

## Value Proposition: Kontrol Penuh, Operasional Aman

### 1. Multi-Role Access Control (RBAC) dengan 7 Level

TiloPOS menyediakan 7 role dengan hierarki akses yang jelas:

```
Super Admin > Owner > Manager > Supervisor > Cashier / Kitchen Staff / Inventory Staff
```

Setiap role memiliki batas akses yang berbeda:

| Role | Akses |
|------|-------|
| Super Admin | Seluruh sistem, semua bisnis |
| Owner | Seluruh fitur bisnis sendiri |
| Manager | Karyawan, inventori, laporan, POS |
| Supervisor | Operasional: POS, inventori, laporan |
| Cashier | POS, transaksi, pesanan, meja, shift |
| Kitchen Staff | Kitchen Display System (KDS) dan pesanan saja |
| Inventory Staff | Produk, bahan baku, semua fitur inventori |

**Manfaat nyata:**
- Kasir tidak bisa mengakses laporan keuangan atau mengubah harga produk
- Staf dapur hanya melihat pesanan yang masuk — tidak perlu dan tidak bisa akses fitur lain
- Owner bisa mendelegasikan tugas ke Manager tanpa khawatir data sensitif diakses sembarangan
- Setiap karyawan hanya melihat menu dan fitur yang relevan dengan pekerjaannya

### 2. Sistem PIN 6 Digit untuk Keamanan

Setiap karyawan memiliki PIN unik 6 digit yang digunakan untuk autentikasi. PIN ini terpisah dari password akun dan digunakan untuk operasi-operasi sensitif.

**Manfaat nyata:**
- Akses yang aman tanpa perlu username/password yang rumit
- Kasir bisa berganti shift dengan cepat — cukup input PIN
- Setiap aksi tercatat ke karyawan yang benar berdasarkan PIN yang digunakan
- PIN bisa diubah kapan saja oleh manager/owner jika diperlukan

### 3. Manajemen Shift dengan Akuntabilitas Kas

Fitur shift management memungkinkan pencatatan yang rapi untuk setiap pergantian kasir:

- **Buka shift:** Kasir menghitung dan mencatat kas awal (opening cash)
- **Selama shift:** Semua transaksi tercatat dan terhubung ke shift aktif
- **Tutup shift:** Kasir menghitung kas akhir (closing cash), sistem membandingkan dengan ekspektasi
- **Laporan shift:** Ringkasan penjualan, metode pembayaran, selisih kas

**Manfaat nyata:**
- Selisih kas langsung terdeteksi — tidak perlu rekap manual di akhir hari
- Setiap transaksi bisa dilacak ke shift dan kasir yang bertugas
- Owner bisa melihat performa per kasir dan per shift
- Mengurangi risiko kehilangan kas karena ada akuntabilitas yang jelas

### 4. Assign Karyawan per Outlet

Untuk bisnis multi-outlet, setiap karyawan di-assign ke outlet tertentu. Ini memastikan bahwa:
- Karyawan hanya bisa mengoperasikan POS di outlet yang ditugaskan
- Data transaksi tersegmentasi per outlet
- Laporan bisa difilter berdasarkan outlet dan karyawan

**Manfaat nyata:**
- Kontrol operasional per outlet tanpa campur tangan data
- Mudah melacak performa per outlet
- Transfer karyawan antar outlet bisa dilakukan dengan mengubah assignment

### 5. Tracking Tarif per Jam

TiloPOS menyediakan field tarif per jam (hourly rate) untuk setiap karyawan. Ini berguna untuk:
- Menghitung estimasi biaya operasional per shift
- Dasar untuk perhitungan gaji karyawan paruh waktu
- Analisis efisiensi biaya tenaga kerja

**Manfaat nyata:**
- Data tarif tersimpan di satu tempat, tidak perlu spreadsheet terpisah
- Mudah membandingkan biaya tenaga kerja antar outlet
- Dasar untuk keputusan hiring dan penjadwalan

---

## Keamanan dan Akuntabilitas

### Masalah Umum UMKM Tanpa Sistem

| Masalah | Frekuensi | Dampak Finansial |
|---------|-----------|------------------|
| Selisih kas (shrinkage) | Harian | Rp 50.000 - 500.000/hari |
| Karyawan mengakses data sensitif | Sering | Risiko kebocoran strategi harga |
| Tidak tahu siapa yang bertanggung jawab | Saat ada masalah | Tidak bisa mengambil tindakan korektif |
| Kas awal shift tidak tercatat | Setiap pergantian | Selisih menumpuk tanpa jejak |
| Karyawan baru langsung akses semua | Saat onboarding | Risiko keamanan tinggi |

### Solusi TiloPOS

| Masalah | Solusi | Fitur |
|---------|--------|-------|
| Selisih kas | Pencatatan opening/closing cash + laporan otomatis | Shift Management |
| Akses data sensitif | Role-based access control — setiap level punya batas | RBAC 7 Level |
| Tidak ada akuntabilitas | Setiap transaksi terhubung ke karyawan via shift | Activity Logging |
| Kas shift tidak tercatat | Wajib input kas awal saat buka shift | Opening Cash Count |
| Karyawan baru akses semua | Assign role yang sesuai, akses terbatas otomatis | Role Assignment |

---

## Studi Kasus: Dampak Nyata

### Restoran "Dapur Nusantara" — 3 Outlet, 25 Karyawan

Sebelum TiloPOS: Semua kasir menggunakan satu akun bersama. Saat ada selisih kas Rp 300.000, owner tidak tahu siapa yang bertanggung jawab. Staf dapur kadang "iseng" lihat laporan keuangan lewat komputer kasir.

Setelah implementasi modul Karyawan TiloPOS:
- **Setiap kasir punya akun sendiri** dengan PIN unik
- **Staf dapur** hanya bisa akses KDS — tidak bisa masuk ke POS atau backoffice
- **Shift management** diterapkan — setiap pergantian kasir ada pencatatan kas
- **Activity log** mencatat setiap aksi yang dilakukan

**Hasil setelah 2 bulan:**
- Selisih kas turun dari rata-rata Rp 250.000/hari menjadi Rp 15.000/hari
- Waktu closing shift berkurang dari 30 menit menjadi 5 menit
- 3 kasus kecurangan terdeteksi dan ditindaklanjuti berkat activity log
- Moral karyawan naik karena yang jujur tidak lagi dirugikan oleh kesalahan orang lain

### Toko Fashion "Chic Boutique" — 2 Outlet, 10 Karyawan

Sebelumnya: Owner membuat 2 akun saja (1 per outlet), dan semua karyawan pakai akun yang sama. Akibatnya, staf inventory bisa mengubah harga produk, dan kasir bisa menghapus transaksi.

Setelah implementasi:
- **Role assignment:** Kasir = role Cashier, staf gudang = role Inventory
- **Kasir** tidak bisa mengubah harga produk atau menghapus transaksi
- **Staf inventory** fokus pada pengelolaan stok tanpa akses ke penjualan
- **Owner** memantau semua outlet dari satu dashboard

**Hasil:**
- Zero kasus perubahan harga tidak sah sejak implementasi
- Stok lebih akurat karena hanya staf inventory yang mengelola
- Owner bisa fokus pada strategi bisnis, bukan mengawasi operasional sehari-hari

---

## ROI: Mengapa Ini Investasi yang Menguntungkan

### Pengurangan Kehilangan Kas (Shrinkage)

| Metrik | Sebelum TiloPOS | Sesudah TiloPOS |
|--------|-----------------|-----------------|
| Selisih kas harian (per outlet) | Rp 100.000 - 500.000 | < Rp 20.000 |
| Selisih kas bulanan (per outlet) | Rp 3 juta - 15 juta | < Rp 600.000 |
| Penghematan tahunan (per outlet) | - | Rp 30 juta - 170 juta |

Untuk bisnis dengan 3 outlet, potensi penghematan bisa mencapai **Rp 90 juta - 510 juta per tahun** — hanya dari pengurangan selisih kas.

### Efisiensi Waktu

| Aktivitas | Manual | Dengan TiloPOS |
|-----------|--------|-----------------|
| Proses pergantian shift | 15-30 menit | 3-5 menit |
| Rekap kas harian per outlet | 1-2 jam | Otomatis (real-time) |
| Onboarding karyawan baru | 1-2 hari (training akses) | 15 menit (buat akun + assign role) |
| Investigasi selisih kas | Berjam-jam (cek CCTV, tanya satu-satu) | Langsung cek shift report |

### Keamanan Data

- **Tanpa RBAC:** 100% karyawan bisa akses 100% data
- **Dengan RBAC TiloPOS:** Setiap karyawan hanya akses fitur sesuai tugasnya
- **Dampak:** Risiko kebocoran data sensitif (harga pokok, margin, laporan keuangan) berkurang drastis

---

## Keunggulan TiloPOS vs Solusi Lain

| Aspek | TiloPOS | Software HR Terpisah | Catatan Manual |
|-------|---------|---------------------|----------------|
| Terintegrasi dengan POS | Ya (native) | Tidak (perlu sync manual) | Tidak |
| Shift management | Ya | Terbatas | Buku catatan |
| Role-based access | 7 level | Tidak relevan (bukan POS) | Tidak ada |
| Biaya tambahan | Rp 0 (termasuk paket) | Rp 200rb - 1jt/bulan | Rp 0 (tapi risiko tinggi) |
| Akuntabilitas kas | Otomatis | Tidak ada | Manual, error-prone |
| Multi-outlet | Ya | Ya | Sulit |

---

## Kesimpulan

Modul Karyawan TiloPOS memberikan tiga hal fundamental yang dibutuhkan setiap bisnis yang berkembang: **kontrol akses yang granular**, **akuntabilitas operasional yang terukur**, dan **efisiensi manajemen tim**. Ini bukan fitur tambahan — ini adalah fondasi yang memungkinkan bisnis Anda scale up tanpa kehilangan kendali.

Saat bisnis Anda memiliki lebih dari 3 karyawan, manajemen "percaya saja" tidak lagi cukup. Anda butuh sistem. Dan TiloPOS menyediakan sistem itu — sudah terintegrasi, sudah siap pakai, tanpa biaya ekstra.

**Tim terkelola, kas aman, bisnis tenang.**

---

*TiloPOS — Jualan Lancar, Cuan Melimpah.*
