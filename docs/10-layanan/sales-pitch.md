# Layanan TiloPOS: POS untuk Bisnis Jasa -- Bukan Cuma Jualan Produk

## Headline

**TiloPOS bukan hanya untuk jualan barang. Bisnis jasa Anda -- salon, bengkel, laundry -- sekarang punya POS yang benar-benar mengerti alur kerja Anda.**

---

## Masalah Bisnis Jasa di Indonesia

Mayoritas POS di pasar dirancang untuk bisnis retail dan F&B: scan barcode, proses pembayaran, selesai. Tapi bisnis jasa memiliki alur kerja yang berbeda secara fundamental:

- **Salon/barbershop** butuh manajemen jadwal (appointment), assign staf ke layanan tertentu, dan tracking durasi.
- **Bengkel/workshop** butuh pencatatan barang masuk (intake), diagnosis, estimasi biaya, tracking sparepart, dan status pengerjaan bertahap.
- **Laundry/dry cleaning** butuh pencatatan item masuk, nomor tiket, tracking status per item, estimasi selesai, dan notifikasi pickup.

Bisnis-bisnis ini terpaksa menggunakan:
- POS retail yang tidak cocok -- fitur appointment dan work order tidak ada.
- Catatan manual di buku/spreadsheet -- rawan hilang, sulit dilacak, tidak bisa diakses dari mana saja.
- Aplikasi terpisah untuk appointment/booking -- data tidak terintegrasi dengan kasir dan laporan keuangan.

---

## Solusi: TiloPOS Layanan

TiloPOS menghadirkan tiga sub-modul layanan yang bisa diaktifkan sesuai jenis bisnis:

### 1. Appointments (Manajemen Jadwal)

**Cocok untuk: Salon, barbershop, klinik kecantikan, spa, klinik hewan, studio foto, konsultan**

Kelola jadwal layanan dan booking pelanggan dalam satu tempat:

- **Tampilan jadwal per tanggal** -- pilih tanggal dan lihat semua appointment untuk hari itu. Setiap appointment menampilkan jam mulai, durasi, nama layanan, harga, dan data pelanggan.
- **Buat appointment dengan cepat** -- isi nama layanan, harga, jam mulai, durasi (dalam menit), dan opsional: data pelanggan (nama, telepon) serta catatan.
- **Status appointment bertahap**:
  - Dijadwalkan (scheduled) -- baru dibuat
  - Dikonfirmasi (confirmed) -- pelanggan sudah konfirmasi kedatangan
  - Berlangsung (in_progress) -- layanan sedang dikerjakan
  - Selesai (completed) -- layanan selesai
  - Dibatalkan (cancelled) -- appointment dibatalkan
  - Tidak Hadir (no_show) -- pelanggan tidak datang
- **Assign staf** -- tentukan karyawan mana yang menangani appointment (backend sudah support `employeeId`).
- **Cek ketersediaan** -- sistem memeriksa apakah staf yang dipilih sudah punya appointment lain di waktu yang bentrok (overlap check menggunakan startTime/endTime).
- **Link ke data pelanggan** -- appointment bisa dihubungkan ke customer yang sudah ada di database, sehingga riwayat kunjungan terlacak.
- **Visual status** -- setiap status memiliki warna indikator (biru=dijadwalkan, hijau=dikonfirmasi, kuning=berlangsung, abu=selesai, merah=dibatalkan/no-show).

### 2. Work Orders (Perintah Kerja)

**Cocok untuk: Bengkel mobil/motor, service elektronik, workshop reparasi, jasa perbaikan AC/mesin**

Tracking pekerjaan dari masuk hingga selesai dan diserahkan:

- **Nomor work order otomatis** -- format `WO-YYYYMMDD-0001` dengan auto-increment harian. Pelanggan bisa tracking menggunakan nomor ini.
- **Data barang masuk lengkap**:
  - Judul pekerjaan (misalnya "Service AC", "Ganti LCD")
  - Deskripsi barang, merk, model, serial number
  - Diagnosis kerusakan
  - Estimasi biaya
  - Data pelanggan (nama, telepon)
- **Status pengerjaan bertahap**:
  - Menunggu (pending) -- baru diterima, belum dikerjakan
  - Dikerjakan (in_progress) -- sedang dalam pengerjaan
  - Tunggu Sparepart (waiting_parts) -- menunggu suku cadang
  - Selesai (completed) -- pekerjaan selesai
  - Diserahkan (delivered) -- barang sudah diambil pelanggan
  - Dibatalkan (cancelled)
- **Rincian biaya (work order items)** -- tambahkan detail biaya per item: deskripsi, tipe (jasa/sparepart), quantity, harga satuan. Subtotal dihitung otomatis.
- **Estimasi biaya vs biaya akhir** -- catat estimasi biaya di awal, dan input biaya akhir setelah pekerjaan selesai. Pelanggan bisa melihat perbandingannya.
- **Prioritas** -- tandai pekerjaan dengan prioritas normal atau urgent.
- **Pencarian** -- cari work order berdasarkan nomor WO, judul, nama pelanggan, telepon, deskripsi barang, atau serial number.
- **Halaman detail** -- klik work order untuk melihat semua informasi lengkap termasuk rincian biaya, tombol update status, dan data pelanggan.

### 3. Item Tracking (Pelacakan Item Pelanggan)

**Cocok untuk: Laundry, dry cleaning, jasa cuci sepatu, jasa setrika, jasa cleaning**

Tracking item pelanggan dari diterima hingga diserahkan kembali:

- **Nomor tiket otomatis** -- format `TK-YYYYMMDD-0001`. Pelanggan mendapat nomor tiket untuk tracking.
- **Penerimaan item**:
  - Nama item (misalnya "Kemeja Putih", "Sepatu Sneakers")
  - Deskripsi item (kondisi, noda, catatan khusus)
  - Jumlah (quantity)
  - Nama layanan (misalnya "Cuci Setrika", "Dry Clean")
  - Harga layanan
  - Estimasi waktu selesai
  - Data pelanggan (nama, telepon)
- **Status tracking bertahap**:
  - Diterima (received) -- item sudah masuk
  - Diproses (processing) -- sedang dikerjakan
  - Siap Ambil (ready) -- sudah selesai, menunggu pelanggan
  - Diserahkan (delivered) -- sudah diambil pelanggan
  - Dibatalkan (cancelled)
- **Empat tab tampilan**:
  - **Aktif** -- item yang sedang dalam proses (received, processing, ready)
  - **Semua** -- semua item dengan filter status dan pencarian
  - **Cek Tiket** -- lookup item berdasarkan nomor tiket (bisa digunakan pelanggan yang datang mengecek status)
  - **Terima Baru** -- form untuk menerima item baru
- **Satu klik update status** -- tombol "Proses", "Siap", "Serahkan" langsung di setiap kartu item. Staf tidak perlu membuka halaman detail.
- **Timestamp otomatis** -- setiap perubahan status dicatat: waktu diterima (receivedAt), waktu diproses (processedAt), waktu siap (readyAt), waktu diserahkan (deliveredAt).

---

## Kenapa TiloPOS Layanan Berbeda?

### Terintegrasi dengan POS, Bukan Aplikasi Terpisah

Semua data layanan (appointment, work order, item tracking) terintegrasi dalam ekosistem TiloPOS. Artinya:

- **Laporan keuangan lengkap** -- pendapatan dari layanan masuk ke laporan omzet yang sama dengan penjualan produk.
- **Data pelanggan terpusat** -- pelanggan yang booking appointment juga bisa melihat riwayat pembelian produk di toko Anda.
- **Satu login, satu dashboard** -- manajer tidak perlu berpindah aplikasi.
- **Multi-tenant** -- semua data tersegmentasi per bisnis (businessId) dan per outlet (outletId).

### Feature Flags -- Aktifkan Hanya yang Dibutuhkan

Tidak semua bisnis jasa butuh semua fitur. TiloPOS menggunakan feature flags:

- `appointments` -- untuk bisnis yang butuh manajemen jadwal (salon, klinik)
- `work_orders` -- untuk bisnis yang butuh tracking pekerjaan (bengkel, workshop)
- `item_tracking` -- untuk bisnis yang butuh tracking item pelanggan (laundry)

Aktifkan satu, dua, atau ketiganya sesuai kebutuhan.

---

## Return on Investment (ROI)

### Untuk Salon/Klinik (Appointments)

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| No-show rate | 20-30% | Turun ke 10-15% dengan konfirmasi dan reminder |
| Double booking | Sering terjadi | Sistem cek overlap otomatis |
| Utilisasi staf | 60-70% | Meningkat ke 80-90% dengan jadwal teroptimasi |
| Waktu scheduling | 5-10 menit per booking | 1-2 menit |
| Riwayat pelanggan | Tidak tercatat | Otomatis tersimpan |

### Untuk Bengkel/Workshop (Work Orders)

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Barang hilang/tertukar | Kadang terjadi | Mendekati nol dengan nomor WO dan tracking |
| Transparansi biaya | Pelanggan komplain | Estimasi vs biaya akhir tercatat jelas |
| Waktu cari info pekerjaan | Buka-buka buku | Pencarian instan by nomor WO/nama/serial |
| Status update ke pelanggan | Manual telepon | Status tercatat, bisa diinformasikan via telepon |
| Billing accuracy | Sering salah hitung | Rincian biaya otomatis dikalkulasi |

### Untuk Laundry (Item Tracking)

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Item hilang/tertukar | 2-5% | Mendekati nol dengan nomor tiket |
| Pelanggan tanya status | 10+ telepon/hari | Staf cek instan via nomor tiket |
| Waktu terima item | 3-5 menit | 1-2 menit (form terstruktur) |
| Pickup tepat waktu | 60-70% | Meningkat dengan estimasi waktu selesai |
| Customer satisfaction | Biasa saja | Meningkat signifikan |

---

## Siapa yang Cocok Menggunakan?

| Tipe Bisnis | Sub-modul | Fitur Utama |
|-------------|-----------|-------------|
| Salon/Barbershop | Appointments | Jadwal, assign staf, cek ketersediaan |
| Klinik Kecantikan | Appointments | Jadwal treatment, durasi, harga per layanan |
| Spa/Massage | Appointments | Booking ruangan + staf |
| Bengkel Mobil/Motor | Work Orders | Intake barang, diagnosis, tracking sparepart |
| Service Elektronik | Work Orders | Serial number tracking, estimasi biaya |
| Workshop Reparasi | Work Orders | Status pengerjaan bertahap |
| Laundry | Item Tracking | Tiket, status cucian, estimasi selesai |
| Dry Cleaning | Item Tracking | Tracking per item, harga per layanan |
| Cuci Sepatu | Item Tracking | Jumlah pasang, status, pickup notification |
| Jasa Cleaning | Item Tracking + Appointments | Jadwal cleaning + tracking item |

---

## Kesimpulan

TiloPOS Layanan mengisi gap yang selama ini diabaikan oleh POS konvensional: bisnis jasa memiliki alur kerja yang sangat berbeda dari retail, dan mereka membutuhkan tools yang memahami itu.

Dengan appointment management, work order tracking, dan item tracking yang terintegrasi langsung dengan POS, TiloPOS memberikan bisnis jasa kemampuan untuk:

- **Mengurangi kesalahan** (barang hilang, double booking, salah hitung)
- **Meningkatkan efisiensi** (scheduling otomatis, status tracking real-time)
- **Menjaga kepuasan pelanggan** (transparansi status, estimasi waktu, riwayat lengkap)
- **Memiliki data terpusat** (semua pendapatan dan aktivitas dalam satu laporan)

**Bisnis jasa Anda layak mendapat POS yang dirancang untuk jasa -- bukan POS retail yang dipaksakan.**
