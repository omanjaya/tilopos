# Manajemen Meja TiloPOS: Kelola Meja Restoran dengan Visual & Real-Time

## Headline

**Ubah cara Anda mengelola meja restoran -- dari papan tulis menjadi denah digital yang hidup.**

TiloPOS Manajemen Meja memberikan Anda kendali penuh atas seluruh lantai restoran Anda melalui antarmuka visual yang intuitif, pelacakan pesanan real-time, dan sistem antrian pelanggan yang cerdas.

---

## Masalah yang Dihadapi Restoran Saat Ini

Pengelolaan meja di restoran Indonesia masih banyak yang mengandalkan cara manual: catatan kertas, papan tulis, atau sekadar ingatan staf. Akibatnya:

- **Meja kosong tidak terdeteksi** -- pelanggan menunggu padahal ada meja tersedia di area lain.
- **Pesanan tertukar** antar meja karena pencatatan manual yang rawan salah.
- **Pelanggan pergi (walkaway)** karena tidak ada kejelasan waktu tunggu.
- **Tagihan berantakan** ketika rombongan ingin membayar terpisah atau menggabungkan tagihan dari beberapa meja.
- **Manajer tidak punya visibilitas** terhadap kondisi restoran secara keseluruhan di waktu sibuk (peak hours).

---

## Solusi: TiloPOS Manajemen Meja

### 1. Denah Meja Visual (Floor Plan Editor)

Buat denah restoran Anda secara digital menggunakan editor drag-and-drop yang mudah digunakan.

- **Desain denah sesuai layout restoran asli** -- posisikan meja di grid visual yang merepresentasikan lantai restoran Anda.
- **Dukung berbagai area/seksi** -- Indoor, Outdoor, Rooftop, VIP, Smoking Area, dan lainnya. Staf bisa filter tampilan berdasarkan area.
- **Bentuk dan kapasitas meja** -- setiap meja menampilkan nama, kapasitas (jumlah kursi), dan status secara visual.
- **Status meja real-time** dengan kode warna:
  - Hijau = Tersedia (available)
  - Merah = Terisi (occupied), lengkap dengan durasi sudah ditempati
  - Biru = Direservasi (reserved)
  - Kuning = Digabung (merged)
  - Abu-abu = Maintenance/Tidak aktif
- **Zoom in/out** untuk navigasi denah yang besar, dan **simpan posisi meja** ke server.
- **Panel detail meja** -- klik meja manapun untuk melihat detail: nama meja, kapasitas, area, status, durasi penggunaan, dan order ID yang sedang berjalan.
- **Ringkasan cepat** (summary footer) menampilkan jumlah meja per status di bagian bawah denah.

### 2. Manajemen Pesanan dari Meja ke Dapur

Pesanan terhubung langsung dengan meja, sehingga alur dari pelanggan duduk hingga makanan disajikan terlacak sepenuhnya.

- **Tracking status pesanan bertahap**: Menunggu (pending) --> Diproses (preparing) --> Siap (ready) --> Disajikan (served) --> Selesai (completed).
- **Setiap perubahan status tercatat** -- kasir, supervisor, atau staf dapur bisa mengubah status pesanan langsung dari tabel pesanan.
- **Detail pesanan lengkap** -- lihat semua item, catatan khusus, nama kasir, dan waktu pemesanan dalam satu halaman detail.
- **Filter dan tab cepat** -- filter pesanan berdasarkan status menggunakan tab: Semua, Menunggu, Diproses, Siap, Disajikan, Selesai.
- **Auto-refresh setiap 30 detik** -- daftar pesanan selalu up-to-date tanpa perlu reload halaman.
- **Keyboard shortcut** -- navigasi antar tab status dengan tombol angka 1-5 untuk efisiensi staf.
- **Integrasi KDS (Kitchen Display System)** -- pesanan yang masuk langsung muncul di layar dapur melalui WebSocket real-time.

### 3. Split Bill & Merge Bill

Fitur yang sangat dibutuhkan restoran Indonesia -- bayar terpisah atau gabungkan tagihan dari beberapa meja.

- **Split Bill** -- bagi satu tagihan menjadi beberapa bagian (2-10 bagian). Mendukung tiga jenis split:
  - Split rata (equal)
  - Split per item (by item)
  - Split per nominal (by amount)
- **Merge Bill** -- gabungkan beberapa tagihan menjadi satu tagihan. Cukup masukkan ID transaksi yang ingin digabung.
- Kedua fitur berjalan melalui dialog yang sederhana dan mudah digunakan oleh kasir.

### 4. Daftar Tunggu (Waiting List)

Kelola antrian pelanggan secara profesional dan transparan.

- **Tambahkan pelanggan ke antrian** dengan data: nama, jumlah rombongan (party size), nomor telepon, dan preferensi area.
- **Statistik real-time** di dashboard:
  - Total pelanggan menunggu
  - Rata-rata waktu tunggu
  - Waktu tunggu terlama
- **Aksi cepat untuk setiap entri antrian**:
  - Kirim Notifikasi -- beri tahu pelanggan bahwa mejanya sudah siap.
  - Dudukkan (Seat) -- pilih meja dan dudukkan pelanggan, otomatis mengubah status meja menjadi "occupied".
  - Batalkan -- hapus dari antrian.
  - Tandai Tidak Datang (No-Show) -- catat pelanggan yang tidak jadi datang.
- **Filter antrian** berdasarkan status: Menunggu, Duduk, Dibatalkan.
- **Mengurangi walkaway** -- pelanggan yang tahu berapa lama harus menunggu cenderung tidak pergi.

### 5. Reservasi

Terima dan kelola reservasi meja untuk pelanggan yang ingin booking terlebih dahulu.

- **Buat reservasi** dengan data: meja tujuan, nama pelanggan, nomor telepon, jumlah rombongan, waktu reservasi, dan catatan.
- **Deteksi konflik otomatis** -- sistem memeriksa apakah meja sudah direservasi dalam jendela waktu 2 jam dari waktu yang diminta.
- **Lihat reservasi per tanggal** -- filter berdasarkan outlet dan tanggal.
- **Check-in reservasi** -- saat pelanggan datang, lakukan check-in dan meja otomatis berubah status menjadi "occupied".
- **Batalkan reservasi** -- jika pelanggan membatalkan, meja kembali tersedia.

### 6. Desktop & Mobile

Semua fitur tersedia di desktop maupun mobile dengan tampilan yang dioptimalkan masing-masing:

- **Desktop**: denah layout penuh dengan panel detail di samping, tabel data pesanan lengkap, dan semua statistik.
- **Mobile**: tampilan yang dioptimalkan untuk layar kecil -- staf bisa mengecek dan mengubah status meja langsung dari genggaman tangan saat berjalan di lantai restoran.

---

## Optimasi Table Turnover

Table turnover (perputaran meja) adalah metrik kunci untuk pendapatan restoran. TiloPOS membantu mengoptimalkannya:

| Sebelum TiloPOS | Sesudah TiloPOS |
|---|---|
| Staf harus cek meja satu per satu | Lihat semua status meja sekaligus di denah |
| Tidak tahu meja mana yang sudah lama terisi | Durasi penggunaan meja ditampilkan otomatis |
| Pelanggan menunggu tanpa kejelasan | Waiting list dengan estimasi waktu tunggu |
| Pesanan tertukar antar meja | Pesanan terhubung langsung ke meja |
| Split/merge bill ribet dan lama | Split/merge bill dalam hitungan detik |

Dengan visibilitas penuh, manajer bisa mengambil keputusan lebih cepat: meja mana yang perlu dipercepat, meja mana yang kosong dan bisa ditawarkan ke pelanggan yang menunggu, dan kapan saatnya menambah staf di area tertentu.

---

## Return on Investment (ROI)

### Penghematan Waktu

- **Staf menghemat 15-30 menit per shift** yang biasanya dihabiskan untuk mengecek status meja secara manual dan mencatat di papan tulis.
- **Proses split/merge bill 5x lebih cepat** dibanding perhitungan manual.
- **Waktu dudukkan pelanggan dari antrian berkurang 50%** karena staf langsung tahu meja mana yang tersedia.

### Peningkatan Pendapatan

- **Table turnover meningkat 10-20%** karena meja kosong terdeteksi lebih cepat.
- **Walkaway berkurang hingga 30%** berkat waiting list yang transparan.
- **Reservasi meningkatkan kepastian pendapatan** -- pelanggan yang sudah booking cenderung datang (apalagi jika ada reminder).

### Pengurangan Error

- **Pesanan tertukar berkurang mendekati nol** karena pesanan terhubung langsung ke meja.
- **Tagihan salah berkurang** karena split/merge bill terkalkulasi otomatis oleh sistem.

### Pengalaman Pelanggan Lebih Baik

- Pelanggan tidak perlu menunggu tanpa kejelasan.
- Proses pembayaran terpisah berjalan lancar tanpa drama.
- Reservasi berjalan mulus -- pelanggan datang, meja sudah siap.

---

## Siapa yang Cocok Menggunakan Fitur Ini?

- **Restoran dine-in** dari skala kecil (5 meja) hingga besar (100+ meja)
- **Kafe dan coffee shop** yang ingin mengelola area duduk dengan lebih baik
- **Restoran dengan multiple area** (indoor/outdoor/VIP/rooftop)
- **Restoran yang sering mendapat rombongan** dan butuh split/merge bill
- **Restoran yang ramai** dan butuh waiting list untuk mengurangi walkaway

---

## Feature Flags

Fitur Manajemen Meja di TiloPOS dikontrol melalui feature flags sehingga bisa diaktifkan sesuai kebutuhan bisnis:

- `table_management` -- Denah meja, status meja, reservasi
- `order_management` -- Pesanan dapur, tracking status pesanan, split/merge bill
- `waiting_list` -- Daftar tunggu pelanggan, notifikasi, seat assignment

---

## Kesimpulan

TiloPOS Manajemen Meja bukan sekadar "peta meja digital". Ini adalah sistem terintegrasi yang menghubungkan denah restoran, pesanan dapur, antrian pelanggan, dan tagihan dalam satu platform. Hasilnya: restoran yang lebih efisien, pelanggan yang lebih puas, dan pendapatan yang lebih optimal.

**Dari papan tulis ke dashboard digital -- saatnya upgrade cara Anda mengelola restoran.**
