/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { seedBusiness } from './business.seeder';
import { seedEmployees } from './employees.seeder';
import { seedProducts } from './products.seeder';
import { seedCustomers } from './customers.seeder';
import { seedInventory } from './inventory.seeder';
import { seedTables } from './tables.seeder';
import { seedOrders } from './orders.seeder';
import { seedLoyalty } from './loyalty.seeder';
import { seedOnlineStore } from './online-store.seeder';
import { seedSettings } from './settings.seeder';
import { seedPricingRules } from './pricing-rules.seeder';

const prisma = new PrismaClient();

/**
 * The demo seed wipes every table before inserting fixtures. It must never touch a
 * production database, and it only runs when explicitly requested (R17):
 *   NODE_ENV !== 'production' AND ALLOW_DESTRUCTIVE_SEED=true
 */
function assertDestructiveSeedAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new SeedAbortedError(
      'Refusing to run the destructive demo seed: NODE_ENV is "production".',
    );
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new SeedAbortedError(
      'The demo seed DELETES ALL DATA in the target database before seeding. ' +
        'Re-run with ALLOW_DESTRUCTIVE_SEED=true to confirm, e.g. ' +
        '`ALLOW_DESTRUCTIVE_SEED=true npm run db:seed`.',
    );
  }
}

class SeedAbortedError extends Error {}

/** PIN for every seeded demo login (SEED_DEFAULT_PIN, default 1234 for local dev/tests). */
function resolveDemoPin(): string {
  const pin = process.env.SEED_DEFAULT_PIN ?? '1234';
  if (!/^\d{4,8}$/.test(pin)) {
    throw new SeedAbortedError('SEED_DEFAULT_PIN must be 4-8 digits.');
  }
  return pin;
}

async function cleanupDatabase() {
  console.log('Cleaning existing data (TRUNCATE ... CASCADE)...');

  // Truncate every application table (all models, including ones added later),
  // keeping only Prisma's migration history.
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
  `;
  if (tables.length > 0) {
    const list = tables.map((t) => `"${t.tablename.replace(/"/g, '""')}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }

  console.log('Done.\n');
}

/** Must match employees.seeder.ts (and test/integration/helpers/auth.helper.ts). */
const DEMO_LOGINS: Array<[string, string]> = [
  ['Super Admin', 'superadmin@tilopos.id'],
  ['Owner', 'budi@brewbites.id'],
  ['Manager', 'siti@brewbites.id'],
  ['Supervisor', 'agus@brewbites.id'],
  ['Cashier', 'dewi@brewbites.id'],
  ['Cashier (M)', 'rina@brewbites.id'],
  ['Kitchen', 'joko@brewbites.id'],
  ['Inventory', 'hendra@brewbites.id'],
];

async function main() {
  console.log('========================================');
  console.log('STARTING DATABASE SEED');
  console.log('========================================\n');

  try {
    assertDestructiveSeedAllowed();
    const demoPin = resolveDemoPin();

    // Cleanup
    await cleanupDatabase();

    // 1. Business & Outlets
    const { business, outletPusat, outletCabang } = await seedBusiness(prisma);

    // 2. Employees
    const { owner, manager, cashier1, cashier2, inventoryStaff } = await seedEmployees(prisma, {
      businessId: business.id,
      outletPusatId: outletPusat.id,
      outletCabangId: outletCabang.id,
      pin: demoPin,
    });

    // 3. Products (Categories, Modifiers, Products, Variants)
    const products = await seedProducts(prisma, { businessId: business.id });

    // 4. Customers
    const { cust1, cust2, cust4 } = await seedCustomers(prisma, { businessId: business.id });

    // 5. Inventory (Stock Levels, Ingredients, Recipes, Suppliers, Purchase Orders)
    await seedInventory(prisma, {
      businessId: business.id,
      outletPusatId: outletPusat.id,
      outletCabangId: outletCabang.id,
      productIds: products,
      inventoryStaffId: inventoryStaff.id,
    });

    // 6. Tables & Waiting List
    const { tables } = await seedTables(prisma, {
      outletPusatId: outletPusat.id,
      outletCabangId: outletCabang.id,
    });

    // 7. Loyalty Program, Tiers, Promotions, Vouchers
    await seedLoyalty(prisma, { businessId: business.id });

    // 8. Orders & Transactions (includes Shifts, Transactions, Orders, Payment Settlement)
    const { openShift, tx1, tx2, tx3 } = await seedOrders(prisma, {
      outletPusatId: outletPusat.id,
      outletCabangId: outletCabang.id,
      cashier1Id: cashier1.id,
      cashier2Id: cashier2.id,
      customer1Id: cust1.id,
      customer2Id: cust2.id,
      customer4Id: cust4.id,
      shiftId: '', // Will be created in seedOrders
      tables,
      productIds: {
        espresso: products.espresso,
        americano: products.americano,
        latte: products.latte,
        cappuccino: products.cappuccino,
        mocha: products.mocha,
        icedLatte: products.icedLatte,
        icedAmericano: products.icedAmericano,
        coldBrew: products.coldBrew,
        croissant: products.croissant,
        chocoCroissant: products.chocoCroissant,
        blueberryMuffin: products.blueberryMuffin,
        breakfastSandwich: products.breakfastSandwich,
        avocadoToast: products.avocadoToast,
        clubSandwich: products.clubSandwich,
      },
    });

    // 8b. Pricing rules (needs products)
    await seedPricingRules(prisma, business.id);

    // 9. Online Store & Self-Order Session
    const { selfOrderSession } = await seedOnlineStore(prisma, {
      businessId: business.id,
      outletPusatId: outletPusat.id,
      tableId: tables['T6'].id,
      productIds: {
        latte: products.latte,
        croissant: products.croissant,
      },
    });

    // 10. Settings (Devices, Notification Settings, Audit Logs, Stock Transfer)
    await seedSettings(prisma, {
      businessId: business.id,
      outletPusatId: outletPusat.id,
      outletCabangId: outletCabang.id,
      ownerId: owner.id,
      managerId: manager.id,
      inventoryStaffId: inventoryStaff.id,
      managerId2: cashier1.id,
      transactionIds: {
        tx1: tx1.id,
        tx2: tx2.id,
        tx3: tx3.id,
      },
      shiftId: openShift.id,
      productIds: {
        croissant: products.croissant,
        blueberryMuffin: products.blueberryMuffin,
      },
    });

    // Summary
    console.log('\n========================================');
    console.log('SEED COMPLETED SUCCESSFULLY');
    console.log('========================================\n');
    console.log(`Login credentials for testing (all demo accounts use PIN ${demoPin}):`);
    for (const [role, email] of DEMO_LOGINS) {
      console.log(`  ${role.padEnd(12)} ${email}`);
    }
    console.log('');
    console.log('API: http://localhost:3001/api/v1');
    console.log('Swagger: http://localhost:3001/api/docs');
    console.log(`Business ID: ${business.id}`);
    console.log(`Outlet Pusat ID: ${outletPusat.id}`);
    console.log(`Outlet Kemang ID: ${outletCabang.id}`);
    console.log(`Open Shift ID: ${openShift.id}`);
    console.log(`Self-Order Code: ${selfOrderSession.sessionCode}`);
    console.log(`Online Store Slug: brew-and-bites`);
    console.log('');
  } catch (error) {
    if (error instanceof SeedAbortedError) {
      console.error(`\nSEED ABORTED: ${error.message}\n`);
    } else {
      console.error('\n❌ SEED FAILED:', error);
    }
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    if (!(e instanceof SeedAbortedError)) {
      console.error('Seed failed:', e);
    }
    await prisma.$disconnect();
    process.exit(1);
  });
