# Audit Fitur: Modul Karyawan (HR & Access Control)

Dokumen ini menganalisis kondisi terkini modul Karyawan di TiloPOS, mengevaluasi UX, membandingkan dengan kompetitor dan best practice industri, serta menyusun rekomendasi perbaikan dan roadmap pengembangan.

---

## 1. Kondisi Terkini (Current State)

### 1.1 Halaman Daftar Karyawan (`employees-page.tsx`)

**Fitur yang tersedia:**
- Tabel data dengan kolom: Nama, Email, Telepon, Role (dengan badge label), Outlet, Status, Aksi
- Pencarian teks (search by name/email/phone)
- Filter dropdown: Role (semua role yang tersedia via `ROLE_OPTIONS`) dan Status (Aktif/Nonaktif)
- Tombol "Tambah Karyawan" dengan keyboard shortcut `N`
- Aksi per-baris: Edit dan Hapus (hard delete)
- Data di-query berdasarkan `outletId` dari UI store atau user context
- Empty state dengan CTA "Tambah Karyawan Pertama"
- Komponen HelpSidebar dan InlineHelpCard terintegrasi

**Catatan:** Tidak ada versi mobile terpisah yang terdeteksi (tidak ada `employees-page.mobile.tsx`).

### 1.2 Form Karyawan (`employee-form-page.tsx`)

**Fitur yang tersedia:**
- Mode create dan edit (shared form)
- Field: Nama Lengkap (wajib, min 2), Email (wajib, format email), Telepon, PIN (wajib saat create, 6 digit angka), Role (dropdown 6 opsi), Outlet (dropdown dari API), Tarif per Jam (Rp), Status Aktif (toggle switch, hanya di mode edit)
- Validasi menggunakan Zod schema (conditional berdasarkan isEdit)
- Outlet options di-fetch dari `settingsApi.getOutlets`
- PIN field: `type="password"`, `maxLength={6}`, `inputMode="numeric"`
- Error handling via `handleMutationError`
- Loading state dan disabled button saat submit

### 1.3 Shift Management

Shift management diimplementasikan di modul POS (bukan di modul karyawan), namun terkait erat:
- Buka shift dengan input kas awal
- Tutup shift dengan input kas akhir
- Laporan shift tersimpan per karyawan
- Data shift digunakan di modul Laporan

### 1.4 Role-Based Access Control (RBAC)

Implementasi RBAC melalui:
- `@Roles()` decorator di backend NestJS
- Role guard yang memeriksa role dari JWT payload
- Frontend menampilkan/menyembunyikan menu berdasarkan role user
- 7 level hierarki: Super Admin, Owner, Manager, Supervisor, Cashier, Kitchen, Inventory

### 1.5 Activity Log

Activity logging diimplementasikan di backend untuk mencatat aksi-aksi penting per karyawan.

---

## 2. Evaluasi UX

### 2.1 Kelebihan

| Aspek | Evaluasi |
|-------|----------|
| Filter yang relevan | Filter Role dan Status langsung tersedia — dua dimensi paling umum untuk filter karyawan |
| Validasi PIN | Regex validation untuk 6 digit, `inputMode="numeric"` untuk mobile keyboard |
| Role labels | Badge yang jelas dengan label Bahasa Indonesia via `ROLE_LABELS` constant |
| Outlet context | Data otomatis di-filter berdasarkan outlet yang dipilih di UI |
| Form yang bersih | Layout 2-kolom, field terorganisir logis (info pribadi > akses > kompensasi) |
| Toggle aktif/nonaktif | Hanya muncul di mode edit — menghindari kebingungan saat create |
| Help system | InlineHelpCard dan HelpSidebar tersedia |

### 2.2 Kelemahan dan Area Perbaikan

| Aspek | Masalah | Dampak | Prioritas |
|-------|---------|--------|-----------|
| Tidak ada halaman mobile | Modul karyawan hanya punya versi desktop | Owner tidak bisa manage karyawan dari HP saat di lapangan | Tinggi |
| Hard delete karyawan | Hapus karyawan = data hilang, bukan soft delete | Data historis (shift, transaksi) bisa kehilangan referensi | Tinggi |
| Tidak ada profil detail | Tidak ada halaman detail per karyawan (riwayat shift, performa) | Sulit mengevaluasi kinerja individu | Tinggi |
| Tidak ada penjadwalan | Tidak ada fitur scheduling/roster karyawan | Penjadwalan dilakukan manual di luar sistem | Sedang |
| Tidak ada commission tracking | Field tarif per jam ada, tapi tidak ada field/logika komisi | Bisnis dengan sistem komisi harus hitung manual | Sedang |
| Tidak ada avatar/foto | Tidak ada upload foto karyawan | Identifikasi visual kurang, terutama di activity log | Rendah |
| Tidak ada onboarding flow | Karyawan baru langsung masuk ke sistem tanpa guided setup | Bisa bingung saat pertama kali login | Rendah |
| Tidak ada bulk import | Karyawan harus ditambah satu per satu | Inefisien untuk bisnis besar yang onboarding banyak karyawan sekaligus | Rendah |

### 2.3 Concern Teknis

| Aspek | Detail |
|-------|--------|
| Hard delete vs soft delete | `deleteMutation` memanggil `employeesApi.delete(id)` — perlu konfirmasi apakah ini hard delete di backend. Jika ya, data historis bisa terputus |
| PIN storage | Perlu verifikasi bahwa PIN di-hash di backend, bukan disimpan plain text |
| Role check frontend only | Menu hiding di frontend perlu diperkuat dengan guard di backend (sudah ada `@Roles()` decorator) |
| Outlet filtering | Jika `outletId` kosong, query mungkin mengembalikan semua karyawan tanpa filter — perlu validasi |

---

## 3. Analisis Kompetitor

### 3.1 Moka POS — Manajemen Karyawan

**Fitur Moka:**
- Daftar karyawan dengan foto profil dan status aktif
- 4 role preset: Owner, Manager, Cashier, Waiter
- Custom role builder (tambah role sendiri dengan permission granular)
- Shift management dengan cash drawer tracking
- Attendance tracking (clock in/out)
- Komisi per karyawan (persentase atau nominal per transaksi)
- Laporan performa per karyawan (total sales, jumlah transaksi, rata-rata)
- Absensi karyawan via PIN atau fingerprint (dengan hardware tambahan)

**Kelebihan Moka dibanding TiloPOS:**
- Custom role builder — tidak terbatas pada preset
- Attendance tracking terpisah dari shift POS
- Komisi terintegrasi di laporan
- Foto profil karyawan
- Performance dashboard per karyawan

**Kekurangan Moka dibanding TiloPOS:**
- Hanya 4 role preset (TiloPOS punya 7 yang lebih granular)
- Custom role bisa membingungkan jika tidak dikonfigurasi dengan benar
- Fingerprint attendance butuh hardware tambahan

### 3.2 Majoo — HR Management

**Fitur Majoo:**
- Modul HR terintegrasi (bukan hanya karyawan POS)
- Absensi lengkap dengan foto selfie + GPS
- Penjadwalan shift (roster) dengan drag-and-drop
- Penggajian otomatis (payroll integration)
- Cuti dan ijin management
- Performance review cycle
- Komisi dan bonus tracking
- Karyawan app (self-service: lihat jadwal, request cuti)

**Kelebihan Majoo dibanding TiloPOS:**
- HR suite lengkap (attendance, payroll, leave management)
- Scheduling/roster dengan visual interface
- Penggajian otomatis
- Self-service app untuk karyawan
- GPS-based attendance

**Kekurangan Majoo dibanding TiloPOS:**
- Harga jauh lebih mahal (modul HR terpisah)
- Overengineered untuk UMKM kecil (< 10 karyawan)
- Setup kompleks, butuh waktu lama
- Role hierarchy tidak se-granular TiloPOS untuk konteks POS

### 3.3 Ringkasan Perbandingan

| Fitur | TiloPOS | Moka | Majoo |
|-------|---------|------|-------|
| Jumlah role preset | 7 (paling granular) | 4 | 5 |
| Custom role | Belum | Ya | Ya |
| Shift management | Ya | Ya | Ya |
| Cash drawer tracking | Ya | Ya | Ya |
| Attendance (absensi) | Melalui shift | PIN/fingerprint | Selfie + GPS |
| Scheduling/roster | Belum | Terbatas | Ya (drag-drop) |
| Performance report | Belum | Ya | Ya |
| Komisi | Belum (ada field tarif/jam) | Ya | Ya |
| Payroll integration | Belum | Terbatas | Ya |
| Karyawan app | Belum | Belum | Ya |
| Foto profil | Belum | Ya | Ya |
| Halaman mobile | Belum | Responsive | Responsive |
| Harga | Termasuk paket | Menengah | Mahal (add-on) |

---

## 4. Best Practice: Referensi Industri

### 4.1 Square Team Management

Square menyediakan employee management yang menjadi benchmark di industri POS:

- **Team Dashboard:** Overview semua karyawan dengan status real-time (on shift, off shift, break)
- **Permissions by Function:** Bukan hanya role-based, tapi bisa mengatur permission per fitur (misalnya: akses laporan = ya, edit produk = tidak)
- **Time Tracking:** Clock in/out tercatat otomatis, termasuk break time
- **Labor Reports:** Biaya tenaga kerja vs revenue, labor cost percentage, overtime tracking
- **Scheduling:** Buat jadwal shift mingguan, kirim notifikasi ke karyawan
- **Team Communication:** Kirim pesan ke karyawan langsung dari dashboard
- **Tips Management:** Distribusi tip antar karyawan berdasarkan shift

**Pelajaran untuk TiloPOS:**
- Labor cost analysis (biaya tenaga kerja vs revenue) sangat berharga untuk pemilik bisnis
- Permission per fitur memberikan fleksibilitas lebih tanpa membuat custom role yang rumit
- Real-time status karyawan membantu manager memantau operasional

### 4.2 Lightspeed Staff Management

Lightspeed adalah POS premium yang fokus pada retail dan F&B:

- **Activity Feed:** Timeline semua aksi karyawan — mirip social media feed, mudah di-scan
- **Sales Attribution:** Setiap penjualan di-attribute ke karyawan yang melayani (bukan hanya kasir)
- **Commission Profiles:** Konfigurasi komisi per karyawan atau per role (persentase, tier, atau flat)
- **Goal Tracking:** Set target penjualan per karyawan, monitor progres secara real-time
- **Manager Approval Workflow:** Aksi tertentu (void, refund, diskon besar) memerlukan approval manager via PIN

**Pelajaran untuk TiloPOS:**
- Manager approval workflow menambah lapisan keamanan tanpa membatasi operasional
- Goal tracking dan sales attribution mendorong kompetisi sehat antar karyawan
- Activity feed lebih mudah dibaca daripada tabel log tradisional

### 4.3 Toast Team Management (F&B Focused)

Toast fokus pada industri F&B dan memiliki fitur team management yang kuat:

- **Role-based POS Layout:** Tampilan POS berubah berdasarkan role (kasir melihat layout berbeda dari manager)
- **Server Assignment:** Assign waiter ke meja, tracking performa per server
- **Tip Pool Management:** Konfigurasi distribusi tip (pool, individual, atau hybrid)
- **Payroll Integration:** Integrasi langsung dengan sistem penggajian
- **Labor Compliance:** Alert jika karyawan mendekati overtime atau melanggar regulasi jam kerja

**Pelajaran untuk TiloPOS:**
- Server/waiter assignment ke meja sangat berguna untuk restoran
- Labor compliance alert mencegah masalah hukum
- POS layout per role meningkatkan efisiensi (kasir tidak perlu melihat fitur yang tidak relevan)

---

## 5. Gap Analysis

### 5.1 Gap Kritis (Harus segera dibenahi)

| # | Gap | Dampak | Referensi |
|---|-----|--------|-----------|
| G1 | Tidak ada halaman mobile untuk modul karyawan | Owner tidak bisa manage karyawan dari mobile | Pola DeviceRoute di modul lain |
| G2 | Hard delete karyawan (bukan soft delete) | Data historis bisa kehilangan referensi — shift report, activity log | Best practice data retention |
| G3 | Tidak ada halaman profil/detail karyawan | Evaluasi performa individu tidak bisa dilakukan di satu tempat | Square Team Dashboard, Moka |

### 5.2 Gap Signifikan (Penting untuk diferensiasi)

| # | Gap | Dampak | Referensi |
|---|-----|--------|-----------|
| G4 | Tidak ada performance report per karyawan | Owner harus analisis manual dari laporan umum | Square Labor Reports, Moka |
| G5 | Tidak ada scheduling/roster | Penjadwalan shift manual di luar sistem | Square Scheduling, Majoo |
| G6 | Tidak ada komisi tracking | Bisnis dengan sistem komisi harus hitung di luar TiloPOS | Moka, Lightspeed Commission |
| G7 | Tidak ada manager approval workflow | Aksi sensitif (void, refund, diskon besar) tidak ada gate keeper | Lightspeed Manager Approval |

### 5.3 Gap Aspiratif (Nice to have untuk pertumbuhan)

| # | Gap | Dampak | Referensi |
|---|-----|--------|-----------|
| G8 | Tidak ada foto profil karyawan | Identifikasi visual terbatas | Moka, Square |
| G9 | Tidak ada custom role builder | Bisnis dengan kebutuhan akses unik harus menggunakan role terdekat | Moka Custom Roles |
| G10 | Tidak ada absensi terpisah dari shift | Attendance tracking hanya untuk kasir, bukan staf lain | Majoo Attendance |
| G11 | Tidak ada goal tracking / target penjualan | Tidak bisa set dan monitor KPI per karyawan | Lightspeed Goals |
| G12 | Tidak ada labor cost analysis | Tidak bisa melihat rasio biaya tenaga kerja vs revenue | Square Labor Reports |

---

## 6. Rekomendasi Perbaikan (Top Improvements)

### 6.1 Prioritas 1: Soft Delete dan Halaman Mobile (mengatasi G1, G2)

**Soft Delete:**
- Ubah delete karyawan menjadi soft delete (set `isActive = false` alih-alih delete record)
- Karyawan nonaktif tetap muncul di laporan historis namun tidak bisa login
- Tambah filter "Tampilkan karyawan nonaktif" di daftar

**Halaman Mobile:**
- Buat `employees-page.mobile.tsx` mengikuti pola DeviceRoute
- Card layout dengan info ringkas (nama, role badge, outlet, status)
- Tap untuk lihat detail, long press untuk aksi cepat
- Form tambah karyawan yang mobile-friendly

**Estimasi effort:** 3-4 hari development
**Impact:** Tinggi — menjaga integritas data dan memungkinkan manajemen dari mana saja

### 6.2 Prioritas 2: Halaman Profil Karyawan (mengatasi G3, G4)

**Deskripsi:** Buat halaman detail karyawan (`/app/employees/:id`) yang menampilkan:
- Header: Nama, role, outlet, status, tanggal bergabung
- Tab "Ringkasan": Statistik performa (total shift, total transaksi diproses, rata-rata nilai transaksi, total selisih kas)
- Tab "Riwayat Shift": Daftar semua shift dengan detail kas dan selisih
- Tab "Activity Log": Timeline aksi yang dilakukan karyawan
- Grafik trend performa (optional): jumlah transaksi per minggu, selisih kas per shift

**Estimasi effort:** 4-5 hari development
**Impact:** Tinggi — memberikan visibility penuh terhadap performa setiap karyawan

### 6.3 Prioritas 3: Manager Approval Workflow (mengatasi G7)

**Deskripsi:**
- Konfigurasi aksi yang memerlukan approval: void transaksi, refund, diskon di atas threshold, perubahan harga
- Saat Cashier melakukan aksi yang butuh approval, muncul prompt untuk input PIN Manager/Supervisor
- Log approval tersimpan (siapa yang approve, kapan, untuk aksi apa)

**Estimasi effort:** 3-4 hari development (backend + frontend)
**Impact:** Tinggi — lapisan keamanan tambahan yang sangat dibutuhkan tanpa menghambat operasional

### 6.4 Prioritas 4: Commission Tracking (mengatasi G6)

**Deskripsi:**
- Tambah field commission di profil karyawan: tipe (persentase/nominal), nilai, basis (per transaksi/per item)
- Hitung komisi otomatis berdasarkan transaksi yang diproses
- Laporan komisi per karyawan per periode
- Integrasi dengan laporan keuangan

**Estimasi effort:** 3-4 hari development
**Impact:** Sedang-Tinggi — penting untuk bisnis retail dan jasa yang menggunakan sistem komisi

### 6.5 Prioritas 5: Scheduling / Roster (mengatasi G5)

**Deskripsi:**
- Kalender mingguan untuk jadwal shift per karyawan
- Buat jadwal dengan drag-and-drop atau form cepat
- Notifikasi ke karyawan tentang jadwal mereka (via app atau WhatsApp)
- Deteksi konflik jadwal (satu karyawan dijadwalkan di dua shift bersamaan)
- Template jadwal yang bisa digunakan ulang setiap minggu

**Estimasi effort:** 5-7 hari development
**Impact:** Sedang — sangat berguna untuk bisnis dengan banyak karyawan dan shift yang kompleks

---

## 7. Roadmap Pengembangan

### Phase 1: Foundation Fix (Sprint 1-2)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Soft delete karyawan | Ubah hard delete menjadi soft delete | 1 hari |
| Halaman mobile | Buat `employees-page.mobile.tsx` dengan card layout | 2 hari |
| Profil karyawan | Detail page dengan ringkasan performa dan riwayat shift | 4 hari |
| Foto profil | Upload dan tampilan avatar karyawan | 2 hari |

**Outcome:** Pengalaman manajemen karyawan yang lengkap di semua perangkat.

### Phase 2: Security & Control (Sprint 3-4)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Manager approval workflow | PIN approval untuk aksi sensitif | 4 hari |
| Permission granular | Tambah opsi permission per fitur (bukan hanya per role) | 3 hari |
| PIN security enhancement | Force PIN change, PIN expiry, failed attempt lockout | 2 hari |
| Audit dashboard | Halaman khusus untuk review activity log dengan filter dan search | 3 hari |

**Outcome:** Keamanan dan kontrol yang setara dengan POS enterprise.

### Phase 3: Performance & Compensation (Sprint 5-6)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Commission tracking | Konfigurasi dan perhitungan komisi otomatis | 4 hari |
| Performance report | Dashboard performa per karyawan dengan metrik kunci | 3 hari |
| Labor cost analysis | Rasio biaya tenaga kerja vs revenue per outlet | 2 hari |
| Goal tracking | Set target penjualan dan monitor progres | 3 hari |

**Outcome:** Visibilitas penuh terhadap performa dan biaya tenaga kerja.

### Phase 4: Scheduling & HR (Sprint 7-8)

| Item | Deskripsi | Effort |
|------|-----------|--------|
| Shift scheduling | Kalender jadwal shift mingguan dengan drag-drop | 5 hari |
| Attendance tracking | Clock in/out terpisah dari shift POS | 3 hari |
| Custom roles | Role builder dengan permission checkbox per fitur | 4 hari |
| Leave management | Cuti dan ijin request/approval workflow | 3 hari |

**Outcome:** Mini-HR suite yang mengurangi kebutuhan software HR terpisah.

---

## 8. Kesimpulan

Modul Karyawan TiloPOS memiliki keunggulan pada granularitas role (7 level, paling banyak di antara kompetitor UMKM) dan integrasi native dengan shift management POS. Fondasi RBAC yang sudah diimplementasikan di backend (`@Roles()` decorator) solid dan bisa dikembangkan lebih jauh.

Gap kritis yang perlu segera ditutup: soft delete (bukan hard delete) untuk menjaga integritas data, halaman mobile yang belum tersedia, dan halaman profil karyawan untuk monitoring performa.

Untuk diferensiasi jangka menengah, manager approval workflow dan commission tracking akan memberikan nilai tambah signifikan yang belum banyak dimiliki kompetitor di segmen harga yang sama. Scheduling/roster adalah fitur aspiratif yang bisa menjadi selling point kuat jika diimplementasikan dengan UX yang sederhana — mengingat kompetitor utama (Moka) juga belum memiliki fitur ini secara native.

Fokus utama: **perkuat keamanan dan akuntabilitas** terlebih dahulu (Phase 1-2), baru kemudian tambah fitur performa dan HR (Phase 3-4). Urutan ini sesuai dengan prioritas UMKM — keamanan kas dan kontrol akses lebih mendesak daripada scheduling atau payroll.
