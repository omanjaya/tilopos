# Phase 3 — POS Critical Features

> Effort: Sedang-Besar per item | Total estimasi: 5-8 hari kerja
> Prioritas: Setelah Phase 2 selesai
> Sumber: Analisa Sistem (01) — Section 2.9, 5.1 | Analisa UX (02) — Section 4.4

---

## Tujuan

Selesaikan 3 blocker terbesar yang membuat kasir baru tidak bisa bekerja:
1. Shift harus bisa dimulai/ditutup langsung dari POS
2. Ada ringkasan shift saat tutup
3. Owner baru punya checklist panduan di dashboard

---

## Task List

### 3.1 Shift Start di POS

**Masalah:** Kasir baru buka POS → coba checkout → error "Tidak Ada Shift Aktif" → bingung harus ke halaman Karyawan untuk mulai shift.

**Solusi:** Tambah flow "Mulai Shift" langsung di halaman POS.

**Backend (sudah ada):**
- `POST /api/v1/employees/shifts/start` — payload: `{ outletId, openingCash }`
- `GET /api/v1/employees/shifts/current` — cek shift aktif

**Frontend — Perubahan:**

**File baru:** `packages/web/src/features/pos/components/shift-start-modal.tsx`

**Behavior:**
1. Saat POS page load, cek `GET /employees/shifts/current`
2. Jika tidak ada shift aktif → tampilkan modal "Mulai Shift"
3. Modal berisi:
   - Greeting: "Selamat datang, [nama kasir]"
   - Info outlet yang aktif
   - Input: "Kas Awal (Rp)" dengan numpad
   - Quick amount presets: 100k, 200k, 500k, 1jt
   - Tombol "Mulai Shift"
4. Setelah shift dimulai → modal tertutup → POS siap digunakan
5. Tampil indicator di header: "Shift aktif sejak HH:mm"

**File yang perlu diubah:**
- `packages/web/src/features/pos/pos-page.tsx` — tambah shift check on mount
- `packages/web/src/hooks/use-shift-status.ts` — extend dengan start/end functions
- **Baru:** `shift-start-modal.tsx`

**Acceptance Criteria:**
- [x] Buka `/pos` tanpa shift → modal "Mulai Shift" muncul otomatis
- [x] Input kas awal dengan numpad
- [x] Klik "Mulai Shift" → shift aktif → modal tutup → POS ready
- [x] Header POS tampil indicator shift aktif
- [x] Tidak bisa bypass modal (harus mulai shift dulu)

---

### 3.2 Shift End di POS

**Masalah:** Tidak ada cara tutup shift dari POS.

**Solusi:** Tambah tombol "Tutup Shift" di menu POS + summary modal.

**Backend (sudah ada):**
- `POST /api/v1/employees/shifts/:id/end` — payload: `{ closingCash, notes? }`

**Frontend — Perubahan:**

**File baru:** `packages/web/src/features/pos/components/shift-end-modal.tsx`

**Behavior:**
1. Tombol "Tutup Shift" di dropdown menu header POS
2. Klik → tampilkan modal "Tutup Shift"
3. Modal berisi:
   - **Ringkasan shift:**
     - Durasi shift (mulai - sekarang)
     - Total transaksi (jumlah)
     - Total penjualan (Rp)
     - Breakdown per metode pembayaran
   - **Input kas akhir:**
     - "Kas Akhir (Rp)" dengan numpad
     - Quick amount presets
   - **Perhitungan selisih:**
     - Kas awal + penjualan cash = Expected cash
     - Kas akhir (input) - Expected cash = Selisih
     - Selisih hijau (cocok) atau merah (tidak cocok)
   - **Notes (optional):** Textarea untuk catatan
   - Tombol "Tutup Shift"
4. Setelah tutup → tampil receipt-style summary → redirect ke dashboard atau tetap di POS

**File yang perlu diubah:**
- `packages/web/src/features/pos/pos-page.tsx` — tambah menu item "Tutup Shift"
- `packages/web/src/hooks/use-shift-status.ts` — tambah end function
- **Baru:** `shift-end-modal.tsx`

**Acceptance Criteria:**
- [x] Menu POS ada opsi "Tutup Shift"
- [x] Modal tampil ringkasan shift (durasi, transaksi, total)
- [x] Input kas akhir dengan numpad
- [x] Perhitungan selisih otomatis (expected vs actual)
- [x] Selisih tampil hijau (cocok ±1000) atau merah (tidak cocok)
- [x] Notes optional
- [x] Setelah tutup shift → summary printable
- [x] POS kembali ke state "Mulai Shift" (modal muncul lagi)

---

### 3.3 Shift Duration Indicator di POS Header

**Masalah:** Tidak ada indikasi berapa lama shift sudah berjalan.

**Solusi:** Tambah badge di header POS yang menampilkan durasi shift.

**File baru:** `packages/web/src/features/pos/components/shift-indicator.tsx`

**Tampilan:**
```
[Clock icon] Shift: 3j 25m
```

**Behavior:**
- Update setiap menit
- Klik → mini popup: Mulai HH:mm, Kas Awal Rp XXX, Transaksi: N
- Warna berubah setelah 8 jam (warning — shift terlalu lama)

**Acceptance Criteria:**
- [x] Badge tampil di header POS saat shift aktif
- [x] Update durasi setiap menit tanpa re-render berlebihan
- [x] Klik badge → popup info ringkasan shift
- [x] Warning visual setelah shift > 8 jam

---

### 3.4 Getting Started Checklist di Dashboard

**Masalah:** Owner baru login → lihat dashboard kosong → tidak tahu harus mulai dari mana.

**Solusi:** Tampilkan checklist onboarding di dashboard untuk user baru.

**Backend — Endpoint baru:**
```
GET /api/v1/onboarding/progress
Response: {
  accountCreated: true,
  productsAdded: { done: boolean, count: number, target: 5 },
  paymentConfigured: { done: boolean },
  employeeAdded: { done: boolean, count: number },
  firstTransaction: { done: boolean },
  printerConfigured: { done: boolean },
  completedAt: null | Date
}

POST /api/v1/onboarding/dismiss
```

**Frontend — Komponen baru:**

**File:** `packages/web/src/features/dashboard/components/getting-started-checklist.tsx`

**Tampilan:**
```
┌─────────────────────────────────────────────┐
│  Selamat Datang di TiloPOS!                 │
│  Selesaikan langkah berikut untuk memulai   │
│                                             │
│  ✅ Buat akun                               │
│  ✅ Tambah produk (3/5)            [Tambah] │
│  ○  Atur metode pembayaran     [Atur]       │
│  ○  Tambah karyawan            [Tambah]     │
│  ○  Transaksi pertama          [Buka POS]   │
│                                             │
│  Progress: ██████░░░░ 40%                   │
│                                             │
│  [Lewati untuk sekarang]                    │
└─────────────────────────────────────────────┘
```

**Behavior:**
1. Tampil di dashboard HANYA jika checklist belum selesai
2. Setiap item punya CTA button yang mengarahkan ke halaman terkait
3. Progress bar menunjukkan persentase completion
4. Auto-update saat user kembali ke dashboard
5. "Lewati" → dismiss checklist, tidak muncul lagi
6. Setelah semua selesai → tampil confetti/celebration → auto-dismiss

**File yang perlu diubah:**
- `packages/web/src/features/dashboard/dashboard-page.tsx` — tambah checklist di atas KPI cards
- **Baru:** `getting-started-checklist.tsx`
- **Backend baru:** `onboarding.controller.ts`, `onboarding.service.ts`

**Acceptance Criteria:**
- [x] Checklist tampil untuk user baru yang belum selesai setup
- [x] Setiap item cek kondisi real (query database)
- [x] CTA button mengarahkan ke halaman yang benar
- [x] Progress bar akurat
- [x] "Lewati" dismiss checklist permanen
- [x] Setelah semua item selesai → celebration + auto-dismiss
- [x] Tidak tampil untuk user lama yang sudah punya data

---

### 3.5 Proactive Shift Check saat Checkout

**Masalah:** Error shift hanya muncul saat klik "Selesai" di payment — terlalu terlambat.

**Solusi:** Cek shift aktif LEBIH AWAL.

**File:** `packages/web/src/features/pos/hooks/use-pos-transaction.ts`

**Perubahan:**
1. Cek shift saat payment panel dibuka (bukan saat selesai)
2. Jika tidak ada shift → block payment panel + tampil modal "Mulai Shift Dulu"
3. Atau lebih baik: sudah dicek di awal (Phase 3.1 — shift start modal saat load POS)

**Acceptance Criteria:**
- [x] User tidak pernah sampai di payment panel tanpa shift aktif (ShiftStartModal blocks POS at load)
- [x] Error message jelas mengarahkan ke solusi (fallback check at checkout time)

---

## Checklist Summary

| # | Task | Effort | Dependency | Status |
|---|------|--------|------------|--------|
| 3.1 | Shift Start Modal di POS | 6-8 jam | — | [x] |
| 3.2 | Shift End Modal + Summary | 8-10 jam | 3.1 | [x] |
| 3.3 | Shift Duration Indicator | 2-3 jam | 3.1 | [x] |
| 3.4 | Getting Started Checklist | 8-12 jam | Backend + Frontend | [x] |
| 3.5 | Proactive Shift Check | 1-2 jam | 3.1 | [x] |

**Progress: 5/5 tasks complete (100%)**

**Notes:**
- Shift modals (start/end) + duration indicator fully integrated in POS page and header
- Getting Started Checklist: backend OnboardingModule registered in AppModule, response matches frontend contract
- Checklist integrated into main dashboard page (above KPI cards)
- Proactive shift check: covered by ShiftStartModal blocking POS + checkout-time validation
- Toast migrated from `useToast()` to `toast.*` in pos-page.tsx and use-pos-transaction.ts
- Fixed dismissChecklist to merge settings instead of overwriting

---

## Dependency

- Phase 1 & 2 sebaiknya selesai dulu (terutama toast standardization, form validation)
- Task 3.1 harus selesai sebelum 3.2, 3.3, 3.5
- Task 3.4 butuh backend baru (onboarding endpoint)
