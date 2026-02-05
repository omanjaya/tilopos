/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // ============================================================
  // CLEANUP (reverse order of dependencies)
  // ============================================================
  console.log('Cleaning existing data...');
  await prisma.storeOrderItem.deleteMany();
  await prisma.storeOrder.deleteMany();
  await prisma.onlineStore.deleteMany();
  await prisma.selfOrderItem.deleteMany();
  await prisma.selfOrderSession.deleteMany();
  await prisma.waitingList.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationSetting.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  await prisma.loyaltyProgram.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.paymentSettlement.deleteMany();
  await prisma.onlineOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.transactionItemModifier.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredientStockMovement.deleteMany();
  await prisma.ingredientStockLevel.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.device.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.business.deleteMany();
  console.log('Done.\n');

  // ============================================================
  // 1. BUSINESS
  // ============================================================
  console.log('Creating business...');
  const business = await prisma.business.create({
    data: {
      name: 'Warung Nusantara',
      legalName: 'PT Warung Nusantara Indonesia',
      taxId: '12.345.678.9-012.345',
      phone: '021-5551234',
      email: 'admin@warungnusantara.id',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan 12190',
      subscriptionPlan: 'premium',
      subscriptionExpiresAt: new Date('2027-12-31'),
      settings: {
        currency: 'IDR',
        locale: 'id-ID',
        timezone: 'Asia/Jakarta',
        receiptLogo: true,
        enableLoyalty: true,
        enableSelfOrder: true,
        enableOnlineStore: true,
      },
    },
  });
  console.log(`  Business: ${business.name} (${business.id})`);

  // ============================================================
  // 2. OUTLETS
  // ============================================================
  console.log('Creating outlets...');
  const outletPusat = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'Warung Nusantara - Sudirman (Pusat)',
      code: 'WN-JKT-01',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      phone: '021-5551234',
      taxRate: 11,
      serviceCharge: 5,
      receiptHeader: 'Warung Nusantara\nJl. Sudirman No. 123\nJakarta Selatan',
      receiptFooter: 'Terima kasih telah berkunjung!\nFollow us @warungnusantara',
    },
  });

  const outletCabang = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'Warung Nusantara - Kemang',
      code: 'WN-JKT-02',
      address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
      phone: '021-5559876',
      taxRate: 11,
      serviceCharge: 0,
      receiptHeader: 'Warung Nusantara Kemang\nJl. Kemang Raya No. 45',
      receiptFooter: 'Terima kasih!',
    },
  });
  console.log(`  Outlet 1: ${outletPusat.name}`);
  console.log(`  Outlet 2: ${outletCabang.name}`);

  // ============================================================
  // 3. EMPLOYEES
  // ============================================================
  console.log('Creating employees...');
  const hashedPin = await bcrypt.hash('1234', 10);

  const owner = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      name: 'Budi Santoso',
      email: 'budi@warungnusantara.id',
      phone: '081234567890',
      pin: hashedPin,
      role: 'owner',
      permissions: ['all'],
      hourlyRate: 0,
    },
  });

  const manager = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      name: 'Siti Rahayu',
      email: 'siti@warungnusantara.id',
      phone: '081234567891',
      pin: hashedPin,
      role: 'manager',
      permissions: ['pos', 'inventory', 'reports', 'employees', 'customers'],
      hourlyRate: 75000,
    },
  });

  const supervisor = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      name: 'Agus Wijaya',
      email: 'agus@warungnusantara.id',
      phone: '081234567892',
      pin: hashedPin,
      role: 'supervisor',
      permissions: ['pos', 'inventory', 'reports'],
      hourlyRate: 50000,
    },
  });

  const cashier1 = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      name: 'Dewi Lestari',
      email: 'dewi@warungnusantara.id',
      phone: '081234567893',
      pin: hashedPin,
      role: 'cashier',
      permissions: ['pos'],
      hourlyRate: 30000,
    },
  });

  const cashier2 = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletCabang.id,
      name: 'Rina Marlina',
      email: 'rina@warungnusantara.id',
      phone: '081234567894',
      pin: hashedPin,
      role: 'cashier',
      permissions: ['pos'],
      hourlyRate: 30000,
    },
  });

  const kitchenStaff = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      name: 'Joko Prasetyo',
      email: 'joko@warungnusantara.id',
      phone: '081234567895',
      pin: hashedPin,
      role: 'kitchen',
      permissions: ['kds'],
      hourlyRate: 25000,
    },
  });

  const inventoryStaff = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      name: 'Hendra Gunawan',
      email: 'hendra@warungnusantara.id',
      phone: '081234567896',
      pin: hashedPin,
      role: 'inventory',
      permissions: ['inventory'],
      hourlyRate: 28000,
    },
  });

  console.log(`  Owner: ${owner.name} (${owner.email})`);
  console.log(`  Manager: ${manager.name}`);
  console.log(`  Supervisor: ${supervisor.name}`);
  console.log(`  Cashier 1: ${cashier1.name} (Pusat)`);
  console.log(`  Cashier 2: ${cashier2.name} (Kemang)`);
  console.log(`  Kitchen: ${kitchenStaff.name}`);
  console.log(`  Inventory: ${inventoryStaff.name}`);
  console.log('  PIN for all employees: 1234');

  // ============================================================
  // 4. CATEGORIES
  // ============================================================
  console.log('Creating categories...');
  const catMakanan = await prisma.category.create({
    data: { businessId: business.id, name: 'Makanan', sortOrder: 1 },
  });
  const catNasi = await prisma.category.create({
    data: {
      businessId: business.id,
      name: 'Nasi & Rice Bowl',
      parentId: catMakanan.id,
      sortOrder: 1,
    },
  });
  const catMie = await prisma.category.create({
    data: { businessId: business.id, name: 'Mie & Pasta', parentId: catMakanan.id, sortOrder: 2 },
  });
  const catSnack = await prisma.category.create({
    data: {
      businessId: business.id,
      name: 'Snack & Appetizer',
      parentId: catMakanan.id,
      sortOrder: 3,
    },
  });
  const catMinuman = await prisma.category.create({
    data: { businessId: business.id, name: 'Minuman', sortOrder: 2 },
  });
  const catKopi = await prisma.category.create({
    data: { businessId: business.id, name: 'Kopi', parentId: catMinuman.id, sortOrder: 1 },
  });
  const catNonKopi = await prisma.category.create({
    data: { businessId: business.id, name: 'Non-Kopi', parentId: catMinuman.id, sortOrder: 2 },
  });
  const catDessert = await prisma.category.create({
    data: { businessId: business.id, name: 'Dessert', sortOrder: 3 },
  });
  console.log(`  Created 8 categories`);

  // ============================================================
  // 5. MODIFIER GROUPS
  // ============================================================
  console.log('Creating modifier groups...');
  const mgSpiceLevel = await prisma.modifierGroup.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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

  // ============================================================
  // 6. PRODUCTS
  // ============================================================
  console.log('Creating products...');

  // --- Nasi & Rice Bowl ---
  const nasiGoreng = await prisma.product.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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
    data: {
      productId: nasiAyam.id,
      sku: 'FOOD-002-R',
      name: 'Regular',
      price: 40000,
      costPrice: 18000,
    },
  });
  const ayamBakarJumbo = await prisma.productVariant.create({
    data: {
      productId: nasiAyam.id,
      sku: 'FOOD-002-J',
      name: 'Jumbo',
      price: 55000,
      costPrice: 25000,
    },
  });

  await prisma.productModifierGroup.createMany({
    data: [
      { productId: nasiAyam.id, modifierGroupId: mgSpiceLevel.id, sortOrder: 1 },
      { productId: nasiAyam.id, modifierGroupId: mgTopping.id, sortOrder: 2 },
    ],
  });

  // --- Mie ---
  const mieGoreng = await prisma.product.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
      categoryId: catMie.id,
      sku: 'FOOD-004',
      name: 'Mie Ayam Bakso',
      basePrice: 28000,
      costPrice: 11000,
      trackStock: true,
    },
  });

  // --- Snacks ---
  const kentangGoreng = await prisma.product.create({
    data: {
      businessId: business.id,
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
    data: {
      productId: kentangGoreng.id,
      sku: 'FOOD-005-R',
      name: 'Regular',
      price: 20000,
      costPrice: 8000,
    },
  });
  const kentangLarge = await prisma.productVariant.create({
    data: {
      productId: kentangGoreng.id,
      sku: 'FOOD-005-L',
      name: 'Large',
      price: 30000,
      costPrice: 12000,
    },
  });

  const dimsum = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: catSnack.id,
      sku: 'FOOD-006',
      name: 'Dimsum Ayam (5 pcs)',
      basePrice: 25000,
      costPrice: 10000,
      trackStock: true,
    },
  });

  // --- Kopi ---
  const espresso = await prisma.product.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
      categoryId: catKopi.id,
      sku: 'DRK-003',
      name: 'Kopi Susu Gula Aren',
      basePrice: 25000,
      costPrice: 7000,
      trackStock: false,
      productModifierGroups: {
        create: [{ modifierGroupId: mgSugarLevel.id, sortOrder: 1 }],
      },
    },
  });

  // --- Non-Kopi ---
  const esJeruk = await prisma.product.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
      categoryId: catNonKopi.id,
      sku: 'DRK-006',
      name: 'Air Mineral',
      basePrice: 8000,
      costPrice: 2000,
      trackStock: true,
    },
  });

  // --- Dessert ---
  const pisangGoreng = await prisma.product.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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

  // ============================================================
  // 7. STOCK LEVELS (Per outlet for trackable products)
  // ============================================================
  console.log('Creating stock levels...');
  const stockableProducts = [
    { product: nasiGoreng, qty: 100 },
    {
      product: nasiAyam,
      qty: 80,
      variants: [
        { v: ayamBakarReg, qty: 50 },
        { v: ayamBakarJumbo, qty: 30 },
      ],
    },
    { product: mieGoreng, qty: 100 },
    { product: mieAyam, qty: 80 },
    {
      product: kentangGoreng,
      qty: 0,
      variants: [
        { v: kentangReg, qty: 60 },
        { v: kentangLarge, qty: 40 },
      ],
    },
    { product: dimsum, qty: 50 },
    { product: airMineral, qty: 200 },
    { product: pisangGoreng, qty: 40 },
    {
      product: esKrim,
      qty: 0,
      variants: [
        { v: esKrimVanilla, qty: 30 },
        { v: esKrimCoklat, qty: 25 },
        { v: esKrimMatcha, qty: 20 },
      ],
    },
  ];

  for (const outlet of [outletPusat, outletCabang]) {
    for (const sp of stockableProducts) {
      if (sp.variants) {
        for (const sv of sp.variants) {
          await prisma.stockLevel.create({
            data: {
              outletId: outlet.id,
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
            outletId: outlet.id,
            productId: sp.product.id,
            quantity: sp.qty,
            lowStockAlert: 10,
          },
        });
      }
    }
  }
  console.log(`  Created stock levels for both outlets`);

  // ============================================================
  // 8. INGREDIENTS & RECIPES
  // ============================================================
  console.log('Creating ingredients & recipes...');
  const ingBeras = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Beras Putih',
      sku: 'ING-001',
      unit: 'kg',
      costPerUnit: 15000,
    },
  });
  const ingAyam = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Daging Ayam',
      sku: 'ING-002',
      unit: 'kg',
      costPerUnit: 40000,
    },
  });
  const ingMie = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Mie Telur',
      sku: 'ING-003',
      unit: 'kg',
      costPerUnit: 20000,
    },
  });
  const ingMinyak = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Minyak Goreng',
      sku: 'ING-004',
      unit: 'liter',
      costPerUnit: 18000,
    },
  });
  const ingTelur = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Telur Ayam',
      sku: 'ING-005',
      unit: 'butir',
      costPerUnit: 2500,
    },
  });
  const ingKopi = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Biji Kopi Arabica',
      sku: 'ING-006',
      unit: 'kg',
      costPerUnit: 200000,
    },
  });
  const ingSusu = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Susu Segar',
      sku: 'ING-007',
      unit: 'liter',
      costPerUnit: 25000,
    },
  });
  const ingGula = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: 'Gula Aren',
      sku: 'ING-008',
      unit: 'kg',
      costPerUnit: 50000,
    },
  });

  const ingredients = [ingBeras, ingAyam, ingMie, ingMinyak, ingTelur, ingKopi, ingSusu, ingGula];

  // Ingredient stock levels
  for (const outlet of [outletPusat, outletCabang]) {
    for (const ing of ingredients) {
      await prisma.ingredientStockLevel.create({
        data: { outletId: outlet.id, ingredientId: ing.id, quantity: 50, lowStockAlert: 10 },
      });
    }
  }

  // Recipes
  await prisma.recipe.create({
    data: {
      productId: nasiGoreng.id,
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
      productId: nasiAyam.id,
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
      productId: mieGoreng.id,
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
      productId: espresso.id,
      items: { create: [{ ingredientId: ingKopi.id, quantity: 0.018, unit: 'kg' }] },
    },
  });

  await prisma.recipe.create({
    data: {
      productId: cappuccino.id,
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
      productId: kopiSusu.id,
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

  // ============================================================
  // 9. SUPPLIERS
  // ============================================================
  console.log('Creating suppliers...');
  const supplierBeras = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'UD Tani Makmur',
      contactPerson: 'Pak Slamet',
      phone: '081111222333',
      email: 'tanimakmur@gmail.com',
      address: 'Jl. Pasar Induk, Bogor',
    },
  });

  await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'CV Unggas Jaya',
      contactPerson: 'Bu Yanti',
      phone: '081444555666',
      email: 'unggas.jaya@gmail.com',
      address: 'Jl. Raya Tangerang, Banten',
    },
  });

  await prisma.supplier.create({
    data: {
      businessId: business.id,
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
      outletId: outletPusat.id,
      supplierId: supplierBeras.id,
      poNumber: 'PO-2026-001',
      status: 'received',
      totalAmount: 750000,
      createdBy: inventoryStaff.id,
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

  // ============================================================
  // 10. CUSTOMERS
  // ============================================================
  console.log('Creating customers...');
  const cust1 = await prisma.customer.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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

  await prisma.customer.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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

  // ============================================================
  // 11. TABLES
  // ============================================================
  console.log('Creating tables...');
  const tableNames = [
    { name: 'T1', section: 'Indoor', capacity: 2 },
    { name: 'T2', section: 'Indoor', capacity: 4 },
    { name: 'T3', section: 'Indoor', capacity: 4 },
    { name: 'T4', section: 'Indoor', capacity: 6 },
    { name: 'T5', section: 'Indoor', capacity: 6 },
    { name: 'T6', section: 'Outdoor', capacity: 2 },
    { name: 'T7', section: 'Outdoor', capacity: 4 },
    { name: 'T8', section: 'Outdoor', capacity: 4 },
    { name: 'VIP1', section: 'VIP Room', capacity: 8 },
    { name: 'VIP2', section: 'VIP Room', capacity: 10 },
  ];

  const tables: Record<string, { id: string }> = {};
  for (const t of tableNames) {
    const table = await prisma.table.create({
      data: { outletId: outletPusat.id, name: t.name, section: t.section, capacity: t.capacity },
    });
    tables[t.name] = table;
  }
  // Kemang outlet tables
  for (let i = 1; i <= 6; i++) {
    await prisma.table.create({
      data: {
        outletId: outletCabang.id,
        name: `K${i}`,
        section: i <= 4 ? 'Indoor' : 'Outdoor',
        capacity: 4,
      },
    });
  }
  console.log(`  Created ${tableNames.length + 6} tables across 2 outlets`);

  // ============================================================
  // 12. LOYALTY PROGRAM & TIERS
  // ============================================================
  console.log('Creating loyalty program & tiers...');
  await prisma.loyaltyProgram.create({
    data: {
      businessId: business.id,
      name: 'Warung Nusantara Rewards',
      amountPerPoint: 10000,
      redemptionRate: 100,
      pointExpiryDays: 365,
    },
  });

  await prisma.loyaltyTier.createMany({
    data: [
      {
        businessId: business.id,
        name: 'regular',
        minPoints: 0,
        minSpent: 0,
        pointMultiplier: 1.0,
        sortOrder: 1,
        benefits: { discount: 0 },
      },
      {
        businessId: business.id,
        name: 'silver',
        minPoints: 200,
        minSpent: 500000,
        pointMultiplier: 1.25,
        sortOrder: 2,
        benefits: { discount: 5 },
      },
      {
        businessId: business.id,
        name: 'gold',
        minPoints: 1000,
        minSpent: 2000000,
        pointMultiplier: 1.5,
        sortOrder: 3,
        benefits: { discount: 10, freeDelivery: true },
      },
      {
        businessId: business.id,
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

  // ============================================================
  // 13. PROMOTIONS & VOUCHERS
  // ============================================================
  console.log('Creating promotions & vouchers...');
  const promoDiskon10 = await prisma.promotion.create({
    data: {
      businessId: business.id,
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
      businessId: business.id,
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
        businessId: business.id,
        code: 'WELCOME2026',
        promotionId: promoNewYear.id,
        expiresAt: new Date('2026-02-28'),
      },
      {
        businessId: business.id,
        code: 'WEEKEND10',
        promotionId: promoDiskon10.id,
        expiresAt: new Date('2026-12-31'),
      },
      {
        businessId: business.id,
        code: 'LOYAL50K',
        initialValue: 50000,
        remainingValue: 50000,
        expiresAt: new Date('2026-06-30'),
      },
      {
        businessId: business.id,
        code: 'GIFT100K',
        initialValue: 100000,
        remainingValue: 100000,
        expiresAt: new Date('2026-12-31'),
      },
    ],
  });
  console.log(`  Created 2 promotions, 4 vouchers`);

  // ============================================================
  // 14. SHIFTS (1 open for testing)
  // ============================================================
  console.log('Creating shifts...');
  const openShift = await prisma.shift.create({
    data: {
      outletId: outletPusat.id,
      employeeId: cashier1.id,
      startedAt: new Date(),
      openingCash: 500000,
      status: 'open',
    },
  });

  await prisma.shift.create({
    data: {
      outletId: outletPusat.id,
      employeeId: cashier1.id,
      startedAt: new Date('2026-01-29T08:00:00'),
      endedAt: new Date('2026-01-29T17:00:00'),
      openingCash: 500000,
      closingCash: 2350000,
      expectedCash: 2300000,
      cashDifference: 50000,
      status: 'closed',
      notes: 'Shift normal, selisih lebih 50rb',
    },
  });
  console.log(`  Created 1 open shift, 1 closed shift`);

  // ============================================================
  // 15. TRANSACTIONS (Sample sales)
  // ============================================================
  console.log('Creating sample transactions...');

  // Transaction 1: Nasi Goreng + Es Jeruk (cash)
  const tx1 = await prisma.transaction.create({
    data: {
      outletId: outletPusat.id,
      employeeId: cashier1.id,
      customerId: cust1.id,
      shiftId: openShift.id,
      receiptNumber: 'TXN-20260130-001',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: tables['T2'].id,
      subtotal: 50000,
      taxAmount: 5500,
      serviceCharge: 2500,
      grandTotal: 58000,
      status: 'completed',
      items: {
        create: [
          {
            productId: nasiGoreng.id,
            productName: 'Nasi Goreng Spesial',
            quantity: 1,
            unitPrice: 35000,
            subtotal: 35000,
          },
          {
            productId: esJeruk.id,
            productName: 'Es Jeruk Segar',
            quantity: 1,
            unitPrice: 15000,
            subtotal: 15000,
          },
        ],
      },
      payments: {
        create: [{ paymentMethod: 'cash', amount: 58000, status: 'completed' }],
      },
    },
  });

  // Transaction 2: Nasi Ayam Jumbo + Cappuccino Iced + Dimsum (QRIS)
  const tx2 = await prisma.transaction.create({
    data: {
      outletId: outletPusat.id,
      employeeId: cashier1.id,
      customerId: cust2.id,
      shiftId: openShift.id,
      receiptNumber: 'TXN-20260130-002',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: tables['T3'].id,
      subtotal: 112000,
      taxAmount: 12320,
      serviceCharge: 5600,
      grandTotal: 129920,
      status: 'completed',
      items: {
        create: [
          {
            productId: nasiAyam.id,
            variantId: ayamBakarJumbo.id,
            productName: 'Nasi Ayam Bakar',
            variantName: 'Jumbo',
            quantity: 1,
            unitPrice: 55000,
            subtotal: 55000,
          },
          {
            productId: cappuccino.id,
            variantId: cappIce.id,
            productName: 'Cappuccino',
            variantName: 'Iced',
            quantity: 1,
            unitPrice: 32000,
            subtotal: 32000,
          },
          {
            productId: dimsum.id,
            productName: 'Dimsum Ayam (5 pcs)',
            quantity: 1,
            unitPrice: 25000,
            subtotal: 25000,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentMethod: 'qris',
            amount: 129920,
            referenceNumber: 'QRIS-20260130-001',
            status: 'completed',
          },
        ],
      },
    },
  });

  // Transaction 3: Big order for company (multi-payment: cash + card)
  const tx3 = await prisma.transaction.create({
    data: {
      outletId: outletPusat.id,
      employeeId: cashier1.id,
      customerId: cust4.id,
      shiftId: openShift.id,
      receiptNumber: 'TXN-20260130-003',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: tables['VIP1'].id,
      subtotal: 318000,
      taxAmount: 34980,
      serviceCharge: 15900,
      grandTotal: 368880,
      status: 'completed',
      items: {
        create: [
          {
            productId: nasiGoreng.id,
            productName: 'Nasi Goreng Spesial',
            quantity: 3,
            unitPrice: 35000,
            subtotal: 105000,
          },
          {
            productId: nasiAyam.id,
            variantId: ayamBakarJumbo.id,
            productName: 'Nasi Ayam Bakar',
            variantName: 'Jumbo',
            quantity: 2,
            unitPrice: 55000,
            subtotal: 110000,
          },
          {
            productId: mieGoreng.id,
            productName: 'Mie Goreng Jawa',
            quantity: 1,
            unitPrice: 30000,
            subtotal: 30000,
          },
          {
            productId: kopiSusu.id,
            productName: 'Kopi Susu Gula Aren',
            quantity: 3,
            unitPrice: 25000,
            subtotal: 75000,
          },
          {
            productId: airMineral.id,
            productName: 'Air Mineral',
            quantity: 3,
            unitPrice: 8000,
            subtotal: 24000,
            notes: 'Dingin',
          },
        ],
      },
      payments: {
        create: [
          { paymentMethod: 'cash', amount: 200000, status: 'completed' },
          {
            paymentMethod: 'card',
            amount: 168880,
            referenceNumber: 'CC-20260130-001',
            status: 'completed',
          },
        ],
      },
    },
  });

  // Transaction 4: Takeaway (Kemang outlet)
  await prisma.transaction.create({
    data: {
      outletId: outletCabang.id,
      employeeId: cashier2.id,
      receiptNumber: 'TXN-20260130-004',
      transactionType: 'sale',
      orderType: 'takeaway',
      subtotal: 68000,
      taxAmount: 7480,
      grandTotal: 75480,
      status: 'completed',
      items: {
        create: [
          {
            productId: nasiAyam.id,
            variantId: ayamBakarReg.id,
            productName: 'Nasi Ayam Bakar',
            variantName: 'Regular',
            quantity: 1,
            unitPrice: 40000,
            subtotal: 40000,
          },
          {
            productId: mieAyam.id,
            productName: 'Mie Ayam Bakso',
            quantity: 1,
            unitPrice: 28000,
            subtotal: 28000,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentMethod: 'gopay',
            amount: 75480,
            referenceNumber: 'GOPAY-20260130-001',
            status: 'completed',
          },
        ],
      },
    },
  });
  console.log(`  Created 4 transactions`);

  // ============================================================
  // 16. ORDERS (for KDS testing)
  // ============================================================
  console.log('Creating orders for KDS...');
  await prisma.order.create({
    data: {
      outletId: outletPusat.id,
      orderNumber: 'ORD-001',
      orderType: 'dine_in',
      tableId: tables['T4'].id,
      status: 'preparing',
      priority: 0,
      startedAt: new Date(),
      items: {
        create: [
          {
            productId: nasiGoreng.id,
            productName: 'Nasi Goreng Spesial',
            quantity: 2,
            station: 'wok',
            status: 'preparing',
          },
          {
            productId: mieGoreng.id,
            productName: 'Mie Goreng Jawa',
            quantity: 1,
            station: 'wok',
            status: 'pending',
          },
          {
            productId: esJeruk.id,
            productName: 'Es Jeruk Segar',
            quantity: 2,
            station: 'bar',
            status: 'ready',
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      outletId: outletPusat.id,
      orderNumber: 'ORD-002',
      orderType: 'takeaway',
      status: 'pending',
      priority: 1,
      notes: 'Buru-buru, customer nunggu di depan',
      items: {
        create: [
          {
            productId: nasiAyam.id,
            variantId: ayamBakarReg.id,
            productName: 'Nasi Ayam Bakar (Regular)',
            quantity: 3,
            station: 'grill',
            status: 'pending',
          },
          {
            productId: kentangGoreng.id,
            variantId: kentangLarge.id,
            productName: 'Kentang Goreng (Large)',
            quantity: 2,
            station: 'fryer',
            status: 'pending',
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      outletId: outletPusat.id,
      orderNumber: 'ORD-003',
      orderType: 'dine_in',
      tableId: tables['T7'].id,
      status: 'ready',
      items: {
        create: [
          {
            productId: dimsum.id,
            productName: 'Dimsum Ayam (5 pcs)',
            quantity: 2,
            station: 'steam',
            status: 'ready',
            completedAt: new Date(),
          },
          {
            productId: tehTarik.id,
            productName: 'Teh Tarik',
            quantity: 2,
            station: 'bar',
            status: 'ready',
            completedAt: new Date(),
          },
        ],
      },
    },
  });
  console.log(`  Created 3 orders (preparing, pending, ready)`);

  // ============================================================
  // 17. STOCK TRANSFER
  // ============================================================
  console.log('Creating stock transfer...');
  await prisma.stockTransfer.create({
    data: {
      businessId: business.id,
      transferNumber: 'TRF-2026-001',
      sourceOutletId: outletPusat.id,
      destinationOutletId: outletCabang.id,
      status: 'approved',
      requestedBy: inventoryStaff.id,
      approvedBy: manager.id,
      approvedAt: new Date(),
      items: {
        create: [
          { productId: nasiGoreng.id, itemName: 'Nasi Goreng Spesial (bahan)', quantitySent: 20 },
          { productId: dimsum.id, itemName: 'Dimsum Ayam', quantitySent: 10 },
        ],
      },
    },
  });
  console.log(`  Created 1 stock transfer (approved)`);

  // ============================================================
  // 18. DEVICES
  // ============================================================
  console.log('Creating devices...');
  await prisma.device.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      deviceName: 'Kasir Utama - iPad',
      deviceType: 'tablet',
      platform: 'ios',
      deviceIdentifier: 'IPAD-WN-001',
      appVersion: '1.0.0',
      lastSyncAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  await prisma.device.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      deviceName: 'KDS Dapur',
      deviceType: 'kds_display',
      platform: 'android',
      deviceIdentifier: 'KDS-WN-001',
      appVersion: '1.0.0',
      lastSyncAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  await prisma.device.create({
    data: {
      businessId: business.id,
      outletId: outletPusat.id,
      deviceName: 'Backoffice Web',
      deviceType: 'desktop',
      platform: 'web',
      deviceIdentifier: 'WEB-WN-001',
      appVersion: '1.0.0',
      lastActiveAt: new Date(),
    },
  });

  await prisma.device.create({
    data: {
      businessId: business.id,
      outletId: outletCabang.id,
      deviceName: 'Kasir Kemang - Android',
      deviceType: 'tablet',
      platform: 'android',
      deviceIdentifier: 'TAB-WN-002',
      appVersion: '1.0.0',
      lastSyncAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
  console.log(`  Created 4 devices`);

  // ============================================================
  // 19. NOTIFICATION SETTINGS
  // ============================================================
  console.log('Creating notification settings...');
  await prisma.notificationSetting.createMany({
    data: [
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: owner.id,
        notificationType: 'low_stock',
        channel: 'push',
        isEnabled: true,
        threshold: { quantity: 10 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: owner.id,
        notificationType: 'large_transaction',
        channel: 'push',
        isEnabled: true,
        threshold: { amount: 500000 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: owner.id,
        notificationType: 'refund',
        channel: 'push',
        isEnabled: true,
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: manager.id,
        notificationType: 'low_stock',
        channel: 'push',
        isEnabled: true,
        threshold: { quantity: 10 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: manager.id,
        notificationType: 'online_order',
        channel: 'push',
        isEnabled: true,
      },
    ],
  });
  console.log(`  Created 5 notification settings`);

  // ============================================================
  // 20. ONLINE STORE
  // ============================================================
  console.log('Creating online store...');
  await prisma.onlineStore.create({
    data: {
      businessId: business.id,
      storeName: 'Warung Nusantara Online',
      slug: 'warung-nusantara',
      description: 'Pesan makanan & minuman Warung Nusantara secara online',
      themeSettings: { primaryColor: '#D4A574', secondaryColor: '#2C1810', fontFamily: 'Inter' },
      shippingMethods: [
        { name: 'Ambil di Toko', cost: 0 },
        { name: 'Kurir Toko', cost: 15000 },
      ],
      paymentMethods: ['qris', 'bank_transfer', 'cash'],
    },
  });
  console.log(`  Created 1 online store`);

  // ============================================================
  // 21. SELF-ORDER SESSION
  // ============================================================
  console.log('Creating self-order session...');
  const selfOrderSession = await prisma.selfOrderSession.create({
    data: {
      outletId: outletPusat.id,
      tableId: tables['T6'].id,
      sessionCode: 'WN-T6-ABC123',
      status: 'active',
      customerName: 'Guest',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: mieGoreng.id, quantity: 1 },
          { productId: kopiSusu.id, quantity: 2 },
        ],
      },
    },
  });
  console.log(`  Created 1 active self-order session (code: ${selfOrderSession.sessionCode})`);

  // ============================================================
  // 22. WAITING LIST
  // ============================================================
  console.log('Creating waiting list...');
  await prisma.waitingList.createMany({
    data: [
      {
        outletId: outletPusat.id,
        customerName: 'Keluarga Surya',
        customerPhone: '081122334455',
        partySize: 6,
        preferredSection: 'Indoor',
        status: 'waiting',
        estimatedWait: 15,
      },
      {
        outletId: outletPusat.id,
        customerName: 'Ibu Kartini',
        customerPhone: '081998877665',
        partySize: 2,
        preferredSection: 'Outdoor',
        status: 'waiting',
        estimatedWait: 10,
      },
    ],
  });
  console.log(`  Created 2 waiting list entries`);

  // ============================================================
  // 23. AUDIT LOGS (samples)
  // ============================================================
  console.log('Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: cashier1.id,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: tx1.id,
        newValue: { grandTotal: 58000 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: cashier1.id,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: tx2.id,
        newValue: { grandTotal: 129920 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: cashier1.id,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: tx3.id,
        newValue: { grandTotal: 368880 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: owner.id,
        action: 'shift_started',
        entityType: 'shift',
        entityId: openShift.id,
        newValue: { openingCash: 500000 },
      },
      {
        businessId: business.id,
        outletId: outletPusat.id,
        employeeId: inventoryStaff.id,
        action: 'stock_adjusted',
        entityType: 'stock_level',
        newValue: { product: 'Air Mineral', adjustment: '+200' },
      },
    ],
  });
  console.log(`  Created 5 audit log entries`);

  // ============================================================
  // 24. PAYMENT SETTLEMENT
  // ============================================================
  console.log('Creating payment settlement...');
  await prisma.paymentSettlement.create({
    data: {
      outletId: outletPusat.id,
      paymentMethod: 'qris',
      settlementDate: new Date('2026-01-29'),
      totalTransactions: 15,
      grossAmount: 1250000,
      feeAmount: 8750,
      netAmount: 1241250,
      status: 'settled',
      referenceNumber: 'STL-QRIS-20260129',
      settledAt: new Date('2026-01-30'),
    },
  });
  console.log(`  Created 1 payment settlement`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n========================================');
  console.log('SEED COMPLETED SUCCESSFULLY');
  console.log('========================================\n');
  console.log('Login credentials for testing:');
  console.log('┌──────────────┬─────────────────────────────────┬──────┐');
  console.log('│ Role         │ Email                           │ PIN  │');
  console.log('├──────────────┼─────────────────────────────────┼──────┤');
  console.log('│ Owner        │ budi@warungnusantara.id          │ 1234 │');
  console.log('│ Manager      │ siti@warungnusantara.id          │ 1234 │');
  console.log('│ Supervisor   │ agus@warungnusantara.id          │ 1234 │');
  console.log('│ Cashier      │ dewi@warungnusantara.id          │ 1234 │');
  console.log('│ Cashier (K)  │ rina@warungnusantara.id          │ 1234 │');
  console.log('│ Kitchen      │ joko@warungnusantara.id          │ 1234 │');
  console.log('│ Inventory    │ hendra@warungnusantara.id        │ 1234 │');
  console.log('└──────────────┴─────────────────────────────────┴──────┘\n');
  console.log('API: http://localhost:3001/api/v1');
  console.log('Swagger: http://localhost:3001/api/docs');
  console.log(`Business ID: ${business.id}`);
  console.log(`Outlet Pusat ID: ${outletPusat.id}`);
  console.log(`Outlet Kemang ID: ${outletCabang.id}`);
  console.log(`Open Shift ID: ${openShift.id}`);
  console.log(`Self-Order Code: ${selfOrderSession.sessionCode}`);
  console.log(`Online Store Slug: warung-nusantara`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
