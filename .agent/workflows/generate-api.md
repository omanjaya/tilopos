# Generate REST API Endpoint

Buat API endpoint lengkap untuk resource yang diminta:

1. Buat/update Controller di `src/modules/{module}/{module}.controller.ts`:
   - GET `/{resource}` — List dengan pagination & filtering
   - GET `/{resource}/:id` — Detail by ID
   - POST `/{resource}` — Create
   - PATCH `/{resource}/:id` — Update
   - DELETE `/{resource}/:id` — Soft delete (set is_active = false)
2. Setiap endpoint harus:
   - Validasi input dengan class-validator DTOs
   - Cek authentication (JWT guard)
   - Cek authorization (role/permission guard)
   - Filter by `business_id` (multi-tenancy)
   - Return format: `{ data, meta }` untuk list, `{ data }` untuk single
3. Buat Request DTOs di `src/application/dtos/`:
   - `Create{Resource}Dto.ts`
   - `Update{Resource}Dto.ts`
   - `Query{Resource}Dto.ts` (untuk filter/pagination)
4. Buat Response DTO atau gunakan Mapper
5. Buat Swagger documentation decorators
6. Versioning: semua endpoint di bawah `/api/v1/`
