# Generate Tests

Buat test lengkap untuk file/module yang ditentukan:

1. Identifikasi semua files yang perlu ditest
2. Untuk setiap file, buat test file dengan nama `{nama}.spec.ts`
3. Gunakan pattern Arrange-Act-Assert:
   - Arrange: setup mock data dan dependencies
   - Act: panggil method yang ditest
   - Assert: verifikasi hasil
4. Test cases yang WAJIB:
   - Happy path (input valid, output expected)
   - Edge cases (empty input, boundary values)
   - Error cases (invalid input, not found, unauthorized)
   - Business rule validation (insufficient stock, expired promo, etc.)
5. Mock external dependencies (repository, external service)
6. Jangan mock domain entities — test mereka langsung
7. Coverage target:
   - Domain layer: 95%+
   - Application layer: 85%+
   - Infrastructure layer: 80%+
