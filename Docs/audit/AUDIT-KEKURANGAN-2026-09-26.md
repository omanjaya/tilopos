# Audit Kekurangan TiloPOS

**Tanggal audit:** 26 September 2026
**Commit:** `b709056` (feat: add subscription page, stock opname, bug fixes, and system improvements)
**Cakupan:** backend (NestJS + Prisma), web (React + Vite), infra (Docker, k8s, CI), dokumentasi.
**Metode:** baca kode langsung, ditambah build, lint dan test lokal. Tidak ada kode yang diubah.

Semua path backend relatif ke `packages/backend/src/`, path web relatif ke `packages/web/src/`, kecuali disebut lain.

---

## Ringkasan

| Area | Kondisi | Masalah terbesar |
|---|---|---|
| Keamanan backend | 🔴 Buruk | Token MFA dan token verifikasi email diterima sebagai access token penuh, sehingga MFA bisa dilewati dan data lintas tenant bisa bocor. Kasir juga bisa menentukan harga jual sendiri. |
| Integritas data | 🔴 Buruk | Cron settlement jalan dua kali, refund bisa terjadi ganda, checkout online store bisa menerima qty negatif, dan tabel `transfer_templates` tidak punya migrasi. |
| Fitur | 🟠 Banyak stub | GoFood, GrabFood, ShopeeFood, endpoint integrasi, push notification dan QRIS/VA masih mock. Progress tracker menyebutnya "Done". |
| Offline POS (web) | 🔴 Tidak berfungsi | Ada 4 bug independen; penjualan offline tidak pernah sampai ke server. |
| Test | 🟠 Lemah | Hanya 6 dari 40 modul backend yang punya test, dan test di CI dimatikan (`if: false`). |
| Infra / deploy | 🔴 Tidak bisa jalan | Manifest k8s tidak bisa di-deploy apa adanya (env salah, path probe salah, resource hilang). `docker:dev` dari README juga gagal. |
| Dokumentasi | 🟡 Usang | Ada dua folder `Docs/` dan `docs/`, kredensial default di README salah, lisensi tidak konsisten. |

### Hasil build dan test lokal

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` (backend) | ✅ 0 error |
| `npm run lint` (backend & web) | ✅ lolos. Catatan: lint backend memakai `--fix`, jadi tidak pernah gagal karena masalah yang bisa di-autofix. |
| `jest` (backend) | ✅ 51 suite, 592 test lulus |
| `tsc -b` (web), yang juga dijalankan oleh `npm run build:web` | ❌ **2 error**, jadi build web gagal (lihat W-0) |
| `vitest run` (web) | ⚠️ 148 unit test lulus, tapi 18 file **gagal** karena vitest ikut menjalankan spec Playwright di `e2e/` |

---

## Prioritas Perbaikan

Urutan yang disarankan:

1. **Segera (P0, keamanan & uang):** S-C1, S-C2, S-C3, S-H1, S-H2, S-H4, Q-1, Q-5, W-0.
2. **Sebelum produksi (P0/P1):** W-1 sampai W-3, S-H3, S-H6, S-H7, Q-2 sampai Q-4, I-1 sampai I-6, dan mengaktifkan kembali test di CI.
3. **Jangka menengah (P1/P2):** validasi DTO, index DB, pagination, refresh token, layering arsitektur, backup, i18n, a11y.

---

## 1. Keamanan Backend

### 🔴 Critical

**S-C1. MFA bisa dilewati.** Token MFA sementara (`purpose: 'mfa_verification'`) ditandatangani dengan secret yang sama dengan access token dan berisi `sub`, `businessId` dan `role`. `infrastructure/auth/jwt.strategy.ts:30` tidak memeriksa `purpose`, jadi token ini diterima di semua endpoint selama 5 menit. Hal yang sama berlaku di gateway WebSocket (`kds.gateway.ts`, `notifications.gateway.ts`) dan `BusinessScopeGuard`. Akibatnya, cukup PIN yang benar untuk login penuh tanpa TOTP.
- Lokasi: `application/use-cases/auth/login.use-case.ts:77-85`, `modules/auth/auth.service.ts:160-169`
- Perbaikan: gunakan secret atau `audience` terpisah untuk token ber-`purpose`. Di `validate()`, tolak payload yang punya `purpose` dan wajibkan `businessId` serta `role`.

**S-C2. Token verifikasi email bisa dipakai membaca data semua tenant.** `auth.service.ts:262-267` menandatangani `{sub, purpose:'email_verification'}` (berlaku 24 jam) dengan JWT secret. Registrasi terbuka untuk umum, jadi siapa pun bisa mendapat token ini. Jika dipakai sebagai Bearer token, `jwt.strategy.ts` menerimanya dengan `businessId: undefined`. Prisma **mengabaikan** filter yang bernilai `undefined`, sehingga `where: { businessId: user.businessId }` mengembalikan data semua tenant. Pemeriksaan `verifyOutletAccess` juga lolos untuk outlet milik siapa pun.
- Perbaikan: sama seperti S-C1. Tambahkan juga middleware Prisma yang melempar error bila filter tenant bernilai `undefined`.

**S-C3. Harga dan diskon POS dikirim dari client tanpa otorisasi.** Di `application/use-cases/pos/create-transaction.use-case.ts`:
- `item.unitPrice ?? baseUnitPrice` (baris 206) dan harga bundle (baris 126) menerima harga apa pun ≥ 0. DTO menyebut fitur ini membutuhkan `pos_price_editing`, tapi tidak ada pengecekan di kode.
- Diskon `fixed`/`percentage` sampai 100% boleh dipakai role CASHIER.
- `promotionId` dan `voucherCode` tidak divalidasi, hanya menaikkan counter pemakaian, dan update promosi tidak discope ke tenant.
- `credit_note` diterima sebagai metode bayar tanpa cek saldo.
- Akibatnya kasir bisa mencatat penjualan Rp 0 atau diskon 100%.
- Perbaikan: selalu pakai harga dari server. Izinkan override hanya jika fitur aktif dan role berwenang. Hitung diskon dari promosi/voucher yang divalidasi di server, dan validasi saldo credit note.

### 🟠 High

**S-H1. Referensi lintas tenant di alur POS dan order.**
- `create-transaction.use-case.ts` mengambil product (baris 168), bundle (107), variant (180, tanpa cek ke product), modifier (195), shift (79) dan `customerId` hanya berdasarkan id, tanpa scope `businessId`. Poin loyalty juga dikreditkan ke customer tenant lain.
- `pos.controller.ts:66`: owner atau super_admin tanpa `outletId` di token bisa mengirim `outletId` milik bisnis lain.
- `modules/orders/orders.controller.ts:45-69` dan `create-order.use-case.ts:46`: `POST /orders` menerima `outletId` dari body tanpa cek kepemilikan, jadi siapa pun bisa menyuntikkan order ke KDS tenant lain.

**S-H2. Modul tanpa scope tenant (IDOR).** Pengguna yang login bisa membaca atau mengubah data tenant lain lewat ID:
- `modules/unit-conversion/*`: semua CRUD berdasarkan id saja.
- `modules/batch-tracking/batch-tracking.controller.ts:27-92`: semua route, termasuk `POST deduct` dan `DELETE :id`.
- `modules/settlements/settlements.controller.ts`: `POST /` (406) menerima `outletId` apa pun, `settle`/`dispute` (443-515) mencari berdasarkan id saja, dan `GET reconciliation?outletId=` (173) bisa membaca transaksi tenant lain.
- `modules/online-store/online-store.controller.ts:253` meneruskan `outletId`/`storeId` ke `online-store-sync.service.ts:234` tanpa cek kepemilikan.

**S-H3. Checkout storefront publik bisa disalahgunakan.**
- `online-store.controller.ts:96-190` (`POST s/:slug/orders`):
  - body berupa tipe inline, jadi tidak divalidasi;
  - `shippingCost` ditentukan client dan bisa negatif;
  - hasil `reserveInventory` diabaikan;
  - `store.isActive` tidak dicek.
- `online-store.service.ts:760-930` (`POST s/:slug/checkout`):
  - `quantity` negatif menghasilkan total negatif dan justru **menambah stok** (`decrement` negatif di baris 895);
  - stok dicek di semua outlet tapi dikurangi dari outlet pertama;
  - tidak dijalankan dalam `$transaction`.

**S-H4. `FeatureGuard` global berjalan sebelum `JwtAuthGuard` dan mempercayai `?businessId=`.** Karena `request.user` belum ada saat guard ini jalan, `common/guards/feature.guard.ts:105-121` memakai `businessId` dari params atau query. Siapa pun bisa memasukkan ID tenant dengan paket lebih tinggi untuk melewati `@RequireFeature`, sehingga paywall subscription tidak berlaku.
- Perbaikan: jadikan JWT guard sebagai `APP_GUARD` pertama (dengan opsi `@Public()`), dan ambil `businessId` hanya dari `request.user`.

**S-H5. Sekitar 90 endpoint tidak tervalidasi.** `@Body()` bertipe inline, interface atau `Record<string, unknown>` dilewati oleh `ValidationPipe`. Contohnya di `orders`, `self-order`, `settlements`, `settings` (sekitar 11 endpoint), `tables`, `promotions`, `customers`, `loyalty`, `stock-transfers`, `serial-numbers`, `work-orders` dan `integrations`. Ganti dengan class DTO dan tambahkan lint rule yang melarang body inline.

**S-H6. Refund ganda.** `application/use-cases/pos/process-refund.use-case.ts:42-146` membaca qty yang sudah direfund di luar `$transaction` tanpa row lock. Dua refund bersamaan sama-sama lolos. Perbaikan: baca di dalam transaksi dengan `SELECT … FOR UPDATE`.

**S-H7. Self-order membuka jalur injeksi order tanpa autentikasi** (`modules/self-order/self-order.controller.ts`):
- sesi bisa dibuat untuk `outletId` mana pun, dan `tableId` tidak dicek terhadap outlet;
- `addItem` mengambil product tanpa cek tenant;
- `submitSession` mengirim ke KDS sebelum pembayaran, dan pemeriksaannya tidak atomik sehingga submit ganda menghasilkan order ganda;
- kode sesi (`Date.now()` base36 + `Math.random`) bisa ditebak.

**S-H8. Token tidak bisa dicabut dan berumur panjang.** Tidak ada refresh token maupun revocation. `JWT_EXPIRES_IN` default `7d` (`.env.example`, `docker-compose.yml:26`). `jwt.strategy.ts` tidak mengecek ulang `employee.isActive` atau role, jadi karyawan yang dinonaktifkan tetap punya akses sampai 7 hari.

### 🟡 Medium

- **S-M1. Brute force PIN.** Rate limit hanya 5 per menit per IP, tanpa lockout per akun. `trust proxy` tidak diset, sehingga di belakang proxy semua klien berbagi satu IP (ini juga membuka peluang DoS login). `POST /auth/mfa/verify` tidak punya throttle khusus.
- **S-M2. `RolesGuard` tidak ada di route sensitif.** Kasir bisa toggle fitur outlet (`outlet-feature.controller.ts:110,144`), mengubah price tier, membuat atau menghapus meja, dan mengubah order. Integrations, appointments dan serial-numbers juga tidak punya pengecekan role.
- **S-M3. Webhook pembayaran tidak memeriksa nominal.** Xendit dan Midtrans tidak membandingkan `amount` dengan pembayaran yang tersimpan. Callback self-order meng-HMAC `JSON.stringify(body)` (rapuh) tanpa proteksi replay.
- **S-M4. Race condition stok online store.** `online-store-sync.service.ts:359-397` membaca lalu `updateMany` tanpa `FOR UPDATE`, sehingga stok bisa negatif.
- **S-M5. Upload CSV/Excel tanpa batas ukuran.** Lihat `customers.controller.ts:178,202` dan `inventory.controller.ts:402,425` (risiko DoS memori).
- **S-M6. Secret MFA disimpan plaintext**, dan `setup` menimpa secret meskipun MFA sudah aktif.

### ⚪ Low

- Perhitungan uang memakai JS `Number` padahal skemanya `Decimal`. Sebaiknya pakai `Prisma.Decimal` atau rupiah integer.
- Kekuatan `JWT_SECRET` tidak dicek (placeholder `your-jwt-secret-change-this` tetap diterima).
- CORS WebSocket memakai string `CORS_ORIGIN` mentah, sehingga daftar yang dipisah koma tidak dipecah.
- Nomor order dan struk memakai `Math.random`, jadi bisa bentrok.
- `GET /self-order/sessions/:code` mengembalikan row product lengkap (termasuk cost) ke publik.

### ✅ Yang sudah baik

- Helmet dan CSP aktif, dan CORS menolak `*`.
- Swagger dimatikan di produksi.
- Tidak ada `$queryRawUnsafe`.
- Guard webhook timing-safe dan fail-closed.
- Upload gambar memvalidasi magic bytes dan melakukan re-encode.
- Login memakai dummy bcrypt untuk mencegah enumerasi user.
- Pengurangan stok di POS sudah memakai `FOR UPDATE`.

---

## 2. Kualitas Backend, Fitur & Data

### 🔴 Bug P0

| # | Temuan | Lokasi | Perbaikan |
|---|---|---|---|
| Q-1 | **Dua cron settlement tengah malam** terdaftar di modul yang sama, sehingga settlement bisa dobel. | `infrastructure/services/settlement-scheduler.service.ts:16`, `modules/settlements/settlements.service.ts:89` | Hapus salah satu, dan tambahkan unique key `(outletId, settlementDate, method)`. |
| Q-2 | **Polling marketplace tidak pernah cocok ke outlet.** Key `${outletId}-${platform}` dipecah dengan `split('-')[0]`, padahal UUID mengandung `-`. Kredensial juga disimpan di `Map` in-memory, jadi hilang saat restart. | `infrastructure/services/marketplace/marketplace.service.ts:37,68,230,245` | Simpan kredensial terenkripsi di DB. |
| Q-3 | **Tabel `transfer_templates` hanya ada sebagai file SQL lepas**, tidak ada di `schema.prisma` maupun folder migrasi. Alias tabel `do` juga *reserved word* di PostgreSQL. | `prisma/migrations/add_transfer_templates.sql`, `modules/stock-transfers/transfer-templates.service.ts:95-110` | Tambahkan model Prisma dan buat migrasi resmi. |
| Q-4 | **Pengurangan stok bahan baku berupa read-modify-write di luar transaksi**, dan diam-diam di-clamp ke 0. Kegagalan hanya di-log. | `infrastructure/events/transaction-event.listener.ts:57-100` | Gunakan `decrement` atomik di dalam `$transaction`, plus retry queue. |
| Q-5 | **Pembayaran mock di jalur produksi.** Self-order dan online store mengembalikan QRIS palsu atau nomor VA acak. `PaymentGatewayFactory` jatuh ke mock yang selalu sukses bila key tidak ada, termasuk di produksi. | `orders/services/self-order-submission.service.ts:131`, `orders/services/online-store-order.service.ts:137-148`, `payment-gateway.factory.ts:56-69` | Gagal saat boot di produksi bila key tidak ada, dan arahkan ke `PaymentGatewayService`. |

### 🟠 Fitur stub / belum selesai

| Area | Status | Bukti |
|---|---|---|
| GoFood / GrabFood / ShopeeFood | Semua panggilan melempar `NotImplementedException` | `marketplace/gofood.gateway.ts:167`, `grabfood.gateway.ts:138`, `shopeefood.gateway.ts:163` |
| Integrations controller | 16 endpoint mengembalikan respons hardcoded `(stub)` | `modules/integrations/integrations.controller.ts:23-215` |
| Midtrans VA | Mengembalikan placeholder `VA-BCA-<timestamp>` | `payment/midtrans-gateway.ts:327-335` |
| Xendit retail status | Belum diimplementasi | `payment/xendit/services/retail.service.ts:94` |
| Push notification | Selalu mock | `notifications/push/push.service.ts:15` |
| Email / WhatsApp | Hanya log (tidak mengirim) bila config kosong | `email.service.ts:55`, `whatsapp.service.ts:23` |
| Google OAuth | Placeholder | `auth/strategies/google.strategy.ts` |
| CDN purge | Stub | `cdn/cdn.config.ts:99-134` |
| Promosi | Filter segmen customer dilewati (promo berlaku untuk semua), filter kategori tidak pernah cocok | `application/services/promotion-rules.engine.ts:155,173` |
| RabbitMQ handlers | 8 handler placeholder | `messaging/queues/*-queue.handler.ts` |
| Saga orchestrator, `DeductIngredientsOnSaleUseCase` | Kode mati | `infrastructure/events/sagas/`, `ingredients.module.ts:48` |
| E-Faktur, cetak ESC/POS di server | Tidak ada | — |

> ⚠️ `Docs/progress/01-progress-tracker.md` (baris 468-470, 1382-1384) menandai integrasi GoFood, GrabFood dan ShopeeFood sebagai **"Done, full API integration"**. Ini **tidak benar**.

### 🟠 Test

- 51 file spec. Hanya **6 dari 40 modul** yang punya test.
- Modul tanpa test antara lain: `payments`, `pos`, `settlements`, `promotions`, `loyalty`, `self-order`, `online-store`, `credit`, `kds`, `reports`, `stock-transfers`, `stock-opname`, `employees` dan `integrations`.
- 15 suite integrasi di `test/integration/` saling bergantung pada urutan eksekusi.
- **Test di CI dimatikan:** `.github/workflows/ci.yml:24` berisi `if: false`. Tidak ada `coverageThreshold`.
- Prioritas test: `create-transaction`, refund/void, settlements, webhook pembayaran, promotion rules.

### 🟡 Skema Prisma

- **Kode unik lintas tenant:** `Voucher.code`, `poNumber`, `transferNumber` dan `opnameNumber` unik global, sehingga satu tenant bisa memblokir kode voucher tenant lain. Ganti dengan `@@unique([businessId, code])`.
- **Nomor opname** = `count+1` global dengan tanggal UTC, dan memakai prefix `SO-` yang bentrok dengan self-order (`create-stock-opname.use-case.ts:19-24`).
- **Index foreign key hilang:** `Transaction.customerId/shiftId/employeeId`, `Voucher.businessId`, `Appointment.businessId`, `StoreOrder.outletId`, `TransactionItem.productId`, `StockLevel.productId`, `AuditLog.entityId`, dll.
- **`onDelete`:** 105 dari 144 relasi tidak eksplisit (default Restrict), sehingga menghapus outlet atau bisnis gagal tanpa pola yang jelas.
- **Soft delete tidak konsisten:** tidak ada `deletedAt`, 21 model memakai `isActive`, product masih di-hard delete. 34 model tidak punya `updatedAt` (termasuk `Payment`, `Shift`, `Subscription`).
- ✅ Uang sudah memakai `Decimal(15,2)`.

### 🟡 Arsitektur & performa

- **Layering:** 39 dari 63 controller langsung inject `PrismaService` (mundur dari 16 yang tercatat di `REFACTORING-PROGRESS-2026-02.md`). 45 dari 70 use case memakai Prisma langsung. Logika bisnis transfer stok ada di controller (`stock-transfers.controller.ts:225-363`).
- **Error handling:** 487 `throw new *Exception` bawaan Nest vs 121 `AppError` (klaim "tinggal 3 file" di dokumen refactoring tidak benar). Ada 23 `catch {}` kosong.
- **File besar:** 24 file > 500 baris, misalnya `analytics.service.ts` (1361), `prisma-settings.repository.ts` (1066), `online-store.service.ts` (946), `suppliers.service.ts` (906).
- **N+1:** `owner-analytics.controller.ts:276`, `financial-command.controller.ts:253`, `transaction-event.listener.ts:68,78`, `void-transaction.use-case.ts:72,118`, `process-refund.use-case.ts:217`, `stock-transfers.controller.ts`, `online-store-sync.service.ts`.
- **Pagination:** 278 dari 299 `findMany` tanpa `take`. Hanya 2 controller yang menerima page/limit.
- **Zona waktu:** batas hari memakai waktu server (`setHours(0,0,0,0)`), dan `TZ=Asia/Jakarta` tidak diset di Docker, sehingga laporan "hari ini" bisa salah.
- ✅ Type safety baik: hanya 2 `any`.

### 🟡 Operasional

- Validasi env hanya untuk 3 variabel (`main.ts:11-35`). Tidak ada `validationSchema`.
- Health check tidak mencakup Redis, padahal BullMQ dan cache bergantung padanya.
- 11 `@Cron` tanpa distributed lock, sehingga berjalan di setiap replika.
- Tidak ada `enableShutdownHooks()`.
- Upload disimpan di disk lokal (tidak cocok untuk multi-instance).
- Swagger: 304 dari 520 route punya `@ApiOperation`, 0 `@ApiResponse`.

---

## 3. Frontend Web

### 🔴 Critical

**W-0. Build web gagal (`tsc -b`, 2 error).**
- `features/inventory/components/transfer-template-form-modal.tsx:185`: field `itemName` tidak cocok dengan `productName` di `TransferTemplateData`.
- `features/inventory/transfer-detail-page.tsx:239`: array discrepancy bisa berisi `null`.

Selain itu, `vitest` ikut menjalankan spec Playwright di `e2e/`. Tambahkan `test.exclude: ['e2e/**']` di config Vitest.

**W-1. Offline POS tidak berfungsi end-to-end** (terlihat selesai, tapi rusak di 4 titik):
1. `features/pos/hooks/use-pos-transaction.ts:102` memanggil `GET /employees/shifts/current` **sebelum** cek offline. Saat offline, kasir mendapat "Tidak Ada Shift Aktif" dan antrean offline tidak pernah tercapai.
2. `services/sync/sync-engine.service.ts:54-56` tidak mengirim `getAuthToken`, sehingga sync mendapat 401.
3. URL sync salah: `/api/transactions` (`sync.constants.ts:14`) dan `/api/v1/transactions` (`use-offline-pos.ts:221`). Endpoint yang benar adalah `/api/v1/pos/transactions`.
4. Payload menyertakan `id`/`createdAt`, yang ditolak `forbidNonWhitelisted`. Tidak ada idempotency key, sehingga retry bisa menggandakan penjualan.

Selain itu, penjualan offline tidak mencetak struk, konflik 409 memakai strategi "server-wins" yang membuang penjualan lokal, dan tidak ada test untuk sync.

**W-2. Logout menghapus penjualan yang belum tersinkron.** `stores/auth.store.ts:33-38` menghapus antrean localStorage, tapi menghapus DB IndexedDB bernama `tilopos-sync`, padahal yang dipakai adalah `tilopos-offline`. Setiap 401 memicu `logout()`, jadi sesi yang kedaluwarsa diam-diam menghapus penjualan yang tertunda.

**W-3. Service worker meng-cache data API privat.** `public/sw.js:60-63` meng-cache semua GET `/api/*` dengan key URL saja, tanpa pernah dihapus. Di kasir bersama, user berikutnya bisa melihat data tenant sebelumnya.

### 🟠 High

- **W-4. JWT disimpan di `localStorage`** (rentan XSS). Tidak ada refresh token, dan logout tidak mencabut token di server.
- **W-5. Interceptor 401 salah sasaran.** `api/client.ts:30-44` menganggap PIN yang salah saat login sebagai "Sesi berakhir" lalu redirect. `AuthGuard` memanggil `logout()` saat render (`features/auth/auth-guard.tsx:14-16`).
- **W-6. Route guard tipis.** `RoleGuard` hanya ada di beberapa route. Kasir bisa membuka `products/new`, `import`, `settlements`, `reports`, `transactions`, `promotions/vouchers` dan `credit-sales`.
- **W-7. Cetak struk hanya lewat `window.print()`.** Tombol "Test print" palsu: selalu sukses setelah 1,5 detik (`features/settings/printer-settings-page.tsx:192-201`). `services/printer.service.ts` (ESC/POS) dan `hardware.service.ts` tidak dipakai di mana pun, dan cash drawer tidak ditrigger.
- **W-8. Bundle besar.** `manualChunks` memasukkan semua `node_modules` ke satu chunk `vendor` (termasuk exceljs, framer-motion, shepherd, socket.io). Halaman landing, pricing, login dan self-order di-import eager. `jspdf` di-import statis.

### 🟡 Medium

- **PWA tidak bisa di-install:** ikon hanya `vite.svg`, `start_url` mengarah ke landing, dan cache SW tetap `v1` sehingga tidak pernah diperbarui.
- **Error ditampilkan sebagai list kosong:** hanya 14 dari 114 file `useQuery` yang menangani error. Beberapa wrapper API menelan error dan mengembalikan `[]`. Tidak ada error reporting, dan tidak ada auto-reload saat chunk gagal dimuat.
- **Endpoint yang tidak ada di backend:** `POST /customers/segments`, `DELETE /customers/segments/:id`, `GET /customers/segments/:id/customers` dan `GET /settings/modifier-groups/:id`. Tombol create/delete/view di halaman segmen customer menghasilkan 404.
- **Kode mati:** `loyalty-dashboard.tsx`, `promotions-manager.tsx`, `device-management.tsx`, `self-order-menu.tsx` (inline style, merusak dark mode) dan `tables/utils/demo-data.ts`.
- **i18n:** tidak ada library i18n, dan toast bercampur Inggris/Indonesia.
- **Aksesibilitas:** 49 dari 75 tombol ikon tanpa `aria-label`. Ada `<div>` yang bisa diklik tanpa role atau dukungan keyboard.
- **CSP bentrok:** script inline di popup label barcode diblokir `script-src 'self'`, dan `Permissions-Policy: camera=()` memblokir scanner kamera.
- **File besar:** 26 file > 400 baris (misalnya `product-form-page.tsx` 779, `excel-import-page.tsx` 641).
- **Env:** `.env.example` hanya berisi `VITE_API_BASE_URL`, padahal kode juga membaca `VITE_API_URL` dan `VITE_WS_URL`. `allowedHosts` di-hardcode `tilo.nouma.id`.

### Test

- 14 file unit test untuk 571 file source. Tidak ada test untuk sync, checkout, printer atau layer API.
- 18 spec Playwright. Fixture `e2e/fixtures/auth.fixture.ts:60-78` memakai mock token bila backend mati, sehingga test bisa lolos tanpa backend.

### Klaim `PHASE5-IMPLEMENTATION-SUMMARY.md` vs kenyataan

Dokumen ini menyatakan "Complete", "Zero runtime type errors" dan XSS hardening. Kenyataannya, `NumberInput`, `useFocusTrap`, `useDebouncedValue`, `setupOptimisticUpdate`, `safeDivide`, `sanitizeText` dan `isValidEmail` **tidak dipakai di mana pun**, dan `lib/test-utils.ts` tidak ada.

### ✅ Yang sudah baik

- Hanya 4 `any`, dan `no-explicit-any` = error.
- Tidak ada TODO atau mock data di kode produksi.
- Route backoffice sudah lazy-loaded dan punya error boundary.

---

## 4. Infrastruktur & DevOps

### 🔴 Critical / High

- **I-1. Resource k8s hilang.** `k8s/base/kustomization.yaml:19` mereferensikan `secrets.yaml` yang di-gitignore. ServiceAccount `tilopos-backend` dan PVC `tilopos-uploads` tidak didefinisikan. Tidak ada manifest untuk Postgres atau RabbitMQ.
- **I-2. Env k8s tidak cocok dengan kode.**
  - ConfigMap memberi `DB_HOST/DB_USER/...`, padahal Prisma butuh `DATABASE_URL`.
  - `JWT_EXPIRES_IN` tidak ada, sehingga app crash saat start (`main.ts:12`).
  - `CORS_ORIGIN` tidak ada.
  - Nama key S3/SMTP salah (`S3_ACCESS_KEY` vs `S3_ACCESS_KEY_ID`, `SMTP_PASSWORD` vs `SMTP_PASS`).
- **I-3. Path probe salah.** Probe memakai `/api/health`, padahal prefix-nya `api/v1` (`backend/deployment.yaml:54,62,71`), sehingga pod tidak pernah ready.
- **I-4. Pod web tidak bisa start.** Berjalan sebagai UID 101 tapi nginx bind ke port 80. `proxy_pass http://backend:3001` tidak cocok dengan nama service k8s (`tilopos-backend`). Probe `/health` jatuh ke fallback SPA.
- **I-5. UID mismatch:** deployment memakai UID 1000, sedangkan image memakai 1001, sehingga `/app/logs` tidak bisa ditulis.
- **I-6. Metrics tidak ada.** `MetricsService` tidak didaftarkan dan tidak ada endpoint `/metrics`, jadi ServiceMonitor, PrometheusRule dan dashboard Grafana tidak punya target.
- **I-7. Dockerfile tidak reproducible.** Build context per package + `npm install` tanpa lockfile (lockfile ada di root). `@aws-sdk/client-s3` dan `prisma` ada di devDependencies padahal dipakai saat runtime. `prisma migrate deploy` di `CMD` membuat semua replika berebut migrasi. Tidak ada `HEALTHCHECK`, dan image web berjalan sebagai root.
- **I-8. CI:** test dimatikan (`ci.yml:24`), tidak ada `npm audit`, build image atau deploy. `ci-cd.yml.disabled` masih bernama "MokaPOS" dan usang.
- **I-9. Versi Node tidak konsisten.** CI memakai Node 25, image memakai Node 20, dan keduanya sudah EOL per September 2026. Tidak ada `.nvmrc` maupun `engines`. Sebaiknya standarkan ke Node 22 atau 24 LTS.
- **I-10. Pre-commit hook kemungkinan rusak.** lint-staged memakai `"cd packages/backend && eslint --fix"`, padahal lint-staged tidak menjalankan shell.

### 🟡 Medium

- **Backup:** `scripts/backup-db.sh` tidak dijadwalkan, tidak ada skrip atau prosedur restore, user default `postgres` tidak cocok dengan compose (`tilopos`), backup masuk ke bucket yang sama dengan upload, dan volume upload tidak di-backup.
- **Redis k8s:** memakai `emptyDir`, tanpa password dan probe. `allkeys-lru` akan membuang job BullMQ; untuk queue seharusnya `noeviction`.
- **ELK:** password Kibana `kibana_system` tidak pernah diset, output Logstash tanpa kredensial (index `moka-logs-*`), backend mengirim ke ES tanpa auth, dan ELK berjalan di network berbeda dari app.
- **k8s lain:** image `:latest`, `commonLabels` deprecated, annotation ingress deprecated atau salah (`rate-limit`), tidak ada NetworkPolicy atau PDB, dan env `VITE_*` di ConfigMap tidak berpengaruh saat runtime.
- **`.env.example` kurang:** `FRONTEND_URL`, `GOOGLE_*`, `TWILIO_*`, `FCM_SERVER_KEY`, `WEBHOOK_SECRET`, `XENDIT_WEBHOOK_*`, `QRIS_API_URL`, `VITE_API_URL`, `VITE_WS_URL`. Kredensial contoh tidak cocok dengan compose dev.
- **Compose:** `docker:dev` membutuhkan `JWT_SECRET`, tapi tidak ada `.env.example` di root. RabbitMQ 3.x sudah tidak disupport. Redis produksi tanpa password.
- `.gitignore` mengabaikan `migration_lock.toml`, padahal file itu seharusnya di-commit.

### ✅ Yang sudah baik

- Tidak ada secret nyata di repo maupun di git history.
- Tidak ada file besar atau artefak build yang ter-commit.
- TLS lewat cert-manager sudah dikonfigurasi.

---

## 5. Dokumentasi & Kebersihan Repo

- **Dua folder dokumentasi:** `Docs/` (48 file) dan `docs/` (46 file) dengan isi berbeda. Di macOS keduanya menyatu, di Linux/CI terpisah. Gabungkan jadi satu `docs/`.
- **README salah:**
  - `cp .env.example .env` di root, padahal file itu tidak ada.
  - Login default `admin@tilopos.com / admin123` tidak cocok dengan seeder (`superadmin@tilopos.id`, PIN `1234`).
  - Password RabbitMQ salah.
  - 8 link dokumen rusak.
  - Klaim "CI/CD" padahal tidak ada CD.
- **Lisensi bertentangan:** `LICENSE` dan badge README menyebut MIT, sedangkan `package.json` menyebut `"UNLICENSED"`.
- **CHANGELOG usang:** entri terakhir `0.1.0 - 2025-02-06` (tahunnya kemungkinan salah). Subscription, stock opname dan bulk ops tidak tercatat, dan tidak ada git tag.
- **Dokumen nyasar di kode:** `packages/web/PHASE5-IMPLEMENTATION-SUMMARY.md`, `REFACTORING_*.md` dan `MIGRATION.md` di dalam `packages/backend/src/...`. `CLAUDE.md:201` menyebut proyek lain ("FileForge").
- **Dokumen yang tidak akurat:** `progress/01-progress-tracker.md` (marketplace "Done") dan `REFACTORING-PROGRESS-2026-02.md` (Phase 3 dan 4 justru mundur).
- **Dependency:**
  - ESLint 8 sudah EOL.
  - `@typescript-eslint` v7 (backend) vs v8 (web).
  - `@nestjs/schematics` 10 dipakai dengan Nest 11.
  - Prisma 5, React 18, Tailwind 3.
  - `react-router` dan `react-router-dom` terpasang bersamaan.
  - Tidak ada Dependabot/Renovate, CODEOWNERS atau template PR.

---

## Lampiran: Checklist Singkat

**Keamanan (P0)**
- [ ] S-C1/S-C2: tolak token ber-`purpose` di `jwt.strategy.ts`, pakai secret terpisah, wajibkan `businessId`
- [ ] S-C3: harga dan diskon dihitung di server, validasi promo/voucher/credit note
- [ ] S-H1/S-H2: scope `businessId` di POS, orders, unit-conversion, batch-tracking, settlements, online-store sync
- [ ] S-H4: JWT sebagai guard global pertama, `FeatureGuard` hanya membaca `request.user`

**Data (P0)**
- [ ] Q-1: hapus cron settlement ganda, tambahkan unique key
- [ ] Q-3: migrasi resmi `transfer_templates`
- [ ] Q-5: matikan fallback mock payment di produksi
- [ ] S-H3/S-H6: validasi checkout storefront, lock pada refund

**Web (P0)**
- [ ] W-0: perbaiki 2 error TypeScript dan exclude `e2e/` dari vitest
- [ ] W-1/W-2: perbaiki pipeline offline dan tambahkan test
- [ ] W-3: hentikan cache `/api` di service worker

**Infra (P1)**
- [ ] I-1 s/d I-5: perbaiki manifest k8s (env, probe, SA/PVC, UID, nginx)
- [ ] I-7: Dockerfile dari root context dengan `npm ci`, migrasi via Job
- [ ] I-8: aktifkan test di CI, lint tanpa `--fix`
- [ ] I-9: satukan versi Node LTS
- [ ] Jadwalkan backup dan buat prosedur restore

**Lanjutan (P1/P2)**
- [ ] Class DTO untuk sekitar 90 body yang tidak tervalidasi
- [ ] Unique code per tenant, index FK, kebijakan `onDelete` dan soft delete
- [ ] Refresh token (httpOnly cookie) dan revocation
- [ ] Pagination, perbaikan N+1, zona waktu `Asia/Jakarta`
- [ ] Implementasikan atau sembunyikan fitur stub (marketplace, integrasi, push, printer)
- [ ] Perbaiki README, gabungkan `Docs/` + `docs/`, samakan lisensi, perbarui CHANGELOG
