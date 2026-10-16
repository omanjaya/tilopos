# Audit Fitur: Modul Promosi (Promotions, Vouchers, Loyalty, Credit Sales)

Dokumen ini menganalisis kondisi terkini modul Promosi di TiloPOS — yang mencakup empat sub-fitur: Promotions, Vouchers, Loyalty Program, dan Credit Sales (BON). Evaluasi meliputi UX, perbandingan kompetitor, referensi best practice, dan rekomendasi perbaikan.

---

## 1. Kondisi Terkini (Current State)

### 1.1 Sub-fitur: Promosi (`promotions-page.tsx`, `promotion-form-page.tsx`)

**Fitur yang tersedia:**
- Daftar promosi dalam tabel: Nama, Tipe Diskon, Nilai Diskon, Periode Berlaku, Penggunaan (count/limit), Status, Aksi
- Pencarian teks untuk filter promosi
- Tiga tipe diskon: Persentase, Nominal, BOGO (Buy 1 Get 1)
- Form pembuatan/edit: nama, deskripsi, tipe diskon, nilai, minimum pembelian, maksimum diskon (khusus %), periode berlaku, batas penggunaan
- Status otomatis: Aktif (hijau), Kadaluarsa (oranye), Nonaktif (abu-abu)
- Tracking penggunaan (usageCount vs usageLimit)
- Aksi per-baris: Edit dan Hapus (nonaktifkan)

**Yang belum ada:**
- Promosi per produk/kategori (saat ini hanya per transaksi)
- Promosi time-based (jam tertentu, hari tertentu)
- Promosi tiered (beli 3 diskon 10%, beli 5 diskon 15%)
- Auto-apply vs manual-apply di POS
- Promosi stacking rules

### 1.2 Sub-fitur: Voucher (`voucher-generator-page.tsx`)

**Fitur yang tersedia:**
- Generator voucher bulk: prefix, quantity (1-1.000), tipe diskon, nilai, periode berlaku, batas per voucher
- Daftar voucher dalam tabel: Kode, Tipe, Nilai, Masa Berlaku, Penggunaan (count/limit), Status, Dibuat
- Pencarian kode voucher
- Export voucher ke CSV
- Status per voucher: Aktif, Habis, Kadaluarsa, Nonaktif
- Kode prefix otomatis uppercase, max 10 karakter
- Validasi input: prefix wajib, periode wajib, diskon > 0

**Yang belum ada:**
- Edit/deactivate voucher individual
- Voucher untuk pelanggan tertentu (targeted voucher)
- Voucher per produk/kategori
- Voucher referral (pelanggan share ke orang lain, keduanya dapat benefit)
- Voucher minimum pembelian
- Print voucher langsung (sebagai kartu/slip)

### 1.3 Sub-fitur: Program Loyalty (`loyalty-page.tsx`)

**Fitur yang tersedia:**
- Create loyalty program: nama, amount per point, redemption rate, point expiry days
- Dashboard: 4 metric cards (Nama, Jumlah per Poin, Nilai Tukar, Masa Berlaku)
- Tabel tier: Nama Tier, Min Poin, Multiplier, Benefits
- Empty state dengan CTA "Buat Program"
- FeatureGate integration di halaman pelanggan (conditional poin column)

**Yang belum ada:**
- Edit konfigurasi program setelah dibuat
- CRUD untuk tier (tambah/edit/hapus tier)
- Poin history per pelanggan (earning & redemption log)
- Manual point adjustment (tambah/kurang poin manual)
- Poin redemption flow di POS
- Double points event/campaign
- Birthday bonus points
- Referral points

### 1.4 Sub-fitur: Credit Sales / BON (`credit-sales-page.tsx`)

**Fitur yang tersedia:**
- Dashboard ringkasan: Total Piutang, Pelanggan Piutang, Jatuh Tempo
- Daftar piutang dalam tabel custom (bukan DataTable): No. Bon, Pelanggan, Total, Dibayar, Sisa, Status, Tanggal, Aksi
- Filter: pencarian (nama/no. bon) dan status (Semua, Belum Lunas, Sebagian, Lunas, Jatuh Tempo)
- Record payment modal (bayar sebagian/penuh)
- Detail modal per credit sale (riwayat pembayaran)
- Aging report (tab terpisah)
- 4 status: outstanding, partially_paid, settled, overdue
- Warna-coded status badges

**Yang belum ada:**
- Credit limit per pelanggan (auto-block jika melebihi limit)
- Interest/bunga untuk keterlambatan
- Auto-reminder sebelum jatuh tempo
- Print/share detail piutang ke pelanggan
- Rekonsiliasi piutang bulanan
- Export laporan piutang

---

## 2. Evaluasi UX

### 2.1 Kelebihan

| Sub-fitur | Aspek | Evaluasi |
|-----------|-------|----------|
| Promotions | Tipe diskon | 3 tipe (%, Rp, BOGO) mencakup kebutuhan umum UMKM |
| Promotions | Status otomatis | Sistem otomatis menandai kadaluarsa — mengurangi promosi "zombie" |
| Promotions | Form | Layout bersih, field conditional (max diskon hanya untuk %), validasi jelas |
| Voucher | Bulk generate | Generate hingga 1.000 voucher sekaligus — efisien untuk campaign |
| Voucher | Export CSV | Memudahkan distribusi ke channel lain (email, WhatsApp) |
| Voucher | Status tracking | Status per voucher lengkap dan informatif |
| Loyalty | Simplicity | Konfigurasi sederhana (3 field utama) — tidak overwhelming untuk UMKM |
| Loyalty | Metric cards | Dashboard yang jelas dan mudah dibaca |
| Credit Sales | Dashboard | 3 kartu ringkasan memberikan overview cepat tentang kondisi piutang |
| Credit Sales | Aging report | Tab terpisah untuk analisis umur piutang — fitur yang jarang ada di kompetitor |
| Credit Sales | Record payment | Modal payment yang straightforward — cukup input jumlah |
| Credit Sales | Status system | 4 status yang mencakup semua kondisi piutang dengan warna-coding |

### 2.2 Kelemahan dan Area Perbaikan

#### Promosi

| Masalah | Dampak | Prioritas |
|---------|--------|-----------|
| Tidak ada promosi per produk/kategori | Semua promosi berlaku global — tidak bisa diskon produk tertentu saja | Tinggi |
| Tidak ada time-based rules | Tidak bisa buat "Happy Hour" (diskon jam 2-5 sore saja) | Sedang |
| Tidak ada promosi tiered | Tidak bisa "beli 3 diskon 10%, beli 5 diskon 15%" | Sedang |
| Tidak ada stacking rules | Tidak jelas aturan jika 2+ promosi berlaku bersamaan | Sedang |
| Komponen promotions-manager terpisah | Ada file `promotions-manager.tsx` yang belum dianalisis fungsinya | Rendah |

#### Voucher

| Masalah | Dampak | Prioritas |
|---------|--------|-----------|
| Tidak bisa edit/deactivate voucher individual | Jika ada voucher yang perlu ditarik, harus menunggu kadaluarsa | Tinggi |
| Tidak ada targeted voucher | Tidak bisa kirim voucher spesifik ke pelanggan tertentu | Sedang |
| Tidak ada minimum pembelian per voucher | Tidak bisa set "voucher ini hanya untuk transaksi > Rp 100.000" | Sedang |
| Tidak ada referral voucher | Kehilangan peluang word-of-mouth marketing | Rendah |

#### Loyalty

| Masalah | Dampak | Prioritas |
|---------|--------|-----------|
| Tidak ada CRUD tier | Tier hanya ditampilkan, tidak bisa ditambah/edit/hapus | Tinggi |
| Tidak ada edit program | Sekali dibuat, konfigurasi tidak bisa diubah | Tinggi |
| Tidak ada poin history | Tidak bisa melihat riwayat earning/redemption per pelanggan | Tinggi |
| Tidak ada redemption flow | Proses tukar poin di POS belum terlihat implementasinya | Tinggi |
| Tidak ada manual adjustment | Tidak bisa tambah/kurang poin secara manual (untuk koreksi atau bonus) | Sedang |

#### Credit Sales

| Masalah | Dampak | Prioritas |
|---------|--------|-----------|
| Tidak ada credit limit | Pelanggan bisa terus menambah BON tanpa batas | Tinggi |
| Tidak ada export laporan | Sulit berbagi data piutang dengan akuntan atau untuk analisis offline | Sedang |
| Tabel custom (bukan DataTable) | Inkonsistensi UI dengan halaman lain yang menggunakan DataTable | Sedang |
| Tidak ada reminder otomatis | Piutang jatuh tempo tidak trigger notifikasi | Sedang |
| Tidak ada print detail | Tidak bisa cetak/kirim detail piutang ke pelanggan | Rendah |

---

## 3. Analisis Kompetitor

### 3.1 Moka POS — Promosi

**Fitur Moka:**
- Diskon per item dan per transaksi
- Diskon otomatis berdasarkan kondisi (quantity, time, customer)
- Stamp card digital (setiap N kunjungan/pembelian, reward X)
- Voucher dengan kode unik
- Promo bundle (beli A+B harga spesial)
- Happy Hour (diskon di jam tertentu)
- Promosi hanya untuk member

**Kelebihan Moka dibanding TiloPOS:**
- Diskon per item/per transaksi yang granular
- Happy Hour promotion
- Stamp card digital (alternatif loyalty yang lebih simpel)
- Promosi conditional yang lebih fleksibel (quantity-based, time-based)

**Kekurangan Moka dibanding TiloPOS:**
- Tidak ada bulk voucher generator
- Tidak ada export voucher CSV
- Tidak ada sistem BON/credit sales
- Loyalty hanya stamp card (tidak ada tier system)

### 3.2 Majoo — Promosi dan Loyalty

**Fitur Majoo:**
- Tipe diskon lengkap: %, nominal, BOGO, Buy X Get Y, bundle
- Promosi per produk, kategori, dan transaksi
- Voucher generator dengan distribusi via app
- Loyalty points dengan tier (Bronze/Silver/Gold/Platinum)
- Poin multiplier per tier
- Cashback program
- Referral reward
- Birthday reward otomatis
- Customer app untuk cek poin dan voucher
- Push notification untuk promosi

**Kelebihan Majoo dibanding TiloPOS:**
- Promosi per produk/kategori
- Lebih banyak tipe diskon (Buy X Get Y, bundle)
- Customer-facing app
- Push notification
- Referral dan birthday automation
- Distribusi voucher via app

**Kekurangan Majoo dibanding TiloPOS:**
- Harga jauh lebih mahal (semua fitur di paket premium)
- Tidak ada credit sales (BON) terintegrasi
- Tidak ada aging report
- Overengineered untuk UMKM kecil
- Setup loyalty lebih kompleks

### 3.3 Ringkasan Perbandingan

| Fitur | TiloPOS | Moka | Majoo |
|-------|---------|------|-------|
| Diskon % dan Rp | Ya | Ya | Ya |
| Diskon BOGO | Ya | Ya | Ya |
| Diskon per produk/kategori | Belum | Ya | Ya |
| Happy Hour / time-based | Belum | Ya | Ya |
| Tiered discount (beli X diskon Y%) | Belum | Terbatas | Ya |
| Voucher bulk generator | Ya (1.000/batch) | Terbatas | Ya |
| Voucher export CSV | Ya | Tidak | Ya |
| Targeted voucher | Belum | Terbatas | Ya (via app) |
| Loyalty points | Ya | Stamp card | Points |
| Tier system | Ya (Bronze/Silver/Gold) | Tidak | Ya |
| Point multiplier | Ya | Tidak | Ya |
| Customer-facing poin check | Belum | Tidak | Ya (app) |
| Birthday reward | Belum | Terbatas | Ya (otomatis) |
| Referral program | Belum | Tidak | Ya |
| Credit Sales (BON) | Ya (lengkap) | Tidak | Tidak |
| Aging report piutang | Ya | Tidak | Tidak |
| Partial payment (cicilan) | Ya | Tidak | Tidak |
| Harga | Termasuk paket | Menengah | Mahal |

**Keunggulan unik TiloPOS:**
- Credit Sales (BON) terintegrasi dengan aging report — tidak ada di Moka maupun Majoo
- Voucher bulk generator + CSV export — workflow paling efisien untuk kampanye besar
- Harga semua inklusif — promosi, voucher, loyalty, BON sudah termasuk tanpa add-on

---

## 4. Best Practice: Referensi Industri

### 4.1 Square Loyalty & Marketing

Square adalah benchmark untuk loyalty terintegrasi POS:

- **Simple Loyalty Setup:** Pilih antara visit-based atau spend-based, set reward, selesai. Tidak lebih dari 5 langkah
- **Customer Enrollment:** Pelanggan enroll via SMS/email saat checkout. Kasir tinggal tanya "Mau ikut program loyalty?"
- **Loyalty Dashboard:** Grafik enrollment growth, active members, reward redemption rate, average spend per member vs non-member
- **Marketing Campaigns:** Email/SMS campaign langsung dari dashboard, targeted ke segmen tertentu
- **A/B Testing:** Test dua versi promosi dan lihat mana yang lebih efektif
- **Automated Campaigns:** Welcome series, birthday, win-back (pelanggan yang lama tidak datang)

**Pelajaran untuk TiloPOS:**
- Enrollment flow harus semudah mungkin — 1 langkah dari kasir
- Dashboard loyalty harus menunjukkan dampak bisnis (member vs non-member spend)
- Automated campaigns mengurangi workload owner secara signifikan
- A/B testing membantu mengoptimalkan ROI promosi

### 4.2 Toast Promotions (F&B Focus)

Toast adalah POS F&B leader dengan fitur promosi yang kuat:

- **Menu-Level Promotions:** Diskon bisa di-apply ke level item, modifier, atau menu group
- **Day-Part Pricing:** Harga berbeda untuk breakfast, lunch, dinner tanpa create produk terpisah
- **Combo Deals:** Buat paket combo dengan harga bundle yang otomatis teraplikasi
- **Promo Codes at POS:** Kasir scan atau input kode, diskon otomatis teraplikasi dengan validasi real-time
- **Promotion Performance Report:** Dashboard khusus yang menunjukkan revenue per promotion, redemption rate, average check size lift

**Pelajaran untuk TiloPOS:**
- Menu-level promotions sangat penting untuk F&B (diskon per item, bukan hanya per transaksi)
- Performance report per promosi membantu owner memutuskan promosi mana yang dilanjutkan
- Day-part pricing bisa menjadi diferensiator unik

### 4.3 Loyverse Loyalty (SME Focus)

Loyverse adalah POS untuk SME yang fokus pada kesederhanaan:

- **One-Tap Loyalty:** Satu tap untuk enrollment, satu tap untuk redeem
- **Points Visible on Receipt:** Saldo poin otomatis tercetak di struk — pelanggan selalu tahu
- **Simple Redemption:** "Tukar 100 poin untuk Rp 10.000" — kasir tinggal konfirmasi
- **Customer Notifications:** Email otomatis saat mendekati reward threshold

**Pelajaran untuk TiloPOS:**
- Simplicity is key untuk SME — jangan overcomplicate
- Poin di struk meningkatkan awareness tanpa effort tambahan
- Threshold notification ("10 poin lagi untuk reward!") mendorong kunjungan berikutnya

---

## 5. Gap Analysis

### 5.1 Gap Kritis (Harus segera dibenahi)

| # | Sub-fitur | Gap | Dampak |
|---|-----------|-----|--------|
| G1 | Promotions | Tidak ada promosi per produk/kategori | Promosi hanya global, tidak bisa target produk margin tinggi atau slow moving |
| G2 | Loyalty | Tidak ada CRUD tier dan edit program | Program loyalty rigid — tidak bisa diadaptasi seiring bisnis berkembang |
| G3 | Loyalty | Tidak ada redemption flow di POS | Pelanggan bisa collect poin tapi tidak jelas cara menukarnya |
| G4 | Credit Sales | Tidak ada credit limit per pelanggan | Risiko piutang membengkak tanpa kontrol |
| G5 | Voucher | Tidak bisa deactivate voucher individual | Voucher yang sudah bocor/disalahgunakan tidak bisa ditarik |

### 5.2 Gap Signifikan (Penting untuk diferensiasi)

| # | Sub-fitur | Gap | Dampak |
|---|-----------|-----|--------|
| G6 | Promotions | Tidak ada time-based rules (Happy Hour) | F&B kehilangan strategi promosi jam sepi |
| G7 | Loyalty | Tidak ada poin history per pelanggan | Transparansi rendah, tidak bisa audit earning/redemption |
| G8 | Voucher | Tidak ada minimum pembelian per voucher | Voucher bisa digunakan untuk transaksi kecil yang tidak profitable |
| G9 | Credit Sales | Tidak ada export laporan piutang | Akuntan/owner tidak bisa analisis offline |
| G10 | Promotions | Tidak ada promotion performance report | Tidak tahu promosi mana yang efektif dan mana yang merugi |

### 5.3 Gap Aspiratif (Nice to have untuk pertumbuhan)

| # | Sub-fitur | Gap | Dampak |
|---|-----------|-----|--------|
| G11 | Loyalty | Tidak ada birthday/event bonus points | Peluang engagement terbuang |
| G12 | Voucher | Tidak ada referral voucher | Kehilangan channel akuisisi organik |
| G13 | Promotions | Tidak ada A/B testing | Tidak bisa mengoptimalkan promosi secara data-driven |
| G14 | Credit Sales | Tidak ada auto-reminder | Penagihan manual, bisa terlewat |
| G15 | Loyalty | Tidak ada customer-facing poin check | Pelanggan harus tanya kasir untuk tahu saldo poin |

---

## 6. Rekomendasi Perbaikan (Top Improvements)

### 6.1 Prioritas 1: Promosi per Produk/Kategori (mengatasi G1)

**Deskripsi:**
- Tambah field "Berlaku Untuk" di form promosi: Semua Produk, Kategori Tertentu, Produk Tertentu
- Multi-select untuk kategori dan produk
- Di POS, sistem otomatis mendeteksi item yang eligible dan menerapkan diskon yang sesuai

**Estimasi effort:** 4-5 hari (backend logic + frontend selector + POS integration)
**Impact:** Tinggi — ini adalah fitur table-stakes yang dimiliki semua kompetitor

### 6.2 Prioritas 2: Loyalty Program CRUD + Redemption Flow (mengatasi G2, G3, G7)

**Deskripsi:**
- **Edit program:** Kemampuan mengubah konfigurasi program yang sudah berjalan
- **CRUD tier:** Tambah, edit, hapus tier loyalty dari halaman loyalty
- **Redemption di POS:** Saat assign pelanggan, tampilkan saldo poin. Tombol "Tukar Poin" yang mengurangi poin dan memberikan potongan sesuai konfigurasi
- **Poin history:** Tab di profil pelanggan yang menampilkan riwayat earning dan redemption

**Estimasi effort:** 5-7 hari (backend + frontend + POS flow)
**Impact:** Tinggi — tanpa redemption, program loyalty hanya setengah jadi

### 6.3 Prioritas 3: Credit Limit dan Export (mengatasi G4, G9)

**Deskripsi:**
- **Credit limit per pelanggan:** Tambah field di profil pelanggan. Saat BON baru dibuat dan total outstanding + BON baru melebihi limit, tampilkan warning/block
- **Export piutang:** Tombol export CSV/Excel di halaman BON yang menghasilkan laporan outstanding, aging, dan riwayat pembayaran
- **Integrasi dengan profil pelanggan:** Tampilkan ringkasan piutang di halaman detail pelanggan

**Estimasi effort:** 3-4 hari
**Impact:** Tinggi — control dan visibility yang krusial untuk kesehatan keuangan

### 6.4 Prioritas 4: Voucher Enhancement (mengatasi G5, G8)

**Deskripsi:**
- **Deactivate individual voucher:** Tombol nonaktifkan per voucher di daftar
- **Minimum pembelian:** Tambah field optional di form generator
- **Targeted voucher:** Generate voucher yang hanya bisa digunakan pelanggan tertentu (assign ke customer ID)

**Estimasi effort:** 3-4 hari
**Impact:** Sedang-Tinggi — meningkatkan kontrol dan efektivitas campaign

### 6.5 Prioritas 5: Time-Based dan Tiered Promotions (mengatasi G6)

**Deskripsi:**
- **Time-based:** Tambah field hari dan jam di form promosi (contoh: Senin-Jumat, 14:00-17:00)
- **Tiered discount:** Tambah tipe diskon baru "Tiered" dengan rules: min qty 3 = diskon 10%, min qty 5 = diskon 15%
- **Promotion stacking rules:** Konfigurasi global apakah promosi bisa distack atau hanya satu yang berlaku

**Estimasi effort:** 4-5 hari
**Impact:** Sedang — fitur yang membedakan dari kompetitor di segmen yang sama

---

## 7. Roadmap Pengembangan

### Phase 1: Core Completion (Sprint 1-2)

| Item | Sub-fitur | Deskripsi | Effort |
|------|-----------|-----------|--------|
| Promosi per produk/kategori | Promotions | Tambah scope promosi: global / kategori / produk | 4 hari |
| Edit loyalty program | Loyalty | Kemampuan ubah konfigurasi setelah dibuat | 2 hari |
| CRUD tier | Loyalty | Tambah/edit/hapus tier dari UI | 3 hari |
| Redemption flow POS | Loyalty | Tukar poin untuk potongan harga di POS | 3 hari |
| Credit limit | Credit Sales | Set dan enforce limit kredit per pelanggan | 2 hari |

**Outcome:** Semua sub-fitur mencapai level minimum viable — tidak ada lagi fitur "setengah jadi."

### Phase 2: Control & Visibility (Sprint 3-4)

| Item | Sub-fitur | Deskripsi | Effort |
|------|-----------|-----------|--------|
| Poin history | Loyalty | Riwayat earning/redemption per pelanggan | 3 hari |
| Deactivate voucher | Voucher | Nonaktifkan voucher individual | 1 hari |
| Min. pembelian voucher | Voucher | Field opsional di generator | 1 hari |
| Export piutang | Credit Sales | Export CSV/Excel dari daftar piutang | 2 hari |
| Promotion report | Promotions | Dashboard performa per promosi | 3 hari |
| Stacking rules | Promotions | Konfigurasi global untuk promosi ganda | 2 hari |

**Outcome:** Kontrol penuh dan visibility terhadap efektivitas setiap fitur promosi.

### Phase 3: Advanced Promotions (Sprint 5-6)

| Item | Sub-fitur | Deskripsi | Effort |
|------|-----------|-----------|--------|
| Time-based promotions | Promotions | Happy Hour: hari + jam tertentu | 3 hari |
| Tiered discounts | Promotions | Diskon berdasarkan quantity | 3 hari |
| Targeted voucher | Voucher | Voucher untuk pelanggan tertentu | 2 hari |
| Referral voucher | Voucher | Sistem referral dengan voucher otomatis | 4 hari |
| Auto-reminder piutang | Credit Sales | Notifikasi sebelum/sesudah jatuh tempo | 3 hari |
| Poin di struk | Loyalty | Print saldo poin di struk transaksi | 1 hari |

**Outcome:** Promosi yang lebih fleksibel dan loyalty yang lebih engaging.

### Phase 4: Automation & Intelligence (Sprint 7-8)

| Item | Sub-fitur | Deskripsi | Effort |
|------|-----------|-----------|--------|
| Birthday bonus | Loyalty | Auto-poin/voucher di bulan ulang tahun | 3 hari |
| Win-back campaigns | Promotions | Auto-voucher untuk pelanggan yang lama tidak datang | 3 hari |
| Promotion A/B testing | Promotions | Bandingkan 2 versi promosi | 4 hari |
| Customer-facing poin | Loyalty | Web page untuk pelanggan cek saldo poin via link/QR | 4 hari |
| Interest/denda keterlambatan | Credit Sales | Bunga otomatis untuk piutang overdue | 2 hari |
| Smart recommendations | All | Rekomendasi promosi berdasarkan data penjualan | 5 hari |

**Outcome:** Ekosistem promosi yang cerdas dan terotomatisasi, mengurangi beban manual owner.

---

## 8. Kesimpulan

Modul Promosi TiloPOS memiliki arsitektur yang baik dengan empat sub-fitur yang saling melengkapi. Keunggulan paling menonjol adalah **Credit Sales (BON) terintegrasi** — fitur yang tidak dimiliki Moka maupun Majoo, dan sangat dibutuhkan oleh toko bangunan, grosir, dan bisnis B2B di Indonesia.

**Sub-fitur terkuat:** Credit Sales — dashboard, 4 status, aging report, dan partial payment sudah cukup lengkap. Tinggal ditambah credit limit dan export.

**Sub-fitur yang paling perlu perbaikan:** Loyalty Program — saat ini hanya bisa create dan lihat, tapi belum bisa edit, manage tier, atau melakukan redemption di POS. Tanpa redemption flow, program loyalty hanya mengumpulkan poin tanpa bisa ditukarkan — ini akan membuat pelanggan kecewa.

**Quick wins yang paling berdampak:**
1. Redemption flow di POS (bisa tukar poin) — menghidupkan program loyalty
2. Promosi per produk/kategori — table stakes yang belum ada
3. Credit limit per pelanggan — kontrol risiko keuangan

Fokus Phase 1-2 pada penyelesaian fitur yang "setengah jadi" akan memberikan dampak terbesar. Phase 3-4 bisa dilakukan setelah fondasi solid, dengan fokus pada automasi yang mengurangi beban operasional pemilik bisnis.

Dengan roadmap ini, modul Promosi TiloPOS bisa menjadi **yang paling komprehensif di segmen UMKM Indonesia** — empat pilar (promosi, voucher, loyalty, BON) yang tidak dimiliki kompetitor mana pun dalam satu paket terintegrasi.
