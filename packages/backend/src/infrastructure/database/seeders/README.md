# Database Seeders

Modular database seeding system for TiloPOS.

## Structure

```
seeders/
├── index.ts                    # Main orchestrator (211 lines)
├── business.seeder.ts          # Business & outlets (62 lines)
├── employees.seeder.ts         # Employees & roles (123 lines)
├── products.seeder.ts          # Products, categories, variants, modifiers (403 lines)
├── customers.seeder.ts         # Customers (68 lines)
├── inventory.seeder.ts         # Stock, ingredients, recipes, suppliers, POs (318 lines)
├── tables.seeder.ts            # Tables & waiting list (71 lines)
├── orders.seeder.ts            # Shifts, transactions, orders, payments (397 lines)
├── loyalty.seeder.ts           # Loyalty programs, tiers, promotions, vouchers (127 lines)
├── online-store.seeder.ts      # Online store & self-order sessions (52 lines)
└── settings.seeder.ts          # Devices, notifications, audit logs, stock transfers (201 lines)
```

## Usage

### Run all seeders
```bash
npm run db:seed
# or
npx prisma db seed
```

### Run specific seeder (for development)
```typescript
import { PrismaClient } from '@prisma/client';
import { seedBusiness } from './seeders/business.seeder';

const prisma = new PrismaClient();

async function runSpecificSeeder() {
  const { business, outletPusat, outletCabang } = await seedBusiness(prisma);
  console.log('Business seeded:', business.id);
}

runSpecificSeeder();
```

## Seeder Dependencies

Seeders must be run in this order due to foreign key constraints:

1. **business.seeder** - Creates business and outlets (no dependencies)
2. **employees.seeder** - Requires: business, outlets
3. **products.seeder** - Requires: business
4. **customers.seeder** - Requires: business
5. **inventory.seeder** - Requires: business, outlets, products, employees
6. **tables.seeder** - Requires: outlets
7. **loyalty.seeder** - Requires: business
8. **orders.seeder** - Requires: outlets, employees, customers, products, tables
9. **online-store.seeder** - Requires: business, outlets, products, tables
10. **settings.seeder** - Requires: business, outlets, employees, transactions

## Adding New Seeders

1. Create a new file: `{entity}.seeder.ts`
2. Export an async function: `export async function seed{Entity}(prisma: PrismaClient, params: Seed{Entity}Params)`
3. Handle cleanup of its own data (if needed)
4. Create seed data
5. Return created entities that other seeders might need
6. Add to `index.ts` orchestrator in the correct dependency order

### Template
```typescript
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedEntityParams {
  businessId: string;
  // other required IDs
}

export async function seedEntity(prisma: PrismaClient, params: SeedEntityParams) {
  console.log('Creating entities...');

  const entity = await prisma.entity.create({
    data: {
      businessId: params.businessId,
      name: 'Example',
    },
  });

  console.log(`  Created 1 entity`);

  return { entity };
}
```

## Benefits of Modular Structure

1. **Maintainability**: Each seeder focuses on a single domain (business, products, orders, etc.)
2. **Debugging**: Easy to identify and fix issues in specific seeders
3. **Selective Seeding**: Run specific seeders during development
4. **Testability**: Each seeder can be tested independently
5. **Readability**: Smaller files are easier to understand and modify
6. **Scalability**: Easy to add new seeders without touching existing code

## File Size Comparison

- **Original seed.ts**: 1,828 lines (monolithic)
- **New modular seeders**: 10 files, largest is 403 lines
- **Total lines**: ~2,033 lines (including orchestrator)
- **Average per file**: ~185 lines

## Database Setup

Before running seeders, ensure:

1. PostgreSQL is running
2. Database exists: `tilopos`
3. User has proper permissions
4. Prisma schema is up to date: `npm run db:generate`
5. Migrations are applied: `npm run db:migrate`

### Docker Setup (Recommended)
```bash
# Start all services (from project root)
npm run docker:dev

# Run seeders
cd packages/backend
npm run db:seed
```

### Local PostgreSQL Setup
```bash
# Create database and user
createdb tilopos
createuser -P tilopos  # password: tilopos_secret

# Grant permissions
psql -d tilopos -c "GRANT ALL PRIVILEGES ON DATABASE tilopos TO tilopos;"
psql -d tilopos -c "GRANT ALL ON SCHEMA public TO tilopos;"

# Run migrations
npm run db:migrate

# Run seeders
npm run db:seed
```

## Troubleshooting

### Error: "User was denied access"
- Check database credentials in `.env`
- Ensure user has proper permissions
- Try running migrations first: `npm run db:migrate`

### Error: "Prisma Client did not initialize"
- Run: `npm run db:generate`

### Error: "Table does not exist"
- Run migrations: `npm run db:migrate`

### Seeder fails in the middle
- Check the error message to identify which seeder failed
- Fix the issue in that specific seeder file
- Re-run: `npm run db:seed` (cleanup happens automatically)
