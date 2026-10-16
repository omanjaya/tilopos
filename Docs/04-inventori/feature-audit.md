# Audit Fitur — Modul Inventori TiloPOS

Dokumen audit mendalam untuk setiap sub-fitur modul Inventori TiloPOS. Mencakup evaluasi UX, analisis kompetitif, gap analysis, dan roadmap perbaikan.

---

## Daftar Isi

1. [Status Saat Ini per Sub-Fitur](#1-status-saat-ini-per-sub-fitur)
2. [Evaluasi UX Heuristic per Sub-Fitur](#2-evaluasi-ux-heuristic-per-sub-fitur)
3. [Analisis Kompetitif](#3-analisis-kompetitif)
4. [Referensi Best Practice](#4-referensi-best-practice)
5. [Gap Analysis per Sub-Fitur](#5-gap-analysis-per-sub-fitur)
6. [Top 15 Perbaikan UX (Diprioritaskan)](#6-top-15-perbaikan-ux-diprioritaskan)
7. [Deep-Dive: Stock Opname UX](#7-deep-dive-stock-opname-ux)
8. [Evaluasi Alur Transfer](#8-evaluasi-alur-transfer)
9. [Assessment Lifecycle PO](#9-assessment-lifecycle-po)
10. [Moving Average Cost: Pertimbangan Akurasi](#10-moving-average-cost-pertimbangan-akurasi)
11. [Review Pengalaman Mobile Inventory](#11-review-pengalaman-mobile-inventory)
12. [Roadmap Implementasi](#12-roadmap-implementasi)

---

## 1. Status Saat Ini per Sub-Fitur

| # | Sub-Fitur | Status | Feature Flag | Catatan |
|---|---|---|---|---|
| 1 | Stock Management | Aktif | `STOCK_MANAGEMENT` | Fitur inti, selalu aktif. Dashboard stok, reorder alert, dan stock valuation sudah berfungsi. Real-time update via WebSocket belum optimal untuk high-frequency transaction. |
| 2 | Stock Opname | Aktif | `STOCK_OPNAME` | Workflow draft-in_progress-completed sudah berjalan. Discrepancy report otomatis. Belum ada mode offline untuk penghitungan. Barcode scanning tersedia di mobile tapi masih lambat. |
| 3 | Stock Transfer | Aktif | `STOCK_TRANSFER` | Transfer antar outlet dengan status tracking sudah berjalan. Template transfer sudah ada. Timeline tracking tercatat. Belum ada approval workflow untuk transfer bernilai tinggi. |
| 4 | Supplier Management | Aktif | `SUPPLIER_MANAGEMENT` | Database supplier dengan CRUD lengkap. Hubungan produk-supplier sudah ada. Supplier comparison dan analytics masih dasar — hanya menampilkan data tanpa insight actionable. |
| 5 | Purchase Order | Aktif | `PURCHASE_ORDER` | Lifecycle PO lengkap dari draft sampai paid. Receiving goods dengan partial receive. Payment tracking tersedia. Belum ada PO approval workflow dan PO recurring otomatis. |
| 6 | Price Tiers | Aktif | `PRICE_TIERS` | Tier berdasarkan kuantitas dan tipe pelanggan. Integrasi dengan POS sudah berjalan. Belum bisa set tier per outlet dan belum ada bulk price tier editing. |
| 7 | Unit Conversion | Aktif | `UNIT_CONVERSION` | Konversi satuan dasar sudah berfungsi. Multi-level conversion (karton → box → pcs) berjalan. Barcode per satuan sudah didukung. Edge case pada konversi desimal perlu perhatian. |
| 8 | Batch & Expiry | Aktif | `BATCH_EXPIRY` | Tracking batch saat receiving, FIFO enforcement di POS, alert kadaluarsa. Batch history tersedia. Belum ada integrasi alert ke promosi otomatis. Laporan batch kurang visual. |
| 9 | Serial Number | Aktif | `SERIAL_NUMBER` | Input serial saat receiving dan penjualan. Status tracking per unit. Bulk import CSV tersedia. Belum ada warranty tracking otomatis dan belum terintegrasi dengan modul retur secara mendalam. |
| 10 | Product Assignment | Aktif | `PRODUCT_ASSIGNMENT` | Assign per outlet berjalan. Bulk assignment per kategori tersedia. Belum ada auto-assignment berdasarkan rule (misal: semua produk baru otomatis di-assign ke semua outlet). |
| 11 | Moving Average Cost | Aktif | `MOVING_AVG_COST` | Kalkulasi otomatis saat PO receive dan adjustment. Riwayat perubahan tercatat. Belum handle edge case: stok nol lalu masuk barang baru, dan adjustment tanpa harga. |
| 12 | Cost Price History | Aktif | `COST_HISTORY` | Riwayat perubahan HPP tercatat. Grafik tren tersedia. Belum ada comparative analysis antar supplier dan belum ada proyeksi/forecasting harga. |

---

## 2. Evaluasi UX Heuristic per Sub-Fitur

Evaluasi berdasarkan 10 heuristic Nielsen Norman, disederhanakan menjadi skor 1-5 per sub-fitur. Skor: 1 = Sangat Buruk, 2 = Buruk, 3 = Cukup, 4 = Baik, 5 = Sangat Baik.

### 2.1 Stock Management

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 4 | Stok real-time ditampilkan dengan indikator warna. Namun loading state untuk refresh data multi-outlet bisa lebih jelas. |
| Match with Real World | 4 | Terminologi sesuai dengan istilah inventory yang umum di Indonesia. |
| User Control & Freedom | 3 | Tidak ada undo untuk perubahan stok langsung. Filter bisa di-reset tapi state filter tidak persisten antar halaman. |
| Consistency & Standards | 4 | Konsisten dengan modul lain dalam TiloPOS. Layout tabel standar. |
| Error Prevention | 3 | Reorder alert sudah ada, tapi belum ada warning saat stok akan minus akibat transaksi yang sedang diproses. |
| Recognition over Recall | 4 | Informasi penting (stok, status, HPP) langsung terlihat tanpa perlu navigasi tambahan. |
| Flexibility & Efficiency | 3 | Belum ada keyboard shortcut, bulk actions terbatas, dan tidak ada customizable dashboard widget. |
| Aesthetic & Minimalist | 4 | Tampilan bersih, informasi tidak berlebihan. Card dan tabel terorganisir dengan baik. |
| Help & Documentation | 2 | Tooltip minim, belum ada in-app guidance atau onboarding tour untuk pengguna baru. |
| **Rata-rata** | **3.4** | |

### 2.2 Stock Opname

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Progress penghitungan (berapa persen selesai) kurang jelas. Status sesi terlihat tapi tanpa visual timeline. |
| Match with Real World | 4 | Alur draft → in_progress → completed sesuai dengan proses opname fisik. |
| User Control & Freedom | 3 | Bisa pause dan lanjutkan, tapi tidak bisa undo hitungan individual tanpa mengedit ulang. |
| Consistency & Standards | 4 | Konsisten dengan modul lain. |
| Error Prevention | 2 | Tidak ada validasi saat input angka sangat berbeda dari stok sistem (misal: stok 100, input 10000 — kemungkinan typo). |
| Recognition over Recall | 3 | Saat penghitungan, stok sistem disembunyikan (benar untuk akurasi), tapi tidak ada hint untuk produk mana yang biasanya punya selisih. |
| Flexibility & Efficiency | 2 | Scan barcode lambat di mobile, tidak ada batch input mode, tidak bisa import hitungan dari file. |
| Aesthetic & Minimalist | 3 | Halaman penghitungan cukup padat. Banyak kolom untuk produk dengan batch/serial. |
| Help & Documentation | 2 | Tidak ada panduan in-app untuk proses opname. |
| **Rata-rata** | **2.9** | |

### 2.3 Stock Transfer

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 4 | Timeline tracking jelas. Status transfer terlihat dengan indikator visual. |
| Match with Real World | 4 | Terminologi dan alur sesuai dengan proses transfer fisik. |
| User Control & Freedom | 3 | Bisa batalkan transfer yang masih draft, tapi cancel setelah dikirim prosesnya kurang intuitif. |
| Consistency & Standards | 4 | Konsisten. |
| Error Prevention | 3 | Validasi stok tersedia sebelum transfer, tapi tidak ada warning untuk transfer yang unusually besar. |
| Recognition over Recall | 3 | Template transfer membantu, tapi tidak ada saran produk berdasarkan stok level outlet tujuan. |
| Flexibility & Efficiency | 3 | Template tersedia, tapi belum ada auto-transfer berdasarkan rule. |
| Aesthetic & Minimalist | 4 | Layout bersih. Timeline visual informatif tanpa berlebihan. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **3.3** | |

### 2.4 Supplier Management

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Data supplier ditampilkan dengan baik, tapi analytics kurang visual dan kurang actionable. |
| Match with Real World | 4 | Field-field sesuai dengan kebutuhan pengelolaan supplier di Indonesia. |
| User Control & Freedom | 3 | CRUD standar. Tidak ada import/export supplier data. |
| Consistency & Standards | 4 | Konsisten. |
| Error Prevention | 3 | Validasi dasar (email, telepon), tapi tidak ada duplikasi detection. |
| Recognition over Recall | 3 | Informasi supplier tersebar di beberapa tab. Ringkasan supplier kurang komprehensif di satu pandangan. |
| Flexibility & Efficiency | 2 | Tidak ada bulk operations, tidak ada supplier portal, tidak ada komunikasi langsung (email/WhatsApp integration). |
| Aesthetic & Minimalist | 3 | Tampilan standar. Analytics dashboard kurang menarik secara visual. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **3.0** | |

### 2.5 Purchase Order

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 4 | Status PO jelas dengan badge warna. Payment tracking terlihat. |
| Match with Real World | 4 | Lifecycle PO sesuai dengan proses bisnis nyata. |
| User Control & Freedom | 3 | Draft bisa diedit bebas, tapi PO yang sudah dikirim sulit dimodifikasi. Cancel PO prosesnya kurang jelas. |
| Consistency & Standards | 4 | Konsisten. |
| Error Prevention | 3 | Validasi qty dan harga, tapi tidak ada warning saat harga beli sangat berbeda dari harga terakhir. |
| Recognition over Recall | 3 | Harga terakhir dari supplier ditampilkan, tapi tidak ada rekomendasi qty berdasarkan reorder point. |
| Flexibility & Efficiency | 3 | Bisa buat PO dari reorder alert, tapi belum ada PO recurring/scheduled dan belum ada PO template. |
| Aesthetic & Minimalist | 4 | Form PO terorganisir. Print layout baik. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **3.3** | |

### 2.6 Price Tiers

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Tier aktif terlihat di halaman produk, tapi preview harga di POS kurang jelas kapan tier berubah. |
| Match with Real World | 4 | Konsep grosir vs retail sudah familiar di pasar Indonesia. |
| User Control & Freedom | 3 | CRUD per produk. Tidak ada bulk editing. |
| Consistency & Standards | 3 | Integrasi dengan POS berjalan, tapi tampilan tier di POS berbeda style dengan halaman produk. |
| Error Prevention | 3 | Validasi harga tier harus lebih rendah dari tier sebelumnya, tapi tidak ada warning jika margin terlalu tipis. |
| Recognition over Recall | 3 | Kasir harus tahu bahwa pelanggan tertentu dapat harga khusus — tidak ada visual hint di POS. |
| Flexibility & Efficiency | 2 | Harus set per produk satu per satu. Belum ada template tier yang bisa di-apply massal. |
| Aesthetic & Minimalist | 3 | Tampilan cukup, tapi tabel tier bisa lebih visual (misalnya grafik step). |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **2.9** | |

### 2.7 Unit Conversion

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Stok ditampilkan dalam satuan dasar, tidak selalu jelas dalam satuan lain tanpa klik detail. |
| Match with Real World | 4 | Konversi box-pcs, kg-gram sudah intuitif. |
| User Control & Freedom | 3 | Bisa definisikan konversi custom. Tidak bisa edit konversi jika sudah ada transaksi terkait. |
| Consistency & Standards | 3 | Tampilan satuan di POS, PO, dan stok tidak selalu konsisten. |
| Error Prevention | 2 | Edge case konversi desimal (1 box = 10.5 kg) bisa menyebabkan pembulatan yang membingungkan. Tidak ada preview hasil konversi sebelum disimpan. |
| Recognition over Recall | 3 | Konversi ditampilkan di detail produk, tapi saat transaksi kasir harus ingat satuan mana yang tersedia. |
| Flexibility & Efficiency | 3 | Multi-level conversion berjalan. Barcode per satuan membantu. |
| Aesthetic & Minimalist | 3 | Tampilan konversi bisa lebih visual (diagram hierarki satuan). |
| Help & Documentation | 2 | Minim. Konversi satuan sering membingungkan pengguna baru. |
| **Rata-rata** | **2.9** | |

### 2.8 Batch & Expiry Tracking

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Alert kadaluarsa ada, tapi tidak prominent di dashboard utama. Stok per batch terlihat di detail. |
| Match with Real World | 4 | Konsep batch dan kadaluarsa sudah familiar. |
| User Control & Freedom | 3 | Bisa konfigurasi interval alert. Tidak bisa override FIFO secara manual jika diperlukan. |
| Consistency & Standards | 3 | Informasi batch tersebar: ada di stok, ada di PO receive, ada di laporan. Tidak ada satu halaman terpadu. |
| Error Prevention | 3 | Alert kadaluarsa ada, tapi tidak ada warning saat menerima batch dengan kadaluarsa sangat dekat. |
| Recognition over Recall | 3 | Daftar batch terlihat, tapi tidak ada visual calendar view untuk kadaluarsa. |
| Flexibility & Efficiency | 2 | Input batch saat receiving cukup manual dan memakan waktu. Belum ada quick-entry mode. |
| Aesthetic & Minimalist | 3 | Data batch bisa overwhelming untuk produk dengan banyak batch aktif. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **2.9** | |

### 2.9 Serial Number Tracking

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Status per serial number terlihat. Tapi untuk produk dengan ratusan serial, navigasi sulit. |
| Match with Real World | 4 | Konsep serial number familiar untuk elektronik. |
| User Control & Freedom | 3 | Bulk import CSV membantu. Tidak bisa bulk update status. |
| Consistency & Standards | 3 | Integrasi dengan POS dan retur masih belum seamless. |
| Error Prevention | 3 | Duplikasi detection ada. Tapi tidak ada validasi format serial number per produk. |
| Recognition over Recall | 3 | Search serial number berjalan, tapi tidak ada scan-to-find yang cepat. |
| Flexibility & Efficiency | 2 | Input satu per satu saat receiving lambat untuk volume besar. |
| Aesthetic & Minimalist | 3 | Tabel serial number standar. Bisa lebih informatif. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **2.9** | |

### 2.10 Product Assignment per Outlet

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Status assign terlihat per produk dan per outlet. Dashboard ketersediaan ada tapi kurang visual. |
| Match with Real World | 4 | Konsep produk yang tersedia/tidak tersedia per lokasi sudah intuitif. |
| User Control & Freedom | 3 | Toggle assign/unassign mudah. Bulk per kategori ada. |
| Consistency & Standards | 4 | Konsisten dengan modul lain. |
| Error Prevention | 3 | Warning saat unassign produk yang masih punya stok di outlet tersebut. Tapi tidak ada preview dampak. |
| Recognition over Recall | 3 | Matrix produk-outlet bisa lebih visual. |
| Flexibility & Efficiency | 3 | Bulk assignment membantu. Belum ada auto-rule. |
| Aesthetic & Minimalist | 3 | Tampilan standar. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **3.1** | |

### 2.11 Moving Average Cost

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 4 | HPP saat ini terlihat jelas di detail produk. Perubahan tercatat. |
| Match with Real World | 4 | Metode moving average umum digunakan dan dipahami. |
| User Control & Freedom | 2 | Tidak bisa manual override HPP. Tidak bisa pilih metode lain (FIFO cost, LIFO). |
| Consistency & Standards | 4 | Konsisten di semua tempat yang menampilkan HPP. |
| Error Prevention | 2 | Edge case stok nol belum di-handle dengan baik. Adjustment tanpa harga menggunakan HPP terakhir tanpa konfirmasi. |
| Recognition over Recall | 3 | Formula kalkulasi tidak ditampilkan saat HPP berubah. User harus ingat/mengerti cara kerja moving average. |
| Flexibility & Efficiency | 2 | Hanya moving average. Tidak ada opsi metode lain. Tidak ada simulasi "what if". |
| Aesthetic & Minimalist | 3 | Tampilan standar. Grafik HPP ada tapi basic. |
| Help & Documentation | 2 | Formula dan cara kerja tidak dijelaskan di dalam aplikasi. |
| **Rata-rata** | **2.9** | |

### 2.12 Cost Price History

| Kriteria | Skor | Keterangan |
|---|---|---|
| Visibility of System Status | 3 | Riwayat tercatat dan ditampilkan. Grafik tren ada tapi kurang interaktif. |
| Match with Real World | 4 | Konsep riwayat harga sudah familiar. |
| User Control & Freedom | 3 | Filter periode tersedia. Export tersedia. Tidak ada annotasi atau bookmark. |
| Consistency & Standards | 4 | Konsisten. |
| Error Prevention | 3 | Data read-only, tidak ada risiko error. |
| Recognition over Recall | 3 | Data tersaji, tapi insight dan analisis harus dilakukan manual oleh user. |
| Flexibility & Efficiency | 2 | Belum ada perbandingan antar supplier, belum ada forecasting, belum ada alert saat harga naik signifikan. |
| Aesthetic & Minimalist | 3 | Grafik basic. Bisa lebih interaktif dan informatif. |
| Help & Documentation | 2 | Minim. |
| **Rata-rata** | **3.0** | |

### Ringkasan Skor UX

| Sub-Fitur | Skor Rata-rata |
|---|---|
| Stock Management | 3.4 |
| Stock Transfer | 3.3 |
| Purchase Order | 3.3 |
| Product Assignment | 3.1 |
| Supplier Management | 3.0 |
| Cost Price History | 3.0 |
| Stock Opname | 2.9 |
| Price Tiers | 2.9 |
| Unit Conversion | 2.9 |
| Batch & Expiry | 2.9 |
| Serial Number | 2.9 |
| Moving Average Cost | 2.9 |
| **Rata-rata Keseluruhan** | **3.0** |

---

## 3. Analisis Kompetitif

### Perbandingan dengan Kompetitor Lokal dan Regional

| Fitur | TiloPOS | Moka | Majoo | iSeller | Jubelio | Accurate |
|---|---|---|---|---|---|---|
| **Stock Management** | Ya (real-time, multi-outlet) | Ya (multi-outlet) | Ya (multi-outlet) | Ya (multi-outlet) | Ya (multi-channel) | Ya (multi-gudang) |
| **Stock Opname** | Ya (workflow lengkap) | Ya (basic) | Ya (basic) | Ya (basic) | Ya (basic) | Ya (lengkap) |
| **Stock Transfer** | Ya (template, timeline) | Ya (basic) | Ya (approval) | Ya (basic) | Ya (antar warehouse) | Ya (lengkap) |
| **Supplier Management** | Ya (analytics, comparison) | Ya (basic CRUD) | Ya (basic CRUD) | Ya (basic CRUD) | Ya (multi-channel supplier) | Ya (lengkap, AP) |
| **Purchase Order** | Ya (lifecycle lengkap) | Ya (basic) | Ya (basic) | Ya (basic) | Ya (multi-channel) | Ya (lengkap, AP) |
| **Price Tiers** | Ya (qty + customer type) | Tidak | Ya (basic) | Ya (basic) | Ya (per channel) | Ya (lengkap) |
| **Unit Conversion** | Ya (multi-level) | Tidak | Ya (basic) | Tidak | Ya (basic) | Ya (multi-level) |
| **Batch & Expiry** | Ya (FIFO, alerts) | Tidak | Ya (basic) | Tidak | Ya (basic) | Ya (lengkap) |
| **Serial Number** | Ya (lifecycle tracking) | Tidak | Tidak | Tidak | Ya (basic) | Ya (lengkap) |
| **Product Assignment** | Ya (per outlet) | Ya (per outlet) | Ya (per outlet) | Ya (per outlet) | Ya (per channel) | Ya (per gudang) |
| **Moving Average Cost** | Ya (otomatis) | Ya (basic) | Ya (basic) | Ya (basic) | Ya (multi-method) | Ya (multi-method: avg, FIFO, LIFO) |
| **Cost Price History** | Ya (grafik tren) | Tidak | Tidak | Tidak | Ya (basic) | Ya (lengkap) |

### Insight Kompetitif

**vs Moka:**
Moka adalah market leader POS di Indonesia tapi fitur inventorinya relatif basic. Tidak ada batch tracking, serial number, unit conversion, atau price tiers. TiloPOS unggul signifikan di kedalaman fitur inventori. Namun, Moka unggul di UX polish dan ecosystem partnership (payment, delivery). Kelemahan Moka menjadi peluang TiloPOS untuk menarik bisnis yang butuh inventori lebih serius (grosir, toko bangunan, elektronik).

**vs Majoo:**
Majoo memiliki fitur inventory yang lebih lengkap dari Moka (ada unit conversion, batch basic), tapi implementasinya masih surface-level. Stock opname hanya basic counting tanpa workflow yang terstruktur. Approval workflow untuk transfer merupakan fitur yang TiloPOS belum miliki dan perlu diadopsi. UX Majoo lebih modern di beberapa area, terutama mobile experience.

**vs iSeller:**
iSeller fokus ke omnichannel commerce, inventori-nya adequate tapi tidak deep. Tidak ada batch tracking, serial number, atau unit conversion. TiloPOS unggul untuk bisnis yang inventory-intensive. iSeller lebih kuat di integrasi marketplace.

**vs Jubelio:**
Jubelio adalah inventory management yang kuat, terutama untuk multi-channel (marketplace sync). Fitur serialnya ada tapi basic. Multi-method costing (average, FIFO, specific) adalah fitur yang TiloPOS belum tawarkan. Per-channel pricing Jubelio menarik untuk bisnis omnichannel. TiloPOS perlu mempertimbangkan integrasi marketplace ke depan.

**vs Accurate:**
Accurate adalah software akuntansi yang punya modul inventori sangat lengkap. Multi-method costing, batch lengkap, serial number lengkap, AP/AR terintegrasi. Ini adalah benchmark untuk kelengkapan fitur. Namun, UX Accurate terasa "jadul" dan kurang user-friendly untuk pengguna non-akuntansi. TiloPOS punya peluang menawarkan fitur yang mendekati Accurate tapi dengan UX yang jauh lebih baik dan harga yang lebih terjangkau untuk UMKM.

---

## 4. Referensi Best Practice

### Vend by Lightspeed

**Yang bisa diadopsi:**
- **Inventory count workflow** yang sangat terstruktur: schedule count, assign teams, count, review, adjust — semua dalam satu flow yang mulus.
- **Smart reorder suggestions** berdasarkan velocity penjualan dan lead time supplier — bukan hanya reorder point statis.
- **Variant matrix view** untuk produk dengan banyak varian (ukuran x warna) — visualisasi stok yang intuitif.
- **Supplier return** workflow yang terintegrasi — jika barang rusak dari supplier, prosesnya jelas.
- **Inventory performance dashboard**: sell-through rate, days to sell, dead stock identification.

### Shopify Inventory

**Yang bisa diadopsi:**
- **Transfer status dengan notifikasi real-time** — penerima langsung tahu ada transfer masuk.
- **Inventory adjustment reasons** yang pre-defined dan customizable — memudahkan kategorisasi dan laporan.
- **Incoming inventory view**: tampilan konsolidasi semua PO, transfer, dan return yang akan menambah stok.
- **Inventory analysis**: ABC analysis, stok yang tidak bergerak, dan rekomendasi otomatis.
- **Bulk editor** yang powerful — edit ratusan produk sekaligus dalam interface spreadsheet-like.

### Square for Retail

**Yang bisa diadopsi:**
- **Barcode scanning UX** yang sangat cepat dan reliable di mobile — scan continuous tanpa delay antar scan.
- **Low stock report** yang actionable: bukan hanya daftar, tapi langsung bisa generate PO dari report.
- **Cost of goods tracking** yang transparan — setiap transaksi menampilkan margin.
- **Vendor management** yang simple tapi efektif — focus pada data yang benar-benar dibutuhkan, tidak over-complicated.
- **Print labels** langsung dari sistem inventory — barcode, harga, nama produk.

---

## 5. Gap Analysis per Sub-Fitur

### 5.1 Stock Management

| Area | Status Saat Ini | Best Practice / Kompetitor | Gap | Prioritas |
|---|---|---|---|---|
| Smart Reorder | Reorder alert statis (stok minimum manual) | Lightspeed: dynamic reorder berdasarkan velocity + lead time | Reorder point harus manual per produk, tidak adaptif terhadap perubahan pola penjualan | Tinggi |
| Inventory Performance | Stok level dan valuation saja | Lightspeed/Shopify: ABC analysis, sell-through rate, dead stock | Tidak ada analisis performa inventaris, hanya data mentah | Tinggi |
| Incoming Inventory | Tidak ada consolidated view | Shopify: tampilan semua incoming (PO, transfer, return) | User harus cek PO, transfer, return secara terpisah untuk tahu stok yang akan datang | Sedang |
| Label Printing | Belum ada | Square: print barcode labels dari inventory | Harus pakai tools terpisah untuk cetak label | Sedang |
| Bulk Editor | Filter dan sort saja | Shopify: inline bulk editing ala spreadsheet | Edit stok/harga/detail massal harus satu per satu | Tinggi |

### 5.2 Stock Opname

| Area | Status Saat Ini | Best Practice | Gap | Prioritas |
|---|---|---|---|---|
| Offline Mode | Tidak ada | Lightspeed: count offline, sync saat online | Jika koneksi terputus saat opname, data bisa hilang | Tinggi |
| Scheduled/Recurring | Manual create setiap kali | Lightspeed: schedule recurring counts | Tidak ada automation untuk opname berkala | Sedang |
| Cycle Count | Bisa filter per kategori | Vend: automated cycle count suggestion berdasarkan value/velocity | Belum ada rekomendasi cerdas produk mana yang perlu diopname | Sedang |
| Team Assignment | Basic assign petugas | Lightspeed: assign area/rak per petugas | Belum bisa assign per area/zona di dalam satu outlet | Sedang |
| Anomaly Detection | Discrepancy report setelah selesai | Best practice: real-time alert saat input sangat berbeda | Typo dan anomali baru ketahuan di akhir | Tinggi |

### 5.3 Stock Transfer

| Area | Status Saat Ini | Best Practice | Gap | Prioritas |
|---|---|---|---|---|
| Approval Workflow | Tidak ada | Majoo: approval untuk transfer bernilai tinggi | Transfer berapapun nilainya bisa langsung dikirim tanpa approval | Tinggi |
| Auto-Transfer | Manual saja | Best practice: auto-suggest transfer berdasarkan stok level antar outlet | Tidak ada intelligence untuk redistribusi stok | Sedang |
| Delivery Tracking | Timeline internal saja | Best practice: integrasi kurir, nomor resi, estimasi tiba | Tracking hanya status internal, tidak ada info pengiriman fisik | Rendah |

### 5.4 Supplier Management

| Area | Status Saat Ini | Best Practice | Gap | Prioritas |
|---|---|---|---|---|
| Supplier Portal | Tidak ada | Enterprise: supplier self-service portal | Komunikasi manual via telepon/WhatsApp | Rendah |
| Duplikasi Detection | Tidak ada | Best practice: fuzzy matching nama/alamat | Bisa ada supplier duplikat di database | Sedang |
| Performance Scoring | Analytics basic | Best practice: scorecard otomatis (on-time, quality, price) | Evaluasi supplier masih manual | Sedang |
| Communication | Tidak ada integrasi | Best practice: email PO langsung dari sistem | PO harus dikirim manual ke supplier | Tinggi |

### 5.5 Purchase Order

| Area | Status Saat Ini | Best Practice | Gap | Prioritas |
|---|---|---|---|---|
| Approval Workflow | Tidak ada | Best practice: approval matrix berdasarkan nilai PO | PO berapapun bisa langsung dikirim | Tinggi |
| Recurring PO | Manual setiap kali | Best practice: auto-generate PO berdasarkan schedule | PO rutin harus dibuat manual berulang-ulang | Sedang |
| PO Template | Belum ada | Best practice: template PO per supplier/kebutuhan rutin | Harus input produk dari awal setiap kali | Sedang |
| Price Variance Alert | Tidak ada | Best practice: warning saat harga di PO berbeda signifikan dari harga terakhir | Kenaikan harga dari supplier bisa tidak terdeteksi | Tinggi |
| Email/WhatsApp PO | Tidak ada | Best practice: kirim PO langsung ke supplier via email/WA | Harus export PDF, kirim manual | Tinggi |

### 5.6-5.12 Ringkasan Gap Lainnya

| Sub-Fitur | Gap Utama | Prioritas |
|---|---|---|
| Price Tiers | Bulk editing, tier per outlet, margin warning | Sedang |
| Unit Conversion | Handling desimal, preview konversi, tampilan satuan yang konsisten | Sedang |
| Batch & Expiry | Calendar view kadaluarsa, quick-entry mode, integrasi promosi otomatis | Tinggi |
| Serial Number | Warranty tracking otomatis, format validation, integrasi retur yang lebih dalam | Sedang |
| Product Assignment | Auto-rule assignment, impact preview saat unassign | Rendah |
| Moving Average Cost | Multi-method support, edge case handling, simulasi what-if | Sedang |
| Cost Price History | Comparative analysis, forecasting, alert kenaikan harga | Sedang |

---

## 6. Top 15 Perbaikan UX (Diprioritaskan)

Diprioritaskan berdasarkan kombinasi: dampak ke user (impact), frekuensi penggunaan (frequency), dan effort implementasi.

### Prioritas 1 — Quick Wins (Effort Rendah, Impact Tinggi)

**1. Anomaly Detection pada Input Stock Opname**
- **Masalah:** Input qty fisik yang sangat berbeda dari stok sistem (kemungkinan typo) tidak ada warning.
- **Solusi:** Tampilkan warning real-time saat input menyimpang lebih dari X% dari stok sistem. Contoh: "Stok sistem: 100, Anda memasukkan: 1000. Apakah ini benar?"
- **Impact:** Mengurangi error opname yang signifikan.
- **Effort:** Rendah — validasi frontend saja.

**2. Price Variance Alert pada PO**
- **Masalah:** Saat membuat PO, jika harga dari supplier naik, tidak ada warning.
- **Solusi:** Tampilkan badge "Harga naik X%" di samping harga dan highlight baris produk yang harganya berubah signifikan.
- **Impact:** Mencegah pembelian di harga yang tidak expected.
- **Effort:** Rendah — komparasi dengan data PO terakhir.

**3. Tooltip dan Contextual Help di Seluruh Modul**
- **Masalah:** Skor "Help & Documentation" konsisten rendah (2) di semua sub-fitur.
- **Solusi:** Tambahkan tooltip pada setiap field yang mungkin membingungkan, contextual help button yang membuka panel penjelasan, dan onboarding tour saat user pertama kali membuka fitur.
- **Impact:** Mengurangi learning curve signifikan.
- **Effort:** Rendah-Sedang — konten harus ditulis tapi implementasi teknis sederhana.

**4. Progress Indicator pada Stock Opname**
- **Masalah:** Saat opname berjalan, tidak jelas berapa persen yang sudah dihitung.
- **Solusi:** Progress bar: "42/120 produk sudah dihitung (35%)" dengan visual progress ring.
- **Impact:** Motivasi petugas dan estimasi waktu selesai.
- **Effort:** Rendah.

**5. Incoming Inventory Consolidated View**
- **Masalah:** Untuk tahu stok yang akan datang, user harus cek PO, transfer masuk, dan retur secara terpisah.
- **Solusi:** Widget "Stok Akan Datang" di dashboard inventory yang menggabungkan semua sumber incoming.
- **Impact:** Keputusan reorder lebih baik, menghindari over-ordering.
- **Effort:** Rendah-Sedang.

### Prioritas 2 — Medium Effort, High Impact

**6. Offline Mode untuk Stock Opname**
- **Masalah:** Jika koneksi terputus saat opname, data bisa hilang. Gudang sering tidak punya WiFi stabil.
- **Solusi:** Progressive Web App (PWA) dengan local storage untuk opname. Data disimpan lokal, sync ke server saat online.
- **Impact:** Opname bisa dilakukan di mana saja tanpa khawatir koneksi.
- **Effort:** Sedang — membutuhkan offline-first architecture untuk modul opname.

**7. Approval Workflow untuk Transfer dan PO**
- **Masalah:** Transfer dan PO berapapun nilainya bisa langsung dieksekusi tanpa approval.
- **Solusi:** Configurable approval matrix: PO/Transfer > Rp X juta membutuhkan approval Manager/Owner. Notifikasi push ke approver.
- **Impact:** Kontrol keuangan yang lebih baik, mencegah kesalahan besar.
- **Effort:** Sedang.

**8. Smart Reorder Suggestions**
- **Masalah:** Reorder point statis, tidak adaptif terhadap perubahan pola penjualan.
- **Solusi:** Kalkulasi reorder point otomatis berdasarkan: rata-rata penjualan 30 hari x lead time supplier x safety factor. Update berkala atau on-demand.
- **Impact:** Mengurangi stockout dan overstock secara signifikan.
- **Effort:** Sedang.

**9. Quick-Entry Mode untuk Batch dan Serial Number**
- **Masalah:** Input batch/serial saat receiving lambat, terutama untuk volume besar.
- **Solusi:** Mode khusus receiving: continuous barcode scan untuk serial, quick-fill form untuk batch (isi batch number + qty + expiry, auto-duplicate untuk batch berikutnya). Tab-through keyboard navigation.
- **Impact:** Receiving 2-3x lebih cepat.
- **Effort:** Sedang.

**10. Kirim PO via Email/WhatsApp**
- **Masalah:** PO harus di-export PDF lalu dikirim manual ke supplier.
- **Solusi:** Tombol "Kirim ke Supplier" yang membuka opsi: email (langsung dari sistem) atau WhatsApp (generate link/pesan otomatis dengan PDF attachment).
- **Impact:** Workflow PO lebih efisien, mengurangi langkah manual.
- **Effort:** Sedang.

### Prioritas 3 — Higher Effort, Strategic Impact

**11. Bulk Editor ala Spreadsheet**
- **Masalah:** Edit stok minimum, harga, tier, dan lain-lain harus satu produk per satu.
- **Solusi:** Interface spreadsheet-like (mirip Shopify bulk editor) yang bisa edit ratusan produk sekaligus. Filter, select, edit kolom yang diinginkan, preview changes, apply.
- **Impact:** Efisiensi operasional meningkat drastis untuk bisnis dengan banyak SKU.
- **Effort:** Tinggi.

**12. Inventory Performance Dashboard (ABC Analysis)**
- **Masalah:** Tidak ada analisis performa inventaris. User hanya melihat data mentah.
- **Solusi:** Dashboard analytics: ABC analysis (produk A = 80% revenue, B = 15%, C = 5%), sell-through rate, days to sell, dead stock identification, stock turn ratio. Rekomendasi actionable.
- **Impact:** Keputusan inventory yang data-driven, optimasi modal kerja.
- **Effort:** Tinggi.

**13. Calendar View untuk Batch Kadaluarsa**
- **Masalah:** Daftar batch kadaluarsa kurang visual dan sulit di-scan.
- **Solusi:** Calendar view bulanan yang menunjukkan batch mana kadaluarsa di tanggal mana, dengan color-coding severity. Klik tanggal untuk lihat detail dan langsung buat promosi diskon.
- **Impact:** Manajemen kadaluarsa yang proaktif, kurangi waste.
- **Effort:** Sedang.

**14. Multi-Method Costing**
- **Masalah:** Hanya moving average. Beberapa bisnis membutuhkan FIFO costing atau specific identification.
- **Solusi:** Opsi metode costing: Moving Average (default), FIFO Cost, Specific Identification. Per bisnis, bisa dipilih saat setup.
- **Impact:** Fleksibilitas untuk berbagai jenis bisnis dan kebutuhan akuntansi.
- **Effort:** Tinggi — perubahan fundamental di kalkulasi.

**15. Barcode Label Printing**
- **Masalah:** Tidak bisa cetak label barcode dari dalam aplikasi.
- **Solusi:** Generate dan print barcode labels (barcode + nama + harga) langsung dari inventory, dengan template yang customizable. Support printer thermal label standar.
- **Impact:** Operasional toko lebih efisien, mengurangi dependency pada tools lain.
- **Effort:** Sedang.

---

## 7. Deep-Dive: Stock Opname UX

### Alur Barcode Scanning Saat Opname

**Status saat ini:**
- Scan barcode di mobile membuka kamera, scan satu per satu.
- Setelah scan, user harus input qty dan konfirmasi sebelum bisa scan produk berikutnya.
- Delay antara scan sekitar 3-5 detik, terlalu lambat untuk opname besar.

**Masalah yang ditemukan:**
1. **Latency:** Jeda antara scan ke-1 dan kesiapan scan ke-2 terlalu lama. Kamera harus re-focus.
2. **Confirmation step:** Setiap scan butuh konfirmasi manual. Untuk 500 produk, ini 500 tap ekstra.
3. **No continuous scan mode:** Tidak bisa scan beruntun — harus initiate scan setiap kali.
4. **Camera quality dependency:** Barcode yang lecek atau kecil sering gagal di-scan.

**Rekomendasi perbaikan:**
1. **Continuous scan mode:** Kamera tetap aktif. Scan barcode, langsung muncul input qty di overlay. Input qty, otomatis kembali ke mode scan tanpa perlu klik apapun.
2. **Quick-qty shortcut:** Untuk produk yang dihitung utuh (shelf count), tombol "+1" langsung menambah qty tanpa ketik manual.
3. **Audio/haptic feedback:** Bunyi "beep" dan getaran saat scan berhasil. Bunyi berbeda untuk scan gagal. User tidak perlu lihat layar terus.
4. **Last-scanned preview:** Bar kecil di bawah kamera yang menampilkan 3 produk terakhir yang di-scan, sehingga user bisa verify tanpa keluar dari mode scan.
5. **External scanner support:** Integrasi dengan barcode scanner Bluetooth/USB untuk speed yang lebih tinggi.

### Alur Batch Input Saat Opname

**Status saat ini:**
- Untuk produk dengan batch tracking, saat opname harus input qty per batch.
- Setiap batch adalah baris terpisah — bisa sangat panjang untuk produk dengan banyak batch aktif.

**Masalah yang ditemukan:**
1. **Visual clutter:** Produk dengan 5+ batch aktif memakan banyak layar. User bisa kehilangan konteks.
2. **Batch identification:** User harus mencari nomor batch di kemasan produk lalu mencocokkan dengan daftar di layar. Proses ini lambat.
3. **No grouping:** Semua batch ditampilkan flat, tidak dikelompokkan per produk secara visual yang memudahkan.

**Rekomendasi perbaikan:**
1. **Collapsible batch rows:** Tampilkan produk utama di baris utama, batch-batch di bawahnya bisa di-expand/collapse. Default collapsed, tampilkan total qty saja.
2. **Scan batch barcode:** Jika batch memiliki barcode tersendiri, scan langsung ke batch yang tepat tanpa harus cari di daftar.
3. **Smart sort:** Urutkan batch berdasarkan kadaluarsa — batch yang paling dekat kadaluarsa di atas (biasanya yang ada di depan rak).
4. **Quick-fill "same as system":** Tombol untuk mengisi qty fisik = qty sistem untuk batch yang sudah dicek dan cocok. Mengurangi input untuk batch yang tidak bermasalah.

### Alur Offline Counting (Rekomendasi)

**Saat ini tidak tersedia.** Ini adalah gap kritis karena banyak gudang dan area stok yang tidak memiliki koneksi internet stabil.

**Desain yang diusulkan:**
1. **Pre-download:** Sebelum memulai opname offline, user bisa "download" sesi opname ke perangkat mobile. Data produk dan barcode tersimpan lokal.
2. **Offline counting:** Semua input tersimpan di IndexedDB/local storage. UI tetap berfungsi penuh tanpa koneksi.
3. **Sync indicator:** Badge jelas yang menunjukkan "Offline — X item belum tersinkronisasi".
4. **Auto-sync:** Saat koneksi kembali, data otomatis tersinkronisasi ke server. Conflict resolution jika ada perubahan di server saat offline.
5. **Conflict handling:** Jika stok di server berubah saat user offline (karena penjualan), tampilkan notifikasi dan biarkan user memilih: gunakan stok server terbaru sebagai baseline, atau tetap gunakan stok saat sesi dimulai.

---

## 8. Evaluasi Alur Transfer

### Alur Saat Ini

```
Buat Transfer → (Draft) → Kirim → (Sent: stok berkurang di asal)
    → Terima di tujuan → (Received: stok bertambah di tujuan)
```

### Evaluasi Positif

1. **Status tracking jelas** — setiap tahap terdefinisi dengan baik.
2. **Timeline tercatat** — siapa melakukan apa dan kapan.
3. **Template tersedia** — pola transfer rutin bisa disimpan.
4. **Partial receive** — mendukung penerimaan sebagian, realistis untuk operasional.

### Evaluasi Negatif dan Rekomendasi

**1. Tidak ada approval workflow**
- **Masalah:** Staff level manapun bisa menginisiasi transfer tanpa approval. Risiko penyalahgunaan untuk bisnis besar.
- **Rekomendasi:** Configurable approval: transfer di atas nilai X membutuhkan approval Manager. Transfer antar outlet berbeda kota membutuhkan approval Owner.

**2. Stok langsung berkurang saat "Kirim"**
- **Masalah:** Stok di outlet asal langsung berkurang saat status berubah ke "Sent". Jika barang hilang di perjalanan, stok sudah terlanjur berkurang. Status "In Transit" tidak memiliki representasi stok tersendiri.
- **Rekomendasi:** Tambahkan status "In Transit" yang merupakan stok tersendiri — bukan milik outlet asal dan belum milik outlet tujuan. Dashboard menampilkan "Stok di Outlet" dan "Stok dalam Perjalanan" secara terpisah. Jika hilang di perjalanan, adjustment dilakukan dari stok in-transit.

**3. Tidak ada notifikasi real-time ke outlet tujuan**
- **Masalah:** Outlet tujuan harus secara aktif cek apakah ada transfer masuk. Bisa terlambat verifikasi.
- **Rekomendasi:** Push notification dan in-app notification ke outlet tujuan saat transfer dikirim. Reminder otomatis jika transfer belum diterima dalam X hari.

**4. Tidak ada packing list / delivery note**
- **Masalah:** Tidak bisa generate dokumen fisik untuk pengiriman.
- **Rekomendasi:** Generate packing list / surat jalan yang bisa dicetak. Berguna untuk verifikasi saat penerimaan dan sebagai dokumen pendukung pengiriman.

**5. Tidak ada foto bukti pengiriman/penerimaan**
- **Masalah:** Tidak ada bukti visual kondisi barang saat dikirim dan diterima.
- **Rekomendasi:** Fitur attach foto saat kirim dan saat terima. Berguna untuk dispute resolution jika ada barang rusak.

---

## 9. Assessment Lifecycle PO

### Lifecycle Saat Ini

```
Buat PO → (Draft) → Kirim ke Supplier → (Sent)
    → Terima Barang → (Partially Received / Fully Received)
    → Bayar → (Paid)
```

### Evaluasi per Tahap

**Draft → Sent:**
- Positif: bisa edit bebas saat draft.
- Negatif: tidak ada approval workflow. Tidak ada cara kirim PO langsung ke supplier dari sistem (harus manual export PDF, kirim via email/WA).
- Rekomendasi: approval matrix + email/WA integration.

**Sent → Receiving:**
- Positif: partial receive didukung. Batch dan serial number bisa diinput saat receiving.
- Negatif: tidak ada reminder jika PO sudah melewati expected delivery date. Input batch/serial lambat untuk volume besar. Tidak ada GRN (Goods Received Note) yang bisa dicetak.
- Rekomendasi: auto-reminder untuk PO overdue, quick-entry mode, GRN generation.

**Receiving → HPP Update:**
- Positif: moving average cost otomatis. Stok langsung bertambah.
- Negatif: tidak ada review/konfirmasi sebelum HPP diupdate. Jika harga di PO salah, HPP langsung terpengaruh.
- Rekomendasi: preview perubahan HPP sebelum konfirmasi receiving. Warning jika HPP akan berubah signifikan (> 10%).

**Payment Tracking:**
- Positif: partial payment didukung. Status pembayaran jelas.
- Negatif: tidak ada integrasi dengan pembukuan/akuntansi. Tidak ada aging report (PO mana yang sudah jatuh tempo pembayaran). Tidak ada reminder pembayaran.
- Rekomendasi: aging report, payment reminder, dan ke depan integrasi dengan modul akuntansi.

### Fitur PO yang Belum Ada tapi Dibutuhkan

1. **PO dari Reorder Alert** — sudah bisa, tapi alurnya masih membutuhkan banyak klik. Perlu "1-click PO" dari alert.
2. **PO Recurring** — untuk pembelian rutin (misalnya: setiap minggu pesan susu dari supplier X), auto-generate PO.
3. **PO Template** — simpan kombinasi produk + qty + supplier sebagai template yang bisa dipakai ulang.
4. **Supplier Return (Debit Note)** — jika barang yang diterima rusak atau tidak sesuai, perlu mekanisme retur ke supplier yang mengurangi hutang.
5. **PO Merge** — gabungkan beberapa draft PO ke supplier yang sama menjadi satu PO untuk efisiensi.

---

## 10. Moving Average Cost: Pertimbangan Akurasi

### Cara Kerja Saat Ini

HPP dihitung menggunakan metode weighted moving average:

```
HPP Baru = ((Stok Lama x HPP Lama) + (Stok Baru x Harga Baru)) / Total Stok
```

Trigger rekalkukasi: PO receive, stock adjustment (tambah dengan harga).

### Edge Cases dan Masalah Akurasi

**1. Stok Nol lalu Ada Stok Masuk**
- **Masalah:** Jika stok = 0, lalu terima PO, HPP menjadi 100% harga PO baru. Ini benar secara matematis tapi bisa "jump" signifikan dari HPP sebelumnya.
- **Dampak:** Jika ada penjualan yang di-record saat stok nol (backorder/pre-order), HPP yang digunakan mungkin HPP lama yang sudah tidak relevan.
- **Rekomendasi:** Tampilkan warning saat stok mendekati nol: "HPP akan di-reset sepenuhnya ke harga PO berikutnya." Log perubahan HPP yang signifikan untuk audit.

**2. Adjustment Tanpa Harga**
- **Masalah:** Stock adjustment tambah tanpa mengisi harga menggunakan HPP terakhir sebagai harga input. Ini bisa tidak akurat jika adjustment karena barang ditemukan yang harga belinya berbeda.
- **Rekomendasi:** Jadikan harga sebagai field yang selalu ditampilkan (pre-filled dengan HPP terakhir tapi bisa diedit) saat adjustment tambah. Berikan label yang jelas: "Harga pokok unit ini: Rp XX (diisi otomatis dari HPP terakhir, ubah jika berbeda)."

**3. Retur Penjualan (Return)**
- **Masalah:** Saat pelanggan retur barang, stok bertambah. Apakah HPP harus direkalkukasi? Jika ya, menggunakan harga apa?
- **Rekomendasi:** Retur masuk menggunakan HPP saat barang tersebut dijual (tersimpan di record transaksi). Ini memastikan HPP tidak berubah karena retur. Stok bertambah tapi HPP tetap — ini yang paling akurat.

**4. Transfer Antar Outlet**
- **Masalah:** Transfer menggunakan HPP outlet asal. Jika outlet asal dan tujuan punya HPP berbeda (karena receiving PO di outlet berbeda), transfer bisa mengubah HPP outlet tujuan secara signifikan.
- **Rekomendasi:** Saat transfer, gunakan HPP outlet asal dan rekalkukasi HPP outlet tujuan menggunakan moving average. Tampilkan preview perubahan HPP di outlet tujuan sebelum konfirmasi terima transfer.

**5. Multi-Currency (Jika Relevan)**
- **Masalah:** Jika ada pembelian impor dalam mata uang asing, kurs berfluktuasi.
- **Rekomendasi:** Konversi ke Rupiah saat PO receive menggunakan kurs saat itu. Catat kurs yang digunakan untuk audit trail.

**6. Presisi Angka (Pembulatan)**
- **Masalah:** Moving average menghasilkan angka desimal (contoh: Rp 10.666,67). Pembulatan bisa menyebabkan akumulasi selisih kecil dalam jangka panjang.
- **Rekomendasi:** Simpan HPP dengan presisi minimal 4 desimal di database. Tampilkan dengan pembulatan di UI. Lakukan rekonsiliasi berkala. Pertimbangkan field "rounding difference" di laporan.

### Perbandingan Metode Costing

| Aspek | Moving Average (Saat Ini) | FIFO Cost | Specific ID |
|---|---|---|---|
| Kompleksitas | Rendah | Sedang | Tinggi |
| Akurasi | Cukup baik untuk sebagian besar bisnis | Lebih akurat untuk barang yang harganya fluktuatif | Paling akurat untuk barang unik/bernilai tinggi |
| Cocok untuk | Retail umum, F&B, FMCG | Grocery, fashion (seasonal pricing) | Elektronik, perhiasan, barang seni |
| Requirement | Tidak perlu tracking per batch/unit | Perlu tracking per batch (sudah ada) | Perlu tracking per serial number (sudah ada) |

**Rekomendasi jangka panjang:** Implementasi FIFO cost sebagai opsi kedua (bisa memanfaatkan infrastruktur batch tracking yang sudah ada). Specific ID bisa ditambahkan kemudian menggunakan serial number tracking.

---

## 11. Review Pengalaman Mobile Inventory

### Fitur yang Tersedia di Mobile

Saat ini modul Inventori di mobile (`*.mobile.tsx` files) meliputi:
- Melihat stok per outlet
- Barcode scanning (kamera)
- Stock opname (input qty)
- Menerima transfer
- Stock adjustment basic

### Evaluasi UX Mobile

**1. Navigasi**
- **Status:** Navigasi inventory di mobile menggunakan bottom tabs dan hamburger menu.
- **Masalah:** Terlalu banyak sub-fitur untuk bottom tab. User harus banyak klik untuk sampai ke fitur yang diinginkan.
- **Rekomendasi:** Quick-action FAB (Floating Action Button) dengan shortcut ke 4 aksi paling sering: scan barcode, cek stok, opname, terima barang.

**2. Barcode Scanning**
- **Status:** Menggunakan kamera perangkat via library scanning.
- **Masalah:** Kecepatan scan bervariasi antar perangkat. Low-end Android devices sering lambat. Tidak ada flash/torch toggle yang mudah diakses. Viewfinder terlalu kecil.
- **Rekomendasi:** Viewfinder fullscreen, toggle torch di overlay, support external Bluetooth scanner, continuous scan mode.

**3. Stock Opname Mobile**
- **Status:** Bisa input qty dan scan barcode. Data sync ke server.
- **Masalah:** Tidak ada offline mode. Form input per produk membutuhkan banyak scrolling. Keyboard numerical tidak selalu muncul otomatis.
- **Rekomendasi:** Offline-first PWA, keyboard always numerical untuk qty fields, swipe gesture untuk navigasi antar produk, dan progress ring yang selalu terlihat.

**4. Receiving di Mobile**
- **Status:** Menerima transfer bisa dilakukan di mobile. Receiving PO belum optimal di mobile.
- **Masalah:** Input batch dan serial number di mobile sangat tidak nyaman — layar kecil, banyak field. Keyboard pop-up menggeser layout.
- **Rekomendasi:** Simplified receiving flow di mobile: scan barcode item, scan barcode batch, input qty saja. Detail lain (catatan, supplier return) lebih baik di desktop. Fixed keyboard area yang tidak menggeser layout.

**5. Dashboard Mobile**
- **Status:** Dashboard inventory di mobile menampilkan ringkasan stok dan alert.
- **Masalah:** Widget terlalu padat untuk layar kecil. Grafik sulit dibaca. Reorder alert tenggelam di antara informasi lain.
- **Rekomendasi:** Mobile dashboard yang focused: reorder alert di atas (paling penting), lalu stok kritis, lalu quick-actions. Grafik dioptimasi untuk layar kecil atau diganti dengan angka ringkasan.

### Fitur yang Belum Ada di Mobile tapi Dibutuhkan

1. **Quick stock check** — scan barcode, langsung tampilkan stok di semua outlet. Tanpa perlu navigasi ke halaman stok.
2. **Photo attachment** — ambil foto saat opname, saat terima barang, saat transfer. Langsung dari kamera, attach ke record.
3. **Push notification** — alert stok menipis, transfer masuk, PO overdue. Saat ini hanya notifikasi in-app.
4. **Offline stock opname** — prioritas tertinggi untuk mobile.
5. **Voice input** — untuk opname, bisa gunakan voice: "Produk A, dua puluh lima" — experimental tapi berguna untuk petugas yang tangannya sibuk menghitung.

---

## 12. Roadmap Implementasi

### Fase 1: Quick Wins (1-2 Bulan)

Fokus: perbaikan UX yang berdampak besar dengan effort rendah. Tidak ada perubahan arsitektur.

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Anomaly detection input opname (warning saat qty sangat berbeda) | 2 hari | Tinggi |
| 2 | Price variance alert di PO (highlight harga yang berubah signifikan) | 2 hari | Tinggi |
| 3 | Progress indicator stock opname (X/Y produk dihitung) | 1 hari | Sedang |
| 4 | Tooltip dan contextual help untuk semua field kritis | 5 hari | Tinggi |
| 5 | Incoming inventory consolidated widget di dashboard | 3 hari | Sedang |
| 6 | HPP change preview saat PO receiving (sebelum konfirmasi) | 3 hari | Sedang |
| 7 | Numerical keyboard auto-trigger di mobile untuk qty fields | 1 hari | Sedang |
| 8 | PO overdue reminder (notifikasi saat melewati expected date) | 2 hari | Sedang |
| 9 | Quick stock check via barcode scan (scan → lihat stok semua outlet) | 3 hari | Tinggi |
| 10 | Transfer notification ke outlet tujuan (real-time via WebSocket) | 2 hari | Sedang |

**Total estimasi: 24 hari kerja (sekitar 5 minggu dengan buffer)**

### Fase 2: Medium Improvements (2-4 Bulan)

Fokus: fitur baru yang meningkatkan efisiensi operasional secara signifikan.

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Offline mode untuk stock opname (PWA + IndexedDB) | 15 hari | Sangat Tinggi |
| 2 | Approval workflow untuk PO dan transfer (configurable matrix) | 10 hari | Tinggi |
| 3 | Smart reorder suggestions (dynamic berdasarkan velocity + lead time) | 8 hari | Tinggi |
| 4 | Quick-entry mode untuk batch/serial saat receiving | 7 hari | Tinggi |
| 5 | Kirim PO via email langsung dari sistem | 5 hari | Sedang |
| 6 | WhatsApp integration untuk kirim PO | 5 hari | Sedang |
| 7 | Calendar view untuk batch kadaluarsa | 5 hari | Sedang |
| 8 | PO template dan recurring PO | 7 hari | Sedang |
| 9 | Packing list / surat jalan untuk transfer | 3 hari | Sedang |
| 10 | Photo attachment untuk opname, receiving, transfer (mobile) | 5 hari | Sedang |
| 11 | Continuous barcode scan mode di mobile | 5 hari | Tinggi |
| 12 | Supplier duplicate detection | 3 hari | Rendah |

**Total estimasi: 78 hari kerja (sekitar 4 bulan dengan buffer)**

### Fase 3: Strategic Features (4-8 Bulan)

Fokus: fitur strategis yang meningkatkan competitive advantage dan membuka segmen pasar baru.

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Bulk editor ala spreadsheet (multi-product editing) | 20 hari | Tinggi |
| 2 | Inventory performance dashboard (ABC analysis, dead stock, turnover) | 15 hari | Tinggi |
| 3 | FIFO costing sebagai opsi alternatif moving average | 20 hari | Sedang |
| 4 | Supplier return / debit note workflow | 10 hari | Sedang |
| 5 | Barcode label printing dari inventory | 10 hari | Sedang |
| 6 | In-transit stock tracking (stok terpisah untuk barang dalam perjalanan) | 10 hari | Sedang |
| 7 | Auto-transfer suggestions (redistribusi berdasarkan stok level) | 10 hari | Sedang |
| 8 | Cost price forecasting (proyeksi harga berdasarkan tren historis) | 8 hari | Rendah |
| 9 | Supplier performance scorecard (otomatis) | 7 hari | Sedang |
| 10 | Warranty tracking otomatis berbasis serial number | 8 hari | Sedang |
| 11 | Marketplace inventory sync (Tokopedia, Shopee) — exploratory | 25 hari | Tinggi |
| 12 | Push notification mobile untuk semua alert inventory | 7 hari | Sedang |

**Total estimasi: 150 hari kerja (sekitar 7-8 bulan dengan buffer)**

### Ringkasan Roadmap Visual

```
Bulan 1-2:     [=== Quick Wins (10 item) ===]
Bulan 2-4:     [======== Medium Improvements (12 item) ========]
Bulan 4-8:     [============== Strategic Features (12 item) ==============]
               |                                                           |
               Dampak Langsung                              Competitive Advantage
               UX Polish                                    Market Expansion
               Error Prevention                             Advanced Analytics
```

### KPI yang Diharapkan Setelah Implementasi Penuh

| Metrik | Sebelum | Target Setelah | Cara Ukur |
|---|---|---|---|
| Waktu stock opname per 100 produk | 120 menit | 45 menit | Durasi sesi opname di sistem |
| Error rate input opname | 5-8% | < 1% | Persentase anomaly yang terdeteksi post-opname |
| Shrinkage rate | 3-5% | < 1% | Selisih opname / total nilai inventaris |
| Stockout incidents per bulan | 10-15 | < 3 | Jumlah produk yang stoknya mencapai 0 |
| Waktu proses PO (buat sampai kirim) | 30 menit | 5 menit | Durasi rata-rata draft → sent |
| Waktu receiving per PO | 45 menit | 15 menit | Durasi rata-rata receiving |
| HPP accuracy | Tidak terukur | > 99% | Audit sample HPP vs harga beli aktual |
| Waste dari produk kadaluarsa | 2-4% inventaris | < 0.5% | Nilai produk expired / total inventaris |

---

## Penutup

Modul Inventori TiloPOS sudah memiliki fondasi yang kuat dengan 12 sub-fitur yang aktif dan feature flag per bisnis. Namun, evaluasi menunjukkan skor UX rata-rata 3.0/5.0 yang mengindikasikan ruang perbaikan yang signifikan, terutama di area:

1. **Help dan dokumentasi in-app** — konsisten menjadi titik terlemah di semua sub-fitur.
2. **Mobile experience** — belum optimal untuk operasional lapangan (gudang, receiving, opname).
3. **Intelligence dan automation** — banyak proses masih manual yang seharusnya bisa di-assist oleh sistem (smart reorder, auto-transfer, anomaly detection).
4. **Workflow approval** — absen di PO dan transfer, merupakan risiko kontrol internal.

Roadmap yang diusulkan dimulai dari quick wins yang berdampak langsung (1-2 bulan), dilanjutkan perbaikan operasional menengah (2-4 bulan), dan diakhiri fitur strategis untuk competitive advantage (4-8 bulan). Dengan implementasi penuh, TiloPOS berpotensi menjadi solusi inventori terlengkap untuk segmen UMKM Indonesia, menyaingi Accurate dalam kelengkapan fitur tapi dengan UX yang jauh lebih modern dan harga yang terjangkau.
