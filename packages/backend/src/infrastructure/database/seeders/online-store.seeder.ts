/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedOnlineStoreParams {
  businessId: string;
  outletPusatId: string;
  tableId: string;
  productIds: {
    latte: { id: string };
    croissant: { id: string };
  };
}

export async function seedOnlineStore(prisma: PrismaClient, params: SeedOnlineStoreParams) {
  console.log('Creating online store...');
  await prisma.onlineStore.create({
    data: {
      businessId: params.businessId,
      storeName: 'TiloCafe Online',
      slug: 'tilocafe',
      description: 'Order premium coffee & pastries from TiloCafe for delivery or pickup',
      themeSettings: { primaryColor: '#8B4513', secondaryColor: '#2C1810', fontFamily: 'Inter' },
      shippingMethods: [
        { name: 'Pickup at Store', cost: 0 },
        { name: 'Delivery', cost: 20000 },
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
      sessionCode: 'TC-T6-ABC123',
      status: 'active',
      customerName: 'Guest',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: params.productIds.latte.id, quantity: 1 },
          { productId: params.productIds.croissant.id, quantity: 2 },
        ],
      },
    },
  });
  console.log(`  Created 1 active self-order session (code: ${selfOrderSession.sessionCode})`);

  return { selfOrderSession };
}
