/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedProductsParams {
  businessId: string;
}

export async function seedProducts(prisma: PrismaClient, params: SeedProductsParams) {
  console.log('Creating categories...');

  // Main categories
  const catCoffee = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Coffee', sortOrder: 1 },
  });
  const catHotCoffee = await prisma.category.create({
    data: {
      businessId: params.businessId,
      name: 'Hot Coffee',
      parentId: catCoffee.id,
      sortOrder: 1,
    },
  });
  const catIcedCoffee = await prisma.category.create({
    data: {
      businessId: params.businessId,
      name: 'Iced Coffee',
      parentId: catCoffee.id,
      sortOrder: 2,
    },
  });

  const catNonCoffee = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Non-Coffee', sortOrder: 2 },
  });

  const catPastries = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Pastries & Bakery', sortOrder: 3 },
  });

  const catFood = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Food', sortOrder: 4 },
  });

  console.log(`  Created 6 categories`);

  console.log('Creating modifier groups...');

  // Milk options
  const mgMilk = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Milk Type',
      selectionType: 'single',
      isRequired: false,
      modifiers: {
        create: [
          { name: 'Regular Milk', price: 0, sortOrder: 1 },
          { name: 'Oat Milk', price: 8000, sortOrder: 2 },
          { name: 'Almond Milk', price: 8000, sortOrder: 3 },
          { name: 'Soy Milk', price: 5000, sortOrder: 4 },
        ],
      },
    },
    include: { modifiers: true },
  });

  // Sugar level
  const mgSugar = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Sugar Level',
      selectionType: 'single',
      isRequired: true,
      modifiers: {
        create: [
          { name: 'No Sugar', price: 0, sortOrder: 1 },
          { name: 'Less Sugar (50%)', price: 0, sortOrder: 2 },
          { name: 'Normal Sugar', price: 0, sortOrder: 3 },
          { name: 'Extra Sugar', price: 0, sortOrder: 4 },
        ],
      },
    },
    include: { modifiers: true },
  });

  // Ice level
  const mgIce = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Ice Level',
      selectionType: 'single',
      modifiers: {
        create: [
          { name: 'No Ice', price: 0, sortOrder: 1 },
          { name: 'Less Ice', price: 0, sortOrder: 2 },
          { name: 'Regular Ice', price: 0, sortOrder: 3 },
          { name: 'Extra Ice', price: 0, sortOrder: 4 },
        ],
      },
    },
    include: { modifiers: true },
  });

  // Espresso shots
  const mgShots = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Espresso Shots',
      selectionType: 'single',
      modifiers: {
        create: [
          { name: 'Single Shot', price: 0, sortOrder: 1 },
          { name: 'Double Shot', price: 0, sortOrder: 2 },
          { name: 'Extra Shot (+1)', price: 10000, sortOrder: 3 },
        ],
      },
    },
    include: { modifiers: true },
  });

  // Toppings
  const mgToppings = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Add-ons',
      selectionType: 'multiple',
      maxSelection: 5,
      modifiers: {
        create: [
          { name: 'Whipped Cream', price: 5000, sortOrder: 1 },
          { name: 'Caramel Drizzle', price: 5000, sortOrder: 2 },
          { name: 'Chocolate Syrup', price: 5000, sortOrder: 3 },
          { name: 'Vanilla Syrup', price: 5000, sortOrder: 4 },
          { name: 'Hazelnut Syrup', price: 5000, sortOrder: 5 },
        ],
      },
    },
    include: { modifiers: true },
  });

  console.log(`  Created 5 modifier groups with 21 modifiers`);

  console.log('Creating products...');

  // ===== HOT COFFEE =====
  const espresso = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catHotCoffee.id,
      sku: 'COFFEE-001',
      name: 'Espresso',
      description: 'Rich and bold single-origin espresso',
      basePrice: 35000,
      costPrice: 8000,
      trackStock: false,
      hasVariants: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
        ],
      },
    },
  });

  const americano = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catHotCoffee.id,
      sku: 'COFFEE-002',
      name: 'Americano',
      description: 'Espresso diluted with hot water',
      basePrice: 38000,
      costPrice: 9000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
        ],
      },
    },
  });

  const latte = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catHotCoffee.id,
      sku: 'COFFEE-003',
      name: 'Caffe Latte',
      description: 'Espresso with steamed milk and light foam',
      basePrice: 45000,
      costPrice: 12000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgMilk.id, sortOrder: 2 },
          { modifierGroupId: mgSugar.id, sortOrder: 3 },
        ],
      },
    },
  });

  const cappuccino = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catHotCoffee.id,
      sku: 'COFFEE-004',
      name: 'Cappuccino',
      description: 'Espresso with equal parts steamed milk and foam',
      basePrice: 45000,
      costPrice: 12000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgMilk.id, sortOrder: 2 },
          { modifierGroupId: mgSugar.id, sortOrder: 3 },
        ],
      },
    },
  });

  const mocha = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catHotCoffee.id,
      sku: 'COFFEE-005',
      name: 'Caffe Mocha',
      description: 'Espresso with chocolate, steamed milk, and whipped cream',
      basePrice: 48000,
      costPrice: 14000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgMilk.id, sortOrder: 2 },
          { modifierGroupId: mgSugar.id, sortOrder: 3 },
          { modifierGroupId: mgToppings.id, sortOrder: 4 },
        ],
      },
    },
  });

  const flatWhite = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catHotCoffee.id,
      sku: 'COFFEE-006',
      name: 'Flat White',
      description: 'Double shot espresso with velvety microfoam',
      basePrice: 48000,
      costPrice: 13000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgMilk.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
        ],
      },
    },
  });

  // ===== ICED COFFEE =====
  const icedLatte = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catIcedCoffee.id,
      sku: 'COFFEE-007',
      name: 'Iced Latte',
      description: 'Chilled espresso with cold milk over ice',
      basePrice: 48000,
      costPrice: 13000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgMilk.id, sortOrder: 2 },
          { modifierGroupId: mgSugar.id, sortOrder: 3 },
          { modifierGroupId: mgIce.id, sortOrder: 4 },
        ],
      },
    },
  });

  const icedAmericano = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catIcedCoffee.id,
      sku: 'COFFEE-008',
      name: 'Iced Americano',
      description: 'Espresso with cold water over ice',
      basePrice: 40000,
      costPrice: 10000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
          { modifierGroupId: mgIce.id, sortOrder: 3 },
        ],
      },
    },
  });

  const coldBrew = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catIcedCoffee.id,
      sku: 'COFFEE-009',
      name: 'Cold Brew',
      description: 'Smooth, slow-steeped coffee concentrate over ice',
      basePrice: 45000,
      costPrice: 12000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgMilk.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
          { modifierGroupId: mgIce.id, sortOrder: 3 },
        ],
      },
    },
  });

  const icedMocha = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catIcedCoffee.id,
      sku: 'COFFEE-010',
      name: 'Iced Mocha',
      description: 'Iced espresso with chocolate and cold milk',
      basePrice: 50000,
      costPrice: 15000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgShots.id, sortOrder: 1 },
          { modifierGroupId: mgMilk.id, sortOrder: 2 },
          { modifierGroupId: mgSugar.id, sortOrder: 3 },
          { modifierGroupId: mgIce.id, sortOrder: 4 },
          { modifierGroupId: mgToppings.id, sortOrder: 5 },
        ],
      },
    },
  });

  // ===== NON-COFFEE =====
  const matchaLatte = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonCoffee.id,
      sku: 'NONCOF-001',
      name: 'Matcha Latte',
      description: 'Premium Japanese matcha with steamed milk',
      basePrice: 48000,
      costPrice: 15000,
      trackStock: false,
      hasVariants: true,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgMilk.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
        ],
      },
    },
  });
  await prisma.productVariant.create({
    data: { productId: matchaLatte.id, sku: 'NONCOF-001-H', name: 'Hot', price: 48000 },
  });
  await prisma.productVariant.create({
    data: { productId: matchaLatte.id, sku: 'NONCOF-001-I', name: 'Iced', price: 50000 },
  });

  const hotChocolate = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonCoffee.id,
      sku: 'NONCOF-002',
      name: 'Hot Chocolate',
      description: 'Rich Belgian chocolate with steamed milk',
      basePrice: 42000,
      costPrice: 12000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgMilk.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
          { modifierGroupId: mgToppings.id, sortOrder: 3 },
        ],
      },
    },
  });

  const chaiLatte = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonCoffee.id,
      sku: 'NONCOF-003',
      name: 'Chai Latte',
      description: 'Spiced tea with steamed milk',
      basePrice: 42000,
      costPrice: 11000,
      trackStock: false,
      hasVariants: true,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgMilk.id, sortOrder: 1 },
          { modifierGroupId: mgSugar.id, sortOrder: 2 },
        ],
      },
    },
  });
  await prisma.productVariant.create({
    data: { productId: chaiLatte.id, sku: 'NONCOF-003-H', name: 'Hot', price: 42000 },
  });
  await prisma.productVariant.create({
    data: { productId: chaiLatte.id, sku: 'NONCOF-003-I', name: 'Iced', price: 45000 },
  });

  const freshJuice = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonCoffee.id,
      sku: 'NONCOF-004',
      name: 'Fresh Orange Juice',
      description: 'Freshly squeezed orange juice',
      basePrice: 35000,
      costPrice: 12000,
      trackStock: true,
    },
  });

  // ===== PASTRIES & BAKERY =====
  const croissant = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catPastries.id,
      sku: 'PASTRY-001',
      name: 'Butter Croissant',
      description: 'Flaky, buttery French croissant',
      basePrice: 35000,
      costPrice: 10000,
      trackStock: true,
    },
  });

  const chocoCroissant = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catPastries.id,
      sku: 'PASTRY-002',
      name: 'Chocolate Croissant',
      description: 'Croissant filled with premium chocolate',
      basePrice: 40000,
      costPrice: 12000,
      trackStock: true,
    },
  });

  const blueberryMuffin = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catPastries.id,
      sku: 'PASTRY-003',
      name: 'Blueberry Muffin',
      description: 'Moist muffin with fresh blueberries',
      basePrice: 32000,
      costPrice: 9000,
      trackStock: true,
    },
  });

  const bananaBread = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catPastries.id,
      sku: 'PASTRY-004',
      name: 'Banana Bread',
      description: 'Homemade banana bread slice',
      basePrice: 30000,
      costPrice: 8000,
      trackStock: true,
    },
  });

  const cookies = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catPastries.id,
      sku: 'PASTRY-005',
      name: 'Chocolate Chip Cookies',
      description: 'Freshly baked cookies (2 pcs)',
      basePrice: 25000,
      costPrice: 7000,
      trackStock: true,
    },
  });

  // ===== FOOD =====
  const breakfastSandwich = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catFood.id,
      sku: 'FOOD-001',
      name: 'Breakfast Sandwich',
      description: 'Egg, cheese, and bacon on toasted bread',
      basePrice: 55000,
      costPrice: 20000,
      trackStock: true,
    },
  });

  const avocadoToast = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catFood.id,
      sku: 'FOOD-002',
      name: 'Avocado Toast',
      description: 'Smashed avocado on sourdough with cherry tomatoes',
      basePrice: 60000,
      costPrice: 22000,
      trackStock: true,
    },
  });

  const bagelCreamCheese = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catFood.id,
      sku: 'FOOD-003',
      name: 'Bagel with Cream Cheese',
      description: 'Fresh bagel with cream cheese spread',
      basePrice: 38000,
      costPrice: 12000,
      trackStock: true,
    },
  });

  const clubSandwich = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catFood.id,
      sku: 'FOOD-004',
      name: 'Club Sandwich',
      description: 'Triple-decker sandwich with turkey, bacon, and vegetables',
      basePrice: 65000,
      costPrice: 25000,
      trackStock: true,
    },
  });

  const allProducts = [
    espresso,
    americano,
    latte,
    cappuccino,
    mocha,
    flatWhite,
    icedLatte,
    icedAmericano,
    coldBrew,
    icedMocha,
    matchaLatte,
    hotChocolate,
    chaiLatte,
    freshJuice,
    croissant,
    chocoCroissant,
    blueberryMuffin,
    bananaBread,
    cookies,
    breakfastSandwich,
    avocadoToast,
    bagelCreamCheese,
    clubSandwich,
  ];
  console.log(`  Created ${allProducts.length} products with variants and modifiers`);

  return {
    espresso,
    americano,
    latte,
    cappuccino,
    mocha,
    flatWhite,
    icedLatte,
    icedAmericano,
    coldBrew,
    icedMocha,
    matchaLatte,
    hotChocolate,
    chaiLatte,
    freshJuice,
    croissant,
    chocoCroissant,
    blueberryMuffin,
    bananaBread,
    cookies,
    breakfastSandwich,
    avocadoToast,
    bagelCreamCheese,
    clubSandwich,
  };
}
