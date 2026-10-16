# TiloPOS Engineering Rules

Rule-rule ini diturunkan dari audit menyeluruh September 2026: **2.188 temuan** (60 kritis, 326 tinggi) di backend dan web.
Data mentahnya ada di [`audit/findings-2026-09.jsonl`](audit/findings-2026-09.jsonl), satu temuan per baris dengan tag `pattern`.
Setiap rule di bawah menutup satu atau beberapa pola, dan angka di judulnya adalah jumlah temuan dari pola tersebut.

Kolom **Ditegakkan oleh** menunjukkan apa yang otomatis menolak pelanggaran. Rule tanpa penegakan otomatis wajib dicek saat code review.

| # | Rule | Pola | Ditegakkan oleh |
|---|---|---|---|
| R1 | Autentikasi global, publik harus eksplisit | AUTHZ | `APP_GUARD` JWT + test `route-policy.spec.ts` |
| R2 | Token hanya untuk satu tujuan | AUTHZ, TENANT | `jwt.strategy.ts` + test |
| R3 | Tenant selalu dari JWT, setiap ID dari client diverifikasi | TENANT | `TenantAccessService` + review |
| R4 | Tidak ada `undefined` di filter Prisma | TENANT | middleware Prisma `strictWhere` (runtime) |
| R5 | Setiap mutasi punya `@Roles` | AUTHZ, F_RBAC | test `route-policy.spec.ts` |
| R6 | Semua input lewat class DTO | VALIDATION | ESLint `no-restricted-syntax` |
| R7 | Tidak menyimpan body mentah (mass assignment) | VALIDATION | ESLint + review |
| R8 | Server adalah sumber kebenaran untuk uang | TRUST_CLIENT, MONEY | review + test use-case |
| R9 | Tulis-berganda harus atomik dan idempoten | ATOMICITY, CRON | review + test konkurensi |
| R10 | Tidak ada sukses palsu | MOCK_PROD, F_FAKE | validasi env + review |
| R11 | Error tidak boleh ditelan | SWALLOW, F_ERROR | ESLint `no-empty` + review |
| R12 | Jangan bocorkan field sensitif | DATA_EXPOSURE | ESLint (`include: { employee: true }`) |
| R13 | List wajib berhalaman | UNBOUNDED, N_PLUS_1 | `PaginationQueryDto` + review |
| R14 | Waktu bisnis = Asia/Jakarta | TIMEZONE | helper `business-time.ts` |
| R15 | Nomor dokumen per tenant, kode publik kriptografis | NUMBERING | ESLint (`Math.random`) |
| R16 | Env divalidasi saat boot | CONFIG | `env.validation.ts` |
| R17 | Skema: index, onDelete, unique per tenant, migrasi resmi | NEW:SCHEMA, SCHEMA_DRIFT | `prisma migrate diff` di CI |
| R18 | Controller tipis | LAYERING | ESLint (warn) |
| F1 | Kontrak API frontend harus sama dengan backend | F_API | tipe response + review |
| F2 | Setiap query punya state error | F_ERROR | review |
| F3 | Guard route frontend mengikuti `@Roles` backend | F_RBAC | `config/permissions.ts` |
| F4 | Data privat tidak di-cache; token aman | F_SECURITY | review |
| F5 | Offline sync idempoten dan tidak hilang | F_OFFLINE | test sync |
| F6 | Aksesibilitas & bahasa | F_A11Y, F_I18N | ESLint (tombol ikon) |
| G1 | Kode mati dihapus, dokumen harus jujur | DEAD, F_DEAD | review |

---

## Backend

### R1 — Autentikasi global, publik harus eksplisit (AUTHZ · 59)

**Masalah:** `JwtAuthGuard` dipasang per controller, sedangkan `FeatureGuard` dan `BusinessScopeGuard` global berjalan **lebih dulu**, saat `request.user` belum ada. Akibatnya `FeatureGuard` membaca `?businessId=` dari URL, sehingga paywall bisa dilewati dan user sah justru mendapat 403.

**Aturan:**
- `JwtAuthGuard` terdaftar sebagai `APP_GUARD` global di `app.module.ts`, dan berjalan sebelum semua guard otorisasi. Urutannya: `ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard` → `BusinessScopeGuard` → `FeatureGuard`.
- Route tanpa login wajib diberi `@Public()` (`@shared/decorators/public.decorator`). Tidak ada `@UseGuards(JwtAuthGuard)` baru di controller.
- Guard apa pun hanya membaca identitas dari `request.user`, **tidak pernah** dari params, query atau body.

**Ditegakkan:** test `test/unit/route-policy.spec.ts` memindai semua route. Route `@Public()` harus ada di allowlist di file test itu, sehingga menambah route publik berarti mengubah test dan terlihat saat review.

### R2 — Token hanya untuk satu tujuan (AUTHZ · TENANT)

**Masalah:** token MFA dan token verifikasi email ditandatangani dengan secret yang sama dengan access token, dan `jwt.strategy.ts` menerima keduanya. Akibatnya MFA bisa dilewati dan query berjalan dengan `businessId = undefined`.

**Aturan:**
- Access token wajib punya `typ: 'access'`, `sub`, `businessId` dan `role`. Strategy menolak token lain.
- Token tujuan khusus (MFA, verifikasi email, reset) memakai `PurposeTokenService` dengan secret turunan per tujuan, dan diverifikasi hanya di endpoint tujuannya.
- WebSocket gateway memverifikasi lewat fungsi yang sama (`verifyAccessToken`), bukan `jwtService.verify` langsung.

### R3 — Tenant selalu dari JWT, setiap ID dari client diverifikasi (TENANT · 202)

**Masalah:** query `findUnique({ id })` tanpa `businessId`. `outletId`, `customerId`, `productId` dan `employeeId` dari body dipakai begitu saja, dan bahkan `{ businessId: user.businessId, ...dto }` membiarkan body menimpa tenant.

**Aturan:**
- `businessId` **hanya** berasal dari `@CurrentUser()`. Jangan pernah membacanya dari body atau query, dan jangan pernah `...dto` setelah `businessId`.
- Setiap read, update atau delete by id harus menyertakan scope tenant di `where`, langsung (`{ id, businessId }`) atau lewat relasi (`{ id, outlet: { businessId } }`). Untuk update/delete, gunakan `updateMany`/`deleteMany` dengan scope itu lalu cek `count`, atau `findFirst` dengan scope terlebih dulu.
- Setiap ID asing dari client (outlet, product, variant, customer, employee, supplier, promotion, shift, dll.) diverifikasi dengan `TenantAccessService`:
  ```ts
  await this.tenant.assertOutlet(user, dto.outletId);          // outlet milik bisnis & boleh diakses user
  const outletIds = await this.tenant.resolveOutletIds(user, query.outletId); // list: satu outlet atau semua outlet milik bisnis
  await this.tenant.assertOwned('product', productIds, user.businessId);
  ```
- Query list per outlet memakai `outletId: { in: outletIds }` hasil `resolveOutletIds`, **bukan** `outletId` mentah dari query.

### R4 — Tidak ada `undefined` di filter Prisma (TENANT, 13 kritis)

**Masalah:** Prisma **mengabaikan** kunci bernilai `undefined`. `findFirst({ where: { id: undefined, businessId } })` cocok ke outlet mana saja, dan `findMany({ where: { outletId: undefined } })` mengembalikan data semua tenant.

**Aturan:** nilai filter wajib divalidasi dulu (DTO `@IsUUID()` tanpa `@IsOptional`), atau diganti dengan `resolveOutletIds`.

**Ditegakkan:** middleware `strictWhere` di `PrismaService` melempar error bila `where` memuat `undefined` untuk kunci `id`, `businessId`, `outletId`, `customerId`, `employeeId`, `productId` atau `storeId`. Error ini sengaja dibuat keras supaya bug terlihat di dev dan test, bukan diam-diam bocor.

### R5 — Setiap mutasi punya `@Roles` (AUTHZ · F_RBAC)

**Masalah:** kasir bisa mengubah tipe outlet (yang menghapus katalog), price tier dan fitur outlet, sementara owner bisa merilis versi aplikasi global.

**Aturan:**
- Setiap route `POST`/`PUT`/`PATCH`/`DELETE` yang tidak `@Public()` wajib punya `@Roles(...)`.
- Aksi platform (lintas tenant, misalnya `devices/versions`) hanya untuk `super_admin`.
- Aksi terhadap karyawan memakai `canManageRole`, sehingga tidak ada yang bisa mengelola role yang setara atau lebih tinggi.

**Ditegakkan:** `route-policy.spec.ts` gagal untuk mutasi tanpa `@Roles` yang tidak ada di allowlist.

### R6 — Semua input lewat class DTO (VALIDATION · 156)

**Masalah:** `@Body() dto: { ... }`, interface atau `Record<string, unknown>` tidak divalidasi oleh `ValidationPipe`. Akibatnya kuantitas negatif menambah stok, poin negatif menambah saldo, dan sebagainya.

**Aturan:**
- `@Body()` dan `@Query()` wajib bertipe **class** dengan dekorator class-validator.
- Angka: `@IsInt()` / `@IsNumber()` + `@Min()` (kuantitas ≥ 1, uang ≥ 0) + `@Max()` yang wajar.
- ID: `@IsUUID()`. String: `@MaxLength()`. Array: `@ArrayMaxSize()`. Nested: `@ValidateNested({ each: true }) @Type(() => X)`.
- Query angka memakai `@Type(() => Number)`.

**Ditegakkan:** ESLint `no-restricted-syntax` menolak `@Body()`/`@Query()` bertipe literal objek atau `Record`.

### R7 — Tidak menyimpan body mentah (VALIDATION, mass assignment)

**Masalah:** `prisma.x.update({ data: body })` memungkinkan client mengubah `businessId`, `usedCount`, `loyaltyPoints` atau `totalSpent`.

**Aturan:** `data` Prisma dibangun dari field yang disebut satu per satu (`{ name: dto.name, ... }`). Tidak ada `data: dto`, `data: body` atau `data: { ...dto }` untuk entitas milik tenant. Field turunan (saldo, counter, total, status finansial) tidak pernah diterima dari client.

### R8 — Server adalah sumber kebenaran untuk uang (TRUST_CLIENT · 25, MONEY · 66)

**Masalah:** harga, diskon, ongkir dan `transactionTotal` untuk poin dikirim oleh client. Total dihitung dengan float JS.

**Aturan:**
- Harga dibaca dari DB (product, variant, bundle, modifier, price tier). Override harga hanya boleh bila fitur `pos_price_editing` aktif **dan** role ≥ supervisor, dan dicatat di audit log.
- Diskon hanya boleh dari promosi atau voucher yang divalidasi di server (tenant, aktif, periode, kuota, syarat), atau diskon manual dengan batas per role.
- Poin loyalty dihitung dari transaksi di DB, bukan angka dari client.
- Aritmetika uang memakai helper `@shared/utils/money` (berbasis `Prisma.Decimal`, dibulatkan ke rupiah). Jangan menjumlah `Number(decimal)` berkali-kali.
- Hasil gateway pembayaran **wajib** dicek. Pembayaran non-tunai berstatus `pending` sampai webhook atau konfirmasi masuk.

### R9 — Tulis-berganda harus atomik dan idempoten (ATOMICITY · 131, CRON · 18)

**Masalah:** refund, void, receive PO/transfer dan complete opname dicek di luar transaksi sehingga bisa dijalankan dua kali. Stok ditulis dengan pola read-modify-write. Webhook, cron dan submit self-order tidak idempoten.

**Aturan:**
- Operasi yang menulis ≥ 2 baris dijalankan dalam satu `$transaction`.
- Transisi status memakai **update bersyarat**: `updateMany({ where: { id, businessId, status: 'pending' }, data: { status: 'received' } })`. Jika `count === 0`, lempar conflict.
- Stok diubah dengan `increment`/`decrement` atomik, dan untuk pengurangan dengan syarat `quantity >= n` (atau `SELECT … FOR UPDATE`). Jangan pernah `quantity: current - n`.
- Webhook, sync offline dan job memakai kunci idempoten (`clientTransactionId`, `externalId`, unique `(outletId, date, method)`).
- Setiap `@Cron` memakai `timeZone: BUSINESS_TZ` dan dibungkus `DistributedLockService.runExclusive(key, ttl, fn)`, sehingga hanya satu replika yang menjalankannya.

### R10 — Tidak ada sukses palsu (MOCK_PROD · 60, F_FAKE · 55)

**Masalah:** gateway mock selalu sukses di produksi, QRIS dan VA palsu, email/WA/push melapor "terkirim" padahal tidak, dan endpoint integrasi mengembalikan stub `success: true`.

**Aturan:**
- Di `NODE_ENV=production`, provider wajib yang tidak dikonfigurasi membuat aplikasi **gagal boot** (lihat R16).
- Provider opsional yang tidak dikonfigurasi mengembalikan `{ success: false, reason: 'NOT_CONFIGURED' }` atau `501`, bukan sukses.
- Fitur yang belum diimplementasi mengembalikan `501 Not Implemented` dan disembunyikan di UI. Jangan pernah menandai "Done" di dokumentasi.
- UI tidak menampilkan toast sukses tanpa respons sukses dari server (tidak ada `setTimeout(() => toast('berhasil'))`).

### R11 — Error tidak boleh ditelan (SWALLOW · 35, F_ERROR · 121)

**Aturan:**
- Tidak ada `catch {}` kosong. Jika error memang boleh diabaikan, tulis `// intentionally ignored: <alasan>` dan log di level `warn`.
- Jangan `return []` atau `return null` di `catch` jika pemanggil perlu tahu ada kegagalan. Lempar ulang, atau kembalikan tipe hasil yang eksplisit.
- Event listener yang gagal (stok, loyalty) masuk ke retry queue, bukan hanya di-log.
- Webhook mengembalikan non-2xx bila pemrosesan gagal, supaya gateway mengirim ulang.

**Ditegakkan:** ESLint `no-empty` (`allowEmptyCatch: false`).

### R12 — Jangan bocorkan field sensitif (DATA_EXPOSURE · 23)

**Masalah:** `include: { employee: true }` mengembalikan hash PIN, secret MFA dan tarif per jam. Endpoint publik mengembalikan HPP product.

**Aturan:**
- Relasi `employee` dan `customer` selalu memakai `select` dari konstanta `EMPLOYEE_PUBLIC_SELECT` / `CUSTOMER_PUBLIC_SELECT` (`@shared/constants/selects`).
- Endpoint publik (self-order, storefront) memakai select eksplisit tanpa `costPrice`.
- Response update employee tidak pernah memuat `pin`, `mfaSecret` atau `passwordHash`.

**Ditegakkan:** ESLint menolak `include: { employee: true }` dan sejenisnya.

### R13 — List wajib berhalaman (UNBOUNDED · 106, N_PLUS_1 · 55)

**Aturan:**
- Endpoint list menerima `PaginationQueryDto` (`page`, `limit`, maks 100) dan `findMany` memakai `take`/`skip`. Untuk export atau laporan, ada batas atas yang jelas.
- Tidak ada query di dalam loop. Ambil sekaligus dengan `findMany({ where: { id: { in: ids } } })` atau `groupBy`, lalu petakan di memori.

### R14 — Waktu bisnis = Asia/Jakarta (TIMEZONE · 51)

**Masalah:** `setHours(0,0,0,0)` memakai zona waktu server (UTC di Docker), sehingga "hari ini" dimulai pukul 07:00 WIB.

**Aturan:** semua batas hari, minggu dan bulan untuk laporan, settlement, shift dan nomor dokumen memakai `@shared/utils/business-time` (`startOfBusinessDay`, `businessDayRange`, `businessDateKey`, `BUSINESS_TZ = 'Asia/Jakarta'`). Frontend mengirim tanggal sebagai `YYYY-MM-DD`, bukan hasil `toISOString()` dari tengah malam lokal.

### R15 — Nomor dokumen per tenant, kode publik kriptografis (NUMBERING · 39)

**Aturan:**
- Nomor dokumen (struk, PO, transfer, opname, invoice) bersifat unik **per bisnis** (`@@unique([businessId, number])`) dan dibuat oleh `DocumentNumberService` (counter atomik per bisnis/prefix/tanggal), bukan `count + 1`.
- Kode yang bisa ditebak publik (sesi self-order, token) memakai `crypto.randomBytes`/`randomUUID`.

**Ditegakkan:** ESLint melarang `Math.random` di `src/` backend.

### R16 — Env divalidasi saat boot (CONFIG · 45)

**Aturan:** semua env dibaca lewat `ConfigService` yang divalidasi `config/env.validation.ts`. Variabel wajib di produksi (`JWT_SECRET` ≥ 32 karakter, `DATABASE_URL`, `CORS_ORIGIN`, `FRONTEND_URL`, kunci gateway pembayaran) membuat boot gagal bila kosong. Tidak ada default diam-diam seperti `localhost` atau `sandbox` untuk produksi. Setiap env baru wajib ditambahkan ke `.env.example`.

### R17 — Skema database (NEW:SCHEMA · 86, SCHEMA_DRIFT · 8)

**Aturan:**
- Setiap perubahan skema dilakukan lewat `prisma migrate dev`. **Tidak ada** file `.sql` lepas atau `db push` untuk lingkungan bersama.
- Setiap model tenant punya `businessId` + `@@index([businessId])`. Setiap FK yang dipakai di filter punya index.
- Kode yang dilihat user (voucher, nomor dokumen) unik per tenant: `@@unique([businessId, code])`.
- Relasi punya `onDelete` eksplisit: `Cascade` untuk item anak, `Restrict` untuk catatan finansial.
- Model yang bisa berubah punya `updatedAt @updatedAt`.
- Seeder yang menghapus data hanya boleh jalan bila `NODE_ENV !== 'production'` **dan** `ALLOW_DESTRUCTIVE_SEED=true`.

### R18 — Controller tipis (LAYERING · 45)

**Aturan:** controller hanya berisi routing, pengambilan user dan pemanggilan service/use-case. Tidak ada `PrismaService` baru di controller, dan logika bisnis ada di service atau use-case. `PrismaService` tidak di-provide ulang di modul fitur (`DatabaseModule` sudah global).

**Ditegakkan:** ESLint `no-restricted-imports` untuk `*.controller.ts` (level `warn` sampai utang lama lunas).

---

## Frontend

### F1 — Kontrak API harus sama dengan backend (F_API · 177)

**Masalah:** refund selalu 400, split bill 500, KDS crash karena bentuk response berbeda, storefront membaca nama field yang salah, dan ada endpoint yang tidak ada.

**Aturan:**
- Setiap fungsi di `src/api/endpoints/*` punya tipe request dan response yang sama persis dengan DTO dan response backend. Saat backend berubah, tipe frontend diubah di PR yang sama.
- Jangan mengirim parameter bernilai `undefined` untuk filter wajib. Jika user belum memilih outlet, jangan panggil API (`enabled: !!outletId`), atau gunakan endpoint "semua outlet" yang eksplisit.
- Jangan menambah tombol yang memanggil endpoint yang belum ada.

### F2 — Setiap query punya state error (F_ERROR · 121)

**Aturan:** setiap `useQuery` merender tiga state: loading, **error** (`<ErrorState onRetry={refetch} />`) dan kosong. Wrapper API tidak boleh `catch` lalu `return []`. Biarkan error naik ke React Query. Toast error hanya dari satu tempat (interceptor atau `onError`), tidak dua-duanya.

### F3 — Guard route mengikuti `@Roles` backend (F_RBAC · 77)

**Aturan:** role yang boleh membuka tiap route dan menu didefinisikan di satu tempat, `src/config/permissions.ts`, dan nilainya sama dengan `@Roles` endpoint yang dipanggil halaman itu. `RoleGuard` di route dan filter menu sidebar sama-sama membaca konfigurasi ini. Tombol aksi disembunyikan dengan `can(role, 'action')` dari konfigurasi yang sama.

### F4 — Data privat tidak di-cache, token aman (F_SECURITY · 11)

**Aturan:**
- Service worker **tidak** meng-cache `/api/*`. Logout menghapus `caches` dan IndexedDB milik user tersebut.
- Tidak menyimpan PIN atau secret di `localStorage`.
- Handler 401 global dikecualikan untuk `/auth/*`, karena PIN salah bukan berarti sesi berakhir.

### F5 — Offline sync idempoten dan tidak hilang (F_OFFLINE · 15)

**Aturan:**
- Transaksi offline membawa `clientTransactionId` (UUID) dan `occurredAt`. Backend men-dedupe berdasarkan `clientTransactionId`.
- Sync memakai base URL dan auth yang sama dengan `apiClient`, serta memakai lock supaya tidak jalan paralel.
- Logout diblokir (atau meminta konfirmasi) selama masih ada antrean. Antrean tidak dihapus otomatis oleh 401.
- Shift aktif di-cache lokal supaya checkout offline tidak memerlukan jaringan.

### F6 — Aksesibilitas & bahasa (F_A11Y · 73, F_I18N · 56)

**Aturan:**
- `<Button size="icon">` wajib punya `aria-label` (ditegakkan ESLint). Elemen yang bisa diklik harus berupa `<button>`/`<a>`, bukan `<div onClick>`.
- Teks yang dilihat user memakai Bahasa Indonesia secara konsisten.

---

## Umum

### G1 — Kode mati dihapus, dokumen harus jujur (DEAD · 85, F_DEAD · 84)

**Aturan:**
- Kode yang tidak di-import dihapus, bukan dibiarkan "untuk nanti". Git menyimpan riwayatnya.
- Dokumen progress hanya menandai "Done" bila fitur jalan end-to-end dan ada test-nya.
- Laporan sementara (`*-SUMMARY.md`, `REFACTORING_*.md`) tidak disimpan di dalam `src/`.

---

## Checklist PR

- [ ] Route baru: sudah `@Roles` (mutasi), atau `@Public()` + masuk allowlist?
- [ ] Semua `where` punya scope tenant, dan semua ID dari client diverifikasi (`TenantAccessService`)?
- [ ] Body dan query memakai class DTO dengan batas angka?
- [ ] Tidak ada `data: dto` mentah, harga/total dari client, atau float untuk uang?
- [ ] Operasi multi-tulis dalam `$transaction`, dengan transisi status bersyarat?
- [ ] Tidak ada `catch {}` kosong dan tidak ada sukses palsu?
- [ ] List memakai `take`, dan tidak ada query di dalam loop?
- [ ] Tanggal memakai `business-time`?
- [ ] Skema berubah → ada migrasi Prisma?
- [ ] Frontend: tipe API cocok, state error dirender, permission diambil dari `config/permissions.ts`?
