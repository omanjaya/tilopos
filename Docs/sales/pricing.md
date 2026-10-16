# Strategi Harga TiloPOS

Dokumen ini menjabarkan model harga, struktur tier, justifikasi harga, dan strategi diskon TiloPOS secara lengkap. Disusun sebagai panduan internal tim sales dan sebagai referensi dalam negosiasi dengan calon pelanggan.

---

## 1. Model Harga: Gambaran Umum

TiloPOS menggunakan **model berlangganan (subscription-based)** dengan prinsip-prinsip berikut:

### Prinsip Dasar Pricing

1. **Transparan** — Tidak ada biaya tersembunyi (hidden cost). Semua fitur yang termasuk dalam paket tertulis jelas.
2. **Scalable** — Harga tumbuh bersama bisnis. Mulai dari gratis, naik sesuai kebutuhan.
3. **Per-outlet, bukan per-device** — Satu outlet bisa menggunakan unlimited device tanpa biaya tambahan.
4. **Value-driven** — Harga mencerminkan nilai yang diberikan, bukan biaya produksi.
5. **Kompetitif** — 30-60% lebih murah dari kompetitor dengan fitur lebih lengkap.

### Alur Monetisasi

```
Starter (Gratis) → Professional (Berbayar) → Enterprise (Premium)
       ↓                    ↓                       ↓
   1 outlet            Multi-outlet            Custom needs
   Fitur inti       Fitur lengkap           Fitur + dukungan premium
   Self-service     Guided onboarding       Dedicated support
```

---

## 2. Struktur Tier

### Tier 1: Starter (GRATIS)

**Target**: UMKM baru, bisnis kecil 1 outlet, pengguna yang ingin coba dulu.

| Komponen | Detail |
|----------|--------|
| **Harga** | Rp 0/bulan (gratis selamanya) |
| **Outlet** | 1 outlet |
| **Device** | Unlimited |
| **User/Karyawan** | Hingga 3 user |
| **Produk** | Hingga 200 SKU |
| **Transaksi** | Hingga 500 transaksi/bulan |

**Fitur yang termasuk:**
- POS kasir lengkap (transaksi, pembayaran, struk)
- Manajemen produk dasar (kategori, varian, modifier)
- Manajemen stok dasar (stok masuk/keluar, alert stok rendah)
- Laporan penjualan dasar (harian, mingguan, bulanan)
- Database pelanggan (hingga 500 kontak)
- 1 metode pembayaran digital (QRIS)
- Cetak struk (Bluetooth/USB)
- Offline mode
- Aplikasi mobile untuk monitoring

**Fitur yang TIDAK termasuk:**
- KDS (Kitchen Display System)
- Table management
- Self-order QR
- Multi-outlet
- Fitur bisnis jasa (appointment, work order)
- Laporan lanjutan (trend, forecasting, custom)
- CRM & loyalty program
- Integrasi marketplace & food delivery
- Open API
- WhatsApp campaign
- Scheduled report
- Dedicated support (hanya knowledge base + community)

**Strategi Starter:**
Tier Starter berfungsi sebagai pintu masuk (acquisition channel). Tujuannya:
- Menghilangkan barrier to entry
- Membiarkan pengguna merasakan kualitas produk
- Menciptakan kebutuhan upgrade alami saat bisnis berkembang
- Menjadi pembanding kuat terhadap Qasir (gratis tapi jauh lebih terbatas)

---

### Tier 2: Professional

**Target**: Bisnis aktif dengan 1-5 outlet, F&B, retail menengah, bisnis jasa.

| Komponen | Detail |
|----------|--------|
| **Harga** | Rp 249.000/bulan per outlet |
| **Harga Tahunan** | Rp 174.300/bulan per outlet (hemat 30%) |
| **Outlet** | 1 outlet (tambah Rp 99.000/outlet) |
| **Device** | Unlimited |
| **User/Karyawan** | Unlimited |
| **Produk** | Unlimited SKU |
| **Transaksi** | Unlimited |

**Semua fitur Starter, DITAMBAH:**

**POS Lanjutan:**
- Multi-payment / split bill (per item, per jumlah, equal)
- Hold/pending order
- Shift management detail
- Void/refund dengan approval
- Custom struk (logo, layout, pesan)
- Multi metode pembayaran (QRIS, e-wallet, kartu, transfer bank)

**F&B:**
- KDS (Kitchen Display System) dengan multi-station routing
- Table management (visual floor plan)
- Self-order QR (pelanggan pesan dari HP)
- Dine-in / takeaway / delivery management
- Merge & move table
- Service charge & pajak restoran (PB1) otomatis
- Tip management

**Inventori Lanjutan:**
- Stock opname dengan variance report
- Purchase order lengkap
- Supplier management
- Goods receiving dengan QC check
- Batch tracking
- Expired date tracking
- Low stock alert multi-channel (app, email, WhatsApp)
- Recipe/BOM management (auto-deduct bahan baku)
- Waste/spoilage tracking

**Bisnis Jasa:**
- Appointment / booking online
- Work order tracking
- Item tracking (laundry)
- Service duration tracking
- Staff/therapist assignment
- Commission per service

**CRM & Marketing:**
- Loyalty points program
- Membership tiers
- Segmentasi pelanggan (RFM analysis)
- Birthday promo otomatis
- Gift card / voucher
- Customer feedback post-transaction
- WhatsApp campaign (hingga 1.000 pesan/bulan)

**Laporan:**
- Semua laporan detail (penjualan, inventori, karyawan, pelanggan)
- Laporan laba kotor
- Food cost report
- Heatmap penjualan per jam/hari
- Export Excel & PDF
- Dashboard real-time

**Integrasi:**
- GoFood / GrabFood
- Marketplace (Tokopedia, Shopee)
- Payment gateway multi-provider
- Akuntansi (Jurnal, Accurate)
- WhatsApp Business

**Support:**
- Live chat (jam kerja: 08.00-22.00)
- WhatsApp support
- Video tutorial lengkap
- Onsite training (1x gratis)
- Data migration gratis

---

### Tier 3: Enterprise

**Target**: Bisnis multi-outlet (5+ outlet), franchise, chain restaurant, bisnis dengan kebutuhan custom.

| Komponen | Detail |
|----------|--------|
| **Harga** | Rp 499.000/bulan per outlet |
| **Harga Tahunan** | Rp 349.300/bulan per outlet (hemat 30%) |
| **Outlet** | Unlimited (volume discount berlaku) |
| **Device** | Unlimited |
| **User/Karyawan** | Unlimited |
| **Produk** | Unlimited SKU |
| **Transaksi** | Unlimited |

**Semua fitur Professional, DITAMBAH:**

**Enterprise Features:**
- Multi-warehouse management
- Serial number tracking
- Auto-reorder point (otomatis buat PO saat stok rendah)
- Consolidated multi-outlet reporting
- Per-outlet pricing & promo management
- Stock transfer antar outlet dengan approval flow
- Central product catalog management

**Analytics & Forecasting:**
- Trend analysis
- Sales forecasting
- Demand prediction
- Custom report builder
- Scheduled report (auto-email harian/mingguan)

**CRM Enterprise:**
- Referral program
- WhatsApp campaign unlimited
- Segmentasi pelanggan advanced
- Customer lifetime value tracking
- Churn prediction

**Integrasi Enterprise:**
- Open API (REST API lengkap)
- Webhook real-time
- Custom integration support
- SSO (Single Sign-On)
- Dedicated server option

**Support Enterprise:**
- Live chat 24/7
- Phone support dedicated
- Dedicated account manager
- SLA response < 1 jam
- Onsite training unlimited
- Priority bug fix
- Quarterly business review
- Custom development (dengan quotasi terpisah)

---

## 3. Add-on (Tambahan Berbayar)

Beberapa fitur bisa dibeli sebagai add-on di atas tier manapun:

| Add-on | Harga/bulan | Tersedia di Tier |
|--------|-------------|-----------------|
| **Outlet tambahan** | Rp 99.000/outlet | Professional, Enterprise |
| **WhatsApp Campaign Extra** (+ 5.000 pesan) | Rp 99.000 | Professional |
| **Dedicated Server** | Rp 500.000 | Enterprise |
| **Custom Report Development** | Rp 250.000/report | Professional, Enterprise |
| **Custom Integration Development** | Mulai Rp 1.000.000 | Professional, Enterprise |
| **Premium Onsite Training** (per sesi) | Rp 500.000 | Starter, Professional |
| **Data Migration dari POS lain** | Gratis (Professional+) / Rp 300.000 (Starter) | Semua |
| **Extra Storage** (+ 10 GB) | Rp 50.000 | Semua |

---

## 4. Perbandingan Fitur per Tier

| Fitur | Starter | Professional | Enterprise |
|-------|---------|-------------|-----------|
| **POS dasar** | Ya | Ya | Ya |
| **Offline mode** | Ya | Ya | Ya |
| **Unlimited device** | Ya | Ya | Ya |
| **User/karyawan** | Maks 3 | Unlimited | Unlimited |
| **Produk** | Maks 200 | Unlimited | Unlimited |
| **Transaksi** | Maks 500/bulan | Unlimited | Unlimited |
| **Outlet** | 1 | 1 (+ Rp 99K/outlet) | Unlimited (volume discount) |
| **Multi-payment/split bill** | - | Ya | Ya |
| **KDS** | - | Ya | Ya |
| **Table management** | - | Ya | Ya |
| **Self-order QR** | - | Ya | Ya |
| **Inventori lanjutan** | - | Ya | Ya |
| **Batch/serial tracking** | - | Batch saja | Batch + Serial |
| **Recipe/BOM** | - | Ya | Ya |
| **Appointment/work order** | - | Ya | Ya |
| **Loyalty program** | - | Ya | Ya |
| **WhatsApp campaign** | - | 1.000 pesan/bulan | Unlimited |
| **RFM analysis** | - | Ya | Ya |
| **Referral program** | - | - | Ya |
| **Laporan lanjutan** | - | Ya | Ya |
| **Scheduled report** | - | - | Ya |
| **Custom report builder** | - | - | Ya |
| **Trend/forecasting** | - | - | Ya |
| **Multi-warehouse** | - | - | Ya |
| **Auto-reorder** | - | - | Ya |
| **Open API** | - | - | Ya |
| **Webhook** | - | - | Ya |
| **SSO** | - | - | Ya |
| **Dedicated account manager** | - | - | Ya |
| **SLA < 1 jam** | - | - | Ya |
| **Phone support** | - | - | Ya |
| **24/7 support** | - | - | Ya |

---

## 5. Volume Discount untuk Enterprise

Untuk pelanggan Enterprise dengan banyak outlet, berlaku volume discount:

| Jumlah Outlet | Harga per Outlet/bulan | Diskon |
|---------------|----------------------|--------|
| 1-5 outlet | Rp 499.000 | - |
| 6-10 outlet | Rp 449.100 | 10% |
| 11-20 outlet | Rp 399.200 | 20% |
| 21-50 outlet | Rp 349.300 | 30% |
| 51-100 outlet | Rp 299.400 | 40% |
| 100+ outlet | Custom pricing | Negosiasi |

**Contoh kalkulasi:**
- Chain restaurant 15 outlet: 15 x Rp 399.200 = **Rp 5.988.000/bulan**
- Franchise 50 outlet: 50 x Rp 349.300 = **Rp 17.465.000/bulan**

Bandingkan dengan Moka POS (15 outlet): 15 x Rp 799.000 = Rp 11.985.000/bulan. **TiloPOS 50% lebih hemat.**

---

## 6. Justifikasi Harga vs Kompetitor

### Mengapa TiloPOS Lebih Murah dengan Fitur Lebih Banyak?

1. **Arsitektur modern**: Dibangun dari nol dengan teknologi terbaru (NestJS, React, PostgreSQL). Tidak ada technical debt dari sistem legacy yang mahal untuk di-maintain.

2. **Cloud-native & efficient**: Infrastruktur cloud yang auto-scale, sehingga biaya per pelanggan lebih rendah dibanding kompetitor yang masih menggunakan arsitektur monolith.

3. **Self-service onboarding**: Setup dan konfigurasi bisa dilakukan sendiri dalam hitungan jam, mengurangi biaya support dibanding ESB yang butuh tim implementasi.

4. **Open-source components**: Menggunakan teknologi open-source berkualitas tinggi (PostgreSQL, Redis, RabbitMQ) tanpa biaya lisensi.

5. **Market penetration strategy**: Harga agresif untuk merebut market share dari incumbent. Margin tetap sehat karena efisiensi teknologi.

### Perbandingan Harga Langsung

**Skenario: Restoran 1 outlet, 2 kasir + 1 KDS**

| Komponen | TiloPOS Professional | Moka POS Pro | Majoo Pro | ESB |
|----------|---------------------|-------------|-----------|-----|
| Langganan bulanan | Rp 249.000 | Rp 499.000 | Rp 499.000 | Rp 1.500.000+ |
| Device tambahan (2) | Rp 0 | Rp 198.000 | Rp 198.000 | Custom |
| KDS addon | Rp 0 (termasuk) | Rp 0 (termasuk Pro) | Rp 0 (termasuk) | Rp 0 (termasuk) |
| Self-order QR | Rp 0 (termasuk) | Rp 99.000 (addon) | Rp 149.000 (addon) | Rp 0 (termasuk) |
| Setup fee | Rp 0 | Rp 500.000 (sekali) | Rp 300.000 (sekali) | Rp 2.000.000+ |
| **Total bulan pertama** | **Rp 249.000** | **Rp 1.296.000** | **Rp 1.146.000** | **Rp 3.500.000+** |
| **Total per tahun** | **Rp 2.988.000** | **Rp 9.564.000** | **Rp 8.064.000** | **Rp 18.000.000+** |

**Penghematan TiloPOS vs Moka: Rp 6.576.000/tahun (69%)**
**Penghematan TiloPOS vs ESB: Rp 15.012.000+/tahun (83%)**

---

## 7. Perhitungan ROI (Return on Investment)

### Narasi ROI untuk Calon Pelanggan

"Investasi Anda di TiloPOS bukan biaya, melainkan investasi yang menghasilkan pengembalian berlipat. Berikut perhitungan konservatif."

### ROI Calculator: Restoran Menengah

**Asumsi:**
- Omzet rata-rata: Rp 30.000.000/bulan
- 200 transaksi/hari
- 10 karyawan
- 1 outlet

**Penghematan & Peningkatan Pendapatan:**

| Sumber ROI | Tanpa TiloPOS | Dengan TiloPOS | Selisih/bulan |
|-----------|-------------|---------------|--------------|
| **Shrinkage/kehilangan stok** (rata-rata 3% omzet) | Rp 900.000 | Rp 150.000 (turun ke 0.5%) | +Rp 750.000 |
| **Food cost optimization** (BOM tracking mengurangi waste 5%) | Rp 9.000.000 food cost | Rp 8.550.000 food cost | +Rp 450.000 |
| **Kecepatan transaksi** (self-order QR: +15% capacity) | 200 transaksi | 230 transaksi | +Rp 4.500.000 |
| **Repeat customer** (loyalty program: +10% retensi) | 40% repeat | 50% repeat | +Rp 3.000.000 |
| **Efisiensi karyawan** (KDS mengurangi 1 staff) | 10 karyawan | 9 karyawan | +Rp 2.500.000 |
| **Pengurangan kesalahan pesanan** (KDS: -80% error) | 5% error rate | 1% error rate | +Rp 600.000 |
| **Total penghematan/bulan** | | | **+Rp 11.800.000** |
| **Biaya TiloPOS Professional** | | | **-Rp 249.000** |
| **NET ROI per bulan** | | | **+Rp 11.551.000** |

**ROI = (Rp 11.551.000 / Rp 249.000) x 100% = 4.639%**

**Payback period: < 1 hari** (biaya bulanan TiloPOS terbayar dari penghematan 1 hari saja)

### ROI Calculator: Retail Menengah

**Asumsi:**
- Omzet rata-rata: Rp 50.000.000/bulan
- 500 SKU
- 5 karyawan
- 1 outlet

| Sumber ROI | Tanpa TiloPOS | Dengan TiloPOS | Selisih/bulan |
|-----------|-------------|---------------|--------------|
| **Shrinkage/kehilangan stok** | Rp 1.500.000 (3%) | Rp 250.000 (0.5%) | +Rp 1.250.000 |
| **Dead stock reduction** (forecasting) | Rp 5.000.000 dead stock | Rp 2.500.000 | +Rp 2.500.000 |
| **Efisiensi stock opname** (dari 2 hari → 2 jam) | Rp 400.000 (hilang omzet) | Rp 0 (tetap buka) | +Rp 400.000 |
| **Pricing optimization** (analytics) | Margin 25% | Margin 28% | +Rp 1.500.000 |
| **Repeat customer** (loyalty) | 30% repeat | 40% repeat | +Rp 5.000.000 |
| **Total penghematan/bulan** | | | **+Rp 10.650.000** |
| **Biaya TiloPOS Professional** | | | **-Rp 249.000** |
| **NET ROI per bulan** | | | **+Rp 10.401.000** |

---

## 8. Strategi Diskon

### 8.1 Diskon Tahunan (Annual Discount)

| Tier | Bulanan | Tahunan (per bulan) | Diskon | Total Hemat/tahun |
|------|---------|--------------------|---------|--------------------|
| Professional | Rp 249.000 | Rp 174.300 | 30% | Rp 896.400 |
| Enterprise | Rp 499.000 | Rp 349.300 | 30% | Rp 1.796.400 |

**Taktik penjualan**: "Bayar 8 bulan, dapat 12 bulan." Framing ini lebih efektif daripada mengatakan "diskon 30%."

### 8.2 Diskon Referral

| Jenis Referral | Benefit Referrer | Benefit Referred |
|---------------|-----------------|-----------------|
| **Pelanggan aktif mengajak bisnis baru** | 1 bulan gratis per referral berhasil | 1 bulan gratis saat sign up |
| **Pelanggan Enterprise mengajak enterprise** | 2 bulan gratis per referral | 2 bulan gratis saat sign up |
| **Referral 5+ bisnis dalam 3 bulan** | Upgrade gratis ke tier berikutnya selama 3 bulan | 1 bulan gratis |

**Cara kerja**: Setiap pelanggan mendapat kode referral unik. Saat bisnis baru subscribe (minimal Professional) menggunakan kode tersebut, kedua pihak mendapat benefit.

### 8.3 Diskon Early Adopter

Untuk 100 pelanggan pertama di setiap kota baru yang dijangkau:

| Benefit | Detail |
|---------|--------|
| **Harga lock-in** | Harga saat sign up berlaku selamanya (tidak ikut kenaikan) |
| **Bonus bulan gratis** | 2 bulan gratis tambahan di atas diskon tahunan |
| **Priority feature request** | Suara mereka lebih didengar untuk pengembangan fitur baru |
| **Badge "Early Adopter"** | Exclusive badge di profil bisnis mereka |

### 8.4 Diskon Migrasi dari Kompetitor

Untuk bisnis yang pindah dari POS lain ke TiloPOS:

| Dari POS | Benefit |
|---------|---------|
| **Moka POS** | 3 bulan gratis + migrasi data gratis + onsite training gratis |
| **Majoo** | 3 bulan gratis + migrasi data gratis |
| **iSeller** | 2 bulan gratis + migrasi data gratis |
| **ESB** | 3 bulan gratis + migrasi data gratis + dedicated migration support |
| **POS lainnya** | 2 bulan gratis + migrasi data gratis |

**Justifikasi**: Biaya akuisisi pelanggan dari kompetitor lebih efisien daripada akuisisi pelanggan baru. Pelanggan yang sudah terbiasa menggunakan POS memiliki lifetime value yang lebih tinggi.

### 8.5 Diskon Industri

Untuk segmen industri tertentu:

| Industri | Diskon | Alasan |
|---------|--------|--------|
| **Pendidikan** (kantin sekolah, koperasi) | 50% | CSR dan penetrasi pasar |
| **UMKM binaan pemerintah** | 40% | Kerjasama program pemerintah |
| **Sosial enterprise** | 40% | CSR |
| **Franchise baru (< 1 tahun)** | 20% | Investasi di pertumbuhan franchise |

### 8.6 Diskon Bundling

| Bundle | Isi | Harga Normal | Harga Bundle | Hemat |
|--------|-----|-------------|-------------|-------|
| **Starter Kit F&B** | Professional + printer + cash drawer | Rp 3.249.000 | Rp 2.499.000 | 23% |
| **Retail Complete** | Professional + barcode scanner + printer + label printer | Rp 4.249.000 | Rp 3.299.000 | 22% |
| **Multi-Outlet Pack** (3 outlet) | Enterprise x 3 outlet + onsite training | Rp 1.797.000/bulan | Rp 1.347.000/bulan | 25% |

---

## 9. Strategi Upsell

### Alur Upsell Natural

```
Starter → Professional (saat butuh fitur lebih / outlet ke-2 / lebih dari 500 transaksi)
Professional → Enterprise (saat 5+ outlet / butuh API / butuh dedicated support)
```

### Trigger Point Upsell

| Dari | Ke | Trigger | Pesan |
|------|-----|---------|-------|
| Starter | Professional | Mendekati 500 transaksi/bulan | "Bisnis Anda berkembang! Upgrade ke Professional untuk transaksi unlimited." |
| Starter | Professional | Mendekati 200 SKU | "Katalog produk Anda sudah hampir penuh. Upgrade untuk unlimited produk." |
| Starter | Professional | Tanya fitur KDS/table | "Fitur F&B lengkap tersedia di Professional. Coba gratis 14 hari!" |
| Professional | Enterprise | Outlet ke-6 | "Dengan 6+ outlet, Enterprise memberikan volume discount yang lebih hemat." |
| Professional | Enterprise | Tanya API/webhook | "Butuh integrasi custom? Enterprise memberikan akses API lengkap." |
| Professional | Enterprise | Tanya forecasting | "Analytics advanced tersedia di Enterprise. Lihat demo?" |

### Trial Period untuk Upsell

- Starter ke Professional: **14 hari free trial** (semua fitur Professional)
- Professional ke Enterprise: **30 hari free trial** (semua fitur Enterprise)

Setelah trial berakhir, fitur otomatis kembali ke tier asal. Tidak ada charge otomatis.

---

## 10. Kebijakan Pembayaran

### Metode Pembayaran

| Metode | Detail |
|--------|--------|
| **Transfer bank** | BCA, Mandiri, BNI, BRI, CIMB |
| **Virtual Account** | Semua bank utama |
| **QRIS** | Semua e-wallet & m-banking |
| **Kartu kredit** | Visa, Mastercard (cicilan 0% 3/6/12 bulan tersedia) |
| **Invoice perusahaan** | Untuk Enterprise (NET 30 terms) |

### Kebijakan Refund

| Situasi | Kebijakan |
|---------|-----------|
| **Pembatalan dalam 14 hari pertama** | Full refund, tanpa pertanyaan |
| **Pembatalan setelah 14 hari (bulanan)** | Prorata untuk sisa bulan |
| **Pembatalan (tahunan)** | Prorata untuk sisa bulan, dikurangi selisih diskon tahunan |
| **Downgrade tier** | Berlaku di billing cycle berikutnya |

### Kebijakan Kenaikan Harga

- Pelanggan existing mendapat **pemberitahuan 90 hari** sebelum kenaikan harga berlaku
- Pelanggan tahunan: harga terkunci selama masa langganan aktif
- Pelanggan Early Adopter: harga terkunci selamanya
- Kenaikan harga maksimal **15% per tahun**

---

## 11. Matriks Keputusan untuk Tim Sales

### Kapan Rekomendasikan Starter?
- Bisnis baru belum beroperasi (testing/preparation)
- UMKM mikro (omzet < Rp 5.000.000/bulan)
- Pemilik bisnis sangat price-sensitive dan perlu dikonversi perlahan
- Bisnis sederhana 1 outlet, < 200 produk, tanpa kebutuhan F&B/jasa khusus

### Kapan Rekomendasikan Professional?
- Bisnis aktif dengan omzet > Rp 10.000.000/bulan
- F&B yang butuh KDS, table management, self-order
- Retail dengan > 200 SKU atau butuh inventori lanjutan
- Bisnis jasa (salon, bengkel, laundry)
- 1-5 outlet
- Butuh loyalty program atau marketing tools

### Kapan Rekomendasikan Enterprise?
- 5+ outlet atau rencana ekspansi agresif
- Franchise atau chain business
- Butuh integrasi dengan sistem internal (ERP, custom app)
- Butuh analytics lanjutan untuk decision making
- Butuh dedicated support dan SLA ketat
- Budget bukan masalah utama, fokus pada value dan service

---

## 12. FAQ Harga (untuk Tim Sales)

**T: Kenapa lebih murah dari Moka? Apa kualitasnya lebih rendah?**
J: Tidak. TiloPOS dibangun dengan arsitektur modern yang lebih efisien. Kami tidak punya biaya legacy system dan overhead korporasi besar. Penghematan ini kami teruskan ke pelanggan. Secara fitur, TiloPOS justru lebih lengkap.

**T: Apakah ada biaya tersembunyi?**
J: Tidak. Harga yang tertulis adalah harga final. Tidak ada setup fee, biaya per device, atau fitur yang tiba-tiba berbayar setelah sign up.

**T: Bisa negosiasi harga?**
J: Harga list sudah sangat kompetitif. Namun, kami fleksibel melalui diskon tahunan (30%), volume discount (hingga 40% untuk 51+ outlet), dan promo referral. Tim sales juga memiliki authority untuk memberikan free trial extended untuk prospect strategis.

**T: Kalau bisnis saya tutup, bagaimana?**
J: Anda bisa cancel kapan saja. Data Anda akan tersimpan selama 90 hari setelah pembatalan untuk jaga-jaga ingin kembali. Setelah itu, data dihapus permanen sesuai kebijakan privasi.

**T: Bisa custom pricing untuk kebutuhan khusus?**
J: Ya, untuk Enterprise. Hubungi tim sales untuk diskusi kebutuhan spesifik Anda. Kami bisa membuat paket custom yang sesuai.

---

## Penutup

Strategi harga TiloPOS dirancang untuk memaksimalkan akuisisi pelanggan melalui tier Starter gratis, mengonversi ke Professional saat bisnis berkembang, dan mempertahankan pelanggan besar di Enterprise. Dengan harga 30-60% lebih murah dari kompetitor utama dan fitur yang lebih lengkap, TiloPOS memiliki value proposition yang sangat kuat di pasar POS Indonesia.

**Pesan kunci untuk setiap sales conversation:**

> "TiloPOS memberikan fitur setara solusi enterprise dengan harga UMKM. Mulai gratis, bayar hanya saat bisnis Anda sudah merasakan manfaatnya. Tanpa risiko, tanpa biaya tersembunyi."
