# Dapur Terorganisir, Pesanan Tepat Waktu

**Tagline:** *Dari Kertas Pesanan ke Layar Digital — Dapur Kamu Siap Naik Level.*

---

## Kenapa Butuh Kitchen Display System?

Bayangkan skenario ini: jam makan siang, restoran penuh, pesanan membanjir. Kasir menulis pesanan di kertas, ditaruh di meja dapur. Kertas menumpuk, tulisan susah dibaca, pesanan tertukar, pelanggan menunggu lama. Masakan yang seharusnya keluar 10 menit, baru jadi setelah 25 menit. Pelanggan kecewa, review jelek, bisnis rugi.

TiloPOS Kitchen Display System (KDS) menghilangkan semua masalah itu. Pesanan dari POS langsung muncul di layar dapur secara real-time. Tidak ada kertas yang hilang, tidak ada tulisan yang salah baca, tidak ada pesanan yang terlewat. Setiap item pesanan punya status yang jelas, timer yang berjalan, dan prioritas yang terlihat.

**KDS bukan fitur tambahan — ini adalah transformasi cara dapur Anda beroperasi.**

---

## Value Proposition: Apa yang KDS TiloPOS Berikan?

### 1. Sinkronisasi Real-Time dengan POS

Saat kasir menyelesaikan pesanan di POS, pesanan langsung muncul di layar KDS. Tidak ada delay, tidak ada langkah manual tambahan. Teknologi WebSocket (Socket.IO) memastikan data terkirim secara instan.

- **Pesanan baru:** Muncul otomatis di layar dapur dengan efek suara notifikasi
- **Perubahan status:** Saat item di-bump atau di-recall, semua layar ter-update secara bersamaan
- **Polling backup:** Auto-refresh setiap 10 detik sebagai fallback jika WebSocket terputus sementara

### 2. Cooking Timer yang Mencegah Keterlambatan

Setiap pesanan dilengkapi timer countdown yang berubah warna sesuai kondisi:

- **Hijau (On-track):** Waktu masih cukup, di bawah 50% target SLA
- **Kuning (Warning):** Sudah melewati 50% target, perlu dipercepat
- **Merah berkedip (Overdue):** Melewati batas SLA, pesanan terlambat

Timer bisa dikonfigurasi per tipe pesanan:
- **Dine-in:** Default 15 menit
- **Takeaway:** Default 10 menit
- **Delivery:** Default 20 menit

Owner dan Manager bisa mengubah target SLA ini di pengaturan KDS tanpa perlu bantuan teknis.

### 3. Filtrasi per Station untuk Dapur Besar

Dapur besar biasanya dibagi menjadi beberapa station. KDS TiloPOS mendukung 7 station standar:

| Station | Kegunaan |
|---------|---------|
| Grill | Masakan panggang dan bakar |
| Fryer | Masakan goreng |
| Cold | Salad, appetizer dingin |
| Hot | Masakan berkuah dan tumis |
| Drinks | Minuman |
| Dessert | Makanan penutup |
| General | Umum / belum dikategorikan |

Setiap layar KDS bisa di-assign ke station tertentu, sehingga koki grill hanya melihat pesanan grill, bartender hanya melihat pesanan minuman, dan seterusnya. Sistem room-based pada WebSocket memastikan hanya data yang relevan yang dikirim ke setiap layar.

### 4. Priority Badges untuk Pesanan Penting

Tidak semua pesanan sama pentingnya. KDS TiloPOS menampilkan badge prioritas:

- **VIP (emas):** Pesanan pelanggan VIP, harus didahulukan
- **Urgent (oranye):** Pesanan yang perlu diprioritaskan
- **Normal:** Pesanan reguler

Pesanan diurutkan otomatis: VIP paling atas, kemudian Urgent, lalu Normal. Dalam masing-masing prioritas, pesanan yang paling lama menunggu ditampilkan lebih dulu.

### 5. Statistik Performa Dapur

Panel statistik di bagian atas layar KDS menampilkan metrik real-time:

- **Antrian Pesanan:** Jumlah pesanan yang sedang aktif
- **Rata-rata Persiapan:** Waktu rata-rata dari pesanan masuk sampai selesai (dalam menit)
- **Selesai Hari Ini:** Total pesanan yang sudah di-bump hari ini
- **Pesanan Terlambat:** Jumlah pesanan yang melewati target SLA

Auto-refresh setiap 30 detik memastikan data selalu up-to-date. Analytics endpoint juga menyediakan data per jam dan per station untuk analisis yang lebih mendalam.

### 6. Bump dan Notify — Alur Kerja yang Efisien

**Bump Item:** Saat item selesai dimasak, koki cukup klik tombol bump. Item berubah status dari "preparing" ke "ready".

**Progress Bar:** Setiap kartu pesanan menampilkan progress bar visual — berapa item yang sudah selesai dari total item.

**Notify Cashier:** Saat semua item dalam satu pesanan sudah selesai, muncul tombol "Beritahu Kasir". Satu klik mengirim notifikasi real-time ke POS kasir bahwa pesanan siap disajikan. Tidak perlu teriak dari dapur ke kasir.

**Recall:** Jika ada item yang perlu dibuat ulang (salah masak, jatuh, dll), gunakan fitur recall untuk mengirim item kembali ke status "preparing" dengan catatan alasan recall.

---

## Perbandingan dengan Kompetitor

| Fitur | TiloPOS KDS | Toast KDS | Square KDS | Moka KDS |
|-------|-------------|-----------|-----------|----------|
| Real-time sync (WebSocket) | Ya | Ya | Ya | Ya |
| Cooking timer per item | Ya, 3 fase warna | Ya | Ya | Terbatas |
| SLA setting per tipe pesanan | Ya (dine-in, takeaway, delivery) | Ya | Tidak | Tidak |
| Station filtering | 7 station + custom | Ya | Ya | Tidak |
| Priority badges (VIP, Urgent) | Ya | Ya | Tidak | Tidak |
| Kitchen analytics | Ya (real-time + historical) | Ya | Ya | Terbatas |
| Notify cashier (1-click) | Ya, via WebSocket | Ya | Ya | Tidak |
| Recall order | Ya, dengan alasan | Ya | Tidak | Tidak |
| Overdue orders tracking | Ya, dedicated API | Ya | Tidak | Tidak |
| Performance report | Ya (on-time rate, avg prep) | Ya | Ya | Tidak |
| Sound notifications | Ya | Ya | Ya | Ya |
| Fullscreen mode | Ya | Ya | Ya | Ya |
| Harga | Termasuk dalam paket | Tambahan bayar | Termasuk | Tambahan bayar |

---

## ROI: Dampak Nyata untuk Bisnis F&B

### Kecepatan Penyajian Meningkat

| Metrik | Tanpa KDS | Dengan KDS TiloPOS |
|--------|-----------|-------------------|
| Rata-rata waktu penyajian | 18-25 menit | 10-15 menit |
| Pesanan terlambat (>15 min) | 30-40% | < 10% |
| Pesanan tertukar | 10-15% | < 2% |
| Waktu komunikasi dapur-kasir | 30-60 detik per pesanan | 0 detik (otomatis) |

### Pengurangan Error

- **Tulisan tidak terbaca:** 0% (semua digital)
- **Pesanan hilang:** 0% (tracked di sistem)
- **Item terlewat:** Minimal (progress bar menunjukkan item yang belum selesai)

### Efisiensi Operasional

- **Eliminasi kertas pesanan:** Hemat biaya kertas dan tinta, plus lingkungan lebih bersih
- **Koki fokus memasak:** Tidak perlu bolak-balik ke kasir untuk klarifikasi pesanan
- **Data untuk improvement:** Analytics menunjukkan item mana yang sering terlambat, station mana yang bottleneck, dan jam berapa yang paling sibuk

### Kepuasan Pelanggan

- Pesanan lebih cepat = pelanggan lebih puas
- Pesanan lebih akurat = lebih sedikit komplain
- Komunikasi "pesanan siap" yang instan = pengalaman dining yang lebih baik

---

## Skenario Nyata

### Restoran Padang dengan 30 Meja

> *"Dulu saat ramai, pesanan ditulis di kertas kecil dan ditempel di dinding dapur. Sering jatuh, sering tertukar. Sekarang dengan KDS, semua pesanan jelas di layar. Timer merah berkedip kalau ada yang terlalu lama. Koki bisa lihat prioritas — mana yang dine-in, mana yang takeaway. Yang paling berasa, kasir tidak perlu lagi teriak ke dapur. Tinggal klik, langsung muncul."*

### Kafe dengan 2 Station (Kitchen + Bar)

> *"Kami pakai 2 layar KDS — satu untuk kitchen, satu untuk bar. Pesanan makanan hanya muncul di kitchen, pesanan minuman hanya di bar. Sebelumnya, bartender sering keteteran karena harus baca semua kertas pesanan termasuk yang bukan bagiannya. Sekarang masing-masing fokus, pelayanan jadi lebih cepat."*

---

## Setup yang Mudah

KDS TiloPOS bukan fitur yang rumit untuk diaktifkan:

1. **Aktifkan fitur:** Buka Pengaturan > Fitur, aktifkan "Kitchen Display"
2. **Assign role:** Pastikan ada karyawan dengan role Kitchen Staff
3. **Buka KDS:** Akses `/kds` dari browser di tablet atau monitor dapur
4. **Login:** Gunakan akun karyawan dengan role yang sesuai
5. **Pilih outlet:** KDS otomatis terhubung ke outlet yang dipilih

Tidak perlu instalasi software tambahan. KDS berjalan di browser — bisa di tablet Android, iPad, laptop, atau monitor dengan mini-PC. Selama ada koneksi ke server TiloPOS, KDS langsung berfungsi.

---

## Penutup

Kitchen Display System TiloPOS bukan sekadar pengganti kertas pesanan. Ini adalah **upgrade menyeluruh untuk operasi dapur Anda.** Dengan real-time sync, cooking timer 3 fase, station filtering, priority badges, kitchen analytics, dan bump-to-notify workflow, KDS memastikan setiap pesanan diproses tepat waktu, akurat, dan efisien.

**Dapur yang terorganisir menghasilkan pelanggan yang puas. Pelanggan puas menghasilkan bisnis yang berkembang.**

---

*TiloPOS KDS — Dapur Terorganisir, Pesanan Tepat Waktu.*
