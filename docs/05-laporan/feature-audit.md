# Audit Fitur — Modul Laporan TiloPOS

## Daftar Isi

1. [Status Saat Ini per Tipe Laporan](#status-saat-ini-per-tipe-laporan)
2. [Evaluasi Heuristik UX](#evaluasi-heuristik-ux)
3. [Analisis Kompetitor](#analisis-kompetitor)
4. [Best Practice dari Industri Global](#best-practice-dari-industri-global)
5. [Asesmen Visualisasi Data](#asesmen-visualisasi-data)
6. [Gap Analysis](#gap-analysis)
7. [Top 10 Perbaikan UX](#top-10-perbaikan-ux)
8. [Review Fungsi Export](#review-fungsi-export)
9. [Asesmen Real-Time vs Cached Data](#asesmen-real-time-vs-cached-data)
10. [UX Laporan di Mobile](#ux-laporan-di-mobile)
11. [Roadmap Implementasi](#roadmap-implementasi)

---

## Status Saat Ini per Tipe Laporan

### Laporan Inti (Selalu Tersedia)

| Laporan | Status | Komponen | Fitur |
|---------|--------|----------|-------|
| Penjualan | Implementasi penuh | `sales-report.tsx` | 4 KPI cards, bar chart harian, export PDF/Excel, calculation help tooltips, error/empty states, data timestamp |
| Penjualan Detail | Implementasi penuh | `sales-report-page.tsx` + 8 sub-sections | Sidebar navigasi (desktop), chip horizontal (mobile), date picker, 8 sub-bagian: Ringkasan, Laba Kotor, Pembayaran, Item, Kategori, Diskon, Pajak, Kasir |
| Produk | Implementasi penuh | `product-report.tsx` | 1 KPI card, horizontal bar chart Top 10, tabel detail dengan DataTable, export PDF/Excel |
| Keuangan | Implementasi penuh | `financial-report.tsx` | 4 KPI cards (Pendapatan, HPP, Laba Kotor, Margin), calculation help tooltips, export |
| Pembayaran | Implementasi penuh | `payment-report.tsx` | 1 KPI card, pie chart distribusi, tabel detail metode, export |

### Laporan Kontekstual (Muncul Berdasarkan Tipe Bisnis/Fitur)

| Laporan | Status | Kondisi Tampil | Komponen |
|---------|--------|----------------|----------|
| Inventaris | Implementasi penuh | `hasStockManagement \|\| isRetail` | 4 KPI cards (Total Produk, Nilai Stok, Stok Rendah, Stok Habis), 2 list (Terlaris, Lambat Terjual) |
| Dapur (KDS) | Implementasi penuh | `hasKitchenDisplay && isFnB` | 4 KPI cards, jam sibuk, menu populer, alert menu lambat |
| Meja | Implementasi penuh | `hasTableManagement && isFnB` | 4 KPI cards (Meja, Okupansi, Durasi, Turnover), performa meja, jam ramai, statistik tamu |
| Staff | Implementasi penuh | `hasStaffCommission && isService` | 4 KPI cards, leaderboard staff, breakdown layanan |
| Reservasi | Implementasi penuh | `hasAppointments && isService` | 4 KPI cards, booking per hari, sumber booking, layanan populer |

### Halaman Terkait Laporan

| Halaman | Status | Path | Fitur Utama |
|---------|--------|------|-------------|
| Riwayat Transaksi | Implementasi penuh | `/app/transactions` | 4 tab (All, Sukses, Batal, Void), filter outlet/tanggal, search, void/refund/cetak ulang, export, pagination |
| Detail Transaksi | Implementasi penuh | `/app/transactions/:id` | Halaman detail per transaksi |
| Penyelesaian | Implementasi penuh | `/app/settlements` | 3 metrik, filter status/tanggal, detail per settlement, konfirmasi penyelesaian |
| Invoice | Implementasi penuh | `/app/invoices` | 3 tab (Invoice, Transaksi, Detail Item), date range picker, detail modal |
| Jadwal Laporan | Implementasi penuh | `/app/settings/report-schedule` | Role guard: Owner & Super Admin only |

### Kesimpulan Status

Semua 9 tipe laporan dan 5 halaman terkait telah diimplementasikan. Tidak ada fitur yang berstatus "coming soon" atau placeholder. Secara fungsional, modul laporan sudah lengkap untuk kebutuhan dasar semua tipe bisnis yang didukung TiloPOS.

---

## Evaluasi Heuristik UX

Evaluasi berdasarkan 10 heuristik Nielsen, diterapkan pada modul laporan.

### 1. Visibility of System Status — Skor: 7/10

**Baik:**
- `DataTimestamp` menampilkan kapan data terakhir di-refresh
- Loading state menggunakan `Skeleton` yang menunjukkan layout yang akan muncul
- Error state dengan komponen `ReportErrorState` yang jelas beserta tombol retry
- Empty state dengan komponen `ReportEmptyState` yang informatif

**Perlu perbaikan:**
- Tidak ada indikator visual saat data sedang di-refresh (stale data being refetched)
- Tidak ada indikator progress untuk export yang mungkin memakan waktu
- Tidak ada notifikasi saat export berhasil di-download

### 2. Match Between System and Real World — Skor: 8/10

**Baik:**
- Seluruh label dan deskripsi dalam Bahasa Indonesia yang natural
- Istilah akuntansi dilengkapi `CalculationHelp` tooltip yang menjelaskan formula
- Navigasi menggunakan terminologi bisnis yang familiar (Penjualan, Produk, Keuangan)
- Format mata uang menggunakan Rupiah dengan pemisah ribuan yang benar

**Perlu perbaikan:**
- Beberapa istilah masih campuran bahasa Inggris: "Table Turnover", "Average Order Value", "Settlement"
- Tab "Item Void" mungkin membingungkan — "Item Dibatalkan" lebih natural

### 3. User Control and Freedom — Skor: 6/10

**Baik:**
- Custom date range memberikan fleksibilitas penuh
- Void dan refund memiliki dialog konfirmasi dengan tombol batal
- Tab navigasi memungkinkan pindah antar laporan dengan cepat

**Perlu perbaikan:**
- Tidak ada tombol "undo" setelah void/refund (meskipun void memang irreversible, bisa ada opsi "reverse void")
- Tidak bisa bookmark atau save filter favorit
- Tidak bisa membuka dua laporan sekaligus untuk perbandingan side-by-side
- Tidak ada tombol refresh manual yang eksplisit (harus refresh browser)

### 4. Consistency and Standards — Skor: 7/10

**Baik:**
- Semua laporan inti (Penjualan, Produk, Keuangan, Pembayaran) menggunakan pattern yang konsisten: KPI cards di atas, chart di tengah, tabel di bawah
- Export buttons dan data timestamp posisinya konsisten
- Loading dan error states menggunakan komponen shared yang sama

**Perlu perbaikan:**
- Laporan kontekstual (Inventaris, Dapur, Meja, Staff, Reservasi) menggunakan layout berbeda: CardHeader + CardContent vs layout KPI cards yang berbeda
- Laporan inti menggunakan `ExportButtons` + `DataTimestamp` + `CalculationHelp`, tapi laporan kontekstual tidak memiliki fitur export dan calculation help
- Inkonsistensi format angka: beberapa menggunakan `formatCurrency`, lainnya `formatRupiah`

### 5. Error Prevention — Skor: 7/10

**Baik:**
- Void dan refund membutuhkan alasan (field wajib diisi)
- Custom date range hanya mengirim query jika from DAN to sudah diisi
- Query di-disable jika outletId kosong

**Perlu perbaikan:**
- Tidak ada konfirmasi kedua untuk void (tindakan irreversible)
- Tidak ada validasi rentang tanggal (bisa pilih "dari" lebih besar dari "sampai")
- Tidak ada batasan maksimal rentang tanggal yang bisa di-query

### 6. Recognition Rather Than Recall — Skor: 8/10

**Baik:**
- Semua metrik dilengkapi ikon yang relevan (DollarSign, ShoppingCart, TrendingUp, dll)
- Tab laporan kontekstual hanya muncul jika relevan (tidak perlu ingat fitur mana yang aktif)
- Tooltip calculation help mengurangi kebutuhan mengingat formula

**Perlu perbaikan:**
- Tidak ada label di sumbu grafik yang menjelaskan apa yang diukur
- Pie chart tidak menampilkan nilai absolut, hanya persentase

### 7. Flexibility and Efficiency of Use — Skor: 5/10

**Baik:**
- 5 opsi periode preset + custom range
- Tab navigasi memungkinkan switching cepat

**Perlu perbaikan:**
- Tidak ada keyboard shortcut untuk navigasi antar laporan
- Tidak ada fitur "compare period" (bandingkan bulan ini vs bulan lalu secara langsung)
- Tidak ada fitur drill-down (klik bar chart penjualan harian untuk melihat detail per jam)
- Tidak ada fitur saved views atau dashboard kustom
- Tidak ada fitur quick filter (misal: filter produk tertentu di laporan penjualan)

### 8. Aesthetic and Minimalist Design — Skor: 8/10

**Baik:**
- Design bersih menggunakan shadcn/ui card components
- Warna konsisten menggunakan CSS variables (primary, muted, destructive)
- Alert dengan warna yang tepat: kuning untuk warning (stok rendah), merah untuk danger (stok habis)
- Grafik bersih dengan grid halus dan tooltip informatif

**Perlu perbaikan:**
- Beberapa laporan terlalu sparse (Keuangan hanya 4 kartu tanpa grafik atau tabel)
- Pie chart menggunakan hardcoded colors yang mungkin tidak accessible untuk color-blind users

### 9. Help Users Recognize, Diagnose, and Recover from Errors — Skor: 7/10

**Baik:**
- `ReportErrorState` menampilkan judul, deskripsi, dan tombol retry
- Error message menjelaskan apa yang gagal ("Gagal memuat laporan penjualan")
- Mutation errors ditangani dengan `handleMutationError` dan toast notification

**Perlu perbaikan:**
- Error message tidak menampilkan detail teknis (status code, error message dari API)
- Tidak ada saran tindakan yang spesifik saat error (misal: "Coba kurangi rentang tanggal")
- Tidak ada fallback offline (menampilkan data cache terakhir saat offline)

### 10. Help and Documentation — Skor: 6/10

**Baik:**
- `CalculationHelp` tooltips di setiap metrik laporan inti
- Empty state messages yang informatif

**Perlu perbaikan:**
- Tidak ada onboarding atau tour untuk pengguna pertama kali
- Tidak ada link ke dokumentasi atau help center
- Tidak ada contextual help di grafik (cara membaca chart)
- Tidak ada benchmarks atau target (misal: "Margin rata-rata industri F&B: 60-70%")

### Skor Rata-rata: 6.9/10

---

## Analisis Kompetitor

### Moka POS (by GoTo)

**Kelebihan analitik Moka:**
- Dashboard real-time dengan auto-refresh
- Laporan perbandingan periode (bulan ini vs bulan lalu) dengan persentase perubahan
- Drill-down dari grafik: klik hari tertentu untuk melihat transaksi
- Heatmap jam sibuk dengan gradasi warna
- Laporan modifiers/add-ons terpisah
- Push notification untuk milestone (misal: "Penjualan hari ini sudah melebihi target!")
- Laporan bisa di-share via WhatsApp langsung

**Yang TiloPOS belum miliki dibanding Moka:**
- Period-over-period comparison dengan persentase perubahan
- Drill-down interaktif pada grafik
- Heatmap visualisasi
- Target/goal tracking
- Share via WhatsApp
- Notifikasi milestone

### Majoo

**Kelebihan analitik Majoo:**
- Multi-outlet comparison dalam satu grafik
- Laporan HPP detail per bahan baku (recipe costing)
- Laporan shift per kasir dengan cash drawer balance
- Forecasting sederhana berdasarkan tren historis
- Laporan laba rugi yang lebih lengkap (termasuk biaya operasional)
- Laporan promo: efektivitas setiap promosi yang berjalan

**Yang TiloPOS belum miliki dibanding Majoo:**
- Multi-outlet overlay comparison chart
- Recipe costing report (HPP per resep)
- Cash drawer / shift settlement report
- Forecasting
- Full P&L (termasuk biaya operasional, bukan hanya laba kotor)
- Promo effectiveness report

### iSeller

**Kelebihan analitik iSeller:**
- Customer analytics: RFM segmentation, customer lifetime value
- Channel performance: omnichannel sales breakdown (offline vs online)
- Cohort analysis untuk customer retention
- A/B testing untuk menu/product placement
- Real-time dashboard dengan websocket update (tanpa refresh)
- Custom report builder: pilih metrics, dimensions, dan chart type

**Yang TiloPOS belum miliki dibanding iSeller:**
- Customer analytics (RFM, CLV)
- Omnichannel breakdown
- Cohort analysis
- Custom report builder
- Real-time websocket update untuk laporan

### Ringkasan Gap vs Kompetitor

| Fitur | Moka | Majoo | iSeller | TiloPOS |
|-------|------|-------|---------|---------|
| KPI Cards | Ya | Ya | Ya | Ya |
| Bar/Line Chart | Ya | Ya | Ya | Ya |
| Pie Chart | Ya | Ya | Ya | Ya |
| Period Comparison | Ya | Ya | Ya | Tidak |
| Drill-down | Ya | Partial | Ya | Tidak |
| Multi-outlet Comparison | Partial | Ya | Ya | Tidak |
| Heatmap | Ya | Tidak | Partial | Tidak |
| Goal/Target Tracking | Ya | Tidak | Partial | Tidak |
| Forecasting | Tidak | Ya | Partial | Tidak |
| Custom Report Builder | Tidak | Tidak | Ya | Tidak |
| Customer Analytics | Partial | Partial | Ya | Tidak |
| Recipe Costing | Partial | Ya | Tidak | Tidak |
| Export PDF/Excel | Ya | Ya | Ya | Ya |
| Share via WA | Ya | Tidak | Tidak | Tidak |
| Scheduled Reports | Ya | Ya | Ya | Ya |
| Mobile Optimized | Ya | Ya | Ya | Ya |

---

## Best Practice dari Industri Global

### Square Analytics

**Fitur unggulan:**
- **Comparison mode**: setiap metrik otomatis menampilkan perubahan vs periode sebelumnya ("+12.3% vs last month")
- **Gross Sales Funnel**: visualisasi dari Gross Sales > Discounts > Refunds > Net Sales > Tips > Tax > Net Revenue
- **Team performance dashboard**: grafik radar per karyawan dengan multiple metrics (speed, sales, rating)
- **Auto-insights**: AI-generated insights seperti "Sales typically drop 15% on Mondays" atau "Item X sells 3x more when paired with Item Y"

**Relevansi untuk TiloPOS:**
- Perbandingan periode bisa ditambahkan ke setiap KPI card sebagai subtitle
- Funnel visualisasi dari gross ke net sangat membantu pemahaman keuangan
- Auto-insights sederhana bisa diimplementasikan dengan rule-based logic

### Toast Reporting (F&B focused)

**Fitur unggulan:**
- **Labor cost overlay**: grafik penjualan dengan overlay biaya tenaga kerja per jam
- **Food cost percentage tracking**: real-time tracking food cost vs target
- **Menu engineering matrix**: kuadran 4 (Star, Puzzle, Plow Horse, Dog) berdasarkan popularity dan profitability
- **Daypart analysis**: penjualan per daypart (breakfast, lunch, dinner, late night)
- **Comps and voids dashboard**: khusus untuk monitoring pembatalan dan kompensasi

**Relevansi untuk TiloPOS:**
- Menu engineering matrix sangat berguna untuk F&B: plot produk di kuadran popularity vs profitability
- Daypart analysis lebih intuitif dari "per jam" untuk restoran
- Comps and voids dashboard sudah partially covered di tab "Pesanan Batal" dan "Item Void"

### Lightspeed Analytics

**Fitur unggulan:**
- **Multi-location benchmarking**: ranking outlet berdasarkan berbagai metrik
- **Inventory turnover rate**: berapa kali stok berputar dalam periode tertentu
- **Break-even calculator**: berapa penjualan minimum untuk menutup biaya
- **Custom dashboards**: drag-and-drop widgets untuk membuat dashboard sendiri
- **Scheduled email reports**: email dengan inline charts, bukan lampiran

**Relevansi untuk TiloPOS:**
- Multi-location benchmarking sangat relevan untuk bisnis multi-outlet
- Inventory turnover rate bisa ditambahkan ke laporan inventaris
- Scheduled email dengan inline charts lebih baik dari lampiran PDF

---

## Asesmen Visualisasi Data

### Chart Types yang Digunakan Saat Ini

| Laporan | Chart Type | Library | Evaluasi |
|---------|-----------|---------|----------|
| Penjualan | Vertical BarChart | Recharts | Tepat untuk time series harian. Radius sudut atas memberikan kesan modern. |
| Produk | Horizontal BarChart | Recharts | Tepat untuk ranking. Layout horizontal cocok untuk nama produk panjang. Width Y-axis 120px mungkin kurang untuk nama panjang. |
| Pembayaran | PieChart | Recharts | Tepat untuk distribusi proporsi. Label persentase langsung di chart bagus. |
| Inventaris | Tidak ada chart | - | Kurang. Data top/slow moving cocok divisualisasikan dengan horizontal bar chart. |
| Dapur | Progress bars | shadcn | Tepat untuk jam sibuk. Tapi kurang untuk trend waktu persiapan. |
| Meja | Progress bars | shadcn | Tepat untuk okupansi. Tapi performa meja lebih baik dengan scatter plot (revenue vs turnover). |
| Staff | Progress bars | shadcn | Tepat untuk breakdown layanan. Leaderboard sudah visual dengan ranking. |
| Reservasi | Progress bars | shadcn | Cukup untuk booking per hari. Bisa lebih baik dengan bar chart. |

### Palet Warna

**Laporan inti:** Menggunakan CSS variable `hsl(var(--primary))` untuk warna utama chart. Konsisten dengan design system.

**Payment pie chart:** Menggunakan hardcoded colors: primary, emerald-500, amber-500, red-500, violet-500, pink-500, cyan-500. Ini bermasalah karena:
- 7 warna terbatas (jika ada > 7 metode, warna akan berulang)
- Tidak semua kombinasi warna accessible untuk color-blind users
- Hardcoded hex values tidak mengikuti dark mode

**Alert colors:** Kuning untuk stok rendah, merah untuk stok habis, hijau untuk tepat waktu — sesuai konvensi umum.

### Readability

**Positif:**
- Tooltip di semua chart memberikan detail on-hover
- Format angka menggunakan `formatCurrency` (Rp 1.500.000) dan `formatCurrencyCompact` (1,5 Jt)
- Grid lines halus (`strokeDasharray="3 3"`) tidak mengganggu data
- Warna text menggunakan `hsl(var(--muted-foreground))` yang kontrasnya cukup

**Perlu perbaikan:**
- Font size sumbu chart menggunakan `text-xs` yang mungkin terlalu kecil di desktop besar
- Tidak ada chart title di dalam chart area (hanya di CardHeader)
- BarChart tidak menampilkan data label di atas bar (hanya bisa dilihat via hover)
- PieChart tidak menampilkan nilai absolut (hanya persentase)

### Rekomendasi Visualisasi

1. **Tambahkan Line Chart** untuk tren jangka panjang (mingguan/bulanan)
2. **Tambahkan Area Chart** untuk visualisasi revenue vs cost over time
3. **Tambahkan Heatmap** untuk distribusi penjualan per jam x hari dalam seminggu
4. **Tambahkan Scatter Plot** untuk menu engineering (popularity vs profitability)
5. **Gunakan chart theme dari CSS variables** untuk konsistensi dark/light mode
6. **Tambahkan data labels** pada bar chart untuk angka penting
7. **Tambahkan dual-axis chart** untuk menampilkan revenue dan transaction count sekaligus

---

## Gap Analysis

### Missing Reports

| Laporan | Deskripsi | Prioritas | Effort |
|---------|-----------|-----------|--------|
| Laporan Promo/Diskon | Efektivitas setiap promosi yang berjalan: berapa transaksi menggunakan promo, ROI promo | Tinggi | Medium |
| Laporan Pelanggan | RFM analysis, customer frequency, average spend per customer | Tinggi | Medium |
| Laporan Shift/Kasir | Cash drawer balance per shift, login/logout time, selisih kas | Tinggi | Medium |
| Perbandingan Outlet | Multi-outlet comparison chart dan ranking | Medium | Medium |
| Laporan Bahan Baku | HPP per resep, usage vs purchase, food cost percentage | Medium | High |
| Laporan Trend | Analisis tren mingguan/bulanan/tahunan dengan line chart | Medium | Low |
| Laporan Pajak Khusus | Summary PPN, service charge, pajak lainnya dalam format siap SPT | Medium | Low |
| Laporan Piutang | Aging report untuk invoice B2B yang belum dibayar | Low | Medium |
| Laporan Absensi | Kehadiran staff, jam kerja, overtime | Low | Medium |
| Custom Report Builder | User bisa pilih metrics, dimensions, filters, dan chart type sendiri | Low | High |

### Missing Filters

| Laporan | Filter yang Kurang | Prioritas |
|---------|-------------------|-----------|
| Penjualan | Filter per kategori produk, per kasir, per metode pembayaran | Tinggi |
| Produk | Filter per kategori, sort by revenue/quantity/name | Tinggi |
| Semua laporan | Filter per outlet (saat ini hanya mengikuti outlet yang dipilih di navbar) | Tinggi |
| Inventaris | Filter per kategori, per supplier, per warehouse | Medium |
| Transaksi | Filter per metode pembayaran, per range harga | Medium |
| Dapur | Filter per station/counter dapur | Low |

### Missing Drill-Down

| Saat ini | Drill-down yang diharapkan |
|----------|---------------------------|
| Bar chart penjualan harian | Klik hari -> lihat penjualan per jam hari itu |
| Top 10 produk | Klik produk -> lihat penjualan harian produk itu |
| Pie chart pembayaran | Klik metode -> lihat transaksi yang menggunakan metode itu |
| KPI card total penjualan | Klik -> navigasi ke riwayat transaksi periode yang sama |
| Stok rendah/habis | Klik jumlah -> lihat daftar produk yang dimaksud |
| Staff leaderboard | Klik staff -> lihat detail transaksi per staff |

### Missing Comparisons

| Tipe Perbandingan | Deskripsi |
|-------------------|-----------|
| Period-over-period | Bulan ini vs bulan lalu, minggu ini vs minggu lalu |
| Year-over-year | Februari 2026 vs Februari 2025 |
| Outlet-over-outlet | Outlet A vs Outlet B dalam metrik yang sama |
| Target vs Actual | Set target penjualan, bandingkan dengan aktual |
| Day-over-day | Hari ini vs kemarin |

---

## Top 10 Perbaikan UX

### 1. Tambahkan Perbandingan Periode (Period Comparison)

**Masalah:** Saat ini setiap metrik menampilkan angka absolut tanpa konteks. Pengguna tidak tahu apakah angka itu bagus atau buruk tanpa membandingkan sendiri.

**Solusi:** Tambahkan subtitle di setiap KPI card yang menampilkan perubahan vs periode sebelumnya.

Contoh: "Total Penjualan: Rp 45.000.000 (+12.3% vs bulan lalu)"

**Implementasi:** Di backend, query data untuk periode sebelumnya (misal: jika filter "bulan ini", query juga "bulan lalu"). Di frontend, hitung persentase perubahan dan tampilkan dengan warna hijau (naik) atau merah (turun).

**Prioritas:** Sangat Tinggi | **Effort:** Medium

### 2. Implementasikan Drill-Down pada Grafik

**Masalah:** Grafik saat ini hanya bisa di-hover untuk tooltip. Tidak ada interaksi lebih lanjut. Pengguna yang melihat spike di hari tertentu harus berpindah halaman dan manual set filter tanggal untuk investigasi.

**Solusi:** Buat bar pada chart bisa diklik. Klik bar harian di Laporan Penjualan akan menampilkan detail per jam untuk hari itu (bisa dalam modal atau expand section). Klik produk di Top 10 akan menampilkan trend penjualan produk itu.

**Prioritas:** Tinggi | **Effort:** Medium

### 3. Standarisasi Fitur Export dan Calculation Help untuk Semua Laporan

**Masalah:** Laporan inti (Penjualan, Produk, Keuangan, Pembayaran) memiliki `ExportButtons`, `DataTimestamp`, dan `CalculationHelp`. Tapi 5 laporan kontekstual (Inventaris, Dapur, Meja, Staff, Reservasi) tidak memiliki fitur export dan calculation help.

**Solusi:** Tambahkan `ExportButtons` dan `DataTimestamp` ke semua 5 laporan kontekstual. Tambahkan `CalculationHelp` tooltips ke metrik yang membutuhkan penjelasan (misal: Table Turnover, Margin, On-Time Rate).

**Prioritas:** Tinggi | **Effort:** Low

### 4. Tambahkan Filter per Kategori dan Kasir di Laporan Penjualan

**Masalah:** Laporan penjualan saat ini hanya bisa difilter berdasarkan periode dan outlet. Tidak bisa drill-down per kategori produk atau per kasir tanpa berpindah ke Laporan Penjualan Detail.

**Solusi:** Tambahkan dropdown filter di header laporan: "Semua Kategori" dan "Semua Kasir". Filter ini akan menyaring data di KPI cards dan chart.

**Prioritas:** Tinggi | **Effort:** Medium

### 5. Tambahkan Grafik di Laporan Keuangan

**Masalah:** Laporan Keuangan saat ini hanya menampilkan 4 KPI cards tanpa visualisasi apapun. Ini adalah laporan yang paling "kosong" secara visual. Untuk sebuah laporan keuangan, ini kurang informatif.

**Solusi:** Tambahkan:
- **Stacked bar chart** atau **waterfall chart**: Pendapatan -> HPP -> Laba Kotor (visualisasi alur keuangan)
- **Line chart tren margin**: margin laba kotor per hari/minggu
- **Revenue breakdown**: pie chart atau bar chart per kategori sumber pendapatan

**Prioritas:** Tinggi | **Effort:** Medium

### 6. Perbaiki Konsistensi Layout Laporan Kontekstual

**Masalah:** Laporan inti menggunakan pattern: Export bar di atas -> KPI cards -> Chart -> Table. Laporan kontekstual menggunakan pattern yang berbeda-beda: KPI cards -> Cards berisi list. Inkonsistensi ini membuat user harus re-learn layout setiap berpindah tab.

**Solusi:** Standarisasi semua laporan dengan layout yang sama:
1. Data timestamp + Export buttons (bar atas)
2. KPI Summary cards (grid)
3. Primary chart (visualisasi utama)
4. Secondary content (tabel detail atau cards tambahan)

**Prioritas:** Medium | **Effort:** Medium

### 7. Implementasikan Auto-Refresh dengan Indikator

**Masalah:** Data menggunakan cache 5 menit (`staleTime: 5 * 60 * 1000`) tapi tidak ada indikator visual kapan data akan di-refresh. User yang membiarkan halaman laporan terbuka tidak tahu apakah datanya masih segar.

**Solusi:**
- Tambahkan countdown atau relative time indicator ("Data diperbarui 3 menit lalu")
- Tampilkan subtle loading indicator saat background refetch terjadi
- Tambahkan tombol refresh manual yang eksplisit

**Prioritas:** Medium | **Effort:** Low

### 8. Optimalkan Mobile Report dengan Conditional Tab

**Masalah:** Versi mobile halaman Laporan hanya menampilkan 4 tab (Penjualan, Produk, Keuangan, Pembayaran) dalam grid 4 kolom. Laporan kontekstual (Inventaris, Dapur, Meja, Staff, Reservasi) tidak tersedia di versi mobile.

**Solusi:** Terapkan logic yang sama dengan versi desktop — tampilkan tab kontekstual berdasarkan `useBusinessFeatures()`. Gunakan horizontal scroll untuk menampung lebih banyak tab.

**Prioritas:** Medium | **Effort:** Low

### 9. Tambahkan Benchmarks dan Target di KPI Cards

**Masalah:** Angka metrik ditampilkan tanpa konteks. User tidak tahu apakah margin 45% itu bagus atau buruk untuk tipe bisnisnya.

**Solusi:**
- Tampilkan benchmark industri sebagai referensi (misal: "Margin rata-rata F&B: 60-70%")
- Tambahkan fitur set target: owner bisa set target penjualan bulanan, lalu KPI card menampilkan progress bar menuju target
- Gunakan warna indikator: hijau jika di atas target/benchmark, kuning jika mendekati, merah jika di bawah

**Prioritas:** Medium | **Effort:** Medium

### 10. Tambahkan Tombol Share dan Quick Actions

**Masalah:** Untuk membagikan laporan, user harus export dulu lalu kirim manual via email atau chat. Ini memakan beberapa langkah.

**Solusi:**
- Tombol "Bagikan" yang bisa share via WhatsApp (deep link ke WhatsApp Web/Mobile dengan teks ringkasan)
- Tombol "Kirim via Email" untuk langsung email laporan PDF ke alamat tertentu
- Tombol "Copy Summary" untuk copy ringkasan metrik ke clipboard dalam format teks

**Prioritas:** Low | **Effort:** Medium

---

## Review Fungsi Export

### Status Saat Ini

**Komponen yang digunakan:** `ExportButtons` (shared component) yang menerima props:
- `title` — judul laporan
- `headers` — header kolom tabel
- `data` — array data baris
- `filename` — nama file output
- `summary` — array label-value untuk ringkasan di akhir
- `outletName` — nama outlet untuk header
- `period` — periode laporan untuk header
- `columnStyles` — styling per kolom (alignment)

**Format yang tersedia:**
- PDF (via jsPDF atau library serupa)
- Excel (.xlsx)

### Evaluasi Export

**Positif:**
- Penamaan file otomatis dan informatif
- Summary section di akhir laporan (total, rata-rata, dll)
- Header dengan nama bisnis, outlet, dan periode
- Column styling support (alignment)
- Semua 4 laporan inti mendukung export
- Riwayat transaksi (semua tab) mendukung export

**Gap:**
- 5 laporan kontekstual TIDAK memiliki export (Inventaris, Dapur, Meja, Staff, Reservasi)
- Tidak ada format CSV (hanya PDF dan Excel)
- Grafik/chart tidak disertakan dalam export PDF — hanya data tabel
- Tidak ada opsi memilih kolom mana yang mau di-export
- Tidak ada watermark atau keamanan di file export
- Tidak ada progress indicator untuk export file besar
- Tidak ada riwayat export (untuk audit trail)

### Rekomendasi

1. **Tambahkan export ke semua laporan kontekstual** — prioritas tinggi
2. **Sertakan chart sebagai gambar di export PDF** — gunakan html2canvas atau Recharts export API
3. **Tambahkan format CSV** — sangat sederhana, hanya perlu konversi array ke comma-separated
4. **Tambahkan opsi pilih kolom** — checkbox sebelum export untuk memilih kolom yang diinginkan
5. **Tambahkan progress indicator** — terutama untuk export data periode panjang

---

## Asesmen Real-Time vs Cached Data

### Arsitektur Saat Ini

- **Frontend caching:** TanStack Query dengan `staleTime: 5 * 60 * 1000` (5 menit)
- **Refetch on window focus:** Dinonaktifkan (`refetchOnWindowFocus: false`)
- **Backend caching:** Berdasarkan arsitektur backend, kemungkinan Redis cache di infrastructure layer
- **Real-time updates:** WebSocket (Socket.IO) tersedia di sistem untuk KDS dan orders, tapi TIDAK digunakan untuk laporan

### Evaluasi

**Untuk laporan, cache 5 menit umumnya acceptable** karena:
- Laporan bersifat retrospektif — user melihat data historis
- Aggregation queries berat, caching mengurangi beban database
- Refresh terlalu sering tidak memberikan value tambah yang signifikan

**Namun ada beberapa area yang memerlukan data lebih segar:**
- Dashboard penjualan "Hari Ini" — owner yang aktif monitoring harapkan near real-time
- Laporan Dapur — chef/manager perlu data performa yang current
- Settlement tracking — accountant perlu data terkini untuk rekonsiliasi

### Rekomendasi

| Area | Strategi | staleTime |
|------|----------|-----------|
| Laporan harian (filter "Hari Ini") | Kurangi staleTime, aktifkan refetchOnWindowFocus | 1 menit |
| Laporan mingguan/bulanan | Pertahankan | 5 menit |
| Laporan tahunan | Tingkatkan | 15 menit |
| Settlement / Transaksi | Kurangi staleTime | 2 menit |
| Laporan Dapur (real-time ops) | Gunakan WebSocket untuk push update | Live |

**Implementasi WebSocket untuk Laporan Dapur:**
Sistem sudah menggunakan Socket.IO untuk KDS. Extend event listener untuk push update ke komponen KitchenReport ketika ada pesanan baru selesai, sehingga metrik (avg prep time, completion rate) update secara live tanpa polling.

---

## UX Laporan di Mobile

### Status Saat Ini

**Halaman yang memiliki versi mobile terpisah:**
- `reports-page.mobile.tsx` — halaman utama laporan
- `sales-report-page.mobile.tsx` — laporan penjualan detail

**Pattern yang digunakan di mobile:**
- Bottom sheet untuk pemilihan periode (bukan dropdown)
- Grid 4 kolom untuk tab laporan
- Horizontal scrollable chips untuk sub-section di laporan penjualan detail
- Date preset buttons (Hari Ini, Minggu Ini, Bulan Ini)
- `MobileNavSpacer` untuk menghindari konten tertutup bottom navigation

### Evaluasi UX Mobile

**Positif:**
- Bottom sheet untuk date range sangat mobile-friendly (area sentuh besar)
- Komponen laporan (SalesReport, ProductReport, dll) sudah responsive dan bisa dipakai langsung
- Layout vertikal scroll cocok untuk mobile
- Chip navigation bisa di-scroll horizontal tanpa memakan ruang vertikal

**Masalah:**
1. **Hanya 4 tab di mobile** — Laporan kontekstual (Inventaris, Dapur, Meja, Staff, Reservasi) tidak muncul di versi mobile. Ini gap fungsional yang signifikan.
2. **Grafik sulit dibaca di layar kecil** — BarChart width 100% tapi label sumbu X bisa overlap jika banyak data point (misal: 30 hari).
3. **Tabel DataTable tidak dioptimasi** — tabel lebar akan horizontal scroll, yang kurang nyaman di mobile.
4. **Tidak ada pull-to-refresh** — gesture umum di mobile untuk refresh data.
5. **Export file di mobile** — download file mungkin problematik di beberapa browser mobile.
6. **Tidak ada offline caching** — jika koneksi putus, halaman kosong.

### Rekomendasi Mobile

1. **Tambahkan tab laporan kontekstual di mobile** — gunakan horizontal scroll tabs
2. **Gunakan responsive chart config** — kurangi label di sumbu X untuk periode panjang di mobile
3. **Tambahkan card-based view** untuk data tabel di mobile (selain tabel, tampilkan sebagai card list yang lebih mobile-friendly)
4. **Implementasikan pull-to-refresh** — gesture standard di mobile
5. **Optimasi chart touch interaction** — tooltip on-tap (bukan hover), pinch-to-zoom pada grafik
6. **Pertimbangkan PWA caching** — cache data laporan terakhir untuk akses offline

---

## Roadmap Implementasi

### Fase 1: Quick Wins (1-2 Sprint, Effort Rendah, Impact Tinggi)

| No | Item | Effort | Impact |
|----|------|--------|--------|
| 1.1 | Standarisasi ExportButtons + DataTimestamp ke 5 laporan kontekstual | Low | Tinggi |
| 1.2 | Tambahkan tab laporan kontekstual di versi mobile | Low | Tinggi |
| 1.3 | Implementasi auto-refresh indicator ("Diperbarui X menit lalu") + tombol refresh manual | Low | Medium |
| 1.4 | Perbaiki inkonsistensi bahasa (Table Turnover -> Perputaran Meja, dll) | Low | Low |
| 1.5 | Tambahkan CalculationHelp ke metrik di laporan kontekstual | Low | Medium |

### Fase 2: Peningkatan Analitik Core (2-3 Sprint, Effort Medium, Impact Tinggi)

| No | Item | Effort | Impact |
|----|------|--------|--------|
| 2.1 | Period-over-period comparison di semua KPI cards | Medium | Sangat Tinggi |
| 2.2 | Tambahkan grafik ke Laporan Keuangan (waterfall chart revenue, tren margin) | Medium | Tinggi |
| 2.3 | Filter per kategori dan kasir di Laporan Penjualan | Medium | Tinggi |
| 2.4 | Drill-down: klik bar chart harian -> detail per jam | Medium | Tinggi |
| 2.5 | Laporan Shift/Kasir (cash drawer, login/logout, selisih kas) | Medium | Tinggi |
| 2.6 | Tambahkan format export CSV | Low | Medium |

### Fase 3: Laporan Lanjutan (3-4 Sprint, Effort Medium-High, Impact Medium)

| No | Item | Effort | Impact |
|----|------|--------|--------|
| 3.1 | Laporan Promo/Diskon (efektivitas promosi, ROI) | Medium | Tinggi |
| 3.2 | Laporan Pelanggan (frequency, avg spend, top customers) | Medium | Tinggi |
| 3.3 | Multi-outlet comparison chart dan ranking | Medium | Medium |
| 3.4 | Target/goal tracking dengan progress indicator | Medium | Medium |
| 3.5 | Sertakan chart sebagai gambar di export PDF | Medium | Medium |
| 3.6 | Share laporan via WhatsApp / email langsung | Medium | Medium |

### Fase 4: Analytics Matang (4-6 Sprint, Effort High, Impact Medium-High)

| No | Item | Effort | Impact |
|----|------|--------|--------|
| 4.1 | Menu Engineering Matrix (popularity vs profitability quadrant) | Medium | Tinggi |
| 4.2 | Heatmap penjualan (jam x hari dalam seminggu) | Medium | Medium |
| 4.3 | Recipe costing / HPP per resep | High | Tinggi |
| 4.4 | Full P&L (termasuk biaya operasional, sewa, gaji) | High | Tinggi |
| 4.5 | Forecasting sederhana berdasarkan tren historis | High | Medium |
| 4.6 | Real-time dashboard via WebSocket untuk Laporan Dapur | Medium | Medium |

### Fase 5: Enterprise Features (6+ Sprint, Effort High, Impact Medium)

| No | Item | Effort | Impact |
|----|------|--------|--------|
| 5.1 | Custom Report Builder (pilih metrics, dimensions, chart) | Very High | Medium |
| 5.2 | Customer Analytics (RFM segmentation, CLV, cohort analysis) | High | Medium |
| 5.3 | Auto-insights berbasis rule engine ("Penjualan Senin turun 15% dari rata-rata") | High | Medium |
| 5.4 | API endpoint publik untuk integrasi dengan BI tools (Metabase, Google Data Studio) | High | Low |
| 5.5 | Scheduled email dengan inline charts (bukan lampiran) | Medium | Low |

### Timeline Estimasi

```
Q1 2026: Fase 1 (Quick Wins) + mulai Fase 2
Q2 2026: Selesaikan Fase 2 + mulai Fase 3
Q3 2026: Selesaikan Fase 3 + mulai Fase 4
Q4 2026: Selesaikan Fase 4 + mulai Fase 5
Q1 2027: Selesaikan Fase 5
```

### Prioritas per User Persona

| Persona | Fitur Paling Dibutuhkan | Fase |
|---------|------------------------|------|
| Owner UMKM | Period comparison, target tracking, share via WA | 2, 3 |
| Manager Restoran | Kitchen heatmap, menu engineering, shift report | 2, 4 |
| Akuntan | Full P&L, pajak, export CSV, recipe costing | 2, 3, 4 |
| Multi-outlet Owner | Outlet comparison, benchmarking, custom dashboard | 3, 5 |
| Tim Operasional | Real-time dapur, drill-down, mobile optimization | 1, 2 |
