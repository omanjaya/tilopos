import { PrismaClient } from '@prisma/client';

export async function seedPricingRules(prisma: PrismaClient, businessId: string) {
  console.log('🏷️  Seeding pricing rules...');

  // Get some products and categories
  const products = await prisma.product.findMany({
    where: { businessId },
    take: 5,
  });

  const categories = await prisma.category.findMany({
    where: { businessId },
    take: 3,
  });

  if (products.length === 0) {
    console.log('⚠️  No products found, skipping pricing rules seeder');
    return;
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const rules = [
    // 1. Happy Hour - Time-based discount
    {
      name: 'Happy Hour - 30% Off',
      description: 'Diskon 30% untuk semua produk jam 14:00-16:00',
      type: 'time_based',
      priority: 10,
      status: 'active',
      validFrom: tomorrow,
      validUntil: nextMonth,
      conditions: {},
      discountType: 'percentage',
      discountValue: 30,
      minQuantity: null,
      maxQuantity: null,
      applicableDays: [1, 2, 3, 4, 5], // Monday to Friday
      timeFrom: '14:00',
      timeUntil: '16:00',
      customerSegments: [],
      productIds: [],
      categoryIds: [],
      excludeProductIds: [],
      isCombinable: false,
      maxApplicationsPerTransaction: null,
      metadata: {
        campaignId: 'happy-hour-2026',
      },
    },

    // 2. Buy More Save More - Quantity-based
    {
      name: 'Beli 3 Gratis 1',
      description: 'Beli 3 produk atau lebih, hemat 25%',
      type: 'quantity_based',
      priority: 8,
      status: 'active',
      validFrom: tomorrow,
      validUntil: nextMonth,
      conditions: {
        minCartItems: 3,
      },
      discountType: 'percentage',
      discountValue: 25,
      minQuantity: 3,
      maxQuantity: null,
      applicableDays: [],
      timeFrom: null,
      timeUntil: null,
      customerSegments: [],
      productIds: products.slice(0, 3).map((p) => p.id),
      categoryIds: [],
      excludeProductIds: [],
      isCombinable: true,
      maxApplicationsPerTransaction: 1,
      metadata: {},
    },

    // 3. VIP Member Discount - Customer segment
    {
      name: 'VIP Member - 20% Off',
      description: 'Diskon khusus 20% untuk member VIP',
      type: 'customer_segment',
      priority: 15,
      status: 'active',
      validFrom: tomorrow,
      validUntil: null,
      conditions: {},
      discountType: 'percentage',
      discountValue: 20,
      minQuantity: null,
      maxQuantity: null,
      applicableDays: [],
      timeFrom: null,
      timeUntil: null,
      customerSegments: ['vip', 'gold'],
      productIds: [],
      categoryIds: categories.length > 0 ? [categories[0].id] : [],
      excludeProductIds: [],
      isCombinable: true,
      maxApplicationsPerTransaction: null,
      metadata: {},
    },

    // 4. Low Stock Clearance - Inventory-based
    {
      name: 'Clearance Sale - 40% Off',
      description: 'Diskon besar untuk produk dengan stok rendah',
      type: 'inventory_based',
      priority: 12,
      status: 'active',
      validFrom: tomorrow,
      validUntil: nextMonth,
      conditions: {
        stockThreshold: 10,
      },
      discountType: 'percentage',
      discountValue: 40,
      minQuantity: null,
      maxQuantity: null,
      applicableDays: [],
      timeFrom: null,
      timeUntil: null,
      customerSegments: [],
      productIds: products.slice(3, 5).map((p) => p.id),
      categoryIds: [],
      excludeProductIds: [],
      isCombinable: false,
      maxApplicationsPerTransaction: null,
      metadata: {
        reason: 'stock_clearance',
      },
    },

    // 5. Weekend Special - Category discount
    {
      name: 'Weekend Special - Rp 10.000 Off',
      description: 'Potongan Rp 10.000 untuk kategori tertentu di weekend',
      type: 'time_based',
      priority: 9,
      status: 'active',
      validFrom: tomorrow,
      validUntil: nextMonth,
      conditions: {
        minPurchaseAmount: 50000,
      },
      discountType: 'fixed_amount',
      discountValue: 10000,
      minQuantity: null,
      maxQuantity: null,
      applicableDays: [0, 6], // Sunday and Saturday
      timeFrom: null,
      timeUntil: null,
      customerSegments: [],
      productIds: [],
      categoryIds: categories.length > 1 ? [categories[1].id] : [],
      excludeProductIds: [],
      isCombinable: true,
      maxApplicationsPerTransaction: 1,
      metadata: {},
    },

    // 6. First Purchase Bonus - Customer segment
    {
      name: 'Diskon New Customer 15%',
      description: 'Diskon khusus untuk pembelian pertama',
      type: 'customer_segment',
      priority: 20,
      status: 'active',
      validFrom: tomorrow,
      validUntil: nextMonth,
      conditions: {},
      discountType: 'percentage',
      discountValue: 15,
      minQuantity: null,
      maxQuantity: null,
      applicableDays: [],
      timeFrom: null,
      timeUntil: null,
      customerSegments: ['new'],
      productIds: [],
      categoryIds: [],
      excludeProductIds: [],
      isCombinable: false,
      maxApplicationsPerTransaction: null,
      metadata: {
        campaignId: 'new-customer-2026',
      },
    },

    // 7. Lunch Rush - Dynamic surge (reverse pricing for off-peak)
    {
      name: 'Lunch Hour Discount 10%',
      description: 'Diskon 10% di luar jam makan siang (10:00-12:00)',
      type: 'dynamic_surge',
      priority: 5,
      status: 'active',
      validFrom: tomorrow,
      validUntil: nextMonth,
      conditions: {},
      discountType: 'percentage',
      discountValue: 10,
      minQuantity: null,
      maxQuantity: null,
      applicableDays: [1, 2, 3, 4, 5],
      timeFrom: '10:00',
      timeUntil: '12:00',
      customerSegments: [],
      productIds: [],
      categoryIds: categories.length > 2 ? [categories[2].id] : [],
      excludeProductIds: [],
      isCombinable: true,
      maxApplicationsPerTransaction: null,
      metadata: {
        peakHours: ['12:00-14:00'],
      },
    },
  ];

  for (const rule of rules) {
    await prisma.pricingRule.create({
      data: {
        businessId,
        ...rule,
      },
    });
  }

  console.log(`✅ Created ${rules.length} pricing rules`);
}
