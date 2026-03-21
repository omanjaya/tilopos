# Feature Audit: Kitchen Display System (KDS)

Dokumen ini berisi evaluasi menyeluruh terhadap modul KDS TiloPOS, meliputi penilaian kondisi saat ini, analisis UX, perbandingan kompetitor, gap analysis, evaluasi performa real-time, dan rekomendasi perbaikan.

---

## 1. Penilaian Kondisi Saat Ini (Current State)

### Arsitektur Backend

**Komponen:**

| File | Fungsi |
|------|--------|
| `kds.controller.ts` | REST API endpoints untuk orders, analytics, timer settings, overdue, notify |
| `kds.service.ts` | Business logic: cooking timer settings, overdue orders, cashier notification |
| `kds.gateway.ts` | WebSocket gateway (/kds namespace) dengan station/outlet rooms |
| `kds-analytics.service.ts` | Analytics: daily metrics, per-station stats, performance report |
| `kds.module.ts` | NestJS module wiring |

**API Endpoints (11 total):**

| Method | Path | Fungsi | Auth |
|--------|------|--------|------|
| GET | `/kds/orders` | Daftar pesanan (filter station, status, priority) | JWT |
| POST | `/kds/bump` | Bump item (tandai selesai) | JWT |
| GET | `/kds/stations` | Daftar station yang tersedia | JWT |
| GET | `/kds/analytics` | Analytics harian | JWT |
| GET | `/kds/performance` | Laporan performa (range tanggal) | JWT |
| PUT | `/kds/items/:id/preparing` | Tandai item sedang disiapkan | JWT |
| PUT | `/kds/items/:id/ready` | Tandai item siap | JWT |
| PUT | `/kds/items/:id/recall` | Recall item (kirim ulang ke dapur) | JWT |
| GET | `/kds/timer-settings` | Ambil setting timer SLA | JWT |
| PUT | `/kds/timer-settings` | Update setting timer SLA | JWT + Owner/Manager |
| GET | `/kds/overdue` | Daftar pesanan yang melewati SLA | JWT |
| POST | `/kds/orders/:id/notify-ready` | Notifikasi kasir pesanan siap | JWT |

**WebSocket Events:**

| Event | Arah | Fungsi |
|-------|------|--------|
| `joinOutlet` | Client --> Server | Join outlet room |
| `joinStation` | Client --> Server | Join station room |
| `leaveStation` | Client --> Server | Leave station room |
| `order:new` | Server --> Client | Pesanan baru dibuat |
| `order:status_changed` | Server --> Client | Status pesanan berubah |
| `order:ready` | Server --> Client | Pesanan siap disajikan |

**Security:**
- JWT authentication pada WebSocket handshake
- Outlet ownership validation (`verifyOutletAccess`)
- Order item ownership validation (`verifyOrderItemAccess`)
- Rate limiting: 20 requests per 60 detik per client WebSocket
- Room-based isolation: outlet room dan station room terpisah

### Arsitektur Frontend

**Komponen (15 file):**

| Kategori | File | Fungsi |
|----------|------|--------|
| Page | `kds-page.tsx` | Halaman utama KDS |
| Hooks | `useKdsOrders.ts` | Fetch orders + bump/notify mutations |
| | `useKdsSocket.ts` | WebSocket connection management |
| | `useKdsSound.ts` | Sound effects untuk notifikasi |
| | `useKdsTimer.ts` | Clock timer (jam real-time) |
| | `useKdsFilters.ts` | Filter dan sorting logic |
| Components | `kds-header.tsx` | Header bar (outlet, count, time, actions) |
| | `kds-stats-bar.tsx` | Panel statistik dapur (4 metrik) |
| | `kds-filters.tsx` | Tab filter (Semua, Menunggu, Diproses, Siap) |
| | `order-grid.tsx` | Grid layout kartu pesanan |
| | `kds-order-card.tsx` | Kartu pesanan individual |
| | `order-item-row.tsx` | Baris item dalam kartu |
| | `cooking-timer.tsx` | Timer countdown per pesanan |
| | `order-timer.tsx` | Timer elapsed untuk pesanan selesai |
| | `priority-badge.tsx` | Badge VIP/Urgent |
| | `kds-empty-state.tsx` | Empty states (loading, error, no orders) |
| | `kds-style-utils.ts` | Utility warna dan style |

**State Management:**
- TanStack Query: `['kds-orders', outletId]` dengan refetchInterval 10 detik
- WebSocket events trigger `invalidateQueries` untuk immediate refetch
- Zustand: `useUIStore` (selectedOutletId), `useAuthStore` (user, token)
- Local state: `useKdsFilters` hook untuk filter dan sorting

---

## 2. Evaluasi UX (User Experience)

### Kelebihan

**Desain dark mode yang tepat untuk dapur:**
- Background `bg-zinc-900` memberikan kontras tinggi yang ideal untuk lingkungan dapur yang terang
- Teks putih pada background gelap mudah terbaca dari jarak jauh
- Warna-warna status (hijau, kuning, merah) sangat kontras dan mudah dibedakan

**Cooking timer yang informatif:**
- 3 fase warna (hijau, kuning, merah) memberikan informasi instan tanpa perlu membaca angka
- Efek `animate-pulse` pada fase overdue menarik perhatian untuk pesanan yang terlambat
- Format `MM:SS (+MM:SS)` untuk overdue menunjukkan seberapa lama keterlambatan

**Priority system yang jelas:**
- VIP badge emas dengan ikon crown dan shadow tambahan
- Urgent badge oranye dengan ikon warning
- Sorting otomatis: VIP > Urgent > Normal, terlama lebih dulu

**Progress tracking per pesanan:**
- Progress bar visual di atas kartu
- Text "2/4 item selesai" memberikan informasi tepat
- Warna kartu berubah menjadi hijau saat semua item selesai

**Empty states yang lengkap:**
- 4 tipe empty state: loading, error (dengan retry), no orders, no filtered orders
- Feedback yang jelas untuk setiap kondisi

### Kelemahan

**Touch target berpotensi kecil:**
- Tombol bump per item bisa kecil di tablet, terutama saat daftar item panjang
- Filter tab menggunakan `text-xs` yang mungkin sulit diklik dengan tangan basah/kotor (kondisi dapur)
- Tombol "Beritahu Kasir" sudah baik (`min-h-[44px]`) tetapi tombol lain belum konsisten

**Tidak ada sound customization:**
- `useKdsSound` hook ada tetapi konfigurasi suara tidak bisa diubah dari UI
- Tidak ada opsi mute/unmute yang terlihat di layar
- Tidak ada perbedaan suara untuk pesanan biasa vs VIP/Urgent

**Tidak ada drag-and-drop atau gesture:**
- Bump hanya via klik tombol
- Tidak ada swipe gesture untuk bump (umum di touch screen kitchen display)
- Tidak ada drag pesanan untuk mengubah urutan atau prioritas

**Status preparing tidak ada UI trigger di frontend:**
- Backend endpoint `PUT /kds/items/:id/preparing` tersedia
- Tetapi di frontend, tidak ada tombol untuk menandai item mulai diproses
- Item langsung dari "pending" ke "ready" (via bump) tanpa step "preparing" di UI

**Tidak ada view per pesanan (detail view):**
- Semua informasi ditampilkan langsung di kartu
- Tidak ada modal atau detail page untuk melihat catatan lengkap, modifier details, atau riwayat status

---

## 3. Analisis Kompetitor

### Toast KDS (Best-in-class)

**Kelebihan yang bisa diadopsi:**
- **Swipe-to-bump:** Geser kartu untuk menandai selesai (sangat cepat untuk touch screen)
- **Color-coded by order type:** Warna border berbeda untuk dine-in, takeaway, delivery (bukan hanya badge text)
- **Configurable layout:** Pilih antara card view, list view, atau ticket view
- **Multi-language support:** Penting untuk dapur dengan koki multinasional
- **Expo/expeditor view:** View khusus untuk head chef yang melihat semua station
- **Order routing rules:** Otomatis route item ke station berdasarkan kategori produk

**Kelemahan Toast:**
- Biaya tambahan signifikan di atas langganan POS
- Memerlukan hardware khusus Toast
- Tidak standalone — harus paket dengan Toast POS

### Square KDS

**Kelebihan:**
- **Simple UI:** Sangat minimalis, cocok untuk dapur kecil
- **Free dengan Square POS:** Tidak ada biaya tambahan
- **Customizable ticket layout:** Pilih informasi apa yang ditampilkan

**Kelemahan:**
- Tidak ada priority system
- Station filtering terbatas
- Tidak ada analytics/performance report
- Tidak ada recall functionality

### Fresh KDS (Standalone)

**Kelebihan:**
- **Multiple display modes:** Grid, list, timeline
- **Customizable alert thresholds:** Atur kapan warning dan overdue muncul
- **Screen burn-in prevention:** Auto-rotate dan theme variation
- **Integration agnostic:** Bisa digunakan dengan berbagai POS

**Kelemahan:**
- Bukan integrated solution (perlu setup integrasi)
- Biaya terpisah dari POS
- Dukungan WebSocket/real-time tergantung integrasi

### Moka KDS

**Kelebihan:**
- Terintegrasi dengan ekosistem Moka
- UI sederhana dalam Bahasa Indonesia

**Kelemahan:**
- Fitur sangat basic dibanding Toast/Square
- Tidak ada station filtering
- Tidak ada priority system
- Tidak ada analytics
- Fitur tambahan berbayar

---

## 4. Gap Analysis

### Fitur yang Ada vs Best Practice

| Fitur | TiloPOS KDS | Best Practice (Toast) | Gap |
|-------|-------------|----------------------|-----|
| Real-time sync | Ya (WebSocket + polling) | Ya | Tidak ada gap |
| Cooking timer | 3 fase warna | 3 fase warna + audio | Audio alert per fase |
| Station filtering | 7 station via API | Auto-routing + UI filter | Auto-routing |
| Priority badges | VIP, Urgent, Normal | VIP, Urgent, Rush | Setara |
| Swipe-to-bump | Tidak ada | Ya | Tinggi (touch UX) |
| Preparing status UI | Tidak ada di frontend | Ya | Sedang |
| Layout options | Grid only | Grid, List, Ticket | Sedang |
| Expo/expeditor view | Tidak ada | Ya | Sedang |
| Sound customization | Tidak ada | Ya | Sedang |
| Order routing rules | Manual (field station) | Auto by category | Rendah |
| Screen burn-in prevention | Tidak ada | Ya | Rendah |
| Offline support | Tidak ada | Terbatas | Rendah (KDS butuh real-time) |

### Missing Features

1. **Swipe gesture untuk bump** — Critical untuk efisiensi touch screen
2. **Preparing status trigger di UI** — Gap antara backend capability dan frontend
3. **Sound customization dan mute button** — Penting untuk lingkungan dapur
4. **Auto-routing berdasarkan kategori produk** — Mengurangi setup manual
5. **Layout options** — Grid bukan satu-satunya layout yang efektif
6. **Expo/head chef view** — Overview semua station dalam satu layar
7. **Waktu target per item** (bukan hanya per pesanan) — Item kompleks butuh waktu lebih lama

---

## 5. Evaluasi Optimasi Touch Screen

### Kondisi Saat Ini

**Target size analysis:**

| Element | Ukuran Saat Ini | Minimum Touch (44px) | Status |
|---------|----------------|---------------------|--------|
| Tombol Bump (per item) | Bervariasi (tergantung content) | 44x44px | Perlu verifikasi |
| Tombol Beritahu Kasir | `min-h-[44px]`, full width | 44x44px | Memenuhi |
| Filter tabs | `px-3 py-1.5` (sekitar 32px height) | 44x44px | Kurang |
| Stats bar collapse toggle | Text link | 44x44px | Kurang |
| Refresh button | Icon button (kecil) | 44x44px | Kurang |

### Rekomendasi Touch Optimization

1. **Bump button:** Perbesar menjadi minimal 44x44px dengan area klik yang jelas
2. **Filter tabs:** Tingkatkan padding menjadi `px-4 py-3` untuk target 44px minimum
3. **Swipe gesture:** Implementasi swipe-right pada order card untuk bump semua item
4. **Swipe-left:** Implementasi swipe-left untuk recall
5. **Long-press:** Detail view saat long-press pada kartu pesanan
6. **Haptic feedback:** Vibration feedback saat bump berhasil (untuk tablet)
7. **Large button mode:** Opsi untuk memperbesar semua tombol di pengaturan KDS

---

## 6. Evaluasi Performa Real-Time (WebSocket)

### Kondisi Saat Ini

**Arsitektur WebSocket:**
- Namespace: `/kds`
- Transport: WebSocket primer, polling fallback
- Reconnection: Infinite attempts, delay 1-5 detik
- Auth: JWT token pada handshake
- Room system: `outlet:{outletId}` dan `station:{outletId}:{station}`

**Rate Limiting:**
- Max 20 requests per 60 detik per client
- Logging saat rate limit exceeded
- Response `{ error: 'Rate limit exceeded' }` saat melebihi batas

**Event Bus Integration:**
- `OrderStatusChangedEvent` memicu broadcast ke outlet room
- Event `order:new` saat pesanan baru (status pending, no previous status)
- Event `order:ready` saat pesanan di-bump ke ready
- Semua event diproses via RxJS subscription di `onModuleInit`

### Kelebihan

- **Room-based isolation:** Data hanya dikirim ke client yang relevan (per outlet/station)
- **Graceful reconnection:** Auto-reconnect dengan exponential backoff
- **Dual transport:** WebSocket + polling fallback
- **Rate limiting:** Mencegah abuse dan overload
- **JWT validation:** Autentikasi pada setiap koneksi baru
- **Outlet ownership check:** Validasi bisnis ownership sebelum join room
- **Room cleanup:** Automatic cleanup saat disconnect

### Area Perbaikan

**1. Tidak ada heartbeat/ping mechanism di frontend:**
- Jika koneksi diam terlalu lama, bisa terputus tanpa terdeteksi
- Rekomendasi: Implementasi ping/pong interval (setiap 30 detik)

**2. Tidak ada offline queue:**
- Jika WebSocket terputus saat bump, operasi gagal
- Rekomendasi: Queue actions saat offline, replay saat reconnect

**3. Event payload bisa dioptimalkan:**
- `invalidateQueries` pada setiap event memicu full refetch
- Rekomendasi: Untuk event `order:status_changed`, include data perubahan sehingga bisa update cache langsung tanpa refetch

**4. Tidak ada connection status indicator di UI:**
- User tidak tahu apakah WebSocket connected atau disconnected
- Rekomendasi: Tampilkan indikator koneksi (hijau = connected, merah = disconnected) di header KDS

**5. Tidak ada message deduplication:**
- Jika reconnect terjadi, event yang sama bisa diterima dua kali
- Dampak minimal karena `invalidateQueries` idempotent, tetapi bisa menyebabkan unnecessary refetch

---

## 7. Top Perbaikan

| No | Perbaikan | Prioritas | Effort | Impact |
|----|----------|----------|--------|--------|
| 1 | **Swipe-to-bump gesture** untuk touch screen — swipe kanan pada item untuk bump | Tinggi | Sedang | Tinggi |
| 2 | **Tombol preparing di UI** — tambahkan aksi "Mulai Masak" per item untuk trigger status preparing | Tinggi | Rendah | Tinggi |
| 3 | **Touch target optimization** — perbesar semua tombol interaktif ke minimum 44x44px | Tinggi | Rendah | Tinggi |
| 4 | **Connection status indicator** — tampilkan status WebSocket di header (connected/disconnected/reconnecting) | Tinggi | Rendah | Sedang |
| 5 | **Sound controls** — tombol mute/unmute di header, volume control, sound berbeda untuk VIP vs normal | Sedang | Rendah | Sedang |
| 6 | **Auto-routing rules** — konfigurasi routing item ke station berdasarkan kategori produk, bukan manual per item | Sedang | Sedang | Sedang |
| 7 | **Layout options** — tambahkan pilihan tampilan List dan Ticket view selain Grid yang ada saat ini | Sedang | Sedang | Sedang |
| 8 | **Optimasi WebSocket payload** — kirim data perubahan di event payload untuk update cache langsung tanpa full refetch | Sedang | Sedang | Sedang |
| 9 | **Expo/expeditor view** — tampilan overview semua station untuk head chef dengan kemampuan bump dari overview | Rendah | Sedang | Sedang |
| 10 | **Screen burn-in prevention** — subtle animation atau theme rotation untuk mencegah burn-in pada display yang menyala terus | Rendah | Rendah | Rendah |

---

## 8. Roadmap Implementasi

### Fase 1: Touch Optimization (1-2 Minggu)

- [ ] Perbesar semua touch target ke minimum 44x44px (filter tabs, bump buttons, refresh)
- [ ] Tambahkan tombol "Mulai Masak" (preparing) di order item row
- [ ] Tambahkan connection status indicator di header KDS
- [ ] Tambahkan tombol mute/unmute sound di header

### Fase 2: Gesture dan Interaksi (2-4 Minggu)

- [ ] Implementasi swipe-to-bump gesture (swipe kanan pada item)
- [ ] Implementasi swipe-to-recall (swipe kiri pada item yang sudah ready)
- [ ] Tambahkan long-press untuk detail view pesanan
- [ ] Implementasi haptic feedback pada aksi bump

### Fase 3: Display dan Layout (4-6 Minggu)

- [ ] Tambahkan layout option: List view dan Ticket view
- [ ] Implementasi expo/expeditor view untuk head chef
- [ ] Screen burn-in prevention (subtle movement, periodic theme shift)
- [ ] Station filter UI di frontend (dropdown atau tab, bukan hanya API)

### Fase 4: Smart Features (6-8 Minggu)

- [ ] Auto-routing rules: konfigurasi routing item ke station berdasarkan kategori produk
- [ ] Optimasi WebSocket: kirim perubahan data di payload event untuk cache update langsung
- [ ] Offline queue: simpan aksi bump/recall saat offline, replay saat reconnect
- [ ] Heartbeat mechanism di frontend untuk deteksi disconnect lebih cepat
- [ ] Sound customization: pilih nada notifikasi berbeda untuk VIP, Urgent, dan Normal
- [ ] Per-item cooking time target (berdasarkan produk, bukan hanya per pesanan)

---

## Kesimpulan

KDS TiloPOS sudah memiliki fondasi yang kuat dengan arsitektur backend yang solid (REST + WebSocket, rate limiting, room isolation, JWT auth) dan frontend yang fungsional (real-time updates, cooking timer 3 fase, priority system, analytics). Implementasi lebih lengkap dibanding kompetitor lokal seperti Moka KDS.

Area perbaikan utama ada di **touch screen optimization** (touch target kecil, tidak ada swipe gesture), **gap antara backend dan frontend capability** (preparing status, station filter UI), dan **beberapa missing UX features** (connection indicator, sound controls, layout options). Dari segi performa real-time, arsitektur WebSocket sudah baik tetapi bisa dioptimalkan dengan heartbeat, offline queue, dan payload optimization.

Dengan implementasi roadmap di atas, KDS TiloPOS bisa mendekati level Toast KDS (best-in-class) sambil tetap mempertahankan keunggulannya sebagai solusi terintegrasi yang tidak memerlukan biaya tambahan.
