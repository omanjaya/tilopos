# Panduan Pengguna: Modul Layanan TiloPOS

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Membuat Jadwal Appointment](#2-membuat-jadwal-appointment)
3. [Assign Staf ke Layanan](#3-assign-staf-ke-layanan)
4. [Tracking Work Order (Bengkel)](#4-tracking-work-order-bengkel)
5. [Input Item Laundry (Item Tracking)](#5-input-item-laundry-item-tracking)
6. [Update Status dan Notifikasi Pelanggan](#6-update-status-dan-notifikasi-pelanggan)
7. [FAQ (Pertanyaan yang Sering Diajukan)](#7-faq)

---

## 1. Pendahuluan

Modul Layanan TiloPOS terdiri dari tiga sub-modul yang bisa diaktifkan secara independen sesuai jenis bisnis Anda:

| Sub-modul | Path | Feature Flag | Cocok untuk |
|-----------|------|-------------|-------------|
| Appointments | `/app/appointments` | `appointments` | Salon, klinik, spa |
| Work Orders | `/app/work-orders` | `work_orders` | Bengkel, service elektronik |
| Item Tracking | `/app/item-tracking` | `item_tracking` | Laundry, dry cleaning |

**Prasyarat:**
- Login dengan akun yang memiliki role Cashier ke atas.
- Outlet harus sudah dikonfigurasi.
- Feature flag yang sesuai harus diaktifkan untuk bisnis Anda.
- Untuk Appointments dan Work Orders, pastikan outlet sudah dipilih di header aplikasi.

---

## 2. Membuat Jadwal Appointment

### 2.1 Membuka Halaman Appointments

1. Klik menu **Appointments** di sidebar navigasi.
2. Halaman menampilkan jadwal appointment untuk tanggal yang dipilih.
3. Jika belum ada outlet yang dipilih, halaman akan menampilkan pesan untuk memilih outlet terlebih dahulu.

### 2.2 Memilih Tanggal

1. Di bagian atas halaman, terdapat date picker.
2. Klik atau ubah tanggal untuk melihat appointment pada hari tersebut.
3. Badge di samping date picker menampilkan jumlah appointment pada tanggal yang dipilih.

### 2.3 Membuat Appointment Baru

1. Klik tombol **Buat Appointment** di pojok kanan atas halaman.
2. Form pembuatan appointment akan muncul di bawah header.
3. Isi field-field berikut:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| Nama Layanan | Ya | Contoh: "Potong Rambut", "Hair Coloring", "Facial Treatment" |
| Harga Layanan | Ya | Harga dalam Rupiah (angka saja, tanpa titik/koma) |
| Jam Mulai | Ya | Format HH:MM (contoh: 09:30, 14:00) |
| Durasi (menit) | Ya | Estimasi durasi layanan dalam menit (default: 60) |
| Nama Pelanggan | Tidak | Nama pelanggan (opsional, bisa diisi nanti) |
| No. Telepon | Tidak | Nomor telepon pelanggan untuk konfirmasi/reminder |
| Catatan | Tidak | Catatan khusus (misalnya: "Alergi pewarna tertentu") |

4. Klik **Simpan** untuk membuat appointment.
5. Notifikasi "Appointment berhasil dibuat" akan muncul jika berhasil.
6. Appointment baru akan langsung muncul di daftar jadwal hari itu.

### 2.4 Memahami Tampilan Appointment

Setiap appointment ditampilkan sebagai kartu horizontal dengan informasi:
- **Jam mulai** dan **durasi** di sisi kiri.
- **Garis vertikal berwarna** yang menunjukkan status (biru=dijadwalkan, hijau=dikonfirmasi, kuning=berlangsung, abu=selesai, merah=dibatalkan).
- **Nama layanan** dan **harga** di tengah.
- **Data pelanggan** (nama dan telepon) jika diisi.
- **Badge status** dan **tombol aksi** di sisi kanan.

### 2.5 Mengubah Status Appointment

Setiap appointment memiliki tombol aksi sesuai statusnya:

| Status Saat Ini | Aksi yang Tersedia |
|-----------------|-------------------|
| Dijadwalkan (scheduled) | **Konfirmasi** -- ubah ke "Dikonfirmasi" |
| Dijadwalkan (scheduled) | **Batalkan** (tombol X merah) |
| Dikonfirmasi (confirmed) | **Mulai** -- ubah ke "Berlangsung" |
| Dikonfirmasi (confirmed) | **Batalkan** (tombol X merah) |
| Berlangsung (in_progress) | **Selesai** -- ubah ke "Selesai" |

Klik tombol aksi yang sesuai untuk mengubah status. Perubahan langsung tersimpan dan badge status berubah otomatis.

### 2.6 Alur Appointment yang Direkomendasikan

```
Pelanggan booking --> [Dijadwalkan]
                          |
                   Konfirmasi via telepon/WA
                          |
                     [Dikonfirmasi]
                          |
                   Pelanggan datang, layanan dimulai
                          |
                     [Berlangsung]
                          |
                   Layanan selesai
                          |
                      [Selesai]
```

Jika pelanggan tidak datang: ubah status ke `no_show` melalui API.
Jika pelanggan membatalkan: klik tombol X merah untuk membatalkan.

---

## 3. Assign Staf ke Layanan

### 3.1 Konsep

Setiap appointment bisa dihubungkan dengan seorang karyawan (employee) yang bertanggung jawab untuk layanan tersebut. Fitur ini berguna untuk:

- Melihat jadwal per karyawan.
- Menghindari double-booking (satu staf di-assign ke dua layanan di waktu yang sama).
- Menganalisis produktivitas per karyawan.

### 3.2 Cara Assign Staf

Saat ini, assignment staf dilakukan melalui API backend:

1. **Saat membuat appointment**: sertakan `employeeId` dalam request body ke endpoint `POST /api/v1/appointments`.
2. **Update appointment yang sudah ada**: gunakan endpoint `PUT /api/v1/appointments/:id` dengan `employeeId`.

### 3.3 Cek Ketersediaan Staf

Sebelum assign staf ke appointment, Anda bisa mengecek apakah staf tersebut tersedia:

1. Gunakan endpoint `GET /api/v1/appointments/availability`.
2. Kirim parameter: `outletId`, `employeeId`, `startTime`, `durationMinutes`.
3. Sistem akan memeriksa apakah ada appointment lain yang overlap (status scheduled, confirmed, atau in_progress).
4. Response: `{ "available": true }` atau `{ "available": false }`.

### 3.4 Melihat Jadwal per Staf

Gunakan endpoint `GET /api/v1/appointments/employee/:employeeId` dengan parameter `startDate` dan `endDate` untuk melihat semua appointment yang di-assign ke staf tertentu dalam rentang tanggal.

---

## 4. Tracking Work Order (Bengkel)

### 4.1 Membuka Halaman Work Orders

1. Klik menu **Work Orders** di sidebar navigasi.
2. Halaman menampilkan daftar work order untuk outlet yang dipilih.
3. Di bagian atas terdapat tombol **Work Order Baru** dan filter pencarian/status.

### 4.2 Membuat Work Order Baru

1. Klik tombol **Work Order Baru**.
2. Form pembuatan akan muncul. Isi field-field berikut:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| Judul Pekerjaan | Ya | Contoh: "Service AC", "Ganti LCD", "Tune Up Motor" |
| Deskripsi Barang | Tidak | Deskripsi barang yang diterima (contoh: "Laptop Asus") |
| Merk | Tidak | Merk barang (contoh: "Asus") |
| Model | Tidak | Model barang (contoh: "ROG Zephyrus G14") |
| Serial Number | Tidak | Nomor seri barang (untuk identifikasi unik) |
| Estimasi Biaya | Tidak | Perkiraan biaya total dalam Rupiah |
| Nama Pelanggan | Tidak | Nama pelanggan pemilik barang |
| No. Telepon | Tidak | Nomor telepon pelanggan |
| Catatan | Tidak | Catatan tambahan |

3. Klik **Buat Work Order**.
4. Sistem akan membuat work order dengan nomor otomatis (format: `WO-YYYYMMDD-0001`).
5. Notifikasi "Work order berhasil dibuat" akan muncul.

### 4.3 Melihat Daftar Work Order

Daftar work order ditampilkan sebagai kartu-kartu yang menampilkan:
- **Ikon kunci pas** sebagai indikator visual.
- **Judul pekerjaan** dan **nomor WO**.
- **Tanggal pembuatan** dan **nama pelanggan** (jika ada).
- **Badge status** (Menunggu / Dikerjakan / Tunggu Sparepart / Selesai / Diserahkan / Dibatalkan).
- **Estimasi biaya** di sisi kanan.

### 4.4 Filter dan Pencarian

- **Pencarian**: ketik di kolom pencarian untuk mencari berdasarkan nomor WO, judul, nama pelanggan, telepon, deskripsi barang, atau serial number.
- **Filter status**: gunakan dropdown status untuk memfilter work order berdasarkan status tertentu.

### 4.5 Melihat Detail Work Order

1. Klik pada kartu work order yang ingin dilihat detailnya.
2. Halaman detail menampilkan:
   - **Header**: judul, nomor WO, dan badge status.
   - **Deskripsi** pekerjaan (jika ada).
   - **Info Barang**: deskripsi, merk, model, serial number.
   - **Diagnosis**: jika sudah diisi.
   - **Data Pelanggan**: nama dan telepon.
   - **Biaya**: estimasi biaya dan biaya akhir (jika sudah ditentukan).
   - **Rincian Biaya (Items)**: daftar item biaya (jasa, sparepart, dll) dengan tipe, subtotal, dan badge tipe.
   - **Tombol aksi** untuk mengubah status ke tahap berikutnya.
3. Klik **Kembali** untuk kembali ke daftar.

### 4.6 Mengubah Status Work Order

Dari halaman detail, gunakan tombol aksi:

| Status Saat Ini | Tombol | Status Selanjutnya |
|-----------------|--------|-------------------|
| Menunggu (pending) | **Mulai Kerjakan** | Dikerjakan (in_progress) |
| Dikerjakan (in_progress) | **Selesai** | Selesai (completed) |
| Selesai (completed) | **Serahkan** | Diserahkan (delivered) |

Status "Tunggu Sparepart" dan "Dibatalkan" bisa diset melalui API.

Timestamp dicatat otomatis:
- Status `completed`: `completedAt` dicatat.
- Status `delivered`: `deliveredAt` dicatat.

### 4.7 Alur Work Order yang Direkomendasikan

```
Pelanggan datang dengan barang --> [Menunggu]
                                       |
                                Teknisi mulai kerjakan
                                       |
                                  [Dikerjakan]
                                       |
                    Perlu sparepart? --> [Tunggu Sparepart] --> dapat sparepart --> [Dikerjakan]
                                       |
                                 Pekerjaan selesai
                                       |
                                   [Selesai]
                                       |
                              Pelanggan ambil barang
                                       |
                                  [Diserahkan]
```

---

## 5. Input Item Laundry (Item Tracking)

### 5.1 Membuka Halaman Item Tracking

1. Klik menu **Item Tracking** di sidebar navigasi.
2. Halaman menampilkan empat tab: **Aktif**, **Semua**, **Cek Tiket**, dan **Terima Baru**.
3. Default menampilkan tab Aktif (item yang sedang dalam proses).

### 5.2 Menerima Item Baru

1. Klik tombol **Terima Item** di pojok kanan atas, atau klik tab **Terima Baru**.
2. Form penerimaan item akan muncul. Isi field-field berikut:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| Nama Item | Ya | Contoh: "Kemeja Putih", "Jas Hitam", "Sepatu Sneakers" |
| Jumlah | Tidak | Jumlah item (default: 1) |
| Nama Layanan | Ya | Contoh: "Cuci Setrika", "Dry Clean", "Cuci Sepatu" |
| Harga Layanan | Ya | Harga dalam Rupiah |
| Estimasi Selesai | Tidak | Tanggal dan waktu estimasi selesai (format datetime) |
| Deskripsi Item (opsional) | Tidak | Catatan kondisi item (contoh: "Noda di bagian depan") |
| Nama Pelanggan | Tidak | Nama pelanggan pemilik item |
| No. Telepon | Tidak | Nomor telepon pelanggan |
| Catatan | Tidak | Catatan tambahan |

3. Klik **Terima Item**.
4. Sistem akan membuat item dengan nomor tiket otomatis (format: `TK-YYYYMMDD-0001`).
5. Notifikasi "Item diterima! Tiket: TK-XXXXXXXX-XXXX" akan muncul.
6. Nomor tiket ini yang diberikan ke pelanggan untuk tracking.

### 5.3 Melihat Item Aktif

Tab **Aktif** menampilkan semua item yang sedang dalam proses (status: received, processing, ready).

Setiap kartu item menampilkan:
- **Ikon paket** sebagai indikator visual.
- **Nama item** dan **nomor tiket** (badge).
- **Nama layanan**, **harga**, dan **quantity**.
- **Data pelanggan** (jika diisi).
- **Badge status** berwarna (biru=Diterima, kuning=Diproses, hijau=Siap Ambil).
- **Tombol aksi** untuk update status ke tahap berikutnya.

### 5.4 Update Status Item

Dari kartu item di tab Aktif atau Semua, klik tombol aksi:

| Status Saat Ini | Tombol | Status Selanjutnya |
|-----------------|--------|-------------------|
| Diterima (received) | **Proses** | Diproses (processing) |
| Diproses (processing) | **Siap** | Siap Ambil (ready) |
| Siap Ambil (ready) | **Serahkan** | Diserahkan (delivered) |

Setiap perubahan status mencatat timestamp:
- `processedAt` -- saat mulai diproses.
- `readyAt` -- saat item siap diambil.
- `deliveredAt` -- saat item diserahkan ke pelanggan.

### 5.5 Melihat Semua Item

Tab **Semua** menampilkan semua item (termasuk yang sudah delivered dan cancelled) dengan fitur:
- **Pencarian**: cari berdasarkan nama item, nomor tiket, atau nama pelanggan.
- **Filter status**: filter berdasarkan status tertentu.

### 5.6 Cek Status via Nomor Tiket

Tab **Cek Tiket** berguna ketika pelanggan datang untuk mengecek status item:

1. Klik tab **Cek Tiket**.
2. Masukkan nomor tiket (contoh: `TK-20260220-0003`) di kolom pencarian.
3. Klik tombol **Cek** atau tekan Enter.
4. Jika ditemukan, kartu item akan ditampilkan lengkap dengan status terkini.
5. Jika tidak ditemukan, pesan "Tiket tidak ditemukan" akan muncul.

### 5.7 Alur Item Tracking yang Direkomendasikan

```
Pelanggan serahkan cucian --> [Diterima] --> berikan nomor tiket ke pelanggan
                                  |
                           Mulai proses cuci
                                  |
                             [Diproses]
                                  |
                         Cucian selesai, dilipat
                                  |
                           [Siap Ambil] --> hubungi pelanggan
                                  |
                         Pelanggan ambil + bayar
                                  |
                           [Diserahkan]
```

---

## 6. Update Status dan Notifikasi Pelanggan

### 6.1 Prinsip Umum Update Status

Semua tiga sub-modul mengikuti pola yang sama:
1. Status diubah melalui tombol aksi di kartu/detail.
2. Perubahan langsung tersimpan ke database.
3. Timestamp dicatat otomatis untuk setiap perubahan.
4. Notifikasi sukses muncul di UI setelah update berhasil.

### 6.2 Notifikasi ke Pelanggan

Saat ini, TiloPOS mencatat data pelanggan (nama dan nomor telepon) di setiap appointment, work order, dan item. Notifikasi ke pelanggan bisa dilakukan secara manual menggunakan data yang tercatat:

- **Appointment**: hubungi pelanggan untuk konfirmasi 1 hari sebelum jadwal.
- **Work Order**: hubungi pelanggan ketika status berubah ke "Selesai" agar segera mengambil barang.
- **Item Tracking**: hubungi pelanggan ketika status berubah ke "Siap Ambil".

Integrasi SMS/WhatsApp otomatis akan tersedia di versi mendatang.

### 6.3 Tips Notifikasi Efektif

- Selalu catat nomor telepon pelanggan -- ini kunci untuk follow-up.
- Untuk appointment, konfirmasi H-1 dapat menurunkan no-show rate hingga 50%.
- Untuk work order dan item tracking, informasikan nomor tiket/WO kepada pelanggan agar mereka bisa tracking mandiri.
- Manfaatkan fitur "Cek Tiket" di Item Tracking untuk pelanggan yang datang langsung ke toko.

---

## 7. FAQ

### Q: Apakah saya bisa menggunakan Appointments tanpa Work Orders atau Item Tracking?
**A:** Ya. Setiap sub-modul dikontrol oleh feature flag terpisah. Anda bisa mengaktifkan hanya `appointments` tanpa `work_orders` atau `item_tracking`, dan sebaliknya.

### Q: Bagaimana jika appointment bentrok (overlap)?
**A:** Jika menggunakan API `checkAvailability`, sistem akan memeriksa overlap antara appointment untuk staf yang sama di outlet yang sama. Appointment yang waktu mulai/selesainya bertabrakan dengan appointment lain (status scheduled, confirmed, atau in_progress) akan ditandai sebagai tidak tersedia.

### Q: Bisakah satu pelanggan memiliki beberapa appointment di hari yang sama?
**A:** Ya. Tidak ada batasan jumlah appointment per pelanggan per hari. Misalnya, pelanggan bisa booking "Potong Rambut" jam 10:00 dan "Hair Coloring" jam 11:00.

### Q: Bagaimana cara menambah rincian biaya (items) ke work order?
**A:** Saat ini melalui API endpoint `POST /api/v1/work-orders/:id/items`. Kirim data: description, type (contoh: "jasa" atau "sparepart"), quantity, dan unitPrice. Subtotal akan dihitung otomatis (quantity x unitPrice).

### Q: Apakah nomor tiket item tracking bisa dicetak?
**A:** Nomor tiket sudah otomatis di-generate dalam format standar (TK-YYYYMMDD-XXXX). Fitur cetak struk tiket bisa dikonfigurasi melalui printer receipt yang terhubung ke POS.

### Q: Bagaimana jika pelanggan kehilangan nomor tiket?
**A:** Staf bisa mencari item di tab "Semua" menggunakan pencarian berdasarkan nama pelanggan, nama item, atau nomor telepon. Tab "Semua" mendukung pencarian full-text.

### Q: Apakah data pelanggan di appointment/work order terhubung ke modul Pelanggan?
**A:** Ya. Appointment dan Work Order mendukung `customerId` yang menghubungkan ke tabel customer di database. Jika customerId diisi, data pelanggan (nama, telepon, email) otomatis terhubung. Jika customerId tidak diisi, data pelanggan dicatat langsung di field `customerName` dan `customerPhone`.

### Q: Bisakah pelanggan booking appointment secara online sendiri?
**A:** Saat ini appointment dibuat oleh staf melalui dashboard. Fitur self-booking oleh pelanggan (mirip Fresha atau Booksy) ada di roadmap pengembangan.

### Q: Bagaimana cara melacak produktivitas staf dari data appointment?
**A:** Gunakan endpoint `GET /api/v1/appointments/employee/:employeeId` untuk mendapatkan semua appointment per staf dalam rentang tanggal tertentu. Dari data ini bisa dihitung: jumlah layanan, total jam kerja, dan pendapatan per staf.

### Q: Apakah work order mendukung upload foto barang?
**A:** Saat ini work order belum mendukung upload foto langsung. Foto bisa dilampirkan melalui catatan (notes) dengan link ke foto yang di-upload terpisah. Fitur upload foto langsung ada di roadmap pengembangan.
