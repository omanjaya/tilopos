/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedInventoryParams {
  businessId: string;
  outletPusatId: string;
  outletCabangId: string;
  productIds: {
    nasiGoreng: { id: string };
    nasiAyam: { id: string };
    ayamBakarReg: { id: string };
    ayamBakarJumbo: { id: string };
    mieGoreng: { id: string };
    mieAyam: { id: string };
    kentangGoreng: { id: string };
    kentangReg: { id: string };
    kentangLarge: { id: string };
    dimsum: { id: string };
    espresso: { id: string };
    cappuccino: { id: string };
    kopiSusu: { id: string };
    airMineral: { id: string };
    pisangGoreng: { id: string };
    esKrim: { id: string };
    esKrimVanilla: { id: string };
    esKrimCoklat: { id: string };
    esKrimMatcha: { id: string };
  };
  inventoryStaffId: string;
}

export async function seedInventory(prisma: PrismaClient, params: SeedInventoryParams) {
  console.log('Creating stock levels...');
  const stockableProducts = [
    { product: params.productIds.nasiGoreng, qty: 100 },
    {
      product: params.productIds.nasiAyam,
      qty: 80,
      variants: [
        { v: params.productIds.ayamBakarReg, qty: 50 },
        { v: params.productIds.ayamBakarJumbo, qty: 30 },
      ],
    },
    { product: params.productIds.mieGoreng, qty: 100 },
    { product: params.productIds.mieAyam, qty: 80 },
    {
      product: params.productIds.kentangGoreng,
      qty: 0,
      variants: [
        { v: params.productIds.kentangReg, qty: 60 },
        { v: params.productIds.kentangLarge, qty: 40 },
      ],
    },
    { product: params.productIds.dimsum, qty: 50 },
    { product: params.productIds.airMineral, qty: 200 },
    { product: params.productIds.pisangGoreng, qty: 40 },
    {
      product: params.productIds.esKrim,
      qty: 0,
      variants: [
        { v: params.productIds.esKrimVanilla, qty: 30 },
        { v: params.productIds.esKrimCoklat, qty: 25 },
        { v: params.productIds.esKrimMatcha, qty: 20 },
      ],
    },
  ];

  for (const outlet of [params.outletPusatId, params.outletCabangId]) {
    for (const sp of stockableProducts) {
      if (sp.variants) {
        for (const sv of sp.variants) {
          await prisma.stockLevel.create({
            data: {
              outletId: outlet,
              productId: sp.product.id,
              variantId: sv.v.id,
              quantity: sv.qty,
              lowStockAlert: 10,
            },
          });
        }
      } else {
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
  }
  console.log(`  Created stock levels for both outlets`);

  console.log('Creating ingredients & recipes...');
  const ingBeras = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Beras Putih',
      sku: 'ING-001',
      unit: 'kg',
      costPerUnit: 15000,
    },
  });
  const ingAyam = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Daging Ayam',
      sku: 'ING-002',
      unit: 'kg',
      costPerUnit: 40000,
    },
  });
  const ingMie = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Mie Telur',
      sku: 'ING-003',
      unit: 'kg',
      costPerUnit: 20000,
    },
  });
  const ingMinyak = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Minyak Goreng',
      sku: 'ING-004',
      unit: 'liter',
      costPerUnit: 18000,
    },
  });
  const ingTelur = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Telur Ayam',
      sku: 'ING-005',
      unit: 'butir',
      costPerUnit: 2500,
    },
  });
  const ingKopi = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Biji Kopi Arabica',
      sku: 'ING-006',
      unit: 'kg',
      costPerUnit: 200000,
    },
  });
  const ingSusu = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Susu Segar',
      sku: 'ING-007',
      unit: 'liter',
      costPerUnit: 25000,
    },
  });
  const ingGula = await prisma.ingredient.create({
    data: {
      businessId: params.businessId,
      name: 'Gula Aren',
      sku: 'ING-008',
      unit: 'kg',
      costPerUnit: 50000,
    },
  });

  const ingredients = [ingBeras, ingAyam, ingMie, ingMinyak, ingTelur, ingKopi, ingSusu, ingGula];

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
      productId: params.productIds.nasiGoreng.id,
      notes: 'Resep nasi goreng spesial',
      items: {
        create: [
          { ingredientId: ingBeras.id, quantity: 0.2, unit: 'kg' },
          { ingredientId: ingTelur.id, quantity: 1, unit: 'butir' },
          { ingredientId: ingMinyak.id, quantity: 0.03, unit: 'liter' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.nasiAyam.id,
      notes: 'Resep nasi ayam bakar',
      items: {
        create: [
          { ingredientId: ingBeras.id, quantity: 0.2, unit: 'kg' },
          { ingredientId: ingAyam.id, quantity: 0.15, unit: 'kg' },
          { ingredientId: ingMinyak.id, quantity: 0.02, unit: 'liter' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.mieGoreng.id,
      items: {
        create: [
          { ingredientId: ingMie.id, quantity: 0.15, unit: 'kg' },
          { ingredientId: ingTelur.id, quantity: 1, unit: 'butir' },
          { ingredientId: ingMinyak.id, quantity: 0.02, unit: 'liter' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.espresso.id,
      items: { create: [{ ingredientId: ingKopi.id, quantity: 0.018, unit: 'kg' }] },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.cappuccino.id,
      items: {
        create: [
          { ingredientId: ingKopi.id, quantity: 0.018, unit: 'kg' },
          { ingredientId: ingSusu.id, quantity: 0.15, unit: 'liter' },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: params.productIds.kopiSusu.id,
      items: {
        create: [
          { ingredientId: ingKopi.id, quantity: 0.018, unit: 'kg' },
          { ingredientId: ingSusu.id, quantity: 0.1, unit: 'liter' },
          { ingredientId: ingGula.id, quantity: 0.02, unit: 'kg' },
        ],
      },
    },
  });
  console.log(`  Created ${ingredients.length} ingredients, 6 recipes`);

  console.log('Creating suppliers...');
  const supplierBeras = await prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: 'UD Tani Makmur',
      contactPerson: 'Pak Slamet',
      phone: '081111222333',
      email: 'tanimakmur@gmail.com',
      address: 'Jl. Pasar Induk, Bogor',
    },
  });

  await prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: 'CV Unggas Jaya',
      contactPerson: 'Bu Yanti',
      phone: '081444555666',
      email: 'unggas.jaya@gmail.com',
      address: 'Jl. Raya Tangerang, Banten',
    },
  });

  await prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: 'PT Kopi Nusantara',
      contactPerson: 'Mas Dimas',
      phone: '081777888999',
      email: 'info@kopinusantara.id',
      address: 'Jl. Gayo, Aceh',
    },
  });

  // Purchase Orders
  await prisma.purchaseOrder.create({
    data: {
      outletId: params.outletPusatId,
      supplierId: supplierBeras.id,
      poNumber: 'PO-2026-001',
      status: 'received',
      totalAmount: 750000,
      createdBy: params.inventoryStaffId,
      orderedAt: new Date('2026-01-20'),
      receivedAt: new Date('2026-01-22'),
      items: {
        create: [
          {
            ingredientId: ingBeras.id,
            itemName: 'Beras Putih',
            quantityOrdered: 50,
            quantityReceived: 50,
            unitCost: 15000,
            subtotal: 750000,
          },
        ],
      },
    },
  });
  console.log(`  Created 3 suppliers, 1 purchase order`);

  return { ingredients, suppliers: [supplierBeras] };
}
