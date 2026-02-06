/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

export async function seedBusiness(prisma: PrismaClient) {
  console.log('Creating business...');
  const business = await prisma.business.create({
    data: {
      name: 'Brew & Bites Coffee Shop',
      legalName: 'PT Brew and Bites Indonesia',
      taxId: '12.345.678.9-012.345',
      phone: '021-5551234',
      email: 'hello@brewbites.id',
      address: 'Jl. Senopati No. 88, Jakarta Selatan 12190',
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
      name: 'Brew & Bites - Senopati (Main)',
      code: 'BB-JKT-01',
      address: 'Jl. Senopati No. 88, Jakarta Selatan',
      phone: '021-5551234',
      taxRate: 11,
      serviceCharge: 0,
      receiptHeader: 'Brew & Bites Coffee Shop\nJl. Senopati No. 88\nJakarta Selatan',
      receiptFooter: 'Thank you for visiting!\nFollow us @brewbites.id',
    },
  });

  const outletCabang = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'Brew & Bites - Menteng',
      code: 'BB-JKT-02',
      address: 'Jl. Menteng Raya No. 25, Jakarta Pusat',
      phone: '021-5559876',
      taxRate: 11,
      serviceCharge: 0,
      receiptHeader: 'Brew & Bites Coffee Shop\nJl. Menteng Raya No. 25\nJakarta Pusat',
      receiptFooter: 'Thank you!\nInstagram: @brewbites.id',
    },
  });
  console.log(`  Outlet 1: ${outletPusat.name}`);
  console.log(`  Outlet 2: ${outletCabang.name}`);

  return { business, outletPusat, outletCabang };
}
