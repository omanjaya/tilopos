import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const outlets = await prisma.outlet.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        businessId: true,
      },
    });

    console.log('📍 Outlets in database:');
    outlets.forEach(o => console.log(`  - ${o.name} (${o.id})`));

    const employee = await prisma.employee.findFirst({
      select: {
        id: true,
        email: true,
        outletId: true,
        businessId: true,
      },
    });

    console.log('\n👤 First employee:');
    console.log(`  Email: ${employee?.email}`);
    console.log(`  OutletId: ${employee?.outletId || '❌ NULL'}`);
    console.log(`  BusinessId: ${employee?.businessId}`);

    const products = await prisma.product.count();
    console.log(`\n📦 Total products: ${products}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
