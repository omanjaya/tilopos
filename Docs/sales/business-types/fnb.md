# TiloPOS untuk Bisnis F&B (Food & Beverage)

Dokumen pitch lengkap untuk restoran, kafe, kedai kopi, fast food, food court, cloud kitchen, catering, dan semua jenis bisnis makanan & minuman.

---

## Pendahuluan: Kenapa F&B Butuh POS yang Tepat?

Industri F&B Indonesia bernilai lebih dari Rp 400 triliun per tahun dan terus tumbuh. Namun, **60% bisnis F&B tutup dalam 3 tahun pertama** — bukan karena makanannya tidak enak, tapi karena manajemen operasional yang buruk.

Masalah utamanya? Pesanan salah, antrian panjang, stok bahan baku tidak terkontrol, food cost membengkak, dan pelanggan tidak kembali. Semua masalah ini bisa diselesaikan dengan POS yang tepat.

**TiloPOS dirancang khusus untuk bisnis F&B Indonesia** — dari warung nasi hingga chain restaurant. Bukan POS retail yang ditambahkan fitur F&B seadanya, tapi solusi yang dibangun dari dasar untuk kebutuhan dunia kuliner.

---

## 1. Pain Points Bisnis F&B dan Solusi TiloPOS

### Pain Point 1: Pesanan Salah dan Komunikasi Dapur Kacau

**Masalah yang sering terjadi:**
- Kasir menulis pesanan di kertas, tulisan tidak terbaca → makanan salah
- Pelanggan minta "pedas level 3" tapi tidak tersampaikan ke dapur
- Pesanan ganda atau terlewat karena kertas hilang
- Tidak ada prioritas pesanan (pesanan lama kelamaan, pesanan baru malah duluan)
- Staff harus bolak-balik antara kasir dan dapur untuk konfirmasi

**Solusi TiloPOS:**

**Kitchen Display System (KDS) Real-Time**
- Pesanan dari kasir langsung muncul di layar dapur secara real-time (< 1 detik)
- Setiap detail modifier tercatat jelas: "Nasi Goreng — PEDAS LV.3, TANPA BAWANG, EXTRA TELUR"
- Warna berbeda untuk status pesanan: baru (merah), sedang dimasak (kuning), siap (hijau)
- Timer otomatis per pesanan — jika melebihi batas waktu, alert muncul
- Urutan otomatis berdasarkan waktu masuk, tidak ada pesanan yang terlewat

**Multi-Station Routing**
- Pesanan otomatis terpecah ke station yang tepat:
  - Makanan → layar dapur utama
  - Minuman → layar bar
  - Dessert → layar pastry
- Setiap station hanya melihat item yang relevan, tidak bingung dengan pesanan lain
- Status "siap" dari semua station terkumpul — pelayan tahu kapan SEMUA item lengkap untuk diantar

**Hasil**: Kesalahan pesanan berkurang **80%**, kecepatan penyajian meningkat **30%**.

---

### Pain Point 2: Antrian Panjang dan Pelayanan Lambat

**Masalah yang sering terjadi:**
- Jam makan siang, antrian kasir mengular → pelanggan pergi
- Pelayan kewalahan mengambil pesanan di banyak meja
- Pelanggan menunggu lama untuk menu, lalu menunggu lagi untuk pesan
- Proses pembayaran lambat (hitung manual, kembalian tidak ada)

**Solusi TiloPOS:**

**Self-Order QR (Pemesanan Mandiri)**
- Setiap meja memiliki QR code unik
- Pelanggan scan dengan HP mereka (tidak perlu download aplikasi)
- Menu digital lengkap muncul dengan foto, deskripsi, dan harga
- Pelanggan pilih sendiri: item, jumlah, modifier, catatan khusus
- Pesanan langsung masuk ke KDS tanpa melalui pelayan
- Pelanggan bisa menambah pesanan kapan saja tanpa memanggil pelayan

**Manfaat Self-Order QR:**
- Tidak perlu cetak menu fisik (hemat biaya, mudah update)
- Mengurangi kebutuhan pelayan (1 pelayan bisa handle 2x lebih banyak meja)
- Average order value meningkat 15-25% (foto makanan yang menarik mendorong upsell)
- Pelanggan merasa lebih nyaman (tidak perlu menunggu, pesan kapan saja)
- Mengurangi kesalahan pesanan (pelanggan input sendiri)

**Multi-Payment Cepat**
- QRIS scan langsung dari kasir (semua e-wallet: GoPay, OVO, DANA, ShopeePay)
- Split bill fleksibel: per item, per jumlah, atau bagi rata
- Proses pembayaran < 15 detik
- Cetak struk otomatis atau kirim digital via WhatsApp

**Hasil**: Kapasitas pelanggan meningkat **20-30%**, waktu tunggu berkurang **50%**.

---

### Pain Point 3: Stok Bahan Baku Tidak Terkontrol

**Masalah yang sering terjadi:**
- Bahan baku habis di tengah jam sibuk (kehabisan ayam saat makan siang!)
- Tidak tahu berapa bahan baku yang terpakai per menu
- Food cost sulit dihitung (berapa sebenarnya HPP per porsi?)
- Bahan baku kadaluarsa terbuang sia-sia
- Karyawan mengambil bahan baku tanpa catatan (shrinkage)
- Supplier management kacau (lupa pesan, pesan dobel)

**Solusi TiloPOS:**

**Recipe/BOM Management (Bill of Materials)**
- Setiap menu didefinisikan resepnya:
  - Nasi Goreng Spesial = Nasi 200gr + Ayam 100gr + Telur 2 butir + Minyak 30ml + Bumbu NGS 1 sachet
- Saat 1 porsi Nasi Goreng terjual, bahan baku otomatis berkurang dari stok
- HPP (Harga Pokok Penjualan) per menu dihitung otomatis dan real-time
- Food cost percentage terlihat di dashboard (target: < 30%)

**Expired Date Tracking**
- Setiap batch bahan baku dicatat tanggal kadaluarsanya
- FIFO (First In, First Out) otomatis — sistem mengingatkan untuk gunakan stok lama dulu
- Alert H-3 sebelum kadaluarsa via app dan WhatsApp
- Laporan waste dari bahan kadaluarsa untuk analisis dan perbaikan

**Waste & Spoilage Tracking**
- Catat setiap bahan baku yang terbuang (kadaluarsa, rusak, kesalahan masak)
- Laporan waste per kategori dan per periode
- Identifikasi pola waste untuk perbaikan proses

**Purchase Order & Supplier Management**
- Database supplier lengkap (harga, lead time, minimum order)
- Buat PO langsung dari sistem saat stok rendah
- Auto-reorder point: sistem otomatis suggest PO saat stok mencapai batas minimum
- Bandingkan harga antar supplier
- Track status PO (pending → dikirim → diterima → dicek kualitas)

**Low Stock Alert Multi-Channel**
- Notifikasi via app, email, dan WhatsApp saat bahan baku hampir habis
- Batas minimum bisa di-set per item (contoh: alert saat ayam tinggal 5 kg)
- Alert dikirim ke owner dan kitchen manager sekaligus

**Hasil**: Food cost turun **3-5%**, waste berkurang **40%**, tidak pernah kehabisan stok lagi.

---

### Pain Point 4: Manajemen Meja dan Lantai Kacau

**Masalah yang sering terjadi:**
- Tidak tahu meja mana yang kosong, terisi, atau menunggu pembayaran
- Pelanggan duduk tapi belum dilayani karena pelayan tidak tahu
- Meja kotor tidak segera dibersihkan
- Reservasi dan waiting list manual (buku tulis hilang/rusak)
- Pelanggan duduk di meja yang sudah direservasi

**Solusi TiloPOS:**

**Table Management Visual**
- Layout restoran digambar secara visual di dashboard (bukan grid nomor membosankan)
- Status meja terlihat dalam warna:
  - Hijau = Kosong, siap digunakan
  - Biru = Terisi, sedang makan
  - Kuning = Menunggu pembayaran
  - Merah = Direservasi
  - Abu-abu = Sedang dibersihkan
- Klik meja untuk lihat detail: pesanan apa, berapa total, sudah berapa lama

**Fitur Meja Lanjutan:**
- **Merge table**: Gabungkan 2+ meja untuk rombongan (pesanan digabung)
- **Move table**: Pindahkan pesanan dari meja A ke meja B tanpa input ulang
- **Split bill per meja**: Pisahkan bill per tamu di meja yang sama

**Waiting List & Reservasi**
- Catat nama dan nomor HP pelanggan yang menunggu
- Notifikasi otomatis via WhatsApp saat meja tersedia
- Sistem reservasi online: pelanggan booking meja via link/QR
- Otomatis blokir meja yang sudah direservasi

**Hasil**: Table turnover meningkat **25%**, pelanggan lebih puas dengan pelayanan meja.

---

### Pain Point 5: Pelanggan Tidak Kembali

**Masalah yang sering terjadi:**
- Tidak punya database pelanggan (siapa pelanggan setia kita?)
- Tidak ada program untuk mendorong repeat visit
- Promo disebarkan secara manual dan tidak efektif
- Tidak tahu preferensi pelanggan (menu favorit, alergi, dll)

**Solusi TiloPOS:**

**CRM & Loyalty Program Built-In**
- Database pelanggan otomatis terisi dari transaksi
- Setiap pelanggan punya profil lengkap:
  - Riwayat pesanan
  - Total spending
  - Menu favorit
  - Frekuensi kunjungan
  - Catatan khusus (alergi, preferensi)

**Loyalty Points**
- Pelanggan dapat poin setiap transaksi (contoh: Rp 10.000 = 1 poin)
- Poin bisa ditukar reward (free drink, diskon, merchandise)
- Membership tier: Silver → Gold → Platinum (benefit meningkat)

**Marketing Otomatis**
- Birthday promo: otomatis kirim voucher saat ulang tahun pelanggan
- Win-back campaign: kirim promo ke pelanggan yang sudah 30 hari tidak berkunjung
- WhatsApp blast: kirim promo menu baru atau diskon ke segmen pelanggan tertentu
- Referral program: pelanggan ajak teman, dua-duanya dapat benefit

**Hasil**: Repeat customer meningkat **20-30%**, average spending naik **15%**.

---

### Pain Point 6: Tidak Punya Data untuk Keputusan Bisnis

**Masalah yang sering terjadi:**
- Tidak tahu menu mana yang paling laku dan mana yang rugi
- Tidak tahu jam sibuk yang sebenarnya
- Tidak bisa menghitung food cost per menu dengan akurat
- Laporan keuangan baru selesai akhir bulan (sudah terlambat untuk action)

**Solusi TiloPOS:**

**Dashboard Real-Time**
- Omzet hari ini, minggu ini, bulan ini — real-time
- Top 10 menu terlaris dan menu yang kurang laku
- Food cost percentage per menu dan keseluruhan
- Average transaction value
- Jumlah pelanggan dan transaksi

**Laporan Detail**
- **Heatmap penjualan**: jam dan hari tersibuk dalam bentuk visual
- **Menu performance**: margin, food cost, popularity matrix (stars, puzzles, plowhorses, dogs)
- **Staff performance**: penjualan per kasir, kecepatan, jumlah void/refund
- **Inventory report**: stok real-time, movement, days of stock remaining
- **Cash flow**: uang masuk/keluar per shift/hari/minggu/bulan

**Scheduled Report**
- Pemilik restoran terima email otomatis setiap pagi: ringkasan kemarin
- Laporan mingguan: trend dan anomali
- Alert instant saat ada transaksi void/refund besar (fraud detection)

**Hasil**: Keputusan bisnis berbasis data, food cost optimal, profitabilitas meningkat.

---

## 2. Fitur Khusus per Jenis F&B

### Restoran (Dine-in)

| Fitur | Detail |
|-------|--------|
| Table management visual | Layout meja sesuai denah restoran |
| KDS multi-station | Dapur, bar, pastry station terpisah |
| Course/gang management | Appetizer dulu, main course kemudian, dessert terakhir |
| Self-order QR per meja | Pelanggan pesan mandiri dari HP |
| Split bill fleksibel | Per item, per orang, per jumlah |
| Reservasi online | Pelanggan booking meja via link |
| Service charge & PB1 | Otomatis terhitung di bill |
| Tip management | Catat dan distribusikan tip ke staff |

### Kafe & Kedai Kopi

| Fitur | Detail |
|-------|--------|
| Queue management | Nomor antrian digital, panggil via layar/speaker |
| Modifier berlapis | Kopi: size, suhu, gula, susu, extra shot, topping |
| Take-away focused | Optimasi untuk pesanan bungkus |
| Membership/stamp card | Digital stamp card (beli 10, gratis 1) |
| GoFood/GrabFood integrasi | Pesanan online masuk ke KDS yang sama |
| Ambiance timer | Track berapa lama pelanggan duduk (untuk kafe yang ramai) |

### Fast Food & QSR (Quick Service Restaurant)

| Fitur | Detail |
|-------|--------|
| Speed of service | KDS dengan timer ketat per pesanan |
| Combo/paket | Buat combo meal (burger + fries + drink) dengan harga paket |
| Self-order kiosk ready | Support layar sentuh besar untuk self-ordering |
| Drive-through ready | Workflow khusus drive-through |
| Multi-counter | Beberapa kasir beroperasi simultan |
| Nomor pesanan | Sistem nomor urut otomatis |

### Food Court / Tenant

| Fitur | Detail |
|-------|--------|
| Multi-tenant POS | Satu sistem untuk seluruh food court |
| Centralized payment | Pelanggan bayar di satu kasir, pesanan masuk ke masing-masing tenant |
| Revenue sharing | Hitung otomatis bagi hasil per tenant |
| Unified reporting | Laporan keseluruhan food court dan per tenant |

### Cloud Kitchen / Ghost Kitchen

| Fitur | Detail |
|-------|--------|
| Multi-brand dari satu dapur | Kelola beberapa brand/menu dari satu lokasi |
| GoFood/GrabFood priority | Integrasi mendalam, auto-accept pesanan |
| KDS tanpa front-of-house | Fokus pada alur dapur saja |
| Packaging checklist | Pastikan semua item dalam 1 pesanan lengkap sebelum dikirim |
| Driver tracking | Status pesanan untuk estimasi pickup driver |

### Catering

| Fitur | Detail |
|-------|--------|
| Order advance/pre-order | Terima pesanan untuk tanggal masa depan |
| Bulk quantity | Pesanan dalam jumlah besar (100+ porsi) |
| Deposit/DP management | Catat pembayaran bertahap |
| Delivery scheduling | Jadwal pengiriman per pesanan |
| Menu package | Paket catering (nasi box, prasmanan, dll) |

---

## 3. Skenario Sukses: Dari Chaos ke Teratur

### Skenario: "Warung Makan Sederhana" menjadi Restoran Profesional

**Profil bisnis:**
- Warung makan Padang "Sari Minang" di Depok
- Pemilik: Pak Rahmat
- 15 meja, 8 karyawan
- Omzet rata-rata Rp 25.000.000/bulan
- Sebelumnya menggunakan nota manual

**Hari 1 — Setup TiloPOS:**
- 09.00: Tim TiloPOS datang ke lokasi
- 09.30: Setup sistem, koneksi printer, KDS di dapur
- 10.00: Input menu (35 item + modifier: level pedas, lauk tambahan)
- 11.00: Input bahan baku dan resep (BOM) untuk setiap menu
- 12.00: Training kasir dan kitchen staff
- 13.00: Go live! Mulai terima pesanan pertama via TiloPOS
- 15.00: Pasang QR code di setiap meja
- 16.00: Setup selesai. Total waktu: 7 jam.

**Minggu 1:**
- Kasir terbiasa dengan sistem (learning curve < 2 hari)
- Kitchen staff melihat pesanan di layar, bukan kertas — awalnya canggung, tapi langsung terasa manfaatnya
- Tidak ada lagi kesalahan pesanan karena tulisan tangan
- Pelanggan mulai coba self-order QR — "Wah, canggih ini!"

**Bulan 1:**
- Data mulai terkumpul: ternyata menu terlaris bukan rendang (yang food cost-nya tinggi) tapi gulai ayam (margin lebih baik)
- Food cost terukur: rata-rata 32% → target diturunkan ke 28%
- Shrinkage teridentifikasi: bawang merah selalu kurang → ternyata ada yang tidak efisien dalam pemakaian
- 40% pelanggan sudah menggunakan self-order QR
- Pelayan yang tadinya 4 orang, cukup 3 orang (penghematan Rp 2.500.000/bulan)
- Omzet naik 12% karena table turnover lebih cepat

**Bulan 3:**
- Food cost turun ke 28% (hemat Rp 1.000.000/bulan)
- Loyalty program aktif: 200 member terdaftar
- Birthday promo menghasilkan 15 extra visit per bulan
- Repeat customer naik dari 35% ke 50%
- Omzet naik 25% ke Rp 31.250.000/bulan

**Bulan 6:**
- Pak Rahmat buka cabang kedua berdasarkan data: area sekitar kampus (data menunjukkan banyak pelanggan dari kalangan mahasiswa)
- Multi-outlet management dari 1 dashboard
- Central purchasing untuk kedua outlet (negosiasi harga supplier lebih kuat)
- Omzet total: Rp 55.000.000/bulan
- Food cost konsisten 27%

**ROI setelah 6 bulan:**
- Investasi TiloPOS: Rp 249.000/bulan x 6 bulan = Rp 1.494.000
- Penghematan pelayan: Rp 2.500.000/bulan x 6 = Rp 15.000.000
- Penghematan food cost: Rp 1.000.000/bulan x 5 = Rp 5.000.000
- Peningkatan omzet (25%): Rp 6.250.000/bulan x 4 = Rp 25.000.000
- **Total benefit: Rp 45.000.000 vs investasi Rp 1.494.000 → ROI 2.912%**

---

## 4. Timeline Setup: 1 Hari untuk Go Live

### Jam 08.00-09.00: Persiapan
- Tim TiloPOS tiba di lokasi
- Survei kebutuhan: jumlah meja, layout dapur, jumlah kasir
- Setup hardware: printer struk, KDS display, cash drawer

### Jam 09.00-11.00: Konfigurasi Sistem
- Buat akun bisnis dan konfigurasi dasar
- Input menu lengkap (nama, harga, kategori, foto, modifier)
- Setup varian dan modifier (ukuran, topping, level pedas, dll)
- Input bahan baku dan definisikan resep/BOM per menu
- Setup supplier dan stok awal

### Jam 11.00-12.00: Setup F&B Spesifik
- Gambar layout meja di table management
- Konfigurasi KDS (station routing: makanan, minuman, dessert)
- Setup self-order QR per meja
- Konfigurasi pajak restoran (PB1), service charge, tip
- Setup metode pembayaran (cash, QRIS, e-wallet, kartu)

### Jam 12.00-13.00: Istirahat + Testing
- Test transaksi end-to-end: pesan → KDS → bayar → struk
- Test self-order QR dari HP
- Test cetak struk
- Test split bill dan multi-payment

### Jam 13.00-15.00: Training Staff
- Training kasir: transaksi, pembayaran, void/refund, shift management
- Training kitchen staff: cara baca KDS, update status pesanan
- Training pelayan: table management, move table, merge table
- Training owner/manager: dashboard, laporan, stok management

### Jam 15.00-16.00: Go Live!
- Mulai terima transaksi nyata
- Tim TiloPOS standby untuk assist
- Fine-tuning jika ada yang perlu disesuaikan
- Serah terima dan handshake

**Total waktu: 8 jam. Satu hari. Restoran Anda sudah digital.**

---

## 5. Perhitungan ROI Detail untuk F&B

### Skenario A: Restoran Menengah (15-30 meja)

| Parameter | Nilai |
|-----------|-------|
| Omzet bulanan | Rp 50.000.000 |
| Jumlah transaksi/hari | 150 |
| Jumlah karyawan | 12 |
| Food cost saat ini | 33% |

| Sumber Penghematan/Peningkatan | Nilai/bulan |
|-------------------------------|------------|
| Food cost turun ke 28% (BOM tracking) | +Rp 2.500.000 |
| Shrinkage turun dari 3% ke 0.5% | +Rp 1.250.000 |
| Waste berkurang 40% | +Rp 500.000 |
| Pengurangan 1 pelayan (self-order QR) | +Rp 2.800.000 |
| Peningkatan kapasitas 20% (efisiensi) | +Rp 10.000.000 |
| Peningkatan repeat customer 15% | +Rp 3.750.000 |
| Pengurangan kesalahan pesanan (KDS) | +Rp 750.000 |
| **Total benefit** | **+Rp 21.550.000** |
| **Biaya TiloPOS Professional** | **-Rp 249.000** |
| **NET benefit per bulan** | **+Rp 21.301.000** |

**Payback period: < 1 hari kerja**

### Skenario B: Kafe Kecil (5-10 meja)

| Parameter | Nilai |
|-----------|-------|
| Omzet bulanan | Rp 15.000.000 |
| Jumlah transaksi/hari | 80 |
| Jumlah karyawan | 4 |
| Food cost saat ini | 30% |

| Sumber Penghematan/Peningkatan | Nilai/bulan |
|-------------------------------|------------|
| Food cost turun ke 26% | +Rp 600.000 |
| Shrinkage turun | +Rp 300.000 |
| Peningkatan kapasitas 15% | +Rp 2.250.000 |
| Loyalty program (repeat +10%) | +Rp 1.500.000 |
| Efisiensi operasional | +Rp 500.000 |
| **Total benefit** | **+Rp 5.150.000** |
| **Biaya TiloPOS Professional** | **-Rp 249.000** |
| **NET benefit per bulan** | **+Rp 4.901.000** |

### Skenario C: Chain Restaurant (5 outlet)

| Parameter | Nilai |
|-----------|-------|
| Omzet total bulanan | Rp 250.000.000 |
| Total karyawan | 50 |
| Food cost saat ini | 35% |

| Sumber Penghematan/Peningkatan | Nilai/bulan |
|-------------------------------|------------|
| Food cost turun ke 30% (standardisasi resep) | +Rp 12.500.000 |
| Shrinkage turun (central monitoring) | +Rp 5.000.000 |
| Pengurangan staff (self-order QR x 5 outlet) | +Rp 12.500.000 |
| Peningkatan kapasitas | +Rp 25.000.000 |
| Loyalty program & CRM | +Rp 12.500.000 |
| Efisiensi purchasing (central procurement) | +Rp 5.000.000 |
| **Total benefit** | **+Rp 72.500.000** |
| **Biaya TiloPOS Enterprise (5 outlet)** | **-Rp 2.495.000** |
| **NET benefit per bulan** | **+Rp 70.005.000** |

---

## 6. Integrasi Ekosistem F&B

### Food Delivery
- **GoFood**: Pesanan GoFood masuk otomatis ke KDS TiloPOS. Tidak perlu tablet terpisah.
- **GrabFood**: Sama seperti GoFood, terintegrasi langsung.
- **ShopeeFood**: Integrasi tersedia.
- **Benefit**: Satu layar untuk semua pesanan (dine-in, takeaway, delivery), tidak perlu banyak tablet.

### Payment
- **QRIS**: Semua e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja)
- **Kartu kredit/debit**: Visa, Mastercard via EDC terintegrasi
- **Transfer bank**: BCA, Mandiri, BNI, BRI
- **Cash**: Cash drawer terintegrasi, hitung kembalian otomatis

### Akuntansi
- **Jurnal by Mekari**: Sinkronisasi penjualan harian otomatis
- **Accurate**: Export data penjualan ke Accurate
- **Laporan pajak**: PB1 dan PPN otomatis terhitung untuk pelaporan

---

## 7. Mengapa TiloPOS, Bukan yang Lain?

### vs Moka POS
- KDS TiloPOS multi-station (dapur, bar, pastry) — Moka hanya basic
- Self-order QR sudah termasuk — Moka addon berbayar
- Recipe/BOM management — Moka tidak punya
- Harga 50% lebih murah
- Unlimited device — Moka charge per device

### vs Majoo
- KDS routing lebih canggih
- Self-order QR built-in — Majoo addon
- Waste tracking — Majoo tidak punya
- Table management visual — Majoo hanya grid

### vs ESB
- Fitur setara tapi harga 3-5x lebih murah
- Setup 1 hari — ESB berminggu-minggu
- Tidak butuh tim IT — ESB butuh
- Cocok untuk UMKM hingga enterprise — ESB hanya enterprise

---

## 8. Testimoni dan Social Proof

### Angka yang Berbicara
- **500+** restoran dan kafe sudah menggunakan TiloPOS
- **97%** pelanggan F&B melanjutkan langganan setelah bulan pertama
- **Rata-rata peningkatan omzet**: 20-30% dalam 3 bulan pertama
- **Rata-rata penurunan food cost**: 3-5 percentage points
- **Rata-rata pengurangan kesalahan pesanan**: 80%

### Jenis F&B yang Sudah Menggunakan TiloPOS
- Restoran keluarga
- Kedai kopi specialty
- Warteg modern
- Bakery & pastry shop
- Bubble tea / minuman kekinian
- Restoran Jepang / Korea / Western
- Warung makan Padang
- Chinese restaurant
- Pizza delivery
- Catering harian
- Cloud kitchen multi-brand
- Food court

---

## 9. Paket Khusus F&B

### Starter Kit F&B — Rp 2.499.000 (sekali bayar + langganan)

**Termasuk:**
- Langganan TiloPOS Professional 3 bulan
- 1x Thermal printer 80mm
- 1x Cash drawer
- 10x QR code stand (acrylic) untuk meja
- Setup dan training onsite gratis
- Support prioritas selama 3 bulan pertama

### Upgrade Kit KDS — Rp 1.999.000 (sekali bayar)

**Termasuk:**
- 1x Android tablet 10" untuk KDS
- Tablet stand (wall mount atau counter)
- Setup KDS dan routing
- Training kitchen staff

---

## 10. Call to Action

### Langkah Selanjutnya

1. **Coba Gratis**: Daftar TiloPOS Starter dan rasakan sendiri kemudahannya — tanpa biaya, tanpa kartu kredit.
2. **Jadwalkan Demo**: Tim kami datang ke restoran Anda untuk demo langsung dan assessment kebutuhan. Gratis, tanpa kewajiban.
3. **Mulai dalam 1 Hari**: Setelah deal, restoran Anda bisa go live dalam 1 hari.

### Kontak Tim Sales F&B
- WhatsApp: [nomor tim sales]
- Email: sales@tilopos.com
- Website: www.tilopos.com/fnb

---

**TiloPOS — Dapur Teratur, Pelanggan Senang, Bisnis Tumbuh.**
