# Feature Audit: Modul Pengaturan (Settings)

Dokumen ini berisi evaluasi menyeluruh terhadap modul Pengaturan TiloPOS, meliputi penilaian kondisi saat ini, analisis UX, perbandingan kompetitor, gap analysis, dan rekomendasi perbaikan.

---

## 1. Penilaian Kondisi Saat Ini (Current State Assessment)

### Inventaris Halaman Pengaturan

TiloPOS memiliki 15 halaman pengaturan yang sudah diimplementasikan:

| No | Halaman | File Frontend | Status Backend | Catatan |
|----|---------|--------------|---------------|---------|
| 1 | Pengaturan Bisnis | `business-settings-page.tsx` | Lengkap (GET/PUT) | Form dengan Zod validation |
| 2 | Kelola Outlet | `outlets-page.tsx` | Lengkap (CRUD) | DataTable + dialog + template apply |
| 3 | Perangkat | `devices-page.tsx` | Lengkap (list/sync/delete) | Real-time status via WebSocket |
| 4 | Notifikasi | `notifications-page.tsx` | Lengkap (settings + logs) | Multi-channel, log viewer |
| 5 | Pengaturan Pajak | `tax-settings-page.tsx` | Lengkap (GET/PUT) | Tax exemption rules |
| 6 | Template Struk | `receipt-template-page.tsx` | Lengkap (GET/PUT) | Live preview |
| 7 | Metode Pembayaran | `payment-settings-page.tsx` | Lengkap (CRUD) | Grouped by type |
| 8 | Konfigurasi Printer | `printer-settings-page.tsx` | Lengkap (CRUD) | Test print, multi-type |
| 9 | Jam Operasional | `operating-hours-page.tsx` | Lengkap (GET/PUT) | Weekly + special hours |
| 10 | Modifier | `modifier-groups-page.tsx` | Lengkap (CRUD) | Nested modifiers |
| 11 | Tipe Bisnis | `business-type-page.tsx` | Lengkap (presets + change) | Template auto-apply |
| 12 | Fitur | `features-page.tsx` | Lengkap (list/toggle) | Dependency system |
| 13 | Tampilan | `appearance-settings-page.tsx` | Lengkap (GET/PUT) | Color presets + custom hex |
| 14 | Jadwal Laporan | `report-schedule-page.tsx` | Lengkap (CRUD) | Multi-recipient email |
| 15 | Langganan & Billing | `billing-page.tsx` | Lengkap (get/upgrade/cancel) | Plan comparison, invoices |

### Arsitektur Backend

**Endpoint Pattern:**
- Base path: `/api/v1/settings`
- Auth: JWT + role guard (Owner, Manager only)
- Multi-tenancy: Business-scoped via `businessId` dari JWT
- Resource-level auth: `@BusinessScoped()` decorator untuk outlet-level operations

**Repository Pattern:**
- Semua operasi melalui `ISettingsRepository` interface
- Injected via `REPOSITORY_TOKENS.SETTINGS`
- Clean separation antara controller dan data access

**Validasi:**
- Backend: DTO classes dengan class-validator
- Frontend: Zod schemas dengan React Hook Form
- Tax rate: 0-100% validation
- Time format: HH:mm regex validation
- Email: Format validation untuk report recipients

### Arsitektur Frontend

**State Management:**
- Server state: TanStack Query dengan query keys yang konsisten
- Client state: React Hook Form untuk form management
- UI state: Zustand (feature store, UI store)

**Pola Konsisten:**
- Semua halaman menggunakan `PageHeader` component
- CRUD pages menggunakan `DataTable` + `Dialog` pattern
- Form pages menggunakan `Card` + `Form` + `Button Simpan` pattern
- Error handling via `handleMutationError` utility
- Success notifications via `toast.success`

---

## 2. Evaluasi UX (User Experience)

### Kelebihan

**Konsistensi desain tinggi:**
- Semua halaman mengikuti pola layout yang sama (PageHeader + content cards)
- Tombol aksi konsisten (Simpan, Tambah, Edit, Hapus)
- Loading state terstandar (Skeleton untuk halaman, Loader2 untuk tombol)
- Toast notifications untuk semua operasi berhasil/gagal

**Form validation yang baik:**
- Real-time validation via Zod
- Error messages dalam Bahasa Indonesia
- Disable button saat form sedang disubmit (prevent double-submit)
- `aria-busy` dan `aria-label` untuk aksesibilitas

**Live preview pada Template Struk:**
- Perubahan elemen langsung terlihat di panel preview
- Preview realistis dengan contoh data transaksi
- Responsive terhadap perubahan ukuran kertas

**Feature dependency system:**
- Warning card menjelaskan bahwa menonaktifkan fitur menyembunyikan menu
- Badge "Butuh: [dependency]" pada fitur dengan ketergantungan
- Auto-disable fitur turunan saat fitur utama dimatikan

### Kelemahan

**Navigasi settings tidak memiliki sidebar khusus:**
- Pengguna harus kembali ke menu utama untuk berpindah antar sub-halaman pengaturan
- Tidak ada overview page yang menampilkan ringkasan semua pengaturan
- Sulit menemukan pengaturan tertentu tanpa mengetahui lokasi pastinya

**Tidak ada search/filter global di settings:**
- Dengan 15 halaman pengaturan, pengguna mungkin kesulitan menemukan pengaturan spesifik
- Tidak ada fitur "Search settings" seperti yang dimiliki Shopify atau macOS System Preferences

**Beberapa halaman kurang guided:**
- Halaman Notifikasi membutuhkan input "ID Penerima" manual untuk melihat log — tidak user-friendly
- Halaman Perangkat tidak memiliki panduan cara menambahkan perangkat baru
- Halaman Tipe Bisnis tidak menampilkan perbandingan fitur antar tipe sebelum memilih

**Inkonsistensi form pattern:**
- Beberapa halaman menggunakan React Hook Form + Zod (Business Settings, Tax)
- Beberapa halaman menggunakan manual state management (Receipt Template, Operating Hours)
- Sebaiknya distandarkan ke satu approach

**Tidak ada undo/history:**
- Perubahan pengaturan langsung berlaku tanpa opsi undo
- Tidak ada history/audit log untuk perubahan settings
- Perubahan tipe bisnis khususnya berdampak besar tanpa rollback yang mudah

---

## 3. Analisis Kompetitor

### Moka POS Settings

**Kelebihan Moka:**
- Settings sidebar dengan kategori yang jelas
- Guided setup wizard untuk pengguna baru
- Preview struk yang lebih detail dengan template multiple
- Integrasi pembayaran langsung (tidak perlu setup manual)

**Kelemahan Moka:**
- Multi-outlet membutuhkan paket yang lebih mahal
- Kustomisasi fitur lebih terbatas (tidak bisa on/off per fitur)
- Tidak ada business type preset

### Majoo Settings

**Kelebihan Majoo:**
- Dashboard settings dengan card overview
- Notifikasi WhatsApp integration
- Manajemen hak akses per role lebih detail

**Kelemahan Majoo:**
- Navigasi settings yang berbelit
- Konfigurasi pajak kurang fleksibel
- Tidak ada live preview untuk struk

### Shopify Settings (Best Practice)

**Yang bisa diadopsi:**
- **Search bar di settings:** Cari pengaturan dengan keyword, langsung redirect ke halaman yang tepat
- **Settings overview page:** Ringkasan semua settings di satu halaman dengan quick actions
- **Change log:** Riwayat perubahan settings dengan timestamp dan user
- **Categorized sidebar:** Sidebar khusus settings yang selalu visible saat berada di area pengaturan

### Square Dashboard Settings (Best Practice)

**Yang bisa diadopsi:**
- **Setup checklist:** Progress bar yang menunjukkan berapa persen setup yang sudah selesai
- **Contextual help:** Tooltip dan inline help di setiap field pengaturan
- **Quick toggle:** Beberapa settings bisa diubah langsung dari overview tanpa masuk ke halaman detail
- **Settings validation summary:** Sebelum go-live, tampilkan daftar pengaturan yang belum lengkap

---

## 4. Gap Analysis

### Fitur yang Sudah Ada vs Best Practice

| Fitur | TiloPOS | Best Practice | Gap |
|-------|---------|--------------|-----|
| Settings search | Tidak ada | Shopify, macOS | Tinggi |
| Settings overview | Tidak ada | Shopify, Square | Tinggi |
| Setup wizard | Tidak ada | Moka, Square | Tinggi |
| Change history | Tidak ada | Shopify | Sedang |
| Settings sidebar | Tidak ada | Moka, Shopify | Sedang |
| Contextual help | Partial (HelpSidebar ada di Business Settings) | Square | Sedang |
| Undo/rollback | Tidak ada | Industry standard | Sedang |
| Import/export settings | Tidak ada | Shopify | Rendah |
| Multi-language | Tidak ada (hanya Bahasa Indonesia) | Enterprise | Rendah |
| WhatsApp notification | Tidak ada | Majoo | Rendah |
| Multiple receipt templates | 1 template per outlet | Moka (multiple) | Rendah |

### Label dan Copy yang Perlu Diperbaiki

| Lokasi | Saat Ini | Rekomendasi |
|--------|---------|-------------|
| Notifikasi > Log | "ID Penerima" | Ganti dengan dropdown karyawan |
| Printer > Test | Simulasi (fake delay) | Implementasi test print sesungguhnya via backend |
| Outlet > Deactivate | Memanggil updateOutlet tanpa data | Buat endpoint deactivate yang proper |
| Billing > Free features | List statis | Sinkronkan dengan feature flags |

### Pengaturan yang Belum Ada

1. **Mata uang dan format angka:** Pengaturan locale untuk format Rp, separator ribuan
2. **Timezone:** Pengaturan zona waktu per bisnis/outlet
3. **Backup dan restore:** Ekspor/impor konfigurasi untuk setup outlet baru
4. **Integrasi pihak ketiga:** Pengaturan API key, webhook URL, integrasi accounting
5. **Security settings:** Password policy, 2FA, session timeout
6. **Email template:** Kustomisasi template email untuk laporan dan notifikasi

---

## 5. Evaluasi Konsolidasi Halaman Settings

### Halaman yang Bisa Digabung

**Kandidat 1: Pajak + Biaya Layanan + Pembebasan**
- Saat ini: 1 halaman (sudah tergabung)
- Status: Sudah baik, tidak perlu perubahan

**Kandidat 2: Printer + Perangkat**
- Saat ini: 2 halaman terpisah
- Rekomendasi: Gabungkan menjadi "Perangkat & Printer" dengan tab
- Alasan: Keduanya terkait hardware yang terhubung ke sistem

**Kandidat 3: Jam Operasional + Hari Libur**
- Saat ini: 1 halaman (sudah tergabung)
- Status: Sudah baik, tidak perlu perubahan

### Halaman yang Sebaiknya Dipecah

**Business Settings:**
- Saat ini: Hanya informasi dasar (nama, email, telepon, alamat)
- Rekomendasi: Tambahkan tab/section untuk logo upload, social media links, dan identitas bisnis (NPWP, NIB)

---

## 6. Evaluasi Onboarding Flow

### Kondisi Saat Ini

Tidak ada guided onboarding. Pengguna baru langsung masuk ke dashboard tanpa arahan untuk setup awal.

### Rekomendasi Onboarding

**Langkah 1: Welcome Screen**
- Setelah registrasi, tampilkan welcome screen dengan pilihan: "Setup Sekarang" atau "Nanti"

**Langkah 2: Business Type Selection**
- Halaman fullscreen pilihan tipe bisnis
- Setelah dipilih, fitur dan template otomatis diterapkan

**Langkah 3: Basic Info**
- Form ringkas: nama bisnis, alamat, telepon
- Pre-fill dari data registrasi jika tersedia

**Langkah 4: Payment Methods**
- Checklist metode pembayaran yang diterima
- Quick toggle instead of full CRUD form

**Langkah 5: Confirmation**
- Ringkasan setup yang sudah dilakukan
- Tombol "Mulai Berjualan" menuju POS

**Progress indicator:**
- Tampilkan checklist progress di dashboard sampai setup 100% selesai
- Setiap item menunjukkan link ke halaman pengaturan terkait

---

## 7. Top 10 Perbaikan

| No | Perbaikan | Prioritas | Effort | Impact |
|----|----------|----------|--------|--------|
| 1 | **Onboarding wizard** untuk pengguna baru dengan setup step-by-step | Tinggi | Sedang | Tinggi |
| 2 | **Settings overview page** dengan ringkasan status semua pengaturan dan quick actions | Tinggi | Sedang | Tinggi |
| 3 | **Settings sidebar** — navigasi khusus yang selalu visible saat berada di area pengaturan | Tinggi | Rendah | Tinggi |
| 4 | **Settings search** — cari pengaturan dengan keyword | Sedang | Rendah | Sedang |
| 5 | **Standardisasi form pattern** — migrasi semua halaman ke React Hook Form + Zod | Sedang | Sedang | Sedang |
| 6 | **Perbaikan halaman Notifikasi** — ganti input ID manual dengan dropdown karyawan dan tampilkan log yang relevan secara otomatis | Sedang | Rendah | Sedang |
| 7 | **Implementasi test print sesungguhnya** via backend API, bukan simulasi delay | Sedang | Sedang | Sedang |
| 8 | **Settings change history** — log perubahan pengaturan dengan timestamp, user, dan before/after value | Rendah | Sedang | Sedang |
| 9 | **Perbandingan fitur antar tipe bisnis** di halaman Business Type sebelum user memilih | Rendah | Rendah | Rendah |
| 10 | **Contextual help (InlineHelpCard)** — terapkan di semua halaman pengaturan, bukan hanya Business Settings | Rendah | Rendah | Rendah |

---

## 8. Roadmap Implementasi

### Fase 1: Quick Wins (1-2 Minggu)

- [ ] Tambahkan settings sidebar untuk navigasi antar sub-halaman pengaturan
- [ ] Terapkan InlineHelpCard dan HelpSidebar di semua halaman pengaturan (saat ini hanya ada di Business Settings)
- [ ] Perbaiki halaman Notifikasi: ganti input ID manual dengan dropdown karyawan
- [ ] Tambahkan settings search sederhana (filter halaman berdasarkan keyword)

### Fase 2: UX Improvement (2-4 Minggu)

- [ ] Buat Settings Overview page dengan status ringkasan dan quick actions
- [ ] Standardisasi semua form ke React Hook Form + Zod
- [ ] Tambahkan perbandingan fitur per tipe bisnis di halaman Business Type
- [ ] Implementasi test print via backend (bukan simulasi)

### Fase 3: Onboarding (4-6 Minggu)

- [ ] Desain dan implementasi onboarding wizard (5 langkah)
- [ ] Buat setup checklist di dashboard dengan progress indicator
- [ ] Tambahkan contextual tooltips di field-field penting

### Fase 4: Advanced (6-8 Minggu)

- [ ] Settings change history / audit log
- [ ] Import/export settings untuk duplikasi konfigurasi antar outlet
- [ ] Security settings (password policy, 2FA, session timeout)
- [ ] Email template customization untuk laporan dan notifikasi
- [ ] WhatsApp notification integration

---

## Kesimpulan

Modul Pengaturan TiloPOS sudah cukup lengkap dari segi fungsionalitas dengan 15 halaman pengaturan dan 44 fitur yang bisa dikontrol. Backend menggunakan clean architecture yang solid dengan proper validation dan multi-tenancy. Frontend menerapkan pola yang konsisten dengan loading states, error handling, dan toast notifications yang baik.

Area perbaikan utama ada di **discoverability** (pengguna sulit menemukan pengaturan tertentu tanpa settings sidebar atau search), **onboarding** (pengguna baru tidak dibimbing melalui proses setup), dan **beberapa inkonsistensi teknis** (mixed form patterns, simulasi test print). Dengan implementasi roadmap di atas, modul Pengaturan TiloPOS bisa setara atau melampaui kompetitor seperti Moka dan Majoo dari segi pengalaman pengguna.
