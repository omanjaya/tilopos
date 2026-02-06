/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedCustomersParams {
  businessId: string;
}

export async function seedCustomers(prisma: PrismaClient, params: SeedCustomersParams) {
  console.log('Creating customers...');
  const cust1 = await prisma.customer.create({
    data: {
      businessId: params.businessId,
      name: 'Ahmad Fauzi',
      email: 'ahmad.fauzi@email.com',
      phone: '081999888777',
      loyaltyPoints: 1250,
      loyaltyTier: 'gold',
      totalSpent: 2500000,
      visitCount: 45,
      lastVisitAt: new Date('2026-01-28'),
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      businessId: params.businessId,
      name: 'Maya Putri',
      email: 'maya.putri@email.com',
      phone: '081666555444',
      loyaltyPoints: 450,
      loyaltyTier: 'silver',
      totalSpent: 850000,
      visitCount: 15,
      lastVisitAt: new Date('2026-01-25'),
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      businessId: params.businessId,
      name: 'Rudi Hermawan',
      phone: '081333222111',
      loyaltyPoints: 50,
      loyaltyTier: 'regular',
      totalSpent: 150000,
      visitCount: 3,
    },
  });

  const cust4 = await prisma.customer.create({
    data: {
      businessId: params.businessId,
      name: 'PT Maju Bersama',
      email: 'office@majubersama.co.id',
      phone: '021-7778899',
      customerType: 'company',
      loyaltyPoints: 3000,
      loyaltyTier: 'platinum',
      totalSpent: 15000000,
      visitCount: 120,
      lastVisitAt: new Date('2026-01-29'),
      notes: 'Corporate client, sering catering',
    },
  });
  console.log(`  Created 4 customers`);

  return { cust1, cust2, cust3, cust4 };
}
