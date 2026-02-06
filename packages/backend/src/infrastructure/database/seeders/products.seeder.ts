/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedProductsParams {
  businessId: string;
}

export async function seedProducts(prisma: PrismaClient, params: SeedProductsParams) {
  console.log('Creating categories...');
  const catMakanan = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Makanan', sortOrder: 1 },
  });
  const catNasi = await prisma.category.create({
    data: {
      businessId: params.businessId,
      name: 'Nasi & Rice Bowl',
      parentId: catMakanan.id,
      sortOrder: 1,
    },
  });
  const catMie = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Mie & Pasta', parentId: catMakanan.id, sortOrder: 2 },
  });
  const catSnack = await prisma.category.create({
    data: {
      businessId: params.businessId,
      name: 'Snack & Appetizer',
      parentId: catMakanan.id,
      sortOrder: 3,
    },
  });
  const catMinuman = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Minuman', sortOrder: 2 },
  });
  const catKopi = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Kopi', parentId: catMinuman.id, sortOrder: 1 },
  });
  const catNonKopi = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Non-Kopi', parentId: catMinuman.id, sortOrder: 2 },
  });
  const catDessert = await prisma.category.create({
    data: { businessId: params.businessId, name: 'Dessert', sortOrder: 3 },
  });
  console.log(`  Created 8 categories`);

  console.log('Creating modifier groups...');
  const mgSpiceLevel = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Level Pedas',
      selectionType: 'single',
      isRequired: true,
      modifiers: {
        create: [
          { name: 'Tidak Pedas', price: 0, sortOrder: 1 },
          { name: 'Pedas Sedang', price: 0, sortOrder: 2 },
          { name: 'Pedas', price: 0, sortOrder: 3 },
          { name: 'Extra Pedas', price: 2000, sortOrder: 4 },
        ],
      },
    },
    include: { modifiers: true },
  });

  const mgTopping = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Topping Tambahan',
      selectionType: 'multiple',
      maxSelection: 5,
      modifiers: {
        create: [
          { name: 'Telur Ceplok', price: 5000, sortOrder: 1 },
          { name: 'Telur Dadar', price: 5000, sortOrder: 2 },
          { name: 'Keju', price: 8000, sortOrder: 3 },
          { name: 'Sosis', price: 7000, sortOrder: 4 },
          { name: 'Ayam Suwir', price: 10000, sortOrder: 5 },
        ],
      },
    },
    include: { modifiers: true },
  });

  const mgSugarLevel = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Level Gula',
      selectionType: 'single',
      isRequired: true,
      modifiers: {
        create: [
          { name: 'Tanpa Gula', price: 0, sortOrder: 1 },
          { name: 'Less Sugar', price: 0, sortOrder: 2 },
          { name: 'Normal', price: 0, sortOrder: 3 },
          { name: 'Extra Sugar', price: 0, sortOrder: 4 },
        ],
      },
    },
    include: { modifiers: true },
  });

  const mgIceLevel = await prisma.modifierGroup.create({
    data: {
      businessId: params.businessId,
      name: 'Level Es',
      selectionType: 'single',
      modifiers: {
        create: [
          { name: 'Tanpa Es', price: 0, sortOrder: 1 },
          { name: 'Less Ice', price: 0, sortOrder: 2 },
          { name: 'Normal Ice', price: 0, sortOrder: 3 },
          { name: 'Extra Ice', price: 0, sortOrder: 4 },
        ],
      },
    },
    include: { modifiers: true },
  });
  console.log(
    `  Created 4 modifier groups with ${mgSpiceLevel.modifiers.length + mgTopping.modifiers.length + mgSugarLevel.modifiers.length + mgIceLevel.modifiers.length} modifiers`,
  );

  console.log('Creating products...');

  // Nasi & Rice Bowl
  const nasiGoreng = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNasi.id,
      sku: 'FOOD-001',
      name: 'Nasi Goreng Spesial',
      description: 'Nasi goreng dengan telur, ayam, dan sayuran',
      basePrice: 35000,
      costPrice: 15000,
      trackStock: true,
      hasVariants: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgSpiceLevel.id, sortOrder: 1 },
          { modifierGroupId: mgTopping.id, sortOrder: 2 },
        ],
      },
    },
  });

  const nasiAyam = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNasi.id,
      sku: 'FOOD-002',
      name: 'Nasi Ayam Bakar',
      description: 'Nasi putih dengan ayam bakar dan sambal',
      basePrice: 40000,
      costPrice: 18000,
      trackStock: true,
      hasVariants: true,
    },
  });

  const ayamBakarReg = await prisma.productVariant.create({
    data: { productId: nasiAyam.id, sku: 'FOOD-002-R', name: 'Regular', price: 40000, costPrice: 18000 },
  });
  const ayamBakarJumbo = await prisma.productVariant.create({
    data: { productId: nasiAyam.id, sku: 'FOOD-002-J', name: 'Jumbo', price: 55000, costPrice: 25000 },
  });

  await prisma.productModifierGroup.createMany({
    data: [
      { productId: nasiAyam.id, modifierGroupId: mgSpiceLevel.id, sortOrder: 1 },
      { productId: nasiAyam.id, modifierGroupId: mgTopping.id, sortOrder: 2 },
    ],
  });

  // Mie
  const mieGoreng = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catMie.id,
      sku: 'FOOD-003',
      name: 'Mie Goreng Jawa',
      basePrice: 30000,
      costPrice: 12000,
      trackStock: true,
      productModifierGroups: { create: [{ modifierGroupId: mgSpiceLevel.id, sortOrder: 1 }] },
    },
  });

  const mieAyam = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catMie.id,
      sku: 'FOOD-004',
      name: 'Mie Ayam Bakso',
      basePrice: 28000,
      costPrice: 11000,
      trackStock: true,
    },
  });

  // Snacks
  const kentangGoreng = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catSnack.id,
      sku: 'FOOD-005',
      name: 'Kentang Goreng',
      basePrice: 20000,
      costPrice: 8000,
      trackStock: true,
      hasVariants: true,
    },
  });
  const kentangReg = await prisma.productVariant.create({
    data: { productId: kentangGoreng.id, sku: 'FOOD-005-R', name: 'Regular', price: 20000, costPrice: 8000 },
  });
  const kentangLarge = await prisma.productVariant.create({
    data: { productId: kentangGoreng.id, sku: 'FOOD-005-L', name: 'Large', price: 30000, costPrice: 12000 },
  });

  const dimsum = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catSnack.id,
      sku: 'FOOD-006',
      name: 'Dimsum Ayam (5 pcs)',
      basePrice: 25000,
      costPrice: 10000,
      trackStock: true,
    },
  });

  // Kopi
  const espresso = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catKopi.id,
      sku: 'DRK-001',
      name: 'Espresso',
      basePrice: 18000,
      costPrice: 5000,
      trackStock: false,
      productModifierGroups: { create: [{ modifierGroupId: mgSugarLevel.id, sortOrder: 1 }] },
    },
  });

  const cappuccino = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catKopi.id,
      sku: 'DRK-002',
      name: 'Cappuccino',
      basePrice: 28000,
      costPrice: 8000,
      trackStock: false,
      hasVariants: true,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgSugarLevel.id, sortOrder: 1 },
          { modifierGroupId: mgIceLevel.id, sortOrder: 2 },
        ],
      },
    },
  });
  await prisma.productVariant.create({
    data: { productId: cappuccino.id, sku: 'DRK-002-H', name: 'Hot', price: 28000 },
  });
  const cappIce = await prisma.productVariant.create({
    data: { productId: cappuccino.id, sku: 'DRK-002-I', name: 'Iced', price: 32000 },
  });

  const kopiSusu = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catKopi.id,
      sku: 'DRK-003',
      name: 'Kopi Susu Gula Aren',
      basePrice: 25000,
      costPrice: 7000,
      trackStock: false,
      productModifierGroups: { create: [{ modifierGroupId: mgSugarLevel.id, sortOrder: 1 }] },
    },
  });

  // Non-Kopi
  const esJeruk = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonKopi.id,
      sku: 'DRK-004',
      name: 'Es Jeruk Segar',
      basePrice: 15000,
      costPrice: 4000,
      trackStock: false,
    },
  });

  const tehTarik = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonKopi.id,
      sku: 'DRK-005',
      name: 'Teh Tarik',
      basePrice: 18000,
      costPrice: 5000,
      trackStock: false,
      productModifierGroups: {
        create: [
          { modifierGroupId: mgSugarLevel.id, sortOrder: 1 },
          { modifierGroupId: mgIceLevel.id, sortOrder: 2 },
        ],
      },
    },
  });

  const airMineral = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catNonKopi.id,
      sku: 'DRK-006',
      name: 'Air Mineral',
      basePrice: 8000,
      costPrice: 2000,
      trackStock: true,
    },
  });

  // Dessert
  const pisangGoreng = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catDessert.id,
      sku: 'DST-001',
      name: 'Pisang Goreng Keju',
      basePrice: 22000,
      costPrice: 8000,
      trackStock: true,
    },
  });

  const esKrim = await prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: catDessert.id,
      sku: 'DST-002',
      name: 'Es Krim',
      basePrice: 20000,
      costPrice: 6000,
      trackStock: true,
      hasVariants: true,
    },
  });
  const esKrimVanilla = await prisma.productVariant.create({
    data: { productId: esKrim.id, sku: 'DST-002-V', name: 'Vanilla', price: 20000 },
  });
  const esKrimCoklat = await prisma.productVariant.create({
    data: { productId: esKrim.id, sku: 'DST-002-C', name: 'Coklat', price: 20000 },
  });
  const esKrimMatcha = await prisma.productVariant.create({
    data: { productId: esKrim.id, sku: 'DST-002-M', name: 'Matcha', price: 25000 },
  });

  const allProducts = [
    nasiGoreng,
    nasiAyam,
    mieGoreng,
    mieAyam,
    kentangGoreng,
    dimsum,
    espresso,
    cappuccino,
    kopiSusu,
    esJeruk,
    tehTarik,
    airMineral,
    pisangGoreng,
    esKrim,
  ];
  console.log(`  Created ${allProducts.length} products with variants`);

  return {
    nasiGoreng,
    nasiAyam,
    ayamBakarReg,
    ayamBakarJumbo,
    mieGoreng,
    mieAyam,
    kentangGoreng,
    kentangReg,
    kentangLarge,
    dimsum,
    espresso,
    cappuccino,
    cappIce,
    kopiSusu,
    esJeruk,
    tehTarik,
    airMineral,
    pisangGoreng,
    esKrim,
    esKrimVanilla,
    esKrimCoklat,
    esKrimMatcha,
  };
}
