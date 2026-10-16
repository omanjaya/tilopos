# Audit Fitur Terminal POS TiloPOS

Dokumen ini berisi evaluasi mendalam terhadap modul Terminal POS TiloPOS, mencakup assessment kondisi saat ini, evaluasi heuristik UX, analisis kompetitif, gap analysis, dan rekomendasi perbaikan beserta roadmap implementasi.

---

## Daftar Isi

1. [Current State Assessment](#1-current-state-assessment)
2. [UX Heuristic Evaluation (Nielsen's 10 Heuristics)](#2-ux-heuristic-evaluation)
3. [Analisis Kompetitif](#3-analisis-kompetitif)
4. [Referensi Best Practice Internasional](#4-referensi-best-practice-internasional)
5. [Gap Analysis](#5-gap-analysis)
6. [Rekomendasi Perbaikan UX (Top 10)](#6-rekomendasi-perbaikan-ux-top-10)
7. [Saran Wireframe](#7-saran-wireframe)
8. [Pertimbangan Performa](#8-pertimbangan-performa)
9. [Review Aksesibilitas](#9-review-aksesibilitas)
10. [Roadmap Implementasi](#10-roadmap-implementasi)

---

## 1. Current State Assessment

### 1.1 Fitur yang Sudah Ada

Berikut adalah daftar fitur Terminal POS TiloPOS yang sudah diimplementasikan beserta status dan catatan masing-masing:

#### Modul Produk & Keranjang

| Fitur | Status | Catatan |
|-------|--------|---------|
| Product grid dengan tampilan kartu | Tersedia | Grid menampilkan gambar, nama, dan harga produk |
| Filter kategori produk | Tersedia | Tab kategori di bagian atas product grid |
| Pencarian produk | Tersedia | Search bar dengan pencarian real-time |
| Toggle tampilan grid/list | Tersedia | Dua mode tampilan yang bisa dipilih |
| Keranjang belanja (cart panel) | Tersedia | Panel kanan menampilkan item, quantity, dan total |
| Kontrol quantity (+/-) | Tersedia | Tombol increment/decrement pada setiap item |
| Edit harga (price override) | Tersedia | Kasir bisa mengubah harga per item |
| Produk varian | Tersedia | Dialog pemilihan varian saat klik produk |
| Modifier produk | Tersedia | Tambahan/perubahan pada item pesanan |
| Bundle packages | Tersedia | Paket produk dengan harga khusus |

#### Modul Pembayaran

| Fitur | Status | Catatan |
|-------|--------|---------|
| Pembayaran tunai | Tersedia | Dengan kalkulasi kembalian otomatis |
| Pembayaran QRIS | Tersedia | QR code universal |
| Kartu debit | Tersedia | Integrasi dengan mesin EDC |
| Kartu kredit | Tersedia | Integrasi dengan mesin EDC |
| E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja) | Tersedia | 5 provider e-wallet |
| Preview kembalian real-time | Tersedia | Update instan saat input jumlah bayar |
| Split payment | Tersedia | Bayar dengan lebih dari satu metode |
| Penjualan kredit (BON) | Tersedia | Catat piutang pelanggan |

#### Modul Operasional

| Fitur | Status | Catatan |
|-------|--------|---------|
| Preview struk | Tersedia | Tampilan struk sebelum cetak |
| Cetak struk thermal 80mm | Tersedia | Support printer thermal standar |
| Held bills (tahan pesanan) | Tersedia | Simpan dan lanjutkan pesanan |
| Keyboard shortcuts | Tersedia | Shortcut untuk operasi umum |
| Mode offline dengan auto-sync | Tersedia | Transaksi tetap jalan tanpa internet |
| Assign pelanggan | Tersedia | Hubungkan transaksi dengan data pelanggan |
| Assign meja (F&B) | Tersedia | Manajemen meja visual |
| Tipe pesanan (dine-in/takeaway/delivery) | Tersedia | Pilihan tipe per transaksi |
| Diskon (nominal & persentase) | Tersedia | Per item dan per transaksi |
| Shift management | Tersedia | Buka/tutup shift dengan hitung kas |
| Transaksi hari ini (quick view) | Tersedia | Akses cepat riwayat transaksi |

### 1.2 Kekuatan Utama

1. **Fitur set yang komprehensif** — TiloPOS sudah memiliki hampir semua fitur inti yang dibutuhkan terminal POS modern.
2. **Multi-payment yang lengkap** — 9 metode pembayaran mencakup mayoritas cara bayar populer di Indonesia.
3. **Offline mode** — Fitur kritis untuk pasar Indonesia yang koneksi internetnya belum merata.
4. **Real-time sync** — Mendukung operasional multi-kasir dan monitoring jarak jauh.
5. **Desain khusus pasar Indonesia** — Fitur BON, modifier khas F&B lokal, dan support payment lokal.

### 1.3 Area yang Perlu Perhatian

1. Belum ada fitur loyalty program terintegrasi langsung di terminal POS.
2. Barcode scanning belum secara eksplisit didokumentasikan sebagai fitur native.
3. Belum ada fitur tip/gratuity untuk industri F&B.
4. Belum ada customer-facing display (layar kedua untuk pelanggan).
5. Pelatihan dan onboarding in-app masih minim.

---

## 2. UX Heuristic Evaluation

Evaluasi berdasarkan **10 Heuristic Usability dari Jakob Nielsen**, dengan skor 1-5 untuk setiap heuristik (1 = sangat buruk, 5 = sangat baik).

### H1: Visibility of System Status (Visibilitas Status Sistem)

**Skor: 4/5**

| Aspek | Evaluasi |
|-------|----------|
| Indikator online/offline | Baik — ada indikator visual yang jelas di header |
| Status shift aktif | Baik — informasi shift ditampilkan di header |
| Feedback saat transaksi berhasil | Baik — notifikasi sukses setelah pembayaran |
| Preview kembalian real-time | Sangat baik — update instan saat input nominal |
| Progress sync offline | Perlu evaluasi — apakah progress bar cukup informatif |

**Catatan:** Indikator status sudah cukup baik. Perbaikan bisa dilakukan pada feedback animasi saat item ditambahkan ke keranjang dan status antrian sync yang lebih detail.

### H2: Match Between System and Real World (Kesesuaian dengan Dunia Nyata)

**Skor: 4/5**

| Aspek | Evaluasi |
|-------|----------|
| Terminologi Indonesia | Baik — menggunakan istilah yang familiar bagi kasir |
| Ikon intuitif | Cukup baik — ikon standar yang umum dipahami |
| Alur kerja mirip proses kasir fisik | Baik — scan/pilih > keranjang > bayar > struk |
| Metode pembayaran familiar | Sangat baik — nama dan logo payment yang dikenal |
| Layout meja visual (F&B) | Baik — representasi visual yang mirip denah nyata |

**Catatan:** Secara umum sudah menggunakan mental model yang tepat. Bisa ditingkatkan dengan menambah ikon/logo brand payment yang lebih besar agar lebih mudah dikenali.

### H3: User Control and Freedom (Kontrol dan Kebebasan Pengguna)

**Skor: 3.5/5**

| Aspek | Evaluasi |
|-------|----------|
| Hapus item dari keranjang | Baik — mudah dilakukan |
| Held bills (simpan & lanjutkan) | Sangat baik — fitur penting yang sudah ada |
| Void transaksi | Ada tapi memerlukan otorisasi (by design) |
| Undo action | Perlu evaluasi — apakah ada undo untuk aksi terakhir? |
| Cancel di tengah pembayaran | Perlu evaluasi — seberapa mudah membatalkan proses bayar |

**Catatan:** Fitur undo/revert belum jelas apakah sudah ada. Menambahkan fitur undo untuk aksi terakhir (misalnya mengembalikan item yang baru dihapus) akan meningkatkan skor signifikan.

### H4: Consistency and Standards (Konsistensi dan Standar)

**Skor: 4/5**

| Aspek | Evaluasi |
|-------|----------|
| Konsistensi desain visual | Baik — menggunakan design system (shadcn/ui) |
| Konsistensi interaksi | Baik — pola interaksi seragam di seluruh modul |
| Konsistensi terminologi | Baik — istilah konsisten di seluruh aplikasi |
| Standar platform web | Baik — mengikuti konvensi web modern |
| Konsistensi dengan aplikasi kasir lain | Cukup — beberapa alur mungkin berbeda dari kebiasaan kasir |

**Catatan:** Penggunaan shadcn/ui dan design system yang konsisten menjadi kekuatan. Pastikan terminologi antara POS terminal, dashboard, dan KDS tetap konsisten.

### H5: Error Prevention (Pencegahan Error)

**Skor: 3/5**

| Aspek | Evaluasi |
|-------|----------|
| Konfirmasi sebelum void/refund | Baik — ada dialog konfirmasi |
| Validasi input harga/quantity | Perlu evaluasi — apakah ada batas minimum/maksimum? |
| Pencegahan double payment | Perlu evaluasi — apakah tombol bayar di-disable setelah klik? |
| Warning stok habis | Perlu evaluasi — apakah ada peringatan saat produk stok 0? |
| Konfirmasi tutup shift | Baik — ada ringkasan sebelum konfirmasi |

**Catatan:** Area yang perlu diperkuat. Terutama pencegahan double-click pada pembayaran, validasi input yang lebih ketat, dan peringatan proaktif saat ada potensi error.

### H6: Recognition Rather Than Recall (Pengenalan, Bukan Mengingat)

**Skor: 3.5/5**

| Aspek | Evaluasi |
|-------|----------|
| Gambar produk di grid | Baik — visual recognition lebih cepat dari teks |
| Logo metode pembayaran | Perlu evaluasi — apakah ada logo/ikon untuk tiap metode? |
| Riwayat pesanan terakhir | Perlu evaluasi — apakah ada akses cepat ke pesanan sebelumnya? |
| Produk favorit/sering dibeli | Belum tersedia — bisa membantu kecepatan kasir |
| Shortcut hints di UI | Perlu evaluasi — apakah shortcut ditampilkan di tooltip? |

**Catatan:** Menambahkan produk favorit/populer, riwayat pesanan cepat, dan tooltip shortcut di tombol akan meningkatkan skor.

### H7: Flexibility and Efficiency of Use (Fleksibilitas dan Efisiensi)

**Skor: 4/5**

| Aspek | Evaluasi |
|-------|----------|
| Keyboard shortcuts | Sangat baik — set shortcut yang komprehensif |
| Barcode scanning | Tersedia — mempercepat input produk |
| Quick amount buttons (pembayaran) | Baik — tombol nominal cepat untuk tunai |
| Grid/list toggle | Baik — pilihan tampilan sesuai preferensi |
| Split payment | Baik — fleksibilitas metode bayar |

**Catatan:** Sudah cukup baik. Bisa ditingkatkan dengan fitur custom shortcut, quick-order (pesanan berulang), dan template transaksi.

### H8: Aesthetic and Minimalist Design (Desain Estetis dan Minimalis)

**Skor: 3.5/5**

| Aspek | Evaluasi |
|-------|----------|
| Kepadatan informasi | Perlu evaluasi — apakah terlalu padat atau sudah seimbang? |
| Hierarki visual | Cukup baik — total harga besar, detail lebih kecil |
| Penggunaan warna | Baik — warna untuk status (hijau/merah/kuning) |
| White space | Perlu evaluasi — apakah cukup ruang napas antar elemen? |
| Konsistensi estetika | Baik — design system yang terjaga |

**Catatan:** Terminal POS harus menyeimbangkan antara menampilkan banyak informasi dan tetap bersih. Fokus pada membuat elemen kritis (total, tombol bayar) paling menonjol.

### H9: Help Users Recognize, Diagnose, and Recover from Errors (Penanganan Error)

**Skor: 3/5**

| Aspek | Evaluasi |
|-------|----------|
| Pesan error yang jelas | Perlu evaluasi — apakah pesan error dalam Bahasa Indonesia? |
| Panduan recovery dari error | Perlu evaluasi — apakah ada saran solusi saat error? |
| Error saat offline | Perlu evaluasi — apakah jelas apa yang bisa/tidak bisa dilakukan? |
| Error pembayaran gagal | Perlu evaluasi — panduan langkah selanjutnya |
| Log error untuk troubleshooting | Perlu evaluasi — akses bagi supervisor/manager |

**Catatan:** Pesan error harus selalu dalam Bahasa Indonesia, jelas, dan disertai saran langkah selanjutnya. Hindari pesan teknis yang membingungkan kasir.

### H10: Help and Documentation (Bantuan dan Dokumentasi)

**Skor: 2.5/5**

| Aspek | Evaluasi |
|-------|----------|
| Panduan in-app / onboarding | Belum terlihat — perlu tour/walkthrough interaktif |
| Tooltip pada tombol/fitur | Perlu evaluasi — apakah ada tooltip informatif? |
| Shortcut cheat sheet | Perlu evaluasi — apakah ada referensi cepat? |
| Link ke panduan pengguna | Perlu evaluasi — akses ke dokumentasi dari dalam app |
| Kontekstual help | Belum terlihat — help sesuai halaman yang sedang dibuka |

**Catatan:** Area dengan skor terendah. Sangat direkomendasikan untuk menambah onboarding interaktif, tooltip, dan help center yang bisa diakses dari dalam aplikasi.

### Ringkasan Skor Heuristik

| Heuristik | Skor | Prioritas Perbaikan |
|-----------|------|---------------------|
| H1: Visibility of System Status | 4.0 | Rendah |
| H2: Match with Real World | 4.0 | Rendah |
| H3: User Control and Freedom | 3.5 | Sedang |
| H4: Consistency and Standards | 4.0 | Rendah |
| H5: Error Prevention | 3.0 | Tinggi |
| H6: Recognition vs Recall | 3.5 | Sedang |
| H7: Flexibility and Efficiency | 4.0 | Rendah |
| H8: Aesthetic and Minimalist Design | 3.5 | Sedang |
| H9: Error Recovery | 3.0 | Tinggi |
| H10: Help and Documentation | 2.5 | Sangat Tinggi |
| **Rata-rata** | **3.5** | |

---

## 3. Analisis Kompetitif

Perbandingan TiloPOS dengan 5 kompetitor utama di pasar POS Indonesia:

### 3.1 Tabel Perbandingan Fitur

| Fitur | TiloPOS | Moka POS | Majoo | iSeller | Pawoon | Olsera |
|-------|---------|----------|-------|---------|--------|--------|
| **Product Grid + Search** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Filter Kategori** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Grid/List Toggle** | Ya | Tidak | Tidak | Ya | Tidak | Tidak |
| **Barcode Scanning** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Varian Produk** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Modifier** | Ya | Ya | Ya | Ya | Terbatas | Ya |
| **Bundle Packages** | Ya | Tidak | Ya | Terbatas | Tidak | Terbatas |
| **Diskon Item + Transaksi** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Metode Bayar** | 9+ | 6-8 | 7-9 | 6-8 | 5-7 | 5-7 |
| **Split Payment** | Ya | Ya | Ya | Ya | Terbatas | Terbatas |
| **Penjualan Kredit (BON)** | Ya | Tidak | Terbatas | Tidak | Tidak | Terbatas |
| **Preview Kembalian Real-time** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Held Bills** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Keyboard Shortcuts** | Ya (lengkap) | Terbatas | Terbatas | Terbatas | Tidak | Tidak |
| **Offline Mode** | Ya (penuh) | Terbatas | Terbatas | Ya | Terbatas | Terbatas |
| **Auto-Sync** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Assign Pelanggan** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Manajemen Meja** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Tipe Pesanan** | 3 tipe | 3 tipe | 3 tipe | 3 tipe | 2 tipe | 3 tipe |
| **KDS Terintegrasi** | Ya | Tambahan | Tambahan | Ya | Tidak | Ya |
| **Shift Management** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Cetak Thermal 80mm** | Ya | Ya | Ya | Ya | Ya | Ya |
| **Customer Display** | Belum | Ya | Tidak | Ya | Tidak | Tidak |
| **Loyalty Program** | Belum | Ya | Ya | Ya | Terbatas | Ya |
| **Multi-bahasa** | Indonesia | ID + EN | ID + EN | ID + EN | Indonesia | ID + EN |
| **Tip/Gratuity** | Belum | Ya | Tidak | Ya | Tidak | Tidak |

### 3.2 Analisis per Kompetitor

#### Moka POS (GoBiz)

**Kekuatan:**
- Ekosistem Gojek/GoTo yang luas (GoPay, GoFood terintegrasi).
- Customer-facing display untuk transparansi harga.
- Loyalty program built-in.
- Brand recognition tinggi di Indonesia.

**Kelemahan:**
- Lock-in ke ekosistem GoTo.
- Offline mode terbatas.
- Harga relatif lebih mahal untuk fitur premium.
- Keyboard shortcuts terbatas.

**Peluang TiloPOS:** Unggul di offline mode, keyboard shortcuts, dan harga. Tidak terikat satu ekosistem.

#### Majoo

**Kekuatan:**
- All-in-one solution (POS, akuntansi, HR, CRM).
- Fitur inventori yang kuat.
- Integrasi marketplace (Grab, GoFood, ShopeeFood).

**Kelemahan:**
- UI cenderung kompleks karena terlalu banyak fitur.
- Performa kadang lambat karena heavy feature load.
- Kurva belajar tinggi untuk kasir baru.

**Peluang TiloPOS:** Fokus pada simplisitas dan kecepatan terminal POS. UI yang lebih clean dan ringan.

#### iSeller

**Kekuatan:**
- Omnichannel kuat (online + offline).
- Customer-facing display.
- API terbuka untuk integrasi kustom.
- Desain modern.

**Kelemahan:**
- Lebih fokus ke retail, kurang kuat di F&B.
- Harga tier tinggi untuk fitur lengkap.
- Komunitas pengguna lebih kecil.

**Peluang TiloPOS:** Lebih kuat di F&B (KDS, manajemen meja, modifier). Harga lebih terjangkau.

#### Pawoon

**Kekuatan:**
- Harga sangat terjangkau (ada plan gratis).
- Setup cepat dan mudah.
- Cocok untuk usaha kecil.

**Kelemahan:**
- Fitur terbatas di tier rendah.
- Offline mode sangat terbatas.
- Tidak ada keyboard shortcuts.
- Modifier terbatas.

**Peluang TiloPOS:** Fitur lebih lengkap di harga yang sama atau sedikit lebih tinggi. Offline mode jauh lebih baik.

#### Olsera

**Kekuatan:**
- Integrasi e-commerce built-in.
- Fitur reservasi untuk F&B.
- Sistem antrian.

**Kelemahan:**
- UI kurang modern dibanding kompetitor.
- Keyboard shortcuts tidak ada.
- Split payment terbatas.
- Performa di perangkat low-end kurang optimal.

**Peluang TiloPOS:** UI lebih modern, keyboard shortcuts, split payment lebih baik.

### 3.3 Posisi Kompetitif TiloPOS

**Keunggulan TiloPOS:**
1. Offline mode paling komprehensif di antara kompetitor lokal.
2. Keyboard shortcuts paling lengkap — unique selling point untuk kasir power user.
3. 9+ metode pembayaran — salah satu yang terbanyak.
4. Penjualan kredit (BON) — fitur unik yang sangat dibutuhkan UMKM.
5. Bundle packages — tidak semua kompetitor punya.
6. KDS terintegrasi tanpa biaya tambahan.

**Area yang Perlu Dikejar:**
1. Customer-facing display (Moka, iSeller sudah punya).
2. Loyalty program terintegrasi (Moka, Majoo, iSeller, Olsera sudah punya).
3. Tip/gratuity (untuk F&B premium).
4. Multi-bahasa (untuk bisnis yang melayani turis).
5. Integrasi marketplace delivery (GoFood, GrabFood, ShopeeFood).

---

## 4. Referensi Best Practice Internasional

Berikut adalah pelajaran dari sistem POS kelas dunia yang bisa diadopsi:

### 4.1 Square POS

**Yang bisa diadopsi:**
- **Onboarding yang mulus:** Setup wizard yang memandu pengguna baru langkah demi langkah, dari konfigurasi produk sampai transaksi pertama.
- **Desain ultra-minimalis:** Hanya menampilkan yang dibutuhkan. Fitur advanced tersembunyi tapi mudah diakses.
- **Customer-facing display:** Layar kedua yang menampilkan item dan total ke pelanggan.
- **Tipping flow:** Alur input tip yang natural setelah pembayaran sebelum tanda tangan.
- **Analytics dashboard cepat:** Insight penjualan yang bisa diakses langsung dari terminal.

### 4.2 Toast POS (F&B Specialist)

**Yang bisa diadopsi:**
- **Course firing:** Kemampuan mengatur kapan setiap course dikirim ke dapur (starter dulu, main course setelah starter selesai).
- **Menu modifier yang terstruktur:** Modifier group dengan required/optional, min/max selection.
- **Tableside ordering:** Kasir/pelayan bisa order langsung di meja pelanggan pakai tablet.
- **Kitchen routing:** Pesanan otomatis ke station yang tepat (bar, hot kitchen, cold kitchen).
- **Pre-authorization:** Hold kartu kredit saat tamu duduk, charge saat selesai.

### 4.3 Lightspeed POS (Retail Expert)

**Yang bisa diadopsi:**
- **Matrix produk:** Tampilan varian dalam format matrix (ukuran x warna) yang sangat efisien.
- **Serial number tracking:** Pelacakan per unit untuk produk bernilai tinggi.
- **Purchase order dari POS:** Restock langsung dari terminal saat stok menipis.
- **Layaway (cicilan):** Pelanggan bayar sebagian, ambil barang nanti.
- **Work order:** Untuk bisnis jasa (servis, reparasi) — catat pekerjaan yang harus dilakukan.

### 4.4 Ringkasan Best Practice

| Best Practice | Sumber | Relevansi untuk TiloPOS | Prioritas |
|---------------|--------|------------------------|-----------|
| Onboarding wizard | Square | Sangat tinggi — mempercepat adopsi | Tinggi |
| Customer-facing display | Square | Tinggi — meningkatkan transparansi | Sedang |
| Tipping flow | Square, Toast | Sedang — untuk F&B premium | Rendah |
| Course firing | Toast | Sedang — untuk restoran fine dining | Rendah |
| Structured modifier groups | Toast | Tinggi — sudah ada modifier, perlu diperkuat | Tinggi |
| Kitchen routing per station | Toast | Sedang — extension dari KDS yang sudah ada | Sedang |
| Product matrix display | Lightspeed | Tinggi — lebih efisien dari dialog varian | Sedang |
| Quick analytics dari terminal | Square | Tinggi — kasir/manager perlu insight cepat | Tinggi |
| Layaway/cicilan | Lightspeed | Sedang — sudah ada BON, bisa diperluas | Rendah |

---

## 5. Gap Analysis

Perbandingan fitur TiloPOS saat ini vs standar best-in-class (gabungan fitur terbaik dari kompetitor lokal dan internasional):

### 5.1 Gap Kritis (Harus Segera Ditangani)

| Gap | Deskripsi | Dampak | Referensi |
|-----|-----------|--------|-----------|
| **Onboarding/Tutorial In-App** | Tidak ada panduan interaktif untuk kasir baru | Waktu training lama, error kasir baru tinggi | Square, semua kompetitor tier 1 |
| **Pencegahan Double Payment** | Belum jelas apakah ada mekanisme mencegah klik ganda tombol bayar | Potensi transaksi duplikat | Standar industri |
| **Error Message yang User-Friendly** | Pesan error mungkin masih teknis | Kasir bingung saat terjadi masalah | Nielsen H9 |
| **Validasi Input Ketat** | Belum ada validasi batas quantity/harga yang jelas | Potensi input salah (quantity 9999, harga 0) | Standar industri |

### 5.2 Gap Penting (Ditangani dalam 3-6 Bulan)

| Gap | Deskripsi | Dampak | Referensi |
|-----|-----------|--------|-----------|
| **Loyalty Program** | Tidak ada sistem poin/reward di terminal POS | Kehilangan tools untuk customer retention | Moka, Majoo, iSeller |
| **Customer-Facing Display** | Tidak ada layar kedua untuk pelanggan | Transparansi harga kurang, pengalaman pelanggan biasa | Square, Moka, iSeller |
| **Produk Favorit/Populer** | Tidak ada quick-access untuk produk yang sering dipesan | Kasir harus cari manual setiap kali | Square, Toast |
| **Structured Modifier Groups** | Modifier belum terstruktur (required/optional, min/max) | Potensi order tidak lengkap | Toast |
| **Tip/Gratuity** | Tidak ada fitur input tip | F&B premium kehilangan revenue stream | Square, Toast, Moka |

### 5.3 Gap Sekunder (Ditangani dalam 6-12 Bulan)

| Gap | Deskripsi | Dampak | Referensi |
|-----|-----------|--------|-----------|
| **Integrasi Marketplace Delivery** | Belum terintegrasi GoFood, GrabFood, ShopeeFood | Pesanan delivery harus diinput manual | Majoo, Moka |
| **Product Matrix Display** | Varian ditampilkan via dialog, bukan matrix | Pemilihan varian kurang efisien | Lightspeed |
| **Quick Analytics di Terminal** | Tidak ada ringkasan penjualan cepat di layar POS | Manager harus pindah ke dashboard untuk cek performa | Square |
| **Multi-Bahasa** | Hanya Bahasa Indonesia | Bisnis yang melayani turis kurang terlayani | Moka, iSeller |
| **Tableside Ordering** | Kasir harus di meja kasir, tidak bisa order di meja tamu | Kurang fleksibel untuk restoran | Toast |
| **Kitchen Routing per Station** | KDS belum bisa route ke station berbeda | Restoran besar perlu diferensiasi station | Toast |
| **Reservasi Terintegrasi** | Tidak ada fitur reservasi meja dari POS | F&B kehilangan manajemen reservasi | Olsera |

### 5.4 Nice-to-Have (12+ Bulan)

| Gap | Deskripsi | Referensi |
|-----|-----------|-----------|
| Course firing | Atur urutan penyajian per course | Toast |
| Pre-authorization kartu | Hold kartu kredit saat tamu duduk | Toast |
| Serial number tracking | Tracking per unit produk | Lightspeed |
| Work order / service ticket | Untuk bisnis jasa/reparasi | Lightspeed |
| Voice ordering | Input pesanan via suara | Emerging trend |
| AI-powered suggestions | Rekomendasi upsell otomatis ke kasir | Emerging trend |

---

## 6. Rekomendasi Perbaikan UX (Top 10)

Berikut 10 rekomendasi perbaikan UX yang diprioritaskan berdasarkan dampak terhadap pengguna dan feasibility implementasi:

### Prioritas 1: Onboarding Interaktif untuk Kasir Baru

**Masalah:** Kasir baru tidak tahu harus mulai dari mana. Tidak ada panduan di dalam aplikasi.

**Solusi:** Implementasi interactive walkthrough/tour saat pertama kali buka terminal POS.

**Detail:**
- Step-by-step tour yang highlight setiap area (product grid, cart, tombol bayar).
- Simulasi transaksi pertama dengan data dummy.
- Tooltip yang menjelaskan fungsi setiap tombol.
- Bisa diakses ulang dari menu Help (F1).
- Estimasi durasi tour: 3-5 menit.

**Dampak:** Tinggi — mengurangi waktu training dari berhari-hari menjadi berjam-jam.
**Effort:** Sedang — menggunakan library seperti React Joyride atau Shepherd.js.

### Prioritas 2: Pencegahan Double Payment dan Error

**Masalah:** Potensi kasir menekan tombol bayar dua kali, atau input data yang tidak valid.

**Solusi:** Implementasi guard yang komprehensif.

**Detail:**
- Disable tombol bayar setelah diklik, tampilkan loading state.
- Validasi batas quantity (min 1, max sesuai stok).
- Validasi batas harga (min 0, max reasonable amount).
- Konfirmasi untuk transaksi di atas nominal tertentu.
- Rate limiting pada aksi kritikal.

**Dampak:** Tinggi — mencegah kerugian finansial dan data corruption.
**Effort:** Rendah — perubahan kecil di frontend dan backend.

### Prioritas 3: Produk Favorit dan Quick Access

**Masalah:** Kasir harus mencari produk yang sama berulang kali setiap hari.

**Solusi:** Tab "Favorit" atau "Populer" di product grid.

**Detail:**
- Algoritma otomatis: tampilkan 10-20 produk paling sering terjual.
- Manual pin: kasir bisa pin produk favorit.
- Tab terpisah di samping kategori lain.
- Quick-access grid yang selalu muncul di bagian atas.

**Dampak:** Tinggi — mempercepat waktu per transaksi secara signifikan.
**Effort:** Rendah — tracking frekuensi penjualan + UI sederhana.

### Prioritas 4: Error Message yang Human-Friendly

**Masalah:** Pesan error mungkin masih teknis dan dalam Bahasa Inggris.

**Solusi:** Revamp semua pesan error ke Bahasa Indonesia dengan panduan solusi.

**Detail:**
- Setiap error message harus punya: (1) apa yang terjadi, (2) kenapa terjadi, (3) apa yang harus dilakukan.
- Contoh buruk: "Error 500: Internal Server Error"
- Contoh baik: "Transaksi gagal diproses. Kemungkinan koneksi internet terputus. Coba ulangi beberapa saat lagi atau hubungi supervisor."
- Warna dan ikon yang sesuai (merah untuk error, kuning untuk warning, biru untuk info).
- Tombol aksi langsung di error message (misal: "Coba Lagi", "Hubungi Supervisor").

**Dampak:** Tinggi — kasir bisa menangani masalah sendiri tanpa selalu memanggil supervisor.
**Effort:** Sedang — audit semua error message + rewrite.

### Prioritas 5: Undo untuk Aksi Terakhir

**Masalah:** Kasir tidak bisa membatalkan aksi yang baru saja dilakukan (misal: tidak sengaja hapus item).

**Solusi:** Implementasi undo snackbar/toast.

**Detail:**
- Setelah hapus item, muncul toast "Item dihapus" dengan tombol "Undo" selama 5 detik.
- Setelah clear cart, muncul toast "Keranjang dikosongkan" dengan tombol "Undo".
- Undo hanya untuk aksi terakhir, tidak perlu full undo stack.
- Pattern yang sudah familiar dari Gmail dan aplikasi modern lainnya.

**Dampak:** Sedang-Tinggi — mengurangi frustasi kasir saat salah klik.
**Effort:** Rendah — implementasi straightforward dengan state management.

### Prioritas 6: Tooltip Shortcut di Semua Tombol

**Masalah:** Kasir tidak tahu shortcut apa yang tersedia tanpa membuka dokumentasi.

**Solusi:** Tampilkan shortcut hint di tooltip setiap tombol yang punya shortcut.

**Detail:**
- Hover tombol "Bayar" → tooltip: "Proses Pembayaran (F12)"
- Hover tombol "Cari" → tooltip: "Cari Produk (F2)"
- Hover tombol "Tahan" → tooltip: "Tahan Pesanan (F8)"
- Shortcut cheat sheet yang bisa diakses via F1 atau ikon "?".
- Subtle keyboard hint di samping tombol (seperti Figma, VS Code).

**Dampak:** Sedang — mempercepat kurva belajar keyboard shortcuts.
**Effort:** Rendah — menambah tooltip attribute.

### Prioritas 7: Loyalty Program Sederhana

**Masalah:** Tidak ada mekanisme reward untuk pelanggan setia langsung di terminal.

**Solusi:** Implementasi sistem poin sederhana.

**Detail:**
- Setiap transaksi dengan pelanggan ter-assign mendapat poin (misal: Rp 1.000 = 1 poin).
- Kasir bisa lihat saldo poin pelanggan saat di-assign.
- Poin bisa ditukar dengan diskon langsung di terminal.
- Dashboard poin untuk pelanggan (opsional, via customer portal).
- Admin bisa atur rasio poin dan reward.

**Dampak:** Tinggi — meningkatkan customer retention.
**Effort:** Tinggi — butuh modul baru di backend dan frontend.

### Prioritas 8: Customer-Facing Display

**Masalah:** Pelanggan tidak bisa melihat item dan harga yang diinput kasir secara real-time.

**Solusi:** Layar kedua (second screen) yang menampilkan keranjang ke pelanggan.

**Detail:**
- Halaman web terpisah yang bisa dibuka di monitor/tablet kedua.
- Menampilkan: item yang ditambahkan, quantity, harga, diskon, total.
- Animasi smooth saat item ditambahkan.
- Tampilan logo dan branding bisnis.
- Opsional: tampilkan QR code untuk pembayaran.

**Dampak:** Sedang — meningkatkan kepercayaan dan pengalaman pelanggan.
**Effort:** Sedang — halaman web baru + WebSocket sync dengan terminal.

### Prioritas 9: Quick Analytics Widget

**Masalah:** Manager/owner harus pindah ke dashboard untuk melihat performa penjualan hari ini.

**Solusi:** Widget ringkasan penjualan yang bisa diakses dari terminal POS.

**Detail:**
- Slide-out panel atau modal berisi: total penjualan hari ini, jumlah transaksi, rata-rata transaksi, produk terlaris, perbandingan dengan kemarin.
- Akses via shortcut atau tombol di header.
- Data real-time tanpa perlu refresh.
- Hanya visible untuk role manager ke atas (konfigurabel).

**Dampak:** Sedang — decision making lebih cepat.
**Effort:** Rendah-Sedang — aggregate query + komponen UI.

### Prioritas 10: Structured Modifier Groups

**Masalah:** Modifier saat ini flat list, belum terstruktur dengan aturan required/optional.

**Solusi:** Modifier group dengan konfigurasi min/max selection.

**Detail:**
- Modifier dikelompokkan (contoh: "Tingkat Kepedasan", "Topping", "Ukuran").
- Setiap group bisa diatur: required/optional, pilih minimal X, pilih maksimal Y.
- Contoh: Group "Tingkat Kepedasan" — required, pilih tepat 1.
- Contoh: Group "Topping" — optional, pilih 0-3.
- Validasi saat add to cart: pastikan semua required modifier sudah dipilih.

**Dampak:** Sedang — mengurangi pesanan tidak lengkap, meningkatkan akurasi order.
**Effort:** Sedang — perubahan model data dan UI modifier.

---

## 7. Saran Wireframe

Berikut deskripsi wireframe untuk perbaikan-perbaikan utama yang direkomendasikan:

### 7.1 Wireframe: Onboarding Tour

```
+---------------------------------------------------------------+
|  SELAMAT DATANG DI TILOPOS!                              [X]  |
|                                                                |
|  Mari kita kenalan dengan Terminal POS kamu.                   |
|  Tour ini hanya butuh 3 menit.                                 |
|                                                                |
|  [Mulai Tour]                        [Lewati, Saya Sudah Tahu] |
+---------------------------------------------------------------+

Step 1/6 - Area ini menampilkan semua produk yang bisa kamu jual.
           Klik produk untuk menambahkan ke keranjang.

        +-- Highlight border animasi di product grid --+
        |                                               |
        |   [Produk] [Produk] [Produk]                  |
        |   [Produk] [Produk] [Produk]                  |
        |                                               |
        +-----------------------------------------------+

                    [Sebelumnya] [2/6] [Selanjutnya]
```

### 7.2 Wireframe: Produk Favorit Tab

```
+------------------------------------------+
| [Favorit] [Makanan] [Minuman] [Snack]... |  <- Tab bar
+------------------------------------------+
| +-------+ +-------+ +-------+ +-------+ |
| |  *    | |  *    | |  *    | |  *    | |  <- Bintang = favorit
| | Nasi  | | Es    | | Mie   | | Kopi  | |
| | Goreng| | Teh   | | Ayam  | | Susu  | |
| | 15.000| | 5.000 | | 18.000| | 12.000| |
| +-------+ +-------+ +-------+ +-------+ |
|                                          |
| Berdasarkan produk terlaris minggu ini   |
+------------------------------------------+
```

### 7.3 Wireframe: Undo Toast

```
+------------------------------------------+-------------------+
|                                          |                   |
|           PRODUCT GRID                   |   CART PANEL      |
|                                          |                   |
|                                          |   Item 1          |
|                                          |   Item 2          |
|                                          |                   |
|                                          |   Total: 35.000   |
|                                          |                   |
+------------------------------------------+-------------------+
|  +------------------------------------------------+          |
|  | "Nasi Goreng" dihapus dari keranjang.  [UNDO]  |          |
|  +------------------------------------------------+          |
|                    ^^^ Toast bar di bagian bawah             |
+--------------------------------------------------------------+
```

### 7.4 Wireframe: Customer-Facing Display

```
+--------------------------------------------------+
|                                                    |
|              [ LOGO BISNIS ]                       |
|            "Warung Makan Sejahtera"                |
|                                                    |
|  ------------------------------------------------ |
|  Nasi Goreng Spesial          x1      Rp 25.000   |
|    + Extra Ayam                       Rp  5.000   |
|  Es Teh Manis                 x2      Rp 10.000   |
|  ------------------------------------------------ |
|                                                    |
|  Subtotal                             Rp 40.000   |
|  Diskon (10%)                        -Rp  4.000   |
|  ================================================ |
|  TOTAL                                Rp 36.000   |
|                                                    |
|  +--------------------------------------------+   |
|  |         [QR CODE PEMBAYARAN]                |   |
|  |         Scan untuk bayar                    |   |
|  +--------------------------------------------+   |
|                                                    |
|        Terima kasih atas kunjungan Anda!           |
+--------------------------------------------------+
```

### 7.5 Wireframe: Structured Modifier Group

```
+--------------------------------------------------+
|  MODIFIER: Nasi Goreng Spesial              [X]   |
|                                                    |
|  Tingkat Kepedasan (Wajib, pilih 1)               |
|  +-------------------------------------------+    |
|  | ( ) Tidak Pedas  ( ) Sedang  (o) Pedas    |    |
|  +-------------------------------------------+    |
|                                                    |
|  Topping (Opsional, maks 3)                       |
|  +-------------------------------------------+    |
|  | [x] Extra Ayam (+5.000)                   |    |
|  | [ ] Extra Telur (+3.000)                  |    |
|  | [x] Kerupuk (+2.000)                      |    |
|  | [ ] Acar (+1.000)                         |    |
|  +-------------------------------------------+    |
|                                                    |
|  Catatan Khusus                                    |
|  +-------------------------------------------+    |
|  | Tanpa bawang, nasi setengah              |    |
|  +-------------------------------------------+    |
|                                                    |
|  Total modifier: +Rp 7.000                         |
|                                                    |
|  [Batal]                    [Tambahkan ke Cart]    |
+--------------------------------------------------+
```

### 7.6 Wireframe: Quick Analytics Widget

```
+--------------------------------------------------+
|  RINGKASAN HARI INI                          [X]  |
|  Kamis, 20 Februari 2026                          |
|                                                    |
|  +----------+  +----------+  +--------------+     |
|  | PENJUALAN|  | TRANSAKSI|  | RATA-RATA    |     |
|  | 4.250.000|  |    38    |  | 111.842/trx  |     |
|  | +12% ↑   |  | +5 ↑    |  | +8% ↑        |     |
|  +----------+  +----------+  +--------------+     |
|                                                    |
|  Produk Terlaris:                                  |
|  1. Nasi Goreng Spesial     (15x)    Rp 375.000  |
|  2. Es Teh Manis            (28x)    Rp 140.000  |
|  3. Mie Ayam                (12x)    Rp 216.000  |
|                                                    |
|  Metode Bayar:                                     |
|  ████████████ Tunai 45%                            |
|  ████████     QRIS 32%                             |
|  ████         E-Wallet 18%                         |
|  ██           Kartu 5%                             |
|                                                    |
|  [Lihat Detail di Dashboard →]                     |
+--------------------------------------------------+
```

---

## 8. Pertimbangan Performa

### 8.1 Area Kritis Performa di Terminal POS

Terminal POS memiliki requirement performa yang sangat ketat karena digunakan di saat transaksi langsung dengan pelanggan. Setiap milidetik keterlambatan bisa terasa.

#### Waktu Respon yang Diharapkan

| Aksi | Target | Keterangan |
|------|--------|------------|
| Tambah item ke keranjang | < 100ms | Harus instan, feel real-time |
| Pencarian produk | < 200ms | Hasil muncul saat mengetik |
| Buka panel pembayaran | < 150ms | Transisi smooth |
| Proses pembayaran | < 2 detik | Termasuk hit ke payment gateway |
| Cetak struk | < 3 detik | Termasuk generate + kirim ke printer |
| Load held bills | < 300ms | List harus langsung tampil |
| Sync offline data | Background | Tidak boleh block UI |

### 8.2 Rekomendasi Optimasi

#### Frontend

1. **Virtualize product grid:** Jika produk > 100, gunakan react-window atau react-virtuoso untuk render hanya item yang visible. Mencegah lag saat scroll.

2. **Debounce search input:** Terapkan debounce 150-200ms pada pencarian produk untuk mengurangi re-render berlebihan.

3. **Optimistic UI update:** Saat tambah item ke keranjang, update UI dulu, kirim ke server kemudian. Jangan tunggu response server untuk update tampilan.

4. **Lazy load gambar produk:** Gunakan lazy loading + placeholder untuk gambar produk. Gambar di luar viewport tidak perlu di-load.

5. **Memoize komponen berat:** Gunakan React.memo untuk ProductCard, CartItem, dan komponen yang sering re-render. Gunakan useMemo untuk kalkulasi total.

6. **Service Worker untuk offline:** Pastikan Service Worker di-setup dengan benar untuk cache asset statis dan data produk.

7. **IndexedDB untuk data offline:** Simpan transaksi offline di IndexedDB, bukan localStorage (yang punya limit 5MB dan synchronous).

#### Backend

1. **Cache data produk di Redis:** Produk yang jarang berubah harus di-cache. Invalidate cache saat ada update dari admin.

2. **Database indexing:** Pastikan index pada kolom yang sering di-query: `businessId`, `categoryId`, `sku`, `barcode`, `name`.

3. **Batch sync:** Saat online kembali, kirim transaksi offline dalam batch, bukan satu per satu.

4. **WebSocket untuk real-time:** Gunakan Socket.IO yang sudah ada untuk push update (stok berubah, produk baru) tanpa polling.

5. **Query optimization:** Untuk product list, hanya select kolom yang dibutuhkan terminal POS (id, name, price, image, category). Jangan select semua kolom.

### 8.3 Monitoring Performa

- **Core Web Vitals:** Pantau LCP, FID, CLS secara berkala. Terminal POS harus mencapai skor "Good" di semua metrik.
- **Custom metrics:** Track waktu dari klik "Bayar" sampai transaksi selesai (end-to-end payment time).
- **Error rate:** Monitor error rate per endpoint, terutama payment endpoints.
- **Sentry integration:** Manfaatkan Sentry yang sudah terintegrasi untuk track performance issues dan errors.

---

## 9. Review Aksesibilitas

### 9.1 Konteks Aksesibilitas untuk Terminal POS

Aksesibilitas pada terminal POS memiliki konteks berbeda dari web biasa. Pengguna utama adalah kasir yang:
- Menggunakan aplikasi berjam-jam per hari (eye strain).
- Sering bekerja di lingkungan terang (sinar matahari masuk) atau redup (kafe malam).
- Mungkin memiliki kemampuan visual atau motorik yang beragam.
- Bekerja dengan tekanan waktu (antrian pelanggan).

### 9.2 Checklist Aksesibilitas

#### Kontras dan Warna

| Item | Status | Rekomendasi |
|------|--------|-------------|
| Kontras teks utama (WCAG AA 4.5:1) | Perlu audit | Pastikan semua teks mencapai rasio kontras minimum |
| Kontras tombol aksi | Perlu audit | Tombol "Bayar" dan "Tahan" harus sangat kontras |
| Tidak bergantung warna saja | Perlu audit | Gunakan ikon + teks + warna (bukan warna saja) untuk status |
| Dark mode / light mode | Belum tersedia | Pertimbangkan dark mode untuk kasir shift malam |
| High contrast mode | Belum tersedia | Opsi kontras tinggi untuk pengguna low vision |

#### Ukuran dan Touch Target

| Item | Status | Rekomendasi |
|------|--------|-------------|
| Touch target minimal 44x44px | Perlu audit | Semua tombol interaktif harus memenuhi standar ini |
| Ukuran font minimum 14px | Perlu audit | Teks di terminal harus mudah dibaca dari jarak kasir |
| Tombol +/- quantity cukup besar | Perlu audit | Minimal 40x40px untuk kemudahan tap |
| Spacing antar tombol payment | Perlu audit | Cukup jarak agar tidak salah klik |

#### Keyboard dan Navigasi

| Item | Status | Rekomendasi |
|------|--------|-------------|
| Semua aksi bisa via keyboard | Sebagian besar | Pastikan tidak ada fitur yang hanya bisa diakses via mouse/touch |
| Focus indicator visible | Perlu audit | Saat navigasi pakai Tab, elemen yang fokus harus jelas terlihat |
| Tab order logis | Perlu audit | Urutan Tab harus mengikuti alur kerja kasir |
| Skip navigation | Tidak relevan | Terminal POS biasanya single-page, skip nav kurang relevan |
| Escape menutup modal | Perlu audit | Semua modal dan dialog harus bisa ditutup via Esc |

#### Screen Reader (Opsional tapi Ideal)

| Item | Status | Rekomendasi |
|------|--------|-------------|
| Alt text pada gambar produk | Perlu audit | Nama produk sebagai alt text |
| ARIA labels pada tombol ikon | Perlu audit | Tombol tanpa teks harus punya aria-label |
| Live region untuk notifikasi | Perlu audit | Toast/notifikasi harus announced ke screen reader |
| Role dan state pada komponen custom | Perlu audit | Gunakan ARIA roles yang sesuai |

### 9.3 Rekomendasi Aksesibilitas Prioritas

1. **Audit kontras warna menyeluruh** — Gunakan tool seperti axe atau Lighthouse untuk scan otomatis.
2. **Perbesar touch target** — Semua tombol interaktif minimal 44x44px.
3. **Tambah ARIA labels** — Terutama pada tombol ikon (hapus, edit, dll).
4. **Focus management pada modal** — Saat modal terbuka, fokus harus trapped di dalam modal.
5. **Font scaling** — Izinkan pengguna mengubah ukuran font dari pengaturan (kecil/sedang/besar).
6. **Pertimbangkan dark mode** — Mengurangi eye strain untuk kasir shift malam.

---

## 10. Roadmap Implementasi

### Fase 1: Quick Wins (0-4 Minggu)

Perbaikan yang bisa dilakukan cepat dengan dampak tinggi:

| No | Item | Effort | Dampak | Detail |
|----|------|--------|--------|--------|
| 1 | Pencegahan double payment | 2 hari | Tinggi | Disable tombol setelah klik, loading state |
| 2 | Tooltip shortcut di tombol | 3 hari | Sedang | Tambah title/tooltip dengan info shortcut |
| 3 | Undo toast saat hapus item | 3 hari | Sedang | Toast dengan tombol undo, timeout 5 detik |
| 4 | Validasi input quantity/harga | 2 hari | Tinggi | Min/max validation, prevent negative/zero |
| 5 | Audit dan fix kontras warna | 3 hari | Sedang | Jalankan Lighthouse, fix violations |
| 6 | ARIA labels pada tombol ikon | 2 hari | Rendah | Tambah aria-label ke semua icon buttons |
| 7 | Error messages dalam Bahasa Indonesia | 5 hari | Tinggi | Audit dan rewrite semua error messages |

**Total estimasi Fase 1:** 2-4 minggu dengan 1-2 developer.

### Fase 2: Fitur Medium (1-3 Bulan)

Fitur yang membutuhkan development lebih signifikan:

| No | Item | Effort | Dampak | Detail |
|----|------|--------|--------|--------|
| 1 | Onboarding interaktif | 2 minggu | Tinggi | Interactive tour menggunakan library (React Joyride) |
| 2 | Tab produk favorit/populer | 1 minggu | Tinggi | Tracking frekuensi penjualan + UI tab baru |
| 3 | Structured modifier groups | 2 minggu | Sedang | Model data baru + UI modifier yang terstruktur |
| 4 | Quick analytics widget | 1.5 minggu | Sedang | Aggregate query + slide-out panel |
| 5 | Font scaling option | 3 hari | Rendah | Pengaturan ukuran font (S/M/L) |
| 6 | Optimasi performa (virtualize, memoize) | 1.5 minggu | Sedang | React-window, React.memo, useMemo |
| 7 | Dark mode | 1 minggu | Rendah | Tailwind dark mode, toggle di pengaturan |

**Total estimasi Fase 2:** 2-3 bulan dengan 2 developer.

### Fase 3: Fitur Major (3-6 Bulan)

Fitur besar yang memerlukan perencanaan dan development substansial:

| No | Item | Effort | Dampak | Detail |
|----|------|--------|--------|--------|
| 1 | Loyalty program (poin & reward) | 4 minggu | Tinggi | Modul baru: backend + frontend + admin config |
| 2 | Customer-facing display | 3 minggu | Sedang | Halaman web baru + WebSocket sync |
| 3 | Tip/gratuity flow | 1 minggu | Rendah | UI input tip + model data + laporan |
| 4 | Product matrix display (varian) | 2 minggu | Sedang | UI matrix + refactor komponen varian |
| 5 | Integrasi marketplace delivery | 6 minggu | Tinggi | API integration GoFood, GrabFood, ShopeeFood |

**Total estimasi Fase 3:** 3-6 bulan dengan 2-3 developer.

### Fase 4: Inovasi (6-12 Bulan)

Fitur yang membedakan TiloPOS sebagai inovator di pasar:

| No | Item | Effort | Dampak | Detail |
|----|------|--------|--------|--------|
| 1 | Tableside ordering (mobile) | 6 minggu | Sedang | Versi mobile terminal untuk pelayan |
| 2 | Kitchen routing per station | 3 minggu | Sedang | Extend KDS untuk multi-station |
| 3 | Multi-bahasa (EN) | 4 minggu | Rendah | i18n framework + translation |
| 4 | AI-powered upsell suggestions | 6 minggu | Sedang | Rekomendasi produk berdasarkan keranjang |
| 5 | Course firing (F&B) | 3 minggu | Rendah | Extend order model untuk course management |
| 6 | Reservasi terintegrasi | 4 minggu | Rendah | Modul reservasi + integrasi meja |

**Total estimasi Fase 4:** 6-12 bulan dengan 3+ developer.

### Ringkasan Timeline

```
Bulan 1        Bulan 2-3       Bulan 3-6         Bulan 6-12
|              |               |                  |
|-- FASE 1 ---|-- FASE 2 -----|--- FASE 3 -------|--- FASE 4 ---->
|  Quick Wins  |  Medium       |  Major           |  Innovation
|  7 items     |  7 items      |  5 items         |  6 items
|              |               |                  |
| Double-click | Onboarding    | Loyalty program  | Tableside
| Undo toast   | Favorit tab   | Customer display | Kitchen route
| Validation   | Modifier grp  | Marketplace      | Multi-bahasa
| Error msg ID | Analytics     | Tip/gratuity     | AI upsell
| Accessibility| Dark mode     | Product matrix   | Course firing
| Tooltip      | Performance   |                  | Reservasi
```

### KPI dan Success Metrics

Untuk mengukur keberhasilan implementasi roadmap ini:

| KPI | Baseline (Estimasi) | Target Fase 2 | Target Fase 4 |
|-----|---------------------|---------------|---------------|
| Waktu rata-rata per transaksi | 60-90 detik | < 45 detik | < 30 detik |
| Error rate transaksi | 2-3% | < 1% | < 0.5% |
| Waktu training kasir baru | 2-3 hari | 1 hari | 3 jam |
| NPS pengguna terminal | Belum diukur | > 40 | > 60 |
| Adopsi keyboard shortcuts | < 10% kasir | > 30% kasir | > 50% kasir |
| Customer retention rate | Belum diukur | +10% | +25% |
| Uptime terminal (termasuk offline) | 95% | 99% | 99.5% |

---

*Dokumen audit ini adalah living document yang harus di-update secara berkala sesuai perkembangan produk dan feedback pengguna. Evaluasi ulang direkomendasikan setiap kuartal.*
