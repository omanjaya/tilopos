# Generate NestJS Module

Buat NestJS module lengkap untuk fitur yang diminta. Ikuti langkah berikut:

1. Baca dokumentasi di `Docs/` untuk memahami context fitur
2. Buat folder structure di `src/modules/{nama-module}/`:
   - `{nama}.module.ts` — NestJS module definition
   - `{nama}.controller.ts` — REST API controller
   - Subfolder per sub-feature jika diperlukan
3. Buat Use Cases di `src/application/use-cases/{nama}/`:
   - 1 class per use case dengan method `execute()`
   - Input & Output DTO
4. Buat Domain entities di `src/domain/entities/` jika belum ada
5. Buat Domain interfaces di `src/domain/interfaces/repositories/`
6. Buat Infrastructure repository di `src/infrastructure/database/repositories/`
7. Register semua providers di module file dengan interface binding
8. Buat unit test untuk setiap use case

Pastikan mengikuti Clean Architecture — domain tidak import dari infrastructure.
