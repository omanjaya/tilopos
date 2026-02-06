import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleProducts() {
  try {
    console.log('🚀 Adding sample products...\n');

    // Get first business and outlet
    const business = await prisma.business.findFirst();
    if (!business) {
      throw new Error('No business found. Please run main seed first.');
    }

    const outlet = await prisma.outlet.findFirst({
      where: { businessId: business.id },
    });
    if (!outlet) {
      throw new Error('No outlet found. Please run main seed first.');
    }

    console.log(`✓ Using Business: ${business.name}`);
    console.log(`✓ Using Outlet: ${outlet.name}\n`);

    // Create Categories
    console.log('Creating categories...');

    // Check if category exists first
    let foodCategory = await prisma.category.findFirst({
      where: { businessId: business.id, name: 'Makanan' }
    });
    if (!foodCategory) {
      foodCategory = await prisma.category.create({
        data: {
          businessId: business.id,
          name: 'Makanan',
          description: 'Menu makanan',
          sortOrder: 1,
          isActive: true,
        }
      });
    }

    let drinkCategory = await prisma.category.findFirst({
      where: { businessId: business.id, name: 'Minuman' }
    });
    if (!drinkCategory) {
      drinkCategory = await prisma.category.create({
        data: {
          businessId: business.id,
          name: 'Minuman',
          description: 'Menu minuman',
          sortOrder: 2,
          isActive: true,
        }
      });
    }

    let snackCategory = await prisma.category.findFirst({
      where: { businessId: business.id, name: 'Snack' }
    });
    if (!snackCategory) {
      snackCategory = await prisma.category.create({
        data: {
          businessId: business.id,
          name: 'Snack',
          description: 'Menu snack & cemilan',
          sortOrder: 3,
          isActive: true,
        }
      });
    }

    console.log(`✓ Categories created\n`);

    // Create Products - MAKANAN
    console.log('Creating food products...');

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: foodCategory.id,
        name: 'Nasi Goreng',
        sku: 'FOOD-001',
        description: 'Nasi goreng spesial dengan telur',
        basePrice: 25000,
        isActive: true,
        trackStock: false,
        variants: {
          create: [
            { name: 'Biasa', price: 25000, sku: 'FOOD-001-REG', isActive: true },
            { name: 'Spesial', price: 30000, sku: 'FOOD-001-SPC', isActive: true },
            { name: 'Seafood', price: 35000, sku: 'FOOD-001-SEA', isActive: true },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: foodCategory.id,
        name: 'Mie Bakso',
        sku: 'FOOD-002',
        description: 'Mie bakso kuah dengan bakso sapi',
        basePrice: 20000,
        isActive: true,
        trackStock: false,
        variants: {
          create: [
            { name: 'Original', price: 20000, sku: 'FOOD-002-ORI', isActive: true },
            { name: 'Jumbo', price: 28000, sku: 'FOOD-002-JMB', isActive: true },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: foodCategory.id,
        name: 'Ayam Goreng',
        sku: 'FOOD-003',
        description: 'Ayam goreng crispy dengan nasi',
        basePrice: 28000,
        isActive: true,
        trackStock: false,
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: foodCategory.id,
        name: 'Gurame Goreng',
        sku: 'FOOD-004',
        description: 'Ikan gurame goreng dengan sambal',
        basePrice: 45000,
        isActive: true,
        trackStock: false,
      },
    });

    console.log(`✓ Food products created\n`);

    // Create Products - MINUMAN
    console.log('Creating drink products...');

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: drinkCategory.id,
        name: 'Es Teh',
        sku: 'DRINK-001',
        description: 'Es teh manis segar',
        basePrice: 5000,
        isActive: true,
        trackStock: false,
        variants: {
          create: [
            { name: 'Manis', price: 5000, sku: 'DRINK-001-SWT', isActive: true },
            { name: 'Tawar', price: 3000, sku: 'DRINK-001-PLN', isActive: true },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: drinkCategory.id,
        name: 'Es Jeruk',
        sku: 'DRINK-002',
        description: 'Jus jeruk segar dengan es',
        basePrice: 8000,
        isActive: true,
        trackStock: false,
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: drinkCategory.id,
        name: 'Kopi',
        sku: 'DRINK-003',
        description: 'Kopi hitam atau kopi susu',
        basePrice: 10000,
        isActive: true,
        trackStock: false,
        variants: {
          create: [
            { name: 'Hitam Panas', price: 8000, sku: 'DRINK-003-BH', isActive: true },
            { name: 'Hitam Dingin', price: 10000, sku: 'DRINK-003-BC', isActive: true },
            { name: 'Susu Panas', price: 12000, sku: 'DRINK-003-LH', isActive: true },
            { name: 'Susu Dingin', price: 15000, sku: 'DRINK-003-LC', isActive: true },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: drinkCategory.id,
        name: 'Jus Buah',
        sku: 'DRINK-004',
        description: 'Jus buah segar pilihan',
        basePrice: 15000,
        isActive: true,
        trackStock: false,
        variants: {
          create: [
            { name: 'Alpukat', price: 15000, sku: 'DRINK-004-AVO', isActive: true },
            { name: 'Mangga', price: 15000, sku: 'DRINK-004-MNG', isActive: true },
            { name: 'Strawberry', price: 18000, sku: 'DRINK-004-STR', isActive: true },
          ],
        },
      },
    });

    console.log(`✓ Drink products created\n`);

    // Create Products - SNACK
    console.log('Creating snack products...');

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: snackCategory.id,
        name: 'Kentang Goreng',
        sku: 'SNACK-001',
        description: 'French fries crispy',
        basePrice: 15000,
        isActive: true,
        trackStock: false,
        variants: {
          create: [
            { name: 'Regular', price: 15000, sku: 'SNACK-001-REG', isActive: true },
            { name: 'Large', price: 20000, sku: 'SNACK-001-LRG', isActive: true },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: snackCategory.id,
        name: 'Tahu Crispy',
        sku: 'SNACK-002',
        description: 'Tahu goreng crispy dengan saus',
        basePrice: 12000,
        isActive: true,
        trackStock: false,
      },
    });

    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: snackCategory.id,
        name: 'Pisang Goreng',
        sku: 'SNACK-003',
        description: 'Pisang goreng crispy',
        basePrice: 10000,
        isActive: true,
        trackStock: false,
      },
    });

    console.log(`✓ Snack products created\n`);

    // Summary
    const totalProducts = await prisma.product.count({
      where: { businessId: business.id },
    });

    console.log('========================================');
    console.log('✅ SAMPLE PRODUCTS CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`📦 Total Products: ${totalProducts}`);
    console.log(`📁 Categories: 3 (Makanan, Minuman, Snack)`);
    console.log(`🏢 Business: ${business.name}`);
    console.log(`🏪 Outlet: ${outlet.name}`);
    console.log('\n💡 Refresh your POS page to see the products!\n');

  } catch (error) {
    console.error('❌ Error adding sample products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSampleProducts();
