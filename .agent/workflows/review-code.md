# Review Code

Review code yang ditentukan berdasarkan standar MokaPOS:

1. Cek Architecture Compliance:
   - Apakah dependency flow benar (inward only)?
   - Apakah domain layer bebas dari import external?
   - Apakah use case pattern benar (single execute method)?
   - Apakah repository menggunakan interface binding?
2. Cek Naming Conventions:
   - Classes: PascalCase
   - Functions: camelCase, verb-first
   - Constants: UPPER_SNAKE_CASE
   - DB tables: snake_case, plural
   - Interfaces: prefix `I`
3. Cek Code Quality:
   - Tidak ada tipe `any`
   - Function di bawah 30 baris
   - Maksimal 3-4 parameter
   - Error handling dengan custom AppError
   - Tidak ada `console.log`
   - Tidak ada magic numbers
4. Cek Business Logic:
   - Multi-tenancy filter (business_id) di semua query
   - Amount menggunakan Decimal, bukan float
   - Audit log untuk sensitive actions
   - Proper validation di boundary layer
5. Cek Security:
   - Tidak ada SQL injection risk
   - Input validation
   - Auth/authz guards
   - Tidak ada secrets hardcoded
6. Berikan feedback spesifik per file dengan line number
