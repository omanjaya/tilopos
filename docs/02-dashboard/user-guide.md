# Panduan Pengguna: Dashboard TiloPOS

## Daftar Isi

1. [Overview Tampilan Dashboard](#1-overview-tampilan-dashboard)
2. [Penjelasan Setiap Widget](#2-penjelasan-setiap-widget)
3. [Cara Membaca Grafik Penjualan](#3-cara-membaca-grafik-penjualan)
4. [Filter Periode](#4-filter-periode-hari-minggu-bulan)
5. [Quick Actions dan Fungsinya](#5-quick-actions-dan-fungsinya)
6. [Getting Started Checklist](#6-getting-started-checklist)
7. [Owner Dashboard](#7-owner-dashboard)
8. [Tips Optimasi Penggunaan Dashboard](#8-tips-optimasi-penggunaan-dashboard)
9. [FAQ (Pertanyaan yang Sering Diajukan)](#9-faq)

---

## 1. Overview Tampilan Dashboard

Dashboard TiloPOS adalah halaman pertama yang Anda lihat setelah login ke backoffice (`/app`). Dashboard dirancang untuk memberikan gambaran lengkap performa bisnis Anda dalam satu layar tanpa harus berpindah-pindah halaman.

### Struktur Halaman

Dashboard memiliki dua tab utama yang bisa diakses melalui tab bar di bagian atas:

1. **Tab Dashboard** --- Menampilkan ringkasan penjualan, grafik analisis, dan detail item
2. **Tab Outlet Comparison** --- Perbandingan performa antar outlet/cabang

Di sebelah kanan tab bar terdapat **Date Picker** untuk memilih rentang tanggal data yang ingin ditampilkan.

Tepat di atas tab bar, terdapat **Getting Started Checklist** yang hanya muncul untuk pengguna baru dan akan hilang setelah semua langkah onboarding diselesaikan atau dilewati.

### Hak Akses

Dashboard dapat diakses oleh role berikut: Owner, Super Admin, Manager, dan Supervisor. Role Cashier, Kitchen Staff, dan Inventory Staff tidak memiliki akses ke halaman dashboard --- mereka langsung diarahkan ke halaman yang relevan dengan tugas mereka.

### Tampilan Mobile

Dashboard memiliki tampilan terpisah yang dioptimalkan untuk layar ponsel. Pada versi mobile:

- Header sticky di bagian atas dengan judul "Dashboard" dan deskripsi "Ringkasan performa bisnis"
- Date selector dalam bentuk tombol preset: Hari Ini, Minggu Ini, Bulan Ini
- Tab bar grid 2 kolom: Dashboard dan Outlet
- KPI ditampilkan dalam grid 2 kolom yang kompak
- Grafik dan daftar item disajikan dalam section yang bisa dikembangkan/dilipat (collapsible)
- Navigasi bawah (bottom nav) untuk akses cepat ke fitur lain

---

## 2. Penjelasan Setiap Widget

### 2.1 Sales Summary Grid (KPI Utama)

Grid berisi 6 kartu KPI yang ditampilkan dalam layout 3 kolom (desktop) atau 2 kolom (tablet/mobile):

**Penjualan Kotor (Gross Sales)**
- Ikon: DollarSign (hijau emerald)
- Arti: Total nilai semua penjualan sebelum diskon, pajak, atau potongan apa pun
- Format: Mata uang Rupiah
- Kapan diperhatikan: Untuk mengukur volume bisnis total

**Penjualan Bersih (Net Sales)**
- Ikon: Receipt (biru)
- Arti: Nilai penjualan setelah dikurangi diskon, retur, dan void
- Format: Mata uang Rupiah
- Kapan diperhatikan: Angka sebenarnya yang menjadi pendapatan bisnis

**Laba Kotor (Gross Profit)**
- Ikon: TrendingUp (violet)
- Arti: Selisih antara penjualan bersih dan harga pokok penjualan (HPP/COGS)
- Format: Mata uang Rupiah
- Kapan diperhatikan: Indikator utama apakah bisnis menghasilkan uang

**Transaksi**
- Ikon: ShoppingCart (amber)
- Arti: Jumlah total transaksi yang berhasil diselesaikan
- Format: Angka bulat
- Kapan diperhatikan: Mengukur jumlah pelanggan yang melakukan pembelian

**Rata-rata per Transaksi (Average Sale per Transaction)**
- Ikon: Calculator (cyan)
- Arti: Nilai rata-rata setiap transaksi (gross sales dibagi jumlah transaksi)
- Format: Mata uang Rupiah
- Kapan diperhatikan: Indikator keberhasilan upselling dan cross-selling

**Margin Kotor (Gross Margin)**
- Ikon: Percent (rose)
- Arti: Persentase laba kotor terhadap penjualan kotor
- Format: Persentase (satu desimal)
- Kapan diperhatikan: Mengukur efisiensi bisnis secara keseluruhan; makin tinggi makin baik

### 2.2 Grafik Penjualan per Hari (Day of Week Chart)

Widget ini menampilkan bar chart horizontal yang menunjukkan total penjualan kotor (gross sales) untuk setiap hari dalam seminggu (Senin-Minggu) pada rentang tanggal yang dipilih.

- Sumbu X: Nama hari (disingkat 3 huruf, misalnya Sen, Sel, Rab)
- Sumbu Y: Nilai penjualan dalam format singkat (K untuk ribuan, M untuk jutaan)
- Tooltip: Menampilkan nilai penjualan lengkap saat hover/tap pada bar

### 2.3 Grafik Penjualan per Jam (Hourly Chart)

Bar chart yang menampilkan distribusi penjualan berdasarkan jam operasional (00:00 - 23:00).

- Sumbu X: Jam (format 24 jam, ditampilkan setiap 2-3 jam)
- Sumbu Y: Nilai penjualan dalam format singkat
- Tooltip: Menampilkan jam lengkap (format HH:00) dan nilai penjualan saat hover/tap

### 2.4 Ringkasan Item (Item Summary Section)

Widget yang menampilkan analisis produk dengan 4 sub-tab:

**Top Items**
- Daftar produk terlaris (maksimal 15 item)
- Kolom: Ranking, Nama Produk, Kategori, Qty Terjual, Penjualan (Rp)
- Diurutkan berdasarkan penjualan tertinggi

**Kategori (Volume)**
- Daftar kategori produk diurutkan berdasarkan jumlah unit terjual
- Menampilkan nama kategori, jumlah unit, dan persentase kontribusi
- Bar persentase visual untuk perbandingan cepat

**Kategori (Sales)**
- Sama seperti Kategori Volume, tapi diurutkan berdasarkan nilai penjualan (Rupiah)
- Berguna untuk melihat kategori mana yang paling menghasilkan revenue

**Per Kategori**
- Breakdown item terlaris di dalam setiap kategori (maksimal 8 kategori)
- Menampilkan nama item, jumlah terjual (pcs), dan nilai penjualan
- Berguna untuk analisis mendalam per kategori

### 2.5 Perbandingan Outlet (Outlet Comparison Section)

Tersedia saat Anda memilih tab "Outlet Comparison". Terdiri dari tiga bagian:

**Table Summary**
- Tabel dengan kolom per outlet
- Baris metrik: Gross Sales, Net Sales, Gross Profit, Transaction, Avg Sale/Transaction, Gross Margin
- Termasuk daftar Top 3 Items per outlet

**Graph Comparison**
- Horizontal grouped bar chart
- Setiap metrik ditampilkan sebagai baris dengan bar per outlet
- Warna berbeda untuk setiap outlet agar mudah dibedakan

**Gross Sales Amount**
- Vertical bar chart
- Setiap outlet sebagai satu bar
- Warna unik per outlet untuk konsistensi visual

### 2.6 Getting Started Checklist

Kartu onboarding yang muncul di bagian paling atas dashboard untuk pengguna baru. Berisi daftar langkah yang perlu diselesaikan beserta progress bar. Detail lengkap ada di [bagian 6](#6-getting-started-checklist).

---

## 3. Cara Membaca Grafik Penjualan

### 3.1 Grafik Penjualan per Hari

**Cara membaca:**

1. Perhatikan bar tertinggi --- ini adalah hari dengan penjualan terbanyak dalam periode yang dipilih
2. Perhatikan bar terendah --- ini adalah hari yang perlu mendapat perhatian (mungkin perlu promo khusus)
3. Bandingkan pola mingguan: apakah akhir pekan selalu lebih ramai? Apakah Senin selalu sepi?

**Contoh interpretasi:**
- Jika Sabtu dan Minggu selalu dominan: Bisnis Anda bergantung pada weekend traffic. Pertimbangkan untuk membuat program loyalty khusus weekday.
- Jika ada satu hari yang anjlok tajam: Investigasi penyebabnya (mungkin libur, gangguan operasional, atau memang pola alami).
- Jika semua hari relatif rata: Traffic bisnis Anda stabil, yang merupakan tanda positif untuk bisnis di area perkantoran.

**Tips:** Format angka di sumbu Y menggunakan singkatan:
- **K** = Ribuan (contoh: 500K = Rp 500.000)
- **M** = Jutaan (contoh: 2.5M = Rp 2.500.000)

Hover atau tap pada bar individual untuk melihat angka penjualan yang lengkap.

### 3.2 Grafik Penjualan per Jam

**Cara membaca:**

1. Identifikasi **peak hours** (jam puncak) --- bar tertinggi menunjukkan jam tersibuk
2. Identifikasi **valley hours** (jam sepi) --- bar terendah atau kosong menunjukkan jam paling sedikit transaksi
3. Perhatikan pola: apakah ada dua puncak (lunch dan dinner untuk restoran)? Atau satu puncak saja?

**Contoh interpretasi:**
- Dua puncak di jam 12:00 dan 19:00: Tipikal restoran dengan traffic makan siang dan makan malam. Pastikan staf penuh di jam-jam ini.
- Puncak tunggal di jam 10:00-14:00: Tipikal kafe atau toko retail di area perkantoran.
- Penjualan tinggi di jam 20:00-22:00: Mungkin bisnis nongkrong atau late-night dining. Pertimbangkan perpanjangan jam operasional.

**Catatan:** Sumbu X menampilkan jam setiap 2-3 interval untuk keterbacaan. Semua jam tetap ada di data dan bisa dilihat via tooltip.

### 3.3 Grafik Perbandingan Outlet

**Cara membaca Graph Comparison:**

1. Setiap baris horizontal mewakili satu metrik (Gross Sales, Net Sales, dll.)
2. Bar dengan warna berbeda mewakili outlet yang berbeda
3. Panjang bar menunjukkan nilai relatif --- semakin panjang semakin besar
4. Gunakan legend di bawah grafik untuk mengidentifikasi warna setiap outlet

**Cara membaca Gross Sales Amount Chart:**

1. Setiap bar vertikal mewakili satu outlet
2. Tinggi bar menunjukkan total gross sales
3. Warna konsisten dengan grafik comparison di atasnya
4. Bandingkan tinggi bar untuk melihat outlet mana yang memimpin

---

## 4. Filter Periode (Hari, Minggu, Bulan)

### Desktop

Di desktop, filter periode menggunakan **Date Picker** yang terletak di sebelah kanan tab bar. Date Picker ini memungkinkan Anda memilih rentang tanggal kustom (from-to) untuk data yang ingin ditampilkan.

Default-nya adalah dari awal bulan berjalan (`startOfMonth`) hingga hari ini.

### Mobile

Di mobile, filter periode menggunakan tiga tombol preset yang lebih mudah disentuh:

- **Hari Ini** --- Menampilkan data dari jam 00:00 hari ini hingga saat ini
- **Minggu Ini** --- Menampilkan data dari Senin minggu ini hingga saat ini
- **Bulan Ini** --- Menampilkan data dari tanggal 1 bulan ini hingga saat ini

Di atas tombol preset, ditampilkan label rentang tanggal yang aktif dalam format "d MMM - d MMM" (contoh: "1 Feb - 20 Feb").

### Bagaimana Filter Mempengaruhi Data

Semua widget di dashboard terpengaruh oleh filter periode yang dipilih:

- **KPI Grid**: Menampilkan total akumulasi dalam periode tersebut
- **Grafik per Hari**: Menampilkan agregasi penjualan per hari dalam periode tersebut
- **Grafik per Jam**: Menampilkan agregasi penjualan per jam dalam periode tersebut
- **Top Items**: Menampilkan produk terlaris dalam periode tersebut
- **Outlet Comparison**: Menampilkan perbandingan dalam periode tersebut

**Tips memilih periode:**
- Gunakan "Hari Ini" untuk monitoring operasional harian
- Gunakan "Minggu Ini" untuk evaluasi performa mingguan
- Gunakan "Bulan Ini" untuk review bulanan dan perencanaan

---

## 5. Quick Actions dan Fungsinya

Quick Actions adalah shortcut berupa grid tombol di dashboard yang memungkinkan Anda mengakses fitur utama TiloPOS tanpa harus navigasi melalui sidebar. Tombol yang ditampilkan bersifat kontekstual sesuai jenis bisnis Anda:

### Untuk Semua Jenis Bisnis

| Tombol | Ikon | Tujuan | Fungsi |
|--------|------|--------|--------|
| **Buka POS** | Monitor (hijau emerald) | `/pos` | Membuka layar kasir Point of Sale |
| **Produk** | Package (biru) | `/app/products` | Mengelola daftar produk |
| **Pengaturan** | Settings (abu-abu) | `/app/settings` | Mengakses pengaturan sistem |

### Khusus F&B (Food & Beverage)

| Tombol | Ikon | Tujuan | Fungsi |
|--------|------|--------|--------|
| **Meja** | LayoutGrid (oranye) | `/app/tables` | Manajemen meja dan denah restoran |

### Khusus Bisnis Jasa

| Tombol | Ikon | Tujuan | Fungsi |
|--------|------|--------|--------|
| **Jadwal** | CalendarClock (violet) | `/app/appointments` | Manajemen jadwal dan booking |

### Khusus Retail

| Tombol | Ikon | Tujuan | Fungsi |
|--------|------|--------|--------|
| **Laporan** | BarChart3 (amber) | `/app/reports` | Akses ke laporan detail |

Quick Actions ditampilkan dalam grid 2 kolom dengan ikon yang besar dan jelas, sehingga mudah diakses bahkan saat Anda sedang sibuk.

---

## 6. Getting Started Checklist

Getting Started Checklist adalah panduan onboarding interaktif yang muncul otomatis di dashboard untuk pengguna baru. Tujuannya memastikan Anda menyelesaikan semua langkah penting sebelum mulai menggunakan TiloPOS secara penuh.

### Daftar Langkah

| # | Langkah | Keterangan | Tombol CTA | Tujuan |
|---|---------|------------|------------|--------|
| 1 | **Buat akun** | Otomatis selesai saat Anda mendaftar | Selesai (disabled) | - |
| 2 | **Tambah produk** | Minimal 5 produk. Badge menunjukkan progress (mis. "2/5") | Tambah Produk | `/app/products/new` |
| 3 | **Atur metode pembayaran** | Konfigurasi metode pembayaran yang diterima (tunai, QRIS, dll.) | Atur Pembayaran | `/app/settings?tab=payments` |
| 4 | **Tambah karyawan** | Daftarkan minimal 1 karyawan untuk mulai operasional | Tambah Karyawan | `/app/employees/new` |
| 5 | **Transaksi pertama** | Lakukan setidaknya 1 transaksi di POS | Buka POS | `/pos` |
| 6 | **Atur printer** | Konfigurasi printer struk (opsional, ditandai dengan label "Opsional") | Atur Printer | `/app/settings?tab=devices` |

### Elemen Visual

- **Progress bar**: Menampilkan persentase penyelesaian (0-100%) di bagian atas checklist
- **Status ikon**: Lingkaran kosong untuk langkah belum selesai, centang hijau untuk yang sudah selesai
- **Warna**: Langkah selesai memiliki background hijau muda
- **Badge "Opsional"**: Muncul pada langkah yang tidak wajib (saat ini hanya "Atur printer")

### Perilaku

- Checklist muncul otomatis saat pertama kali masuk dashboard
- Setiap langkah yang selesai otomatis tercentang berdasarkan data dari server
- Saat semua langkah wajib selesai, animasi **celebration** muncul dengan pesan "Selamat! Anda telah menyelesaikan semua langkah onboarding. TiloPOS siap digunakan."
- Celebration hanya muncul sekali per sesi browser
- Tombol **"Lewati untuk sekarang"** atau ikon **X** di pojok kanan atas memungkinkan Anda menutup checklist. Checklist bisa diakses kembali melalui Pengaturan.

---

## 7. Owner Dashboard

Owner Dashboard adalah dashboard khusus yang hanya dapat diakses oleh role **Owner** dan **Super Admin** melalui menu `/app/dashboard/owner`.

### 7.1 Cara Akses

1. Login dengan akun Owner atau Super Admin
2. Navigasi ke sidebar, pilih menu "Owner Dashboard"
3. Atau akses langsung melalui URL: `/app/dashboard/owner`

### 7.2 Struktur Halaman

Owner Dashboard memiliki 3 tab utama:

**Tab Dashboard**
- Mode toggle: Live, Hari Ini, Minggu Ini, Bulan Ini
- Critical Alerts banner
- KPI Cards (4-6 kartu tergantung mode)
- Perbandingan Performa Outlet

**Tab Financial**
- KPI keuangan: Net Profit, Total Revenue, Total Expenses, Net Cash Flow
- Sub-tab: Overview, By Outlet, Cash Flow
- Grafik dan chart keuangan

**Tab Staff**
- Summary cards: Total karyawan, staff aktif, total penjualan, rata-rata per staff
- Top Performer highlight
- Sales Leaderboard

### 7.3 Mode Live vs Mode Periode

**Mode Live (default)**

Saat tab "Live" aktif (ditandai ikon Activity berdenyut):
- Data di-refresh otomatis setiap 30 detik
- WebSocket terhubung ke server untuk update real-time
- Badge "Live" hijau dengan animasi pulse muncul di header
- Timestamp terakhir update ditampilkan (contoh: "Last update: 14:30:25")
- KPI yang ditampilkan: Penjualan Hari Ini, Transaksi Hari Ini, Rata-rata Transaksi, Order Aktif, Total Outlet
- Setiap transaksi baru yang selesai otomatis memicu refresh data

**Mode Periode (Hari Ini / Minggu Ini / Bulan Ini)**

Saat salah satu periode dipilih:
- Mode Live nonaktif
- Data diambil sekali dari server (tidak auto-refresh)
- KPI tambahan muncul: Total Profit, Total Pelanggan (pelanggan unik)
- Margin profit ditampilkan sebagai persentase

**Tips:** Gunakan Mode Live saat sedang memantau operasional secara aktif (misalnya saat jam sibuk). Beralih ke Mode Periode saat melakukan analisis dan evaluasi.

### 7.4 Critical Alerts

Banner peringatan muncul di bawah mode toggle jika ada alert aktif:

- **Alert Kritis** (ikon segitiga merah): Masalah yang memerlukan penanganan segera, misalnya stok bahan utama habis, transaksi mencurigakan, atau sistem down di salah satu outlet
- **Peringatan** (ikon jam kuning): Masalah yang perlu diperhatikan tapi tidak darurat, misalnya stok menipis atau transfer belum diverifikasi

Setiap alert menampilkan: judul, deskripsi, dan nama outlet terkait (jika relevan). Tombol "Lihat Semua" mengarahkan ke halaman detail alerts. Alert di-refresh otomatis setiap 60 detik.

Maksimal 3 alert ditampilkan di banner. Jika ada lebih banyak, gunakan tombol "Lihat Semua" untuk melihat daftar lengkap.

### 7.5 Interpretasi Data Financial

**Tab Financial > Overview:**

- **Revenue vs Expenses Chart**: Grafik garis (line chart) yang menampilkan tren harian Revenue (hijau), Expenses (merah), dan Profit (biru). Jika garis Profit konsisten di atas nol, bisnis dalam kondisi baik. Jika garis Expenses mendekati atau melampaui Revenue, perlu investigasi.
- **Payment Methods (Pie Chart)**: Distribusi metode pembayaran. Jika 90%+ masih tunai, pertimbangkan untuk mendorong adopsi pembayaran digital untuk efisiensi.
- **Expense Categories**: Breakdown pengeluaran per kategori dengan bar persentase. Identifikasi kategori dengan pengeluaran tertinggi dan evaluasi apakah ada ruang efisiensi.

**Tab Financial > By Outlet:**

- Daftar outlet diurutkan berdasarkan profit tertinggi
- Setiap outlet menampilkan: Net Profit (hijau jika positif, merah jika negatif), Revenue, Expenses, COGS
- Profit Margin per outlet membantu identifikasi outlet mana yang paling efisien

**Tab Financial > Cash Flow:**

- **Cash Flow Trend Chart**: Bar chart dengan Cash In (hijau), Cash Out (merah), dan Net Flow (biru)
- **Cash In by Method**: Breakdown penerimaan berdasarkan metode pembayaran dengan progress bar persentase
- **Cash Flow Summary**: Ringkasan Total Cash In, Total Cash Out, dan Net Cash Flow dalam card berwarna

### 7.6 Interpretasi Data Staff

**Summary Cards:**
- **Total Karyawan**: Jumlah karyawan aktif di semua outlet
- **Staff Aktif Jual**: Jumlah karyawan yang memiliki minimal 1 transaksi dalam periode. Jika angka ini jauh lebih rendah dari total karyawan, mungkin ada staf yang idle.
- **Total Penjualan**: Akumulasi penjualan dari semua staf
- **Rata-rata/Staff**: Penjualan per staff aktif. Gunakan ini sebagai benchmark untuk evaluasi performa individu.

**Top Performer:**
- Card highlight dengan background kuning gradient
- Menampilkan nama, role, outlet, total penjualan, jumlah transaksi, dan rata-rata transaksi
- Gunakan sebagai contoh (role model) dan bahan motivasi tim

**Sales Leaderboard:**
- Ranking lengkap semua karyawan
- Peringkat 1-3 ditandai dengan badge dan ikon khusus (trophy, medal, award)
- Setiap entry menampilkan: nama, role, outlet, total penjualan, jumlah transaksi, rata-rata transaksi
- Gunakan untuk evaluasi performa, penentuan bonus, dan identifikasi staf yang perlu pelatihan

---

## 8. Tips Optimasi Penggunaan Dashboard

### 8.1 Kapan Harus Cek Dashboard

| Waktu | Apa yang Dilihat | Tujuan |
|-------|------------------|--------|
| **Pagi hari (sebelum buka)** | Getting Started Checklist, stok alerts | Memastikan kesiapan operasional |
| **Jam 11:00** | Mode Live, penjualan pagi | Evaluasi apakah perlu adjust staf untuk jam makan siang |
| **Jam 14:00** | Grafik per Jam, transaksi hari ini | Mid-day check, apakah target harian tercapai |
| **Jam 18:00** | KPI harian, perbandingan outlet | Evaluasi performa sore, persiapan shift malam |
| **Setelah tutup toko** | Summary lengkap hari ini | Rekap harian, identifikasi anomali |
| **Senin pagi** | Periode "Minggu Ini" (minggu lalu) | Review mingguan, perencanaan minggu depan |
| **Tanggal 1** | Periode bulan lalu | Review bulanan, laporan ke owner/investor |

### 8.2 Apa yang Perlu Diperhatikan

**Metrik yang harus dipantau setiap hari:**
- Total penjualan vs target harian
- Jumlah transaksi --- apakah traffic normal?
- Rata-rata per transaksi --- apakah ada penurunan yang perlu diwaspadai?
- Critical Alerts (Owner Dashboard) --- masalah yang harus ditangani segera

**Metrik yang dipantau mingguan:**
- Grafik per Hari --- apakah pola mingguan konsisten?
- Top Items --- apakah ada perubahan tren produk?
- Perbandingan Outlet --- apakah ada outlet yang mulai tertinggal?
- Staff Leaderboard --- apakah performa tim merata?

**Metrik yang dipantau bulanan:**
- Margin Kotor --- apakah efisiensi bisnis terjaga?
- Revenue vs Expenses trend --- apakah pengeluaran terkontrol?
- Cash Flow --- apakah arus kas sehat?
- Expense Categories --- di mana uang paling banyak keluar?

### 8.3 Red Flags (Tanda Bahaya)

Perhatikan kondisi-kondisi berikut di dashboard:

1. **Penjualan turun signifikan tanpa sebab jelas** --- Bandingkan dengan periode yang sama minggu atau bulan lalu
2. **Margin kotor turun** --- Kemungkinan harga bahan naik atau ada diskon berlebihan
3. **Rata-rata transaksi turun** --- Staf mungkin tidak melakukan upselling, atau ada pergeseran ke produk murah
4. **Satu outlet jauh tertinggal** --- Perlu investigasi: masalah operasional, lokasi, atau SDM?
5. **Cash Out meningkat tajam tanpa diikuti Cash In** --- Evaluasi pengeluaran, kemungkinan pemborosan
6. **Staff aktif jual jauh di bawah total karyawan** --- Ada staf yang idle dan tidak produktif

### 8.4 Best Practices

1. **Jadikan cek dashboard sebagai rutinitas** --- Minimal 3 kali sehari: pagi, siang, malam
2. **Gunakan Mode Live saat jam sibuk** --- Pantau real-time untuk respons cepat
3. **Screenshot untuk dokumentasi** --- Ambil screenshot dashboard bulanan untuk arsip dan perbandingan
4. **Bagikan insight ke tim** --- Tunjukkan grafik dan leaderboard di briefing pagi untuk motivasi
5. **Bandingkan apple-to-apple** --- Saat membandingkan periode, pastikan jumlah hari operasional sama
6. **Manfaatkan semua tab Item Summary** --- Jangan hanya lihat Top Items, lihat juga per Kategori untuk insight lebih dalam

---

## 9. FAQ

### Umum

**Q: Mengapa dashboard saya kosong / menampilkan "Belum ada data"?**
A: Pastikan Anda sudah memiliki transaksi dalam periode yang dipilih. Jika baru pertama kali menggunakan TiloPOS, lakukan transaksi pertama melalui POS, lalu kembali ke dashboard. Juga pastikan outlet yang dipilih di header sudah benar.

**Q: Apakah data dashboard real-time?**
A: Staff Dashboard menampilkan data berdasarkan periode yang dipilih dan perlu di-refresh manual (reload halaman). Owner Dashboard memiliki Mode Live yang auto-refresh setiap 30 detik menggunakan koneksi WebSocket.

**Q: Kenapa saya tidak bisa melihat Owner Dashboard?**
A: Owner Dashboard hanya tersedia untuk role Owner dan Super Admin. Jika Anda seorang Manager atau Supervisor, Anda hanya bisa mengakses Staff Dashboard standar. Hubungi Owner untuk upgrade akses jika diperlukan.

**Q: Apakah bisa melihat data outlet lain?**
A: Ya, jika Anda memiliki akses ke beberapa outlet. Gunakan outlet selector di header untuk berpindah outlet. Data dashboard akan otomatis berubah sesuai outlet yang dipilih. Untuk melihat perbandingan semua outlet sekaligus, gunakan tab "Outlet Comparison".

### Grafik dan Data

**Q: Mengapa angka di grafik per hari tidak sama dengan total penjualan?**
A: Grafik per hari menampilkan breakdown penjualan berdasarkan hari dalam seminggu (Senin-Minggu) untuk periode yang dipilih. Jika periode mencakup beberapa minggu, nilai per hari adalah akumulasi dari semua minggu tersebut. Total semua hari seharusnya mendekati total penjualan kotor.

**Q: Format "K" dan "M" di sumbu Y grafik artinya apa?**
A: K = Ribu (Kilo), M = Juta (Mega). Contoh: 500K = Rp 500.000; 2.5M = Rp 2.500.000. Hover/tap pada bar untuk melihat angka lengkap.

**Q: Kenapa Margin Kotor saya menunjukkan 0%?**
A: Margin Kotor dihitung dari selisih harga jual dan harga pokok (HPP). Jika Anda belum mengisi HPP untuk produk-produk Anda, margin akan menunjukkan 0%. Atur HPP di halaman Produk untuk setiap item.

### Getting Started Checklist

**Q: Checklist hilang, bagaimana cara menampilkannya kembali?**
A: Jika Anda sudah menekan "Lewati untuk sekarang", checklist tidak akan muncul lagi di dashboard. Anda bisa mengaksesnya kembali melalui Pengaturan.

**Q: Apakah semua langkah wajib diselesaikan?**
A: Langkah 1-5 adalah langkah wajib yang direkomendasikan untuk memastikan TiloPOS berfungsi dengan baik. Langkah 6 (Atur printer) bersifat opsional dan tidak mempengaruhi perhitungan progress.

### Owner Dashboard

**Q: Apa arti badge "Live" hijau?**
A: Badge "Live" dengan animasi pulse menunjukkan bahwa koneksi WebSocket aktif dan data sedang di-update secara real-time. Jika badge tidak muncul, mungkin ada masalah koneksi internet.

**Q: Seberapa sering data di-refresh di Mode Live?**
A: Data KPI di-refresh setiap 30 detik. Critical Alerts di-refresh setiap 60 detik. Selain itu, setiap transaksi yang berhasil diselesaikan akan memicu refresh data secara instan melalui event WebSocket.

**Q: Bisa tidak mematikan Mode Live?**
A: Bisa. Klik salah satu tab periode (Hari Ini, Minggu Ini, Bulan Ini) untuk beralih dari Mode Live ke mode periode statis. Auto-refresh akan berhenti dan data hanya dimuat sekali.

**Q: Data staff leaderboard berdasarkan apa?**
A: Leaderboard diurutkan berdasarkan total penjualan (revenue) yang dihasilkan oleh masing-masing karyawan dalam periode yang dipilih. Setiap entry juga menampilkan jumlah transaksi dan rata-rata nilai transaksi untuk konteks yang lebih lengkap.

### Performa dan Troubleshooting

**Q: Dashboard lambat loading, apa yang harus dilakukan?**
A: Coba langkah berikut: (1) Pilih periode yang lebih pendek (Hari Ini daripada Bulan Ini), (2) Pastikan koneksi internet stabil, (3) Coba refresh halaman, (4) Jika menggunakan Owner Dashboard Mode Live, pastikan browser tidak memblokir WebSocket.

**Q: Data dashboard berbeda dengan laporan penjualan, kenapa?**
A: Pastikan periode yang dipilih sama persis. Dashboard mungkin menggunakan rentang tanggal default (awal bulan - hari ini), sementara laporan menggunakan rentang yang berbeda. Juga perhatikan bahwa dashboard menampilkan data per outlet yang dipilih, bukan total semua outlet (kecuali tab Outlet Comparison).

**Q: Tombol Refresh di Owner Dashboard fungsinya apa?**
A: Tombol Refresh (ikon panah putar) memaksa semua data di Owner Dashboard untuk dimuat ulang dari server. Ini berguna jika Anda ingin memastikan data terbaru ditampilkan tanpa menunggu auto-refresh berikutnya.
