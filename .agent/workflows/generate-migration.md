# Generate Database Migration

Buat Prisma migration untuk perubahan schema yang diminta:

1. Baca schema saat ini di `src/infrastructure/database/prisma/schema.prisma`
2. Baca dokumentasi schema di `Docs/05-DATABASE-SCHEMA.md` sebagai referensi
3. Update `schema.prisma` dengan perubahan yang diminta
4. Pastikan conventions:
   - Table name: snake_case, plural (`transactions`, `product_variants`)
   - Primary key: UUID dengan `@default(uuid())`
   - Timestamps: `created_at DateTime @default(now())`, `updated_at DateTime @updatedAt`
   - Soft delete: `is_active Boolean @default(true)`
   - Foreign keys: selalu ada index
   - Multi-tenancy: `business_id` di semua tabel utama
5. Jalankan `npx prisma migrate dev --name {deskripsi-singkat}`
6. Verifikasi migration berhasil
7. Update Prisma client: `npx prisma generate`
8. Jika ada tabel baru, buat seeder di `src/infrastructure/database/seeders/`
