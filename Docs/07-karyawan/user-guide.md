# Panduan Pengguna: Modul Karyawan

Panduan lengkap untuk mengelola karyawan di TiloPOS — dari menambah karyawan baru, mengatur role dan permission, hingga mengelola shift dan melihat laporan.

---

## Daftar Isi

1. [Menambah Karyawan Baru](#1-menambah-karyawan-baru)
2. [Mengatur Role dan Permission](#2-mengatur-role-dan-permission)
3. [Start dan End Shift (Cash Count)](#3-start-dan-end-shift)
4. [Melihat Shift Report](#4-melihat-shift-report)
5. [Activity Log](#5-activity-log)
6. [Tips Manajemen Karyawan](#6-tips-manajemen-karyawan)
7. [FAQ (Pertanyaan yang Sering Diajukan)](#7-faq)

---

## 1. Menambah Karyawan Baru

### Langkah-langkah

1. Buka menu **Karyawan** dari sidebar navigasi (`/app/employees`)
2. Klik tombol **"Tambah Karyawan"** di pojok kanan atas (shortcut keyboard: `N`)
3. Isi formulir informasi karyawan:

| Field | Wajib? | Keterangan |
|-------|--------|------------|
| Nama Lengkap | Ya | Minimal 2 karakter |
| Email | Ya | Format email valid, digunakan sebagai username login |
| Telepon | Tidak | Nomor HP karyawan |
| PIN | Ya (saat buat baru) | Harus tepat 6 digit angka. Digunakan untuk autentikasi cepat |
| Role | Ya | Pilih dari dropdown (Owner, Manager, Supervisor, Cashier, Kitchen, Inventory) |
| Outlet | Ya | Pilih outlet tempat karyawan ditugaskan |
| Tarif per Jam (Rp) | Tidak | Opsional, untuk tracking biaya tenaga kerja |

4. Klik **"Tambah Karyawan"** untuk menyimpan

### Penjelasan Field

**Email:** Ini adalah identitas unik karyawan di sistem. Setiap karyawan harus memiliki email yang berbeda. Email ini juga digunakan sebagai username saat login ke TiloPOS.

**PIN:** PIN 6 digit angka yang digunakan untuk:
- Login cepat saat pergantian shift
- Autentikasi untuk operasi tertentu yang memerlukan verifikasi identitas
- PIN hanya ditampilkan saat pembuatan — tidak bisa dilihat setelah disimpan. Jika lupa, buat PIN baru melalui menu Edit karyawan.

**Role:** Menentukan menu dan fitur apa saja yang bisa diakses karyawan. Lihat bagian [Mengatur Role dan Permission](#2-mengatur-role-dan-permission) untuk detail lengkap.

**Outlet:** Setiap karyawan harus di-assign ke satu outlet. Untuk bisnis single-outlet, pilih outlet yang tersedia. Untuk multi-outlet, pastikan memilih outlet yang benar.

**Tarif per Jam:** Opsional. Berguna untuk bisnis yang membayar karyawan per jam atau ingin melacak biaya tenaga kerja per shift. Masukkan angka dalam Rupiah tanpa titik atau koma.

---

## 2. Mengatur Role dan Permission

### Hierarki Role

TiloPOS menggunakan sistem hierarki role di mana level yang lebih tinggi memiliki semua akses level di bawahnya:

```
Super Admin
    |
  Owner
    |
  Manager
    |
  Supervisor
    |
  Cashier / Kitchen Staff / Inventory Staff
```

### Detail Akses per Role

#### Owner
- Akses penuh ke seluruh fitur bisnis
- Mengelola karyawan (tambah, edit, hapus)
- Melihat semua laporan dan analytics
- Mengubah pengaturan bisnis
- Mengelola outlet, produk, inventori, pelanggan, promosi

#### Manager
- Mengelola karyawan (kecuali akun Owner)
- Mengelola inventori (stok, purchase order, supplier)
- Melihat laporan operasional dan keuangan
- Mengoperasikan POS
- Mengelola produk dan pelanggan

#### Supervisor
- Mengoperasikan POS
- Mengelola inventori operasional (stok opname, transfer)
- Melihat laporan operasional (bukan keuangan detail)
- Mengelola pesanan dan meja

#### Cashier (Kasir)
- Mengoperasikan POS (transaksi, pembayaran, struk)
- Mengelola pesanan
- Mengelola meja (jika F&B)
- Start/end shift
- Melihat data pelanggan (assign ke transaksi)

#### Kitchen Staff (Staf Dapur)
- Mengakses Kitchen Display System (KDS)
- Melihat dan mengelola pesanan masuk
- Mengubah status pesanan (new > preparing > ready)

#### Inventory Staff (Staf Inventori)
- Mengelola produk (tambah, edit, stok)
- Mengelola bahan baku dan resep
- Melakukan stok opname
- Mengelola transfer stok antar gudang
- Mengelola supplier dan purchase order

### Mengubah Role Karyawan

1. Buka halaman Karyawan (`/app/employees`)
2. Klik ikon menu (tiga titik) pada baris karyawan
3. Pilih **"Edit"**
4. Ubah dropdown **Role** ke role yang diinginkan
5. Klik **"Simpan Perubahan"**

**Catatan penting:**
- Perubahan role langsung berlaku setelah disimpan
- Karyawan perlu logout dan login ulang agar menu berubah sesuai role baru
- Hanya karyawan dengan role yang lebih tinggi yang bisa mengubah role karyawan lain (misalnya Manager tidak bisa mengubah role Owner)

---

## 3. Start dan End Shift

### Membuka Shift (Start Shift)

Shift adalah periode kerja seorang kasir yang dicatat oleh sistem. Sebelum mulai melayani transaksi, kasir harus membuka shift terlebih dahulu.

**Langkah-langkah:**

1. Login ke POS dengan akun kasir
2. Sistem akan menampilkan prompt untuk memulai shift (jika belum ada shift aktif)
3. Hitung kas fisik yang ada di laci kasir
4. Input **Kas Awal (Opening Cash)** — jumlah uang tunai yang ada di laci saat mulai shift
5. Konfirmasi untuk memulai shift
6. Shift dimulai — kasir bisa mulai melayani transaksi

**Tips:**
- Selalu hitung kas fisik dengan teliti sebelum input
- Jika ada selisih dengan kas akhir shift sebelumnya, laporkan ke supervisor/manager
- Kas awal yang disarankan: Rp 200.000 - 500.000 dalam pecahan kecil untuk kembalian

### Menutup Shift (End Shift)

Saat selesai bertugas, kasir harus menutup shift untuk membuat laporan.

**Langkah-langkah:**

1. Dari layar POS, pilih opsi **Tutup Shift**
2. Hitung seluruh kas fisik yang ada di laci kasir
3. Input **Kas Akhir (Closing Cash)** — jumlah uang tunai aktual di laci
4. Sistem otomatis menampilkan:
   - **Kas yang diharapkan:** Kas awal + penjualan tunai - kembalian
   - **Selisih:** Perbedaan antara kas aktual dengan yang diharapkan
5. Review ringkasan shift:
   - Total transaksi
   - Breakdown per metode pembayaran
   - Selisih kas
6. Konfirmasi penutupan shift
7. Shift ditutup — laporan shift tersimpan

**Tips:**
- Hitung kas dengan teliti — selisih yang konsisten menjadi perhatian khusus
- Jika ada selisih, jelaskan alasannya (jika tahu) di catatan shift
- Selalu tutup shift sebelum meninggalkan pos kasir

### Apa yang Dicatat Selama Shift?

| Data | Deskripsi |
|------|-----------|
| Waktu buka shift | Timestamp saat shift dimulai |
| Waktu tutup shift | Timestamp saat shift ditutup |
| Kas awal | Jumlah uang tunai di awal shift |
| Kas akhir | Jumlah uang tunai di akhir shift |
| Total transaksi | Jumlah dan nilai semua transaksi selama shift |
| Breakdown pembayaran | Total per metode: tunai, QRIS, kartu, e-wallet |
| Selisih kas | Perbedaan antara kas aktual vs ekspektasi |
| Kasir | Nama karyawan yang menjalankan shift |

---

## 4. Melihat Shift Report

### Mengakses Laporan Shift

Laporan shift bisa diakses dari modul Laporan di backoffice. Setiap shift yang sudah ditutup menghasilkan laporan yang berisi:

### Isi Laporan Shift

**Ringkasan:**
- Nama kasir
- Outlet
- Waktu buka dan tutup shift
- Durasi shift
- Kas awal dan kas akhir
- Selisih kas (surplus/defisit)

**Detail Penjualan:**
- Total jumlah transaksi
- Total nilai penjualan
- Rata-rata nilai per transaksi
- Transaksi terbesar dan terkecil

**Breakdown Metode Pembayaran:**
- Tunai: jumlah transaksi + total nilai
- QRIS: jumlah transaksi + total nilai
- Kartu Debit/Kredit: jumlah transaksi + total nilai
- E-wallet (GoPay, OVO, dll): jumlah transaksi + total nilai
- Split payment: jumlah dan detail

**Akuntabilitas Kas:**
- Kas awal
- Penerimaan tunai
- Pengeluaran tunai (kembalian)
- Kas yang diharapkan (calculated)
- Kas aktual (closing count)
- Selisih

### Tips Membaca Laporan

- **Selisih Rp 0:** Ideal — kas aktual sama persis dengan ekspektasi
- **Selisih kecil (< Rp 5.000):** Wajar — biasanya karena pembulatan atau uang receh
- **Selisih besar (> Rp 50.000):** Perlu investigasi — periksa apakah ada transaksi yang tidak tercatat atau kesalahan penghitungan
- **Selisih konsisten di kasir tertentu:** Red flag — perlu perhatian khusus

---

## 5. Activity Log

### Apa Itu Activity Log?

Activity log adalah catatan digital dari setiap aksi yang dilakukan karyawan di sistem TiloPOS. Log ini penting untuk audit trail dan investigasi jika ada masalah.

### Aksi yang Dicatat

| Kategori | Contoh Aksi |
|----------|-------------|
| Transaksi | Membuat transaksi, void transaksi, refund |
| Produk | Menambah produk, mengubah harga, menghapus produk |
| Stok | Stok opname, transfer stok, adjustment |
| Pelanggan | Menambah pelanggan, mengedit data |
| Shift | Buka shift, tutup shift |
| Karyawan | Menambah karyawan, mengubah role |
| Pengaturan | Mengubah konfigurasi bisnis |

### Cara Menggunakan Activity Log

Activity log bermanfaat untuk:

1. **Investigasi masalah:** Jika ada produk yang harganya berubah tanpa sepengetahuan, cek log untuk melihat siapa yang mengubah dan kapan
2. **Audit keamanan:** Review berkala apakah ada aksi mencurigakan
3. **Training:** Identifikasi karyawan yang sering melakukan kesalahan operasional untuk diberi pelatihan tambahan
4. **Compliance:** Memenuhi kebutuhan audit jika ada pemeriksaan dari pihak eksternal

---

## 6. Tips Manajemen Karyawan

### Onboarding Karyawan Baru

1. **Buat akun** di TiloPOS dengan role yang sesuai
2. **Berikan PIN** secara pribadi (jangan share lewat chat grup)
3. **Demo singkat** fitur yang relevan dengan role-nya (10-15 menit cukup)
4. **Shift pertama** didampingi karyawan senior
5. **Review** performa di akhir minggu pertama

### Keamanan PIN

- **Jangan gunakan PIN yang mudah ditebak** (123456, 000000, tanggal lahir)
- **Ganti PIN** secara berkala (disarankan setiap 3 bulan)
- **Segera ganti PIN** jika ada karyawan yang resign
- **Jangan share PIN** — setiap orang harus punya PIN sendiri
- **PIN baru** bisa dibuat melalui menu Edit karyawan (PIN lama akan tertimpa)

### Best Practice untuk Role Assignment

| Jenis Bisnis | Rekomendasi Role |
|--------------|-----------------|
| Warung/toko kecil (1-3 orang) | Owner + 1-2 Cashier |
| Restoran kecil (4-8 orang) | Owner + Manager + 2-3 Cashier + 2-3 Kitchen |
| Toko retail menengah (5-15 orang) | Owner + Manager + Supervisor + Cashier + Inventory |
| Multi-outlet (15+ orang) | Owner + Manager per outlet + Supervisor + staff per outlet |

### Pergantian Shift yang Efisien

1. Kasir baru datang 10 menit sebelum shift dimulai
2. Kasir lama menghitung kas dan menginisiasi tutup shift
3. Kasir lama dan kasir baru **bersama-sama** menghitung dan memverifikasi kas
4. Kasir lama konfirmasi tutup shift
5. Kasir baru memulai shift baru dengan kas yang sudah terverifikasi
6. Total proses: 5-10 menit

### Menangani Karyawan yang Resign

1. **Segera nonaktifkan** akun karyawan (Edit > toggle "Karyawan Aktif" ke off)
2. **Jangan hapus** — nonaktifkan saja agar data historis tetap tersimpan
3. **Review** shift terakhir untuk memastikan tidak ada selisih
4. Karyawan yang dinonaktifkan tidak bisa login lagi ke sistem

### Monitoring Performa

Gunakan data dari TiloPOS untuk memantau kinerja karyawan:

- **Jumlah transaksi per shift** — seberapa produktif kasir?
- **Rata-rata waktu per transaksi** — seberapa efisien?
- **Selisih kas** — seberapa akurat penanganan uang tunai?
- **Jumlah void/refund** — apakah ada pola yang mencurigakan?

Bandingkan data antar kasir dan antar shift untuk mengidentifikasi:
- Kasir terbaik (sebagai contoh/reward)
- Kasir yang butuh training tambahan
- Shift yang paling sibuk (untuk alokasi SDM yang tepat)

---

## 7. FAQ

### Akun dan Akses

**T: Berapa maksimal karyawan yang bisa ditambahkan?**
J: Tidak ada batasan jumlah karyawan. Anda bisa menambah sebanyak yang dibutuhkan.

**T: Apakah satu karyawan bisa di-assign ke beberapa outlet?**
J: Saat ini, setiap karyawan di-assign ke satu outlet. Untuk karyawan yang berpindah-pindah outlet, ubah assignment outlet melalui menu Edit sebelum mereka mulai shift di outlet yang berbeda.

**T: Bagaimana jika karyawan lupa PIN?**
J: Owner atau Manager bisa membuat PIN baru melalui menu Edit karyawan. Field PIN saat edit bersifat opsional — kosongkan jika tidak ingin mengubah, atau isi 6 digit baru untuk mengganti.

**T: Apakah karyawan bisa mengubah role sendiri?**
J: Tidak. Perubahan role hanya bisa dilakukan oleh karyawan dengan role yang lebih tinggi. Kasir tidak bisa mengubah role-nya sendiri menjadi Manager.

**T: Bagaimana cara menonaktifkan akun karyawan?**
J: Buka halaman Edit karyawan, kemudian toggle off pada switch "Karyawan Aktif". Karyawan yang dinonaktifkan tidak bisa login ke sistem.

### Shift

**T: Apakah wajib buka shift sebelum bertransaksi?**
J: Ya. Kasir harus memulai shift terlebih dahulu sebelum bisa memproses transaksi. Ini memastikan setiap transaksi tercatat dalam konteks shift yang jelas.

**T: Bagaimana jika lupa tutup shift?**
J: Shift yang tidak ditutup akan tetap berjalan. Manager atau Supervisor bisa menutup shift secara manual. Sangat disarankan untuk selalu menutup shift saat selesai bertugas.

**T: Bisakah dua kasir menjalankan shift bersamaan di satu outlet?**
J: Ya, jika outlet memiliki lebih dari satu titik kasir. Setiap kasir menjalankan shift mereka sendiri secara independen.

**T: Apakah data shift bisa diedit setelah ditutup?**
J: Tidak. Shift yang sudah ditutup bersifat final dan tidak bisa diubah. Ini untuk menjaga integritas data audit trail.

### Role dan Permission

**T: Apakah bisa membuat custom role selain 7 yang tersedia?**
J: Saat ini, TiloPOS menyediakan 7 role preset yang mencakup kebutuhan umum UMKM. Custom role belum tersedia.

**T: Apakah Kitchen Staff bisa melihat harga produk?**
J: Tidak. Kitchen Staff hanya bisa mengakses KDS — mereka melihat nama menu dan catatan pesanan, tapi tidak melihat harga atau informasi keuangan.

**T: Apakah Cashier bisa memberikan diskon?**
J: Cashier bisa menerapkan diskon yang sudah dikonfigurasi di sistem (promosi aktif). Untuk diskon ad-hoc, biasanya memerlukan approval dari Supervisor atau Manager tergantung kebijakan bisnis.

### Teknis

**T: Apakah data karyawan bisa diekspor?**
J: Saat ini belum ada fitur export langsung untuk data karyawan. Untuk kebutuhan khusus, hubungi tim support.

**T: Apakah ada log saat karyawan login/logout?**
J: Ya, aktivitas login dan shift tercatat di activity log dan bisa diaudit oleh Manager atau Owner.

**T: Berapa lama data shift history disimpan?**
J: Data shift tersimpan selama akun bisnis aktif. Tidak ada batas waktu retensi untuk data historis.

---

*Butuh bantuan lebih lanjut? Hubungi tim support TiloPOS melalui menu Bantuan di aplikasi.*
