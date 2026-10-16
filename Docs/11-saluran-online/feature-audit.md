# Feature Audit: Saluran Online TiloPOS

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

### 1.1 Sub-fitur: Toko Online (Online Store)

**Status: Fungsional dengan Fitur Lengkap di Backend**

**Backend (`packages/backend/src/modules/online-store/`):**

Arsitektur terdiri dari:
- `OnlineStoreController` -- 20+ endpoint covering CRUD, storefront, catalog sync, shipping, analytics, inventory, settings, fulfillment.
- `OnlineStoreService` -- business logic untuk catalog sync, analytics, inventory, settings, shipping calculation, storefront data, dan storefront order.
- `OnlineStoreSyncService` -- sinkronisasi katalog dan inventory, stock check, inventory reservation.
- Interface definitions di `interfaces/`: catalog, analytics, inventory, shipping, storefront, settings.

Fitur backend yang sudah diimplementasi:
- CRUD toko online (create, list, get by slug).
- Public storefront endpoint (tanpa auth): get storefront data, get product detail, checkout.
- Catalog sync: full sync dan selective sync dengan price override.
- Inventory sync dan stock check real-time.
- Order management: create order (dengan validasi harga server-side dan stock reserve), update status, fulfill order.
- Shipping calculation: 3 mode (distance-based zones, flat rate, free).
- Delivery zones endpoint.
- Store settings: delivery radius, min order, delivery fee, free delivery threshold, operating hours.
- Store analytics: total orders, revenue, avg order value, popular products, orders by status.
- Store inventory status: in stock, low stock, out of stock per produk/varian.
- Integrasi KDS otomatis: pesanan storefront membuat kitchen order + emit event ke KDS.

**Frontend (`packages/web/src/features/online-store/`):**

Arsitektur terdiri dari:
- `OnlineStorePage` -- halaman admin: list toko, create toko dialog.
- `StorefrontPage` -- halaman publik: browse produk, cart, checkout flow.
- 7 komponen: StorefrontHeader, ProductGrid, ProductCard, ProductDetailModal, CartPanel, CartItem, CheckoutFlow, OrderSummary, DeliveryMethodSelect, CustomerInfoForm, OrderSuccess.
- 3 hooks: useStorefront (fetch data toko), useCart (state management keranjang), useProductSelection (varian/modifier selection), useCheckout (checkout flow + submit).
- Types: storefront.types.ts.

**Kekuatan:**
- Backend sangat komprehensif -- analytics, inventory status, shipping calculation, catalog sync -- ini fitur-fitur enterprise.
- Storefront frontend modular dan well-structured (hooks + components terpisah).
- Checkout flow multi-step yang lengkap.
- Server-side price validation -- client tidak bisa manipulasi harga.
- Inventory reservation saat order mencegah oversell.
- KDS integration otomatis.
- Multi-currency support (IDR formatting).

**Kelemahan:**
- Halaman admin (`OnlineStorePage`) sangat minimal -- hanya list toko dan create dialog. Tidak ada edit, delete, settings, analytics, order management di UI.
- Tidak ada dashboard pesanan online di frontend.
- Storefront tidak bisa diakses langsung via URL yang clean (harus pakai search params `?slug=xxx`).
- Tidak ada image upload untuk toko (logo, banner).
- Payment gateway belum terintegrasi di storefront checkout.

### 1.2 Sub-fitur: Self-Order QR

**Status: Fungsional Baik dengan Fitur Lengkap**

**Backend (`packages/backend/src/modules/self-order/` + `packages/backend/src/modules/orders/services/`):**

Arsitektur terdiri dari:
- `SelfOrderController` -- endpoint lengkap: sessions, menu, items, submit, payment, i18n, translations.
- `SelfOrderPaymentService` -- payment infrastructure (calculate total, create payment, QRIS, payment status, callback).
- `SelfOrderScheduler` -- session management (extend session, cleanup expired).
- `i18n.ts` -- internationalization support (ID/EN).
- Sub-services di orders module: `self-order-session.service.ts`, `self-order-menu.service.ts`, `self-order-cart.service.ts`, `self-order-submission.service.ts`.

**Frontend (`packages/web/src/features/self-order/`):**

Arsitektur terdiri dari:
- `SelfOrderPage` -- halaman admin: workflow explanation, QR generator (placeholder), menu preview.
- `CustomerSelfOrderPage` -- halaman pelanggan: full ordering experience.
- 11 komponen: MenuHeader, MenuGrid, ProductDetailModal, CartDrawer, StickyCartFooter, OrderConfirmation, ProductLightbox, ProductRecommendations, LoadingState, SessionNotFound, OfflineIndicator, OfflineErrorAlert, SelfOrderMenu.
- 6 hooks: useSession, useMenu, useCart, useOrder, useOnlineStatus, useProductDetail.

**Kekuatan:**
- Customer-facing page sangat polished: header, search, kategori, grid, detail modal, lightbox, cart drawer, sticky footer, order confirmation.
- Offline support: online status detection, offline indicator, error handling saat offline.
- Product recommendations untuk upsell.
- Multi-bahasa support (ID/EN) termasuk endpoint i18n dan menu translations.
- Session management robust: create, validate, expire, extend.
- Payment infrastructure lengkap: QRIS, GoPay, OVO, Dana, ShopeePay.
- Auto-generate order number dan integrasi KDS.
- Clean architecture: hooks untuk logic, components untuk presentasi.

**Kelemahan:**
- QR code generator di admin page masih placeholder -- belum benar-benar generate QR.
- Admin page tidak menampilkan daftar sesi aktif.
- Tidak ada reporting pesanan self-order terpisah.
- Menu tidak mengecek stok real-time (`isAvailable` selalu true di menu endpoint).
- Tidak ada fitur modifier di customer page (backend support ada, tapi items disimpan sebagai JSON blob).

### 1.3 Backend API Coverage

**Online Store:**

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `GET /online-store/stores` | List stores | JWT | Implementasi lengkap |
| `POST /online-store/stores` | Create store | JWT | Implementasi lengkap |
| `GET /online-store/s/:slug` | Public storefront | Publik | Implementasi lengkap |
| `GET /online-store/s/:slug/orders` | Store orders | JWT | Implementasi lengkap |
| `POST /online-store/s/:slug/orders` | Create order | Publik | Implementasi lengkap |
| `PUT /online-store/orders/:id/status` | Update order status | JWT | Implementasi lengkap |
| `POST /online-store/stores/:id/sync-catalog` | Sync catalog | JWT | Implementasi lengkap |
| `POST /online-store/catalog/sync` | Selective sync | JWT | Implementasi lengkap |
| `POST /online-store/stores/:id/sync-inventory` | Sync inventory | JWT | Implementasi lengkap |
| `GET /online-store/stock-check` | Check stock | Publik | Implementasi lengkap |
| `POST /online-store/shipping/calculate` | Calculate shipping | Publik | Implementasi lengkap |
| `PUT /online-store/orders/:id/fulfill` | Fulfill order | JWT | Implementasi lengkap |
| `GET /online-store/stores/:id/analytics` | Store analytics | JWT (Owner/Manager) | Implementasi lengkap |
| `GET /online-store/stores/:id/inventory` | Store inventory | JWT (Owner/Manager/Inventory) | Implementasi lengkap |
| `PUT /online-store/stores/:id/settings` | Update settings | JWT (Owner/Manager) | Implementasi lengkap |
| `POST /online-store/stores/:id/shipping/calculate` | Store shipping | Publik | Implementasi lengkap |
| `GET /online-store/stores/:id/delivery-zones` | Delivery zones | Publik | Implementasi lengkap |
| `GET /online-store/s/:slug/storefront` | Enhanced storefront | Publik | Implementasi lengkap |
| `GET /online-store/s/:slug/products/:id` | Product detail | Publik | Implementasi lengkap |
| `POST /online-store/s/:slug/checkout` | Public checkout | Publik | Implementasi lengkap |

**Self-Order:**

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `POST /self-order/sessions` | Create session | Publik | Implementasi lengkap |
| `GET /self-order/sessions/:code` | Get session | Publik | Implementasi lengkap |
| `GET /self-order/menu` | Get menu | Publik | Implementasi lengkap |
| `GET /self-order/menu/:outletId` | Get menu with i18n | Publik | Implementasi lengkap |
| `POST /self-order/sessions/:code/items` | Add item | Publik | Implementasi lengkap |
| `POST /self-order/sessions/:code/submit` | Submit order | Publik | Implementasi lengkap |
| `GET /self-order/sessions/:code/total` | Calculate total | Publik | Implementasi lengkap |
| `POST /self-order/sessions/:code/pay` | Create payment | Publik | Implementasi lengkap |
| `POST /self-order/sessions/:code/pay/qris` | QRIS payment | Publik | Implementasi lengkap |
| `GET /self-order/sessions/:code/payment-status` | Payment status | Publik | Implementasi lengkap |
| `POST /self-order/payment/callback` | Payment webhook | Publik | Implementasi lengkap |
| `POST /self-order/menu/translations` | Set translations | Publik | Implementasi lengkap |
| `PUT /self-order/sessions/:code/extend` | Extend session | Publik | Implementasi lengkap |
| `GET /self-order/i18n/:locale` | Get translations | Publik | Implementasi lengkap |

---

## 2. Evaluasi UX

### 2.1 Online Store Admin Page

**Kekuatan:**
- Create dialog simpel dan efektif: nama, slug (auto-generated), deskripsi.
- Preview URL slug real-time di form.
- Store card informatif: nama, slug, status badge, deskripsi, tombol lihat toko.
- Loading state dan error state ditangani.
- Empty state dengan CTA yang jelas.

**Kelemahan:**
- **Sangat minimalis untuk admin** -- tidak ada halaman settings, analytics, order management, catalog sync di UI. Semua fitur canggih backend hanya bisa diakses via API.
- Tidak ada edit/delete toko.
- Tidak ada toggle aktif/nonaktif toko dari UI.
- Tidak ada upload logo/banner toko.
- Tidak ada daftar pesanan online yang bisa dikelola dari UI.
- Tidak ada inventory status view.
- Tidak ada dashboard analytics toko.

### 2.2 Storefront (Customer-Facing)

**Kekuatan:**
- **Layout profesional**: header dengan search dan cart, grid produk dengan gambar, detail modal yang informatif.
- **Checkout flow multi-step** yang terstruktur: info pelanggan --> pilih pengiriman --> review --> submit.
- **Cart panel** slide-in dari samping, tidak mengganggu browsing.
- **Product detail modal** mendukung varian dan modifier selection.
- **Order success page** informatif dengan semua detail pesanan.
- Hooks-based architecture yang clean dan maintainable.

**Kelemahan:**
- **URL routing**: storefront menggunakan search params (`?slug=xxx`) alih-alih clean URL (`/store/nama-toko`). Kurang SEO-friendly.
- **Tidak ada filter harga** atau sorting (termurah, termahal, terpopuler).
- **Tidak ada review/rating** produk.
- **Tidak ada wishlist** atau save for later.
- **Tidak ada tracking pesanan** setelah order -- pelanggan tidak bisa cek status pesanan.
- **Responsive tapi tidak mobile-first**: layout grid mungkin kurang optimal di HP (mayoritas pengguna).
- **Tidak ada PWA support** -- pelanggan tidak bisa "install" toko ke home screen.

### 2.3 Self-Order Admin Page

**Kekuatan:**
- **Workflow visual**: penjelasan 3 langkah cara kerja self-order sangat helpful untuk onboarding.
- **Menu preview**: admin bisa melihat persis apa yang akan dilihat pelanggan sebelum mengaktifkan.
- Preview menampilkan badge ketersediaan per produk.

**Kelemahan:**
- **QR generator placeholder** -- belum benar-benar generate QR code. Ini fitur utama yang belum jadi.
- Tidak ada konfigurasi apa-apa (warna tema, pesan selamat datang, dll).
- Tidak ada monitoring sesi aktif.
- Tidak ada reporting pesanan self-order.

### 2.4 Customer Self-Order Page

**Kekuatan:**
- **Sangat polished UI**: loading state, session not found, order success -- semua state ditangani.
- **Offline support** dengan indicator dan error alert -- ini kualitas production-grade.
- **Product recommendations** untuk meningkatkan average order value.
- **Sticky cart footer** -- pelanggan selalu tahu ada berapa item di keranjang tanpa perlu scroll.
- **Product lightbox** untuk zoom gambar -- detail yang menunjukkan perhatian terhadap UX.
- **Cart drawer** (slide-up) lebih baik daripada navigasi ke halaman terpisah.
- **Search dan category filter** memudahkan pelanggan menemukan item.

**Kelemahan:**
- **Tidak ada modifier UI** -- meskipun backend mendukung modifier groups, customer page tidak menampilkannya. Ini berarti pelanggan tidak bisa pilih level gula, extra topping, dll.
- **Tidak ada item notes dari UI** -- pelanggan tidak bisa menambah catatan per item ("tanpa es", "pedas level 5").
- **Tidak ada order tracking** setelah submit -- pelanggan tidak tahu apakah pesanan sedang disiapkan.
- **Tidak ada notifikasi** ketika pesanan siap.
- **Tidak ada reorder** -- pelanggan tidak bisa mengulang pesanan sebelumnya.
- **isAvailable selalu true** di menu -- tidak ada real-time stock check.

---

## 3. Analisis Kompetitif

### 3.1 GoBiz (GoFood Merchant)

- **Target**: Merchant F&B Indonesia yang jualan via GoFood.
- **Online Store**: Tidak ada toko online sendiri -- semua lewat platform GoFood.
- **Self-Order**: GoFood dine-in (scan QR untuk pesan di restoran lewat GoFood app).
- **Catalog**: Menu dikelola di dashboard GoBiz, terpisah dari POS.
- **Komisi**: 20-25% per pesanan.
- **Kekuatan**: Traffic besar (jutaan pengguna GoFood), payment via GoPay terintegrasi, delivery driver Gojek.
- **Kelemahan vs TiloPOS**: Komisi tinggi, data pelanggan milik Gojek, menu tidak sinkron dengan POS, branding terbatas.

### 3.2 GrabMerchant (GrabFood)

- **Target**: Merchant F&B Indonesia via GrabFood.
- **Online Store**: Tidak ada toko online sendiri.
- **Self-Order**: GrabFood dine-in (terbatas, belum seluas GoFood).
- **Catalog**: Menu dikelola terpisah dari POS.
- **Komisi**: 20-30% per pesanan.
- **Kekuatan**: Traffic besar (Grab ecosystem), GrabPay terintegrasi.
- **Kelemahan vs TiloPOS**: Sama dengan GoBiz -- komisi tinggi, data milik Grab, tidak sinkron POS.

### 3.3 Shopee Food

- **Target**: Merchant F&B Indonesia via Shopee Food.
- **Online Store**: Shopee Food page (bukan toko sendiri).
- **Self-Order**: Tidak ada.
- **Komisi**: 15-25% per pesanan.
- **Kekuatan**: Ecosystem Shopee yang besar, ShopeePay terintegrasi.
- **Kelemahan vs TiloPOS**: Komisi, data milik Shopee, tidak sinkron POS, tidak ada self-order.

### 3.4 Square Online (AS)

- **Online Store**:
  - Website builder built-in dengan template profesional.
  - Sinkronisasi produk langsung dari Square POS.
  - SEO optimization, custom domain, social media integration.
  - Order tracking untuk pelanggan.
  - Curbside pickup, delivery, shipping.
  - Payment terintegrasi (Square Payment).
  - Analytics dan marketing tools.
- **Self-Order**: Square untuk Restaurants punya QR ordering.
- **Best-in-class**: Website builder, SEO, analytics, payment integration.

### 3.5 Toast Online Ordering (AS)

- **Online Store**:
  - Branded online ordering page terintegrasi dengan Toast POS.
  - Menu sinkron otomatis.
  - Customer login dan order history.
  - Real-time menu availability (86'd items).
  - Multi-location support.
  - Toast delivery services atau self-delivery.
  - Loyalty integration.
- **Self-Order**: Toast Order & Pay (scan QR, order + pay from phone).
- **Best-in-class**: Real-time menu sync, order + pay in one flow, loyalty integration.

### Ringkasan Perbandingan

| Fitur | TiloPOS | GoBiz | GrabMerchant | Square Online | Toast Online |
|-------|---------|-------|-------------|---------------|--------------|
| Toko online sendiri | Ada | Tidak | Tidak | Ada (website builder) | Ada |
| Komisi per pesanan | 0% | 20-25% | 20-30% | 2.9% (payment only) | Commission-based |
| Sync dengan POS | Otomatis | Manual | Manual | Otomatis | Otomatis |
| Self-order QR | Ada | Ada (via GoFood app) | Terbatas | Ada | Ada + Pay |
| Offline support | Ada | Tidak | Tidak | Tidak | Tidak |
| Multi-bahasa | Ada (ID/EN) | ID only | ID only | Multi-language | EN primarily |
| Customer order tracking | Belum | Ada (di app) | Ada (di app) | Ada | Ada |
| Payment integration | Infrastructure ready | GoPay | GrabPay | Square Payment | Toast Payment |
| Custom domain | Belum | Tidak | Tidak | Ada | Ada |
| SEO optimization | Belum | N/A | N/A | Ada | Terbatas |
| Analytics | Backend ready | Ada | Ada | Ada | Ada |
| Real-time stock | Backend ready | Ada | Ada | Ada | Ada |
| Customer account | Belum | Ya (Gojek acc) | Ya (Grab acc) | Ya | Ya |
| Delivery management | Belum | Driver Gojek | Driver Grab | Bervariasi | Toast Delivery |

**Insight kunci**: TiloPOS memiliki keunggulan 0% komisi dan sinkronisasi POS otomatis yang tidak dimiliki marketplace Indonesia. Namun, marketplace memiliki keunggulan traffic besar dan delivery infrastructure. Solusi ideal: TiloPOS sebagai channel utama (0% komisi, full data ownership) + integrasi marketplace sebagai channel tambahan.

---

## 4. Best Practice Industri

### 4.1 Dari Square Online

- **Website builder**: WYSIWYG editor untuk customize tampilan toko online tanpa coding.
- **Custom domain**: `www.tokosaya.com` alih-alih subdomain atau slug.
- **SEO optimization**: meta title, description, Open Graph tags untuk share ke social media.
- **Social selling**: link langsung ke produk yang bisa di-share ke Instagram/WhatsApp.
- **Customer accounts**: pelanggan bisa login, lihat order history, reorder.
- **Abandoned cart recovery**: kirim email ke pelanggan yang meninggalkan keranjang.

### 4.2 Dari Toast Online Ordering

- **Real-time menu availability**: jika item habis di kitchen, otomatis hilang dari menu online (86'd items).
- **Order throttling**: saat dapur overload, sistem bisa memperlambat atau menutup sementara pemesanan online.
- **Delivery time estimation**: estimasi waktu pengiriman berdasarkan volume pesanan saat ini.
- **Customer notification**: SMS/email saat status pesanan berubah (confirmed, preparing, ready, out for delivery).
- **Loyalty integration**: pelanggan yang pesan online tetap bisa collect loyalty points.

### 4.3 Dari QR Ordering Best Practices

- **QR generation yang proper**: QR code dengan logo brand di tengah, custom colors, error correction level H.
- **Menu real-time**: ketersediaan produk diupdate real-time berdasarkan stok dan input dapur.
- **Order + Pay in one flow**: pelanggan bisa langsung bayar dari HP tanpa perlu ke kasir.
- **Modifier support**: pelanggan harus bisa pilih modifier (level gula, size, extra topping) -- ini basic requirement untuk F&B.
- **Item notes**: setiap item harus bisa diberi catatan (misalnya: "tanpa bawang").
- **Order status tracking**: setelah submit, pelanggan bisa lihat status: "Pesanan diterima" --> "Sedang disiapkan" --> "Siap disajikan".

---

## 5. Gap Analysis

### 5.1 Gap Kritis (Harus Segera Ditangani)

| Gap | Sub-modul | Detail | Impact |
|-----|-----------|--------|--------|
| QR code generator belum jadi | Self-Order | Halaman admin hanya placeholder | Fitur utama self-order tidak bisa digunakan tanpa QR |
| Modifier tidak ada di customer page | Self-Order | Backend support ada, frontend tidak render | Pelanggan tidak bisa customize pesanan (gula, topping) |
| Admin page toko online sangat minimal | Online Store | Hanya list + create. Tidak ada edit, settings, orders, analytics | Admin tidak bisa kelola toko dari UI |
| isAvailable selalu true | Self-Order | Menu tidak cek stok real-time | Pelanggan bisa pesan item yang stoknya habis |

### 5.2 Gap Penting (Prioritas Tinggi)

| Gap | Sub-modul | Detail | Impact |
|-----|-----------|--------|--------|
| Tidak ada order management di UI | Online Store | Pesanan hanya bisa dikelola via API | Operasional online store tidak bisa berjalan dari dashboard |
| Tidak ada item notes di self-order | Self-Order | Pelanggan tidak bisa tulis catatan per item | "Tanpa es", "level pedas 5" tidak bisa disampaikan |
| Tidak ada order tracking | Keduanya | Pelanggan tidak bisa cek status pesanan setelah submit | Customer experience buruk, banyak pertanyaan "pesanan saya sudah dimana?" |
| Payment gateway belum terintegrasi | Keduanya | Infrastructure ready tapi belum connect ke payment provider | Tidak bisa terima pembayaran online langsung |
| Storefront URL tidak clean | Online Store | Menggunakan search params, bukan clean URL | Kurang profesional dan SEO-unfriendly |

### 5.3 Gap Nice-to-Have (Prioritas Menengah)

| Gap | Sub-modul | Detail |
|-----|-----------|--------|
| Tidak ada customer account/login | Online Store | Pelanggan tidak bisa lihat order history |
| Tidak ada custom domain | Online Store | Harus pakai slug-based URL |
| Tidak ada SEO optimization | Online Store | Tidak ada meta tags, Open Graph |
| Tidak ada delivery management | Online Store | Tidak ada driver tracking/management |
| Tidak ada order throttling | Keduanya | Tidak bisa limit pesanan saat dapur overload |
| Tidak ada PWA support | Self-Order | Pelanggan tidak bisa "install" menu ke home screen |
| Tidak ada abandoned cart recovery | Online Store | Tidak ada follow-up untuk keranjang ditinggal |
| Tidak ada loyalty integration | Keduanya | Pesanan online tidak collect loyalty points |

---

## 6. Rekomendasi Perbaikan Teratas

### Prioritas 1: QR Code Generator yang Fungsional

**Effort: Medium | Impact: Critical**

Implementasikan QR code generator yang sebenarnya di halaman Self-Order admin:
1. Fetch daftar meja dari API tables.
2. Untuk setiap meja, generate QR code menggunakan library seperti `qrcode.react` atau `qrcode`.
3. QR code mengarah ke URL: `{base_url}/order/{sessionCode}`.
4. Tampilkan QR codes dalam grid, dengan tombol download/cetak per meja atau batch print semua.
5. Bonus: custom QR dengan logo bisnis di tengah.

### Prioritas 2: Modifier Support di Customer Self-Order Page

**Effort: Medium | Impact: Critical**

Backend sudah menyediakan modifier groups di menu endpoint. Frontend perlu:
1. Render modifier groups di ProductDetailModal.
2. UI: radio buttons (untuk single selection) atau checkboxes (untuk multi selection).
3. Harga modifier ditampilkan dan ditambahkan ke total.
4. Modifier selection disertakan saat add item to session.
5. Tambahkan juga field notes per item.

### Prioritas 3: Online Store Admin Dashboard

**Effort: High | Impact: High**

Buat halaman admin yang lebih lengkap:
1. **Store settings page**: edit nama, deskripsi, toggle aktif, pengaturan delivery/pickup, shipping mode.
2. **Orders page**: daftar pesanan online dengan filter status, detail pesanan, tombol update status dan fulfill.
3. **Analytics dashboard**: total pesanan, revenue, chart, popular products (data dari backend yang sudah ada).
4. **Inventory view**: status stok produk di toko online.
5. **Catalog management**: pilih produk mana yang ditampilkan di toko online.

### Prioritas 4: Order Tracking untuk Pelanggan

**Effort: Medium | Impact: High**

Setelah pelanggan submit pesanan (baik dari storefront maupun self-order):
1. Tampilkan nomor pesanan dan link tracking.
2. Halaman tracking menampilkan status pesanan secara real-time (pending --> confirmed --> preparing --> ready --> delivered).
3. Bisa menggunakan polling (GET status setiap 30 detik) atau WebSocket.
4. Untuk self-order dine-in: tampilkan notifikasi "Pesanan Anda sedang disiapkan" dan "Pesanan Anda siap".

### Prioritas 5: Real-Time Stock Check di Self-Order Menu

**Effort: Low | Impact: Medium**

Di endpoint `GET /self-order/menu`, tambahkan stock check:
1. Query stock levels untuk setiap produk.
2. Set `isAvailable: false` jika stok habis (saat ini selalu true).
3. Di frontend, produk yang tidak tersedia ditampilkan dengan badge "Habis" dan tombol "Add to Cart" di-disable.

### Prioritas 6: Clean URL untuk Storefront

**Effort: Low | Impact: Medium**

Ubah routing storefront dari search params (`?slug=xxx`) ke path params (`/store/:slug`). Ini memerlukan perubahan di route definition dan komponen StorefrontPage.

---

## 7. Roadmap

### Fase 1: Critical Functionality (1-2 Minggu)

- QR code generator fungsional di halaman self-order admin.
- Modifier groups di customer self-order page (ProductDetailModal).
- Item notes field di customer self-order page.
- Real-time stock check di self-order menu endpoint.
- Clean URL routing untuk storefront.

### Fase 2: Admin Dashboard (2-4 Minggu)

- Online store admin: store settings page (edit toko, toggle aktif, pengaturan delivery).
- Online store admin: orders management page (list, detail, update status, fulfill).
- Online store admin: analytics dashboard (chart, metrics dari backend yang sudah ada).
- Online store admin: catalog management (pilih produk untuk toko online, price override).
- Self-order admin: daftar sesi aktif, statistik pesanan hari ini.

### Fase 3: Customer Experience (4-6 Minggu)

- Order tracking page untuk pelanggan (storefront + self-order).
- Real-time status updates via polling atau WebSocket.
- Notifikasi pesanan siap (untuk self-order dine-in).
- Order history page di storefront (tanpa login, via phone number lookup).
- Product sorting dan filter (harga, popularitas) di storefront.

### Fase 4: Payment Integration (6-8 Minggu)

- Integrasi payment gateway (Midtrans/Xendit) untuk storefront checkout.
- QRIS payment flow lengkap di self-order (display QR, wait for confirmation).
- E-wallet payment (GoPay, OVO, Dana, ShopeePay) di self-order.
- Payment confirmation dan receipt generation.

### Fase 5: Growth Features (8-12 Minggu)

- Custom domain support untuk toko online.
- SEO optimization: meta tags, Open Graph, sitemap.
- Customer accounts dan login (order history, saved addresses, reorder).
- Social sharing: link produk yang bisa di-share ke WhatsApp/Instagram.
- PWA support untuk self-order (installable, service worker caching).
- Batch QR code print dengan branding custom.
- Order throttling saat dapur overload.
- Abandoned cart notifications (jika customer account aktif).

### Fase 6: Marketplace Integration (12-16 Minggu)

- Integrasi GoBiz API: sync menu, terima pesanan GoFood langsung ke dashboard TiloPOS.
- Integrasi GrabMerchant API: sync menu dan pesanan GrabFood.
- Konsolidasi pesanan dari semua channel (toko online + self-order + GoFood + GrabFood) ke satu dashboard.
- Analytics lintas channel: perbandingan revenue per channel, biaya komisi, margin per channel.
- Unified inventory management: stok otomatis dikurangi dari semua channel saat ada pesanan.
