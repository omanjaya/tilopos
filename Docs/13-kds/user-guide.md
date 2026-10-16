# Panduan Pengguna: Kitchen Display System (KDS)

Panduan lengkap untuk menggunakan Kitchen Display System TiloPOS di dapur Anda.

---

## Daftar Isi

1. [Setup KDS](#1-setup-kds)
2. [Tampilan Utama KDS](#2-tampilan-utama-kds)
3. [Menerima Pesanan Baru](#3-menerima-pesanan-baru)
4. [Update Status Pesanan](#4-update-status-pesanan)
5. [Menggunakan Timer](#5-menggunakan-timer)
6. [Filter per Station](#6-filter-per-station)
7. [Bump dan Recall Order](#7-bump-dan-recall-order)
8. [Melihat Statistik Harian](#8-melihat-statistik-harian)
9. [Mengatur Timer SLA](#9-mengatur-timer-sla)
10. [Tips: Layout Dapur Optimal dan Workflow Efisien](#10-tips-layout-dapur-optimal-dan-workflow-efisien)
11. [FAQ (Pertanyaan yang Sering Diajukan)](#11-faq)

---

## 1. Setup KDS

### Prasyarat

Sebelum menggunakan KDS, pastikan hal-hal berikut sudah dilakukan:

1. **Fitur Kitchen Display aktif:**
   - Buka **Pengaturan > Fitur**
   - Cari fitur "Kitchen Display" di kategori Layanan
   - Pastikan toggle dalam posisi aktif

2. **Role karyawan sesuai:**
   - Karyawan yang akan mengoperasikan KDS memerlukan akun dengan akses yang sesuai
   - Role yang bisa mengakses KDS: Owner, Manager, Kitchen Staff

3. **Perangkat tersedia:**
   - KDS berjalan di browser web (Chrome, Firefox, Safari, Edge)
   - Perangkat yang disarankan: tablet (10 inch ke atas), monitor dengan mini-PC, atau laptop
   - Koneksi jaringan ke server TiloPOS diperlukan

### Langkah Aktivasi

1. Buka browser di perangkat dapur
2. Akses URL TiloPOS dan tambahkan `/kds` di akhir (contoh: `https://app.tilopos.com/kds`)
3. Login dengan akun karyawan
4. Sistem otomatis memilih outlet berdasarkan assignment karyawan
5. KDS langsung menampilkan pesanan yang sedang aktif

### Catatan Teknis

- KDS menggunakan koneksi WebSocket ke namespace `/kds` untuk update real-time
- Jika WebSocket terputus, sistem fallback ke polling setiap 10 detik
- Koneksi WebSocket otomatis reconnect dengan delay 1-5 detik jika terputus
- Autentikasi menggunakan JWT token yang sama dengan login POS

---

## 2. Tampilan Utama KDS

KDS menggunakan layout fullscreen tanpa sidebar, dioptimalkan untuk layar dapur.

### Komponen Layar

**Header (Bagian Atas):**
- Nama outlet yang aktif
- Jumlah pesanan aktif (menunggu + diproses)
- Jam real-time (diperbarui setiap detik)
- Tombol **Kembali** untuk navigasi ke dashboard
- Tombol **Refresh** untuk memperbarui data secara manual

**Stats Bar (Statistik Dapur):**
- Antrian Pesanan — jumlah pesanan yang sedang dikerjakan
- Rata-rata Persiapan — waktu rata-rata penyelesaian (menit)
- Selesai Hari Ini — total pesanan yang sudah selesai
- Pesanan Terlambat — jumlah pesanan yang melewati SLA
- Bisa di-collapse (lipat) dengan klik untuk menghemat ruang layar
- Auto-refresh setiap 30 detik

**Filter Bar:**
- Tab filter: **Semua**, **Menunggu**, **Diproses**, **Siap**
- Setiap tab menampilkan jumlah pesanan di badge
- Tab aktif ditandai dengan warna oranye

**Area Utama (Grid Pesanan):**
- Kartu pesanan ditampilkan dalam grid responsive
- Pesanan aktif (belum selesai) ditampilkan terlebih dulu
- Pesanan selesai ditampilkan di bagian bawah dengan label "Selesai"

**Empty States:**
- **Loading:** Indikator loading saat data sedang dimuat
- **Error:** Pesan error dengan tombol retry
- **Tidak ada pesanan:** Pesan "Tidak ada pesanan" saat antrian kosong
- **Filter kosong:** Pesan "Tidak ada pesanan dengan filter ini" dengan tombol "Tampilkan Semua"

### Tampilan Kartu Pesanan

Setiap kartu pesanan menampilkan:

```
[Progress Bar - hijau, menunjukkan persentase item selesai]
+---------------------------------------------------+
| #001     [Meja 5]  [dine_in]  [VIP]     [05:23]  |
| 2/4 item selesai                                   |
+---------------------------------------------------+
| Nasi Goreng x1                        [Bump]      |
| Es Teh Manis x2                       [Bump]      |
| Ayam Bakar x1                         [Selesai]   |
| Sop Buntut x1                         [Selesai]   |
+---------------------------------------------------+
|           [Beritahu Kasir] (jika semua selesai)    |
+---------------------------------------------------+
```

**Elemen kartu:**
- **Nomor pesanan:** "#001" — nomor urut pesanan
- **Nama meja:** Badge biru menunjukkan meja (jika dine-in)
- **Tipe pesanan:** Badge abu-abu (dine_in, takeaway, delivery)
- **Badge prioritas:** VIP (emas), Urgent (oranye), atau tidak ada untuk Normal
- **Timer:** Cooking timer dengan warna sesuai fase
- **Progress bar:** Bar hijau di atas kartu menunjukkan persentase item selesai
- **Progress text:** "2/4 item selesai"
- **Daftar item:** Setiap item dengan nama, jumlah, dan tombol aksi
- **Warna border:** Berubah sesuai waktu elapsed (hijau > kuning > merah)

---

## 3. Menerima Pesanan Baru

### Alur Pesanan Masuk

1. Kasir menyelesaikan transaksi di POS
2. Event `order:new` dikirim via WebSocket ke layar KDS
3. KDS otomatis menampilkan pesanan baru di grid
4. Efek suara notifikasi berbunyi untuk menarik perhatian koki

### Informasi yang Ditampilkan

Setiap pesanan baru menampilkan:
- Nomor pesanan (untuk identifikasi)
- Nama meja (jika dine-in)
- Tipe pesanan (dine-in / takeaway / delivery)
- Prioritas (VIP / Urgent / Normal)
- Daftar semua item yang perlu disiapkan
- Modifier dan catatan khusus per item (jika ada)
- Timer yang mulai berjalan dari 00:00

### Urutan Pesanan

Pesanan ditampilkan dengan urutan:
1. **VIP** paling atas
2. **Urgent** berikutnya
3. **Normal** di bawah
4. Dalam masing-masing prioritas, pesanan yang **paling lama menunggu** ditampilkan lebih dulu

---

## 4. Update Status Pesanan

### Alur Status

Setiap item pesanan melewati alur status berikut:

```
Pending (Menunggu) --> Preparing (Diproses) --> Ready (Siap) --> Served (Disajikan)
```

### Cara Update Status

**Dari Pending ke Preparing:**
- Item yang baru masuk berstatus "pending"
- Saat koki mulai mengerjakan item, klik item tersebut atau gunakan API `PUT /kds/items/:id/preparing`
- Status berubah menjadi "preparing" dengan timestamp `startedAt`

**Dari Preparing ke Ready (Bump):**
- Saat item selesai dimasak, klik tombol **Bump** di sebelah kanan item
- Item bertanda centang (selesai) dan status berubah ke "ready"
- Jika semua item dalam satu pesanan sudah "ready", status pesanan otomatis berubah ke "ready"

**Notify Cashier:**
- Saat semua item dalam pesanan sudah selesai, muncul tombol **"Beritahu Kasir"**
- Klik tombol ini untuk mengirim notifikasi real-time ke POS kasir
- Kasir menerima event `order:ready` via WebSocket
- Toast notification muncul: "Order #001 siap disajikan — Kasir telah diberitahu."

---

## 5. Menggunakan Timer

### Cooking Timer

Setiap kartu pesanan yang belum selesai menampilkan cooking timer di pojok kanan atas header.

**Format:** `MM:SS` (menit:detik)

**Tiga fase warna:**

| Fase | Warna | Kondisi | Arti |
|------|-------|---------|------|
| On-track | Hijau | < 50% target SLA | Masih aman, waktu cukup |
| Warning | Kuning | 50-100% target SLA | Perlu dipercepat |
| Overdue | Merah berkedip | > 100% target SLA | Terlambat, segera selesaikan |

**Contoh dengan target 15 menit:**
- 0:00 - 7:29 = Hijau (on-track)
- 7:30 - 14:59 = Kuning (warning)
- 15:00+ = Merah berkedip (overdue), dengan tambahan waktu keterlambatan ditampilkan: `15:23 (+0:23)`

### Order Timer (untuk pesanan selesai)

Pesanan yang sudah selesai menampilkan waktu total elapsed (berapa menit dari pesanan masuk sampai semua item selesai).

### Warna Border Kartu

Selain timer, border kartu pesanan juga berubah warna sesuai waktu elapsed. Kartu pesanan VIP yang belum selesai mendapatkan efek shadow tambahan.

---

## 6. Filter per Station

### Menggunakan Filter Status

Di bagian filter bar, klik tab untuk memfilter pesanan:

| Tab | Menampilkan |
|-----|------------|
| **Semua** | Semua pesanan (aktif + selesai) |
| **Menunggu** | Pesanan yang semua itemnya masih pending |
| **Diproses** | Pesanan yang sebagian itemnya sedang diproses |
| **Siap** | Pesanan yang semua itemnya sudah ready/served |

Badge angka di setiap tab menunjukkan jumlah pesanan di kategori tersebut (dihitung dari total, bukan dari hasil filter).

### Filter per Kitchen Station (via API)

Untuk dapur dengan multiple station, KDS bisa difilter berdasarkan station menggunakan query parameter:

- Station yang tersedia: `grill`, `fryer`, `cold`, `hot`, `drinks`, `dessert`, `general`
- WebSocket mendukung join/leave station: `joinStation` dan `leaveStation` events
- Setiap layar KDS bisa di-assign ke station tertentu sehingga hanya menampilkan pesanan yang relevan

### Setup Multi-Station

Untuk menggunakan station filtering:
1. Pastikan produk di menu sudah di-assign ke station yang sesuai (field `station` pada order item)
2. Buka KDS di setiap layar station
3. Join ke station yang relevan via WebSocket
4. Setiap layar hanya menampilkan item dari station tersebut

---

## 7. Bump dan Recall Order

### Bump (Tandai Selesai)

**Fungsi:** Menandai item pesanan sebagai selesai dimasak.

**Cara:**
1. Temukan pesanan di grid KDS
2. Klik tombol **Bump** (ikon centang) di sebelah kanan item yang sudah selesai
3. Item berubah status menjadi "ready" dengan timestamp `completedAt`
4. Progress bar pada kartu pesanan bertambah
5. Toast notification muncul: "Item selesai"

**Catatan penting:**
- Bump dilakukan per item, bukan per pesanan
- Saat semua item di-bump, pesanan otomatis berstatus "ready"
- Operasi bump menggunakan database transaction untuk mencegah race condition saat beberapa item di-bump secara bersamaan

### Recall (Kirim Ulang ke Dapur)

**Fungsi:** Mengirim item yang sudah ditandai "ready" kembali ke status "preparing" untuk dibuat ulang.

**Kapan digunakan:**
- Item salah masak dan perlu dibuat ulang
- Item jatuh atau rusak sebelum disajikan
- Pelanggan meminta perubahan setelah item selesai

**Cara:**
1. Temukan item yang perlu di-recall
2. Gunakan API `PUT /kds/items/:id/recall` dengan body `{ reason: "alasan" }`
3. Item kembali ke status "preparing" dengan catatan "RECALLED: [alasan]"

---

## 8. Melihat Statistik Harian

### Stats Bar (di layar KDS)

Panel statistik di bagian atas layar menampilkan 4 metrik utama:

| Metrik | Ikon | Warna | Keterangan |
|--------|------|-------|-----------|
| Antrian Pesanan | Jam | Biru | Jumlah pesanan aktif (belum selesai) |
| Rata-rata Persiapan | Chart | Ungu | Waktu rata-rata penyelesaian pesanan (menit) |
| Selesai Hari Ini | Centang | Hijau | Total pesanan yang semua itemnya sudah selesai |
| Pesanan Terlambat | Peringatan | Merah (jika > 0) | Pesanan yang melewati target SLA |

**Interaksi:**
- Klik header "Statistik Dapur" untuk collapse/expand panel
- Klik ikon refresh untuk memperbarui data
- Auto-refresh setiap 30 detik
- Timestamp "Update: HH:mm:ss" menunjukkan kapan data terakhir diperbarui

### Analytics Detail (via API)

Untuk analisis yang lebih mendalam, tersedia endpoint analytics:

**`GET /api/v1/kds/analytics?outletId=xxx`**

Data yang tersedia:
- Total pesanan hari ini
- Pesanan selesai hari ini
- Rata-rata waktu persiapan (menit)
- Jumlah pesanan overdue
- **Pesanan per jam:** Grafik distribusi pesanan sepanjang hari (0-23 jam)
- **Pesanan per station:** Jumlah item dan rata-rata waktu per station
- **Top delayed items:** 10 produk dengan waktu persiapan paling lama

**`GET /api/v1/kds/performance?outletId=xxx&startDate=...&endDate=...`**

Data performa dalam rentang tanggal:
- Total pesanan
- Rata-rata waktu persiapan
- On-time rate (persentase pesanan yang selesai dalam SLA)
- Jumlah pesanan on-time vs terlambat

**`GET /api/v1/kds/overdue?outletId=xxx`**

Daftar pesanan yang melewati SLA, diurutkan dari yang paling terlambat:
- Order ID, nomor, tipe, status
- Waktu elapsed vs SLA
- Selisih keterlambatan (overdueBy)
- Daftar item per pesanan

---

## 9. Mengatur Timer SLA

### Lokasi

Timer SLA bisa diatur melalui API atau pengaturan KDS (role Owner/Manager).

### Target SLA per Tipe Pesanan

| Tipe Pesanan | Default (menit) | Bisa Diubah |
|-------------|-----------------|-------------|
| Dine-in | 15 | Ya |
| Takeaway | 10 | Ya |
| Delivery | 20 | Ya |

### Cara Mengubah

**Via API:**
```
PUT /api/v1/kds/timer-settings
Body: { "dineIn": 15, "takeaway": 10, "delivery": 20 }
```

**Catatan:**
- Hanya Owner dan Manager yang bisa mengubah timer settings
- Perubahan berlaku untuk seluruh bisnis
- Timer pada pesanan yang sudah berjalan tidak terpengaruh — hanya pesanan baru yang menggunakan setting baru
- Default akan digunakan jika belum ada konfigurasi khusus

---

## 10. Tips: Layout Dapur Optimal dan Workflow Efisien

### Penempatan Layar KDS

**Satu layar (dapur kecil):**
- Tempatkan satu tablet/monitor di posisi yang terlihat oleh semua koki
- Gunakan filter "Semua" untuk melihat seluruh pesanan
- Ideal untuk dapur dengan 1-3 koki

**Dua layar (dapur sedang):**
- Layar 1: Station Kitchen (makanan)
- Layar 2: Station Bar/Drinks (minuman)
- Masing-masing filter berdasarkan station
- Ideal untuk kafe dan restoran casual

**Tiga layar atau lebih (dapur besar):**
- Satu layar per station (grill, hot, cold, drinks, dll)
- Satu layar overview di area expeditor/head chef
- Ideal untuk restoran fine dining dan hotel

### Workflow yang Disarankan

**Workflow Dasar:**
1. Pesanan masuk (notifikasi bunyi) --> Koki melihat pesanan baru
2. Koki mulai memasak --> Update status ke "preparing"
3. Item selesai --> Klik Bump
4. Semua item selesai --> Klik "Beritahu Kasir"
5. Kasir menerima notifikasi --> Sajikan ke pelanggan

**Tips Efisiensi:**
- **Prioritaskan VIP dan Urgent:** Selalu kerjakan pesanan dengan badge VIP/Urgent terlebih dulu
- **Perhatikan timer:** Pesanan dengan timer kuning harus segera diprioritaskan sebelum menjadi merah
- **Batch cooking:** Jika ada beberapa pesanan dengan item yang sama, masak sekaligus dan bump satu per satu
- **Recall segera:** Jika ada item yang perlu dibuat ulang, recall segera agar timer tracking tetap akurat
- **Collapse stats bar:** Saat jam sibuk, collapse panel statistik untuk memperbesar area tampilan pesanan
- **Gunakan filter:** Saat antrian panjang, gunakan filter "Menunggu" untuk fokus pada pesanan yang belum dikerjakan

### Ukuran Layar yang Disarankan

| Perangkat | Ukuran | Cocok Untuk |
|-----------|--------|------------|
| Tablet 10" | 10-11 inch | Station individual, dapur kecil |
| Tablet 12" | 12-13 inch | Station dengan volume sedang |
| Monitor 22" | 21-24 inch | Station utama, area expeditor |
| TV 32"+ | 32+ inch | Overview display, dapur besar |

---

## 11. FAQ

### Setup dan Akses

**Q: Apakah KDS membutuhkan instalasi aplikasi khusus?**
A: Tidak. KDS berjalan sepenuhnya di browser web. Cukup buka URL TiloPOS dengan path `/kds` di perangkat apapun yang memiliki browser modern.

**Q: Perangkat apa yang paling cocok untuk KDS?**
A: Tablet Android 10 inch ke atas atau monitor dengan mini-PC. Pastikan layar memiliki kontras yang baik agar terbaca di lingkungan dapur yang terang.

**Q: Apakah KDS bisa diakses oleh beberapa perangkat sekaligus?**
A: Ya. Tidak ada batasan jumlah perangkat KDS yang terhubung. Setiap perangkat bisa di-assign ke station yang berbeda.

**Q: Bagaimana jika internet terputus?**
A: KDS memiliki fallback polling setiap 10 detik. Jika WebSocket terputus, koneksi otomatis direconnect. Pesanan yang sudah dimuat tetap tampil di layar. Pesanan baru akan muncul saat koneksi pulih.

### Penggunaan

**Q: Apakah koki harus login ke KDS?**
A: Ya, login diperlukan untuk autentikasi dan menentukan outlet. Setelah login, KDS berjalan terus tanpa perlu login ulang selama sesi aktif.

**Q: Bagaimana jika ada pesanan yang tidak muncul di KDS?**
A: Klik tombol Refresh di header. Jika masih tidak muncul, periksa apakah filter station atau status sedang aktif. Klik tab "Semua" untuk menampilkan seluruh pesanan.

**Q: Apakah suara notifikasi bisa dimatikan?**
A: Hook `useKdsSound` mengatur suara notifikasi. Saat ini, suara otomatis berbunyi saat ada pesanan baru.

**Q: Bagaimana cara melihat detail pesanan yang sudah lama?**
A: Pesanan yang sudah selesai ditampilkan di bagian bawah grid dengan label "Selesai". Untuk data historis yang lebih lengkap, gunakan laporan di dashboard.

### Teknis

**Q: Berapa sering data KDS diperbarui?**
A: Real-time via WebSocket untuk setiap event (pesanan baru, status berubah, pesanan siap). Sebagai backup, auto-refresh polling terjadi setiap 10 detik. Stats bar refresh setiap 30 detik.

**Q: Apakah bump bisa dibatalkan?**
A: Ya, gunakan fitur Recall untuk mengirim item yang sudah di-bump kembali ke status "preparing". Sertakan alasan recall untuk tracking.

**Q: Apakah KDS memengaruhi performa POS?**
A: Tidak. KDS menggunakan namespace WebSocket terpisah (`/kds`) dan endpoint API terpisah. Rate limiting diterapkan pada koneksi WebSocket (maksimum 20 request per menit per client) untuk mencegah overload.
