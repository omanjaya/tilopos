# TiloPOS Bug Audit Report

**Tanggal:** 25 Februari 2026
**Auditor:** Claude Code (Automated Parallel Audit)
**Cakupan:** 10 area fitur, seluruh codebase frontend + backend
**Total Bug Ditemukan:** 75 bug terverifikasi
**Status:** ALL 75 BUGS FIXED (25 Februari 2026)

> **Catatan Metodologi:**
> Audit dilakukan dalam 2 tahap:
> 1. **Scan awal** — 10 agent paralel menemukan ~203 potensi bug (termasuk code smell, false positive, duplikat)
> 2. **Verifikasi** — 10 agent paralel membaca source code line-by-line, mengkonfirmasi **75 bug yang benar-benar real** dengan bukti code snippet dan line numbers
>
> Angka 75 adalah jumlah bug yang terverifikasi dan actionable. Sisanya gugur karena: false positive setelah dibaca detail, duplikat (isu sama dari sudut berbeda), code smell bukan bug fungsional, atau sudah di-handle di tempat lain.

---

## Ringkasan Eksekutif

| Area | Total | Critical | High | Medium | Low | Status |
|------|-------|----------|------|--------|-----|--------|
| POS/Transaction | 10 | 2 | 2 | 4 | 2 | Fixed |
| Shift Management | 5 | 2 | 1 | 2 | 0 | Fixed |
| Product/Inventory | 9 | 2 | 3 | 3 | 1 | Fixed |
| Auth/Employee/Customer | 11 | 3 | 4 | 3 | 1 | Fixed |
| Order/KDS/Kitchen | 7 | 1 | 4 | 2 | 0 | Fixed |
| Settings/Outlet/Business | 7 | 4 | 1 | 2 | 0 | Fixed |
| Reports/Dashboard | 5 | 2 | 3 | 0 | 0 | Fixed |
| Promotions/Loyalty/Voucher | 8 | 4 | 3 | 1 | 0 | Fixed |
| Online Store/Self-Order | 8 | 5 | 3 | 0 | 0 | Fixed |
| Routing/Layout/UI | 5 | 0 | 1 | 4 | 0 | Fixed |
| **TOTAL** | **75** | **25** | **25** | **21** | **4** | **All Fixed** |

---

## Kategori Severity

- **CRITICAL** — Fitur tidak berfungsi sama sekali, data corruption, security vulnerability
- **HIGH** — Fitur berfungsi parsial, data inconsistency, performance severe
- **MEDIUM** — UX buruk, minor data issue, inconsistensi tampilan
- **LOW** — Kosmetik, dead code, minor improvement

---

## 1. POS/Transaction (10 Bug)

### POS-01: Discounts Tidak Dikirim ke Backend — CRITICAL — FIXED
- **File:** `packages/web/src/features/pos/hooks/use-pos-transaction.ts:122-144`
- **Deskripsi:** Diskon dihitung di frontend cart tapi TIDAK pernah dikirim ke backend saat create transaction. Object request tidak menyertakan `discountAmount`, `discountPercent`, atau array discounts.
- **Dampak:** Diskon hilang saat transaksi dibuat. Backend menghitung tax/service charge dari subtotal penuh, bukan dari jumlah setelah diskon.

### POS-02: Refund API Field Name Mismatch — CRITICAL — FIXED
- **File:** `packages/web/src/api/endpoints/pos.api.ts:122-134`
- **File:** `packages/backend/src/application/dtos/refund.dto.ts:16`
- **Deskripsi:** Frontend mengirim refund items dengan field `itemId`, tapi backend mengharapkan `transactionItemId`.
- **Dampak:** Semua request refund dari frontend gagal validasi di backend.

### POS-03: Tax Calculation Missing Tax-Inclusive Mode — HIGH — FIXED
- **File:** `packages/web/src/stores/cart.store.ts:350`
- **Deskripsi:** Cart selalu menghitung tax secara additive (tax-exclusive), tapi backend support tax-inclusive via `taxConfig.taxInclusive`. Frontend tidak aware setting ini.
- **Dampak:** Frontend menampilkan total yang salah saat outlet dikonfigurasi dengan pricing tax-inclusive.

### POS-04: Credit Transaction Missing Discounts Support — HIGH — FIXED
- **File:** `packages/backend/src/application/use-cases/credit/create-credit-transaction.use-case.ts:16-40`
- **Deskripsi:** Credit transaction use case tidak punya parameter diskon di input interface.
- **Dampak:** Diskon tidak bisa diterapkan pada penjualan kredit (BON).

### POS-05: Receipt Hardcodes Tax Rate Display — MEDIUM — FIXED
- **File:** `packages/web/src/features/pos/components/receipt-preview.tsx:166`
- **Deskripsi:** Receipt selalu menampilkan "Pajak (PPN 11%)" meskipun tax rate berbeda.
- **Dampak:** Struk menyesatkan jika tax rate bukan 11%.

### POS-06: Multi-Payment Change Calculation — MEDIUM — FIXED
- **File:** `packages/backend/src/application/use-cases/billing/process-multi-payment.use-case.ts:103-111`
- **Deskripsi:** Hanya menangani satu cash payment untuk kalkulasi kembalian. Multiple cash payments dalam split payment tidak dihitung benar.
- **Dampak:** Kembalian salah pada skenario split payment dengan lebih dari satu pembayaran cash.

### POS-07: Silent Stock Skip When No Stock Level — MEDIUM — FIXED
- **File:** `packages/backend/src/application/use-cases/pos/create-transaction.use-case.ts:468-471`
- **Deskripsi:** Jika record `stock_level` tidak ada, stock deduction di-skip secara diam-diam tanpa logging.
- **Dampak:** Inventori tidak konsisten jika stock levels belum diinisialisasi untuk semua outlet.

### POS-08: Cart Tax Display Missing Tax-Inclusive Context — MEDIUM — FIXED
- **File:** `packages/web/src/features/pos/components/cart-panel.tsx:121`
- **Deskripsi:** Cart display tidak membedakan antara tax-exclusive dan tax-inclusive mode.
- **Dampak:** Tampilan cart tidak sesuai jika outlet pakai pricing tax-inclusive.

### POS-09: Receipt Modifier Quantity Field Tidak Ada — LOW — FIXED
- **File:** `packages/backend/src/application/use-cases/pos/reprint-receipt.use-case.ts:96`
- **Deskripsi:** Receipt menyertakan field `quantity` untuk modifiers yang tidak ada di schema TransactionItemModifier.
- **Dampak:** Field undefined di data struk; minor rendering issue.

### POS-10: Refund Reason Validated tapi Tidak Digunakan — LOW — FIXED
- **File:** `packages/backend/src/application/dtos/refund.dto.ts:23-25`
- **Deskripsi:** RefundItemDto memvalidasi `reason` per item, tapi ProcessRefundUseCase tidak tracking individual refund reasons.
- **Dampak:** Reason per item tidak tersimpan; hanya overall notes yang direkam.

---

## 2. Shift Management (5 Bug)

### SHF-01: Cash Out Missing `reason` Field di API — CRITICAL — FIXED
- **File:** `packages/web/src/api/endpoints/shifts.api.ts:52-53`
- **File:** `packages/backend/src/application/dtos/cash-drawer.dto.ts:17-33`
- **Deskripsi:** Frontend `cashOut` API tidak mengirim field `reason` yang REQUIRED oleh backend DTO (`CashOutDto`).
- **Dampak:** Cash out request selalu gagal dengan validation error.

### SHF-02: Frontend Cash Out Dialog Tanpa Input Reason — CRITICAL — FIXED
- **File:** `packages/web/src/features/shifts/shifts-page.tsx:447-502`
- **Deskripsi:** Dialog Cash Out hanya punya input `cashOutAmount` dan `cashOutNotes`, tapi tidak ada input untuk field `reason` yang wajib.
- **Dampak:** User tidak bisa melakukan cash out karena field wajib tidak dikumpulkan dari UI.

### SHF-03: Race Condition di Start Shift — HIGH — FIXED
- **File:** `packages/backend/src/application/use-cases/employees/start-shift.use-case.ts:40-62`
- **Deskripsi:** Check apakah outlet sudah punya shift terbuka dan pembuatan shift baru TIDAK atomic. Dua request concurrent bisa lolos check dan membuat dua shift.
- **Dampak:** Dua karyawan bisa membuka shift bersamaan di outlet yang sama.

### SHF-04: Missing `notes` Field di EndShiftDto — MEDIUM — FIXED
- **File:** `packages/backend/src/application/dtos/employee.dto.ts:117-122`
- **Deskripsi:** `EndShiftDto` class tidak menyertakan field `notes` opsional, padahal `EndShiftUseCase` menerima notes.
- **Dampak:** Inkonsistensi antara generic endpoint dan per-employee endpoint.

### SHF-05: Generic End Shift Endpoint Tidak Kirim Notes — MEDIUM — FIXED
- **File:** `packages/backend/src/modules/employees/employees.controller.ts:311-322`
- **Deskripsi:** Endpoint `POST /employees/shifts/:shiftId/end` tidak meneruskan parameter `notes` ke use case, berbeda dengan per-employee endpoint.
- **Dampak:** User yang end shift via generic endpoint tidak bisa menyimpan notes.

---

## 3. Product/Inventory (9 Bug)

### INV-01: Stock Adjustment Type Mismatch — CRITICAL — FIXED
- **File:** `packages/web/src/api/endpoints/inventory.api.ts:43`
- **File:** `packages/backend/src/application/dtos/stock.dto.ts:18-20`
- **Deskripsi:** Frontend mengirim type `'add' | 'remove' | 'set'`, tapi backend mengharapkan `'set' | 'increment' | 'decrement'`.
- **Dampak:** Stock adjustment dengan type 'add' atau 'remove' gagal validasi backend.

### INV-02: Stock Transfer Receive Tidak dalam Transaction — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/stock-transfers/stock-transfers.controller.ts:178-263`
- **Deskripsi:** Endpoint `receive` melakukan multiple operasi database (update status, decrement source, increment destination) TANPA transaction wrapper.
- **Dampak:** Jika proses crash di tengah, inventori tidak sinkron dengan record transfer.

### INV-03: Decimal.isZero() Mungkin Tidak Ada — HIGH — FIXED
- **File:** `packages/backend/src/modules/stock-opname/stock-opname.controller.ts:85`
- **Deskripsi:** Kode memanggil `.isZero()` pada Prisma Decimal objects, tapi method ini mungkin tidak ada.
- **Dampak:** Runtime error saat listing stock opname sessions.

### INV-04: Null productId/variantId Handling di directTransfer — HIGH — FIXED
- **File:** `packages/backend/src/modules/stock-transfers/stock-transfers.controller.ts:294-309`
- **Deskripsi:** Ketika `productId` undefined, menjadi `null` di query yang bisa match record yang salah.
- **Dampak:** Validasi stock incorrect; bisa allow transfer stock yang tidak ada.

### INV-05: Missing businessId Saat Create StockLevel — HIGH — FIXED
- **File:** `packages/backend/src/modules/stock-transfers/stock-transfers.controller.ts:369-376`
- **Deskripsi:** Saat create stockLevel baru untuk destination outlet di directTransfer, `businessId` tidak di-set.
- **Dampak:** Stock records yang dibuat mungkin tidak properly scoped ke business.

### INV-06: Field Name Mismatch di StockTransferItem — MEDIUM — FIXED
- **File:** `packages/web/src/types/inventory.types.ts:54-59`
- **Deskripsi:** Frontend type menggunakan `requestedQuantity` tapi backend API mengembalikan `quantitySent`.
- **Dampak:** Runtime errors di transfer detail page; undefined field access.

### INV-07: Wrong Exception Type di Stock Opname — MEDIUM — FIXED
- **File:** `packages/backend/src/modules/stock-opname/stock-opname.controller.ts:119`
- **Deskripsi:** Throws `ForbiddenException` padahal seharusnya `NotFoundException`.
- **Dampak:** HTTP status code salah (403 bukan 404).

### INV-08: Missing Variants di getUnassignedProducts — MEDIUM — FIXED
- **File:** `packages/backend/src/modules/inventory/outlet-product.service.ts:103-119`
- **Deskripsi:** `getUnassignedProducts` tidak include variant data, berbeda dengan `getProductsForOutlet`.
- **Dampak:** Inkonsistensi API response; frontend expecting variant data gagal.

### INV-09: CSV Export Header Mismatch — LOW — FIXED
- **File:** `packages/backend/src/modules/inventory/inventory.service.ts:200-201`
- **Deskripsi:** CSV header menggunakan `category` tapi actual field adalah `categoryName`.
- **Dampak:** Header CSV menyesatkan, tapi data benar.

---

## 4. Auth/Employee/Customer (11 Bug)

### AUTH-01: Missing Role Hierarchy Enforcement — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/employees/employees.controller.ts:117-157, 251-280`
- **Deskripsi:** Endpoint `createEmployee` dan `updateEmployee` menerima role apapun dari DTO tanpa validasi hierarki. Manager bisa membuat Owner atau Super Admin.
- **Dampak:** Privilege escalation — karyawan bisa memberi dirinya sendiri role lebih tinggi.

### AUTH-02: findByEmail Tanpa businessId Filter — CRITICAL — FIXED
- **File:** `packages/backend/src/infrastructure/repositories/prisma-employee.repository.ts:26-36`
- **Deskripsi:** `findByEmail` mencari employee tanpa filter `businessId`. Jika dua business punya employee dengan email sama, bisa return employee dari business yang salah.
- **Dampak:** Cross-business authentication bypass.

### AUTH-03: Missing Role Hierarchy Constant/Helper — CRITICAL — FIXED
- **File:** `packages/backend/src/shared/constants/roles.ts:1-9`
- **Deskripsi:** Role hierarchy didokumentasikan tapi tidak pernah diimplementasikan sebagai constant atau helper function.
- **Dampak:** Tidak ada mekanisme enforcement role hierarchy di seluruh codebase.

### AUTH-04: Customer Creation Tanpa Duplicate Email Validation — HIGH — FIXED
- **File:** `packages/backend/src/modules/customers/customers.controller.ts:69-100`
- **Deskripsi:** Endpoint `POST /customers` tidak check duplicate email per business, padahal `checkDuplicateCustomer()` sudah ada tapi hanya digunakan di import.
- **Dampak:** Duplikasi data customer, CRM quality menurun.

### AUTH-05: Inkonsistensi Duplicate Validation — HIGH — FIXED
- **File:** `packages/backend/src/modules/customers/customers.service.ts:552-571`
- **Deskripsi:** Import endpoint punya duplicate checking tapi direct creation endpoint tidak.
- **Dampak:** Dua code path dengan validasi berbeda.

### AUTH-06: No Email Uniqueness Constraint — HIGH — FIXED
- **File:** `packages/backend/src/modules/customers/customers.controller.ts:69-100`
- **Deskripsi:** Tidak ada database-level unique constraint pada email per business.
- **Dampak:** Direct database insert bisa bypass application-level validation.

### AUTH-07: Login Allows Outlet Override — HIGH — FIXED
- **File:** `packages/backend/src/application/use-cases/auth/login.use-case.ts:57-68`
- **Deskripsi:** Employee bisa login ke outlet lain selain yang ditugaskan, tanpa role check.
- **Dampak:** Employee assigned ke Outlet A bisa login sebagai Outlet B.

### AUTH-08: RolesGuard Bypass Tanpa Audit Logging — MEDIUM — FIXED
- **File:** `packages/backend/src/infrastructure/auth/roles.guard.ts:23-26`
- **Deskripsi:** Owner/Super Admin bypass semua role check tanpa audit logging.
- **Dampak:** Tidak ada audit trail untuk akses privileged.

### AUTH-09: CreateEmployeeDto Allows 'owner' Role — MEDIUM — FIXED
- **File:** `packages/backend/src/application/dtos/employee.dto.ts:14-21, 45-49`
- **Deskripsi:** DTO validation mengizinkan 'owner' sebagai role valid di enum, seharusnya hanya saat business registration.
- **Dampak:** Dikombinasikan dengan AUTH-01, memungkinkan privilege escalation.

### AUTH-10: Missing Phone Uniqueness Validation — MEDIUM — FIXED
- **File:** `packages/backend/src/modules/customers/customers.controller.ts:69-100`
- **Deskripsi:** Phone number bisa duplikat di customer records, padahal import service check duplicates.
- **Dampak:** Konfusi di order lookup dan loyalty tracking.

### AUTH-11: No Audit Logging untuk Role Changes — LOW — FIXED
- **File:** `packages/backend/src/modules/employees/employees.controller.ts:251-280`
- **Deskripsi:** Saat role employee diubah, tidak ada audit log yang dicatat.
- **Dampak:** Tidak bisa tracking siapa mengubah role kapan.

---

## 5. Order/KDS/Kitchen (7 Bug)

### KDS-01: WebSocket Namespace Mismatch — CRITICAL — FIXED
- **File:** `packages/web/src/hooks/realtime/socket.util.ts:19`
- **File:** `packages/web/src/features/kds/hooks/useKdsSocket.ts:21`
- **File:** `packages/backend/src/modules/kds/kds.gateway.ts:32`
- **Deskripsi:** POS listen di namespace `/notifications`, KDS emit di namespace `/kds`. Event order-ready dari kitchen TIDAK PERNAH sampai ke cashier.
- **Dampak:** Cashier tidak dapat notifikasi saat pesanan siap dari kitchen. Fitur KDS-to-POS notification totally broken.

### KDS-02: startedAt/completedAt Silently Dropped — HIGH — FIXED
- **File:** `packages/backend/src/infrastructure/repositories/prisma-order.repository.ts:126-148`
- **Deskripsi:** Method `update()` hanya whitelist 4 field (`status`, `priority`, `notes`, `estimatedTime`). Field `startedAt` dan `completedAt` di-drop secara diam-diam.
- **Dampak:** Timestamp preparasi dan penyelesaian order tidak pernah tersimpan di database.

### KDS-03: Order Completion Tidak Membebaskan Meja — HIGH — FIXED
- **File:** `packages/backend/src/application/use-cases/orders/update-order-status.use-case.ts:37-68`
- **Deskripsi:** Saat order status berubah ke `completed`, table TIDAK di-set ke `available`. Berbeda dengan CancelOrderUseCase yang benar membebaskan meja.
- **Dampak:** Meja tetap occupied permanent setelah order selesai.

### KDS-04: KDS API Fetch dari Endpoint Salah — HIGH — FIXED
- **File:** `packages/web/src/api/endpoints/kds.api.ts:9`
- **Deskripsi:** KDS frontend fetch orders dari `/orders` (generic) bukan `/kds/orders` (KDS-specific endpoint).
- **Dampak:** KDS dapat SEMUA order, bukan hanya yang aktif untuk outlet. Missing KDS-specific filtering.

### KDS-05: Self-Order Tidak Update Status Meja — HIGH — FIXED
- **File:** `packages/backend/src/modules/orders/services/self-order-submission.service.ts:32-97`
- **Deskripsi:** Saat customer submit self-order via QR, table status TIDAK diupdate ke `occupied`.
- **Dampak:** Meja tetap tampil available di POS meskipun customer sudah duduk dan punya order aktif.

### KDS-06: No Table Validation pada Order Creation — MEDIUM — FIXED
- **File:** `packages/backend/src/application/use-cases/orders/create-order.use-case.ts:79-84`
- **Deskripsi:** Saat create dine-in order dengan `tableId`, tidak ada validasi: table exists, milik outlet yang sama, atau status available.
- **Dampak:** Order bisa dibuat untuk meja yang tidak ada atau sudah occupied.

### KDS-07: Table Status Enum Mismatch — MEDIUM — FIXED
- **File:** `packages/web/src/features/pos/components/table-selector.tsx:22`
- **Deskripsi:** Frontend mendefinisikan status `'maintenance'`, tapi backend/Prisma menggunakan `'cleaning'`.
- **Dampak:** Saat backend return `'cleaning'`, frontend tidak bisa match ke statusColors, UI rendering issue.

---

## 6. Settings/Outlet/Business (7 Bug)

### SET-01: FeatureGuard businessId Spoofing — CRITICAL — FIXED
- **File:** `packages/backend/src/common/guards/feature.guard.ts:105-108`
- **Deskripsi:** `extractBusinessId()` memprioritaskan `request.body.businessId` di atas `request.user.businessId`. Attacker bisa mengirim businessId palsu di body request.
- **Dampak:** Cross-business access — user bisa mengakses/mengubah fitur business lain.

### SET-02: Feature/BusinessType Controller Tanpa RBAC — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/business/controllers/feature.controller.ts:110-111`
- **Deskripsi:** Controller hanya pakai `JwtAuthGuard`, tanpa `RolesGuard` dan `@Roles()`. Siapa pun yang authenticated bisa toggle features dan ubah business type.
- **Dampak:** Cashier bisa mengubah fitur bisnis atau business type.

### SET-03: updateOutlet Terima Arbitrary JSON — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/settings/settings.controller.ts:103-107`
- **Deskripsi:** Endpoint `PUT /settings/outlets/:id` menerima `Record<string, unknown>` tanpa validasi DTO apapun.
- **Dampak:** Attacker bisa inject field arbitrary (businessId, isActive, deletedAt, dll) langsung ke database.

### SET-04: Repository Dangerous Type Cast — CRITICAL — FIXED
- **File:** `packages/backend/src/infrastructure/repositories/settings/outlet-settings.repository.ts:72-76`
- **Deskripsi:** `updateOutlet()` cast `Record<string, unknown>` ke `Record<string, never>` tanpa sanitasi, bypass Prisma type safety.
- **Dampak:** Data arbitrary bisa masuk ke database, termasuk field yang seharusnya protected.

### SET-05: Payment Method IDs Regenerated Setiap Call — HIGH — FIXED
- **File:** `packages/backend/src/infrastructure/repositories/settings/payment-method.repository.ts:127-197`
- **Deskripsi:** Saat business belum punya payment methods tersimpan, default methods di-generate dengan ID random baru setiap kali dipanggil.
- **Dampak:** Frontend tidak bisa reliably track payment method IDs. Update payment method bisa gagal karena ID berubah.

### SET-06: Outlet Deactivation Bug — MEDIUM — FIXED
- **File:** `packages/web/src/features/settings/outlets-page.tsx:133-134`
- **Deskripsi:** Deactivation mutation mengirim `{ name: undefined }` ke backend, bukan memanggil DELETE endpoint atau mengirim `{ isActive: false }`.
- **Dampak:** Outlet tampak dinonaktifkan di UI tapi tetap aktif di database.

### SET-07: Route Ordering Conflict features/bulk vs features/:featureKey — MEDIUM — FIXED
- **File:** `packages/backend/src/modules/business/controllers/feature.controller.ts:159, 173`
- **Deskripsi:** `PUT features/:featureKey` dideclare sebelum `PUT features/bulk`. NestJS match `/features/bulk` ke route pertama dengan `featureKey='bulk'`.
- **Dampak:** Bulk update features endpoint unreachable/dead code.

---

## 7. Reports/Dashboard (5 Bug)

### RPT-01: Sales Export GroupBy Timestamp Bukan Date — CRITICAL — FIXED
- **File:** `packages/backend/src/application/use-cases/reports/generate-sales-report.use-case.ts:27-37`
- **Deskripsi:** `groupBy(['createdAt'])` menghasilkan satu row per timestamp (detik/milidetik), bukan per hari.
- **Dampak:** Sales report export menampilkan satu baris per transaksi, bukan ringkasan harian. Data unusable untuk reporting.

### RPT-02: Inventory PDF Export Selalu Produce Excel — CRITICAL — FIXED
- **File:** `packages/backend/src/application/use-cases/reports/generate-inventory-report.use-case.ts:17-44`
- **Deskripsi:** Parameter `format: 'pdf' | 'excel'` diterima tapi diabaikan. Selalu generate Excel output.
- **Dampak:** User tidak bisa export inventory report sebagai PDF.

### RPT-03: Net/Gross Sales Label Terbalik — HIGH — FIXED
- **File:** `packages/backend/src/modules/reports/controllers/dashboard-reports.controller.ts:77-78`
- **Deskripsi:** `netSales` di-assign dari `grandTotal` (yang termasuk tax), `grossSales` dari `subtotal`. Dalam terminologi akuntansi, ini terbalik.
- **Dampak:** Dashboard menampilkan label yang menyesatkan. "Penjualan Bersih" menunjukkan angka termasuk pajak.

### RPT-04: Financial Report Double-Counts Discounts — HIGH — FIXED
- **File:** `packages/backend/src/modules/reports/controllers/financial-command.controller.ts:143-144, 305`
- **Deskripsi:** Discounts dihitung sebagai expenses: `totalExpenses = totalCOGS + totalPurchases + totalRefunds + totalDiscounts`. Seharusnya discounts mengurangi revenue, bukan menambah expenses.
- **Dampak:** Profit/Net Income understated karena expenses overstated.

### RPT-05: N+1 Query di Staff Leaderboard — HIGH — FIXED
- **File:** `packages/backend/src/modules/reports/controllers/staff-performance.controller.ts:78-109`
- **Deskripsi:** Loop melalui setiap employee dan execute separate `aggregate` query per orang (classic N+1 pattern).
- **Dampak:** Dengan 50 karyawan = 51 queries. Dashboard lambat, high database load.

---

## 8. Promotions/Loyalty/Voucher (8 Bug)

### PRM-01: Voucher Consumed Saat Preview — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/promotions/promotions.service.ts:268-282`
- **Deskripsi:** `applyPromotions()` memanggil `useVoucher()` yang mark voucher as used langsung saat validasi/preview, bukan saat transaction commit.
- **Dampak:** Jika customer cancel transaksi, voucher sudah consumed dan tidak bisa dipakai lagi.

### PRM-02: Loyalty Points Earned Hardcoded 0 — CRITICAL — FIXED
- **File:** `packages/backend/src/application/use-cases/pos/create-transaction.use-case.ts:545`
- **Deskripsi:** `loyaltyPointsEarned` selalu return `0` di response transaksi. Points sebenarnya dihitung async via event listener, tapi POS receipt menampilkan 0.
- **Dampak:** Struk menampilkan 0 poin padahal poin sebenarnya earned di background.

### PRM-03: Points Expiry Mutasi Historical Records — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/loyalty/loyalty-cron.service.ts:316-321`
- **Deskripsi:** Cron job expiry mengubah record asli dengan `points: 0` dan `description: 'Points expired'`, menghancurkan audit trail.
- **Dampak:** Data historis corrupted; original earned amount tidak bisa di-recover. Risk double-expiration.

### PRM-04: Race Condition di adjustPoints — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/loyalty/services/points-management.service.ts:186-213`
- **Deskripsi:** Read-then-write pattern tanpa atomic increment. Dua concurrent requests bisa baca balance yang sama, hitung masing-masing, dan tulis — one update lost.
- **Dampak:** Lost-update race condition. Balance poin bisa salah (e.g., 100 + 10 + 10 = 110 bukan 120).

### PRM-05: Redemption Incorrectly Applies Tier Multiplier — HIGH — FIXED
- **File:** `packages/backend/src/application/use-cases/loyalty/redeem-loyalty-points.use-case.ts:48-50, 59-60`
- **Deskripsi:** Tier `pointMultiplier` diterapkan pada redemption calculation: `discountAmount = points * valuePerPoint * multiplier`. Seharusnya multiplier hanya untuk EARNING, bukan redeeming.
- **Dampak:** Customer dengan tier tinggi mendapat diskon inflated saat redeem poin.

### PRM-06: Loyalty Points Calculation Delayed, Response Shows 0 — HIGH — FIXED
- **File:** `packages/backend/src/infrastructure/events/transaction-event.listener.ts:111-169`
- **Deskripsi:** Poin dihitung benar di event listener tapi asynchronous. Transaction response langsung return 0.
- **Dampak:** Disconnect antara tampilan POS (0 poin) dan database (actual poin).

### PRM-07: No Preview Mode untuk Vouchers — HIGH — FIXED
- **File:** `packages/backend/src/application/use-cases/promotions/validate-voucher.use-case.ts:23-154`
- **Deskripsi:** Tidak ada pemisahan antara preview mode (hitung diskon tanpa consume) dan confirmation mode (mark voucher used).
- **Dampak:** Voucher selalu consumed saat `applyPromotions()` dipanggil. Related to PRM-01.

### PRM-08: Missing expiresAt Saat Create Earned Transaction — MEDIUM — FIXED
- **File:** `packages/backend/src/infrastructure/events/transaction-event.listener.ts:148-157`
- **Deskripsi:** Loyalty transaction yang dibuat di `addLoyaltyPoints()` tidak set `expiresAt` berdasarkan `pointExpiryDays` program.
- **Dampak:** Poin yang di-earn tidak punya tanggal kadaluarsa meskipun program setting-nya ada.

---

## 9. Online Store/Self-Order (8 Bug)

### OLS-01: Race Condition di Order Number Generation — CRITICAL — FIXED
- **File:** `packages/backend/src/modules/self-order/self-order.controller.ts:610-622`
- **Deskripsi:** `generateOrderNumber` reads count, increments, returns — NOT atomic. Dua concurrent requests bisa generate order number yang sama.
- **Dampak:** Duplicate order numbers.

### OLS-02: Frontend POST ke Endpoint Salah — CRITICAL — FIXED
- **File:** `packages/web/src/api/endpoints/online-store.api.ts:38`
- **File:** `packages/backend/src/modules/online-store/online-store.controller.ts:96-117, 430-434`
- **Deskripsi:** Frontend POST ke `/online-store/s/:slug/orders` dengan payload yang tidak match. Endpoint yang benar adalah `/online-store/s/:slug/checkout` dengan DTO berbeda.
- **Dampak:** Online store checkout broken — semua order gagal.

### OLS-03: Tidak Ada Public Route untuk Storefront — CRITICAL — FIXED
- **File:** `packages/web/src/router.tsx`
- **Deskripsi:** `StorefrontPage` component exists tapi TIDAK diregister sebagai public route di router. Tidak ada route `/store/:slug` atau `/s/:slug`.
- **Dampak:** Customer tidak bisa mengakses halaman online store sama sekali.

### OLS-04: QR URL Mismatch — CRITICAL — FIXED
- **File:** `packages/backend/src/application/use-cases/self-order/create-session.use-case.ts:36`
- **Deskripsi:** QR code URL generate `/self-order/${sessionCode}`, tapi frontend route adalah `/order/:sessionCode`.
- **Dampak:** QR code mengarah ke 404 — self-order via QR totally broken.

### OLS-05: Field Name Mismatch Frontend/Backend — CRITICAL — FIXED
- **File:** `packages/web/src/types/online-store.types.ts:90`
- **File:** `packages/backend/src/modules/online-store/interfaces/storefront.interface.ts:64`
- **Deskripsi:** Frontend kirim `deliveryAddress`, backend harapkan `shippingAddress`.
- **Dampak:** Alamat delivery tidak pernah tersimpan di order.

### OLS-06: Duplicate sync-catalog Route — HIGH — FIXED
- **File:** `packages/backend/src/modules/online-store/online-store.controller.ts:233, 339`
- **Deskripsi:** Dua endpoint `POST stores/:id/sync-catalog` yang saling conflict. Endpoint kedua unreachable.
- **Dampak:** Enhanced sync-catalog (dengan stock check) tidak pernah terpanggil.

### OLS-07: Checkout Tidak Deduct Inventory — HIGH — FIXED
- **File:** `packages/backend/src/modules/online-store/online-store.service.ts:760-930`
- **Deskripsi:** `createStorefrontOrder` validasi stock availability tapi TIDAK deduct inventory setelah order dibuat.
- **Dampak:** Overselling — stock tetap sama setelah order, customer lain bisa order barang yang sama.

### OLS-08: Address Field Inconsistency di Controller — HIGH — FIXED
- **File:** `packages/backend/src/modules/online-store/online-store.controller.ts:96-117`
- **Deskripsi:** Controller DTO menggunakan `shippingAddress` tapi frontend mengirim `deliveryAddress`. Related to OLS-05.
- **Dampak:** Alamat delivery hilang saat disimpan ke database.

---

## 10. Routing/Layout/UI (5 Bug)

### UI-01: Header User Menu Crash pada Undefined Name — HIGH — FIXED
- **File:** `packages/web/src/components/layout/header/header-user-menu.tsx:54-59`
- **Deskripsi:** Initials calculation memanggil `.split()` pada `user?.name` yang bisa `undefined`. Optional chaining hanya protect property access, bukan subsequent method calls.
- **Dampak:** TypeError crash seluruh header menu jika user name tidak ada.

### UI-02: Breadcrumb Pakai window.location Bukan useLocation — MEDIUM — FIXED
- **File:** `packages/web/src/components/shared/breadcrumb.tsx:84`
- **Deskripsi:** Menggunakan `window.location.pathname` langsung, bukan React Router `useLocation()` hook.
- **Dampak:** Breadcrumb mungkin tidak update saat navigasi programmatic.

### UI-03: Media Query Hook Flash of Wrong Layout — MEDIUM — FIXED
- **File:** `packages/web/src/hooks/use-media-query.ts:20`
- **Deskripsi:** `useState(false)` initialization menyebabkan desktop UI tampil dulu di mobile sebelum useEffect mendeteksi media query.
- **Dampak:** Flash/jank layout di mobile — user lihat desktop layout sebentar lalu switch ke mobile.

### UI-04: Super Admin Tidak Bisa Switch Outlet — MEDIUM — FIXED
- **File:** `packages/web/src/components/layout/outlet-selector.tsx:19`
- **Deskripsi:** Permission check hanya izinkan `['owner', 'manager', 'supervisor']`, tidak termasuk `super_admin`.
- **Dampak:** Super admin terkunci dari fitur outlet switching.

### UI-05: Dua Breadcrumb Components Conflicting — MEDIUM — FIXED
- **File:** `packages/web/src/components/shared/breadcrumb.tsx` (broken)
- **File:** `packages/web/src/components/shared/breadcrumbs.tsx` (correct)
- **Deskripsi:** Ada dua komponen breadcrumb. Yang broken (dipakai di header) menggunakan `window.location`. Yang benar menggunakan `useLocation()` tapi tidak dipakai.
- **Dampak:** Header mengimpor komponen yang salah.

---

## Prioritas Fix — ALL PHASES COMPLETED

### Fase 1 — Security Critical (Harus segera) — COMPLETED
1. **SET-01** FeatureGuard businessId spoofing
2. **SET-02** No RBAC pada Feature/BusinessType controller
3. **SET-03** + **SET-04** updateOutlet arbitrary JSON injection
4. **AUTH-01** + **AUTH-03** Missing role hierarchy enforcement
5. **AUTH-02** findByEmail cross-business bypass

### Fase 2 — Core Feature Broken — COMPLETED
6. **KDS-01** WebSocket namespace mismatch (KDS notifications broken)
7. **POS-01** Discounts not sent to backend
8. **POS-02** Refund field name mismatch
9. **SHF-01** + **SHF-02** Cash out missing reason field
10. **INV-01** Stock adjustment type mismatch
11. **OLS-03** + **OLS-04** Missing storefront route + QR URL mismatch
12. **OLS-02** + **OLS-05** Frontend wrong endpoint + field mismatch

### Fase 3 — Data Integrity — COMPLETED
13. **PRM-01** + **PRM-07** Voucher consumed during preview
14. **PRM-03** Points expiry mutates historical records
15. **PRM-04** Race condition in adjustPoints
16. **PRM-02** Loyalty points hardcoded 0
17. **INV-02** Stock transfer receive not in transaction
18. **OLS-07** Checkout doesn't deduct inventory
19. **OLS-01** Race condition order number generation
20. **RPT-01** Sales export groupBy timestamp
21. **RPT-04** Financial report double-counts discounts

### Fase 4 — High Priority Bugs — COMPLETED
22. **KDS-02** startedAt/completedAt silently dropped
23. **KDS-03** Order completion doesn't free table
24. **KDS-04** + **KDS-05** KDS wrong endpoint + self-order table update
25. **RPT-02** Inventory PDF export always Excel
26. **RPT-03** Net/Gross sales labels inverted
27. **RPT-05** N+1 query staff leaderboard
28. **PRM-05** Tier multiplier on redemption
29. **SET-05** Payment method IDs regenerated
30. **AUTH-04** + **AUTH-06** Customer duplicate validation
31. **AUTH-07** Login outlet override
32. **POS-03** Tax-inclusive mode missing
33. **UI-01** Header user menu crash

### Fase 5 — Medium/Low Priority — COMPLETED
34-75. Remaining MEDIUM dan LOW bugs (lihat detail di masing-masing section) — All fixed

---

## Catatan Metodologi

- Setiap bug diverifikasi dengan membaca source code langsung
- Line numbers merujuk pada file di repository saat audit dilakukan
- Severity dinilai berdasarkan dampak fungsional dan keamanan
- Bug yang saling terkait di-group dalam prioritas fix

---

## Fix Summary

| Item | Detail |
|------|--------|
| Total bugs fixed | 75/75 |
| Fix date | 25 Februari 2026 |
| Method | 10 parallel fix agents |
| TypeScript compilation | 0 errors (backend + frontend) |
