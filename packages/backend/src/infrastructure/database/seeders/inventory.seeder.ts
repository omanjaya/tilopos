/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedInventoryParams {
  businessId: string;
  outletPusatId: string;
  outletCabangId: string;
  productIds: {
    croissant: { id: string };
    chocoCroissant: { id: string };
    blueberryMuffin: { id: string };
    bananaBread: { id: string };
    cookies: { id: string };
    breakfastSandwich: { id: string };
    avocadoToast: { id: string };
    bagelCreamCheese: { id: string };
    clubSandwich: { id: string };
  };
  inventoryStaffId: string;
}

export async function seedInventory(prisma: PrismaClient, params: SeedInventoryParams) {
  console.log('Creating stock levels...');
  const stockableProducts = [
    { product: params.productIds.croissant, qty: 50 },
    { product: params.productIds.chocoCroissant, qty: 45 },
    { product: params.productIds.blueberryMuffin, qty: 40 },
    { product: params.productIds.bananaBread, qty: 30 },
    { product: params.productIds.cookies, qty: 60 },
    { product: params.productIds.breakfastSandwich, qty: 25 },
    { product: params.productIds.avocadoToast, qty: 20 },
    { product: params.productIds.bagelCreamCheese, qty: 35 },
    { product: params.productIds.clubSandwich, qty: 20 },
  ];

  for (const outlet of [params.outletPusatId, params.outletCabangId]) {
    for (const sp of stockableProducts) {
      await prisma.stockLevel.create({
        data: {
          outletId: outlet,
          productId: sp.product.id,
          quantity: sp.qty,
          lowStockAlert: 10,
        },
      });
    }
  }
  console.log(`  Created stock levels for both outlets`);

  console.log('Creating ingredients & recipes...');
  const ingFlour = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'All-Purpose Flour',
      sku: 'ING-001',
      unit: 'kg',
      costPerUnit: 12000,
    },
  });
  const ingButter = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Unsalted Butter',
      sku: 'ING-002',
      unit: 'kg',
      costPerUnit: 80000,
    },
  });
  const ingChocolate = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Dark Chocolate',
      sku: 'ING-003',
      unit: 'kg',
      costPerUnit: 120000,
    },
  });
  const ingEggs = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Fresh Eggs',
      sku: 'ING-004',
      unit: 'dozen',
      costPerUnit: 30000,
    },
  });
  const ingBread = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Artisan Bread',
      sku: 'ING-005',
      unit: 'loaf',
      costPerUnit: 25000,
    },
  });
  const ingCoffee = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Arabica Coffee Beans',
      sku: 'ING-006',
      unit: 'kg',
      costPerUnit: 200000,
    },
  });
  const ingMilk = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Fresh Milk',
      sku: 'ING-007',
      unit: 'liter',
      costPerUnit: 25000,
    },
  });
  const ingAvocado = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Fresh Avocado',
      sku: 'ING-008',
      unit: 'kg',
      costPerUnit: 60000,
    },
  });

  const ingredients = [ingFlour, ingButter, ingChocolate, ingEggs, ingBread, ingCoffee, ingMilk, ingAvocado];

  // Ingredient stock levels
  for (const outlet of [params.outletPusatId, params.outletCabangId]) {
    for (const ing of ingredients) {
      await prisma.ingredientStockLevel.create({
        data: { outletId: outlet, ingredientId: ing.id, quantity: 50, lowStockAlert: 10 },
      });
    }
  }

  // Recipes
  await prisma.recipe.create({
    data: {
      productId: params.productIds.croissant.id,
      notes: 'Classic French croissant',
      items: {
        create: [
          { ingredientId: ingFlour.id, quantity: 0.08, unit: 'kg' },
          { ingredientId: ingButter.id, quantity: 0.04, unit: 'kg' },
          { ingredientId: ingEggs.id, quantity: 0.08, unit: 'dozen' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.chocoCroissant.id,
      notes: 'Chocolate-filled croissant',
      items: {
        create: [
          { ingredientId: ingFlour.id, quantity: 0.08, unit: 'kg' },
          { ingredientId: ingButter.id, quantity: 0.04, unit: 'kg' },
          { ingredientId: ingChocolate.id, quantity: 0.03, unit: 'kg' },
          { ingredientId: ingEggs.id, quantity: 0.08, unit: 'dozen' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.avocadoToast.id,
      items: {
        create: [
          { ingredientId: ingBread.id, quantity: 0.1, unit: 'loaf' },
          { ingredientId: ingAvocado.id, quantity: 0.15, unit: 'kg' },
          { ingredientId: ingEggs.id, quantity: 0.08, unit: 'dozen' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.breakfastSandwich.id,
      items: {
        create: [
          { ingredientId: ingBread.id, quantity: 0.15, unit: 'loaf' },
          { ingredientId: ingEggs.id, quantity: 0.17, unit: 'dozen' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.clubSandwich.id,
      items: {
        create: [
          { ingredientId: ingBread.id, quantity: 0.2, unit: 'loaf' },
          { ingredientId: ingEggs.id, quantity: 0.08, unit: 'dozen' },
        ],
      },
    },
  });
  console.log(`  Created ${ingredients.length} ingredients, 5 recipes`);

  console.log('Creating suppliers...');
  const supplierBakery = await prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: 'Premium Bakery Supplies',
      contactPerson: 'Sarah Chen',
      phone: '081111222333',
      email: 'info@premiumbakery.id',
      address: 'Jl. Industri Raya No. 45, Jakarta',
    },
  });

  await prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: 'Fresh Produce Indonesia',
      contactPerson: 'Andi Kusuma',
      phone: '081444555666',
      email: 'orders@freshproduce.id',
      address: 'Jl. Pasar Modern, Tangerang',
    },
  });

  await prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: 'Coffee Importers Ltd',
      contactPerson: 'Michael Tan',
      phone: '081777888999',
      email: 'sales@coffeeimport.id',
      address: 'Jl. Gayo Highland, Aceh',
    },
  });

  // Purchase Orders
  await prisma.purchaseOrder.create({
    data: {
      outletId: params.outletPusatId,
      supplierId: supplierBakery.id,
      poNumber: 'PO-2026-001',
      status: 'received',
      totalAmount: 960000,
      createdBy: params.inventoryStaffId,
      orderedAt: new Date('2026-01-20'),
      receivedAt: new Date('2026-01-22'),
      items: {
        create: [
          {
            ingredientId: ingFlour.id,
            itemName: 'All-Purpose Flour',
            quantityOrdered: 50,
            quantityReceived: 50,
            unitCost: 12000,
            subtotal: 600000,
          },
          {
            ingredientId: ingButter.id,
            itemName: 'Unsalted Butter',
            quantityOrdered: 5,
            quantityReceived: 5,
            unitCost: 80000,
            subtotal: 400000,
          },
        ],
      },
    },
  });
  console.log(`  Created 3 suppliers, 1 purchase order`);

  return { ingredients, suppliers: [supplierBakery] };
}
