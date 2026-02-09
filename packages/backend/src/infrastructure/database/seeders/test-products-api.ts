import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProductsAPI() {
  try {
    const business = await prisma.business.findFirst();
    if (!business) {
      console.log('❌ No business found');
      return;
    }

    // This simulates what the API returns
    const products = await prisma.product.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log(`\n📦 Found ${products.length} active products\n`);

    if (products.length > 0) {
      const sample = products[0];
      console.log('Sample product structure:');
      console.log(
        JSON.stringify(
          {
            id: sample.id,
            name: sample.name,
            sku: sample.sku,
            basePrice: sample.basePrice,
            imageUrl: sample.imageUrl,
            categoryId: sample.categoryId,
            category: sample.category,
            variants: sample.variants,
            isActive: sample.isActive,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProductsAPI();
