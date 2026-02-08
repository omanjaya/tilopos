# 🔍 TiloPOS Integration Audit Report

> **Audit Date:** 08 Februari 2026  
> **Auditor:** System Analysis  
> **Status:** Critical Issues Found

---

## 📋 Executive Summary

Audit ini mengidentifikasi **masalah integrasi kritis** antara modul-modul TiloPOS. Walaupun arsitektur event-driven sudah terbangun dengan baik (TransactionCreatedEvent → OrderStatusChangedEvent), **implementasi frontend** mengalami masalah sinkronisasi data dan outlet context yang menyebabkan banyak halaman stuck di loading state.

### Key Findings

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 3 | Payment button unresponsive, KDS stuck loading, Data inconsistency |
| 🟡 Major | 5 | Backoffice pages stuck loading, WebSocket errors |
| 🟢 Minor | 4 | TODO implementations, console.log di production |

---

## 🔴 Critical Issues

### 1. Payment Button Unresponsive di POS Terminal

**Problem:** Tombol "Bayar" di payment modal tidak merespon click, mencegah penyelesaian transaksi.

**Location:** 
- `packages/web/src/features/pos/components/payment-panel.tsx`

**Business Impact:** 
- Kasir tidak bisa menyelesaikan transaksi
- Flow POS → KDS → Report terputus di step pertama

**Root Cause Analysis:**
```typescript
// Kemungkinan issue:
// 1. Button disabled tidak dihandle dengan benar
// 2. onClick handler tidak fire karena state management issue
// 3. Mutation pending state blocking
```

**Recommended Fix:**
1. Cek apakah ada error di console saat click
2. Verify `createTransaction.isPending` state
3. Add loading indicator pada button

---

### 2. KDS Stuck di Loading State

**Problem:** Halaman KDS menampilkan "Memuat pesanan..." indefinitely.

**Location:**
- `packages/web/src/features/kds/kds-page.tsx`
- `packages/web/src/features/kds/hooks/useKdsOrders.ts`

**Business Impact:**
- Kitchen tidak bisa melihat order yang masuk
- Order tidak bisa di-bump/selesaikan
- Flow POS → KDS terputus

**Root Cause Analysis:**
```typescript
// KDS menggunakan outletId dari store
const outletId = selectedOutletId || user?.outletId || '';

// Jika outletId kosong, API call gagal atau return empty
// useKdsOrders(outletId) akan stuck jika outletId invalid
```

**Recommended Fix:**
1. Tambah validation untuk outletId sebelum fetch
2. Show outlet selector jika outletId belum dipilih
3. Improve error handling untuk API failures

---

### 3. Data Inconsistency: Dashboard vs Detail Pages

**Problem:** Dashboard menunjukkan 9 transaksi, tapi halaman Transactions menunjukkan "Belum ada transaksi".

**Location:**
- `packages/web/src/features/dashboard/` (uses different API)
- `packages/web/src/features/transactions/transactions-page.tsx`

**Business Impact:**
- User bingung melihat data berbeda
- Tidak bisa trace transaksi yang sudah tercatat

**Root Cause Analysis:**
```typescript
// Transactions API tidak mengirim outletId
transactionsApi.list({
  search: search || undefined,
  status: statusFilter !== 'all' ? (statusFilter as TransactionStatus) : undefined,
  // ❌ MISSING: outletId parameter!
});

// Bandingkan dengan Dashboard yang mungkin filter by outletId
```

**Recommended Fix:**
```typescript
// Di transactions-page.tsx, tambahkan:
const selectedOutletId = useUIStore((s) => s.selectedOutletId);
const user = useAuthStore((s) => s.user);
const outletId = selectedOutletId ?? user?.outletId;

// Di useQuery:
transactionsApi.list({
  outletId, // ← ADD THIS
  search,
  status,
  ...
});
```

---

## 🟡 Major Issues

### 4. Backoffice Pages Stuck Loading

**Affected Pages:**
- Products (`/app/products`)
- Inventory (`/app/inventory`)  
- Orders (`/app/orders`)
- Reports (`/app/reports`)
- Customers (`/app/customers`)
- Employees (`/app/employees`)

**Common Pattern:**
Semua page ini **tidak** mengirim `outletId` ke API, atau API backend memerlukan outlet context yang belum di-provide.

**Location Examples:**
```typescript
// products.api.ts - tidak ada outletId
productsApi.list(params?: PaginationParams & { categoryId?: string })

// Seharusnya:
productsApi.list(params?: PaginationParams & { categoryId?: string; outletId?: string })
```

---

### 5. WebSocket Connection Issues

**Problem:** Console menunjukkan "WebSocket connection failed" repeatedly.

**Impact:**
- Real-time updates tidak bekerja
- KDS tidak receive order updates
- Notifications tidak real-time

**Root Cause:**
- WebSocket server mungkin tidak running di Docker
- Auth token mungkin tidak valid untuk WS connection
- CORS atau network configuration issue

**Recommended Fix:**
1. Verify WS server running di Docker (`docker logs`)
2. Check WS authentication flow
3. Add reconnection logic dengan exponential backoff

---

### 6. Sync Service Issues

**Problem:** Status bar menunjukkan "Menyinkronkan..." indefinitely.

**Location:** `packages/web/src/services/sync/sync-engine.service.ts`

**Impact:**
- Offline-first capability compromised
- Data mungkin tidak tersinkron ke server

---

## 🟢 Minor Issues

### 7. TODO Implementations di Backend

```typescript
// analytics.service.ts (6 TODOs)
// TODO: Implement with actual database queries (x5)
// TODO: Implement with ML-based predictions

// promotion-rules.engine.ts (2 TODOs)
// TODO: Implement customer segment checking
// TODO: Check category IDs

// transaction-event.listener.ts (1 TODO)
// TODO: Add to dead letter queue for retry
```

**Impact:** Database queries untuk analytics belum diimplementasi, menggunakan mock data.

---

### 8. Console.log in Production Code

**Location:** `packages/web/src/services/sync/sync-engine.service.ts:201`
```typescript
console.log(`Retry attempt ${attempt} for ${item.id} in ${delay}ms`);
```

**Recommendation:** Replace dengan proper logger service.

---

## 📊 Business Flow Analysis

### Expected Flow: POS → KDS → Report

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXPECTED BUSINESS FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] POS Transaction                                                         │
│       │                                                                      │
│       ├──► CreateTransactionUseCase.execute()                               │
│       │         │                                                            │
│       │         └──► EventBus.publish(TransactionCreatedEvent)              │
│       │                     │                                                │
│       ▼                     ▼                                                │
│  [2] Event Listeners                                                         │
│       │                                                                      │
│       ├──► TransactionToOrderHandler (creates KDS order)                    │
│       │         │                                                            │
│       │         └──► CreateOrderUseCase.execute()                           │
│       │                     │                                                │
│       │                     └──► EventBus.publish(OrderStatusChangedEvent)  │
│       │                                 │                                    │
│       │                                 ▼                                    │
│       │                         KDSGateway (WebSocket broadcast)             │
│       │                                                                      │
│       ├──► TransactionEventListener                                          │
│       │         ├──► deductIngredients() (stock update)                      │
│       │         ├──► addLoyaltyPoints() (customer loyalty)                   │
│       │         └──► logAudit() (audit log)                                  │
│       │                                                                      │
│       └──► NotificationsGateway (real-time notification)                     │
│                                                                              │
│  [3] KDS Display                                                             │
│       │                                                                      │
│       └──► Kitchen receives & prepares order                                 │
│                 │                                                            │
│                 └──► Bump item → UpdateOrderStatusUseCase                    │
│                           │                                                  │
│                           └──► OrderStatusChangedEvent                       │
│                                     │                                        │
│                                     ▼                                        │
│                               OrderEventListener                             │
│                                     │                                        │
│                                     └──► logAudit()                          │
│                                     └──► handleOrderCompleted() (if done)    │
│                                                                              │
│  [4] Reports                                                                 │
│       │                                                                      │
│       └──► ReportsController fetches aggregated data from DB                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current Status

| Step | Component | Backend | Frontend | Integration |
|------|-----------|---------|----------|-------------|
| 1 | POS Transaction | ✅ | ⚠️ Payment button issue | 🔴 Broken |
| 2a | Create KDS Order | ✅ | N/A | ✅ Works |
| 2b | Deduct Ingredients | ✅ | N/A | ✅ Works |
| 2c | Add Loyalty Points | ✅ | N/A | ✅ Works |
| 3 | KDS Display | ✅ | ⚠️ Loading stuck | 🔴 Broken |
| 4 | Reports | ⚠️ TODOs | ⚠️ Loading stuck | 🔴 Broken |

---

## 🔧 Comparison with Moka POS Features

Based on `Docs/research/01-moka-pos-analysis.md`:

### Features Implemented but Broken

| Feature | Moka POS | TiloPOS Status | Issue |
|---------|----------|----------------|-------|
| POS Transaction | ✅ | ⚠️ | Payment button unresponsive |
| KDS | ❌ (printer only) | ⚠️ | Loading stuck |
| Multi-outlet | ✅ | ⚠️ | Outlet context not propagated |
| Transaction History | ✅ | ⚠️ | Shows empty despite data exists |
| Reports | ✅ | ⚠️ | Loading stuck |
| Inventory | ✅ | ⚠️ | Loading stuck |

### Features Not Yet Integrated

| Feature | Moka POS | TiloPOS | Priority |
|---------|----------|---------|----------|
| Online Order Integration | GoFood, GrabFood, ShopeeFood | Planned (gateway created) | HIGH |
| Payment Gateway | Xendit, Midtrans | Backend ready, frontend pending | HIGH |
| Stock Alert Notifications | ✅ | Event exists, no frontend handler | MEDIUM |
| Customer Display | ✅ | Not implemented | LOW |
| Offline Mode | ❌ | Architecture ready, sync broken | HIGH |

---

## 📝 Recommended Action Plan

### Phase 1: Fix Critical Issues (1-2 days)

1. **Fix Payment Button**
   - Debug click handler di payment-panel.tsx
   - Verify mutation state management
   - Add error boundaries

2. **Fix Outlet Context Propagation**
   - Ensure selectedOutletId available di semua pages
   - Pass outletId ke semua API calls yang memerlukan
   - Add outlet selector mandatory untuk pages yang require it

3. **Fix Data Fetching**
   - Add outletId parameter ke transactions.api.ts
   - Add outletId parameter ke products.api.ts
   - Verify backend endpoints accept outletId filter

### Phase 2: Fix WebSocket & Real-time (2-3 days)

1. **Debug WebSocket Connection**
   - Check Docker container logs
   - Verify WS authentication
   - Add reconnection logic

2. **Fix Sync Service**
   - Debug sync-engine.service.ts
   - Add proper error handling
   - Show sync status indicator

### Phase 3: Complete TODO Implementations (3-5 days)

1. **Analytics Service**
   - Implement actual database queries
   - Replace mock data

2. **Promotion Rules Engine**
   - Implement customer segment checking
   - Implement category ID validation

---

## 🧪 Testing Checklist

```markdown
## Manual Test Cases

### TC-001: Complete Transaction Flow
- [ ] Login sebagai Cashier (dewi@brewbites.id / 1234)
- [ ] Pilih outlet "Brew & Bites - Senopati"
- [ ] Buka POS Terminal
- [ ] Tambah produk ke cart
- [ ] Klik "Bayar"
- [ ] Pilih metode pembayaran Cash
- [ ] Klik tombol final "Bayar Rp XXX"
- [ ] Verify: Transaksi berhasil, receipt ditampilkan

### TC-002: POS to KDS Flow
- [ ] Selesaikan transaksi dengan orderType = dine_in
- [ ] Login sebagai Kitchen (joko@brewbites.id / 1234)
- [ ] Buka KDS
- [ ] Verify: Order muncul di KDS dalam 5 detik
- [ ] Bump order item
- [ ] Verify: Status berubah ke "preparing"

### TC-003: Transaction History
- [ ] Setelah transaksi, buka Riwayat Transaksi
- [ ] Verify: Transaksi baru muncul di list
- [ ] Klik detail transaksi
- [ ] Verify: Detail lengkap ditampilkan

### TC-004: Reports Reflect Transaction
- [ ] Buka Reports setelah transaksi
- [ ] Verify: Sales report ter-update
- [ ] Verify: Product report menunjukkan item terjual
```

---

## 📊 Module Dependency Matrix

```
                    ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┐
                    │  POS  │  KDS  │ Trans │Report │ Inven │Product│ Cust  │ Shift │
┌───────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ Outlet Context    │  ✅   │  ⚠️   │  ❌   │  ⚠️   │  ❌   │  ❌   │  ❌   │  ⚠️   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ Auth/User         │  ✅   │  ✅   │  ✅   │  ✅   │  ✅   │  ✅   │  ✅   │  ✅   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ WebSocket         │  ⚠️   │  ⚠️   │  ❌   │  ❌   │  ❌   │  ❌   │  ❌   │  ❌   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ Event Bus         │  ✅   │  ✅   │  N/A  │  N/A  │  ✅   │  N/A  │  ✅   │  ✅   │
├───────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ API Integration   │  ✅   │  ⚠️   │  ⚠️   │  ⚠️   │  ⚠️   │  ⚠️   │  ⚠️   │  ⚠️   │
└───────────────────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘

Legend: ✅ Working  ⚠️ Broken/Issues  ❌ Not Implemented
```

---

## Conclusion

TiloPOS memiliki **arsitektur backend yang solid** dengan event-driven pattern yang benar. Masalah utama ada di **frontend integration**:

1. **Outlet context tidak terpropagasi** ke semua API calls
2. **WebSocket connection** gagal, mempengaruhi real-time features
3. **Payment flow** terputus karena button unresponsive

**Prioritas tertinggi:** Fix payment button dan outlet context propagation untuk memungkinkan complete business flow POS → KDS → Report.
