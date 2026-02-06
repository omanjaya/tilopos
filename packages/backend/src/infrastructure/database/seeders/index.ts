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

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('Cleaning existing data...');

  // Delete in reverse order of dependencies
  await prisma.storeOrderItem.deleteMany();
  await prisma.storeOrder.deleteMany();
  await prisma.onlineStore.deleteMany();
  await prisma.selfOrderItem.deleteMany();
  await prisma.selfOrderSession.deleteMany();
  await prisma.waitingList.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationSetting.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  await prisma.loyaltyProgram.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.paymentSettlement.deleteMany();
  await prisma.onlineOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.transactionItemModifier.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredientStockMovement.deleteMany();
  await prisma.ingredientStockLevel.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.device.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.business.deleteMany();

  console.log('Done.\n');
}

async function main() {
  console.log('========================================');
  console.log('STARTING DATABASE SEED');
  console.log('========================================\n');

  try {
    // Cleanup
    await cleanupDatabase();

    // 1. Business & Outlets
    const { business, outletPusat, outletCabang } = await seedBusiness(prisma);

    // 2. Employees
    const { owner, manager, cashier1, cashier2, inventoryStaff } = await seedEmployees(prisma, {
      businessId: business.id,
      outletPusatId: outletPusat.id,
      outletCabangId: outletCabang.id,
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
        nasiGoreng: products.nasiGoreng,
        nasiAyam: products.nasiAyam,
        ayamBakarReg: products.ayamBakarReg,
        ayamBakarJumbo: products.ayamBakarJumbo,
        mieGoreng: products.mieGoreng,
        mieAyam: products.mieAyam,
        kentangGoreng: products.kentangGoreng,
        kentangLarge: products.kentangLarge,
        dimsum: products.dimsum,
        cappuccino: products.cappuccino,
        cappIce: products.cappIce,
        kopiSusu: products.kopiSusu,
        esJeruk: products.esJeruk,
        tehTarik: products.tehTarik,
        airMineral: products.airMineral,
      },
    });

    // 9. Online Store & Self-Order Session
    const { selfOrderSession } = await seedOnlineStore(prisma, {
      businessId: business.id,
      outletPusatId: outletPusat.id,
      tableId: tables['T6'].id,
      productIds: {
        mieGoreng: products.mieGoreng,
        kopiSusu: products.kopiSusu,
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
        nasiGoreng: products.nasiGoreng,
        dimsum: products.dimsum,
      },
    });

    // Summary
    console.log('\n========================================');
    console.log('SEED COMPLETED SUCCESSFULLY');
    console.log('========================================\n');
    console.log('Login credentials for testing:');
    console.log('┌──────────────┬─────────────────────────────────┬──────┐');
    console.log('│ Role         │ Email                           │ PIN  │');
    console.log('├──────────────┼─────────────────────────────────┼──────┤');
    console.log('│ Owner        │ budi@warungnusantara.id          │ 1234 │');
    console.log('│ Manager      │ siti@warungnusantara.id          │ 1234 │');
    console.log('│ Supervisor   │ agus@warungnusantara.id          │ 1234 │');
    console.log('│ Cashier      │ dewi@warungnusantara.id          │ 1234 │');
    console.log('│ Cashier (K)  │ rina@warungnusantara.id          │ 1234 │');
    console.log('│ Kitchen      │ joko@warungnusantara.id          │ 1234 │');
    console.log('│ Inventory    │ hendra@warungnusantara.id        │ 1234 │');
    console.log('└──────────────┴─────────────────────────────────┴──────┘\n');
    console.log('API: http://localhost:3001/api/v1');
    console.log('Swagger: http://localhost:3001/api/docs');
    console.log(`Business ID: ${business.id}`);
    console.log(`Outlet Pusat ID: ${outletPusat.id}`);
    console.log(`Outlet Kemang ID: ${outletCabang.id}`);
    console.log(`Open Shift ID: ${openShift.id}`);
    console.log(`Self-Order Code: ${selfOrderSession.sessionCode}`);
    console.log(`Online Store Slug: warung-nusantara`);
    console.log('');
  } catch (error) {
    console.error('\n❌ SEED FAILED:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
