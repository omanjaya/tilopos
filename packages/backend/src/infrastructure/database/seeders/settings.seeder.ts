/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedSettingsParams {
  businessId: string;
  outletPusatId: string;
  outletCabangId: string;
  ownerId: string;
  managerId: string;
  inventoryStaffId: string;
  managerId2: string;
  transactionIds: {
    tx1: string;
    tx2: string;
    tx3: string;
  };
  shiftId: string;
  productIds: {
    nasiGoreng: { id: string };
    dimsum: { id: string };
  };
}

export async function seedSettings(prisma: PrismaClient, params: SeedSettingsParams) {
  console.log('Creating devices...');
  await prisma.device.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      deviceName: 'Kasir Utama - iPad',
      deviceType: 'tablet',
      platform: 'ios',
      deviceIdentifier: 'IPAD-WN-001',
      appVersion: '1.0.0',
      lastSyncAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  await prisma.device.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      deviceName: 'KDS Dapur',
      deviceType: 'kds_display',
      platform: 'android',
      deviceIdentifier: 'KDS-WN-001',
      appVersion: '1.0.0',
      lastSyncAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  await prisma.device.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      deviceName: 'Backoffice Web',
      deviceType: 'desktop',
      platform: 'web',
      deviceIdentifier: 'WEB-WN-001',
      appVersion: '1.0.0',
      lastActiveAt: new Date(),
    },
  });

  await prisma.device.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletCabangId,
      deviceName: 'Kasir Kemang - Android',
      deviceType: 'tablet',
      platform: 'android',
      deviceIdentifier: 'TAB-WN-002',
      appVersion: '1.0.0',
      lastSyncAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
  console.log(`  Created 4 devices`);

  console.log('Creating notification settings...');
  await prisma.notificationSetting.createMany({
    data: [
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.ownerId,
        notificationType: 'low_stock',
        channel: 'push',
        isEnabled: true,
        threshold: { quantity: 10 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.ownerId,
        notificationType: 'large_transaction',
        channel: 'push',
        isEnabled: true,
        threshold: { amount: 500000 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.ownerId,
        notificationType: 'refund',
        channel: 'push',
        isEnabled: true,
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.managerId,
        notificationType: 'low_stock',
        channel: 'push',
        isEnabled: true,
        threshold: { quantity: 10 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.managerId,
        notificationType: 'online_order',
        channel: 'push',
        isEnabled: true,
      },
    ],
  });
  console.log(`  Created 5 notification settings`);

  console.log('Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.managerId2,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: params.transactionIds.tx1,
        newValue: { grandTotal: 58000 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.managerId2,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: params.transactionIds.tx2,
        newValue: { grandTotal: 129920 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.managerId2,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: params.transactionIds.tx3,
        newValue: { grandTotal: 368880 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.ownerId,
        action: 'shift_started',
        entityType: 'shift',
        entityId: params.shiftId,
        newValue: { openingCash: 500000 },
      },
      {
        businessId: params.businessId,
        outletId: params.outletPusatId,
        employeeId: params.inventoryStaffId,
        action: 'stock_adjusted',
        entityType: 'stock_level',
        newValue: { product: 'Air Mineral', adjustment: '+200' },
      },
    ],
  });
  console.log(`  Created 5 audit log entries`);

  console.log('Creating stock transfer...');
  await prisma.stockTransfer.create({
    data: {
      businessId: params.businessId,
      transferNumber: 'TRF-2026-001',
      sourceOutletId: params.outletPusatId,
      destinationOutletId: params.outletCabangId,
      status: 'approved',
      requestedBy: params.inventoryStaffId,
      approvedBy: params.managerId,
      approvedAt: new Date(),
      items: {
        create: [
          {
            productId: params.productIds.nasiGoreng.id,
            itemName: 'Nasi Goreng Spesial (bahan)',
            quantitySent: 20,
          },
          { productId: params.productIds.dimsum.id, itemName: 'Dimsum Ayam', quantitySent: 10 },
        ],
      },
    },
  });
  console.log(`  Created 1 stock transfer (approved)`);

  return {};
}
