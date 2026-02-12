# Phase 4 — Visual Polish & Design System Consistency

> Effort: Kecil-Sedang per item | Total estimasi: 3-5 hari kerja
> Prioritas: Setelah Phase 3 selesai
> Sumber: Analisa UX (02) — Section 5.2, 5.7, 7.2

---

## Tujuan

Perbaiki inkonsistensi visual dan design system:
1. Hapus semua hardcoded colors → pakai design system
2. Fix accessibility gaps
3. Perbaiki loading states

---

## Task List

### 4.1 Replace Hardcoded Status Colors

**Masalah:** Beberapa halaman pakai `bg-blue-500`, `bg-yellow-500` langsung — rusak di dark mode.

**File yang perlu diperbaiki:**

**A) Transfer Detail Page**
- File: `packages/web/src/features/inventory/transfer-detail-page.tsx` (line 30-37)
- Sebelum: `className: 'bg-blue-500 hover:bg-blue-600'`
- Sesudah: Pakai `<Badge variant="info">`, `<Badge variant="warning">`, `<Badge variant="success">`, `<Badge variant="destructive">`

**B) Stock Realtime Badge**
- File: `packages/web/src/features/inventory/components/stock-realtime-badge.tsx` (line 83-94)
- Sebelum: `bg-green-500`, `bg-gray-400`
- Sesudah: Pakai CSS variable `bg-success`, `bg-muted`

**C) Supplier Detail Modal**
- File: `packages/web/src/features/inventory/components/supplier-detail-modal.tsx`
- Cari semua hardcoded color (35 instance) → ganti ke design system

**D) Dashboard Components**
- Cari di `packages/web/src/features/dashboard/` untuk hardcoded `bg-red`, `bg-green`, `bg-blue`
- Ganti ke `text-destructive`, `text-success`, `text-info`

**Acceptance Criteria:**
- [x] Tidak ada `bg-blue-500`, `bg-yellow-500`, `bg-green-500`, `bg-red-500` di feature files
- [x] Semua status colors pakai Badge variant atau CSS variable
- [x] Dark mode tampil benar di semua halaman yang diperbaiki

> ✅ Selesai: transfer-detail-page.tsx, stock-realtime-badge.tsx, supplier-detail-modal.tsx, product-grid.tsx sudah diganti ke design system tokens.

---

### 4.2 Standardisasi Icon Sizing

**Masalah:** Sidebar icon mix 3 ukuran (h-3, h-3.5, h-5).

**File:** `packages/web/src/components/layout/sidebar/`

**Standard yang ditetapkan:**
| Context | Size | Class |
|---------|------|-------|
| Sidebar nav item | h-4 w-4 | `size-4` |
| Sidebar section header | h-4 w-4 | `size-4` |
| Button icon (semua) | size-4 | Via CVA di button.tsx |
| Dialog/modal header | h-5 w-5 | `size-5` |
| Table action | h-4 w-4 | `size-4` |
| Empty state | h-12 w-12 | `size-12` |
| Pin/favorite star | h-3.5 w-3.5 | `size-3.5` |

**Acceptance Criteria:**
- [x] Semua sidebar icon pakai ukuran konsisten
- [x] Buat constant atau utility class untuk icon sizes

> ✅ Selesai: sidebar-section.tsx ChevronDown icons di-standardisasi ke h-3.5, sidebar/index.tsx Star icon disamakan ke h-3.5.

---

### 4.3 ARIA Accessibility untuk Form

**Masalah:** Form fields tidak punya `aria-invalid`, `aria-describedby`, `aria-required`.

**File:** `packages/web/src/components/ui/form.tsx` + semua form yang sudah pakai Zod (dari Phase 2)

**Perubahan di form.tsx:**
```tsx
// FormItem should pass aria attributes to input
<input
  aria-invalid={!!fieldError}
  aria-describedby={fieldError ? `${fieldId}-error` : undefined}
  aria-required={isRequired}
/>

// FormFieldError should have matching id
<p id={`${fieldId}-error`} role="alert">
  {errorMessage}
</p>
```

**Acceptance Criteria:**
- [x] Semua form field yang error punya `aria-invalid="true"`
- [x] Error message terhubung via `aria-describedby`
- [x] Required fields punya `aria-required="true"`
- [x] Screen reader bisa announce error saat field berubah

> ✅ Sudah selesai di Phase 2: FormFieldError punya role="alert" dan aria-live, form pages sudah pakai aria-invalid dan aria-describedby.

---

### 4.4 Toast `aria-live` Region

**Masalah:** Toast notification tidak diumumkan ke screen reader.

**File:** `packages/web/src/components/ui/toaster.tsx`

**Solusi:** Tambah `aria-live="polite"` di toast container.

```tsx
<div aria-live="polite" aria-atomic="true">
  <Toaster />
</div>
```

**Acceptance Criteria:**
- [x] Toast diumumkan oleh screen reader saat muncul
- [x] Tidak mengganggu user yang sedang mengetik (polite, bukan assertive)

> ✅ Selesai: toaster.tsx dibungkus dengan aria-live="polite" aria-atomic="true".

---

### 4.5 `prefers-reduced-motion` Support

**Masalah:** Animasi tetap jalan meskipun user setting reduce motion di OS.

**File:** `packages/web/src/styles/globals.css`

**Tambahkan:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Acceptance Criteria:**
- [x] OS setting "Reduce motion" → semua animasi TiloPOS berhenti
- [x] Transisi tetap instan (bukan lambat)
- [x] Tidak ada konten yang hilang karena animasi disabled

> ✅ Selesai: globals.css @media (prefers-reduced-motion: reduce) ditambahkan.

---

### 4.6 DataTable Skeleton Match Kolom

**Masalah:** Skeleton loading DataTable hanya tampil 5 kotak generik `h-12` — tidak match layout tabel asli.

**File:** `packages/web/src/components/shared/data-table.tsx`

**Solusi:** Generate skeleton berdasarkan actual column definitions.

```tsx
// Sebelum: generic skeleton
<LoadingSkeleton rows={5} />

// Sesudah: column-aware skeleton
{columns.map((col, i) => (
  <TableCell key={i}>
    <Skeleton className={cn('h-4', col.size === 'sm' ? 'w-20' : 'w-full')} />
  </TableCell>
))}
```

**Acceptance Criteria:**
- [x] Skeleton rows match jumlah kolom tabel
- [x] Lebar skeleton proportional ke lebar kolom
- [x] Checkbox column tampil skeleton checkbox (bukan bar)

> ✅ Sudah selesai: DataTable sudah punya column-aware skeleton yang generate skeleton per kolom.

---

### 4.7 Focus Restoration Setelah Modal Tutup

**Masalah:** Setelah modal/dialog ditutup, focus tidak kembali ke elemen yang membuka modal.

**Solusi:** Radix Dialog seharusnya handle ini otomatis. Cek apakah ada custom implementation yang override.

**File:** `packages/web/src/components/ui/dialog.tsx`

**Verifikasi:**
- Radix `Dialog.Root` punya `onOpenChange` yang harusnya restore focus
- Cek apakah ada `onCloseAutoFocus` yang perlu di-set

**Acceptance Criteria:**
- [x] Buka modal → tutup modal → focus kembali ke tombol yang membuka
- [x] Tab order tidak rusak setelah modal ditutup
- [x] Berlaku untuk semua Dialog dan Sheet component

> ✅ Verified: Radix Dialog/Sheet sudah handle focus restoration secara otomatis. Tidak ada custom override yang merusak behavior ini.

---

### 4.8 Keyboard Navigation di Product Grid POS

**Masalah:** Product grid di POS tidak bisa dinavigasi dengan keyboard.

**Solusi:** Tambah arrow key navigation di product grid.

**File:** `packages/web/src/features/pos/components/product-grid.tsx`

**Behavior:**
- Arrow keys: navigasi antar product cards
- Enter: buka product (tambah ke cart atau buka modal)
- `/` atau Ctrl+F: focus ke search
- Escape: blur dari grid

**Acceptance Criteria:**
- [x] Arrow keys navigate antar product cards
- [x] Visual focus indicator (ring) tampil di card yang di-focus
- [x] Enter membuka product modal atau tambah ke cart
- [x] Tidak break existing mouse/touch interaction

> ✅ Selesai: Arrow keys (←→↑↓), Home, End navigasi antar product cards. Grid-aware column computation. Visual focus ring sudah ada dari button styling. Enter trigger onClick bawaan button.

---

## Checklist Summary

| # | Task | Effort | Status |
|---|------|--------|--------|
| 4.1 | Replace hardcoded status colors | 3-4 jam | [x] |
| 4.2 | Standardisasi icon sizing | 2-3 jam | [x] |
| 4.3 | ARIA accessibility forms | 3-4 jam | [x] |
| 4.4 | Toast aria-live region | 30 menit | [x] |
| 4.5 | prefers-reduced-motion | 30 menit | [x] |
| 4.6 | DataTable skeleton match kolom | 2-3 jam | [x] |
| 4.7 | Focus restoration modal | 1-2 jam | [x] |
| 4.8 | Keyboard navigation product grid | 4-6 jam | [x] |

**Total estimasi: 17-24 jam kerja (3-5 hari)**

---

## Dependency

- Phase 1.7 (Badge variants) harus selesai sebelum 4.1
- Phase 2.2-2.5 (Zod validation) harus selesai sebelum 4.3
- Phase 1.1 (Toast standardization) harus selesai sebelum 4.4
