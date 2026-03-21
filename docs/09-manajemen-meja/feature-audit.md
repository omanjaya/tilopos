# Feature Audit: Manajemen Meja TiloPOS

## Daftar Isi

1. [Penilaian Kondisi Saat Ini](#1-penilaian-kondisi-saat-ini)
2. [Evaluasi UX](#2-evaluasi-ux)
3. [Analisis Kompetitif](#3-analisis-kompetitif)
4. [Best Practice Industri](#4-best-practice-industri)
5. [Gap Analysis](#5-gap-analysis)
6. [Rekomendasi Perbaikan Teratas](#6-rekomendasi-perbaikan-teratas)
7. [Roadmap](#7-roadmap)

---

## 1. Penilaian Kondisi Saat Ini

### 1.1 Sub-fitur: Denah Meja (Floor Plan Editor)

**Status: Fungsional dengan Batasan**

Komponen yang sudah diimplementasi:
- `TableLayoutEditor` -- komponen induk yang mengorkestrasikan semua sub-komponen.
- `TableCanvas` -- grid visual dengan CSS grid yang menampilkan meja-meja sebagai `TableShape`.
- `TableToolbar` -- filter seksi, kontrol zoom, tombol save/reset.
- `TableLegend` -- keterangan warna status.
- `TableDetailPanel` -- panel detail meja di sisi kanan.
- `TableSummary` -- ringkasan jumlah meja per status di footer.
- 5 custom hooks: `useTableDrag`, `useTableSelection`, `useTableZoom`, `useTablePositions`, `useTableSections`.

Catatan penting:
- **Data masih menggunakan demo data** (`generateDemoTables()`). Integrasi dengan API backend (yang sudah memiliki CRUD lengkap) belum tersambung di frontend.
- Posisi meja disimpan ke local storage sebagai fallback, bukan langsung ke server.
- **Tipe data**: `LayoutTable` memiliki properti `gridX`, `gridY`, `gridW`, `gridH` untuk positioning di grid.
- **Status yang didukung**: available, occupied, reserved, merged, maintenance (frontend) vs available, occupied, reserved, cleaning (backend). Ada ketidaksesuaian: frontend punya `merged` dan `maintenance`, backend punya `cleaning`.

### 1.2 Sub-fitur: Manajemen Pesanan (Orders)

**Status: Cukup Lengkap**

Komponen yang sudah diimplementasi:
- `OrdersPage` -- halaman daftar pesanan dengan DataTable, tab filter per status, aksi dropdown per baris.
- `OrderDetailPage` -- halaman detail pesanan lengkap dengan tabel item, status badge, tombol aksi.
- `OrdersPage.mobile.tsx` -- versi mobile yang terpisah (file terpisah sesuai arsitektur DeviceRoute).
- Backend: `OrdersController` dan `OrdersService` lengkap dengan CRUD, update status, dan integrasi KDS melalui EventBus.

Kekuatan:
- Flow status pesanan lengkap: pending --> preparing --> ready --> served --> completed / cancelled.
- Auto-refresh 30 detik.
- Keyboard shortcuts untuk navigasi tab.
- Integrasi KDS melalui WebSocket (OrderStatusChangedEvent).
- Kolom "Meja" muncul kondisional berdasarkan feature flag `table_management`.

### 1.3 Sub-fitur: Split/Merge Bill

**Status: Fungsional Dasar**

- Frontend menyediakan dialog sederhana untuk split (berdasarkan jumlah bagian) dan merge (berdasarkan ID transaksi).
- Backend memiliki use case `SplitBillUseCase` dan `MergeBillUseCase` yang terpisah dari service.
- Split mendukung 3 tipe: equal, by_item, by_amount.
- **Kekurangan**: frontend hanya mengexpose split berdasarkan jumlah bagian (equal). Split by_item dan by_amount belum ada UI-nya.
- Input masih manual (ID transaksi harus diketik). Belum ada cara memilih transaksi dari daftar.

### 1.4 Sub-fitur: Waiting List

**Status: Cukup Lengkap**

Komponen yang sudah diimplementasi:
- `WaitingListPage` -- halaman lengkap dengan statistik, tabel, filter tab.
- `AddCustomerDialog` -- dialog tambah pelanggan ke antrian.
- `SeatCustomerDialog` -- dialog pemilihan meja untuk mendudukkan pelanggan.
- `WaitingListPage.mobile.tsx` -- versi mobile.
- Backend: `WaitingListController` dan `TablesService` (waiting list methods).

Kekuatan:
- Statistik real-time: total menunggu, rata-rata waktu tunggu, waktu tunggu terlama.
- Aksi lengkap: notifikasi, seat, cancel, no-show.
- Waktu tunggu dihitung otomatis.
- Auto-refresh 30 detik.

### 1.5 Sub-fitur: Reservasi

**Status: Backend Lengkap, Frontend Minimal**

- Backend memiliki endpoint lengkap: create, list by date, cancel, check-in.
- Deteksi konflik reservasi dalam jendela 2 jam.
- **Frontend belum memiliki halaman khusus reservasi**. Reservasi hanya bisa dilakukan melalui API langsung.
- Data reservasi disimpan di tabel `waiting_list` dengan prefix `[RESERVATION]` di kolom notes -- ini adalah workaround, bukan tabel dedicated.

### 1.6 Backend API Coverage

| Endpoint | Method | Status |
|----------|--------|--------|
| `GET /tables` | List meja per outlet | Implementasi lengkap |
| `GET /tables/:id` | Detail meja | Implementasi lengkap |
| `POST /tables` | Buat meja baru | Implementasi lengkap |
| `PUT /tables/:id` | Update meja | Implementasi lengkap |
| `DELETE /tables/:id` | Soft delete meja | Implementasi lengkap |
| `PUT /tables/:id/status` | Update status meja | Implementasi lengkap |
| `GET /tables/sections` | Daftar seksi unik | Implementasi lengkap |
| `POST /tables/split-bill` | Split bill | Implementasi lengkap |
| `POST /tables/merge-bill` | Merge bill | Implementasi lengkap |
| `POST /tables/reservations` | Buat reservasi | Implementasi lengkap |
| `GET /tables/reservations` | Lihat reservasi per tanggal | Implementasi lengkap |
| `PUT /tables/reservations/:id/cancel` | Batalkan reservasi | Implementasi lengkap |
| `PUT /tables/reservations/:id/check-in` | Check-in reservasi | Implementasi lengkap |
| `GET /tables/waiting-list` | Daftar tunggu | Implementasi lengkap |
| `POST /tables/waiting-list` | Tambah ke antrian | Implementasi lengkap |
| `PUT /tables/waiting-list/:id/notify` | Notifikasi pelanggan | Implementasi lengkap |
| `PUT /tables/waiting-list/:id/seat` | Dudukkan pelanggan | Implementasi lengkap |

---

## 2. Evaluasi UX

### 2.1 Floor Plan Editor

**Kekuatan:**
- Grid visual intuitif dengan garis bantu.
- Drag-and-drop berfungsi baik, termasuk support touch events untuk mobile.
- Kode warna status meja jelas dan mudah dipahami.
- Panel detail muncul on-click tanpa navigasi halaman.
- Zoom dan filter area membantu navigasi denah besar.

**Kelemahan:**
- Tidak bisa menambah, menghapus, atau mengedit meja dari editor -- harus melalui tampilan daftar atau API.
- Bentuk meja seragam (tidak ada variasi round/square/long table).
- Tidak ada fitur rotate meja.
- Tidak ada numbering otomatis atau snap-to-grid yang presisi.
- Tidak ada mini-map untuk navigasi denah besar.

### 2.2 Order Flow

**Kekuatan:**
- Tab filter intuitif dan keyboard shortcut mempercepat workflow.
- Detail pesanan lengkap dan informatif.
- Konfirmasi dialog untuk semua aksi destruktif (batalkan pesanan).

**Kelemahan:**
- Tidak ada timeline/progress bar visual untuk status pesanan.
- Tidak ada notifikasi push ketika status pesanan berubah.
- Tidak ada drag-and-drop kanban view untuk manajemen pesanan.
- Tidak ada estimasi waktu per item pesanan.

### 2.3 Split/Merge Bill

**Kelemahan signifikan:**
- Input ID transaksi manual -- sangat rawan error dan tidak user-friendly.
- Tidak ada dropdown atau search untuk memilih transaksi.
- Tidak ada preview total sebelum split/merge.
- Hanya split equal yang bisa dilakukan dari UI; split by_item dan by_amount belum ada antarmuka.
- Tidak ada visual split (memilih item ke group A/B/C).

### 2.4 Waiting List

**Kekuatan:**
- Statistik dashboard memberikan gambaran cepat.
- Aksi lengkap dengan konfirmasi dialog.
- Waktu tunggu real-time per entri.

**Kelemahan:**
- Tidak ada estimasi waktu tunggu yang ditampilkan ke pelanggan (hanya rata-rata di statistik).
- Tidak ada SMS/WhatsApp integration yang langsung dari UI.
- Tidak ada customer-facing page (pelanggan cek status antrian sendiri).

---

## 3. Analisis Kompetitif

### 3.1 Moka F&B (Indonesia)

- **Floor plan**: Moka POS menyediakan denah meja visual sederhana dengan status warna. Bentuk meja bisa round atau square.
- **Order management**: Terintegrasi langsung dari POS ke KDS. Moka F&B fokus pada dine-in workflow.
- **Split bill**: Tersedia split per item dan split equal langsung dari POS.
- **Waiting list**: Tidak ada fitur bawaan.
- **Reservasi**: Tidak ada fitur bawaan.
- **Keunggulan vs TiloPOS**: UI split bill lebih intuitif (pilih item langsung), bentuk meja bervariasi.
- **Kelemahan vs TiloPOS**: Tidak ada waiting list, tidak ada reservasi, editor denah kurang fleksibel dibanding drag-and-drop TiloPOS.

### 3.2 ESB (Indonesia)

- **Floor plan**: Denah meja visual dengan kode warna. Fokus pada F&B chain.
- **Order management**: Terintegrasi dengan KDS dan sistem display antrian.
- **Split bill**: Tersedia.
- **Waiting list**: Ada dalam versi tertentu, terbatas.
- **Reservasi**: Melalui integrasi pihak ketiga.
- **Keunggulan vs TiloPOS**: Lebih mature untuk F&B chain berskala besar, integrasi supply chain.
- **Kelemahan vs TiloPOS**: Lebih mahal, kurang fleksibel untuk UMKM, tidak open-architecture.

### 3.3 Toast (AS)

- **Floor plan**: Editor denah meja yang sangat visual dengan berbagai bentuk meja (round, square, rectangular, bar seating), rotate, resize, multiple floors/rooms.
- **Order management**: Pesanan dari meja langsung ke KDS, real-time status tracking dengan timeline.
- **Split bill**: Drag-and-drop item antar split groups, split by seat, split by item, split custom amount.
- **Waiting list**: Terintegrasi dengan Toast Tables -- pelanggan bisa join waitlist via link, estimasi waktu tunggu otomatis, SMS notifikasi otomatis.
- **Reservasi**: Reservasi online terintegrasi, konfirmasi otomatis via email/SMS.
- **Best-in-class**: Editor denah meja, split bill UX, dan waitlist automation.

### 3.4 Square for Restaurants (AS)

- **Floor plan**: Multiple floor plans (lunch layout vs dinner layout), bentuk meja bervariasi, color-coded status.
- **Order management**: Coursing (appetizer, main, dessert), fire timing, seat-level ordering.
- **Split bill**: Split by seat, split by item, custom split.
- **Waiting list**: Terintegrasi, estimasi waktu berbasis data historis.
- **Reservasi**: Square online reservations, sinkronisasi dengan Google Reserve.
- **Best-in-class**: Multi-layout support, coursing system, data-driven wait time estimation.

### Ringkasan Perbandingan

| Fitur | TiloPOS | Moka F&B | ESB | Toast | Square |
|-------|---------|----------|-----|-------|--------|
| Denah visual | Ada (grid) | Ada (simple) | Ada | Advanced | Advanced |
| Drag-and-drop meja | Ada | Terbatas | Terbatas | Ada | Ada |
| Multi-shape table | Belum | Ada | Terbatas | Ada | Ada |
| Status real-time | Ada | Ada | Ada | Ada | Ada |
| Split bill UI | Dasar | Baik | Baik | Sangat baik | Sangat baik |
| Merge bill | Ada | Terbatas | Ada | Ada | Ada |
| Waiting list | Ada | Tidak ada | Terbatas | Sangat baik | Baik |
| Reservasi | Backend only | Tidak ada | Integrasi | Terintegrasi | Terintegrasi |
| SMS notifikasi | Infrastruktur | Tidak ada | Ada | Otomatis | Otomatis |
| Multiple layouts | Belum | Tidak ada | Tidak ada | Ada | Ada |
| Coursing/seat ordering | Belum | Tidak ada | Terbatas | Ada | Ada |
| Mobile support | Ada (file terpisah) | Ada | Ada | Ada | Ada |
| Harga | Terjangkau | Menengah | Premium | Premium | Menengah |

---

## 4. Best Practice Industri

### 4.1 Dari Toast Table Management

- **Multi-room floor plan**: restoran bisa memiliki beberapa denah (lantai 1, lantai 2, outdoor) dan berpindah antar denah.
- **Table shape variety**: round, square, rectangular, bar, booth -- membantu staf mengenali meja secara visual.
- **Resize meja**: meja bisa di-resize untuk merepresentasikan meja besar atau kecil.
- **Timeline pesanan**: setiap pesanan menampilkan timeline visual dari diterima hingga selesai.
- **Smart waitlist**: estimasi waktu tunggu dihitung otomatis berdasarkan data historis (rata-rata durasi makan untuk ukuran party yang sama).
- **SMS 2-way**: pelanggan bisa reply SMS untuk konfirmasi kedatangan.

### 4.2 Dari Square for Restaurants

- **Multiple table layouts**: restoran bisa menyimpan layout berbeda untuk siang vs malam, weekday vs weekend, atau event khusus.
- **Seat-level ordering**: pesanan dikaitkan dengan nomor kursi di meja, bukan hanya meja. Ini memudahkan staf tahu siapa memesan apa.
- **Coursing**: pesanan dibagi ke course (appetizer, main course, dessert) dengan fire timing yang bisa dikontrol.
- **Data-driven wait time**: estimasi waktu tunggu berdasarkan analisis pola historis, bukan sekadar rata-rata.
- **Integration dengan Google Reserve**: pelanggan bisa reservasi langsung dari Google Maps/Search.

### 4.3 Best Practice Umum

- **Color consistency**: gunakan warna yang konsisten di seluruh aplikasi untuk status yang sama.
- **One-tap actions**: staf di lantai restoran butuh aksi satu sentuhan, bukan multi-step dialog.
- **Offline resilience**: restoran sering punya internet tidak stabil -- fitur kritis harus bisa bekerja offline.
- **Print-ready**: denah meja, daftar reservasi, dan summary harus bisa dicetak untuk dipasang di workstation.

---

## 5. Gap Analysis

### 5.1 Gap Kritis (Harus Segera Ditangani)

| Gap | Detail | Impact |
|-----|--------|--------|
| Denah meja masih pakai demo data | Frontend belum terhubung ke API backend | Fitur denah tidak berguna di production |
| Tidak ada CRUD meja dari UI | Meja hanya bisa ditambah/edit via API | Staf/manajer tidak bisa mengelola meja |
| Split bill UI sangat terbatas | Hanya split equal by count, input ID manual | Pengalaman split bill jauh dari harapan pengguna |
| Inkonsistensi status meja frontend vs backend | Frontend: merged/maintenance, Backend: cleaning | Bisa menyebabkan bug dan kebingungan |
| Tidak ada halaman reservasi di frontend | Reservasi hanya bisa via API | Fitur reservasi tidak bisa digunakan end-user |

### 5.2 Gap Penting (Prioritas Tinggi)

| Gap | Detail | Impact |
|-----|--------|--------|
| Tidak ada bentuk meja bervariasi | Semua meja bentuknya sama | Kurang representatif terhadap layout fisik |
| Tidak ada notifikasi real-time di denah | Perlu refresh manual | Staf tidak langsung tahu perubahan status |
| Tidak ada estimasi waktu tunggu untuk pelanggan | Hanya ada rata-rata di dashboard | Pengalaman pelanggan kurang transparan |
| Tidak ada integrasi SMS/WhatsApp | Notifikasi hanya mengubah status di database | Pelanggan tidak benar-benar diberitahu |
| Tidak ada kanban view untuk pesanan | Hanya tabel list | Kurang visual untuk tracking multiple orders |

### 5.3 Gap Nice-to-Have (Prioritas Menengah)

| Gap | Detail |
|-----|--------|
| Tidak ada multiple floor plan / layout | Hanya 1 denah per outlet |
| Tidak ada coursing / seat-level ordering | Pesanan hanya level meja |
| Tidak ada data-driven wait time estimation | Estimasi tidak berbasis data historis |
| Tidak ada customer-facing waitlist check | Pelanggan tidak bisa cek antrian sendiri |
| Tidak ada print denah dan reservasi | Tidak bisa cetak untuk dipasang di workstation |

---

## 6. Rekomendasi Perbaikan Teratas

### Prioritas 1: Koneksikan Denah Meja ke Backend

**Effort: Medium | Impact: Critical**

Menggantikan `generateDemoTables()` dengan data dari API `GET /api/v1/tables`. Ini adalah blocker utama agar fitur denah meja bisa digunakan di production.

Langkah:
1. Panggil `tablesApi.list()` di `TablesPage` dan transformasikan ke tipe `LayoutTable`.
2. Implementasikan `onSavePositions` untuk memanggil `PUT /api/v1/tables/:id` per meja yang berubah posisi.
3. Sinkronkan status meja (sesuaikan enum status antara frontend dan backend).

### Prioritas 2: Tambahkan CRUD Meja dari UI

**Effort: Medium | Impact: High**

Buat dialog atau form untuk menambah meja baru, edit meja (nama, kapasitas, seksi), dan delete/deactivate meja. Backend sudah siap.

### Prioritas 3: Perbaiki UX Split/Merge Bill

**Effort: Medium | Impact: High**

- Ganti input ID transaksi manual dengan dropdown/search yang menampilkan daftar transaksi aktif.
- Tambahkan preview total sebelum split/merge.
- Implementasikan UI untuk split by item (drag item ke group) dan split by amount.

### Prioritas 4: Buat Halaman Reservasi di Frontend

**Effort: Medium | Impact: High**

- Buat halaman reservasi dengan kalender/date picker.
- Tampilkan daftar reservasi per hari.
- Form untuk membuat reservasi baru dengan pemilihan meja.
- Aksi check-in dan cancel langsung dari halaman.

### Prioritas 5: Sinkronkan Status Meja Frontend-Backend

**Effort: Low | Impact: Medium**

Sesuaikan enum status meja:
- Tambahkan `cleaning` di frontend types.
- Pertimbangkan apakah `merged` dan `maintenance` perlu di backend.
- Pastikan warna dan label konsisten.

### Prioritas 6: Integrasi Notifikasi Real-Time

**Effort: Medium | Impact: Medium**

Manfaatkan infrastruktur WebSocket yang sudah ada (Socket.IO) untuk:
- Push notifikasi perubahan status meja ke denah.
- Notifikasi pesanan baru ke halaman pesanan.
- Alert ketika pelanggan dari waiting list sudah terlalu lama menunggu.

---

## 7. Roadmap

### Fase 1: Foundation (1-2 Minggu)

- Koneksikan denah meja frontend ke API backend (mengganti demo data).
- Sinkronkan enum status meja antara frontend dan backend.
- Tambahkan CRUD meja dari UI (dialog tambah/edit/hapus meja).
- Fix: tampilan list view sekarang menampilkan notice "Fitur CRUD meja belum tersedia" -- hapus notice ini setelah CRUD ready.

### Fase 2: Bill Enhancement (2-3 Minggu)

- Perbaiki UI split bill: dropdown transaksi aktif, preview total, dukungan 3 jenis split.
- Perbaiki UI merge bill: multi-select transaksi dari daftar.
- Buat halaman reservasi di frontend dengan kalender view.
- Tambahkan form reservasi, aksi check-in, dan cancel.

### Fase 3: Real-Time & Visual (3-4 Minggu)

- Integrasi WebSocket untuk update status meja real-time di denah.
- Tambahkan variasi bentuk meja (round, square, long) di `TableShape`.
- Tambahkan kanban view opsional untuk halaman pesanan.
- Buat timeline visual di halaman detail pesanan.

### Fase 4: Waitlist & Notification (4-6 Minggu)

- Integrasi SMS/WhatsApp untuk notifikasi waiting list.
- Estimasi waktu tunggu berbasis data historis.
- Customer-facing waitlist page (pelanggan scan QR untuk cek posisi antrian).
- Tambahkan fitur print denah dan daftar reservasi.

### Fase 5: Advanced (6-8 Minggu)

- Multiple floor plan / layout per outlet.
- Seat-level ordering (pesanan per kursi di meja).
- Coursing support (appetizer, main, dessert dengan fire timing).
- Dashboard analytics: table turnover rate, average dining duration, peak hour analysis, no-show rate.
- Integrasi Google Reserve untuk reservasi online.
