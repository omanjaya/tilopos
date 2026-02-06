/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedLoyaltyParams {
  businessId: string;
}

export async function seedLoyalty(prisma: PrismaClient, params: SeedLoyaltyParams) {
  console.log('Creating loyalty program & tiers...');
  await prisma.loyaltyProgram.create({
    data: {
      businessId: params.businessId,
      name: 'Warung Nusantara Rewards',
      amountPerPoint: 10000,
      redemptionRate: 100,
      pointExpiryDays: 365,
    },
  });

  await prisma.loyaltyTier.createMany({
    data: [
      {
        businessId: params.businessId,
        name: 'regular',
        minPoints: 0,
        minSpent: 0,
        pointMultiplier: 1.0,
        sortOrder: 1,
        benefits: { discount: 0 },
      },
      {
        businessId: params.businessId,
        name: 'silver',
        minPoints: 200,
        minSpent: 500000,
        pointMultiplier: 1.25,
        sortOrder: 2,
        benefits: { discount: 5 },
      },
      {
        businessId: params.businessId,
        name: 'gold',
        minPoints: 1000,
        minSpent: 2000000,
        pointMultiplier: 1.5,
        sortOrder: 3,
        benefits: { discount: 10, freeDelivery: true },
      },
      {
        businessId: params.businessId,
        name: 'platinum',
        minPoints: 2500,
        minSpent: 10000000,
        pointMultiplier: 2.0,
        sortOrder: 4,
        benefits: { discount: 15, freeDelivery: true, priorityService: true },
      },
    ],
  });
  console.log(`  Created loyalty program with 4 tiers`);

  console.log('Creating promotions & vouchers...');
  const promoDiskon10 = await prisma.promotion.create({
    data: {
      businessId: params.businessId,
      name: 'Diskon 10% Weekend',
      description: 'Diskon 10% untuk semua menu di hari Sabtu & Minggu',
      discountType: 'percentage',
      discountValue: 10,
      minPurchase: 50000,
      maxDiscount: 50000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      usageLimit: 1000,
      applicableTo: { days: ['saturday', 'sunday'] },
    },
  });

  const promoNewYear = await prisma.promotion.create({
    data: {
      businessId: params.businessId,
      name: 'Promo Tahun Baru 2026',
      description: 'Potongan Rp 25.000 untuk pembelian min. Rp 100.000',
      discountType: 'fixed',
      discountValue: 25000,
      minPurchase: 100000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-02-28'),
      usageLimit: 500,
      applicableTo: { allProducts: true },
    },
  });

  await prisma.voucher.createMany({
    data: [
      {
        businessId: params.businessId,
        code: 'WELCOME2026',
        promotionId: promoNewYear.id,
        expiresAt: new Date('2026-02-28'),
      },
      {
        businessId: params.businessId,
        code: 'WEEKEND10',
        promotionId: promoDiskon10.id,
        expiresAt: new Date('2026-12-31'),
      },
      {
        businessId: params.businessId,
        code: 'LOYAL50K',
        initialValue: 50000,
        remainingValue: 50000,
        expiresAt: new Date('2026-06-30'),
      },
      {
        businessId: params.businessId,
        code: 'GIFT100K',
        initialValue: 100000,
        remainingValue: 100000,
        expiresAt: new Date('2026-12-31'),
      },
    ],
  });
  console.log(`  Created 2 promotions, 4 vouchers`);

  return { promoDiskon10, promoNewYear };
}
