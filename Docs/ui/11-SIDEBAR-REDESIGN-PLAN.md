# Sidebar Redesign Plan

> **Goal:** Kurangi cognitive overload dari 42 menu items → max 15 visible items, dengan UX yang intuitif untuk semua role.

## Current State

| Metric | Value |
|--------|-------|
| Total sections | 8 |
| Total menu items | 42 |
| Max items per section | 10 (Pengaturan) |
| Scroll needed | Ya, panjang |
| Role-based filtering | Partial (feature-based only) |
| User customization | Tidak ada |
| Collapsed mode | Icon only, tidak ada fly-out |

### Current Structure
```
[no title]     → Dashboard, POS Terminal, Kitchen Display (3)
Penjualan      → Transaksi, Pesanan, Meja, Daftar Tunggu, Shift, Penyelesaian (6)
Katalog        → Produk, Bahan Baku (2)
Inventori      → Stok, Transfer, Supplier, Purchase Order, Harga Bertingkat, Konversi Satuan, Batch & Expiry, Serial Number (8)
Layanan        → Appointment, Work Order, Item Tracking (3)
Pemasaran      → Promosi, Voucher, Loyalty, Toko Online, Self Order (5)
Lainnya        → Karyawan, Pelanggan, Segmen, Laporan, Audit Log (5)
Pengaturan     → Bisnis, Outlet, Perangkat, Notifikasi, Pajak, Struk, Jam Operasional, Modifier, Tipe Bisnis, Fitur (10)
```

### Target Structure
```
★ Favorit          → User-pinned items, max 5 (0 default)
Quick Access       → Dashboard, POS Terminal, Kitchen Display (3)
Penjualan          → Transaksi, Pesanan, Meja, Shift (4 visible, +2 "Lihat semua")
Produk & Inventori → Produk, Stok, Transfer, Supplier (4 visible, +6 "Lihat semua")
Pelanggan          → Pelanggan, Promosi, Loyalty, Toko Online (4 visible, +4 "Lihat semua")
Laporan & Tim      → Laporan, Karyawan, Audit Log (3)
⚙ Settings         → Bottom icon, buka halaman terpisah
```

---

## Phase 1: Restructure & Progressive Disclosure
> **Effort:** Medium | **Impact:** High | **Target:** Kurangi visible items dari 42 → ~18

### 1.1 Regroup Navigation Sections

**Merge sections** dari 8 → 6 grup yang lebih intuitif:

| New Section | Items (visible) | Items (hidden via "Lihat semua") |
|-------------|----------------|----------------------------------|
| Quick Access | Dashboard, POS Terminal, Kitchen Display | - |
| Penjualan | Transaksi, Pesanan, Meja, Shift | Daftar Tunggu, Penyelesaian |
| Produk & Inventori | Produk, Stok, Transfer, Supplier | Bahan Baku, Purchase Order, Harga Bertingkat, Konversi Satuan, Batch & Expiry, Serial Number |
| Pelanggan | Pelanggan, Promosi, Loyalty, Toko Online | Segmen, Voucher, Self Order, Appointment, Work Order, Item Tracking |
| Laporan & Tim | Laporan, Karyawan, Audit Log | - |
| ⚙ Pengaturan | _(bottom icon, buka page terpisah)_ | Semua 10 setting items |

**Rationale:**
- "Katalog" (2 items) terlalu kecil → merge ke "Produk & Inventori"
- "Layanan" (3 items) kontekstual → merge ke "Pelanggan" (service = customer-facing)
- "Lainnya" label tidak informatif → split ke sections yang sesuai
- "Pengaturan" (10 items) jarang diakses daily → pindah ke bottom icon

### 1.2 Implement "Lihat Semua" Truncation

Setiap section yang punya > 4 items:
- Tampilkan 4 items pertama (most used)
- Tampilkan link "Lihat semua →" yang expand sisa items
- State tersimpan di localStorage per section

```
Produk & Inventori
  ├── Produk
  ├── Stok
  ├── Transfer
  ├── Supplier
  └── Lihat semua → (expand: Bahan Baku, PO, Harga Bertingkat, dll)
```

### 1.3 Move Settings ke Bottom Bar

- Hapus section "Pengaturan" dari nav scroll
- Tambah icon bar di bottom sidebar: `⚙ Settings` + `👤 Profile`
- Klik Settings → navigate ke `/app/settings` (halaman terpisah dengan sub-nav sendiri)
- Klik Profile → navigate ke `/app/profile`

```
┌─────────────────────┐
│ 🔵 TILO        [<]  │  ← Header
├─────────────────────┤
│ Quick Access         │
│ Penjualan            │
│ Produk & Inventori   │  ← Scrollable nav
│ Pelanggan            │
│ Laporan & Tim        │
├─────────────────────┤
│ ⚙ Settings  👤 User │  ← Fixed bottom bar
└─────────────────────┘
```

### Files to modify
- `packages/web/src/components/layout/sidebar.tsx` — Main restructure
- `packages/web/src/components/layout/app-layout.tsx` — Settings page routing if needed

### Acceptance Criteria
- [ ] Navigation regrouped dari 8 → 6 sections
- [ ] Sections dengan > 4 items punya "Lihat semua" truncation
- [ ] Settings dipindah ke bottom icon bar
- [ ] Profile/user info di bottom sidebar
- [ ] localStorage persistence untuk expanded sections
- [ ] Tidak ada regresi — semua link masih bisa diakses

---

## Phase 2: Role-Based Filtering
> **Effort:** Low | **Impact:** High | **Target:** Kasir lihat ~5 items, Kitchen ~3 items

### 2.1 Define Role-Nav Mapping

| Role | Visible Sections | Est. Items |
|------|-----------------|------------|
| **Cashier** | Quick Access (Dashboard, POS), Penjualan (Transaksi, Pesanan, Shift) | ~5 |
| **Kitchen Staff** | Quick Access (KDS), Penjualan (Pesanan) | ~3 |
| **Inventory Staff** | Quick Access (Dashboard), Produk & Inventori (semua) | ~10 |
| **Supervisor** | Semua kecuali Settings | ~18 |
| **Manager** | Semua | ~20 |
| **Owner / Super Admin** | Semua + Settings | ~20 + settings |

### 2.2 Implement Role Filter

- Extend `useFeatureStore` atau buat `useNavFilter` hook
- Ambil role dari `useAuthStore` → filter `navSections` berdasarkan mapping
- Combine dengan existing feature-based filtering (`isPathVisible`)
- Priority: role filter AND feature filter (keduanya harus pass)

### 2.3 Role-Specific Quick Access

- Kasir: POS Terminal jadi prominent (larger button / different style)
- Kitchen: KDS jadi prominent
- Manager: Dashboard jadi prominent

### Files to modify
- `packages/web/src/components/layout/sidebar.tsx` — Add role filtering
- `packages/web/src/stores/ui.store.ts` atau buat `hooks/use-nav-filter.ts`

### Acceptance Criteria
- [ ] Kasir hanya lihat ~5 menu items
- [ ] Kitchen staff hanya lihat ~3 menu items
- [ ] Manager/Owner lihat full menu
- [ ] Role filter + feature filter bekerja bersamaan
- [ ] Tidak ada broken links — hidden items tetap accessible via URL langsung

---

## Phase 3: Favorites / Pin System
> **Effort:** Medium | **Impact:** High | **Target:** User bisa pin max 5 item favorit ke top sidebar

### 3.1 Pin/Unpin Mechanism

- Right-click menu item → "Pin to Favorites" / "Unpin"
- Atau: hover menu item → tampilkan pin icon di kanan
- Pinned items muncul di section "★ Favorit" di paling atas
- Max 5 pinned items
- Stored di localStorage key `sidebar_pinned_items`

### 3.2 Favorites Section UI

```
★ Favorit
  ├── 📊 Laporan          [📌]
  ├── 🛒 POS Terminal     [📌]
  ├── 📦 Produk           [📌]
  └── 👥 Pelanggan        [📌]
```

- Pin icon visible on hover
- Drag-and-drop untuk reorder (nice-to-have, bisa skip)
- Empty state: "Pin menu favorit kamu di sini" dengan hint

### 3.3 Default Pins per Role (First Time)

Saat user pertama kali login (belum ada pins):
- **Cashier**: POS Terminal, Transaksi
- **Kitchen**: KDS
- **Manager**: Dashboard, Laporan, Produk
- **Owner**: Dashboard, Laporan, Karyawan

User bisa override kapan saja.

### Files to modify
- `packages/web/src/components/layout/sidebar.tsx` — Favorites section + pin UI
- `packages/web/src/stores/ui.store.ts` — Pinned items state management
- `packages/web/src/hooks/use-sidebar-pins.ts` — New hook (opsional, bisa di store)

### Acceptance Criteria
- [ ] User bisa pin/unpin menu items
- [ ] Favorites section muncul di top sidebar
- [ ] Max 5 pinned items
- [ ] Default pins per role untuk first-time users
- [ ] Persisted di localStorage
- [ ] Pinned items tetap muncul meskipun section-nya collapsed

---

## Phase 4: Improved Collapsed Mode
> **Effort:** Medium | **Impact:** Medium | **Target:** Collapsed sidebar yang actually usable

### 4.1 Fly-out Menu on Hover

Saat sidebar collapsed (icon-only mode):
- Hover pada section divider/icon → tampilkan fly-out panel di samping
- Fly-out berisi: section title + semua items dalam section
- Fly-out hilang saat mouse leave
- Keyboard: arrow keys navigate, Enter select

```
┌──────┐  ┌─────────────────────┐
│  📊  │  │ Penjualan            │
│  🛒  │──│  Transaksi           │
│  📋  │  │  Pesanan             │
│  ──  │  │  Meja                │
│  📦  │  │  Shift               │
│  👥  │  │  Lihat semua →       │
│  📈  │  └─────────────────────┘
│  ──  │
│  ⚙   │
└──────┘
```

### 4.2 Section Icons untuk Collapsed Mode

Setiap section punya representative icon saat collapsed:
- Quick Access: `LayoutDashboard`
- Penjualan: `ShoppingCart`
- Produk & Inventori: `Package`
- Pelanggan: `Users`
- Laporan & Tim: `BarChart3`
- Settings: `Settings` (already at bottom)

### 4.3 Active Indicator

Saat collapsed, tampilkan dot/bar indicator di samping icon yang section-nya mengandung active page.

### Files to modify
- `packages/web/src/components/layout/sidebar.tsx` — Fly-out component
- `packages/web/src/components/layout/sidebar-flyout.tsx` — New component

### Acceptance Criteria
- [ ] Hover pada collapsed section → fly-out muncul
- [ ] Fly-out menampilkan semua items dalam section
- [ ] Active page indicator visible di collapsed mode
- [ ] Keyboard navigation di fly-out
- [ ] Smooth animation (150-200ms transition)
- [ ] Fly-out tidak overlap dengan content area

---

## Phase 5: Search & Smart Navigation
> **Effort:** Low-Medium | **Impact:** Medium | **Target:** Power users bisa navigate tanpa scroll

### 5.1 Search Bar di Top Sidebar

- Ganti footer "Quick Search" tip → search input di atas nav
- Placeholder: "Cari menu... ⌘K"
- Klik → focus input, filter nav items real-time
- Atau: klik → langsung buka Command Palette

```
┌─────────────────────┐
│ 🔵 TILO        [<]  │
├─────────────────────┤
│ 🔍 Cari menu... ⌘K  │  ← Search bar
├─────────────────────┤
│ ★ Favorit            │
│ Quick Access         │
│ ...                  │
```

### 5.2 Auto-Expand Active Section

- Saat navigasi ke halaman tertentu, auto-expand section yang mengandung halaman tersebut
- Auto-collapse sections lain (optional, bisa toggle via setting)
- Contoh: navigate ke `/app/inventory/stock` → "Produk & Inventori" auto-expand

### 5.3 Recent Pages (Nice-to-Have)

- Track 3-5 halaman terakhir yang dikunjungi
- Tampilkan di bawah Favorites atau di Command Palette
- Stored di sessionStorage (reset saat logout)

### Files to modify
- `packages/web/src/components/layout/sidebar.tsx` — Search bar + auto-expand
- `packages/web/src/components/shared/command-palette.tsx` — Integration

### Acceptance Criteria
- [ ] Search bar di top sidebar
- [ ] Real-time filter atau langsung buka command palette
- [ ] Active section auto-expand saat navigate
- [ ] Hapus footer "Quick Search" tip (sudah diganti search bar)

---

## Phase 6: Polish & Animation
> **Effort:** Low | **Impact:** Low | **Target:** Smooth, polished feel

### 6.1 Transition Improvements

- Section expand/collapse: gunakan `framer-motion` atau CSS `grid-template-rows` trick (bukan `max-height` hack)
- Sidebar collapse/expand: smooth width transition (sudah ada, tapi bisa improve)
- Fly-out: fade + slide animation

### 6.2 Visual Hierarchy

- POS Terminal: prominent button style (filled/gradient) — ini fitur utama
- Favorites section: subtle background tint untuk differentiate
- Section headers: slightly larger, bolder
- Active item: left border indicator + background, bukan full background fill

### 6.3 Responsive

- < 768px: sidebar menjadi overlay/drawer (sudah handle di mobile pages, tapi cek)
- 768-1024px: auto-collapse to icon mode
- > 1024px: full sidebar

### 6.4 Accessibility

- Semua items keyboard navigable (Tab, Arrow keys)
- `aria-expanded` untuk collapsible sections
- `aria-current="page"` untuk active item
- Focus visible styles
- Screen reader friendly section labels

### Files to modify
- `packages/web/src/components/layout/sidebar.tsx` — All polish items

### Acceptance Criteria
- [ ] Smooth animations tanpa jank/jump
- [ ] POS Terminal visually prominent
- [ ] Keyboard fully navigable
- [ ] WCAG 2.1 AA compliant
- [ ] Mobile overlay mode

---

## Implementation Order & Dependencies

```
Phase 1 (Restructure)
  ↓
Phase 2 (Role Filter) ←── bisa parallel dengan Phase 1
  ↓
Phase 3 (Favorites) ←── depends on Phase 1 structure
  ↓
Phase 4 (Collapsed Mode) ←── depends on Phase 1 structure
  ↓
Phase 5 (Search) ←── independent, bisa parallel dengan Phase 3/4
  ↓
Phase 6 (Polish) ←── depends on all above
```

**Recommended parallel execution:**
- Sprint 1: Phase 1 + Phase 2
- Sprint 2: Phase 3 + Phase 4
- Sprint 3: Phase 5 + Phase 6

---

## Before & After Comparison

### Cashier View
```
BEFORE: 42 items, scroll panjang, bingung
AFTER:  ~5 items (POS, Transaksi, Pesanan, Meja, Shift)
```

### Manager View
```
BEFORE: 42 items, semua visible, no hierarchy
AFTER:  ~18 items visible, grouped, + "Lihat semua" untuk detail
        + Favorites section di atas
        + Settings di bottom icon
```

### Collapsed Mode
```
BEFORE: Icon only, harus expand untuk navigate
AFTER:  Icon + fly-out on hover, section indicators
```
