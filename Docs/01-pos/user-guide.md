# Panduan Pengguna: Terminal POS TiloPOS

Panduan lengkap penggunaan modul Terminal POS pada sistem TiloPOS. Dokumen ini ditujukan untuk kasir, supervisor, dan manajer yang mengoperasikan terminal kasir sehari-hari.

---

## Daftar Isi

1. [Memulai (Getting Started)](#1-memulai-getting-started)
2. [Menambah Produk ke Keranjang](#2-menambah-produk-ke-keranjang)
3. [Mengubah Quantity dan Harga](#3-mengubah-quantity-dan-harga)
4. [Menambah Modifier](#4-menambah-modifier)
5. [Menerapkan Diskon](#5-menerapkan-diskon)
6. [Proses Pembayaran](#6-proses-pembayaran)
7. [Cetak Struk](#7-cetak-struk)
8. [Tahan dan Lanjutkan Pesanan (Held Bills)](#8-tahan-dan-lanjutkan-pesanan-held-bills)
9. [Assign Pelanggan dan Meja](#9-assign-pelanggan-dan-meja)
10. [Void dan Refund](#10-void-dan-refund)
11. [Cash In / Cash Out](#11-cash-in--cash-out)
12. [Tutup Shift](#12-tutup-shift)
13. [Keyboard Shortcuts](#13-keyboard-shortcuts)
14. [Mode Offline](#14-mode-offline)
15. [Tips dan FAQ](#15-tips-dan-faq)

---

## 1. Memulai (Getting Started)

### 1.1 Login ke Sistem

1. Buka aplikasi TiloPOS di browser atau perangkat yang telah dikonfigurasi.
2. Masukkan **email** dan **password** yang telah diberikan oleh admin/owner.
3. Klik tombol **Masuk**.
4. Sistem akan mengarahkan kamu ke halaman utama sesuai role (kasir langsung ke terminal POS).

### 1.2 Memulai Shift

Sebelum bisa melakukan transaksi, kamu **wajib memulai shift** terlebih dahulu:

1. Setelah login, sistem akan menampilkan dialog **Mulai Shift**.
2. Hitung uang kas yang ada di laci kasir.
3. Masukkan **jumlah kas awal** (contoh: Rp 500.000).
4. Tambahkan catatan jika perlu (opsional).
5. Klik **Mulai Shift**.
6. Shift aktif akan tercatat dengan waktu mulai dan nama kasir.

**Penting:** Setiap kasir hanya bisa memiliki satu shift aktif dalam satu waktu. Jika shift sebelumnya belum ditutup, kamu harus menutupnya terlebih dahulu.

### 1.3 Overview Tampilan Terminal POS

Terminal POS TiloPOS terbagi menjadi beberapa area utama:

```
+------------------------------------------+-------------------+
|                                          |                   |
|           PRODUCT GRID                   |   CART PANEL      |
|                                          |                   |
|  [Kategori] [Search] [Grid/List Toggle]  |   Item 1    Qty   |
|                                          |   Item 2    Qty   |
|  +------+ +------+ +------+             |   Item 3    Qty   |
|  | Prod | | Prod | | Prod |             |                   |
|  |  1   | |  2   | |  3   |             |   Subtotal        |
|  +------+ +------+ +------+             |   Diskon          |
|  +------+ +------+ +------+             |   Pajak           |
|  | Prod | | Prod | | Prod |             |   TOTAL           |
|  |  4   | |  5   | |  6   |             |                   |
|  +------+ +------+ +------+             |  [Tahan] [Bayar]  |
|                                          |                   |
+------------------------------------------+-------------------+
```

- **Area Kiri — Product Grid:** Menampilkan semua produk yang bisa dijual. Ada filter kategori di bagian atas, kolom pencarian, dan toggle tampilan grid/list.
- **Area Kanan — Cart Panel:** Menampilkan item yang sudah ditambahkan ke keranjang, lengkap dengan kontrol quantity, subtotal, diskon, pajak, dan total.
- **Tombol Aksi:** Di bagian bawah cart panel terdapat tombol utama seperti Tahan Pesanan, Bayar, dan aksi lainnya.
- **Header Bar:** Berisi informasi shift aktif, nama kasir, dan akses cepat ke fitur lain (transaksi hari ini, held bills, dll).

---

## 2. Menambah Produk ke Keranjang

### 2.1 Melalui Product Grid

1. **Pilih Kategori** (opsional): Klik salah satu tab kategori di bagian atas grid untuk memfilter produk. Klik "Semua" untuk menampilkan semua produk.
2. **Klik Produk:** Klik kartu produk yang ingin ditambahkan. Produk langsung masuk ke keranjang dengan quantity 1.
3. **Klik Lagi untuk Tambah:** Jika produk sudah ada di keranjang, klik lagi untuk menambah quantity.

### 2.2 Melalui Pencarian

1. Klik kolom **Search** atau tekan shortcut keyboard (lihat bagian Keyboard Shortcuts).
2. Ketik nama produk atau SKU. Hasil pencarian muncul secara real-time.
3. Klik produk dari hasil pencarian untuk menambahkannya ke keranjang.

### 2.3 Melalui Barcode Scanner

1. Pastikan barcode scanner sudah terhubung ke perangkat.
2. Arahkan scanner ke barcode produk.
3. Produk otomatis teridentifikasi dan masuk ke keranjang.
4. Jika barcode tidak ditemukan, sistem akan menampilkan notifikasi.

### 2.4 Tampilan Grid vs List

- **Grid View:** Tampilan default dengan kartu bergambar. Cocok untuk produk dengan foto.
- **List View:** Tampilan daftar ringkas. Cocok untuk toko dengan banyak produk atau kasir yang sudah hafal produk.
- Klik ikon toggle di toolbar untuk berganti tampilan.

### 2.5 Produk dengan Varian

Beberapa produk memiliki varian (contoh: ukuran S/M/L, warna, rasa):

1. Klik produk yang memiliki varian.
2. Dialog pemilihan varian akan muncul.
3. Pilih varian yang diinginkan.
4. Varian terpilih akan masuk ke keranjang dengan harga sesuai varian.

### 2.6 Bundle Packages

Paket bundle adalah kumpulan produk yang dijual dengan harga khusus:

1. Bundle ditampilkan di product grid dengan label khusus.
2. Klik bundle untuk melihat isi paket.
3. Konfirmasi untuk menambahkan seluruh isi bundle ke keranjang.
4. Harga yang ditampilkan adalah harga paket, bukan total harga satuan.

---

## 3. Mengubah Quantity dan Harga

### 3.1 Mengubah Quantity

**Dari Cart Panel:**
1. Temukan item di keranjang.
2. Klik tombol **+** untuk menambah quantity.
3. Klik tombol **-** untuk mengurangi quantity.
4. Klik angka quantity secara langsung untuk mengetik jumlah spesifik.
5. Jika quantity menjadi 0, item otomatis dihapus dari keranjang.

**Menghapus Item:**
- Klik ikon **hapus** (X) di samping item untuk menghapusnya dari keranjang.
- Atau kurangi quantity sampai 0.

### 3.2 Mengubah Harga (Price Override)

Dalam beberapa situasi, kasir perlu mengubah harga jual (misal: negosiasi harga, harga khusus pelanggan VIP):

1. Klik pada harga item di keranjang.
2. Dialog edit harga akan muncul.
3. Masukkan harga baru.
4. Klik **Simpan**.
5. Item akan menampilkan harga yang sudah diubah dengan indikator visual.

**Catatan:** Fitur edit harga mungkin dibatasi berdasarkan role. Kasir biasa mungkin perlu persetujuan supervisor untuk mengubah harga.

---

## 4. Menambah Modifier

Modifier adalah tambahan atau perubahan pada produk (contoh: extra cheese, less sugar, tanpa es):

1. Klik item di keranjang yang ingin ditambah modifier.
2. Panel detail item akan terbuka atau dialog modifier muncul.
3. Pilih modifier yang tersedia dari daftar.
4. Modifier bisa berupa:
   - **Modifier gratis:** Tidak menambah harga (contoh: tanpa es, less sugar).
   - **Modifier berbayar:** Menambah harga (contoh: extra cheese +Rp 5.000).
5. Modifier yang dipilih akan muncul di bawah nama item di keranjang.
6. Total harga item otomatis di-update jika modifier berbayar.

**Menghapus Modifier:**
- Klik modifier yang sudah ditambahkan untuk menghapusnya, atau buka kembali dialog modifier dan hapus centangnya.

---

## 5. Menerapkan Diskon

### 5.1 Diskon per Item

1. Klik item di keranjang.
2. Klik tombol/ikon **Diskon** pada item tersebut.
3. Dialog diskon muncul dengan dua opsi:
   - **Persentase (%):** Masukkan persentase diskon (contoh: 10%).
   - **Nominal (Rp):** Masukkan jumlah potongan (contoh: Rp 5.000).
4. Preview harga setelah diskon ditampilkan secara real-time.
5. Klik **Terapkan**.
6. Item di keranjang akan menampilkan harga coret (harga asli) dan harga setelah diskon.

### 5.2 Diskon Keseluruhan Transaksi

1. Klik tombol **Diskon** di bagian bawah cart panel (di area subtotal).
2. Pilih tipe diskon: persentase atau nominal.
3. Masukkan nilai diskon.
4. Diskon diterapkan ke seluruh transaksi.
5. Rincian diskon terlihat di summary sebelum total.

### 5.3 Catatan tentang Diskon

- Diskon per item dan diskon transaksi bisa diterapkan bersamaan.
- Perhitungan: diskon item dihitung terlebih dahulu, lalu diskon transaksi dihitung dari subtotal setelah diskon item.
- Beberapa diskon mungkin memerlukan otorisasi supervisor tergantung pengaturan sistem.
- Alasan diskon bisa dicatat untuk keperluan audit.

---

## 6. Proses Pembayaran

### 6.1 Membuka Panel Pembayaran

1. Pastikan keranjang sudah berisi item yang akan dibayar.
2. Klik tombol **Bayar** di bagian bawah cart panel.
3. Panel pembayaran akan terbuka menampilkan total yang harus dibayar dan pilihan metode pembayaran.

### 6.2 Metode Pembayaran yang Tersedia

TiloPOS mendukung 9 metode pembayaran:

| No | Metode | Kategori | Keterangan |
|----|--------|----------|------------|
| 1 | **Tunai (Cash)** | Tunai | Pembayaran uang fisik, sistem hitung kembalian |
| 2 | **QRIS** | Digital | Scan QR universal, berlaku untuk semua e-wallet dan mobile banking |
| 3 | **Kartu Debit** | Kartu | Gesek/tap kartu debit di mesin EDC |
| 4 | **Kartu Kredit** | Kartu | Gesek/tap kartu kredit di mesin EDC |
| 5 | **GoPay** | E-Wallet | Pembayaran via GoPay (Gojek) |
| 6 | **OVO** | E-Wallet | Pembayaran via OVO |
| 7 | **DANA** | E-Wallet | Pembayaran via DANA |
| 8 | **ShopeePay** | E-Wallet | Pembayaran via ShopeePay (Shopee) |
| 9 | **LinkAja** | E-Wallet | Pembayaran via LinkAja |

### 6.3 Pembayaran Tunai

1. Klik metode **Tunai**.
2. Masukkan jumlah uang yang diberikan pelanggan.
3. Sistem otomatis menghitung dan menampilkan **kembalian** secara real-time saat kamu mengetik.
4. Tersedia tombol nominal cepat (Rp 10.000, Rp 20.000, Rp 50.000, Rp 100.000) untuk input lebih cepat.
5. Tombol **Uang Pas** untuk langsung mengisi jumlah sesuai total.
6. Klik **Proses Pembayaran**.

### 6.4 Pembayaran Digital (QRIS, E-Wallet)

1. Klik metode pembayaran digital yang diinginkan.
2. Jika terintegrasi: QR code otomatis ditampilkan di layar untuk pelanggan scan.
3. Jika manual: konfirmasi bahwa pembayaran sudah diterima di aplikasi terkait.
4. Masukkan nomor referensi jika diminta (opsional).
5. Klik **Konfirmasi Pembayaran**.

### 6.5 Pembayaran Kartu (Debit/Kredit)

1. Klik metode **Kartu Debit** atau **Kartu Kredit**.
2. Proses pembayaran di mesin EDC.
3. Masukkan nomor approval/referensi dari mesin EDC.
4. Klik **Konfirmasi Pembayaran**.

### 6.6 Split Payment (Pembayaran Terpisah)

Pelanggan bisa membayar dengan lebih dari satu metode:

1. Di panel pembayaran, klik **Split Payment** atau pilih metode pertama.
2. Masukkan jumlah yang dibayar dengan metode pertama.
3. Sisa yang belum dibayar otomatis ditampilkan.
4. Pilih metode kedua untuk melunasi sisa.
5. Contoh: Total Rp 150.000 — bayar Rp 100.000 tunai + Rp 50.000 QRIS.
6. Klik **Proses Pembayaran** setelah semua sisa terbayar.

### 6.7 Penjualan Kredit (BON)

Untuk pelanggan yang membayar kemudian (utang):

1. Di panel pembayaran, pilih opsi **BON / Kredit**.
2. **Wajib** assign pelanggan terlebih dahulu (lihat bagian Assign Pelanggan).
3. Tambahkan catatan atau tanggal jatuh tempo jika diperlukan.
4. Klik **Simpan sebagai BON**.
5. Transaksi tercatat sebagai piutang dan bisa dilacak di menu Pelanggan.

### 6.8 Preview Kembalian Real-Time

Saat memilih pembayaran tunai, fitur preview kembalian bekerja secara real-time:

- Begitu kamu mulai mengetik jumlah uang yang diterima, kembalian langsung dihitung dan ditampilkan.
- Warna indikator: **merah** jika uang kurang, **hijau** jika uang cukup atau lebih.
- Jumlah kembalian ditampilkan dengan font besar agar mudah dilihat.

---

## 7. Cetak Struk

### 7.1 Preview Struk

Setelah pembayaran berhasil, sistem menampilkan **preview struk** yang berisi:

- Nama dan alamat bisnis
- Tanggal dan waktu transaksi
- Nomor transaksi
- Nama kasir
- Daftar item beserta quantity, harga, modifier, dan diskon
- Subtotal, diskon, pajak, dan total
- Metode pembayaran dan jumlah bayar
- Kembalian (jika tunai)
- Informasi pelanggan (jika di-assign)
- Nomor meja (jika F&B)

### 7.2 Cetak Struk

1. Pada halaman preview struk, klik tombol **Cetak**.
2. Struk dicetak ke printer thermal yang sudah dikonfigurasi.
3. TiloPOS mendukung printer thermal **80mm** yang umum digunakan UMKM.
4. Format struk otomatis disesuaikan dengan lebar kertas.

### 7.3 Opsi Tambahan

- **Cetak Ulang:** Bisa cetak ulang struk dari riwayat transaksi.
- **Kirim Digital:** Kirim struk via email atau WhatsApp ke pelanggan (jika fitur aktif).
- **Skip Cetak:** Klik **Selesai** tanpa cetak jika pelanggan tidak butuh struk.

---

## 8. Tahan dan Lanjutkan Pesanan (Held Bills)

### 8.1 Menahan Pesanan

Fitur ini berguna saat pelanggan masih memilih, atau kamu perlu melayani pelanggan lain terlebih dahulu:

1. Pastikan ada item di keranjang.
2. Klik tombol **Tahan Pesanan** di bagian bawah cart panel.
3. Beri nama/label untuk pesanan ini (opsional, contoh: "Meja 5" atau "Ibu Baju Merah").
4. Klik **Simpan**.
5. Keranjang akan dikosongkan dan siap untuk transaksi baru.

### 8.2 Melihat Daftar Pesanan Tertahan

1. Klik ikon **Held Bills** di header bar. Badge angka menunjukkan jumlah pesanan tertahan.
2. Daftar semua pesanan tertahan ditampilkan dengan informasi: label, jumlah item, total, dan waktu ditahan.

### 8.3 Melanjutkan Pesanan Tertahan

1. Buka daftar held bills.
2. Klik pesanan yang ingin dilanjutkan.
3. Item dari pesanan tersebut akan dimuat kembali ke keranjang.
4. Lanjutkan proses seperti biasa (tambah item, bayar, dll).

### 8.4 Menghapus Pesanan Tertahan

1. Buka daftar held bills.
2. Klik ikon **hapus** pada pesanan yang ingin dihapus.
3. Konfirmasi penghapusan. Item di pesanan tersebut tidak akan diproses.

**Catatan:** Pesanan yang ditahan tidak hilang saat shift berganti, namun sebaiknya diselesaikan dalam shift yang sama untuk menjaga akurasi laporan.

---

## 9. Assign Pelanggan dan Meja

### 9.1 Assign Pelanggan ke Transaksi

1. Di cart panel, klik tombol **Pelanggan** atau ikon orang.
2. Dialog pemilihan pelanggan muncul.
3. Cari pelanggan berdasarkan nama, nomor telepon, atau email.
4. Klik pelanggan yang ditemukan untuk meng-assign-nya ke transaksi.
5. Nama pelanggan muncul di cart panel.
6. Jika pelanggan baru, klik **Tambah Pelanggan Baru** dan isi data minimal (nama dan nomor telepon).

**Manfaat assign pelanggan:**
- Transaksi tercatat di riwayat pelanggan.
- Bisa digunakan untuk program loyalitas.
- Wajib untuk penjualan kredit (BON).
- Data untuk analisis perilaku pelanggan.

### 9.2 Assign Meja (Khusus F&B)

1. Di cart panel, klik tombol **Meja** atau ikon meja.
2. Layout meja ditampilkan secara visual.
3. Meja dengan warna **hijau** berarti kosong/tersedia.
4. Meja dengan warna **merah/oranye** berarti sudah terisi.
5. Klik meja yang tersedia untuk meng-assign transaksi ke meja tersebut.
6. Nomor meja muncul di cart panel dan akan tercetak di struk.

### 9.3 Tipe Pesanan

Setiap transaksi bisa diatur tipe pesanannya:

- **Dine-in:** Makan di tempat. Biasanya di-assign ke meja.
- **Takeaway:** Bawa pulang. Tidak perlu assign meja.
- **Delivery:** Pengiriman. Perlu data alamat pengiriman.

Klik tombol tipe pesanan di cart panel untuk memilih. Default bisa diatur di pengaturan.

---

## 10. Void dan Refund

### 10.1 Void Item (Sebelum Pembayaran)

Menghapus item dari keranjang sebelum transaksi selesai:

1. Klik ikon **hapus** (X) di samping item di keranjang.
2. Item langsung terhapus. Tidak perlu konfirmasi untuk void sebelum bayar.

### 10.2 Void Transaksi (Setelah Pembayaran)

Membatalkan transaksi yang sudah selesai:

1. Buka **Transaksi Hari Ini** dari header bar.
2. Temukan transaksi yang ingin di-void.
3. Klik transaksi tersebut untuk melihat detail.
4. Klik tombol **Void**.
5. Masukkan **alasan void** (wajib).
6. Mungkin memerlukan **otorisasi supervisor** (masukkan PIN supervisor).
7. Konfirmasi void.
8. Transaksi akan ditandai sebagai void dan stok dikembalikan.

### 10.3 Refund (Pengembalian Dana)

Untuk mengembalikan uang pelanggan atas transaksi sebelumnya:

1. Buka **Transaksi Hari Ini** atau cari transaksi di riwayat.
2. Klik transaksi yang ingin di-refund.
3. Klik tombol **Refund**.
4. Pilih item yang ingin di-refund (bisa partial — hanya beberapa item).
5. Masukkan quantity yang di-refund.
6. Pilih metode refund (tunai atau metode asal).
7. Masukkan alasan refund.
8. Mungkin memerlukan otorisasi supervisor.
9. Konfirmasi refund.
10. Struk refund bisa dicetak.

---

## 11. Cash In / Cash Out

Fitur untuk mencatat uang masuk atau keluar dari laci kasir yang bukan dari transaksi penjualan.

### 11.1 Cash In (Uang Masuk)

Contoh: menerima uang kembalian dari pembelian, setoran tambahan kas.

1. Klik menu **Cash In/Out** di header atau sidebar.
2. Pilih **Cash In**.
3. Masukkan jumlah uang.
4. Masukkan keterangan/alasan (contoh: "Setoran kas tambahan dari owner").
5. Klik **Simpan**.
6. Saldo kas di shift bertambah.

### 11.2 Cash Out (Uang Keluar)

Contoh: beli gas untuk kompor, bayar parkir, keperluan operasional mendadak.

1. Klik menu **Cash In/Out**.
2. Pilih **Cash Out**.
3. Masukkan jumlah uang.
4. Masukkan keterangan/alasan (contoh: "Beli gas 3kg untuk dapur").
5. Klik **Simpan**.
6. Saldo kas di shift berkurang.

**Penting:** Semua cash in/out tercatat di laporan shift dan bisa di-audit oleh manager/owner.

---

## 12. Tutup Shift

### 12.1 Proses Tutup Shift

1. Pastikan semua transaksi sudah selesai dan tidak ada held bills yang tertinggal.
2. Klik **Tutup Shift** di header bar atau menu.
3. Sistem menampilkan **ringkasan shift:**
   - Total penjualan
   - Jumlah transaksi
   - Breakdown per metode pembayaran
   - Cash in/out
   - Expected cash (kas yang seharusnya ada di laci)
4. **Hitung uang fisik** di laci kasir.
5. Masukkan **jumlah kas aktual** (hasil hitung fisik).
6. Sistem otomatis menghitung **selisih** (aktual vs expected):
   - **Selisih 0:** Sempurna, tidak ada kekurangan/kelebihan.
   - **Selisih positif:** Kas lebih dari yang seharusnya.
   - **Selisih negatif:** Kas kurang dari yang seharusnya.
7. Tambahkan catatan jika ada selisih (wajib jika selisih signifikan).
8. Klik **Tutup Shift**.
9. Shift ditutup dan kasir bisa logout atau memulai shift baru.

### 12.2 Tips Tutup Shift

- Selalu hitung uang fisik dengan teliti sebelum input.
- Cocokkan jumlah struk pembayaran digital dengan laporan di aplikasi e-wallet/EDC.
- Jika ada selisih, catat kemungkinan penyebabnya.
- Laporan shift bisa dicetak untuk arsip fisik.

---

## 13. Keyboard Shortcuts

TiloPOS menyediakan keyboard shortcuts untuk mempercepat operasional kasir. Berikut daftar shortcuts yang tersedia:

### Navigasi & Umum

| Shortcut | Fungsi |
|----------|--------|
| `F1` | Buka bantuan/panduan |
| `F2` | Fokus ke kolom pencarian produk |
| `F5` | Refresh tampilan |
| `F9` | Buka daftar held bills |
| `F10` | Transaksi hari ini |
| `F11` | Toggle fullscreen |
| `Esc` | Tutup dialog/modal yang terbuka |

### Keranjang & Produk

| Shortcut | Fungsi |
|----------|--------|
| `F2` | Cari produk |
| `F3` | Buka daftar pelanggan |
| `F4` | Buka pilihan meja |
| `Delete` | Hapus item yang dipilih di keranjang |
| `+` | Tambah quantity item terpilih |
| `-` | Kurangi quantity item terpilih |

### Pembayaran & Transaksi

| Shortcut | Fungsi |
|----------|--------|
| `F8` | Tahan pesanan (hold bill) |
| `F12` atau `Enter` | Buka panel pembayaran / proses bayar |
| `Ctrl + P` | Cetak struk |
| `Ctrl + D` | Buka dialog diskon |

### Tips Penggunaan Shortcuts

- Shortcuts sangat berguna saat jam sibuk (rush hour) untuk mempercepat transaksi.
- Kasir baru disarankan menghafal shortcuts secara bertahap, mulai dari yang paling sering digunakan: `F2` (cari), `F12` (bayar), dan `F8` (tahan).
- Shortcuts bisa disesuaikan oleh admin di menu pengaturan (jika fitur tersedia).

---

## 14. Mode Offline

### 14.1 Bagaimana Mode Offline Bekerja

TiloPOS dirancang untuk tetap beroperasi saat koneksi internet terputus:

1. **Deteksi Otomatis:** Sistem otomatis mendeteksi saat koneksi internet putus.
2. **Indikator Visual:** Ikon atau banner berwarna di header bar menunjukkan status koneksi:
   - **Hijau:** Online, semua tersinkron.
   - **Kuning:** Koneksi tidak stabil.
   - **Merah:** Offline, mode offline aktif.
3. **Transaksi Tetap Jalan:** Kamu tetap bisa melakukan semua transaksi seperti biasa.
4. **Penyimpanan Lokal:** Semua data transaksi tersimpan di perangkat secara lokal.

### 14.2 Auto-Sync Saat Online Kembali

1. Begitu koneksi internet kembali, sistem otomatis melakukan sinkronisasi.
2. Semua transaksi yang dilakukan offline dikirim ke server.
3. Data terbaru dari server (perubahan harga, produk baru, dll) diunduh ke perangkat.
4. Proses sync ditampilkan dengan progress indicator.
5. Setelah sync selesai, indikator kembali hijau.

### 14.3 Batasan Mode Offline

Beberapa fitur mungkin terbatas saat offline:

- **Pembayaran digital** (QRIS, e-wallet): Mungkin tidak bisa diproses karena butuh koneksi ke payment gateway. Transaksi bisa dicatat manual dan diverifikasi saat online.
- **Data pelanggan baru:** Pelanggan baru yang ditambahkan offline akan disinkron saat online.
- **Laporan real-time:** Laporan yang memerlukan data dari server tidak tersedia sampai online kembali.
- **Update produk/harga:** Perubahan produk atau harga dari admin baru efektif setelah sync.

### 14.4 Best Practice Mode Offline

- Pastikan perangkat terisi daya penuh jika mengantisipasi mati listrik (yang biasanya menyebabkan internet putus).
- Lakukan sync manual (jika tersedia) sebelum sengaja offline.
- Hindari menutup browser/aplikasi saat ada transaksi offline yang belum tersinkron.
- Periksa status sync secara berkala.

---

## 15. Tips dan FAQ

### Tips untuk Kasir

1. **Hafal keyboard shortcuts** — Kecepatan transaksi bisa meningkat 2-3x lipat.
2. **Gunakan kategori** — Jangan selalu search, manfaatkan filter kategori untuk navigasi lebih cepat.
3. **Cek keranjang sebelum bayar** — Pastikan item, quantity, dan harga sudah benar sebelum proses pembayaran.
4. **Hitung kas teliti** — Saat buka dan tutup shift, hitung uang dengan teliti untuk menghindari selisih.
5. **Tahan pesanan jika ragu** — Lebih baik tahan dulu daripada batal setelah bayar.
6. **Perhatikan indikator online/offline** — Ketahui status koneksi supaya bisa antisipasi.
7. **Assign pelanggan untuk pembelian besar** — Berguna untuk tracking dan membangun loyalitas.
8. **Cetak struk untuk pembayaran tunai** — Sebagai bukti transaksi yang valid.
9. **Laporkan masalah segera** — Jika menemukan error atau kejanggalan, segera laporkan ke supervisor.
10. **Logout saat meninggalkan kasir** — Untuk keamanan, selalu logout atau kunci layar saat meninggalkan pos kasir.

### FAQ (Pertanyaan yang Sering Diajukan)

**Q: Bagaimana jika listrik mati saat sedang transaksi?**
A: Jika transaksi belum selesai, data di keranjang mungkin hilang. Namun transaksi yang sudah diproses (sudah bayar) aman tersimpan. Gunakan UPS (Uninterruptible Power Supply) untuk mencegah ini.

**Q: Bisa tidak batalkan transaksi yang sudah selesai?**
A: Bisa, gunakan fitur Void. Namun biasanya memerlukan otorisasi supervisor. Lihat bagian Void dan Refund.

**Q: Kenapa saya tidak bisa melakukan transaksi?**
A: Pastikan shift sudah dimulai. Jika belum, mulai shift terlebih dahulu. Periksa juga apakah koneksi internet bermasalah dan apakah akun kamu memiliki izin kasir.

**Q: Bagaimana cara menambah produk baru?**
A: Penambahan produk dilakukan di modul Produk oleh admin/manager, bukan di terminal POS. Hubungi admin untuk menambahkan produk.

**Q: Bisa cetak ulang struk?**
A: Bisa. Buka Transaksi Hari Ini, cari transaksi yang diinginkan, dan klik Cetak Ulang.

**Q: Apa yang terjadi jika saya lupa tutup shift?**
A: Shift yang tidak ditutup akan tercatat sebagai anomali. Supervisor atau manager bisa menutup shift secara paksa dari dashboard. Selalu tutup shift sebelum selesai bertugas.

**Q: Bagaimana jika barcode produk tidak terbaca?**
A: Coba bersihkan barcode pada produk. Jika tetap tidak terbaca, cari produk secara manual menggunakan pencarian nama atau SKU. Laporkan ke admin jika barcode produk perlu diperbarui.

**Q: Apakah bisa melayani dua pelanggan sekaligus?**
A: Ya, gunakan fitur Held Bills. Tahan pesanan pelanggan pertama, layani pelanggan kedua, lalu lanjutkan pesanan pertama setelah selesai.

**Q: Bagaimana cara split payment (bayar dengan 2 metode)?**
A: Di panel pembayaran, pilih Split Payment. Masukkan jumlah untuk metode pertama, lalu pilih metode kedua untuk sisa pembayaran. Lihat bagian Split Payment untuk detail lengkap.

**Q: Transaksi offline apakah aman? Tidak hilang?**
A: Data transaksi offline tersimpan di perangkat lokal dan aman selama kamu tidak menghapus cache browser atau menutup aplikasi secara paksa. Data akan otomatis dikirim ke server begitu koneksi kembali.

---

*Dokumen ini adalah panduan pengguna resmi modul Terminal POS TiloPOS. Untuk bantuan lebih lanjut, hubungi tim support TiloPOS.*
