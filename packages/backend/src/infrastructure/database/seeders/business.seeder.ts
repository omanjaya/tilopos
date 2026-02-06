/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

export async function seedBusiness(prisma: PrismaClient) {
  console.log('Creating business...');
  const business = await prisma.business.create({
    data: {
      name: 'Warung Nusantara',
      legalName: 'PT Warung Nusantara Indonesia',
      taxId: '12.345.678.9-012.345',
      phone: '021-5551234',
      email: 'admin@warungnusantara.id',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan 12190',
      subscriptionPlan: 'premium',
      subscriptionExpiresAt: new Date('2027-12-31'),
      settings: {
        currency: 'IDR',
        locale: 'id-ID',
        timezone: 'Asia/Jakarta',
        receiptLogo: true,
        enableLoyalty: true,
        enableSelfOrder: true,
        enableOnlineStore: true,
      },
    },
  });
  console.log(`  Business: ${business.name} (${business.id})`);

  // Create outlets
  console.log('Creating outlets...');
  const outletPusat = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'Warung Nusantara - Sudirman (Pusat)',
      code: 'WN-JKT-01',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      phone: '021-5551234',
      taxRate: 11,
      serviceCharge: 5,
      receiptHeader: 'Warung Nusantara\nJl. Sudirman No. 123\nJakarta Selatan',
      receiptFooter: 'Terima kasih telah berkunjung!\nFollow us @warungnusantara',
    },
  });

  const outletCabang = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'Warung Nusantara - Kemang',
      code: 'WN-JKT-02',
      address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
      phone: '021-5559876',
      taxRate: 11,
      serviceCharge: 0,
      receiptHeader: 'Warung Nusantara Kemang\nJl. Kemang Raya No. 45',
      receiptFooter: 'Terima kasih!',
    },
  });
  console.log(`  Outlet 1: ${outletPusat.name}`);
  console.log(`  Outlet 2: ${outletCabang.name}`);

  return { business, outletPusat, outletCabang };
}
