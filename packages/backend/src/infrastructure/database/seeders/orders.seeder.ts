/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedOrdersParams {
  outletPusatId: string;
  outletCabangId: string;
  cashier1Id: string;
  cashier2Id: string;
  customer1Id: string;
  customer2Id: string;
  customer4Id: string;
  shiftId: string;
  tables: Record<string, { id: string }>;
  productIds: {
    espresso: { id: string };
    americano: { id: string };
    latte: { id: string };
    latteLarge: { id: string };
    cappuccino: { id: string };
    mocha: { id: string };
    icedLatte: { id: string };
    icedAmericano: { id: string };
    coldBrew: { id: string };
    croissant: { id: string };
    chocoCroissant: { id: string };
    blueberryMuffin: { id: string };
    breakfastSandwich: { id: string };
    avocadoToast: { id: string };
    clubSandwich: { id: string };
  };
}

export async function seedOrders(prisma: PrismaClient, params: SeedOrdersParams) {
  console.log('Creating shifts...');
  const openShift = await prisma.shift.create({
    data: {
      outletId: params.outletPusatId,
      employeeId: params.cashier1Id,
      startedAt: new Date(),
      openingCash: 500000,
      status: 'open',
    },
  });

  await prisma.shift.create({
    data: {
      outletId: params.outletPusatId,
      employeeId: params.cashier1Id,
      startedAt: new Date('2026-01-29T08:00:00'),
      endedAt: new Date('2026-01-29T17:00:00'),
      openingCash: 500000,
      closingCash: 2350000,
      expectedCash: 2300000,
      cashDifference: 50000,
      status: 'closed',
      notes: 'Shift normal, selisih lebih 50rb',
    },
  });
  console.log(`  Created 1 open shift, 1 closed shift`);

  console.log('Creating sample transactions...');

  // Transaction 1: Latte + Croissant (cash)
  const tx1 = await prisma.transaction.create({
    data: {
      outletId: params.outletPusatId,
      employeeId: params.cashier1Id,
      customerId: params.customer1Id,
      shiftId: openShift.id,
      receiptNumber: 'TXN-20260130-001',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: params.tables['T2'].id,
      subtotal: 70000,
      taxAmount: 7700,
      serviceCharge: 3500,
      grandTotal: 81200,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.latte.id,
            productName: 'Latte',
            quantity: 1,
            unitPrice: 45000,
            subtotal: 45000,
          },
          {
            productId: params.productIds.croissant.id,
            productName: 'Butter Croissant',
            quantity: 1,
            unitPrice: 25000,
            subtotal: 25000,
          },
        ],
      },
      payments: {
        create: [{ paymentMethod: 'cash', amount: 81200, status: 'completed' }],
      },
    },
  });

  // Transaction 2: Iced Latte + Avocado Toast + Blueberry Muffin (QRIS)
  const tx2 = await prisma.transaction.create({
    data: {
      outletId: params.outletPusatId,
      employeeId: params.cashier1Id,
      customerId: params.customer2Id,
      shiftId: openShift.id,
      receiptNumber: 'TXN-20260130-002',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: params.tables['T3'].id,
      subtotal: 125000,
      taxAmount: 13750,
      serviceCharge: 6250,
      grandTotal: 145000,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.icedLatte.id,
            productName: 'Iced Latte',
            quantity: 1,
            unitPrice: 48000,
            subtotal: 48000,
          },
          {
            productId: params.productIds.avocadoToast.id,
            productName: 'Avocado Toast',
            quantity: 1,
            unitPrice: 52000,
            subtotal: 52000,
          },
          {
            productId: params.productIds.blueberryMuffin.id,
            productName: 'Blueberry Muffin',
            quantity: 1,
            unitPrice: 25000,
            subtotal: 25000,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentMethod: 'qris',
            amount: 145000,
            referenceNumber: 'QRIS-20260130-001',
            status: 'completed',
          },
        ],
      },
    },
  });

  // Transaction 3: Big order for company (multi-payment: cash + card)
  const tx3 = await prisma.transaction.create({
    data: {
      outletId: params.outletPusatId,
      employeeId: params.cashier1Id,
      customerId: params.customer4Id,
      shiftId: openShift.id,
      receiptNumber: 'TXN-20260130-003',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: params.tables['VIP1'].id,
      subtotal: 380000,
      taxAmount: 41800,
      serviceCharge: 19000,
      grandTotal: 440800,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.latte.id,
            variantId: params.productIds.latteLarge.id,
            productName: 'Latte',
            variantName: 'Large',
            quantity: 3,
            unitPrice: 52000,
            subtotal: 156000,
          },
          {
            productId: params.productIds.cappuccino.id,
            productName: 'Cappuccino',
            quantity: 2,
            unitPrice: 42000,
            subtotal: 84000,
          },
          {
            productId: params.productIds.breakfastSandwich.id,
            productName: 'Breakfast Sandwich',
            quantity: 2,
            unitPrice: 45000,
            subtotal: 90000,
          },
          {
            productId: params.productIds.croissant.id,
            productName: 'Butter Croissant',
            quantity: 2,
            unitPrice: 25000,
            subtotal: 50000,
          },
        ],
      },
      payments: {
        create: [
          { paymentMethod: 'cash', amount: 250000, status: 'completed' },
          {
            paymentMethod: 'card',
            amount: 190800,
            referenceNumber: 'CC-20260130-001',
            status: 'completed',
          },
        ],
      },
    },
  });

  // Transaction 4: Takeaway (Kemang outlet)
  await prisma.transaction.create({
    data: {
      outletId: params.outletCabangId,
      employeeId: params.cashier2Id,
      receiptNumber: 'TXN-20260130-004',
      transactionType: 'sale',
      orderType: 'takeaway',
      subtotal: 105000,
      taxAmount: 11550,
      grandTotal: 116550,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.icedAmericano.id,
            productName: 'Iced Americano',
            quantity: 1,
            unitPrice: 38000,
            subtotal: 38000,
          },
          {
            productId: params.productIds.clubSandwich.id,
            productName: 'Club Sandwich',
            quantity: 1,
            unitPrice: 55000,
            subtotal: 55000,
          },
          {
            productId: params.productIds.chocoCroissant.id,
            productName: 'Chocolate Croissant',
            quantity: 1,
            unitPrice: 28000,
            subtotal: 28000,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentMethod: 'gopay',
            amount: 116550,
            referenceNumber: 'GOPAY-20260130-001',
            status: 'completed',
          },
        ],
      },
    },
  });
  console.log(`  Created 4 transactions`);

  console.log('Creating orders for KDS...');
  await prisma.order.create({
    data: {
      outletId: params.outletPusatId,
      orderNumber: 'ORD-001',
      orderType: 'dine_in',
      tableId: params.tables['T4'].id,
      status: 'preparing',
      priority: 0,
      startedAt: new Date(),
      items: {
        create: [
          {
            productId: params.productIds.avocadoToast.id,
            productName: 'Avocado Toast',
            quantity: 2,
            station: 'kitchen',
            status: 'preparing',
          },
          {
            productId: params.productIds.breakfastSandwich.id,
            productName: 'Breakfast Sandwich',
            quantity: 1,
            station: 'kitchen',
            status: 'pending',
          },
          {
            productId: params.productIds.icedLatte.id,
            productName: 'Iced Latte',
            quantity: 2,
            station: 'bar',
            status: 'ready',
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      outletId: params.outletPusatId,
      orderNumber: 'ORD-002',
      orderType: 'takeaway',
      status: 'pending',
      priority: 1,
      notes: 'Customer waiting outside',
      items: {
        create: [
          {
            productId: params.productIds.cappuccino.id,
            productName: 'Cappuccino',
            quantity: 3,
            station: 'bar',
            status: 'pending',
          },
          {
            productId: params.productIds.croissant.id,
            productName: 'Butter Croissant',
            quantity: 3,
            station: 'pastry',
            status: 'pending',
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      outletId: params.outletPusatId,
      orderNumber: 'ORD-003',
      orderType: 'dine_in',
      tableId: params.tables['T7'].id,
      status: 'ready',
      items: {
        create: [
          {
            productId: params.productIds.clubSandwich.id,
            productName: 'Club Sandwich',
            quantity: 2,
            station: 'kitchen',
            status: 'ready',
            completedAt: new Date(),
          },
          {
            productId: params.productIds.mocha.id,
            productName: 'Mocha',
            quantity: 2,
            station: 'bar',
            status: 'ready',
            completedAt: new Date(),
          },
        ],
      },
    },
  });
  console.log(`  Created 3 orders (preparing, pending, ready)`);

  console.log('Creating payment settlement...');
  await prisma.paymentSettlement.create({
    data: {
      outletId: params.outletPusatId,
      paymentMethod: 'qris',
      settlementDate: new Date('2026-01-29'),
      totalTransactions: 15,
      grossAmount: 1250000,
      feeAmount: 8750,
      netAmount: 1241250,
      status: 'settled',
      referenceNumber: 'STL-QRIS-20260129',
      settledAt: new Date('2026-01-30'),
    },
  });
  console.log(`  Created 1 payment settlement`);

  return { openShift, tx1, tx2, tx3 };
}
