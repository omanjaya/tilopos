# Laporan TiloPOS — Data Lengkap untuk Keputusan Tepat

## Dari Spreadsheet Manual ke Real-Time Business Intelligence

Setiap hari, bisnis UMKM menghasilkan ratusan bahkan ribuan data transaksi. Tanpa sistem yang tepat, data ini hanya menjadi angka-angka mati di buku catatan atau spreadsheet Excel. Pemilik bisnis menghabiskan berjam-jam setiap minggu hanya untuk merekap penjualan, menghitung laba kotor, atau mencari tahu produk mana yang paling laris.

TiloPOS mengubah semua itu. Setiap transaksi yang diproses melalui kasir langsung menjadi data analitik yang bisa diakses kapan saja. Tidak perlu lagi input manual, tidak perlu lagi rumus Excel yang rumit, tidak perlu lagi menunggu akhir bulan untuk tahu kondisi bisnis.

---

## Laporan yang Tersedia

### 1. Laporan Penjualan

Laporan inti yang menampilkan performa penjualan secara menyeluruh.

**Data yang ditampilkan:**
- **Total Penjualan** — akumulasi seluruh transaksi selesai dalam periode yang dipilih
- **Jumlah Transaksi** — berapa kali kasir memproses pembayaran
- **Rata-rata Order (AOV)** — nilai rata-rata per transaksi, indikator penting untuk strategi upselling
- **Jumlah Pelanggan** — pelanggan unik yang bertransaksi
- **Grafik Penjualan Harian** — visualisasi bar chart penjualan per hari untuk melihat tren naik/turun

**Laporan Penjualan Detail** memiliki 8 sub-bagian yang bisa diakses melalui sidebar navigasi:
- **Ringkasan** — overview penjualan keseluruhan
- **Laba Kotor** — pendapatan dikurangi HPP per item
- **Pembayaran** — breakdown berdasarkan metode pembayaran
- **Item** — penjualan per item produk
- **Kategori** — penjualan per kategori produk
- **Diskon** — total diskon yang diberikan dan dampaknya
- **Pajak** — PPN dan pajak lain yang terkumpul
- **Kasir** — penjualan per kasir/karyawan yang memproses

**Insight yang didapat:**
- Hari apa yang paling ramai? Apakah Sabtu atau Minggu?
- Jam berapa puncak penjualan? Apakah perlu tambah shift di jam tersebut?
- Apakah strategi upselling berhasil? Lihat tren AOV dari bulan ke bulan
- Kasir mana yang paling produktif?

### 2. Laporan Produk

Analitik di level item untuk memahami performa setiap produk.

**Data yang ditampilkan:**
- **Total Produk Terjual** — jumlah jenis produk yang berbeda yang laku
- **Grafik Top 10 Produk** — horizontal bar chart produk dengan pendapatan tertinggi
- **Tabel Detail Produk** — nama produk, kategori, quantity terjual, dan pendapatan per produk

**Insight yang didapat:**
- Produk mana yang jadi best seller? Pastikan stoknya selalu tersedia
- Produk mana yang slow mover? Pertimbangkan untuk promo atau discontinue
- Kategori mana yang paling menguntungkan?
- Apakah ada produk baru yang performanya bagus?

### 3. Laporan Keuangan

Laporan profit & loss sederhana yang langsung bisa dipahami pemilik bisnis tanpa background akuntansi.

**Data yang ditampilkan:**
- **Pendapatan** — Total Penjualan dikurangi Refund
- **HPP (Harga Pokok Penjualan)** — total cost price dari semua item yang terjual
- **Laba Kotor** — Pendapatan dikurangi HPP
- **Margin Laba Kotor** — persentase keuntungan dari setiap rupiah penjualan

**Formula yang transparan:**
Setiap metrik dilengkapi tooltip "Calculation Help" yang menjelaskan rumus perhitungannya. Pengguna bisa klik ikon bantuan di samping setiap angka untuk memahami bagaimana angka tersebut dihitung.

**Insight yang didapat:**
- Apakah margin laba sudah sehat? (Benchmark F&B: 60-70%, Retail: 25-50%)
- Apakah HPP terlalu tinggi? Perlu negosiasi dengan supplier?
- Bagaimana tren laba kotor bulan ini vs bulan lalu?

### 4. Laporan Pembayaran

Breakdown lengkap berdasarkan metode pembayaran yang digunakan pelanggan.

**Data yang ditampilkan:**
- **Total Pembayaran** — akumulasi dari semua metode
- **Pie Chart Distribusi** — visualisasi proporsi setiap metode pembayaran
- **Tabel Detail** — metode, jumlah transaksi, total nominal, dan persentase

**Metode pembayaran yang didukung:** Tunai, QRIS, Kartu Debit, Kartu Kredit, GoPay, OVO, DANA, ShopeePay, LinkAja

**Insight yang didapat:**
- Berapa persen pelanggan yang sudah cashless?
- Apakah perlu tambah opsi pembayaran digital?
- Metode mana yang paling sering digunakan?

### 5. Laporan Inventaris (Retail & Bisnis dengan Stok)

Tersedia otomatis untuk bisnis retail atau bisnis yang mengaktifkan fitur manajemen stok.

**Data yang ditampilkan:**
- **Total Produk** — jumlah produk terdaftar
- **Nilai Stok** — total valuasi inventaris dalam Rupiah
- **Stok Rendah** — produk yang perlu segera di-restock (highlight kuning)
- **Stok Habis** — produk yang sudah tidak tersedia (highlight merah)
- **Produk Terlaris** — ranking berdasarkan jumlah pergerakan stok
- **Produk Lambat Terjual** — produk yang sudah sekian hari tidak terjual

**Insight yang didapat:**
- Berapa modal yang tertanam di stok?
- Produk mana yang perlu segera dipesan ke supplier?
- Produk mana yang dead stock dan mengikat modal?

### 6. Laporan Dapur (F&B dengan KDS)

Tersedia untuk bisnis F&B yang mengaktifkan Kitchen Display System.

**Data yang ditampilkan:**
- **Total Pesanan Dapur** — jumlah pesanan yang masuk ke dapur
- **Rata-rata Waktu Persiapan** vs Target — apakah dapur memenuhi standar
- **Persentase Tepat Waktu** — dengan progress bar dan indikator warna (hijau >= 85%, kuning < 85%)
- **Tingkat Penyelesaian** — berapa persen pesanan yang selesai vs dibatalkan
- **Jam Sibuk** — ranking jam dengan jumlah pesanan tertinggi
- **Menu Terpopuler** — menu yang paling sering dipesan beserta rata-rata waktu persiapan
- **Menu Lambat** — menu yang membutuhkan waktu persiapan lama (alert kuning)

**Insight yang didapat:**
- Apakah dapur perlu tambah personel di jam-jam sibuk?
- Menu mana yang memperlambat operasional? Perlu disederhanakan resepnya?
- Apakah target waktu persiapan realistis?

### 7. Laporan Meja (F&B dengan Manajemen Meja)

Tersedia untuk restoran dan bisnis F&B yang mengaktifkan fitur manajemen meja.

**Data yang ditampilkan:**
- **Total Meja** — jumlah meja yang tersedia
- **Rata-rata Okupansi** — persentase pemakaian meja dengan progress bar
- **Durasi Makan** — rata-rata waktu pelanggan di meja
- **Table Turnover** — berapa kali setiap meja digunakan per hari
- **Performa per Meja** — ranking meja berdasarkan revenue, turnover, dan waktu rata-rata
- **Jam Ramai** — waktu dengan okupansi tertinggi
- **Statistik Tamu** — total tamu, rata-rata per meja, dan tamu per hari per meja

**Insight yang didapat:**
- Meja mana yang paling produktif menghasilkan revenue?
- Apakah perlu menambah meja di area tertentu?
- Kapan jam puncak sehingga perlu siapkan waiting list?

### 8. Laporan Staff (Bisnis Layanan dengan Komisi)

Tersedia untuk bisnis layanan (salon, bengkel) yang mengaktifkan fitur komisi staff.

**Data yang ditampilkan:**
- **Total Staff Aktif** — karyawan yang beroperasi
- **Total Layanan** — jumlah layanan yang diselesaikan
- **Rating Rata-rata** — dari feedback pelanggan
- **Waktu Layanan Rata-rata** — efisiensi operasional
- **Leaderboard Staff** — ranking berdasarkan revenue, jumlah layanan, rating, dan komisi yang didapat
- **Breakdown Layanan** — jenis layanan, frekuensi, dan rata-rata waktu pengerjaan

**Insight yang didapat:**
- Staff mana yang paling produktif dan berkualitas?
- Layanan mana yang paling diminati pelanggan?
- Berapa total komisi yang harus dibayarkan bulan ini?

### 9. Laporan Reservasi (Bisnis Layanan dengan Appointment)

Tersedia untuk bisnis layanan yang mengaktifkan fitur appointment/reservasi.

**Data yang ditampilkan:**
- **Total Booking** — reservasi yang diterima
- **Booking Selesai** — dengan persentase dan progress bar
- **Batal / No Show** — breakdown antara pembatalan dan pelanggan yang tidak datang
- **Rata-rata Nilai per Booking** — dalam Rupiah
- **Booking per Hari** — distribusi reservasi di setiap hari dalam seminggu
- **Sumber Booking** — dari mana pelanggan melakukan reservasi (walk-in, online, telepon)
- **Layanan Populer** — ranking layanan berdasarkan jumlah booking

**Insight yang didapat:**
- Berapa tingkat no-show? Perlu kebijakan deposit?
- Hari apa yang paling banyak booking? Siapkan staff lebih banyak
- Dari channel mana pelanggan paling banyak booking?

---

## Fitur Pendukung Laporan

### Riwayat Transaksi

Halaman khusus untuk menelusuri seluruh transaksi dengan detail lengkap.

**Fitur utama:**
- **4 tab view**: Semua Transaksi, Pesanan Sukses, Pesanan Batal, Item Void
- **Filter multi-outlet** — pilih outlet tertentu atau lihat semua
- **Filter tanggal** — pilih tanggal spesifik
- **Search** — cari berdasarkan nomor receipt atau nama item
- **Summary cards** — ringkasan jumlah transaksi, total terkumpul, penjualan bersih
- **Aksi per transaksi**: Lihat Detail, Void, Refund, Cetak Ulang Struk
- **Export** — download data ke PDF atau Excel

### Penyelesaian (Settlements)

Rekonsiliasi pembayaran dan setoran bank.

**Fitur utama:**
- **3 metrik utama**: Total Diselesaikan, Menunggu Penyelesaian, Dipersengketakan
- **Filter status**: Tertunda, Selesai, Dipersengketakan
- **Filter rentang tanggal**
- **Detail per settlement**: breakdown per metode pembayaran, jumlah transaksi, tunai vs non-tunai
- **Konfirmasi penyelesaian**: tombol untuk menyelesaikan settlement yang pending

### Invoice (Faktur B2B)

Manajemen faktur untuk transaksi business-to-business.

**3 tab view:**
- **Invoice** — daftar faktur dengan status
- **Transaksi** — transaksi terkait faktur
- **Detail Item** — rincian item per faktur
- **Invoice Detail Modal** — preview dan detail lengkap per invoice

### Jadwal Laporan Otomatis

Pengaturan di menu Settings untuk mengirim laporan secara otomatis via email.

**Akses:** Settings > Jadwal Laporan (hanya Owner dan Super Admin)

### Export Data

Semua laporan mendukung export ke format:
- **PDF** — laporan berformat rapi dengan header bisnis, periode, dan summary
- **Excel** — data tabular yang bisa diolah lebih lanjut

---

## ROI: Dampak Nyata untuk Bisnis

### 1. Identifikasi Produk Laris — Maximize Revenue

Tanpa data, pemilik bisnis menebak-nebak produk mana yang paling laris. Dengan TiloPOS, Top 10 produk berdasarkan pendapatan langsung terlihat. Stok produk laris bisa diprioritaskan, dan bundling bisa dirancang berdasarkan data, bukan intuisi.

**Contoh:** Kafe menemukan bahwa Es Kopi Susu menyumbang 35% total revenue. Mereka membuat paket bundle Es Kopi Susu + Croissant yang meningkatkan AOV sebesar 20%.

### 2. Optimize Pricing — Protect Margin

Laporan keuangan menampilkan HPP dan margin laba kotor secara real-time. Jika margin turun, pemilik bisnis bisa segera evaluasi — apakah harga bahan baku naik? Apakah ada diskon berlebihan?

**Contoh:** Restoran melihat margin turun dari 65% ke 58% dalam sebulan. Setelah cek, ternyata harga ayam dari supplier naik 15%. Mereka negosiasi dengan supplier alternatif dan sesuaikan porsi, mengembalikan margin ke 63%.

### 3. Reduce Waste — Cut Losses

Laporan inventaris menampilkan produk slow mover dan dead stock. Produk yang sudah berminggu-minggu tidak terjual bisa segera dipromo untuk mengurangi kerugian.

**Contoh:** Toko retail menemukan 23 produk yang tidak terjual selama 30+ hari. Mereka buat clearance sale dan berhasil memutar Rp 15 juta modal yang sebelumnya tertanam di stok mati.

### 4. Optimize Staffing — Reduce Labor Cost

Laporan jam sibuk dari Kitchen Report dan Table Report menunjukkan kapan perlu tenaga ekstra dan kapan bisa dikurangi.

**Contoh:** Restoran melihat 70% pesanan dapur terjadi antara jam 11:30-13:30. Mereka menambah 1 cook khusus untuk jam makan siang dan mengurangi 1 cook di shift sore yang sepi, menghemat biaya tenaga kerja tanpa mengorbankan kecepatan layanan.

### 5. Staff Accountability — Improve Performance

Laporan per kasir dan per staff menunjukkan siapa yang paling produktif. Data ini bisa jadi dasar evaluasi kinerja, bonus, atau pelatihan.

**Contoh:** Salon melihat stylist A menangani 45 klien/bulan dengan rating 4.8, sedangkan stylist B hanya 28 klien dengan rating 4.2. Manager memberikan coaching khusus untuk stylist B dan menawarkan insentif berdasarkan jumlah klien.

---

## Use Cases: Siapa yang Butuh Laporan Apa?

### Owner / Pemilik Bisnis

**Kebutuhan:** Mau lihat performa harian tanpa harus ada di toko.

**Solusi TiloPOS:**
- Buka halaman Laporan dari HP (versi mobile tersedia)
- Pilih "Hari Ini" untuk ringkasan real-time
- Cek total penjualan, jumlah transaksi, dan rata-rata order
- Bandingkan dengan minggu atau bulan sebelumnya
- Terima laporan otomatis via email setiap malam

**Waktu yang dihemat:** 30-60 menit per hari yang sebelumnya digunakan untuk merekap manual.

### Manager / Supervisor

**Kebutuhan:** Evaluasi operasional harian dan performa tim.

**Solusi TiloPOS:**
- Cek Laporan Staff untuk evaluasi kinerja karyawan
- Cek Laporan Dapur untuk memastikan waktu persiapan sesuai standar
- Cek Laporan Meja untuk optimasi layout restoran
- Review transaksi void dan refund — apakah ada yang mencurigakan?

**Waktu yang dihemat:** 1-2 jam per minggu yang sebelumnya digunakan untuk kompilasi data dari berbagai sumber.

### Akuntan / Finance

**Kebutuhan:** Laporan bulanan untuk pembukuan, pelaporan pajak, dan audit.

**Solusi TiloPOS:**
- Export Laporan Keuangan ke Excel untuk dimasukkan ke software akuntansi
- Laporan Pembayaran untuk rekonsiliasi bank
- Laporan Pajak (dari sub-bagian Pajak di Laporan Penjualan Detail)
- Data Settlement untuk audit trail pembayaran
- Laporan Invoice untuk tracking piutang B2B

**Waktu yang dihemat:** 4-8 jam per bulan yang sebelumnya digunakan untuk merekap dari buku catatan atau beberapa spreadsheet.

### Kasir / Staff Operasional

**Kebutuhan:** Lihat performa pribadi dan ringkasan shift.

**Solusi TiloPOS:**
- Tab "Kasir" di Laporan Penjualan Detail menampilkan penjualan per kasir
- Halaman Transaksi untuk cek riwayat transaksi shift ini
- Cetak ulang struk jika pelanggan meminta

---

## Financial Reporting untuk Pajak dan Compliance

### Laporan Pajak

Sub-bagian "Pajak" di Laporan Penjualan Detail menampilkan akumulasi PPN dan pajak lain yang terkumpul dari transaksi. Data ini bisa langsung digunakan untuk pelaporan SPT.

### Audit Trail

Setiap transaksi tercatat lengkap: siapa yang memproses, kapan, metode pembayaran, item apa saja, diskon yang diberikan, dan jika ada void/refund — siapa yang melakukan dan alasannya. Ini memenuhi kebutuhan audit internal maupun eksternal.

### Rekonsiliasi Pembayaran

Halaman Settlements memastikan uang yang masuk dari transaksi sesuai dengan yang diterima di bank. Selisih bisa langsung terdeteksi dan dipersengketakan.

### Export untuk Akuntan

Semua laporan bisa di-export ke Excel dengan format yang rapi, lengkap dengan header bisnis, periode laporan, dan summary. File ini langsung bisa digunakan sebagai lampiran pembukuan.

---

## Perbandingan: Sebelum vs Sesudah TiloPOS

| Aspek | Sebelum (Manual) | Sesudah (TiloPOS) |
|-------|-------------------|---------------------|
| Rekap penjualan harian | 30-60 menit manual | Otomatis, real-time |
| Tahu produk terlaris | Perkiraan / feeling | Data akurat, Top 10 chart |
| Hitung laba kotor | Akhir bulan, sering salah | Real-time, formula transparan |
| Rekonsiliasi pembayaran | Cocokkan manual ke bank | Otomatis, Settlement page |
| Evaluasi karyawan | Subjektif | Berbasis data performance |
| Laporan ke investor/bank | Buat manual dari nol | Export PDF/Excel, siap pakai |
| Identifikasi jam sibuk | Berdasarkan pengalaman | Data aktual per jam |
| Deteksi kebocoran (void) | Sering tidak terdeteksi | Tercatat lengkap dengan alasan |

---

## Ketersediaan Laporan per Tipe Bisnis

| Laporan | F&B | Retail | Layanan | Wholesale |
|---------|-----|--------|---------|-----------|
| Penjualan | Ya | Ya | Ya | Ya |
| Produk | Ya | Ya | Ya | Ya |
| Keuangan | Ya | Ya | Ya | Ya |
| Pembayaran | Ya | Ya | Ya | Ya |
| Inventaris | - | Ya | - | Ya |
| Dapur (KDS) | Ya | - | - | - |
| Meja | Ya* | - | - | - |
| Staff | - | - | Ya | - |
| Reservasi | - | - | Ya | - |

*Hanya untuk restoran dengan manajemen meja aktif.

Laporan muncul secara otomatis berdasarkan tipe bisnis dan fitur yang diaktifkan. Tidak perlu konfigurasi manual — sistem mengenali tipe bisnis dan menampilkan tab laporan yang relevan.

---

## Filter dan Periode yang Fleksibel

Semua laporan mendukung 5 opsi periode:
1. **Hari Ini** — untuk monitoring real-time
2. **Minggu Ini** — untuk evaluasi mingguan
3. **Bulan Ini** — untuk review bulanan
4. **Tahun Ini** — untuk tren tahunan
5. **Custom** — pilih rentang tanggal bebas dengan date range picker

Pada versi mobile, pemilihan periode menggunakan bottom sheet yang ramah jari, bukan dropdown kecil yang sulit dipilih.
