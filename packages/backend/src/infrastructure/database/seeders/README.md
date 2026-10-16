# Database Seeders

Modular database seeding system for TiloPOS.

## Structure

```
seeders/
├── index.ts                    # Orchestrator (guard + TRUNCATE cleanup + all seeders)
├── business.seeder.ts          # Business & outlets
├── employees.seeder.ts         # Employees & roles (demo logins)
├── products.seeder.ts          # Products, categories, variants, modifiers
├── customers.seeder.ts         # Customers
├── inventory.seeder.ts         # Stock, ingredients, recipes, suppliers, POs
├── tables.seeder.ts            # Tables & waiting list
├── orders.seeder.ts            # Shifts, transactions, orders, payments
├── loyalty.seeder.ts           # Loyalty programs, tiers, promotions, vouchers
├── pricing-rules.seeder.ts     # Dynamic pricing rules
├── online-store.seeder.ts      # Online store & self-order sessions
├── settings.seeder.ts          # Devices, notifications, audit logs, stock transfers
└── seed-udsayan.ts             # One-off tenant import from Excel (non-destructive)
```

## Usage

### Run all seeders (destructive)

The demo seed **truncates every table** (except `_prisma_migrations`) before inserting
fixtures. It refuses to run unless both conditions hold:

- `NODE_ENV` is not `production`
- `ALLOW_DESTRUCTIVE_SEED=true`

```bash
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed
# or
ALLOW_DESTRUCTIVE_SEED=true npx prisma db seed
```

`prisma migrate reset` also runs the seed; without the flag the seed step aborts with a message.

All demo accounts share one PIN: `SEED_DEFAULT_PIN` (4-8 digits, default `1234` for local
development and the integration tests). Demo logins:

| Role | Email |
| --- | --- |
| Super Admin | superadmin@tilopos.id |
| Owner | budi@brewbites.id |
| Manager | siti@brewbites.id |
| Supervisor | agus@brewbites.id |
| Cashier | dewi@brewbites.id |
| Cashier | rina@brewbites.id |
| Kitchen | joko@brewbites.id |
| Inventory | hendra@brewbites.id |

### UD Sayan import

`seed-udsayan.ts` imports one tenant from spreadsheets in `UDSAYAN_DIR` (keep that customer
data outside the repository). It runs in a single transaction and uses `SEED_INITIAL_PIN`
(or prints a random 6-digit PIN once).

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

## Database Setup

Before running seeders, ensure:

1. PostgreSQL is running
2. Database exists: `tilopos`
3. User has proper permissions
4. Prisma schema is up to date: `npm run db:generate`
5. Migrations are applied: `npm run db:migrate` (dev) or `npm run db:migrate:prod`

### Docker Setup (Recommended)
```bash
# Start all services (from project root)
npm run docker:dev

# Run seeders
cd packages/backend
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed
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
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed
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
- Re-run: `ALLOW_DESTRUCTIVE_SEED=true npm run db:seed` (all tables are truncated first)
