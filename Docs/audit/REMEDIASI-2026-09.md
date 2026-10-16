# Remediasi Audit September 2026

**Branch:** `fix/audit-2026-09` (dari `b709056`)
**Periode:** 26–29 September 2026
**Dokumen terkait:**
- [AUDIT-KEKURANGAN-2026-09-26.md](AUDIT-KEKURANGAN-2026-09-26.md): audit awal (sampling).
- [findings-2026-09.jsonl](findings-2026-09.jsonl): audit menyeluruh, satu temuan per baris. Setiap baris punya `status` dan `status_note`.
- [../ENGINEERING-RULES.md](../ENGINEERING-RULES.md): rule yang diturunkan dari pola temuan.

## Alur kerja

1. **Audit menyeluruh.** Setiap file non-test di backend dan web dibaca, dibagi ke 8 area. Setiap temuan diberi tag pola dari taksonomi yang sama.
2. **Pola → rule.** Pola yang berulang dijadikan 25 rule (R1–R18, F1–F6, G1). Rule yang bisa dicek mesin ditegakkan lewat lint, test, pemeriksaan saat runtime, atau validasi env.
3. **Fondasi.** Helper dan guard bersama dibangun lebih dulu, supaya perbaikan dikerjakan per pola, bukan tambal sulam per baris.
4. **Perbaikan.** Pertama skema database, lalu modul-modul secara paralel dengan kepemilikan file yang terpisah. Setelah itu tiga putaran handoff untuk perubahan lintas area (kontrak backend ↔ frontend).

## Hasil

| Severity | Temuan | Diperbaiki | Dilewati | Tidak relevan |
|---|---:|---:|---:|---:|
| Kritis | 60 | **60** | 0 | 0 |
| Tinggi | 326 | **324** | 2 | 0 |
| Sedang | 811 | 801 | 9 | 1 |
| Rendah | 991 | 935 | 51 | 5 |
| **Total** | **2.188** | **2.120** | **62** | **6** |

Semua temuan yang dilewati punya alasan di `status_note`. Hampir semuanya pekerjaan fitur atau keputusan pemilik (lihat di bawah).

### Verifikasi akhir (29 Sep 2026)

| Pemeriksaan | Sebelum | Sesudah |
|---|---|---|
| Backend `tsc --noEmit` | ✅ | ✅ 0 error |
| Backend ESLint (dengan rule baru) | — | ✅ 0 error, 17 warning R18 (utang layering di controller laporan) |
| Backend Jest | 592 test | ✅ **918 test**, 115 suite |
| Web `tsc -b` / `build:web` | ❌ 2 error, build gagal | ✅ build berhasil |
| Web ESLint | ✅ | ✅ 0 error |
| Web Vitest | 148 test (+18 file e2e salah jalur) | ✅ **195 test**, 28 file |
| Playwright `--list` | — | ✅ 554 test di 18 file terkompilasi (belum dijalankan terhadap server) |
| Migrasi dari DB kosong | drift dengan skema | ✅ `migrate deploy` sukses, `migrate diff` kosong, seed jalan |
| Image produksi (backend & web) | tidak reproducible | ✅ build dari root dengan `npm ci` + smoke test (oleh agent INFRA) |

## Perubahan utama

**Keamanan & tenant**
- Autentikasi global: guard berjalan dengan urutan Throttler → JWT → Roles → BusinessScope → Feature. Ada 46 route `@Public()` yang semuanya terdaftar di allowlist test.
- Setiap mutasi wajib punya `@Roles`, ditegakkan oleh `test/unit/route-policy.spec.ts`.
- Token MFA dan token verifikasi email ditandatangani dengan secret per tujuan, sehingga tidak bisa dipakai sebagai access token. Strategy JWT menolak token tanpa `businessId`/`role`, dan mengecek ulang status aktif karyawan.
- `TenantAccessService` menggantikan semua pemeriksaan outlet ad-hoc. Middleware Prisma `strictWhere` menolak filter tenant yang bernilai `undefined`.
- Lockout PIN per akun, throttle pada verifikasi MFA, secret MFA dienkripsi, dan login Google wajib `email_verified`.
- Service worker tidak lagi meng-cache `/api`, dan logout membersihkan cache.

**Uang & integritas data**
- Harga, diskon, promosi, voucher dan poin dihitung di server (`sale-pricing.service`, `promotion-rules.engine`). Aritmetika memakai `Prisma.Decimal`.
- Idempotensi lewat `clientTransactionId` (offline POS), refund dan void yang atomik dengan row lock, refund ditautkan lewat FK (`refundOfId`, `refundOfItemId`).
- Transisi status bersyarat (PO, transfer, opname, order, self-order) dan pengurangan stok atomik.
- Nomor dokumen per tenant lewat `DocumentNumberService`. Cron dijalankan dengan `timeZone: Asia/Jakarta` dan distributed lock.
- Gateway pembayaran tidak lagi jatuh ke mock di produksi, dan webhook memverifikasi nominal serta idempoten.

**Kejujuran fitur**
- Integrasi yang belum ada (GoFood/GrabFood/ShopeeFood, QRIS/e-wallet self-order, push notification, redirect Google) kini mengembalikan 501 / `NOT_CONFIGURED`, bukan sukses palsu.
- UI tidak lagi menampilkan sukses tanpa respons server, dan query yang gagal menampilkan `ErrorState`.

**Skema:** dua migrasi baru: `20260927000000_audit_2026_09_schema_hardening` dan `20260927100000_audit_2026_09_followups`. Isinya unique per tenant, index FK, `onDelete` eksplisit, `updatedAt`, model `TransferTemplate` dan `DocumentSequence`, serta partial unique index. Sebelum membuat unique baru, migrasi berhenti dengan pesan jelas bila ada data duplikat. Migrasi belum pernah diuji pada data produksi, jadi jalankan dulu di salinan data.

**Infra & dokumentasi:** manifest k8s bisa dirender, migrasi dijalankan lewat init container, Node 22 di semua tempat, dan CI kembali menjalankan test. Tersedia runbook backup/restore, README yang benar, `docs/` digabung ke `Docs/`, dan lisensi proprietary.

## Perubahan perilaku yang perlu diketahui

- **Login email + PIN:** email yang aktif di lebih dari satu bisnis ditolak sampai datanya dibersihkan.
- **Login Google:** alur redirect (`GET /auth/google`) mengembalikan 501. Login via token Google tetap ada di API, tetapi belum dipakai UI.
- **Poin loyalty:** earn = belanja ÷ `amountPerPoint`, dan satu poin bernilai `redemptionRate` rupiah saat ditukar (sesuai label di halaman pengaturan). Nilai penukaran berubah dari sebelumnya.
- **Diskon manual:** dibatasi 10% untuk kasir dan 50% untuk supervisor. Override harga hanya bila fitur `pos_price_editing` aktif dan role minimal supervisor.
- **Pembulatan Rp500:** hanya berlaku bila semua pembayaran tunai, dan disimpan di `roundingAmount`.
- **Boot produksi:** wajib `STORAGE_DRIVER`, `CORS_ORIGIN`, `FRONTEND_URL`, `REDIS_HOST` dan kunci gateway. `JWT_SECRET` minimal 32 karakter. `PAYMENT_GATEWAY=mock` ditolak.
- **Seeder destruktif:** hanya jalan dengan `ALLOW_DESTRUCTIVE_SEED=true` di luar produksi. `prisma migrate reset` juga memerlukannya.
- **Clock-in:** karyawan yang masih punya absensi terbuka dari hari sebelumnya harus clock-out dulu.

## Keputusan pemilik yang masih terbuka

1. **Email karyawan unik:** apakah per bisnis atau global? Perlu audit data terlebih dulu (F1053).
2. **Tag rilis & image:** base k8s memakai `ghcr.io/tilopos/*:0.1.0`, sementara belum ada CD maupun git tag.
3. **RabbitMQ 3 → 4.1:** volume 3.x perlu mengaktifkan feature flags terlebih dulu.
4. **Nilai tunable:** limit ingress 1200 req/menit per IP, nama namespace di NetworkPolicy, `JWT_EXPIRES_IN=7d`, dan `STORAGE_DRIVER=local` (atau `s3`).
5. **Integration test di CI:** jadikan blocking setelah stabil.
6. **Upgrade besar yang ditunda:** ESLint 9, Prisma 6, React 19, Tailwind 4.

## Follow-up (pekerjaan fitur, sengaja tidak dikerjakan)

- Access token berumur pendek + refresh token di cookie httpOnly (F1480, F2013).
- Held bill disimpan di server (F1803): selesai pada 17 Oktober, lihat hasil di bawah.
- Pengirim laporan terjadwal (F1848), tabel `ProductTranslation` (F0402), model `Reservation`.
- Redis adapter untuk Socket.IO saat backend dijalankan multi-replika (F0484, F0568).
- Menyatukan dua stack notifikasi (F0562), integrasi batch lot dengan stok (F0762), migrasi record domain ke `Decimal` (F1245).
- 17 warning R18: memindahkan query Prisma dari controller laporan ke service.
- Menjalankan Playwright e2e terhadap server nyata.

## Follow-up autentikasi — 30 September 2026

F1480/F2013 sudah mendapat implementasi sesi browser, tetapi status tetap `skipped`
untuk bagian umur access token. Pemilik memilih **mempertahankan `JWT_EXPIRES_IN`**;
nilai 15 menit belum diterapkan. Angka pada tabel hasil di atas tetap merupakan
snapshot audit 29 September, bukan klaim bahwa follow-up ini selesai seluruhnya.

- Access token hanya berada di memori. Token lama di localStorage dibuang saat aplikasi
  dimuat; profil lokal dipertahankan untuk identitas operator saat checkout offline.
- Migrasi `20260929160129_auth_refresh_sessions` menambahkan keluarga sesi dan hash
  SHA-256 token acak 256-bit. Rotasi memakai transaksi dan row lock keluarga; reuse
  mencabut seluruh keluarga dengan commit sebelum respons 401. Token mentah hanya
  dikirim lewat cookie, tidak disimpan di DB atau dikembalikan dalam JSON.
- Login PIN, register, Google token, dan penyelesaian MFA memasang cookie
  `tilopos_refresh`, `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`.
  `POST /auth/refresh` merotasi cookie; `POST /auth/logout` mencabut keluarga walaupun
  access token sudah expired. Access token baru membawa `typ=access` dan `sid`.
- Akses HTTP memeriksa sesi tanpa cache; handshake WebSocket memeriksa sesi, dan
  koneksi yang sudah terbuka diputus saat token expired atau paling lambat sekitar
  30 detik setelah revocation (ditambah latensi DB). Frontend memulihkan koneksi
  menggunakan refresh yang sama dengan request HTTP.
- Semua endpoint yang memasang atau mengubah cookie memerlukan header
  `X-TiloPOS-Session: 1`; Origin browser harus ada dalam `CORS_ORIGIN`. Origin eksplisit
  dipakai bersama oleh CORS dan pemeriksaan CSRF. Client memakai `withCredentials`.
- Refresh frontend memakai satu promise untuk request serentak dan Web Locks untuk
  serialisasi lintas tab bila tersedia. Antrean offline tidak boleh di-replay dengan
  akun pengganti. Identitas pembuat antrean legacy juga dipertahankan; record tanpa
  identitas pembuat tetap tersimpan dan memerlukan rekonsiliasi manual.
- Logout offline menghapus sesi perangkat dan mencatat revocation tertunda; UI
  menyatakan bahwa revocation server dilakukan setelah koneksi pulih. Kegagalan
  logout online ditampilkan sebagai kegagalan, dan antrean penjualan tetap utuh.

### Catatan penerapan

Jalankan migrasi sebelum menjalankan backend baru. Sesi JWT lama tanpa `sid` ditolak,
sehingga pengguna perlu login ulang sekali setelah upgrade. Jangan mengubah
`JWT_EXPIRES_IN` sebelum mendapat keputusan pemilik berikutnya.

`REFRESH_TOKEN_EXPIRES_IN` adalah umur absolut keluarga (default 7d, maksimum 30d),
bukan perpanjangan tanpa batas setiap rotasi. Pertahankan HTTPS dan origin frontend/API
pada site yang sama agar cookie Secure/SameSite=Strict dapat dipakai. Pengembangan
HTTP hanya didukung pada localhost yang diperlakukan browser sebagai lingkungan
tepercaya; alamat LAN HTTP perlu HTTPS. Request API non-browser untuk login/refresh/
logout juga harus mengirim header sesi dan menyimpan cookie sendiri.

Tes PostgreSQL dan HTTP sesi berjalan dengan `AUTH_TEST_DATABASE_URL` yang menunjuk
ke database sementara terisolasi; suite tersebut sengaja di-skip bila variabel tidak
ada. Tidak ada seed destruktif atau perubahan pada container proyek lain.

### Usulan penegakan F4 (belum mengubah aturan)

Tambahkan larangan menyimpan access token di browser storage, kewajiban revocation
server untuk logout/refresh reuse, serta larangan replay mutasi offline setelah
identitas operator berubah. Tes regresi untuk ketiganya sudah disertakan.

### Verifikasi follow-up

Dijalankan dengan Node **22.23.3**:

- Prisma generate, backend `tsc --noEmit -p tsconfig.json`, dan web `tsc -b --noEmit`: lulus.
- ESLint backend: 0 error, 17 warning R18 lama; ESLint web: 0 error.
- Jest: **119 suite / 939 test lulus**, termasuk 5 tes PostgreSQL/HTTP sesi.
- Vitest: **29 file / 205 test lulus**.
- Build monorepo: lulus (peringatan ukuran chunk Vite tetap ada).
- Migrasi lama diterapkan ke PostgreSQL kosong, migrasi sesi dibuat/dijalankan lewat
  `prisma migrate dev`, dan `prisma migrate diff --exit-code`: tidak ada perbedaan.
- Container PostgreSQL sementara dihapus setelah verifikasi. Tidak ada commit/push.


## Follow-up held bills — 17 Oktober 2026

F1803 selesai. POS memakai `/pos/hold`, `/pos/held-bills`, resume, dan delete dengan
scope bisnis dari JWT serta outlet yang diverifikasi oleh `TenantAccessService`.
Kontrak backend/web diperbarui bersama; daftar Redis menggunakan cursor.

- Snapshot harga, modifier, bundle, diskon, pelanggan, meja, dan tipe pesanan dihitung
  atau diverifikasi di server. Kartu menampilkan **Subtotal** setelah diskon; pajak,
  biaya layanan, dan harga saat checkout tetap dihitung ulang melalui pricing server.
- UUID perangkat membuat upload dapat diulang. Script Lua menyimpan bill dan index
  secara atomik, mengizinkan satu klaim resume, serta menyimpan receipt terikat
  request ID dan karyawan agar respons hilang dapat dipulihkan. Bill yang sudah
  dilanjutkan/dihapus tidak dapat dihidupkan kembali oleh upload terlambat.
- Draft offline disimpan lokal sebelum request; upload yang hasilnya belum diketahui
  tetap tersimpan. Rekonsiliasi membaca server lebih dulu. Bill server hanya bisa
  dilanjutkan/dihapus saat online; draft yang belum pernah diupload bisa dilanjutkan
  offline. Keranjang aktif diparkir setelah klaim berhasil, dan respons outlet lama
  tidak boleh menimpa keranjang setelah pengguna mengganti akun/outlet.
- Pergantian bisnis dan logout tidak menghapus draft bisnis lain. Bill legacy yang
  identitas bisnisnya diketahui perlu dipetakan ke outlet lewat konfirmasi UI;
  record tanpa identitas bisnis tetap tersimpan tetapi perlu rekonsiliasi manual.
- UI menampilkan error, status tersimpan lokal/server, serta aksi pemulihan. Gagal
  sinkronisasi tidak ditampilkan sebagai sukses server.

### Penyimpanan dan penerapan

Tidak ada perubahan schema tambahan untuk held bills; gunakan Redis dengan AOF dan
volume persisten seperti konfigurasi deployment yang sudah ada. Open bill tidak
memiliki TTL. Record lama yang masih hidup dipertahankan saat dibaca. Data lama yang
sudah expired sebelum upgrade tidak dapat dipulihkan oleh kode ini.

Receipt resume dan penanda penghapusan juga dipertahankan tanpa TTL untuk mencegah
replay upload lama. Kapasitas Redis perlu diperhitungkan; kebijakan pembersihan receipt
harus mempertimbangkan masa retry perangkat sebelum diterapkan. Tidak ada job cleanup
baru yang menghapus pesanan secara otomatis.

### Verifikasi follow-up held bills

Node **22.23.3**; semua pemeriksaan berikut lulus:

- Prisma generate; TypeScript backend/web: 0 error.
- ESLint backend: 0 error, 17 warning R18 lama; web: 0 error.
- Jest: **121 suite / 946 test**, termasuk PostgreSQL sesi dan Redis held bills nyata.
- Vitest: **30 file / 216 test**, termasuk offline fallback, isolasi scope, respons
  hilang, penggantian outlet, migrasi legacy, serta penghapusan yang gagal.
- Build monorepo lulus; peringatan ukuran chunk Vite tetap ada.
- Seluruh 17 migrasi diterapkan pada PostgreSQL kosong; schema diff: tidak ada perbedaan.

Container tes terisolasi digunakan tanpa menyentuh container proyek lain. Pemilik
meminta seluruh hasil audit dan follow-up di-commit/push ke `fix/audit-2026-09`.
`JWT_EXPIRES_IN` tetap tidak berubah; item 3 (pengirim laporan terjadwal) belum dimulai.
