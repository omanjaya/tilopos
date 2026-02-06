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
    nasiGoreng: { id: string };
    nasiAyam: { id: string };
    ayamBakarReg: { id: string };
    ayamBakarJumbo: { id: string };
    mieGoreng: { id: string };
    mieAyam: { id: string };
    kentangGoreng: { id: string };
    kentangLarge: { id: string };
    dimsum: { id: string };
    cappuccino: { id: string };
    cappIce: { id: string };
    kopiSusu: { id: string };
    esJeruk: { id: string };
    tehTarik: { id: string };
    airMineral: { id: string };
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

  // Transaction 1: Nasi Goreng + Es Jeruk (cash)
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
      subtotal: 50000,
      taxAmount: 5500,
      serviceCharge: 2500,
      grandTotal: 58000,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.nasiGoreng.id,
            productName: 'Nasi Goreng Spesial',
            quantity: 1,
            unitPrice: 35000,
            subtotal: 35000,
          },
          {
            productId: params.productIds.esJeruk.id,
            productName: 'Es Jeruk Segar',
            quantity: 1,
            unitPrice: 15000,
            subtotal: 15000,
          },
        ],
      },
      payments: {
        create: [{ paymentMethod: 'cash', amount: 58000, status: 'completed' }],
      },
    },
  });

  // Transaction 2: Nasi Ayam Jumbo + Cappuccino Iced + Dimsum (QRIS)
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
      subtotal: 112000,
      taxAmount: 12320,
      serviceCharge: 5600,
      grandTotal: 129920,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.nasiAyam.id,
            variantId: params.productIds.ayamBakarJumbo.id,
            productName: 'Nasi Ayam Bakar',
            variantName: 'Jumbo',
            quantity: 1,
            unitPrice: 55000,
            subtotal: 55000,
          },
          {
            productId: params.productIds.cappuccino.id,
            variantId: params.productIds.cappIce.id,
            productName: 'Cappuccino',
            variantName: 'Iced',
            quantity: 1,
            unitPrice: 32000,
            subtotal: 32000,
          },
          {
            productId: params.productIds.dimsum.id,
            productName: 'Dimsum Ayam (5 pcs)',
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
            amount: 129920,
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
      subtotal: 318000,
      taxAmount: 34980,
      serviceCharge: 15900,
      grandTotal: 368880,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.nasiGoreng.id,
            productName: 'Nasi Goreng Spesial',
            quantity: 3,
            unitPrice: 35000,
            subtotal: 105000,
          },
          {
            productId: params.productIds.nasiAyam.id,
            variantId: params.productIds.ayamBakarJumbo.id,
            productName: 'Nasi Ayam Bakar',
            variantName: 'Jumbo',
            quantity: 2,
            unitPrice: 55000,
            subtotal: 110000,
          },
          {
            productId: params.productIds.mieGoreng.id,
            productName: 'Mie Goreng Jawa',
            quantity: 1,
            unitPrice: 30000,
            subtotal: 30000,
          },
          {
            productId: params.productIds.kopiSusu.id,
            productName: 'Kopi Susu Gula Aren',
            quantity: 3,
            unitPrice: 25000,
            subtotal: 75000,
          },
          {
            productId: params.productIds.airMineral.id,
            productName: 'Air Mineral',
            quantity: 3,
            unitPrice: 8000,
            subtotal: 24000,
            notes: 'Dingin',
          },
        ],
      },
      payments: {
        create: [
          { paymentMethod: 'cash', amount: 200000, status: 'completed' },
          {
            paymentMethod: 'card',
            amount: 168880,
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
      subtotal: 68000,
      taxAmount: 7480,
      grandTotal: 75480,
      status: 'completed',
      items: {
        create: [
          {
            productId: params.productIds.nasiAyam.id,
            variantId: params.productIds.ayamBakarReg.id,
            productName: 'Nasi Ayam Bakar',
            variantName: 'Regular',
            quantity: 1,
            unitPrice: 40000,
            subtotal: 40000,
          },
          {
            productId: params.productIds.mieAyam.id,
            productName: 'Mie Ayam Bakso',
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
            amount: 75480,
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
            productId: params.productIds.nasiGoreng.id,
            productName: 'Nasi Goreng Spesial',
            quantity: 2,
            station: 'wok',
            status: 'preparing',
          },
          {
            productId: params.productIds.mieGoreng.id,
            productName: 'Mie Goreng Jawa',
            quantity: 1,
            station: 'wok',
            status: 'pending',
          },
          {
            productId: params.productIds.esJeruk.id,
            productName: 'Es Jeruk Segar',
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
      notes: 'Buru-buru, customer nunggu di depan',
      items: {
        create: [
          {
            productId: params.productIds.nasiAyam.id,
            variantId: params.productIds.ayamBakarReg.id,
            productName: 'Nasi Ayam Bakar (Regular)',
            quantity: 3,
            station: 'grill',
            status: 'pending',
          },
          {
            productId: params.productIds.kentangGoreng.id,
            variantId: params.productIds.kentangLarge.id,
            productName: 'Kentang Goreng (Large)',
            quantity: 2,
            station: 'fryer',
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
            productId: params.productIds.dimsum.id,
            productName: 'Dimsum Ayam (5 pcs)',
            quantity: 2,
            station: 'steam',
            status: 'ready',
            completedAt: new Date(),
          },
          {
            productId: params.productIds.tehTarik.id,
            productName: 'Teh Tarik',
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
