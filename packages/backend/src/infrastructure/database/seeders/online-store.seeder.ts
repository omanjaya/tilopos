/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedOnlineStoreParams {
  businessId: string;
  outletPusatId: string;
  tableId: string;
  productIds: {
    mieGoreng: { id: string };
    kopiSusu: { id: string };
  };
}

export async function seedOnlineStore(prisma: PrismaClient, params: SeedOnlineStoreParams) {
  console.log('Creating online store...');
  await prisma.onlineStore.create({
    data: {
      businessId: params.businessId,
      storeName: 'Warung Nusantara Online',
      slug: 'warung-nusantara',
      description: 'Pesan makanan & minuman Warung Nusantara secara online',
      themeSettings: { primaryColor: '#D4A574', secondaryColor: '#2C1810', fontFamily: 'Inter' },
      shippingMethods: [
        { name: 'Ambil di Toko', cost: 0 },
        { name: 'Kurir Toko', cost: 15000 },
      ],
      paymentMethods: ['qris', 'bank_transfer', 'cash'],
    },
  });
  console.log(`  Created 1 online store`);

  console.log('Creating self-order session...');
  const selfOrderSession = await prisma.selfOrderSession.create({
    data: {
      outletId: params.outletPusatId,
      tableId: params.tableId,
      sessionCode: 'WN-T6-ABC123',
      status: 'active',
      customerName: 'Guest',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: params.productIds.mieGoreng.id, quantity: 1 },
          { productId: params.productIds.kopiSusu.id, quantity: 2 },
        ],
      },
    },
  });
  console.log(`  Created 1 active self-order session (code: ${selfOrderSession.sessionCode})`);

  return { selfOrderSession };
}
