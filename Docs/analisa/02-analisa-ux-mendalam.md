# Analisa UX Mendalam TiloPOS

> Tanggal: 12 Februari 2026
> Scope: Frontend UX — Navigation, Forms, Error Handling, Visual, Mobile, Accessibility

---

## Daftar Isi

1. [Skor UX Per Area](#1-skor-ux-per-area)
2. [Navigasi & Layout](#2-navigasi--layout)
3. [Form & Input](#3-form--input)
4. [Error Handling & Empty States](#4-error-handling--empty-states)
5. [Visual Consistency & Design System](#5-visual-consistency--design-system)
6. [Mobile & Touch Experience](#6-mobile--touch-experience)
7. [Accessibility](#7-accessibility)
8. [Prioritas Perbaikan](#8-prioritas-perbaikan)

---

## 1. Skor UX Per Area

| Area | Skor | Keterangan |
|------|------|------------|
| Navigasi & Layout | 7/10 | Sidebar pintar tapi terlalu banyak item, tidak ada breadcrumb |
| Form & Input | 6.5/10 | Fondasi bagus tapi validasi & error feedback lemah |
| Error & Empty States | 7/10 | Komponen ada, tapi penggunaan tidak konsisten |
| Visual & Design System | 7.5/10 | shadcn/ui solid, tapi warna hardcoded di beberapa fitur |
| Mobile & Touch | 8.3/10 | Sangat bagus — dedicated mobile pages, gesture canggih |
| Accessibility | 6/10 | Dasar ada, tapi banyak gap ARIA & keyboard nav |
| **OVERALL** | **7.1/10** | **Fondasi kuat, butuh polish** |

---

## 2. Navigasi & Layout

### 2.1 Sidebar Navigation

**Yang Bagus:**

| Fitur | Detail | File Reference |
|-------|--------|----------------|
| Role-based visibility | Kasir lihat menu minimal, owner lihat semua | `sidebar-nav-data.ts:34-68` |
| Favorites/pin system | Max 5, default per role (kasir: POS+Transaksi, kitchen: KDS) | `sidebar-nav-data.ts:201-209` |
| "Lihat semua" disclosure | Section tampil 4 item, sisanya tersembunyi | `sidebar-section.tsx:121-129` |
| Collapsed mode flyout | Hover icon → flyout menu saat sidebar collapsed | `sidebar-flyout.tsx:44-45` |
| Auto-expand active section | `/app/inventory/suppliers` → expand "Produk & Inventori" | `use-sidebar-state.ts:134-143` |

**Yang Bermasalah:**

| Masalah | Detail | Impact | File |
|---------|--------|--------|------|
| Section terlalu besar | "Produk & Inventori" punya 11 item | Cognitive overload | `sidebar-nav-data.ts:96-113` |
| Pin max tanpa feedback | Coba pin item ke-6 → diam saja, tidak ada toast | User pikir rusak | `use-sidebar-state.ts:37` |
| Settings split | Sub-nav settings hanya visible di dalam halaman settings | 4 klik untuk pindah sub-setting | `settings-layout.tsx:41-64` |
| Pin button hover-only | Tombol pin hanya muncul saat hover — tidak bisa di touch device | Touch user tidak bisa pin | `sidebar-nav-item.tsx:52-70` |
| Section title terlalu subtle | Inactive: `text-sidebar-muted-foreground/60` (60% opacity) | Hampir tidak terlihat | `sidebar-section.tsx:46-48` |

### 2.2 Route Structure

**Yang Bagus:**
- URL RESTful konsisten: `/app/products`, `/app/products/new`, `/app/products/:id/edit`
- Bookmark-friendly, self-documenting
- Namespace grouping: `/app/inventory/*`, `/app/settings/*`, `/pos`, `/kds`

**Yang Bermasalah:**

| Masalah | Detail |
|---------|--------|
| Transfer punya 2 landing page | `/app/inventory/transfers` (list) DAN `/app/inventory/transfers/dashboard` (summary) — bingung mana "home" |
| URL inventory terlalu panjang | `/app/inventory/transfers/dashboard` — verbose |
| Self-order URL terpisah | Admin: `/app/self-order`, Customer: `/order/:sessionCode` — 2 root berbeda |

### 2.3 Breadcrumb & Back Navigation

| Masalah | Detail | Severity |
|---------|--------|----------|
| **Tidak ada breadcrumb** | Tidak ada indikasi path hierarchy | CRITICAL |
| Page title tidak lengkap | Hanya 21 dari 50+ route punya judul — sisanya fallback "Dashboard" | HIGH |
| Tidak ada tombol Back | User harus pakai browser back button | HIGH |
| Outlet selector tanpa indikasi | Ganti outlet = ganti context data, tapi tidak ada visual indicator | MEDIUM |

**Evidence:** `page-titles.ts` hanya 21 entry, fallback line 33: `return 'Dashboard'`

### 2.4 Command Palette (Cmd+K)

**Yang Sangat Bagus:**
- 65 command (Pages, Actions, Settings, Help)
- Fuzzy search + keyword aliases ("kasir" → "Shift", "home" → "Dashboard")
- Recent commands di localStorage
- Arrow key navigation + Enter select + Escape close
- Icons per command

**Yang Bermasalah:**
- Tidak discoverable — tidak ada tombol visible di UI
- "Categories" command route ke `/app/products` — bukan halaman kategori
- Hanya navigasi — tidak ada in-place actions (misal: create product dari palette)

### 2.5 Mobile Navigation

| Masalah | Detail | Severity |
|---------|--------|----------|
| Sidebar tetap tampil di mobile | 72px width → iPhone 390px content area hanya 318px | CRITICAL |
| Tidak ada hamburger menu | Mobile tidak ada alternative nav | CRITICAL |
| MobileNavSpacer tidak konsisten | Hanya dipakai di 1 file | MEDIUM |
| Tablet pakai desktop layout | iPad 1024px+ render sidebar penuh | LOW |

---

## 3. Form & Input

### 3.1 Analisa Per Form

#### Login Form
| Aspek | Status | Detail |
|-------|--------|--------|
| Placeholder | Bagus | "nama@email.com", "Masukkan PIN" |
| Autocomplete | Bagus | `autocomplete="email"`, `"current-password"` |
| PIN optimization | Bagus | `maxLength=6`, `inputMode="numeric"` |
| Loading state | Bagus | Spinner + disabled button |
| Error handling | Bagus | Toast "Login gagal" dengan message dari server |
| Autofocus | Tidak ada | Email field tidak auto-focused |

**Skor: 8/10**

#### Register Form (Account Step)
| Aspek | Status | Detail |
|-------|--------|--------|
| Validasi | Bagus | Zod schema dengan error per field |
| Error messages | Bagus | "PIN harus 6 digit", "Email tidak valid", "PIN tidak cocok" |
| Placeholder | Bagus | "Nama pemilik bisnis", "nama@email.com" |
| PIN match | Bagus | `.refine()` cek kedua PIN sama |
| Animations | Bagus | Framer Motion transisi antar step |
| Mobile | Kurang | `grid-cols-2` untuk PIN fields — sempit di HP kecil |

**Skor: 8/10**

#### Register Form (Business Info Step)
| Aspek | Status | Detail |
|-------|--------|--------|
| Default values | Bagus | outletName "Outlet Utama", taxRate 11 |
| Section headings | Bagus | Pemisahan info bisnis vs outlet |
| Validasi | Bagus | Zod schema |
| Helper text | Kurang | Tidak ada penjelasan tarif pajak |
| Mobile | Kurang | `grid-cols-2` tanpa responsive breakpoint |

**Skor: 8/10**

#### Product Form
| Aspek | Status | Detail |
|-------|--------|--------|
| Placeholder | Kurang | Nama, SKU, harga tidak ada placeholder |
| Validasi | Lemah | HTML5 `required` saja, tidak ada error message |
| Error display | Tidak ada | Field error tidak ditampilkan |
| Required markers | Tidak ada | Tidak ada tanda * |
| Autofocus | Tidak ada | Harus klik field nama |
| Loading state | Bagus | Spinner + disabled saat submit |
| Toast | Bagus | Success message dengan nama produk |
| Variant section | Bagus | Feature-gated, inline add/remove |

**Skor: 6/10**

#### Employee Form
| Aspek | Status | Detail |
|-------|--------|--------|
| PIN context | Bagus | Edit mode: "PIN (kosongkan jika tidak diubah)" |
| inputMode | Bagus | `inputMode="numeric"` untuk PIN |
| Conditional fields | Bagus | isActive toggle hanya muncul di edit mode |
| Phone type | Kurang | Tidak ada `type="tel"` |
| Validasi | Lemah | HTML5 saja |
| Error display | Tidak ada | Tidak ada per-field error |
| Autofocus | Tidak ada | |

**Skor: 6/10**

#### Customer Form
| Aspek | Status | Detail |
|-------|--------|--------|
| Customer dashboard | Bagus | Edit mode tampil stats (total belanja, kunjungan, poin) |
| Date input | Bagus | Native `type="date"` — mobile-friendly |
| Validasi | Lemah | HTML5 saja |
| Autofocus | Tidak ada | |

**Skor: 6/10**

### 3.2 Pattern Umum yang Bermasalah

| Masalah | Terjadi Di | Severity |
|---------|-----------|----------|
| **Validasi hanya saat submit** | Product, Employee, Customer, Settings forms | HIGH |
| **Tidak ada error message per field** | Semua form kecuali Register | HIGH |
| **Tidak ada tanda required (\*)** | Semua form | HIGH |
| **Tidak ada autofocus** | Semua create form | MEDIUM |
| **Placeholder tidak konsisten** | Product & Employee vs Login & Register | MEDIUM |
| **Phone tanpa `type="tel"`** | Employee, Customer, Business Settings | MEDIUM |
| **Grid form tidak responsive** | Register PIN fields, Business Info fields | MEDIUM |

### 3.3 POS Form Components

#### Payment Panel
- Method selection: grid button categorized (cash, card, e-wallet, QRIS)
- Amount input: custom numpad dengan quick presets
- Multiple payment support
- Reference field hidden untuk cash
- Big green finish button: "Selesai — Kembalian Rp XXXXX"
- **Skor: 8/10**

#### Discount Modal
- Tab percent vs nominal
- Preset buttons + numpad
- Live preview calculation
- **Issue:** Decimal handling inconsistent — percent allows `.`, amount doesn't
- **Skor: 8/10**

#### Product Modal
- Variant selection (2-col grid)
- Modifier groups (multi-select per group, required badge, max select)
- Qty controls (+/- dengan text-3xl)
- Notes textarea dengan placeholder contoh
- **Issue:** Tidak ada direct qty input (hanya +/- button)
- **Skor: 8/10**

### 3.4 Rekomendasi Form

1. **Standardisasi validasi:** Pakai Zod + React Hook Form seperti Register form, di SEMUA form
2. **Tambah FormFieldError component:** Error message merah di bawah setiap field
3. **Tambah tanda required (\*):** Asterisk atau badge "Wajib" di field yang required
4. **Autofocus field pertama** di semua create form
5. **Tambah `type="tel"`** di semua phone field
6. **Tambah placeholder contoh** di semua text field

---

## 4. Error Handling & Empty States

### 4.1 Toast/Notification System

**2 sistem yang tidak konsisten:**

| Sistem | File | Features | Dipakai Di |
|--------|------|----------|------------|
| `useToast()` | `hooks/use-toast.ts` | Raw toast, tanpa icon/warna | Beberapa page |
| `toast.*` | `lib/toast-utils.tsx` | Icon, warna, durasi per tipe | Beberapa page lain |

**Toast Utils (yang lebih lengkap):**
| Tipe | Icon | Warna | Durasi |
|------|------|-------|--------|
| success | CheckCircle2 | #10b981 (hijau) | 3 detik |
| error | XCircle | #ef4444 (merah) | 5 detik |
| warning | AlertCircle | #eab308 (kuning) | 4 detik |
| info | Info | #3b82f6 (biru) | 3 detik |
| loading | Loader2 | — | Tidak auto-dismiss |

**Rekomendasi:** Standardisasi ke `toast.*` everywhere, deprecate raw `useToast()`

### 4.2 Empty States

**Component:** `components/shared/empty-state.tsx`
- Customizable icon, title, description, action
- 3 size variants (sm, md, lg)
- Animasi fade-in + background glow
- SVG illustration (EmptyBox)

**Masalah:**

| Issue | Detail |
|-------|--------|
| Tidak ada CTA button | "Belum ada produk" — tapi tidak ada "Tambah Produk" button |
| Search empty = data empty | Cari "xyz" → 0 hasil → pesan sama dengan "belum ada data" |
| Hanya 1 ilustrasi | EmptyBox untuk semua context — bisa per context (empty cart, empty orders) |
| Tidak ada actionable suggestion | Harusnya: "Belum ada produk? Import dari Excel atau tambah manual" |

### 4.3 Loading States

**Skeleton library** (`components/shared/loading-skeletons.tsx`):
- MetricCardsSkeleton, ChartSkeleton, ProductGridSkeleton
- TableRowsSkeleton, FormSkeleton, OrderCardSkeleton
- ListItemSkeleton, StatsCardsSkeleton
- Staggered animation (50ms delay per item)

**Spinner** (`components/shared/loading-spinner.tsx`):
- LoadingSpinner (centered), FullPageSpinner (overlay)
- 3 sizes, accessible (`role="status"`, `aria-live="polite"`)

**Masalah:**

| Issue | Detail |
|-------|--------|
| DataTable skeleton generik | 5 kotak `h-12` — tidak match jumlah/lebar kolom asli |
| Tidak ada progressive loading | Semua skeleton muncul sekaligus |
| Inline loading kurang | Form submission tidak ada field-level loading |

### 4.4 Error Handling

**Error handlers** (`lib/error-handlers.ts`):
- `handleMutationError()`, `handleQueryError()`
- `handleDeleteError(error, itemName)`, `handleCreateError()`, `handleUpdateError()`
- Status-specific: `isUnauthorizedError()`, `isForbiddenError()`, `isNotFoundError()`

**API Client** (`api/client.ts`):
- Auto-attach JWT, 30s timeout
- 401 → auto-logout + redirect

**Masalah:**

| Issue | Detail | Severity |
|-------|--------|----------|
| 401 terlalu agresif | 1 request 401 → langsung logout, user kehilangan form data | HIGH |
| Tidak ada retry | API gagal → harus manual refresh | HIGH |
| Error handlers copy-paste | handleMutationError di 20+ file, tidak centralized | MEDIUM |
| Tidak ada error recovery | Tidak ada "Retry" button di toast | MEDIUM |

### 4.5 Confirmation Dialogs

**Component:** `components/shared/confirm-dialog.tsx`
- AlertTriangle icon, animated
- Destructive/default variant
- Loading state + disabled cancel

**Masalah:**
- Tidak ada `useConfirmDialog` hook — state management manual di setiap page
- Bulk action tanpa konfirmasi (delete 5 transfers → langsung jalan)
- Tidak ada undo window (delete = permanen instantly)

### 4.6 Offline Support

**POS Offline** (`hooks/use-offline-pos.ts`):
- Queue transaksi ke IndexedDB/localStorage
- Auto-sync saat online
- OfflineBanner: "Mode Offline — 3 transaksi menunggu"
- Manual sync button

**Masalah:**
- Backoffice tidak ada offline support
- Tidak ada "Last synced: X menit" indicator
- Tidak ada conflict resolution UI
- 2 OfflineBanner berbeda (POS vs app-level)

---

## 5. Visual Consistency & Design System

### 5.1 Color System

**HSL-based CSS variables** (`styles/globals.css`):

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | 210 18% 38% (slate blue) | 210 18% 70% | CTA buttons, links |
| `--destructive` | 0 84% 60% (red) | 0 62% 30% | Delete, error |
| `--success` | 152 69% 41% (green) | adjusted | Success states |
| `--warning` | 38 92% 50% (orange) | adjusted | Warning states |
| `--info` | 206 100% 50% (blue) | adjusted | Info states |

### 5.2 Masalah Warna

| Issue | File | Detail |
|-------|------|--------|
| **Hardcoded status colors** | `transfer-detail-page.tsx:30-37` | `bg-blue-500`, `bg-yellow-500`, `bg-purple-500` — bukan design system |
| **Dark mode rusak** | `stock-realtime-badge.tsx:83-94` | `bg-green-500`, `bg-gray-400` hardcoded |
| **Badge kurang variant** | `badge.tsx` | Tidak ada `success`, `warning`, `info` variant |
| **Supplier modal hardcoded** | `supplier-detail-modal.tsx` | 35 instance hardcoded colors |

### 5.3 Typography

| Element | Size | Weight | Pattern |
|---------|------|--------|---------|
| Page title | text-xl / md:text-2xl | bold (700) | Konsisten |
| Card title | text-2xl | semibold (600) | Konsisten |
| Dialog title | text-lg | semibold (600) | Konsisten |
| Form label | text-sm | medium (500) | Konsisten |
| Body | text-sm / text-base | normal (400) | Kebanyakan text-sm |
| Muted | text-xs / text-sm | normal (400) | text-muted-foreground |
| Button | text-sm | medium (500) | Konsisten |

**Font:** Inter (400, 500, 600, 700)

### 5.4 Spacing

| Context | Pattern | Konsisten? |
|---------|---------|------------|
| Card padding | p-6 | Ya |
| Dialog padding | p-6 | Ya |
| Form item spacing | space-y-2 | Ya |
| Table cell | p-4, h-12 | Ya |
| Page header gap | gap-4 md:flex-row | Ya |
| Sidebar item | px-2.5 py-2 | Ya |

Base scale: 8px (Tailwind default). Konsistensi spacing: **Baik**.

### 5.5 Animation & Transitions

| Pattern | Duration | Usage |
|---------|----------|-------|
| Micro-interaction | 200ms | Button hover, card hover, input focus |
| Page entry | 500ms | Empty state fade-in |
| Dialog open/close | 200ms | Radix data-state animation |
| Button press | instant | `active:scale-95` |

**Masalah:** Tidak ada `prefers-reduced-motion` support (`tailwind.config.ts`)

### 5.6 Table Patterns

Semua halaman pakai DataTable component yang sama:
- Styling: `rounded-md border`, hover `bg-muted/50`
- Row actions: DropdownMenu dengan MoreHorizontal icon
- Search, filter, empty state — semua konsisten

**Masalah:** Transfer page pakai hardcoded badge colors, bukan Badge component

### 5.7 Icon Usage

**Library:** Lucide React

| Context | Size |
|---------|------|
| Button | size-4 (16px) via CVA |
| Dialog header | h-5 w-5 |
| Sidebar | Mix h-3, h-3.5, h-5 (TIDAK konsisten) |
| Table action | h-4 w-4 |
| Empty state | h-12 sampai h-16 |

**Masalah:** Sidebar icon sizing tidak konsisten — mix 3 ukuran berbeda.

---

## 6. Mobile & Touch Experience

### 6.1 Arsitektur Mobile

**Strategi:** Dedicated `.mobile.tsx` files — bukan responsive CSS.

**8 halaman dengan versi mobile:**
- products-page.mobile.tsx
- orders-page.mobile.tsx
- dashboard-page.mobile.tsx
- stock-page.mobile.tsx
- tables-page.mobile.tsx
- customers-page.mobile.tsx
- waiting-list-page.mobile.tsx
- reports-page.mobile.tsx

**40+ halaman TANPA versi mobile:**
- Employees, Transactions, Settings, Transfers, Suppliers, POs, dll

### 6.2 Device Detection

**DeviceRoute breakpoints:**
| Device | Range | Detection |
|--------|-------|-----------|
| Mobile | < 768px | `window.matchMedia` |
| Tablet | 768-1023px | `window.matchMedia` |
| Desktop | >= 1024px | `window.matchMedia` |

**Touch detection** (`use-touch-device.ts`): 3 method defense-in-depth:
1. `'ontouchstart' in window`
2. `navigator.maxTouchPoints > 0`
3. `window.matchMedia('(pointer: coarse)')`

### 6.3 Touch Interactions

| Component | Gesture | Detail | File |
|-----------|---------|--------|------|
| SwipeableCard | Swipe left | Reveal edit/delete actions, 80px threshold | `swipeable-card.tsx` |
| Pull-to-Refresh | Pull down | Spring physics (`Math.pow(diff, 0.5) * 2`), snap back | `pull-to-refresh.tsx` |
| Mobile Bottom Sheet | Drag handle | Snap points 50%/90% viewport, spring animation | `mobile-bottom-sheet.tsx` |
| POS Cart (mobile) | Bottom sheet | 85vh, drag handle, smooth cubic-bezier | `pos-page.tsx` |
| Self-Order | Tap to expand | Product lightbox, qty buttons | `self-order/` |

### 6.4 Touch Targets

| Component | Size | Standard (44px) |
|-----------|------|-----------------|
| POS buttons | 44-48px | PASS |
| Mobile nav items | 48px | PASS |
| Quick action buttons | 44px | PASS |
| Primary buttons | 40-44px | PASS |
| Beberapa icon buttons | 32px | FAIL |
| Sidebar pin button | hover-only | FAIL (touch) |

### 6.5 Self-Order (Customer-facing)

- Single-page flow: Browse → Add → Checkout
- Cart: Dialog-based, qty buttons 44px
- Menu grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Image: `loading="lazy"`, lightbox zoom
- **Skor: 9/10** — minimal, clean, focused

### 6.6 Mobile Navigation

**Bottom bar** (`mobile-nav.tsx`):
- Fixed bottom, 4 primary items + hamburger for 7 secondary
- 48px touch targets
- Cart badge dynamic
- Active state indicator
- ARIA labels

**MobileNavSpacer:** Prevents content hiding under fixed nav.

### 6.7 Performance

- Animations: GPU-accelerated (transform, opacity), 200-300ms
- Bundle splitting: React.lazy per route
- **Masalah:**
  - Image lazy loading hanya 3 instance (harusnya 30+)
  - Tidak ada srcset untuk different DPIs
  - Tidak ada `decoding="async"` pada images

### 6.8 PWA Support

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#2563EB" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

Tidak ada `user-scalable=no` (accessibility preserved).

---

## 7. Accessibility

### 7.1 Yang Sudah Ada

| Feature | Detail | File |
|---------|--------|------|
| Dialog sr-only close | `<span className="sr-only">Close</span>` | `dialog.tsx:44` |
| Receipt description | `<DialogDescription className="sr-only">` | `receipt-preview.tsx:57` |
| Button aria-label | `aria-label="Aksi karyawan"` | `employees-page.tsx:100` |
| DataTable keyboard | Arrow keys, Enter, Escape | `data-table.tsx:57-106` |
| Loading spinner | `role="status"`, `aria-live="polite"` | `loading-spinner.tsx` |
| Alert role | `role="alert"` | `alert.tsx:27` |
| Focus visible | `focus-visible:ring-2` di semua interactive elements | All UI components |

### 7.2 Yang Kurang

| Masalah | Detail | Severity |
|---------|--------|----------|
| **Form tanpa `aria-invalid`** | Field error tidak diannounce ke screen reader | HIGH |
| **Form tanpa `aria-describedby`** | Error message tidak terhubung ke field | HIGH |
| **Form tanpa `aria-required`** | Screen reader tidak tahu field mana wajib | HIGH |
| **Toast tanpa `aria-live`** | Notifikasi tidak diumumkan ke screen reader | HIGH |
| **Real-time tanpa announce** | Stock/transfer update tidak ada `aria-live` region | MEDIUM |
| **Skeleton tanpa `aria-busy`** | Screen reader tidak tahu halaman loading | MEDIUM |
| **Product grid tanpa keyboard** | Tidak bisa arrow key di grid produk POS | MEDIUM |
| **Focus tidak di-restore** | Setelah modal tutup, tab order rusak | MEDIUM |
| **Icon button tanpa label** | Grid/list toggle, beberapa action button | LOW |
| **Tidak ada `prefers-reduced-motion`** | Animasi tetap jalan meskipun user setting reduce motion | LOW |

### 7.3 Color Contrast

| Combination | Ratio | WCAG |
|-------------|-------|------|
| Primary text on background | ~20:1 | AAA PASS |
| Muted text on background | ~10:1 | AAA PASS |
| Destructive on white | ~5:1 | AA PASS (barely) |
| Dark mode primary on bg | ~15:1 | AAA PASS |
| Hardcoded bg-blue-500 text | Unknown | Needs audit |

---

## 8. Prioritas Perbaikan

### 8.1 CRITICAL — Paling Berdampak

| # | Perbaikan | Effort | Impact | Area |
|---|-----------|--------|--------|------|
| 1 | Tambah breadcrumb + lengkapi page title untuk semua 50+ route | Kecil | User selalu tahu posisinya | Navigasi |
| 2 | Standardisasi validasi form — Zod + error per field di SEMUA form | Sedang | Kurangi frustrasi input | Form |
| 3 | Tambah tanda required (\*) di semua form | Kecil | User tahu field wajib | Form |
| 4 | Empty state dengan CTA — "Tambah Produk Pertama", "Import Excel" | Kecil | User tahu langkah selanjutnya | Empty State |
| 5 | Standardisasi toast — pakai `toast.*` everywhere | Kecil | Konsistensi feedback | Toast |
| 6 | Mobile: hide sidebar + hamburger menu | Sedang | Content area 100% width | Mobile |

### 8.2 HIGH — Sangat Meningkatkan Pengalaman

| # | Perbaikan | Effort | Impact | Area |
|---|-----------|--------|--------|------|
| 7 | 401 handling: "Session Expired" dulu, baru logout | Kecil | User tidak kehilangan form data | Error |
| 8 | Autofocus field pertama di semua create form | Kecil | Input lebih cepat | Form |
| 9 | Ganti hardcoded warna status → design system Badge variants | Kecil | Dark mode tidak rusak | Visual |
| 10 | Tambah Badge variant success, warning, info | Kecil | Konsistensi visual | Visual |
| 11 | Image lazy loading di semua product image | Kecil | Performance mobile | Mobile |
| 12 | Search-specific empty state — "Tidak ada hasil untuk 'xyz'" | Kecil | User paham ini search result | Empty State |

### 8.3 MEDIUM — Polish & Profesionalisme

| # | Perbaikan | Effort | Impact | Area |
|---|-----------|--------|--------|------|
| 13 | Split "Produk & Inventori" jadi 2 section | Kecil | Kurangi cognitive load | Navigasi |
| 14 | `prefers-reduced-motion` support | Kecil | A11y standard | A11y |
| 15 | `aria-live`, `aria-invalid`, `aria-describedby` | Sedang | Screen reader support | A11y |
| 16 | Retry mechanism untuk API error | Sedang | User tidak perlu refresh | Error |
| 17 | `useConfirmDialog` hook | Kecil | Kurangi boilerplate | Error |
| 18 | Pin max feedback (toast saat coba pin ke-6) | Kecil | User tahu kenapa pin gagal | Navigasi |
| 19 | Tambah versi mobile halaman yang belum ada | Besar | 40%+ halaman masih desktop di HP | Mobile |
| 20 | DataTable skeleton match kolom asli | Kecil | Loading lebih realistic | Loading |
| 21 | Focus restoration setelah modal tutup | Kecil | Tab order tidak rusak | A11y |
| 22 | Keyboard navigation di product grid POS | Sedang | Keyboard-only user | A11y |
| 23 | `type="tel"` di semua phone field | Kecil | Mobile keyboard optimal | Form |
| 24 | Haptic feedback (Vibration API) untuk POS | Kecil | Konfirmasi transaksi terasa | Mobile |

---

## Lampiran: Skor Detail Per Component

### Form Maturity

| Form | Validasi | Error Display | Autofocus | Placeholder | Skor |
|------|----------|---------------|-----------|-------------|------|
| Register (Account) | Zod | Per field | Tidak | Bagus | 8/10 |
| Register (Business) | Zod | Per field | Tidak | Sebagian | 8/10 |
| Login | HTML5 | Tidak ada | Tidak | Bagus | 7/10 |
| Product | HTML5 | Tidak ada | Tidak | Sebagian | 6/10 |
| Employee | HTML5 | Tidak ada | Tidak | Sebagian | 6/10 |
| Customer | HTML5 | Tidak ada | Tidak | Sebagian | 6/10 |
| Business Settings | HTML5 | Tidak ada | Tidak | Bagus | 7/10 |
| Tax Settings | HTML5 | Tidak ada | Tidak | Sebagian | 7/10 |
| Payment Panel | Custom | Live calc | — | Bagus | 8/10 |
| Discount Modal | Custom | Preview | — | Bagus | 8/10 |
| Product Modal | — | Badge req | — | Bagus | 8/10 |

### Mobile Maturity

| Category | Skor | Detail |
|----------|------|--------|
| Device Detection | 9/10 | 3-tier breakpoint + touch detection |
| Touch Targets | 8/10 | Mostly 44-48px, beberapa kecil |
| Layout | 9/10 | Dedicated mobile pages |
| Gestures | 8/10 | Swipe, pull-to-refresh, snap sheets |
| Navigation | 9/10 | Bottom bar, proper structure |
| Performance | 7/10 | Image optimization kurang |
| Accessibility | 8/10 | ARIA labels, alt text |
| Visual Feedback | 7/10 | Animasi ada, haptic belum |
| Offline | 7/10 | POS ada, backoffice belum |
| Error | 7/10 | Dialog + toast, bisa lebih jelas |

### Design System Maturity

| Aspect | Skor | Detail |
|--------|------|--------|
| Color System | 7/10 | HSL defined, tapi hardcoded di features |
| Typography | 8/10 | Hierarchy konsisten |
| Spacing | 8/10 | 8px base scale |
| Icons | 6/10 | Lucide konsisten, sizing bervariasi |
| Components | 9/10 | shadcn/ui well-customized |
| Animations | 8/10 | 200ms standard, no reduced-motion |
| Dark Mode | 8/10 | System defined, features override |
| Tables/Lists | 9/10 | DataTable konsisten |
| Form A11y | 6/10 | Missing aria attributes |
