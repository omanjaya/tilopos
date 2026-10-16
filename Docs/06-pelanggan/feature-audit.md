# Audit Fitur: Modul Pelanggan (CRM)

Dokumen ini menganalisis kondisi terkini modul Pelanggan di TiloPOS, mengevaluasi UX, membandingkan dengan kompetitor dan best practice industri, serta menyusun rekomendasi perbaikan dan roadmap pengembangan.

---

## 1. Kondisi Terkini (Current State)

### 1.1 Halaman Daftar Pelanggan (`customers-page.tsx`)

**Fitur yang tersedia:**
- Tabel data dengan kolom: Nama, Email, Telepon, Total Belanja, Kunjungan, Poin (conditional), Status, Aksi
- Pencarian instan (search by text)
- Sorting pada kolom: Nama, Total Belanja, Kunjungan
- Paginasi dengan default 15 item per halaman
- Tombol "Tambah Pelanggan" dengan keyboard shortcut `N`
- Tombol "Import Excel" untuk bulk import
- Aksi per-baris: Edit dan Hapus (soft delete — ubah status menjadi Nonaktif)
- Kolom Poin hanya muncul jika feature flag `CUSTOMER_LOYALTY` aktif
- Empty state dengan CTA untuk tambah pelanggan atau import
- Komponen HelpSidebar dan InlineHelpCard untuk bantuan kontekstual

**Versi mobile:** Tersedia sebagai file terpisah (`customers-page.mobile.tsx`) — sesuai pola DeviceRoute.

### 1.2 Form Pelanggan (`customer-form-page.tsx`)

**Fitur yang tersedia:**
- Mode create dan edit (shared form)
- Field: Nama (wajib, min 2 karakter), Email (opsional, validasi format), Telepon, Tanggal Lahir, Alamat, Catatan
- Validasi menggunakan Zod schema + React Hook Form
- Di mode edit, menampilkan ringkasan statistik: Total Belanja, Kunjungan, Poin Loyalti (dengan FeatureGate)
- Error handling via `handleMutationError`
- Loading state dan disabled button saat submit

**Field yang belum ada (dari spesifikasi):**
- Tipe pelanggan (B2B/B2C)
- NPWP / Tax ID untuk pelanggan B2B
- Enrollment loyalty (opt-in/opt-out)

### 1.3 Segmentasi Pelanggan (`customer-segments-page.tsx`)

**Fitur yang tersedia:**
- Daftar segmen dalam tabel: Nama, Tipe, Kriteria, Jumlah Pelanggan, Tanggal Dibuat, Aksi
- Tipe segmen preset: Pelanggan Baru, Reguler, VIP, Berisiko, Churned, Kustom
- Buat segmen kustom via dialog modal dengan kriteria dinamis:
  - Min/Max Belanja
  - Min/Max Kunjungan
  - Tier Loyalty
  - Min/Max Hari Sejak Kunjungan Terakhir
- Lihat daftar pelanggan per segmen via dialog modal
- Hapus segmen (hanya tipe kustom)
- AND logic untuk multiple criteria

---

## 2. Evaluasi UX

### 2.1 Kelebihan

| Aspek | Evaluasi |
|-------|----------|
| Konsistensi UI | Mengikuti pola DataTable + PageHeader yang konsisten dengan modul lain |
| Pencarian | Instan dan responsif, placeholder text jelas |
| Empty state | Informatif dengan CTA yang relevan — mendorong pengguna untuk mulai |
| Validasi form | Real-time validation dengan pesan error dalam Bahasa Indonesia |
| Feature gating | Poin loyalti hanya muncul jika fitur diaktifkan — menghindari kebingungan |
| Help system | InlineHelpCard dan HelpSidebar tersedia untuk bantuan kontekstual |
| Keyboard shortcut | `N` untuk tambah baru — efisien untuk power user |

### 2.2 Kelemahan dan Area Perbaikan

| Aspek | Masalah | Dampak | Prioritas |
|-------|---------|--------|-----------|
| Filter terbatas | Tidak ada filter berdasarkan status (Aktif/Nonaktif), tipe pelanggan, atau tanggal registrasi | Sulit menemukan subset pelanggan tertentu | Tinggi |
| Tidak ada profil detail | Halaman edit hanya menampilkan ringkasan statistik, tidak ada riwayat transaksi lengkap | Pengguna harus cek laporan terpisah untuk melihat detail pembelian | Tinggi |
| Tidak ada export | Tidak ada tombol export data pelanggan ke Excel/CSV | Sulit untuk analisis offline atau integrasi dengan tools lain | Sedang |
| Form kurang lengkap | Tidak ada field tipe pelanggan (B2B/B2C), NPWP, enrollment loyalty | Kebutuhan bisnis B2B belum terpenuhi | Sedang |
| Segmentasi manual | Segmen harus dibuat manual, tidak ada auto-generated smart segments | Pengguna mungkin tidak tahu segmen apa yang berguna | Sedang |
| Tidak ada bulk action | Tidak bisa nonaktifkan, assign segmen, atau update multiple pelanggan sekaligus | Inefisien untuk manajemen database besar | Rendah |
| Visualisasi data | Tidak ada grafik trend kunjungan, distribusi belanja, atau cohort analysis | Insight terbatas pada angka mentah | Rendah |

### 2.3 Accessibility

- Tombol aksi memiliki `aria-label` ("Aksi pelanggan")
- Tombol submit memiliki `aria-busy` dan `aria-label` saat loading
- Keyboard shortcut `N` tersedia
- DropdownMenu menggunakan Radix UI (accessible by default)
- **Catatan:** Tabel besar mungkin sulit diakses dengan screen reader — perlu evaluasi lebih lanjut

---

## 3. Analisis Kompetitor

### 3.1 Moka POS

**Fitur CRM Moka:**
- Database pelanggan dengan field standar + custom fields
- Riwayat transaksi lengkap per pelanggan (timeline view)
- Customer insights: favorite items, average spend, visit frequency
- Segmentasi otomatis (New, Active, At Risk, Lost)
- Birthday marketing automation
- Loyalty program terintegrasi (stamp card digital)
- Customer feedback/review collection
- Export data pelanggan ke CSV

**Kelebihan Moka dibanding TiloPOS:**
- Riwayat transaksi detail dalam profil pelanggan (timeline view)
- Birthday marketing automation
- Customer insights yang lebih kaya (favorite items)
- Custom fields yang bisa ditambah sendiri
- Stamp card digital sebagai alternatif point-based loyalty

**Kekurangan Moka dibanding TiloPOS:**
- Segmentasi kurang fleksibel (hanya preset, tidak bisa custom criteria)
- UI lebih berat dan lambat di perangkat low-end
- Tidak ada versi mobile terpisah yang dioptimalkan

### 3.2 Majoo

**Fitur CRM Majoo:**
- Database pelanggan dengan integrasi WhatsApp
- Membership tier system (Bronze, Silver, Gold, Platinum)
- Poin loyalty otomatis
- Riwayat transaksi per pelanggan
- Broadcast message ke pelanggan (WhatsApp/SMS)
- Referral program
- Analisis RFM (Recency, Frequency, Monetary)
- Customer app (white-label)

**Kelebihan Majoo dibanding TiloPOS:**
- Integrasi WhatsApp untuk komunikasi langsung
- Analisis RFM otomatis
- Referral program built-in
- Customer app white-label
- Broadcast messaging

**Kekurangan Majoo dibanding TiloPOS:**
- Harga jauh lebih mahal (paket premium required)
- Fitur CRM hanya tersedia di paket tertentu
- Overengineered untuk UMKM kecil
- Tidak ada segmentasi custom dengan criteria builder

### 3.3 Ringkasan Perbandingan

| Fitur | TiloPOS | Moka | Majoo |
|-------|---------|------|-------|
| Database pelanggan | Ya | Ya | Ya |
| Pencarian & filter | Dasar | Lengkap | Lengkap |
| Riwayat transaksi di profil | Ringkasan saja | Detail lengkap | Detail lengkap |
| Segmentasi custom | Ya (criteria builder) | Preset saja | RFM otomatis |
| Loyalty points | Ya (feature flag) | Stamp card | Points + tier |
| Import Excel | Ya | Ya | Ya |
| Export data | Belum | Ya | Ya |
| Custom fields | Belum | Ya | Terbatas |
| Birthday automation | Belum | Ya | Ya |
| Integrasi WhatsApp | Belum | Belum | Ya |
| Broadcast messaging | Belum | Belum | Ya |
| Versi mobile dedicated | Ya | Responsive | Responsive |
| Harga | Terjangkau | Menengah | Mahal |

---

## 4. Best Practice: Referensi Industri

### 4.1 Square CRM (Customer Directory)

Square adalah benchmark untuk CRM terintegrasi POS. Fitur-fitur unggulan:

- **Smart Groups:** Segmentasi otomatis berdasarkan behavior (frequent visitors, lapsed customers, top spenders) yang di-generate tanpa input manual
- **Customer Timeline:** Riwayat lengkap semua interaksi — transaksi, feedback, notes, loyalty activity — dalam satu timeline chronological
- **Customer Notes & Attachments:** Staff bisa menambah catatan dan file ke profil pelanggan
- **Merged Profiles:** Deteksi dan merge pelanggan duplikat secara otomatis
- **Instant Actions:** Dari profil pelanggan, bisa langsung kirim receipt, create invoice, atau add to group
- **Marketing Integration:** Segmen langsung bisa digunakan untuk email campaign tanpa export/import

**Pelajaran untuk TiloPOS:**
- Customer timeline adalah fitur yang paling berdampak pada pengalaman pengguna
- Smart groups mengurangi beban kognitif pengguna — tidak perlu tahu "segmen apa yang harus dibuat"
- Merge duplicates penting seiring database membesar

### 4.2 Toast Guest Marketing

Toast adalah pemimpin POS untuk industri F&B. Pendekatan CRM mereka:

- **Guest Profiles:** Otomatis dibuat dari data pembayaran (kartu kredit) — tidak perlu input manual
- **Visit Tracking:** Frekuensi, recency, dan monetary value terlacak otomatis
- **Automated Campaigns:** Email otomatis berdasarkan trigger (first visit, birthday, lapsed)
- **Guest Feedback:** Review collection langsung dari struk digital
- **Marketing ROI:** Setiap campaign bisa dilacak ROI-nya sampai ke level transaksi

**Pelajaran untuk TiloPOS:**
- Automasi adalah kunci — mengurangi beban operasional pemilik bisnis
- Feedback loop (review dari pelanggan) memperkaya data
- ROI tracking untuk campaign membantu pemilik bisnis mengukur efektivitas

---

## 5. Gap Analysis

### 5.1 Gap Kritis (Harus segera dibenahi)

| # | Gap | Dampak | Referensi |
|---|-----|--------|-----------|
| G1 | Tidak ada halaman profil/detail pelanggan dengan riwayat transaksi | Pengguna tidak bisa melihat journey pelanggan secara utuh | Square Customer Timeline |
| G2 | Tidak ada export data pelanggan | Analisis offline dan integrasi tools lain terhambat | Moka, Majoo, Square |
| G3 | Filter di daftar pelanggan sangat terbatas | Pencarian subset pelanggan spesifik sulit dilakukan | Moka advanced filter |

### 5.2 Gap Signifikan (Penting untuk diferensiasi)

| # | Gap | Dampak | Referensi |
|---|-----|--------|-----------|
| G4 | Tidak ada field tipe pelanggan dan NPWP | Kebutuhan bisnis B2B belum terpenuhi | Spesifikasi fitur |
| G5 | Tidak ada smart segments otomatis | Pengguna harus tahu sendiri segmen apa yang berguna | Square Smart Groups |
| G6 | Tidak ada customer insights (favorite items, average spend trend) | Insight terbatas pada angka statis | Square, Moka insights |
| G7 | Tidak ada duplicate detection dan merge | Database bisa membengkak dengan data duplikat | Square Merged Profiles |

### 5.3 Gap Aspiratif (Nice to have untuk pertumbuhan)

| # | Gap | Dampak | Referensi |
|---|-----|--------|-----------|
| G8 | Tidak ada integrasi WhatsApp/messaging | Komunikasi ke pelanggan harus dilakukan manual di luar sistem | Majoo WhatsApp |
| G9 | Tidak ada birthday automation | Peluang engagement terbuang | Moka, Toast |
| G10 | Tidak ada RFM analysis otomatis | Segmentasi berbasis behavior belum optimal | Majoo RFM |
| G11 | Tidak ada customer feedback collection | Tidak ada mekanisme mendengar suara pelanggan langsung | Toast Guest Feedback |
| G12 | Tidak ada custom fields | Bisnis dengan kebutuhan unik belum terakomodasi | Moka custom fields |

---

## 6. Rekomendasi Perbaikan (Top Improvements)

### 6.1 Prioritas 1: Halaman Profil Pelanggan (mengatasi G1, G6)

**Deskripsi:** Buat halaman detail pelanggan (`/app/customers/:id`) yang menampilkan:
- Header dengan info pelanggan + statistik ringkas (total belanja, kunjungan, poin)
- Tab "Riwayat Transaksi" — daftar semua transaksi yang terhubung ke pelanggan, dengan detail item
- Tab "Aktivitas" — timeline chronological (transaksi, perubahan data, poin loyalty)
- Tab "Insights" — produk favorit, trend belanja per bulan, average basket size

**Estimasi effort:** 3-5 hari development
**Impact:** Tinggi — ini adalah fitur yang paling dibutuhkan untuk memberikan konteks lengkap tentang setiap pelanggan

### 6.2 Prioritas 2: Advanced Filter dan Export (mengatasi G2, G3)

**Deskripsi:**
- Tambah filter dropdown di halaman daftar: Status (Aktif/Nonaktif), Rentang tanggal registrasi, Rentang total belanja
- Tambah tombol "Export CSV/Excel" yang mengekspor data sesuai filter aktif

**Estimasi effort:** 2-3 hari development
**Impact:** Tinggi — filter dan export adalah tabel stakes untuk manajemen data

### 6.3 Prioritas 3: Field B2B dan Custom Fields (mengatasi G4, G12)

**Deskripsi:**
- Tambah field "Tipe Pelanggan" (dropdown: Individu/Perusahaan)
- Jika tipe = Perusahaan: tampilkan field NPWP, Nama Perusahaan, Jabatan Kontak
- Tambah section "Custom Fields" yang bisa dikonfigurasi per bisnis

**Estimasi effort:** 3-4 hari development (termasuk migrasi database)
**Impact:** Sedang-Tinggi — krusial untuk bisnis B2B (toko bangunan, grosir, supplier)

### 6.4 Prioritas 4: Smart Segments (mengatasi G5)

**Deskripsi:**
- Auto-generate segmen berdasarkan analisis data: Top Spenders, Frequent Visitors, At Risk (30+ hari tidak datang), New This Month
- Segmen otomatis terupdate setiap hari
- Notifikasi ke owner saat ada perubahan signifikan (misalnya 10+ pelanggan masuk ke "At Risk")

**Estimasi effort:** 3-4 hari development (backend logic + frontend display)
**Impact:** Sedang — mengurangi beban kognitif dan mendorong aksi proaktif

### 6.5 Prioritas 5: Duplicate Detection (mengatasi G7)

**Deskripsi:**
- Saat menambah pelanggan baru, cek apakah ada pelanggan existing dengan nama atau telepon serupa
- Tampilkan warning "Pelanggan dengan nama/telepon serupa sudah ada: [nama]. Lanjutkan tetap?"
- Tambah fitur merge: pilih 2+ pelanggan, gabungkan data, konsolidasikan riwayat transaksi

**Estimasi effort:** 2-3 hari development
**Impact:** Sedang — penting untuk menjaga kebersihan database jangka panjang

---

## 7. Roadmap Pengembangan

### Phase 1: Foundation (Sprint 1-2)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Halaman profil pelanggan | Detail page dengan riwayat transaksi dan statistik | 4 hari |
| Advanced filter | Filter status, rentang belanja, tanggal registrasi | 2 hari |
| Export CSV/Excel | Export data sesuai filter aktif | 1 hari |
| Field tipe pelanggan + NPWP | Tambah field B2B di form dan database | 3 hari |

**Outcome:** Pengalaman manajemen pelanggan yang lengkap dan bisa diandalkan.

### Phase 2: Intelligence (Sprint 3-4)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Smart segments | Auto-generated segments berdasarkan behavior | 3 hari |
| Customer insights | Produk favorit, trend belanja, analisis RFM sederhana | 4 hari |
| Duplicate detection | Warning saat tambah pelanggan serupa + merge tool | 3 hari |
| Dashboard overview | Ringkasan CRM: total pelanggan, growth, segmen distribution | 2 hari |

**Outcome:** Insight yang actionable dan database yang bersih.

### Phase 3: Engagement (Sprint 5-6)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Integrasi WhatsApp | Kirim pesan ke pelanggan langsung dari TiloPOS | 5 hari |
| Birthday automation | Notifikasi + auto-voucher untuk pelanggan yang berulang tahun | 3 hari |
| Custom fields | Bisnis bisa menambah field sendiri (teks, angka, dropdown) | 4 hari |
| Feedback collection | Pelanggan bisa memberikan rating/review via link di struk | 4 hari |

**Outcome:** Komunikasi dua arah dengan pelanggan dan personalisasi yang lebih dalam.

### Phase 4: Advanced (Sprint 7-8)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Campaign management | Buat, jalankan, dan lacak ROI campaign berbasis segmen | 5 hari |
| Customer scoring | Skor pelanggan berdasarkan lifetime value dan engagement | 3 hari |
| Referral program | Pelanggan bisa referensikan orang lain, keduanya dapat reward | 4 hari |
| API pelanggan (public) | Endpoint publik untuk integrasi pihak ketiga | 3 hari |

**Outcome:** Ekosistem CRM yang kompetitif dan bisa menjadi selling point utama TiloPOS.

---

## 8. Kesimpulan

Modul Pelanggan TiloPOS memiliki fondasi yang solid — database pelanggan, segmentasi custom dengan criteria builder, integrasi POS, dan tampilan mobile terpisah. Namun, untuk bersaing dengan Moka dan Majoo, beberapa gap kritis perlu ditutup: terutama halaman profil pelanggan dengan riwayat transaksi, advanced filter, dan export data.

Keunggulan kompetitif TiloPOS terletak pada segmentasi yang lebih fleksibel (custom criteria builder vs preset di Moka) dan harga yang lebih terjangkau. Dengan menambahkan smart segments dan customer insights di Phase 2, TiloPOS bisa menawarkan CRM yang lebih cerdas tanpa menambah kompleksitas untuk pengguna UMKM.

Fokus utama: **buat data pelanggan lebih mudah diakses dan lebih berguna** — dari sekadar daftar nama menjadi sumber insight yang mendorong keputusan bisnis yang lebih baik.
