# Panduan Pengguna: Modul Produk TiloPOS

Panduan lengkap untuk mengelola produk di TiloPOS. Mencakup seluruh fitur dari pembuatan produk dasar hingga fitur lanjutan seperti ingredient tracking dan bulk import.

---

## Daftar Isi

1. [Membuat Produk Baru](#1-membuat-produk-baru)
2. [Upload Gambar Produk](#2-upload-gambar-produk)
3. [Mengatur Kategori](#3-mengatur-kategori)
4. [Menambah Varian](#4-menambah-varian-ukuran-warna-dll)
5. [Mengatur Modifier Groups](#5-mengatur-modifier-groups)
6. [Membuat Bundle Package](#6-membuat-bundle-package)
7. [Setting Harga dan Biaya](#7-setting-harga-dan-biaya-cost-price)
8. [Barcode: Generate dan Print](#8-barcode-generate--print)
9. [Bulk Import Produk](#9-bulk-import-produk)
10. [Mengelola Bahan Baku dan Resep](#10-mengelola-bahan-baku--resep)
11. [Assign Produk ke Outlet](#11-assign-produk-ke-outlet)
12. [Tips Pengelolaan Produk](#12-tips-pengelolaan-produk)
13. [FAQ](#13-faq)

---

## 1. Membuat Produk Baru

### Melalui Form Lengkap

1. Buka menu **Produk** dari sidebar navigasi (atau akses `/app/products`).
2. Klik tombol **+ Tambah Produk** di pojok kanan atas halaman daftar produk.
3. Isi informasi dasar produk:
   - **Nama Produk** (wajib): Nama yang akan tampil di POS dan struk. Gunakan nama yang jelas dan mudah dicari. Contoh: "Nasi Goreng Spesial", "Kaos Polos Hitam".
   - **Deskripsi** (opsional): Keterangan tambahan tentang produk. Berguna jika produk dijual secara online.
   - **SKU** (opsional): Stock Keeping Unit, kode unik untuk identifikasi produk. Jika dikosongkan, sistem akan generate otomatis.
   - **Kategori** (wajib): Pilih kategori yang sudah ada atau buat kategori baru langsung dari dropdown.
   - **Harga Jual** (wajib): Harga dasar produk yang akan tampil di POS.
   - **Harga Modal / Cost Price** (opsional): Harga beli atau biaya produksi. Digunakan untuk perhitungan margin.
   - **Barcode** (opsional): Masukkan barcode yang sudah ada atau generate barcode baru.
   - **Pengaturan Stok**: Aktifkan pelacakan stok jika produk memiliki inventori fisik.
   - **Pajak**: Pilih aturan pajak yang berlaku untuk produk ini.
4. Klik **Simpan** untuk menyimpan produk, atau **Simpan & Tambah Lagi** untuk menyimpan dan langsung membuat produk berikutnya.

### Melalui Quick Add Modal

Untuk penambahan cepat tanpa perlu mengisi semua detail:

1. Dari halaman daftar produk atau langsung dari layar POS, klik ikon **Quick Add** (ikon plus cepat).
2. Modal akan muncul dengan field minimal: Nama, Kategori, dan Harga.
3. Isi ketiga field tersebut dan klik **Simpan**.
4. Detail lainnya bisa dilengkapi nanti melalui halaman edit produk.

### Melalui Template Produk

Jika Anda sering menambahkan produk dengan karakteristik serupa:

1. Buka produk yang ingin dijadikan template.
2. Klik menu titik tiga (**...**) lalu pilih **Gunakan sebagai Template**.
3. Form produk baru akan terbuka dengan data yang sudah terisi dari template.
4. Ubah nama, harga, dan detail spesifik lainnya.
5. Klik **Simpan**.

---

## 2. Upload Gambar Produk

Gambar produk membantu kasir mengidentifikasi produk dengan cepat dan meningkatkan tampilan menu online.

### Cara Upload

1. Pada form produk (saat membuat baru atau mengedit), temukan bagian **Gambar Produk**.
2. Klik area upload atau drag-and-drop file gambar ke area tersebut.
3. Format yang didukung: JPG, PNG, WebP.
4. Ukuran maksimum: 5 MB per gambar.
5. Resolusi yang disarankan: minimal 500x500 piksel, rasio 1:1 (persegi) untuk tampilan terbaik.

### Tips Gambar Produk

- Gunakan latar belakang putih atau netral untuk konsistensi tampilan.
- Pastikan produk terlihat jelas dan mengisi sebagian besar frame.
- Untuk produk F&B, foto yang menarik dapat meningkatkan penjualan di menu online.
- Jika produk memiliki varian dengan tampilan berbeda (misalnya warna berbeda), upload gambar terpisah untuk setiap varian.
- Kompres gambar terlebih dahulu jika ukurannya terlalu besar — ini mempercepat loading di POS.

---

## 3. Mengatur Kategori

Kategori membantu mengorganisasi produk dan mempercepat navigasi di POS.

### Membuat Kategori Baru

1. Buka **Produk > Kategori** dari sidebar, atau akses Category Manager dari halaman daftar produk.
2. Klik **+ Tambah Kategori**.
3. Isi:
   - **Nama Kategori**: Contoh — "Makanan", "Minuman", "Snack", "Elektronik".
   - **Warna** (opsional): Pilih warna untuk memudahkan identifikasi visual di POS.
   - **Ikon** (opsional): Pilih ikon yang merepresentasikan kategori.
   - **Urutan Tampil**: Atur posisi kategori di daftar.
4. Klik **Simpan**.

### Mengatur Hierarki Kategori

TiloPOS mendukung kategori bertingkat (parent-child):

1. Saat membuat kategori baru, pilih **Kategori Induk** jika ingin membuat sub-kategori.
2. Contoh struktur:
   - Minuman (parent)
     - Kopi (child)
     - Teh (child)
     - Jus (child)
   - Makanan (parent)
     - Makanan Berat (child)
     - Makanan Ringan (child)

### Mengelola Kategori

- **Edit**: Klik kategori, ubah nama atau pengaturan, lalu simpan.
- **Hapus**: Klik ikon hapus pada kategori. Produk dalam kategori tersebut akan menjadi "Tanpa Kategori" — produk tidak ikut terhapus.
- **Urutkan**: Drag-and-drop kategori untuk mengubah urutan tampil di POS.
- **Filter di Daftar Produk**: Klik nama kategori di panel filter untuk melihat produk dalam kategori tersebut saja.

---

## 4. Menambah Varian (Ukuran, Warna, dll)

Varian memungkinkan satu produk memiliki beberapa pilihan dengan harga dan stok terpisah.

### Membuat Varian

1. Buka form produk (baru atau edit).
2. Gulir ke bagian **Varian**.
3. Klik **+ Tambah Grup Varian**.
4. Isi nama grup varian, misalnya "Ukuran" atau "Warna".
5. Tambahkan opsi varian:
   - Ketik nama opsi (misalnya "Small") lalu tekan Enter.
   - Ulangi untuk setiap opsi (misalnya "Medium", "Large").
6. Untuk setiap opsi varian, atur:
   - **Harga**: Bisa sama dengan harga dasar atau berbeda. Misalnya Small = Rp 18.000, Large = Rp 30.000.
   - **SKU**: SKU unik per varian (opsional, auto-generate jika kosong).
   - **Stok**: Jumlah stok per varian jika pelacakan stok aktif.
   - **Barcode**: Barcode unik per varian (opsional).
7. Klik **Simpan**.

### Varian Ganda

Anda bisa menambahkan lebih dari satu grup varian. Sistem akan otomatis membuat kombinasi:

**Contoh:**
- Grup 1 "Ukuran": S, M, L
- Grup 2 "Warna": Hitam, Putih

**Hasil kombinasi (6 varian):**
| Ukuran | Warna | SKU |
|--------|-------|-----|
| S | Hitam | KAOS-S-HIT |
| S | Putih | KAOS-S-PUT |
| M | Hitam | KAOS-M-HIT |
| M | Putih | KAOS-M-PUT |
| L | Hitam | KAOS-L-HIT |
| L | Putih | KAOS-L-PUT |

Setiap kombinasi memiliki harga dan stok sendiri.

### Tips Varian

- Gunakan varian untuk variasi yang mempengaruhi stok atau harga (ukuran, warna).
- Untuk variasi yang bersifat tambahan dan opsional (topping, level gula), gunakan Modifier Groups.
- Hindari terlalu banyak grup varian (maksimal 2-3 grup) agar kombinasi tidak terlalu banyak dan membingungkan.
- Anda bisa menonaktifkan varian tertentu tanpa menghapusnya jika stok sedang kosong.

---

## 5. Mengatur Modifier Groups

Modifier adalah opsi tambahan yang bisa dipilih pelanggan saat memesan. Berbeda dengan varian, modifier bersifat add-on dan bisa digunakan di banyak produk.

### Membuat Modifier Group

1. Buka **Produk > Modifier Groups** dari sidebar.
2. Klik **+ Tambah Modifier Group**.
3. Isi informasi:
   - **Nama Group**: Contoh — "Pilih Topping", "Level Gula", "Tambahan".
   - **Tipe Pilihan**:
     - **Pilihan Tunggal (Single Select)**: Pelanggan hanya bisa memilih satu opsi. Contoh: Level Gula.
     - **Pilihan Ganda (Multi Select)**: Pelanggan bisa memilih beberapa opsi. Contoh: Topping.
   - **Wajib/Opsional**: Apakah pelanggan harus memilih atau boleh melewati.
   - **Minimum/Maksimum Pilihan** (untuk multi select): Misalnya minimal 1, maksimal 3 topping.
4. Tambahkan **opsi modifier**:
   - Nama opsi: "Extra Cheese", "Extra Shot", "Less Sugar"
   - Harga tambahan: Rp 5.000, Rp 8.000, Rp 0 (gratis)
5. Klik **Simpan**.

### Menghubungkan Modifier ke Produk

1. Buka form edit produk.
2. Gulir ke bagian **Modifier**.
3. Klik **+ Tambah Modifier Group**.
4. Pilih modifier group yang sudah dibuat dari daftar dropdown.
5. Satu produk bisa memiliki beberapa modifier group.
6. Klik **Simpan**.

### Contoh Penerapan Modifier

**Kedai Kopi — Produk: Caffe Latte**
- Modifier 1 "Ukuran" (wajib, pilihan tunggal): Regular (+Rp 0), Large (+Rp 6.000)
- Modifier 2 "Level Gula" (wajib, pilihan tunggal): Normal, Less Sugar, No Sugar — semua Rp 0
- Modifier 3 "Tambahan" (opsional, pilihan ganda, maks 3): Extra Shot (+Rp 5.000), Oat Milk (+Rp 8.000), Vanilla Syrup (+Rp 4.000), Hazelnut Syrup (+Rp 4.000)

---

## 6. Membuat Bundle Package

Bundle package adalah paket berisi beberapa produk yang dijual dengan harga khusus (biasanya lebih murah dari total harga satuan).

### Cara Membuat Bundle

1. Buka **Produk > Bundle Packages** atau klik **+ Tambah Bundle** dari halaman daftar produk.
2. Isi informasi bundle:
   - **Nama Bundle**: Contoh — "Paket Hemat Makan Siang".
   - **Deskripsi**: Keterangan isi paket.
   - **Gambar** (opsional): Upload gambar paket.
   - **Kategori**: Pilih atau buat kategori khusus untuk bundle.
3. Tambahkan **komponen produk**:
   - Klik **+ Tambah Produk**.
   - Cari dan pilih produk dari katalog.
   - Tentukan jumlah (quantity) untuk setiap komponen.
   - Jika produk memiliki varian, tentukan varian default atau biarkan pelanggan memilih.
4. Atur **harga bundle**:
   - Sistem akan menampilkan total harga satuan sebagai referensi.
   - Masukkan harga bundle yang Anda inginkan.
   - Sistem otomatis menghitung dan menampilkan besaran diskon.
5. Klik **Simpan**.

### Contoh Bundle

**Paket Hemat Makan Siang:**
| Komponen | Harga Satuan | Qty |
|----------|-------------|-----|
| Nasi Goreng Spesial | Rp 25.000 | 1 |
| Es Teh Manis | Rp 8.000 | 1 |
| Kerupuk | Rp 3.000 | 1 |
| **Total Satuan** | **Rp 36.000** | |
| **Harga Bundle** | **Rp 28.000** | |
| **Hemat** | **Rp 8.000 (22%)** | |

### Catatan Penting Bundle

- Stok komponen otomatis berkurang saat bundle terjual.
- Jika salah satu komponen habis stoknya, bundle otomatis tidak tersedia di POS.
- Bundle bisa digunakan bersamaan dengan program promosi.
- Satu produk bisa menjadi komponen di beberapa bundle berbeda.

---

## 7. Setting Harga dan Biaya (Cost Price)

### Harga Jual (Selling Price)

1. Pada form produk, isi field **Harga Jual** / **Base Price**.
2. Ini adalah harga default yang tampil di POS.
3. Jika produk memiliki varian, harga bisa berbeda per varian.
4. Harga sudah termasuk atau belum termasuk pajak sesuai pengaturan pajak bisnis Anda.

### Harga Modal (Cost Price)

1. Isi field **Harga Modal** / **Cost Price** pada form produk.
2. Harga modal digunakan untuk:
   - Perhitungan margin dan profit per produk.
   - Laporan profitabilitas.
   - Valuasi inventori.
3. Harga modal tidak tampil di POS kasir — hanya terlihat di dashboard manajemen.

### Informasi Margin

Setelah mengisi harga jual dan harga modal, sistem otomatis menampilkan:
- **Margin (Rp)**: Harga Jual - Harga Modal. Contoh: Rp 25.000 - Rp 12.000 = Rp 13.000.
- **Margin (%)**: (Margin / Harga Jual) x 100%. Contoh: (13.000 / 25.000) x 100% = 52%.

### Pengaturan Pajak

1. Pada form produk, bagian **Pajak**, pilih aturan pajak yang berlaku.
2. Opsi umum:
   - Tidak kena pajak
   - PPN 11%
   - Pajak restoran (sesuai perda setempat)
3. Pengaturan pajak mempengaruhi harga final yang dibayar pelanggan.

---

## 8. Barcode: Generate & Print

### Memasukkan Barcode yang Sudah Ada

1. Pada form produk, isi field **Barcode**.
2. Anda bisa mengetik manual atau menggunakan barcode scanner untuk mengisi field ini.
3. Scanner akan otomatis mengisi field yang sedang aktif (cursor).

### Generate Barcode Baru

1. Pada form produk, klik tombol **Generate Barcode** di samping field barcode.
2. Sistem akan menghasilkan barcode unik untuk produk tersebut.
3. Format barcode: EAN-13 atau Code 128 (sesuai pengaturan).
4. Klik **Simpan** untuk menyimpan barcode bersama produk.

### Cetak Label Barcode

1. Dari halaman daftar produk, pilih satu atau beberapa produk (centang checkbox).
2. Klik **Aksi > Cetak Barcode**.
3. Atur pengaturan cetak:
   - **Format Label**: Pilih ukuran label yang sesuai dengan printer Anda.
   - **Jumlah per Produk**: Berapa label yang ingin dicetak per produk.
   - **Informasi Tambahan**: Pilih informasi yang ingin ditampilkan di label (nama produk, harga, SKU).
4. Preview label akan ditampilkan.
5. Klik **Cetak** untuk mengirim ke printer.

### Tips Barcode

- Gunakan barcode scanner USB yang kompatibel dengan mode keyboard (HID) — tidak perlu driver khusus.
- Untuk produk dengan varian, setiap varian sebaiknya memiliki barcode sendiri.
- Printer label thermal (seperti Zebra, Brother QL) memberikan hasil terbaik.
- Anda juga bisa mencetak barcode ke kertas biasa menggunakan printer standar, lalu dipotong manual.

---

## 9. Bulk Import Produk

Fitur ini sangat berguna saat pertama kali setup sistem atau saat menambahkan banyak produk sekaligus.

### Langkah-Langkah Bulk Import

1. Buka **Produk > Import**.
2. Klik **Download Template** untuk mendapatkan file template spreadsheet (format CSV atau Excel).
3. Buka template dan isi data produk:
   - Kolom wajib: Nama Produk, Kategori, Harga Jual.
   - Kolom opsional: SKU, Deskripsi, Harga Modal, Barcode, Stok Awal.
   - Untuk produk dengan varian, gunakan baris terpisah per varian dengan kolom "Nama Varian" dan "Opsi Varian".
4. Simpan file spreadsheet.
5. Kembali ke halaman Import, klik **Upload File** dan pilih file yang sudah diisi.
6. Sistem akan memvalidasi data dan menampilkan **preview**:
   - Baris hijau: data valid, siap diimport.
   - Baris kuning: ada peringatan (misalnya duplikat SKU) — bisa dilanjutkan tapi perlu perhatian.
   - Baris merah: data tidak valid (misalnya harga kosong) — harus diperbaiki.
7. Perbaiki data yang bermasalah jika ada, atau klik **Import** untuk memproses baris yang valid.
8. Tunggu proses import selesai. Sistem akan menampilkan ringkasan: berapa produk berhasil diimport dan berapa yang gagal.

### Tips Bulk Import

- Mulai dengan jumlah kecil (10-20 produk) untuk memastikan format sudah benar sebelum import besar.
- Pastikan nama kategori di spreadsheet sesuai dengan kategori yang sudah ada di sistem, atau buat kategori terlebih dahulu.
- Gunakan SKU yang konsisten dan unik untuk menghindari duplikasi.
- Jika migrasi dari sistem lain, export data dari sistem lama lalu sesuaikan formatnya dengan template TiloPOS.
- Proses import bisa memakan waktu beberapa menit untuk ribuan produk — jangan tutup halaman selama proses berlangsung.

---

## 10. Mengelola Bahan Baku & Resep

Fitur ini tersedia jika feature flag `ingredient_tracking` aktif untuk bisnis Anda. Sangat berguna untuk bisnis F&B yang ingin melacak penggunaan bahan baku dan menghitung HPP otomatis.

### Mendaftarkan Bahan Baku

1. Buka **Inventori > Bahan Baku** dari sidebar.
2. Klik **+ Tambah Bahan Baku**.
3. Isi informasi:
   - **Nama**: Contoh — "Biji Kopi Arabica", "Susu Full Cream".
   - **Satuan**: gram, ml, pcs, kg, liter, dll.
   - **Harga per Satuan**: Harga beli bahan baku. Contoh: Rp 250/gram.
   - **Stok Awal**: Jumlah stok saat ini.
   - **Minimum Stok**: Batas minimum sebelum sistem memberi peringatan.
   - **Supplier** (opsional): Supplier bahan baku ini.
4. Klik **Simpan**.

### Membuat Resep Produk

1. Buka form edit produk yang ingin ditambahkan resepnya.
2. Gulir ke bagian **Resep / Bahan Baku**.
3. Klik **+ Tambah Bahan**.
4. Untuk setiap bahan dalam resep:
   - Pilih bahan baku dari daftar.
   - Masukkan jumlah yang dibutuhkan. Contoh: "Biji Kopi Arabica", 18 gram.
   - Ulangi untuk semua bahan.
5. Sistem otomatis menghitung **HPP (Harga Pokok Penjualan)** berdasarkan harga bahan baku:
   - Biji Kopi Arabica: 18g x Rp 250/g = Rp 4.500
   - Susu Full Cream: 200ml x Rp 18/ml = Rp 3.600
   - Cup + Lid: 1 pcs x Rp 1.500 = Rp 1.500
   - **Total HPP: Rp 9.600**
6. Bandingkan dengan harga jual untuk melihat margin sebenarnya.
7. Klik **Simpan**.

### Cara Kerja Pengurangan Stok Otomatis

Ketika produk dengan resep terjual di POS:
1. Sistem membaca resep produk tersebut.
2. Stok setiap bahan baku dalam resep dikurangi sesuai jumlah yang dibutuhkan.
3. Jika produk terjual 3 porsi, bahan baku dikurangi 3x lipat dari resep.
4. Jika stok bahan baku mencapai batas minimum, notifikasi otomatis dikirim ke manajer.

### Laporan Bahan Baku

Setelah ingredient tracking aktif, Anda bisa mengakses laporan:
- **Penggunaan Bahan Baku**: Berapa banyak bahan terpakai dalam periode tertentu.
- **HPP per Produk**: Perbandingan HPP vs harga jual per produk.
- **Food Cost Ratio**: Persentase HPP terhadap penjualan — idealnya 28-35% untuk bisnis F&B.
- **Stok Bahan Baku**: Posisi stok terkini dan perkiraan kapan akan habis berdasarkan rata-rata penggunaan.

---

## 11. Assign Produk ke Outlet

Jika bisnis Anda memiliki beberapa outlet, Anda bisa mengatur produk mana yang tersedia di outlet mana.

### Cara Assign Produk

1. Buka form edit produk.
2. Gulir ke bagian **Ketersediaan Outlet**.
3. Anda akan melihat daftar semua outlet bisnis Anda.
4. Centang outlet di mana produk ini harus tersedia.
5. Secara default, produk baru tersedia di semua outlet.
6. Klik **Simpan**.

### Assign Massal (Bulk Assign)

1. Dari halaman daftar produk, pilih beberapa produk (centang checkbox).
2. Klik **Aksi > Atur Ketersediaan Outlet**.
3. Pilih outlet yang diinginkan.
4. Pilih aksi: **Tambahkan ke Outlet** atau **Hapus dari Outlet**.
5. Klik **Terapkan**.

### Catatan Penting

- Produk yang tidak di-assign ke suatu outlet tidak akan muncul di POS outlet tersebut.
- Stok dikelola per outlet — produk yang sama bisa memiliki jumlah stok berbeda di outlet berbeda.
- Perubahan harga di produk pusat akan tersinkronisasi ke semua outlet yang memiliki produk tersebut.

---

## 12. Tips Pengelolaan Produk

### Penamaan Produk yang Baik

- Gunakan nama yang deskriptif dan konsisten. Contoh: "Nasi Goreng Ayam" lebih baik dari "NG Aym".
- Hindari singkatan yang hanya dipahami internal — pelanggan online juga akan melihat nama ini.
- Untuk produk serupa, gunakan pola penamaan yang sama. Contoh: "Jus Jeruk", "Jus Mangga", "Jus Alpukat" — bukan "Jus Jeruk", "Mangga Juice", "Alpukat Fresh".

### Organisasi Kategori

- Jangan terlalu banyak kategori utama (idealnya 5-10) agar navigasi POS tetap cepat.
- Gunakan sub-kategori untuk pengelompokan detail.
- Urutkan kategori berdasarkan popularitas atau alur pesanan (makanan dulu, minuman setelahnya).

### Pengelolaan Harga

- Review harga secara berkala, terutama jika harga bahan baku berubah.
- Gunakan fitur laporan margin untuk identifikasi produk dengan margin rendah.
- Pertimbangkan pembulatan harga ke angka yang "bersih" (Rp 25.000 vs Rp 24.700) untuk mempercepat transaksi tunai.

### Gambar Produk

- Prioritaskan upload gambar untuk produk terlaris dan produk yang dijual online.
- Gunakan gambar dengan kualitas dan gaya yang konsisten.
- Gambar yang menarik terbukti meningkatkan penjualan di menu digital.

### Stok dan Inventori

- Aktifkan pelacakan stok hanya untuk produk yang benar-benar perlu dilacak.
- Lakukan stock opname berkala dan sesuaikan stok di sistem.
- Atur minimum stok agar mendapat notifikasi sebelum kehabisan.

### Backup dan Keamanan

- Secara berkala export daftar produk sebagai backup.
- Batasi akses edit produk hanya untuk role Manager ke atas.
- Review log perubahan produk untuk mendeteksi perubahan yang tidak sah.

---

## 13. FAQ

### Umum

**T: Berapa maksimal jumlah produk yang bisa disimpan di TiloPOS?**
J: Tidak ada batas maksimal jumlah produk. TiloPOS dirancang untuk menangani puluhan ribu produk tanpa penurunan performa.

**T: Apakah perubahan produk langsung berlaku di POS?**
J: Ya, perubahan produk (harga, nama, ketersediaan) langsung tersinkronisasi ke semua perangkat POS dalam hitungan detik.

**T: Bagaimana cara menghapus produk?**
J: Buka produk yang ingin dihapus, klik menu titik tiga (...) lalu pilih "Hapus". Produk yang sudah pernah ada di transaksi tidak benar-benar dihapus dari database — statusnya berubah menjadi "Tidak Aktif" agar riwayat transaksi tetap utuh. Anda juga bisa menonaktifkan produk tanpa menghapusnya.

**T: Bisakah saya mengubah harga produk tanpa mempengaruhi transaksi lama?**
J: Ya, perubahan harga hanya berlaku untuk transaksi baru. Transaksi yang sudah selesai tetap menggunakan harga saat transaksi dilakukan.

### Varian dan Modifier

**T: Apa perbedaan varian dan modifier?**
J: Varian adalah variasi intrinsik produk (ukuran kaos: S/M/L) dengan stok terpisah. Modifier adalah tambahan opsional saat memesan (extra cheese, less sugar) yang bisa dibagikan antar produk. Gunakan varian jika mempengaruhi stok, gunakan modifier jika bersifat add-on.

**T: Bisakah satu modifier group digunakan di banyak produk?**
J: Ya, modifier group bersifat reusable. Misalnya modifier "Level Gula" bisa digunakan di semua produk minuman.

**T: Apakah ada batas jumlah varian per produk?**
J: Secara teknis tidak ada batas, namun disarankan maksimal 2-3 grup varian per produk agar tidak terlalu kompleks. Kombinasi yang terlalu banyak bisa membingungkan kasir dan pelanggan.

### Bahan Baku dan HPP

**T: Bagaimana jika harga bahan baku berubah?**
J: Update harga bahan baku di menu Inventori > Bahan Baku. HPP semua produk yang menggunakan bahan tersebut otomatis terupdate.

**T: Apakah ingredient tracking wajib digunakan?**
J: Tidak, fitur ini opsional dan diaktifkan via feature flag. Bisnis retail yang tidak memproses bahan baku tidak memerlukan fitur ini.

**T: Bagaimana menangani bahan baku yang digunakan dalam jumlah sangat kecil?**
J: Gunakan satuan yang lebih kecil. Misalnya untuk bumbu, gunakan satuan gram alih-alih kilogram agar presisi lebih tinggi.

### Import dan Migrasi

**T: Format file apa yang didukung untuk bulk import?**
J: CSV (comma-separated) dan Excel (.xlsx). Template bisa didownload langsung dari halaman Import.

**T: Bagaimana jika ada data yang gagal saat bulk import?**
J: Sistem akan menampilkan detail error per baris. Anda bisa memperbaiki data yang gagal dan mengimport ulang hanya baris yang bermasalah tanpa mempengaruhi data yang sudah berhasil diimport.

**T: Bisakah saya import produk beserta variannya?**
J: Ya, template import menyediakan kolom khusus untuk varian. Setiap varian diisi di baris terpisah dengan referensi ke produk induknya.

### Multi-Outlet

**T: Apakah harga bisa berbeda per outlet?**
J: Pengaturan harga per outlet tersedia melalui fitur assign produk ke outlet. Namun untuk konsistensi brand, disarankan menggunakan harga seragam kecuali ada alasan strategis (misalnya lokasi premium).

**T: Bagaimana stok dikelola untuk multi-outlet?**
J: Stok dikelola secara terpisah per outlet. Setiap outlet memiliki jumlah stok sendiri, dan penjualan di satu outlet tidak mempengaruhi stok di outlet lain.

**T: Bisakah outlet menambahkan produk sendiri tanpa persetujuan pusat?**
J: Tergantung pengaturan role dan permission. Owner/Manager pusat bisa membatasi apakah outlet boleh menambah produk sendiri atau hanya bisa menjual produk yang sudah di-assign dari pusat.

---

Jika Anda membutuhkan bantuan lebih lanjut, hubungi tim support TiloPOS atau kunjungi pusat bantuan online kami.
