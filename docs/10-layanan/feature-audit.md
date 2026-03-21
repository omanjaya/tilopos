# Feature Audit: Modul Layanan TiloPOS

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

### 1.1 Sub-fitur: Appointments

**Status: Fungsional Dasar**

**Backend (`packages/backend/src/modules/appointments/`):**
- `AppointmentsService` -- fully implemented dengan metode: create, update, cancel, updateStatus, findById, listByDate, listByEmployee, listByCustomer, checkAvailability, getUpcoming.
- Menggunakan Prisma model `Appointment` dengan fields: businessId, outletId, customerId, employeeId, serviceName, servicePrice, startTime, endTime, durationMinutes, status (enum AppointmentStatus), notes, customerName, customerPhone, cancelledAt, cancelReason.
- Overlap check di `checkAvailability()` -- memeriksa appointment lain untuk employee yang sama di waktu yang bertabrakan (hanya status scheduled, confirmed, in_progress).
- Relasi ke customer dan employee sudah di-include saat query.

**Frontend (`packages/web/src/features/appointments/`):**
- `AppointmentsPage` -- satu file halaman yang mencakup semua fungsionalitas.
- Tampilan kalender sederhana (date picker + list appointment per hari).
- Form create appointment inline (bukan dialog terpisah).
- Status actions: scheduled -> confirmed -> in_progress -> completed, dan cancel.
- Tidak ada file mobile terpisah (`appointments-page.mobile.tsx` belum ada).

**Kekuatan:**
- Backend sangat lengkap -- semua operasi CRUD, availability check, query by employee/customer.
- Status flow lengkap dengan 6 status.
- Harga layanan dan durasi tercatat.

**Kelemahan:**
- Frontend hanya satu file tanpa modularisasi komponen.
- Tidak ada calendar view (hanya list per tanggal).
- Tidak ada drag-to-reschedule.
- Tidak ada tampilan weekly/monthly.
- Employee assignment belum ada di form UI (hanya backend).
- Tidak ada reminder/notification.
- Tidak ada mobile view terpisah.

### 1.2 Sub-fitur: Work Orders

**Status: Fungsional Baik**

**Backend (`packages/backend/src/modules/work-orders/`):**
- `WorkOrdersService` -- fully implemented: generateOrderNumber, create (dengan transaction untuk items), update, updateStatus, findById, list (dengan search dan filter), addItem, removeItem, calculateTotal.
- Menggunakan Prisma model `WorkOrder` dan `WorkOrderItem` (one-to-many).
- Auto-generate nomor WO: `WO-YYYYMMDD-XXXX` dengan sequence harian.
- Fields lengkap: title, description, itemDescription, itemBrand, itemModel, itemSerial, diagnosis, priority, estimatedCost, finalCost, estimatedDate, completedAt, deliveredAt.
- Search multi-field: orderNumber, title, customerName, customerPhone, itemDescription, itemSerial.

**Frontend (`packages/web/src/features/work-orders/`):**
- `WorkOrdersPage` -- halaman lengkap dengan list view dan detail view (dalam satu file).
- Form create work order dengan semua field.
- Detail view (`WorkOrderDetail` component) menampilkan info barang, diagnosis, data pelanggan, biaya, rincian items, dan tombol aksi.
- Filter pencarian dan status.
- Tidak ada file mobile terpisah.

**Kekuatan:**
- Backend dan frontend selaras dengan baik.
- Detail view informatif dan lengkap.
- Pencarian multi-field powerful.
- Rincian biaya per item memungkinkan transparansi billing.

**Kelemahan:**
- List dan detail view dalam satu file (bukan route terpisah).
- Tidak ada fitur upload foto barang.
- Tidak ada print/cetak work order untuk pelanggan.
- Tidak ada timeline history perubahan status.
- Tidak ada kanban view.
- Tidak ada mobile view terpisah.

### 1.3 Sub-fitur: Item Tracking

**Status: Fungsional Baik**

**Backend (`packages/backend/src/modules/item-tracking/`):**
- `ItemTrackingService` -- fully implemented: generateTicketNumber, receive, updateStatus, update, findById, findByTicket, listByOutlet (dengan search dan filter), listByCustomer, getActive, delete.
- Auto-generate tiket: `TK-YYYYMMDD-XXXX` dengan sequence harian.
- Timestamp per status: receivedAt (default dari Prisma), processedAt, readyAt, deliveredAt.
- Fields: ticketNumber, itemName, itemDescription, quantity, serviceName, servicePrice, estimatedReady, customerName, customerPhone.

**Frontend (`packages/web/src/features/item-tracking/`):**
- `ItemTrackingPage` -- halaman lengkap dengan 4 tab: Aktif, Semua, Cek Tiket, Terima Baru.
- Form penerimaan item lengkap.
- Ticket lookup (cek status via nomor tiket).
- One-click status update di setiap kartu item.
- Tidak ada file mobile terpisah.

**Kekuatan:**
- Tab-based UI sangat intuitif untuk workflow laundry.
- Ticket lookup adalah fitur yang sangat berguna untuk interaksi pelanggan di counter.
- One-click status update mempercepat workflow staf.
- Timestamp per tahap memungkinkan analisis turnaround time.

**Kelemahan:**
- Tidak ada notifikasi otomatis ke pelanggan saat status berubah.
- Tidak ada customer-facing tracking page (pelanggan cek status online via link/QR).
- Tidak ada batch operations (update banyak item sekaligus).
- Tidak ada fitur cetak label/tiket.
- Tidak ada mobile view terpisah.

### 1.4 Backend API Coverage

**Appointments:**

| Endpoint | Method | Status |
|----------|--------|--------|
| `POST /appointments` | Create | Implementasi lengkap |
| `PUT /appointments/:id` | Update | Implementasi lengkap |
| `POST /appointments/:id/cancel` | Cancel | Implementasi lengkap |
| `PUT /appointments/:id/status` | Update status | Implementasi lengkap |
| `GET /appointments/:id` | Get by ID | Implementasi lengkap |
| `GET /appointments/date` | List by date | Implementasi lengkap |
| `GET /appointments/employee/:id` | List by employee | Implementasi lengkap |
| `GET /appointments/customer/:id` | List by customer | Implementasi lengkap |
| `GET /appointments/availability` | Check availability | Implementasi lengkap |
| `GET /appointments/upcoming` | Get upcoming | Implementasi lengkap |

**Work Orders:**

| Endpoint | Method | Status |
|----------|--------|--------|
| `POST /work-orders` | Create | Implementasi lengkap |
| `PUT /work-orders/:id` | Update | Implementasi lengkap |
| `PUT /work-orders/:id/status` | Update status | Implementasi lengkap |
| `GET /work-orders/:id` | Get by ID | Implementasi lengkap |
| `GET /work-orders` | List with filters | Implementasi lengkap |
| `POST /work-orders/:id/items` | Add item | Implementasi lengkap |
| `DELETE /work-orders/items/:id` | Remove item | Implementasi lengkap |
| `GET /work-orders/:id/total` | Calculate total | Implementasi lengkap |

**Item Tracking:**

| Endpoint | Method | Status |
|----------|--------|--------|
| `POST /item-tracking/receive` | Receive item | Implementasi lengkap |
| `PUT /item-tracking/:id/status` | Update status | Implementasi lengkap |
| `PUT /item-tracking/:id` | Update item | Implementasi lengkap |
| `GET /item-tracking/:id` | Get by ID | Implementasi lengkap |
| `GET /item-tracking/ticket/:number` | Find by ticket | Implementasi lengkap |
| `GET /item-tracking/outlet/:id` | List by outlet | Implementasi lengkap |
| `GET /item-tracking/active/:outletId` | Get active items | Implementasi lengkap |
| `GET /item-tracking/customer/:id` | List by customer | Implementasi lengkap |
| `DELETE /item-tracking/:id` | Delete | Implementasi lengkap |

---

## 2. Evaluasi UX

### 2.1 Appointments Page

**Kekuatan:**
- Date picker sederhana dan mudah digunakan.
- Badge counter appointment per tanggal memberikan konteks cepat.
- Status color indicators di garis vertikal memudahkan identifikasi visual.
- Informasi harga layanan ditampilkan langsung di kartu.

**Kelemahan:**
- **Tidak ada calendar view** -- tampilan hanya list per hari. Untuk melihat jadwal seminggu, harus klik tanggal satu per satu. Ini sangat tidak efisien untuk salon/klinik yang perlu melihat jadwal keseluruhan.
- **Form create inline** -- setelah klik "Buat Appointment", form muncul di atas list. Untuk halaman yang sudah penuh appointment, user harus scroll naik-turun. Dialog/modal lebih baik.
- **Tidak ada assign staf dari UI** -- padahal backend sudah support. Ini gap serius untuk salon yang perlu tahu siapa mengerjakan apa.
- **Tidak ada time slot visual** -- tidak ada timeline view yang menunjukkan slot waktu yang sudah terisi vs kosong.
- **Cancel button terlalu kecil** -- hanya ikon X kecil tanpa konfirmasi, rawan salah klik.
- **Tidak ada pagination** -- jika satu hari ada banyak appointment, semuanya ditampilkan sekaligus.

### 2.2 Work Orders Page

**Kekuatan:**
- **Dua mode tampilan** (list + detail) dalam satu halaman -- navigasi cepat tanpa pindah route.
- **Pencarian multi-field** sangat berguna untuk bengkel yang perlu cari WO berdasarkan berbagai kriteria.
- **Detail view komprehensif** -- semua informasi relevan (barang, biaya, rincian, status) dalam satu layar.
- **Status flow intuitif** -- satu tombol untuk maju ke status berikutnya.

**Kelemahan:**
- **Tidak ada kanban board** -- untuk bengkel dengan banyak pekerjaan sekaligus, kanban (kolom per status) jauh lebih efektif daripada list.
- **Add item (rincian biaya) hanya via API** -- manajer bengkel tidak bisa menambah rincian biaya dari UI.
- **Tidak ada progress percentage** -- tidak ada indikasi seberapa jauh pekerjaan sudah berjalan.
- **Tidak ada assign ke teknisi** -- padahal backend sudah support employeeId.
- **Tidak ada due date alert** -- tidak ada peringatan jika estimasi tanggal selesai sudah terlewat.
- **Tidak ada foto attachment** -- bengkel sering butuh foto sebelum/sesudah perbaikan.

### 2.3 Item Tracking Page

**Kekuatan:**
- **Empat tab** yang sangat well-organized untuk workflow laundry.
- **Ticket lookup** -- fitur killer untuk interaksi counter. Pelanggan datang, staf ketik nomor tiket, langsung tahu status.
- **One-click status update** -- workflow tercepat dibanding appointment dan work order. Satu tombol langsung update.
- **Form receive item** terstruktur dengan field yang relevan untuk laundry.

**Kelemahan:**
- **Tidak ada batch processing** -- laundry sering menerima banyak item sekaligus (10+ item per pelanggan). Harus input satu per satu.
- **Tidak ada barcode/QR untuk tiket** -- nomor tiket hanya teks, tidak ada barcode yang bisa discan.
- **Tidak ada estimasi selesai visual** -- field estimatedReady ada di backend tapi tidak prominently ditampilkan di UI.
- **Tidak ada sorting** -- item ditampilkan berdasarkan waktu terima (oldest first), tidak bisa sort by nama pelanggan atau estimasi selesai.
- **Tidak ada print tiket** -- untuk laundry, cetak tiket/label adalah kebutuhan dasar.

---

## 3. Analisis Kompetitif

### 3.1 Moka POS (Indonesia)

- **Target**: Retail dan F&B, bukan bisnis jasa.
- **Appointments**: Tidak ada.
- **Work Orders**: Tidak ada.
- **Item Tracking**: Tidak ada.
- **Relevansi**: Moka tidak bersaing langsung di segmen layanan. Bisnis jasa yang pakai Moka hanya memanfaatkan fitur kasir dasar.
- **Keunggulan TiloPOS**: Memiliki ketiga sub-modul layanan yang tidak dimiliki Moka sama sekali.

### 3.2 Fresha (Global -- Salon & Spa)

- **Target**: Dedicated untuk salon, spa, dan klinik kecantikan.
- **Appointments**:
  - Calendar view mingguan/harian per staf (kolom per staf).
  - Drag-to-reschedule.
  - Online booking by customer (widget di website).
  - Automated reminders via email/SMS.
  - Waitlist jika slot penuh.
  - Recurring appointments.
- **Work Orders / Item Tracking**: Tidak ada (bukan target Fresha).
- **Keunggulan vs TiloPOS**: Calendar view jauh lebih superior, online booking, automated reminders, recurring appointments.
- **Kelemahan vs TiloPOS**: Hanya untuk salon/spa, tidak punya POS lengkap (kasir, inventori, laporan keuangan).

### 3.3 Sirclo/Jubelio (Indonesia -- Omnichannel)

- **Target**: E-commerce dan retail omnichannel.
- **Appointments / Work Orders / Item Tracking**: Tidak ada.
- **Relevansi**: Tidak bersaing langsung di segmen layanan.

### 3.4 Pawoon (Indonesia)

- **Target**: UMKM general (retail, F&B).
- **Appointments / Work Orders / Item Tracking**: Tidak ada fitur dedicated.
- **Relevansi**: Sama seperti Moka, tidak bersaing di segmen layanan.

### 3.5 Dedicated Service POS (Internasional)

**Housecall Pro (Field Service)**:
- Work order management lengkap dengan dispatching.
- Photo before/after.
- Customer-facing portal.
- Invoice generation otomatis.
- GPS tracking teknisi.

**CleanCloud (Laundry POS)**:
- Item tracking dengan barcode/QR.
- Batch processing (multi-item per order).
- Customer portal (track status online).
- Automated SMS/email notifications.
- Label printing.
- Delivery management.
- POS integration.

**Jobber (Service Business)**:
- Quoting dan invoicing.
- Scheduling dan dispatching.
- Client hub (customer portal).
- Automated follow-ups.
- Team management.

### Ringkasan Perbandingan

| Fitur | TiloPOS | Moka | Fresha | CleanCloud | Housecall Pro |
|-------|---------|------|--------|------------|---------------|
| Appointments | Dasar | Tidak ada | Sangat lengkap | Tidak ada | Tidak ada |
| Calendar view | List only | - | Week/Day/Staff | - | - |
| Online booking | Belum | - | Ada | - | Ada |
| Work Orders | Baik | Tidak ada | Tidak ada | Tidak ada | Sangat lengkap |
| Item Tracking | Baik | Tidak ada | Tidak ada | Sangat lengkap | Tidak ada |
| Ticket lookup | Ada | - | - | Ada + online | - |
| Barcode/QR | Belum | - | - | Ada | - |
| Customer portal | Belum | - | Ada | Ada | Ada |
| Auto notifications | Belum | - | Ada | Ada | Ada |
| Photo attachment | Belum | - | Tidak ada | Terbatas | Ada |
| POS terintegrasi | Ada | Ada | Terbatas | Terbatas | Terbatas |
| Multi-service type | 3 sub-modul | - | Salon only | Laundry only | Field service |
| Harga | Terjangkau | Menengah | Freemium | Premium | Premium |

**Insight kunci**: TiloPOS memiliki keunikan sebagai satu-satunya POS Indonesia yang mencakup tiga tipe layanan sekaligus (appointment + work order + item tracking) terintegrasi dengan POS lengkap. Tidak ada kompetitor domestik yang menawarkan ini. Kompetitor internasional lebih mature tapi hanya fokus satu tipe layanan dan tidak mengakomodasi kebutuhan pasar Indonesia.

---

## 4. Best Practice Industri

### 4.1 Appointment Management (Dari Fresha/Booksy)

- **Calendar view per staf**: tampilkan jadwal sebagai kolom per karyawan, baris per jam. Ini standar industri salon.
- **Online self-booking**: pelanggan booking sendiri via link/widget tanpa perlu telepon/WhatsApp.
- **Automated reminders**: SMS/email H-1 dan H-2 jam sebelum appointment mengurangi no-show 30-50%.
- **Buffer time**: otomatis sisipkan waktu jeda antar appointment untuk persiapan/pembersihan.
- **Recurring appointments**: pelanggan yang rutin datang tiap 2 minggu bisa di-set recurring.
- **Smart scheduling**: rekomendasi slot waktu berdasarkan durasi layanan dan ketersediaan staf.

### 4.2 Work Order Management (Dari Housecall Pro/ServiceTitan)

- **Photo documentation**: foto sebelum dan sesudah perbaikan sebagai bukti dan transparansi.
- **Customer approval workflow**: kirim estimasi biaya ke pelanggan via SMS/email, pelanggan approve sebelum dikerjakan.
- **Parts inventory integration**: cek ketersediaan sparepart langsung dari work order.
- **Technician assignment & dispatching**: assign pekerjaan ke teknisi dengan notifikasi.
- **SLA tracking**: set target waktu penyelesaian dan alert jika terlewat.
- **Invoice auto-generation**: buat invoice otomatis dari rincian work order items.

### 4.3 Item Tracking (Dari CleanCloud/Starchup)

- **Barcode/QR label printing**: cetak label dengan barcode/QR yang ditempel ke item pelanggan. Scan untuk update status.
- **Batch processing**: input banyak item sekaligus per pelanggan (satu order, banyak item).
- **Customer-facing tracking page**: pelanggan cek status online via link/QR tanpa perlu telepon.
- **Automated pickup notification**: SMS otomatis saat status berubah ke "Siap Ambil".
- **Delivery management**: opsi antar-jemput cucian dengan tracking driver.
- **Quality checklist**: checklist kualitas sebelum item ditandai "ready".

---

## 5. Gap Analysis

### 5.1 Gap Kritis (Harus Segera Ditangani)

| Gap | Sub-modul | Detail | Impact |
|-----|-----------|--------|--------|
| Tidak ada calendar view | Appointments | Hanya list per hari, tidak efisien | UX sangat buruk untuk salon/klinik |
| Tidak ada assign staf di UI | Appointments | Backend ready, UI belum | Fitur assign staf tidak bisa digunakan |
| Tidak ada mobile view | Semua | Semua sub-modul hanya punya desktop view | Staf di lapangan tidak bisa akses optimal |
| Rincian biaya hanya via API | Work Orders | Manajer tidak bisa add item dari UI | Fitur billing tidak lengkap di frontend |

### 5.2 Gap Penting (Prioritas Tinggi)

| Gap | Sub-modul | Detail | Impact |
|-----|-----------|--------|--------|
| Tidak ada notifikasi otomatis | Semua | SMS/WA/email belum terintegrasi | Pelanggan tidak diberitahu perubahan status |
| Tidak ada customer portal | Semua | Pelanggan tidak bisa cek status online | Banyak telepon masuk untuk tanya status |
| Tidak ada batch processing | Item Tracking | Input satu per satu | Lambat untuk laundry volume tinggi |
| Tidak ada barcode/QR tiket | Item Tracking | Tiket hanya teks | Proses lookup manual, rawan error |
| Tidak ada foto attachment | Work Orders | Tidak bisa lampirkan foto | Transparansi dan dokumentasi kurang |

### 5.3 Gap Nice-to-Have (Prioritas Menengah)

| Gap | Sub-modul | Detail |
|-----|-----------|--------|
| Tidak ada online self-booking | Appointments | Pelanggan tidak bisa booking sendiri |
| Tidak ada recurring appointments | Appointments | Pelanggan regular harus re-book manual |
| Tidak ada kanban view | Work Orders | List view kurang visual untuk multi-WO |
| Tidak ada SLA tracking | Work Orders | Tidak ada alert deadline terlewat |
| Tidak ada delivery management | Item Tracking | Antar-jemput cucian belum didukung |
| Tidak ada label printing | Item Tracking | Cetak label barcode belum tersedia |
| Tidak ada analytics dashboard | Semua | Tidak ada insight per sub-modul |

---

## 6. Rekomendasi Perbaikan Teratas

### Prioritas 1: Calendar View untuk Appointments

**Effort: High | Impact: Critical**

Implementasikan tampilan kalender mingguan/harian yang menampilkan appointment sebagai blok waktu. Ini adalah standar industri salon/klinik dan merupakan perubahan terbesar yang dibutuhkan.

Opsi library: `@fullcalendar/react` atau custom implementation dengan CSS grid (mirip pendekatan table canvas di Manajemen Meja).

Fitur minimum:
- Day view: timeline vertikal dengan blok appointment.
- Week view: kolom per hari atau per staf.
- Drag-to-reschedule.
- Click empty slot to create.

### Prioritas 2: Staff Assignment di UI Appointments

**Effort: Low | Impact: High**

Backend sudah siap. Tambahkan dropdown karyawan di form create/edit appointment. Fetch daftar karyawan dari API yang sudah ada.

### Prioritas 3: Add Work Order Items dari UI

**Effort: Medium | Impact: High**

Tambahkan section di halaman detail work order untuk menambah/menghapus rincian biaya (items). Form: description, type (dropdown jasa/sparepart/lainnya), quantity, harga satuan. Total otomatis dihitung.

### Prioritas 4: Mobile Views

**Effort: Medium | Impact: High**

Buat file `.mobile.tsx` untuk ketiga sub-modul. Prioritaskan:
- Appointments: card-based day view, tombol aksi besar.
- Work Orders: list view compact, status update satu tap.
- Item Tracking: tab view yang sama tapi layout kartu disesuaikan untuk layar kecil.

### Prioritas 5: Batch Item Receive

**Effort: Medium | Impact: Medium**

Untuk item tracking, tambahkan mode "Batch Receive" yang memungkinkan input banyak item sekaligus per pelanggan. Satu form untuk data pelanggan, lalu tabel/daftar untuk menambah multiple items.

### Prioritas 6: Customer Notification Infrastructure

**Effort: High | Impact: Medium**

Integrasi dengan provider SMS/WhatsApp (misalnya Twilio, Fonnte, atau provider lokal Indonesia). Trigger otomatis saat status berubah ke status tertentu (confirmed, ready, completed).

---

## 7. Roadmap

### Fase 1: Core UX Improvement (2-3 Minggu)

- Calendar view untuk Appointments (day view + week view).
- Staff assignment dropdown di form appointment.
- Add/remove work order items dari UI.
- Modularisasi komponen appointment (pisahkan form, card, calendar ke file terpisah).

### Fase 2: Mobile & Completeness (3-4 Minggu)

- Mobile views untuk ketiga sub-modul.
- Batch item receive di Item Tracking.
- Cancel confirmation dialog untuk appointments (menggantikan ikon X kecil).
- Kanban view opsional untuk Work Orders.

### Fase 3: Customer Experience (4-6 Minggu)

- Customer-facing tracking page untuk Item Tracking (pelanggan cek status via link/QR).
- Barcode/QR generation untuk nomor tiket.
- Label printing untuk item tracking.
- Estimasi waktu selesai ditampilkan secara prominent di UI.

### Fase 4: Notifications & Automation (6-8 Minggu)

- Integrasi SMS/WhatsApp untuk notifikasi otomatis.
- Automated appointment reminders (H-1 via SMS).
- Notification saat item tracking status berubah ke "ready".
- Work order status notification ke pelanggan.

### Fase 5: Advanced Features (8-12 Minggu)

- Online self-booking untuk appointments (customer-facing booking page).
- Photo attachment untuk work orders (upload sebelum/sesudah).
- Recurring appointments.
- Analytics dashboard per sub-modul:
  - Appointments: utilization rate, no-show rate, revenue per staf, popular services.
  - Work Orders: average turnaround time, revenue by service type, parts cost breakdown.
  - Item Tracking: average turnaround time, items per day, busiest hours, revenue per layanan.
- SLA tracking dan deadline alerts untuk work orders.
- Delivery management untuk item tracking (antar-jemput).
- Invoice auto-generation dari work order items.
