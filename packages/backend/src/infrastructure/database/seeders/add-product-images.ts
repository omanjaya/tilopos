import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Product images mapping - using Unsplash URLs in WebP format (free, no API key needed)
const PRODUCT_IMAGES: Record<string, string> = {
  // Coffee drinks
  'Espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80&fm=webp',
  'Americano': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80&fm=webp',
  'Caffe Latte': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80&fm=webp',
  'Cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80&fm=webp',
  'Caffe Mocha': 'https://images.unsplash.com/photo-1607260550778-aa9d29444ce1?w=400&q=80&fm=webp',
  'Flat White': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&q=80&fm=webp',
  'Iced Latte': 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&q=80&fm=webp',
  'Iced Americano': 'https://images.unsplash.com/photo-1523942839745-7848c839b661?w=400&q=80&fm=webp',
  'Cold Brew': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80&fm=webp',
  'Iced Mocha': 'https://images.unsplash.com/photo-1542990253-a781e04c0082?w=400&q=80&fm=webp',

  // Non-coffee drinks
  'Matcha Latte': 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&q=80&fm=webp',
  'Hot Chocolate': 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400&q=80&fm=webp',
  'Chai Latte': 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80&fm=webp',
  'Fresh Orange Juice': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80&fm=webp',

  // Pastries
  'Butter Croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80&fm=webp',
  'Chocolate Croissant': 'https://images.unsplash.com/photo-1623334044303-241021148842?w=400&q=80&fm=webp',
  'Blueberry Muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&q=80&fm=webp',
  'Banana Bread': 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&q=80&fm=webp',
  'Chocolate Chip Cookies': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80&fm=webp',

  // Food
  'Breakfast Sandwich': 'https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=400&q=80&fm=webp',
  'Avocado Toast': 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=400&q=80&fm=webp',
  'Bagel with Cream Cheese': 'https://images.unsplash.com/photo-1551106652-a5bcf4b29ab6?w=400&q=80&fm=webp',
  'Club Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80&fm=webp',
};

async function addProductImages() {
  try {
    console.log('🎨 Adding product images...\n');

    const business = await prisma.business.findFirst();
    if (!business) {
      throw new Error('No business found. Please run main seed first.');
    }

    // Get all products
    const products = await prisma.product.findMany({
      where: { businessId: business.id },
    });

    console.log(`Found ${products.length} products\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      const imageUrl = PRODUCT_IMAGES[product.name];

      if (imageUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl },
        });
        console.log(`✓ Updated: ${product.name}`);
        updatedCount++;
      } else {
        console.log(`⊘ Skipped: ${product.name} (no image mapping)`);
        skippedCount++;
      }
    }

    console.log('\n========================================');
    console.log('✅ PRODUCT IMAGES UPDATED!');
    console.log('========================================');
    console.log(`✓ Updated: ${updatedCount} products`);
    console.log(`⊘ Skipped: ${skippedCount} products`);
    console.log('\n💡 Refresh your Products page to see the images!\n');

  } catch (error) {
    console.error('❌ Error adding product images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addProductImages();
