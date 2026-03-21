# Audit Fitur: Dashboard TiloPOS

**Tanggal audit:** 20 Februari 2026
**Versi yang diaudit:** Berdasarkan source code terkini
**Auditor:** Tim Produk TiloPOS

---

## 1. Penilaian Kondisi Saat Ini (Current State Assessment)

### 1.1 Arsitektur Dashboard

Dashboard TiloPOS saat ini terdiri dari dua halaman terpisah:

1. **Staff Dashboard** (`/app`) --- `dashboard-page.tsx` (desktop) dan `dashboard-page.mobile.tsx` (mobile)
2. **Owner Dashboard** (`/app/dashboard/owner`) --- `owner-dashboard-page.tsx` (desktop only, belum ada file mobile terpisah)

Data diambil melalui dua hook utama:
- `useMokaDashboard` --- Menggunakan `reportsApi` untuk summary, items, dan outlet comparison
- Query langsung di Owner Dashboard --- Menggunakan `ownerAnalyticsApi`, `financialCommandApi`, dan `staffPerformanceApi`

### 1.2 Komponen yang Tersedia

| Komponen | Status | Digunakan di |
|----------|--------|-------------|
| `SalesSummaryGrid` | Aktif | Staff Dashboard (desktop + mobile) |
| `DayOfWeekChart` | Aktif | Staff Dashboard (desktop + mobile) |
| `HourlyChart` | Aktif | Staff Dashboard (desktop + mobile) |
| `ItemSummarySection` | Aktif | Staff Dashboard (desktop + mobile) |
| `OutletComparisonSection` | Aktif | Staff Dashboard (desktop) |
| `GettingStartedChecklist` | Aktif | Staff Dashboard (desktop) |
| `DashboardDatePicker` | Aktif | Staff Dashboard (desktop) |
| `DashboardSkeleton` | Aktif | Staff Dashboard (desktop) |
| `FinancialCommandSection` | Aktif | Owner Dashboard |
| `StaffPerformanceSection` | Aktif | Owner Dashboard |
| `QuickActions` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `StatCard` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `SalesTrendChart` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `FinancialSummary` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `CustomerInsights` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `PaymentChart` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `FnBWidget` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `RetailWidget` | Diekspor tapi **tidak digunakan** di dashboard saat ini |
| `ServiceWidget` | Diekspor tapi **tidak digunakan** di dashboard saat ini |

**Temuan kritis:** 9 dari 18 komponen yang diekspor dari `components/index.ts` **tidak digunakan** di halaman dashboard mana pun. Ini termasuk fitur-fitur yang disebutkan di deskripsi produk seperti QuickActions, CustomerInsights, PaymentChart, dan Operational Widgets (FnB, Retail, Service). Kemungkinan komponen ini pernah digunakan di versi sebelumnya dan terlepas saat refactoring ke layout berbasis Moka-style, atau memang belum diintegrasikan.

### 1.3 Data Flow

```
Staff Dashboard:
  useMokaDashboard hook
    -> reportsApi.dashboardSummary()     -> SalesSummaryGrid
    -> reportsApi.dashboardItems()       -> ItemSummarySection
    -> reportsApi.outletComparison()     -> OutletComparisonSection

Owner Dashboard:
  ownerAnalyticsApi.getRealTimeMetrics()     -> KPI Cards (Live mode)
  ownerAnalyticsApi.getOverview()            -> KPI Cards (Period mode)
  ownerAnalyticsApi.getOutletsComparison()   -> Outlet comparison section
  ownerAnalyticsApi.getCriticalAlerts()      -> Alerts banner
  financialCommandApi.*()                    -> FinancialCommandSection
  staffPerformanceApi.*()                    -> StaffPerformanceSection
  WebSocket (socket.io)                      -> Real-time invalidation
```

### 1.4 Aksesibilitas

- Role check dilakukan di `useMokaDashboard` --- hanya `owner`, `super_admin`, `manager`, `supervisor` yang bisa mengakses
- Owner Dashboard tidak memiliki guard eksplisit di halaman --- bergantung pada route guard

---

## 2. Evaluasi Heuristik UX (Skor per Widget)

Skala penilaian: 1 (Buruk) - 5 (Sangat Baik)

### 2.1 Staff Dashboard

| Widget | Visibility | Feedback | Consistency | Error Prevention | Flexibility | Rata-rata |
|--------|------------|----------|-------------|------------------|-------------|-----------|
| Sales Summary Grid | 5 | 4 | 5 | 4 | 3 | **4.2** |
| Day of Week Chart | 4 | 4 | 5 | 4 | 3 | **4.0** |
| Hourly Chart | 4 | 4 | 5 | 4 | 3 | **4.0** |
| Item Summary Section | 5 | 4 | 4 | 4 | 5 | **4.4** |
| Outlet Comparison | 4 | 3 | 4 | 4 | 3 | **3.6** |
| Getting Started Checklist | 5 | 5 | 5 | 5 | 4 | **4.8** |
| Date Picker | 3 | 3 | 4 | 3 | 4 | **3.4** |

**Catatan per widget:**

**Sales Summary Grid (4.2):** Desain clean dengan warna ikon yang konsisten dan informatif. Kekurangan: tidak ada indikator tren (naik/turun vs periode sebelumnya), tidak ada target/benchmark yang bisa dibandingkan.

**Day of Week Chart (4.0):** Visualisasi jelas dengan tooltip informatif. Kekurangan: tidak ada highlight untuk hari ini, tidak ada rata-rata line, tidak bisa klik bar untuk drill-down.

**Hourly Chart (4.0):** Sama kualitasnya dengan Day of Week Chart. Kekurangan: interval label terlalu jarang (setiap 2-3 jam), jam di luar operasional tetap ditampilkan meskipun kosong.

**Item Summary Section (4.4):** Widget paling lengkap dengan 4 sub-tab. Kekurangan: tidak ada search/filter, perpindahan tab bisa membingungkan di first use.

**Outlet Comparison (3.6):** Data lengkap tapi visual padat. Table Summary bisa sulit dibaca di layar kecil meskipun ada horizontal scroll. Graph Comparison cukup baik tapi tooltip hanya format currency (tidak cocok untuk metrik non-currency seperti Transactions dan Gross Margin).

**Getting Started Checklist (4.8):** Widget terbaik dari segi UX. Progress tracking jelas, CTA terarah, animasi celebration memberikan reward. Satu kekurangan: typo di pesan celebration ("menyelesaikan" tertulis "menyelesaikan" yang benar, tapi "langkah" seharusnya bisa lebih deskriptif).

**Date Picker (3.4):** Di desktop menggunakan komponen tanpa preset cepat. Pengguna harus memilih tanggal dari-sampai secara manual. Versi mobile lebih baik dengan 3 preset tombol. Inkonsistensi ini menurunkan skor.

### 2.2 Owner Dashboard

| Widget | Visibility | Feedback | Consistency | Error Prevention | Flexibility | Rata-rata |
|--------|------------|----------|-------------|------------------|-------------|-----------|
| KPI Cards | 5 | 5 | 4 | 4 | 4 | **4.4** |
| Critical Alerts | 5 | 5 | 4 | 5 | 3 | **4.4** |
| Outlet Comparison (Owner) | 4 | 3 | 3 | 4 | 3 | **3.4** |
| Financial Overview | 4 | 4 | 4 | 3 | 4 | **3.8** |
| Revenue vs Expenses Chart | 4 | 4 | 4 | 3 | 3 | **3.6** |
| Cash Flow Section | 4 | 4 | 4 | 3 | 3 | **3.6** |
| Staff Performance | 5 | 4 | 4 | 4 | 3 | **4.0** |
| Mode Toggle (Live/Period) | 4 | 5 | 4 | 3 | 5 | **4.2** |

**Catatan per widget:**

**KPI Cards (4.4):** Informasi jelas dengan warna yang membedakan setiap metrik. Sub-info (mis. "Last hour") memberikan konteks tambahan yang berguna. Kekurangan: jumlah card berubah antara Live (4-5 card) dan Period (5-6 card) mode, bisa membingungkan.

**Critical Alerts (4.4):** Banner yang sangat baik dengan hierarki visual yang jelas (kritis vs peringatan). Tombol "Lihat Semua" memberikan escape hatch. Kekurangan: tidak ada action langsung dari alert (mis. tombol "Pesan Stok" dari alert stok rendah).

**Outlet Comparison Owner (3.4):** Berbeda implementasinya dari Staff Dashboard Outlet Comparison --- menggunakan progress bar horizontal, bukan tabel dan grafik. Inkonsistensi ini membingungkan pengguna yang menggunakan kedua dashboard. Data yang ditampilkan juga lebih sederhana.

**Financial Section (3.6-3.8):** Data komprehensif tapi banyak sub-view yang bisa membingungkan (3 tab di dalam tab). Revenue vs Expenses chart tidak menampilkan axis label yang cukup jelas. Cash Flow memiliki summary card yang informatif tapi redundan dengan chart.

**Staff Performance (4.0):** Leaderboard visual menarik dengan badge ranking. Top Performer highlight memberikan focal point yang baik. Kekurangan: tidak ada filter per outlet, tidak ada tren historis, tidak ada comparison antar periode.

### 2.3 Skor Rata-rata Keseluruhan

- **Staff Dashboard:** 4.1 / 5.0
- **Owner Dashboard:** 3.9 / 5.0
- **Keseluruhan:** 4.0 / 5.0

---

## 3. Analisis Kompetitif

### 3.1 Perbandingan Fitur Dashboard

| Fitur | TiloPOS | Moka | Majoo | iSeller | Pawoon |
|-------|---------|------|-------|---------|--------|
| KPI ringkasan penjualan | Ya (6 metrik) | Ya (4 metrik) | Ya (5 metrik) | Ya (4 metrik) | Ya (3 metrik) |
| Grafik per hari | Ya | Ya | Ya | Ya | Tidak |
| Grafik per jam | Ya | Ya | Ya | Tidak | Tidak |
| Top produk | Ya (15 item + 4 view) | Ya (10 item) | Ya (10 item) | Ya (5 item) | Ya (5 item) |
| Perbandingan outlet | Ya (tabel + 2 grafik) | Ya (basic) | Ya (tabel) | Tidak | Tidak |
| Mode real-time / Live | Ya (WebSocket, 30s) | Tidak | Tidak | Tidak | Tidak |
| Critical alerts | Ya (kritis + peringatan) | Tidak | Notifikasi basic | Tidak | Tidak |
| Financial command center | Ya (3 sub-view) | Report terpisah | Report terpisah | Report terpisah | Tidak |
| Staff leaderboard | Ya (ranking + top performer) | Tidak | Report terpisah | Tidak | Tidak |
| Cash flow analysis | Ya (chart + breakdown) | Report terpisah | Report terpisah | Tidak | Tidak |
| Payment methods breakdown | Ya (pie chart) | Ya (bar chart) | Ya (list) | Ya (list) | Tidak |
| Customer insights | Komponen ada, belum digunakan | Ya | Ya (basic) | Tidak | Tidak |
| Operational widgets (F&B) | Komponen ada, belum digunakan | Tidak | Ya (basic) | Tidak | Tidak |
| Quick actions | Komponen ada, belum digunakan | Ya | Ya | Tidak | Tidak |
| Onboarding checklist | Ya (interaktif, progress bar) | Ya (modal) | Tidak | Ya (basic) | Tidak |
| Mobile dashboard | Ya (file terpisah, optimized) | Ya (responsive) | Ya (responsive) | Ya (app native) | Ya (app native) |
| Dark mode | Ya | Tidak | Tidak | Tidak | Tidak |
| Export dashboard data | Tidak | Ya (PDF) | Ya (PDF, Excel) | Ya (PDF) | Tidak |
| Date range kustom | Ya (desktop) | Ya | Ya | Ya | Tidak |
| Skeleton loading | Ya (semua widget) | Tidak (spinner) | Tidak (spinner) | Tidak (spinner) | Tidak (spinner) |

### 3.2 Keunggulan TiloPOS vs Kompetitor

1. **Real-time Mode Live** --- Tidak ada kompetitor lokal yang memiliki WebSocket-based live dashboard. Ini adalah differentiator utama.
2. **Financial Command Center terintegrasi** --- Kompetitor memisahkan analisis keuangan ke halaman report terpisah. TiloPOS mengintegrasikannya di Owner Dashboard.
3. **Staff Performance dengan Leaderboard** --- Gamification elemen yang unik. Kompetitor hanya menyediakan report performa staf tanpa visual ranking.
4. **Item Summary 4-view** --- Analisis produk paling komprehensif (Top Items, Kategori Volume, Kategori Sales, Per Kategori). Kompetitor biasanya hanya menyediakan 1-2 view.
5. **Outlet Comparison 3-visual** --- Tabel, horizontal chart, dan vertical chart memberikan tiga perspektif berbeda. Kompetitor yang punya fitur ini hanya menyediakan satu view.
6. **Mobile sebagai file terpisah** --- Optimasi UX mobile lebih baik daripada responsive breakpoints, memungkinkan interaksi yang benar-benar berbeda (collapsible sections, compact KPI cards).
7. **Dark mode support** --- Tidak ada kompetitor POS lokal yang mendukung dark mode di dashboard.
8. **Skeleton loading states** --- Semua widget memiliki skeleton placeholder saat loading, memberikan UX yang lebih halus dibanding spinner.

### 3.3 Kelemahan TiloPOS vs Kompetitor

1. **Tidak ada export** --- Moka dan Majoo bisa export dashboard ke PDF/Excel. TiloPOS belum mendukung ini.
2. **Komponen tidak terpakai** --- CustomerInsights, QuickActions, PaymentChart, dan Operational Widgets sudah dibuat tapi tidak diintegrasikan. Ini berarti fitur yang dimiliki kompetitor (customer analytics di dashboard, quick action shortcuts) sebenarnya sudah siap tapi tidak aktif.
3. **Owner Dashboard belum ada versi mobile** --- Tidak ditemukan file `owner-dashboard-page.mobile.tsx`, yang berarti owner harus mengakses dashboard lengkap dari desktop.
4. **Tidak ada notifikasi push** --- Alert hanya terlihat saat membuka dashboard. Kompetitor native app (iSeller, Pawoon) bisa mengirim push notification.

---

## 4. Best Practice dari Pemain Global

### 4.1 Shopify Admin Dashboard

**Yang bisa diadopsi:**

- **"Today's Sales" widget dengan comparison** --- Shopify menampilkan penjualan hari ini dengan perbandingan terhadap hari yang sama minggu lalu (persentase naik/turun). TiloPOS sudah punya angka penjualan tapi belum ada comparison.
- **Activity feed** --- Timeline aktivitas terbaru (pesanan baru, stok rendah, review baru) dalam satu stream. Memberikan "pulse" bisnis yang lebih hidup.
- **Actionable metrics** --- Setiap metrik di Shopify bisa diklik untuk drill-down ke detail. TiloPOS saat ini hanya menampilkan angka tanpa kemampuan drill-down.
- **Marketing insights** --- Sumber traffic, conversion rate, abandoned cart. Relevan untuk bisnis TiloPOS yang memiliki online ordering.

### 4.2 Square Dashboard

**Yang bisa diadopsi:**

- **Comparative period selector** --- Square memungkinkan perbandingan "This week vs Last week" atau "This month vs Last month" secara berdampingan. Sangat berguna untuk mengukur pertumbuhan.
- **Goal tracking** --- Owner bisa set target penjualan harian/mingguan/bulanan, dan dashboard menampilkan progress bar menuju target tersebut.
- **Insights cards** --- Square menghasilkan insight otomatis berbasis AI seperti "Penjualan Jumat naik 15% dari rata-rata. Pertimbangkan tambah staf di hari Jumat." TiloPOS bisa mengimplementasikan rules-based insight serupa.
- **Team management terintegrasi** --- Jam kerja, performa, dan payroll dalam satu view.

### 4.3 Toast Analytics (F&B Focused)

**Yang bisa diadopsi:**

- **Labor cost vs revenue ratio** --- Toast menampilkan biaya tenaga kerja sebagai persentase dari revenue secara real-time. Sangat relevan untuk F&B yang labor-intensive.
- **Speed of service metrics** --- Rata-rata waktu dari order ke penyajian, dengan breakdown per jam. TiloPOS sudah punya "Rata-rata Masak" di FnBWidget tapi belum terintegrasi di dashboard.
- **Menu engineering matrix** --- Klasifikasi produk ke dalam 4 kuadran: Stars (populer + menguntungkan), Plow Horses (populer + tidak menguntungkan), Puzzles (tidak populer + menguntungkan), Dogs (tidak populer + tidak menguntungkan). Data TiloPOS sudah cukup untuk mengimplementasikan ini.
- **Revenue per labor hour** --- Metrik efisiensi yang membagi total revenue dengan total jam kerja staf.
- **Daypart analysis** --- Breakdown penjualan berdasarkan "shift" (breakfast, lunch, dinner, late-night) bukan hanya per jam. Lebih intuitif untuk operator F&B.

---

## 5. Gap Analysis

### 5.1 Fitur yang Sudah Ada tapi Tidak Terintegrasi

| Komponen | Status | Gap |
|----------|--------|-----|
| `QuickActions` | Komponen lengkap, kontekstual per jenis bisnis | Tidak dipanggil di `dashboard-page.tsx` maupun mobile |
| `CustomerInsights` | Komponen lengkap dengan chart pelanggan baru vs kembali, top pelanggan | Tidak dipanggil di halaman dashboard mana pun |
| `PaymentChart` | Komponen untuk visualisasi metode pembayaran | Tidak dipanggil di staff dashboard |
| `FnBWidget` | Widget operasional F&B: okupansi meja, pesanan dapur, waktu masak, total tamu | Tidak dipanggil di dashboard |
| `RetailWidget` | Widget inventori: stok rendah, stok habis, nilai stok, pergerakan | Tidak dipanggil di dashboard |
| `ServiceWidget` | Widget layanan: booking, selesai, rating, pendapatan | Tidak dipanggil di dashboard |
| `StatCard` | Komponen kartu statistik reusable | Tidak digunakan (KPI cards di-hardcode) |
| `SalesTrendChart` | Grafik tren penjualan | Tidak digunakan |
| `FinancialSummary` | Ringkasan keuangan | Tidak digunakan |

**Dampak:** 9 komponen yang sudah dikembangkan tidak memberikan nilai kepada pengguna. Ini merepresentasikan effort development yang "terbuang" dan fitur yang diharapkan pengguna (berdasarkan deskripsi produk) tapi tidak tersedia.

### 5.2 Fitur yang Belum Ada

| Fitur | Prioritas | Kompleksitas | Deskripsi |
|-------|-----------|-------------|-----------|
| Period comparison (vs minggu/bulan lalu) | Tinggi | Sedang | Menampilkan persentase naik/turun di setiap KPI |
| Export dashboard (PDF/Excel) | Tinggi | Sedang | Kemampuan download ringkasan dashboard |
| Goal/target setting | Tinggi | Sedang | Set target penjualan dan tampilkan progress |
| Owner Dashboard mobile | Tinggi | Tinggi | File `owner-dashboard-page.mobile.tsx` belum ada |
| Drill-down dari KPI ke detail | Sedang | Sedang | Klik angka KPI untuk melihat transaksi detail |
| AI/rules-based insights | Sedang | Tinggi | Insight otomatis seperti "Penjualan naik 15% vs minggu lalu" |
| Push notification untuk alerts | Sedang | Tinggi | Notifikasi di luar dashboard untuk critical alerts |
| Menu engineering matrix | Sedang | Sedang | Klasifikasi produk 4 kuadran (Stars, Plow Horses, Puzzles, Dogs) |
| Labor cost ratio | Rendah | Sedang | Biaya tenaga kerja vs revenue |
| Daypart analysis | Rendah | Rendah | Breakdown per shift (breakfast/lunch/dinner) |
| Activity feed | Rendah | Sedang | Timeline aktivitas terbaru |
| Dashboard widget customization | Rendah | Tinggi | User bisa memilih widget mana yang ditampilkan |

### 5.3 Inkonsistensi Antar Platform

| Aspek | Desktop | Mobile | Gap |
|-------|---------|--------|-----|
| Date selector | DatePicker (kustom range) | 3 preset tombol | Mobile lebih terbatas tapi lebih user-friendly |
| Getting Started Checklist | Ada | Tidak ada | Onboarding tidak tersedia di mobile |
| Outlet Comparison visual | Tabel + 2 grafik Recharts | Card per outlet (tidak ada grafik) | Mobile kehilangan perbandingan visual |
| Owner Dashboard | Lengkap (3 tab) | Tidak ada file mobile | Owner tidak bisa monitoring dari ponsel |
| Quick Actions | Tidak digunakan | Tidak digunakan | Keduanya tidak menggunakan komponen ini |
| Operational Widgets | Tidak digunakan | Tidak digunakan | Keduanya tidak menggunakan komponen ini |
| Skeleton loading | Per-widget skeleton | Per-widget skeleton | Konsisten (baik) |

---

## 6. Top 10 Rekomendasi Perbaikan UX

### 1. Integrasikan Komponen yang Sudah Ada (Prioritas: Kritis)

**Masalah:** 9 komponen siap pakai tidak terpasang di dashboard.

**Rekomendasi:** Tambahkan ke `dashboard-page.tsx` dan `dashboard-page.mobile.tsx`:
- `QuickActions` di bawah Sales Summary Grid (atau di atas sebagai sticky bar di mobile)
- `CustomerInsights` di sidebar kanan (desktop) atau sebagai collapsible section (mobile)
- `FnBWidget` / `RetailWidget` / `ServiceWidget` secara kontekstual berdasarkan jenis bisnis outlet
- `PaymentChart` sebagai widget tambahan di bawah grafik penjualan

**Impact:** Tinggi. Fitur yang sudah dijanjikan ke pengguna menjadi tersedia tanpa perlu development baru.

### 2. Tambahkan Period Comparison di KPI Cards (Prioritas: Tinggi)

**Masalah:** KPI hanya menampilkan angka absolut tanpa konteks. Pengguna tidak tahu apakah angka tersebut bagus atau buruk tanpa membandingkan dengan periode sebelumnya.

**Rekomendasi:** Di bawah setiap angka KPI, tampilkan badge "+12.5%" (hijau) atau "-3.2%" (merah) yang membandingkan dengan periode sebelumnya yang setara. Misalnya, jika filter "Minggu Ini", bandingkan dengan minggu lalu.

**Impact:** Tinggi. Mengubah data statis menjadi actionable insight.

### 3. Buat Owner Dashboard Mobile (Prioritas: Tinggi)

**Masalah:** File `owner-dashboard-page.mobile.tsx` tidak ada. Owner yang sering mobile tidak bisa memantau bisnis dari ponsel secara optimal.

**Rekomendasi:** Buat versi mobile dengan:
- KPI cards dalam grid 2 kolom
- Critical alerts sebagai banner di atas
- 3 tab (Dashboard, Financial, Staff) dalam bottom sheet atau scrollable tabs
- Collapsible sections untuk setiap chart/tabel
- Simplified charts (sparkline daripada full chart)

**Impact:** Tinggi. Membuka akses monitoring untuk owner yang tidak selalu di depan laptop.

### 4. Tambahkan Goal/Target Tracking (Prioritas: Tinggi)

**Masalah:** Tidak ada benchmark untuk menilai performa. Angka Rp 5.000.000 hari ini --- apakah bagus atau buruk?

**Rekomendasi:** Tambahkan fitur target penjualan di pengaturan:
- Owner set target harian/mingguan/bulanan per outlet
- Di KPI "Penjualan Kotor", tampilkan progress bar menuju target
- Warna berubah: merah jika di bawah 50%, kuning 50-80%, hijau di atas 80%
- Notifikasi saat target tercapai

**Impact:** Tinggi. Memberikan motivasi dan tujuan yang jelas bagi tim.

### 5. Implementasikan Drill-Down pada Setiap Metrik (Prioritas: Sedang)

**Masalah:** Dashboard saat ini bersifat read-only tanpa kemampuan eksplorasi. Pengguna yang melihat angka menarik harus berpindah ke halaman lain untuk investigasi.

**Rekomendasi:**
- Klik angka KPI -> navigasi ke halaman laporan dengan filter yang sudah ter-set sesuai metrik dan periode
- Klik bar di grafik per hari -> filter laporan ke hari tersebut
- Klik bar di grafik per jam -> filter laporan ke jam tersebut
- Klik item di Top Items -> navigasi ke halaman detail produk

**Impact:** Sedang. Mempercepat workflow investigasi dari 4-5 klik menjadi 1 klik.

### 6. Perbaiki Konsistensi Date Picker Desktop vs Mobile (Prioritas: Sedang)

**Masalah:** Desktop menggunakan custom date range picker, mobile menggunakan 3 tombol preset. Pengalaman berbeda.

**Rekomendasi:** Untuk desktop, tambahkan preset tombol cepat (Hari Ini, Minggu Ini, Bulan Ini, 30 Hari Terakhir) di samping date picker. Pertahankan kemampuan kustom range. Untuk mobile, tambahkan opsi "Pilih Tanggal" yang membuka modal date picker sederhana.

**Impact:** Sedang. Menyatukan pengalaman dan memberikan kemudahan di kedua platform.

### 7. Tambahkan Export Functionality (Prioritas: Sedang)

**Masalah:** Tidak ada cara mengekspor data dashboard. Owner yang perlu membuat laporan ke investor atau partner harus screenshot manual.

**Rekomendasi:** Tambahkan tombol "Export" di header dashboard dengan opsi:
- PDF: Snapshot visual dashboard lengkap
- Excel: Data mentah tabel (KPI, outlet comparison, top items)
- Sharing link: Generate link read-only untuk periode tertentu

**Impact:** Sedang. Memenuhi kebutuhan pelaporan profesional.

### 8. Tambahkan Insight Cards Otomatis (Prioritas: Sedang)

**Masalah:** Pengguna harus menginterpretasi data sendiri. Tidak semua pemilik UMKM terbiasa membaca grafik.

**Rekomendasi:** Implementasikan rules-based insight engine yang menghasilkan kartu insight di atas dashboard:
- "Penjualan hari Rabu turun 25% dibanding rata-rata. Pertimbangkan promosi khusus."
- "Nasi Goreng Spesial adalah produk terlaris Anda bulan ini, naik 3 peringkat dari bulan lalu."
- "Outlet Kemang memiliki margin tertinggi (45%). Pelajari strateginya untuk outlet lain."
- "Jam 14:00-16:00 adalah jam paling sepi. Ideal untuk training staf atau prep."

**Impact:** Sedang-Tinggi. Membantu pengguna non-teknis mengambil keputusan berbasis data.

### 9. Perbaiki Tooltip dan Formatter di Outlet Comparison Chart (Prioritas: Rendah)

**Masalah:** Tooltip di Graph Comparison selalu memformat nilai sebagai currency (`formatCurrency`), padahal metrik "Transactions" dan "Gross Margin" bukan currency.

**Rekomendasi:** Implementasikan formatter kontekstual berdasarkan metrik yang di-hover:
- Gross Sales, Net Sales, Gross Profit, Avg Sale: format currency
- Transactions: format number
- Gross Margin: format percentage

**Impact:** Rendah. Perbaikan minor tapi meningkatkan akurasi informasi.

### 10. Tambahkan Empty State yang Lebih Informatif (Prioritas: Rendah)

**Masalah:** Saat data kosong, pesan yang muncul hanya "Belum ada data" tanpa panduan apa yang harus dilakukan.

**Rekomendasi:** Empty state yang actionable:
- "Belum ada data penjualan untuk periode ini. [Buka POS] untuk mulai bertransaksi."
- "Belum ada data outlet. [Tambah Outlet] untuk mulai membandingkan performa cabang."
- Sertakan ilustrasi/gambar yang menarik untuk empty state

**Impact:** Rendah. Meningkatkan pengalaman pengguna baru dan mengurangi kebingungan.

---

## 7. Best Practice Visualisasi Data

### 7.1 Rekomendasi untuk Grafik yang Ada

**Day of Week Chart:**
- Tambahkan garis rata-rata horizontal (average line) sebagai referensi
- Highlight bar hari ini dengan warna yang lebih cerah atau border
- Tambahkan label nilai di atas bar untuk grafik desktop (opsional, toggle)

**Hourly Chart:**
- Filter jam di luar jam operasional agar grafik tidak terlalu lebar
- Tambahkan shading area untuk jam sibuk (peak hours)
- Pertimbangkan line chart sebagai alternatif untuk melihat tren lebih jelas

**Outlet Comparison:**
- Sortable table headers untuk setiap kolom
- Highlight baris outlet terbaik dan terburuk
- Sparkline mini di dalam tabel untuk tren 7 hari terakhir per outlet

**Financial Charts:**
- Tambahkan area fill di bawah line chart untuk Revenue vs Expenses agar perbedaan lebih terlihat
- Gunakan stacked bar chart daripada grouped bar chart untuk Cash Flow agar Net Flow lebih intuitif
- Pie chart Payment Methods sebaiknya ditambah tabel di bawahnya untuk angka pasti

### 7.2 Prinsip Umum yang Harus Diterapkan

1. **Warna konsisten** --- Gunakan warna yang sama untuk metrik yang sama di semua widget (hijau emerald selalu untuk sales, biru untuk transaksi, dll.)
2. **Hierarchy visual** --- Angka paling penting (penjualan hari ini) harus paling besar dan paling atas
3. **Konteks selalu tersedia** --- Setiap angka harus memiliki label, unit, dan idealnya perbandingan
4. **Progressive disclosure** --- Tampilkan ringkasan dulu, detail tersedia saat diklik/expand
5. **Responsive typography** --- Angka besar di desktop, lebih kecil di mobile tapi tetap terbaca
6. **Loading states** --- Sudah bagus dengan skeleton (pertahankan)
7. **Error states** --- Perlu ditambahkan UI untuk kasus error (selain empty state)

---

## 8. Review Dashboard Mobile

### 8.1 Kelebihan Implementasi Saat Ini

1. **File terpisah (`dashboard-page.mobile.tsx`)** --- Benar-benar dioptimalkan untuk mobile, bukan sekedar responsive breakpoint
2. **Collapsible sections** --- Menggunakan `Collapsible` dari Radix UI, memungkinkan pengguna mengatur informasi yang ingin dilihat
3. **KPI grid 2 kolom** --- Pas untuk layar ponsel, informasi padat tapi terbaca
4. **Compact typography** --- Font size disesuaikan (10px, xs, sm) untuk kepadatan informasi yang optimal
5. **Bottom navigation spacer** --- `MobileNavSpacer` memastikan konten tidak tertutup bottom navigation
6. **Sticky header** --- Date selector dan tab bar tetap terlihat saat scroll
7. **Dark mode support** --- Conditional class untuk dark mode di setiap komponen

### 8.2 Kelemahan dan Rekomendasi

| Aspek | Masalah | Rekomendasi |
|-------|---------|-------------|
| Onboarding | Getting Started Checklist tidak ada di mobile | Tambahkan versi mobile yang compact (accordion style) |
| Owner Dashboard | Tidak ada file mobile | Buat `owner-dashboard-page.mobile.tsx` dengan layout card-based |
| Outlet Comparison | Tidak ada grafik, hanya card list | Tambahkan mini horizontal bar chart per outlet |
| Pull to refresh | Tidak ada gesture pull-to-refresh | Implementasikan pull-to-refresh untuk memuat ulang data |
| Swipe navigation | Tidak bisa swipe antar tab | Tambahkan swipe gesture untuk navigasi tab Dashboard <-> Outlet |
| Top Items limit | Menampilkan 10 items | Tambahkan tombol "Lihat Semua" yang navigasi ke halaman laporan |
| Grafik interaksi | Touch tooltip sulit diakses pada bar kecil | Perbesar hit area untuk touch, atau gunakan tap-hold untuk tooltip |
| Landscape | Tidak dioptimalkan untuk landscape | Pertimbangkan layout 2 kolom untuk landscape |

### 8.3 Performance Concern

- Recharts library dimuat penuh di mobile meskipun chart bisa lebih sederhana
- Pertimbangkan lazy loading chart component (hanya load saat section di-expand)
- `ResponsiveContainer` dari Recharts mungkin trigger re-render saat orientasi berubah

---

## 9. Performa (Loading Time dan Data Freshness)

### 9.1 Analisis Loading Strategy

**Staff Dashboard:**
- `useMokaDashboard` hook memuat `summary` secara default (selalu aktif)
- `items` hanya dimuat saat tab "dashboard" aktif
- `outletComparison` hanya dimuat saat tab "outlet_comparison" aktif
- Strategi ini baik untuk mengurangi initial load

**Owner Dashboard:**
- Memuat 4-5 query secara paralel: realTimeMetrics, overview, outletsComparison, alertsData
- Financial tab memuat 5 query tambahan: revenueExpense, profitByOutlet, cashFlow, paymentMethods, expenseCategories
- Staff tab memuat 2 query tambahan: leaderboard, summary
- Total potensi: 11 API call jika semua tab dibuka

### 9.2 Data Freshness

| Data | Refresh Strategy | Interval |
|------|-----------------|----------|
| Real-time metrics (Owner Live) | `refetchInterval` | 30 detik |
| Critical alerts | `refetchInterval` | 60 detik |
| Staff Dashboard data | Manual (page reload atau date change) | Tidak ada auto-refresh |
| Financial data | Manual (tab switch atau date change) | Tidak ada auto-refresh |
| Staff performance | Manual | Tidak ada auto-refresh |
| WebSocket events | Event-driven invalidation | Instant |

**Temuan:** Staff Dashboard tidak memiliki auto-refresh. Jika kasir membuka dashboard di pagi hari dan membiarkannya, data akan stale sepanjang hari. Hanya Owner Dashboard Mode Live yang memiliki auto-refresh.

### 9.3 Rekomendasi Performa

1. **Tambahkan staleTime pada query** --- Saat ini tidak ada `staleTime` yang dikonfigurasi, yang berarti setiap re-mount component akan refetch. Tambahkan `staleTime: 5 * 60 * 1000` (5 menit) untuk mengurangi request yang tidak perlu.

2. **Implementasikan refetchOnWindowFocus selektif** --- Pastikan data di-refresh saat pengguna kembali ke tab browser, tapi tidak terlalu agresif.

3. **Pertimbangkan auto-refresh ringan untuk Staff Dashboard** --- Interval 5 menit yang bisa dimatikan pengguna, agar data tidak terlalu stale.

4. **Lazy load tab content Owner Dashboard** --- Tab Financial dan Staff memuat banyak query. Pastikan query hanya dijalankan saat tab aktif (beberapa sudah menggunakan `enabled` flag, tapi Financial dan Staff tab queries selalu aktif).

5. **Bundle size** --- Recharts adalah library besar. Pertimbangkan tree-shaking yang lebih agresif atau alternatif yang lebih ringan (visx, chart.js) untuk mobile dashboard.

6. **Prefetch strategi** --- Saat pengguna hover tab "Outlet Comparison", prefetch data agar transisi tab terasa instant.

---

## 10. Roadmap Implementasi

### Phase 1: Quick Wins (1-2 minggu)

| Item | Effort | Impact |
|------|--------|--------|
| Integrasikan QuickActions ke dashboard | 2 jam | Tinggi |
| Integrasikan CustomerInsights ke dashboard | 2 jam | Tinggi |
| Integrasikan Operational Widgets (FnB/Retail/Service) | 3 jam | Tinggi |
| Perbaiki tooltip formatter di Outlet Comparison | 1 jam | Rendah |
| Tambahkan staleTime pada TanStack Query | 1 jam | Sedang |
| Perbaiki empty state dengan CTA | 3 jam | Rendah |
| Tambahkan Getting Started Checklist di mobile | 3 jam | Sedang |

**Total effort:** ~15 jam
**Total impact:** Mengaktifkan 9 fitur yang sudah siap tapi belum terpakai.

### Phase 2: High-Value Features (2-4 minggu)

| Item | Effort | Impact |
|------|--------|--------|
| Period comparison badges di KPI cards | 1 minggu (backend + frontend) | Tinggi |
| Owner Dashboard mobile (`owner-dashboard-page.mobile.tsx`) | 1 minggu | Tinggi |
| Konsistensi date picker (preset di desktop, kustom di mobile) | 3 hari | Sedang |
| Goal/target tracking | 1 minggu (backend + frontend) | Tinggi |
| Export dashboard ke PDF | 3 hari | Sedang |

**Total effort:** ~4 minggu
**Total impact:** Menutup gap utama dengan kompetitor dan memenuhi kebutuhan bisnis kritis.

### Phase 3: Advanced Features (1-2 bulan)

| Item | Effort | Impact |
|------|--------|--------|
| Drill-down pada setiap metrik | 2 minggu | Sedang |
| Rules-based insight cards | 2 minggu (backend logic + frontend) | Sedang-Tinggi |
| Push notification untuk critical alerts | 2 minggu | Sedang |
| Menu engineering matrix | 1 minggu | Sedang |
| Dashboard widget customization | 3 minggu | Rendah |
| Export ke Excel dengan template | 1 minggu | Sedang |
| Daypart analysis view | 3 hari | Rendah |

**Total effort:** ~8-10 minggu
**Total impact:** Membawa dashboard ke level enterprise-grade yang melampaui kompetitor.

### Phase 4: Innovation (3-6 bulan)

| Item | Effort | Impact |
|------|--------|--------|
| AI-powered insights (anomaly detection) | 1 bulan | Tinggi |
| Predictive analytics (forecasting) | 1 bulan | Tinggi |
| Custom dashboard builder (drag & drop) | 2 bulan | Sedang |
| Benchmarking vs industri sejenis | 1 bulan | Sedang |
| Voice-activated dashboard queries | 1 bulan | Rendah |

**Total effort:** ~6 bulan
**Total impact:** Differentiator jangka panjang yang sulit ditiru kompetitor.

---

## Kesimpulan

Dashboard TiloPOS memiliki fondasi arsitektur yang kuat dengan skor UX 4.0/5.0. Keunggulan utamanya --- real-time Mode Live, Financial Command Center, dan Staff Leaderboard --- menempatkannya di atas kompetitor lokal seperti Moka, Majoo, iSeller, dan Pawoon.

Namun, temuan paling kritis dari audit ini adalah **9 komponen yang sudah dikembangkan tapi tidak terintegrasi**. Komponen QuickActions, CustomerInsights, PaymentChart, dan tiga Operational Widgets (FnB, Retail, Service) merepresentasikan fitur yang sudah dijanjikan di deskripsi produk tapi belum tersedia untuk pengguna. Integrasi komponen ini adalah **quick win dengan effort terendah dan impact tertinggi** yang bisa dilakukan segera.

Tiga prioritas tertinggi berikutnya adalah: (1) Period comparison untuk memberikan konteks pada setiap angka, (2) Owner Dashboard mobile untuk akses monitoring dari ponsel, dan (3) Goal/target tracking untuk memberikan benchmark yang jelas.

Dengan menjalankan Phase 1 dan Phase 2 dari roadmap di atas (total ~5 minggu), Dashboard TiloPOS akan menutup semua gap material dengan kompetitor dan memberikan pengalaman analitik yang secara signifikan lebih baik untuk UMKM Indonesia.
