---
name: prisma-schema-generator
description: "Generates or updates Prisma schema models based on the MokaPOS database design. Use when adding new database tables, modifying schema, or creating migrations."
---

# Prisma Schema Generator

## Goal
Generate Prisma schema models that match the MokaPOS PostgreSQL schema design documented in `Docs/05-DATABASE-SCHEMA.md`.

## Instructions

1. Read `Docs/05-DATABASE-SCHEMA.md` for the complete database schema reference
2. Determine which tables/models need to be created or updated
3. Generate or update `src/infrastructure/database/prisma/schema.prisma`

## Conventions

### Naming
- Model name: PascalCase singular (`Product`, `TransactionItem`)
- Field name: camelCase (`businessId`, `createdAt`)
- Table mapping: `@@map("snake_case_plural")` (e.g., `@@map("transactions")`)
- Field mapping: `@map("snake_case")` when field name differs

### Types
- Primary key: `String @id @default(uuid())`
- Foreign key: `String` with `@relation`
- Money/Amount: `Decimal @db.Decimal(15, 2)`
- Quantity: `Decimal @db.Decimal(15, 3)` or `Int`
- Timestamp: `DateTime @default(now())` for created_at, `DateTime @updatedAt` for updated_at
- Status: `String @default("active")` — BUKAN enum (lebih flexible)
- JSON data: `Json @default("{}")` untuk settings, metadata, permissions
- Boolean: `Boolean @default(true)` untuk is_active

### Relations
```prisma
model Product {
  id          String   @id @default(uuid())
  businessId  String   @map("business_id")
  categoryId  String?  @map("category_id")

  business    Business  @relation(fields: [businessId], references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])
  variants    ProductVariant[]
  stockLevels StockLevel[]

  @@map("products")
}
```

### Indexes
```prisma
@@index([businessId])
@@index([categoryId])
@@index([businessId, isActive])
@@unique([businessId, sku])
```

### Template Model
```prisma
model EntityName {
  id        String   @id @default(uuid())
  businessId String  @map("business_id")

  // ... fields

  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  business  Business @relation(fields: [businessId], references: [id])

  @@map("entity_names")
  @@index([businessId])
}
```

## Constraints
- WAJIB ada `businessId` di semua model utama (multi-tenancy)
- WAJIB ada index untuk semua foreign keys
- WAJIB gunakan `@@map()` untuk snake_case table names
- WAJIB gunakan `@map()` untuk snake_case column names
- JANGAN gunakan Prisma enum — gunakan String untuk flexibility
- Money fields WAJIB `Decimal @db.Decimal(15, 2)`, BUKAN Float
