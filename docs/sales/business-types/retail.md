# TiloPOS untuk Bisnis Retail

Dokumen pitch lengkap untuk toko kelontong, minimarket, fashion, hardware/bangunan, elektronik, toko buku, toko kosmetik, apotek, toko oleh-oleh, dan semua jenis bisnis retail.

---

## Pendahuluan: Retail Indonesia di Persimpangan Digital

Indonesia memiliki lebih dari **64 juta UMKM**, dan sebagian besar bergerak di sektor retail. Namun, mayoritas masih mengandalkan pencatatan manual — buku tulis, nota karbon, dan menghitung stok dengan cara "lihat rak, kira-kira masih ada berapa."

Hasilnya? **Stok tidak akurat, barang hilang tanpa jejak, keuntungan tidak jelas, dan bisnis sulit berkembang.** Pemilik toko bekerja keras dari pagi sampai malam, tapi tidak pernah yakin apakah bisnisnya benar-benar untung.

**TiloPOS mengubah ini.** Dengan sistem POS retail yang dirancang khusus untuk kebutuhan toko Indonesia — dari warung kelontong hingga jaringan minimarket — setiap transaksi tercatat, setiap barang terlacak, dan setiap keputusan berbasis data.

---

## 1. Pain Points Bisnis Retail dan Solusi TiloPOS

### Pain Point 1: Stok Tidak Akurat

**Masalah yang sering terjadi:**
- Jumlah stok di catatan tidak cocok dengan stok fisik
- Barang sudah habis tapi baru ketahuan saat pelanggan bertanya
- Barang baru datang tapi lupa dicatat
- Tidak tahu berapa stok optimal yang harus dipegang (terlalu banyak = modal mengendap, terlalu sedikit = kehilangan penjualan)
- Stock opname tahunan memakan waktu berhari-hari dan harus menutup toko
- Tidak tahu barang mana yang fast-moving dan mana yang slow-moving

**Solusi TiloPOS:**

**Manajemen Stok Real-Time**
- Setiap penjualan otomatis mengurangi stok — real-time, bukan akhir hari
- Setiap penerimaan barang (goods receiving) otomatis menambah stok
- Dashboard stok: lihat semua produk, jumlah tersedia, nilai stok, dan status dalam satu layar
- Stok per lokasi/gudang jika ada multi-warehouse

**Stock Opname yang Efisien**
- Scan barcode dengan HP atau barcode scanner — input jumlah aktual
- Sistem otomatis menghitung selisih (variance) antara stok sistem dan stok fisik
- Variance report detail: item apa yang selisih, berapa selisih, estimasi nilai kerugian
- Partial stock opname: bisa opname per kategori (tidak harus seluruh toko sekaligus)
- Tidak perlu tutup toko — opname bisa dilakukan per section saat toko tetap buka
- Waktu opname: dari 2 hari → 2 jam

**Low Stock Alert & Auto-Reorder**
- Set batas minimum per item (contoh: Indomie Goreng, alert saat tinggal 20 bungkus)
- Notifikasi via app, email, dan WhatsApp saat stok mendekati batas minimum
- Auto-reorder point: sistem otomatis membuat draft PO ke supplier saat stok rendah
- Days of stock remaining: perkiraan berapa hari stok bertahan berdasarkan rata-rata penjualan

**Hasil**: Akurasi stok meningkat dari **70% ke 98%**, kehilangan stok (shrinkage) turun **80%**.

---

### Pain Point 2: Pencatatan Manual dan Penghitungan Sulit

**Masalah yang sering terjadi:**
- Menulis nota manual untuk setiap transaksi — lambat dan rawan salah
- Menghitung total belanjaan manual — salah hitung, pelanggan complain
- Tidak punya catatan riwayat transaksi (nota hilang, luntur, rusak)
- Akhir hari: menghitung uang di kasir, selalu tidak cocok
- Akhir bulan: tidak tahu berapa keuntungan sebenarnya

**Solusi TiloPOS:**

**POS Kasir yang Cepat dan Akurat**
- Scan barcode: produk langsung muncul dengan harga yang benar
- Pencarian produk: ketik nama atau kode produk
- Total otomatis: subtotal, diskon, pajak, grand total — tidak ada salah hitung
- Kembalian otomatis: input uang diterima, kembalian langsung tampil
- Cetak struk: thermal printer Bluetooth, USB, atau WiFi
- Struk digital via WhatsApp (hemat kertas, pelanggan senang)

**Multi-Payment**
- Cash: dengan perhitungan kembalian otomatis
- QRIS: scan sekali, bayar dari e-wallet manapun
- Transfer bank: verifikasi otomatis
- Kartu debit/kredit: via EDC terintegrasi
- Hutang/kredit: catat piutang pelanggan, kirim reminder otomatis

**Shift & Cash Management**
- Buka shift: catat modal awal kasir
- Tutup shift: hitung uang fisik, bandingkan dengan sistem
- Selisih kas langsung terlihat (lebih/kurang)
- Riwayat shift per kasir: track kinerja dan kejujuran

**Hasil**: Kecepatan transaksi meningkat **3x**, akurasi kas **99.5%+**.

---

### Pain Point 3: Kompleksitas Harga dan Varian

**Masalah yang sering terjadi:**
- Satu produk punya banyak varian (ukuran, warna, bahan) — sulit dilacak satu per satu
- Harga berbeda untuk pelanggan berbeda (grosir vs eceran)
- Promo dan diskon berubah-ubah, kasir lupa update
- Harga beli berubah tapi harga jual belum diupdate → margin terkikis
- Label harga di rak tidak cocok dengan harga di kasir

**Solusi TiloPOS:**

**Manajemen Varian Tanpa Batas**
- Produk dengan multiple varian: ukuran (S/M/L/XL/XXL), warna (20+ warna), bahan, motif
- Setiap varian punya SKU, barcode, dan stok sendiri
- Contoh: Kaos Polos bisa punya 5 ukuran x 10 warna = 50 varian, masing-masing tracked
- Matrix view: lihat stok semua varian dalam satu tabel

**Price Tiers (Tingkatan Harga)**
- Harga eceran, grosir, reseller, member — semua bisa di-set per produk
- Otomatis berubah berdasarkan jumlah beli:
  - 1-11 pcs: Rp 15.000 (eceran)
  - 12-47 pcs: Rp 13.000 (setengah lusin)
  - 48+ pcs: Rp 11.000 (grosir)
- Harga khusus per pelanggan (contoh: toko langganan dapat harga special)

**Diskon & Promo Otomatis**
- Diskon per item, per kategori, per total belanja
- Promo terjadwal: otomatis aktif dan nonaktif sesuai tanggal
- Bundle/paket: beli 3 gratis 1, beli A+B dapat harga khusus
- Diskon member: otomatis terapply saat scan kartu member

**Manajemen Harga Beli**
- Catat harga beli per supplier per produk
- Alert saat harga beli naik (margin check)
- Suggested retail price berdasarkan margin target

**Hasil**: Tidak ada lagi salah harga, margin terjaga, promo berjalan otomatis.

---

### Pain Point 4: Pengadaan Barang (Purchasing) Tidak Teratur

**Masalah yang sering terjadi:**
- Pesan barang berdasarkan ingatan ("Kayaknya Indomie sudah mau habis")
- Lupa pesan, atau pesan dobel
- Tidak tahu supplier mana yang kasih harga terbaik
- Barang datang tapi tidak dicek (jumlah kurang, barang cacat)
- Faktur supplier menumpuk, lupa bayar, atau bayar dobel

**Solusi TiloPOS:**

**Purchase Order (PO) System**
- Buat PO berdasarkan data stok aktual (bukan "kira-kira")
- Auto-suggest PO: sistem otomatis menyarankan produk dan jumlah yang perlu dipesan berdasarkan reorder point
- Template PO per supplier: sekali setup, tinggal adjust jumlah
- Kirim PO ke supplier via email atau WhatsApp langsung dari sistem
- Track status PO: draft → sent → partial received → completed

**Supplier Management**
- Database supplier per produk: siapa saja yang supply, harga masing-masing, lead time
- Perbandingan harga antar supplier otomatis
- Catatan kinerja supplier: ketepatan waktu, kualitas, kelengkapan order
- Hutang ke supplier tercatat (account payable basic)

**Goods Receiving (Penerimaan Barang)**
- Scan atau input barang yang diterima, bandingkan dengan PO
- Catat jika ada selisih jumlah atau barang cacat
- QC check: status diterima/ditolak per item
- Stok otomatis bertambah setelah goods receiving difinalisasi

**Batch & Expired Date Tracking**
- Setiap batch penerimaan dicatat terpisah (penting untuk produk yang punya masa berlaku)
- FIFO enforcement: sistem mengingatkan untuk jual batch lama dulu
- Alert expired date: H-30, H-7, H-3 sebelum kadaluarsa
- Laporan produk yang mendekati kadaluarsa untuk promo clearance

**Hasil**: Tidak ada lagi "kehabisan barang" atau "stok mati", purchasing lebih efisien.

---

### Pain Point 5: Barang Hilang dan Shrinkage

**Masalah yang sering terjadi:**
- Barang hilang dan tidak tahu kemana (dicuri pelanggan? diambil karyawan? salah hitung?)
- Shrinkage rate tinggi (rata-rata retail Indonesia: 2-5% dari omzet)
- Tidak ada sistem untuk mendeteksi anomali
- Karyawan yang tidak jujur sulit terdeteksi
- Kerugian baru terasa saat stock opname (sudah terlambat)

**Solusi TiloPOS:**

**Pelacakan Stok Ketat**
- Setiap pergerakan stok tercatat: penjualan, retur, transfer, adjustment, waste
- Tidak ada pergerakan stok tanpa alasan dan approval
- Adjustment stok memerlukan approval manager dan wajib isi alasan

**Serial Number Tracking**
- Untuk barang bernilai tinggi (elektronik, HP, laptop, perhiasan)
- Setiap unit punya serial number unik yang tercatat di sistem
- Saat dijual, serial number tercatat di nota → tracking garansi
- Jika hilang, terdeteksi spesifik unit mana yang hilang

**Anomaly Detection**
- Alert saat void/refund berlebihan (potensi fraud kasir)
- Alert saat adjustment stok terlalu besar
- Perbandingan shrinkage per shift/kasir (identifikasi sumber masalah)
- Trend shrinkage per kategori produk

**Hasil**: Shrinkage turun dari **3% ke 0.5%** dari omzet.

---

### Pain Point 6: Pelanggan Tidak Loyal

**Masalah yang sering terjadi:**
- Tidak kenal siapa pelanggan setia
- Pelanggan mudah pindah ke toko sebelah yang lebih murah Rp 500
- Tidak ada cara untuk menarik pelanggan kembali
- Promo tidak tepat sasaran (diskon produk yang memang sudah laku)

**Solusi TiloPOS:**

**CRM Retail**
- Database pelanggan otomatis dari transaksi (nama, HP, alamat)
- Riwayat belanja per pelanggan: apa yang sering dibeli, berapa total spending
- Segmentasi otomatis: pelanggan baru, reguler, VIP, dormant

**Loyalty & Membership**
- Point rewards: Rp 10.000 belanja = 1 poin
- Stamp card digital: beli 10x, gratis 1
- Membership tier: Member → Silver → Gold → Platinum
- Benefit per tier: diskon khusus, early access promo, gratis ongkir

**Marketing Tertarget**
- WhatsApp blast ke segmen tertentu (contoh: pelanggan yang sering beli susu bayi → promo susu bayi)
- Birthday voucher otomatis
- Win-back campaign: pelanggan yang 60 hari tidak belanja → kirim voucher khusus
- Referral program: ajak teman belanja, dua-duanya dapat voucher

**Hasil**: Repeat customer meningkat **25%**, customer lifetime value naik **40%**.

---

## 2. Solusi per Jenis Retail

### 2.1 Toko Kelontong / Minimarket

**Kebutuhan utama:**
- Ribuan SKU dengan harga satuan kecil
- Pelanggan regular yang beli harian
- Stok yang perlu diputar cepat (produk kadaluarsa)
- Harga grosir vs eceran

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Kelontong |
|-------|----------------------|
| Barcode scanner | Transaksi cepat, tidak perlu hafal harga ribuan item |
| Batch & expired tracking | Pastikan produk lama dijual duluan (FIFO), kurangi waste |
| Price tier (grosir/eceran) | Otomatis berubah sesuai jumlah beli |
| Auto-reorder | Tidak kehabisan barang populer |
| Hutang pelanggan | Catat "bon" pelanggan tetap, kirim reminder otomatis |
| Low stock alert | Notifikasi instant saat produk penting hampir habis |
| Fast checkout | Scan barcode, bayar, selesai — < 30 detik per transaksi |

**Contoh penggunaan sehari-hari:**
- Pagi: buka shift, cek stok yang perlu diorder
- Siang: auto-reorder suggest muncul — kirim PO ke supplier via WhatsApp
- Sore: barang datang — goods receiving, scan, stok otomatis update
- Malam: tutup shift, cek selisih kas, lihat laporan hari ini

---

### 2.2 Fashion Retail (Pakaian, Sepatu, Aksesoris)

**Kebutuhan utama:**
- Varian produk sangat banyak (ukuran x warna x bahan)
- Barang musiman (trend berubah cepat)
- Return/exchange policy
- Visual display dan katalog

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Fashion |
|-------|---------------------|
| Unlimited varian | Ukuran (XS-5XL) x warna (20+) x bahan — semua tracked |
| Matrix stock view | Lihat stok semua varian dalam 1 tabel |
| Season/collection tagging | Kelompokkan produk per musim/koleksi |
| Return/exchange management | Proses retur dan tukar ukuran dengan tracking lengkap |
| Foto produk | Katalog visual di POS untuk referensi staff |
| Discount engine | Promo end-of-season sale, buy 2 get 1, bundle pricing |
| Customer profiling | Ukuran favorit pelanggan, style preference |

**Contoh penggunaan:**
- Koleksi baru datang → input dengan foto, varian, dan seasonal tag
- Staff lihat stok per ukuran per warna di tablet → langsung tahu ada/tidak
- Pelanggan mau tukar ukuran → proses exchange, stok otomatis adjust
- End of season → set promo "diskon 50% semua koleksi Summer" → otomatis aktif

---

### 2.3 Toko Hardware / Bangunan

**Kebutuhan utama:**
- Produk satuan beragam (pcs, kg, meter, liter, sak, batang)
- Pelanggan proyek (beli banyak, bayar mundur)
- Harga berubah mengikuti harga pasar
- Stok berat/bulky yang sulit dihitung

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Hardware |
|-------|----------------------|
| Multi-unit of measure | Jual per pcs, per box, per kg, per meter — konversi otomatis |
| Hutang/piutang | Catat hutang kontraktor/proyek, track pembayaran cicilan |
| Quotation/penawaran | Buat surat penawaran harga untuk tender proyek |
| Price history | Lacak perubahan harga beli dari waktu ke waktu |
| Minimum margin protection | Alert jika harga jual terlalu dekat dengan harga beli |
| Heavy inventory tracking | Stok per gudang, per rak, per lokasi |
| Delivery management | Catat pengiriman ke lokasi proyek |

---

### 2.4 Toko Elektronik / HP

**Kebutuhan utama:**
- Serial number per unit (garansi tracking)
- Harga berubah cepat (terutama HP)
- IMEI tracking (regulasi pemerintah)
- Aksesoris bundling
- Trade-in program

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Elektronik |
|-------|------------------------|
| Serial number tracking | Setiap HP/laptop punya serial number unik, tracked sampai terjual |
| IMEI recording | Catat IMEI di struk untuk validasi garansi dan CEIR |
| Warranty tracking | Tanggal beli, masa garansi, klaim garansi |
| Bundle pricing | HP + case + screen protector = harga paket |
| Trade-in management | Terima HP bekas, catat sebagai stok second-hand |
| Price comparison | Bandingkan harga beli dari distributor berbeda |
| Consignment tracking | Barang titipan dari distributor, bayar setelah terjual |

---

### 2.5 Apotek / Toko Obat

**Kebutuhan utama:**
- Expired date sangat kritis (obat kadaluarsa = bahaya)
- Batch number wajib (traceability regulasi BPOM)
- Resep dokter management
- Obat yang butuh izin khusus

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Apotek |
|-------|---------------------|
| Batch tracking wajib | Setiap batch obat tercatat — traceability penuh |
| Expired date enforcement | Sistem BLOKIR penjualan obat yang sudah kadaluarsa |
| FIFO strict | Pastikan batch lama dijual duluan |
| Near-expiry alert | Notifikasi H-90, H-30, H-7 sebelum kadaluarsa |
| Near-expiry promo | Otomatis kasih diskon untuk obat mendekati expired |
| Restricted item flag | Flag obat keras yang butuh resep dokter |
| Supplier compliance | Track supplier yang punya izin resmi |

---

### 2.6 Toko Kosmetik / Beauty

**Kebutuhan utama:**
- Varian shade/warna yang sangat banyak
- Tester management
- Expired date tracking (kosmetik punya PAO)
- Bundling dan gift set

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Kosmetik |
|-------|----------------------|
| Shade/varian tracking | Foundation shade 001-050, lipstick 30 warna — semua tracked |
| Tester write-off | Catat produk yang dijadikan tester sebagai expense |
| Batch & PAO tracking | Period After Opening tracking untuk keamanan pelanggan |
| Gift set bundling | Buat paket hadiah dengan pricing khusus |
| Customer beauty profile | Catat skin type, shade preference per pelanggan |
| Loyalty program | Beauty points, birthday gift, member exclusive |

---

### 2.7 Toko Buku & ATK

**Kebutuhan utama:**
- ISBN/barcode sudah ada di setiap buku
- Konsinyasi dari penerbit (bayar setelah terjual)
- Musiman (back-to-school, semester baru)
- Harga buku sudah tercetak (tidak bisa markup)

**Fitur TiloPOS yang relevan:**

| Fitur | Manfaat untuk Toko Buku |
|-------|------------------------|
| ISBN barcode scan | Langsung scan barcode buku, data otomatis muncul |
| Consignment management | Track barang konsinyasi dari penerbit, bayar sesuai terjual |
| Seasonal planning | Analisis penjualan per musim untuk forecasting |
| Fixed price support | Harga cetak penerbit di-enforce, diskon sesuai kebijakan |
| Category management | Organisasi per genre, level pendidikan, penerbit |

---

## 3. Skenario Sukses Retail

### Skenario: Minimarket "Berkah Jaya" — Dari Buku Tulis ke Digital

**Profil bisnis:**
- Minimarket di perumahan Bekasi
- Pemilik: Bu Siti
- 2.000 SKU
- 3 karyawan (2 kasir + 1 stock)
- Omzet: Rp 60.000.000/bulan
- Sebelumnya: nota manual, stok dihitung ingatan

**Sebelum TiloPOS:**
- Stock opname: 3 hari sekali setahun, toko harus tutup
- Shrinkage: tidak tahu persis, tapi "kok kayaknya barang sering hilang"
- Pelanggan beli banyak tapi lupa bayar hutang → tidak ada catatan
- Tidak tahu produk mana yang paling untung
- Pesan barang berdasarkan "perasaan" → sering kehabisan susu dan mie instan

**Setelah TiloPOS (3 bulan):**

| Metrik | Sebelum | Sesudah | Perubahan |
|--------|---------|---------|-----------|
| Waktu stock opname | 3 hari | 3 jam | -96% |
| Shrinkage rate | ~4% (est.) | 0.8% | -80% |
| Piutang tak tertagih | Rp 3.000.000/bulan | Rp 200.000/bulan | -93% |
| Kehabisan stok | 15 item/minggu | 1 item/minggu | -93% |
| Waktu per transaksi | 2 menit | 30 detik | -75% |
| Omzet bulanan | Rp 60.000.000 | Rp 72.000.000 | +20% |

**Penghematan dan peningkatan finansial:**

| Sumber | Nilai/bulan |
|--------|------------|
| Shrinkage turun (4% → 0.8%) | +Rp 1.920.000 |
| Piutang tertagih | +Rp 2.800.000 |
| Omzet naik (stok selalu ada) | +Rp 12.000.000 |
| Efisiensi operasional | +Rp 500.000 |
| **Total benefit** | **+Rp 17.220.000** |
| **Biaya TiloPOS Professional** | **-Rp 249.000** |
| **NET benefit** | **+Rp 16.971.000** |

**Bu Siti**: "Dulu saya kerja dari jam 6 pagi sampai jam 10 malam, sekarang saya bisa pulang jam 8 karena semua sudah tercatat di sistem. Yang paling terasa itu piutang pelanggan — dulu banyak yang 'lupa', sekarang ada catatan jelas di HP saya."

---

## 4. Timeline Setup Retail: 1 Hari

### Jam 08.00-09.00: Persiapan
- Tim TiloPOS tiba, survei toko
- Setup hardware: barcode scanner, printer struk, cash drawer
- Koneksi jaringan dan perangkat

### Jam 09.00-12.00: Input Data
- Import produk dari Excel/CSV (jika sudah ada data digital)
- Atau: scan barcode produk satu per satu (untuk produk berbarcode)
- Input manual untuk produk tanpa barcode
- Set kategori, harga jual, harga beli, stok awal
- Set varian, price tier, dan supplier per produk
- Catatan: 2.000 SKU dengan barcode bisa diinput dalam 2-3 jam

### Jam 12.00-13.00: Istirahat + Konfigurasi
- Setup metode pembayaran
- Setup struk (logo, info toko, pesan promo)
- Konfigurasi notifikasi stok
- Setup user dan role per karyawan

### Jam 13.00-15.00: Training
- Training kasir: scan barcode, terima pembayaran, tutup shift
- Training stock admin: goods receiving, stock opname, PO
- Training owner: dashboard, laporan, alert stok

### Jam 15.00-16.00: Go Live
- Test transaksi nyata
- Fine-tuning
- Serah terima

---

## 5. Perhitungan ROI Detail untuk Retail

### Skenario A: Minimarket / Kelontong

| Parameter | Nilai |
|-----------|-------|
| Omzet bulanan | Rp 80.000.000 |
| SKU | 3.000 |
| Karyawan | 4 |
| Margin rata-rata | 15% |

| Sumber ROI | Nilai/bulan |
|-----------|------------|
| Shrinkage turun (3% → 0.5%) | +Rp 2.000.000 |
| Dead stock berkurang (forecasting) | +Rp 1.500.000 |
| Piutang tertagih (reminder otomatis) | +Rp 1.000.000 |
| Omzet naik (stok selalu tersedia) | +Rp 8.000.000 |
| Efisiensi stock opname (tidak tutup toko) | +Rp 400.000 |
| Purchasing optimization (supplier terbaik) | +Rp 500.000 |
| **Total benefit** | **+Rp 13.400.000** |
| **Biaya TiloPOS** | **-Rp 249.000** |
| **NET ROI per bulan** | **+Rp 13.151.000** |

### Skenario B: Fashion Store

| Parameter | Nilai |
|-----------|-------|
| Omzet bulanan | Rp 40.000.000 |
| SKU (termasuk varian) | 1.500 |
| Karyawan | 3 |
| Margin rata-rata | 50% |

| Sumber ROI | Nilai/bulan |
|-----------|------------|
| Shrinkage turun | +Rp 800.000 |
| Dead stock berkurang (seasonal analysis) | +Rp 2.000.000 |
| Return/exchange efficiency | +Rp 200.000 |
| Loyalty program (repeat purchase +15%) | +Rp 3.000.000 |
| Omzet naik (ukuran selalu available) | +Rp 2.000.000 |
| **Total benefit** | **+Rp 8.000.000** |
| **Biaya TiloPOS** | **-Rp 249.000** |
| **NET ROI per bulan** | **+Rp 7.751.000** |

### Skenario C: Toko Elektronik

| Parameter | Nilai |
|-----------|-------|
| Omzet bulanan | Rp 200.000.000 |
| SKU | 500 |
| Karyawan | 5 |
| Margin rata-rata | 10% |

| Sumber ROI | Nilai/bulan |
|-----------|------------|
| Shrinkage turun (serial number tracking) | +Rp 4.000.000 |
| Warranty claim efficiency | +Rp 500.000 |
| Pricing optimization (margin protection) | +Rp 2.000.000 |
| Loyalty program | +Rp 4.000.000 |
| Efisiensi operasional | +Rp 1.000.000 |
| **Total benefit** | **+Rp 11.500.000** |
| **Biaya TiloPOS** | **-Rp 249.000** |
| **NET ROI per bulan** | **+Rp 11.251.000** |

### Skenario D: Jaringan Minimarket (10 outlet)

| Parameter | Nilai |
|-----------|-------|
| Omzet total bulanan | Rp 500.000.000 |
| Total SKU | 5.000 |
| Total karyawan | 35 |

| Sumber ROI | Nilai/bulan |
|-----------|------------|
| Shrinkage turun (central monitoring) | +Rp 12.500.000 |
| Central purchasing (volume discount dari supplier) | +Rp 5.000.000 |
| Stock transfer optimization | +Rp 3.000.000 |
| Dead stock reduction | +Rp 7.500.000 |
| Consolidated analytics (decision quality) | +Rp 5.000.000 |
| Staff efficiency | +Rp 5.000.000 |
| **Total benefit** | **+Rp 38.000.000** |
| **Biaya TiloPOS Enterprise (10 outlet)** | **-Rp 4.491.000** |
| **NET ROI per bulan** | **+Rp 33.509.000** |

---

## 6. Integrasi untuk Retail

### Marketplace
- **Tokopedia**: Sinkronisasi produk dan stok. Pesanan Tokopedia otomatis masuk ke TiloPOS, stok otomatis berkurang.
- **Shopee**: Sama seperti Tokopedia.
- **Bukalapak**: Integrasi tersedia.
- **Lazada**: Integrasi tersedia.
- **Benefit**: Satu stok untuk toko fisik + online. Tidak perlu update manual di setiap marketplace.

### Payment
- QRIS (semua e-wallet)
- Kartu debit/kredit
- Transfer bank
- Cash

### Akuntansi
- Jurnal by Mekari
- Accurate
- Export data standar untuk akuntan

### Hardware Compatible
- Barcode scanner (1D dan 2D)
- Thermal printer (Bluetooth, USB, WiFi)
- Cash drawer (auto-open)
- Label printer (untuk cetak barcode/harga)
- Customer display
- Tablet dan smartphone (Android/iOS)
- PC/laptop (web-based)

---

## 7. Mengapa TiloPOS untuk Retail?

### vs Olsera (Retail-focused)
- Harga lebih murah
- Serial number tracking (Olsera terbatas)
- Auto-reorder point (Olsera tidak punya)
- Multi-warehouse (Olsera terbatas)
- Open API untuk custom integration

### vs Moka POS
- Batch tracking dan serial number (Moka tidak punya)
- Price tier unlimited (Moka terbatas)
- Harga 50% lebih murah
- Unlimited device (Moka charge per device)
- Recipe/BOM untuk retail yang juga produksi (bakery, dll)

### vs iSeller (Omnichannel)
- Harga lebih murah
- Fitur inventori lebih lengkap (waste tracking, auto-reorder)
- Fitur F&B juga tersedia jika bisnis expand (iSeller lemah di F&B)
- Support lebih responsif

### vs Qasir (Free)
- TiloPOS Starter gratis tapi jauh lebih lengkap
- Inventori management (Qasir sangat basic)
- Laporan detail (Qasir hampir tidak ada)
- Scalable: bisa upgrade saat bisnis berkembang (Qasir mentok)

---

## 8. Call to Action untuk Retail

### Coba Sekarang — Tanpa Risiko

1. **Gratis selamanya**: Mulai dengan TiloPOS Starter. Input produk, coba transaksi, rasakan bedanya.
2. **Demo di toko Anda**: Tim kami datang ke toko Anda dengan barcode scanner dan printer. Coba langsung dengan produk Anda sendiri.
3. **Migrasi dari POS lain**: Sudah pakai POS lain? Kami bantu pindahkan semua data produk dan pelanggan — gratis.
4. **Go live dalam 1 hari**: Dari nol sampai beroperasi penuh — 1 hari saja.

### Kontak Tim Sales Retail
- WhatsApp: [nomor tim sales]
- Email: sales@tilopos.com
- Website: www.tilopos.com/retail

---

**TiloPOS — Stok Terkendali, Penjualan Terlacak, Bisnis Tumbuh Pasti.**
