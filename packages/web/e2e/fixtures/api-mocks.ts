import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

export const mockLoginResponse = {
  accessToken: 'mock-access-token',
  employeeId: 'emp-1',
  employeeName: 'John Owner',
  role: 'owner',
  businessId: 'biz-1',
  outletId: 'outlet-1',
};

export const mockCategories = [
  { id: 'cat-1', name: 'Makanan', productCount: 3 },
  { id: 'cat-2', name: 'Minuman', productCount: 2 },
  { id: 'cat-3', name: 'Snack', productCount: 1 },
];

export const mockProducts = [
  {
    id: 'prod-1',
    name: 'Nasi Goreng Spesial',
    sku: 'NG-001',
    basePrice: 35000,
    costPrice: 15000,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Makanan' },
    imageUrl: null,
    isActive: true,
    trackStock: true,
    variants: [],
    description: 'Nasi goreng spesial dengan telur dan ayam',
  },
  {
    id: 'prod-2',
    name: 'Es Teh Manis',
    sku: 'ETM-001',
    basePrice: 8000,
    costPrice: 3000,
    categoryId: 'cat-2',
    category: { id: 'cat-2', name: 'Minuman' },
    imageUrl: null,
    isActive: true,
    trackStock: false,
    variants: [],
    description: 'Teh manis segar',
  },
  {
    id: 'prod-3',
    name: 'Mie Ayam Bakso',
    sku: 'MAB-001',
    basePrice: 30000,
    costPrice: 12000,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Makanan' },
    imageUrl: null,
    isActive: true,
    trackStock: true,
    variants: [
      { id: 'var-1', name: 'Porsi Kecil', sku: 'MAB-001-S', price: 25000, costPrice: 10000 },
      { id: 'var-2', name: 'Porsi Besar', sku: 'MAB-001-L', price: 35000, costPrice: 15000 },
    ],
    description: 'Mie ayam dengan bakso',
  },
  {
    id: 'prod-4',
    name: 'Kopi Susu',
    sku: 'KS-001',
    basePrice: 18000,
    costPrice: 7000,
    categoryId: 'cat-2',
    category: { id: 'cat-2', name: 'Minuman' },
    imageUrl: null,
    isActive: false,
    trackStock: false,
    variants: [],
    description: 'Kopi susu gula aren',
  },
];

export const mockPOSProducts = mockProducts
  .filter((p) => p.isActive)
  .map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    basePrice: p.basePrice,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    categoryName: p.category?.name,
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      stockLevel: 50,
    })),
    modifierGroups: [],
    trackStock: p.trackStock,
    stockLevel: 100,
  }));

export const mockPOSCategories = mockCategories.map((c) => ({
  id: c.id,
  name: c.name,
  productCount: c.productCount,
}));

export const mockEmployees = [
  {
    id: 'emp-1',
    name: 'John Owner',
    email: 'john@tilo.test',
    phone: '08123456789',
    role: 'owner',
    outletId: 'outlet-1',
    outletName: 'Outlet Utama',
    isActive: true,
    hourlyRate: null,
  },
  {
    id: 'emp-2',
    name: 'Jane Cashier',
    email: 'jane@tilo.test',
    phone: '08198765432',
    role: 'cashier',
    outletId: 'outlet-1',
    outletName: 'Outlet Utama',
    isActive: true,
    hourlyRate: 15000,
  },
  {
    id: 'emp-3',
    name: 'Bob Kitchen',
    email: 'bob@tilo.test',
    phone: null,
    role: 'kitchen',
    outletId: 'outlet-1',
    outletName: 'Outlet Utama',
    isActive: false,
    hourlyRate: 12000,
  },
];

export const mockOutlets = [
  { id: 'outlet-1', name: 'Outlet Utama', address: 'Jl. Raya No. 1', phone: '021-12345' },
  { id: 'outlet-2', name: 'Outlet Cabang', address: 'Jl. Cabang No. 2', phone: '021-67890' },
];

export const mockSalesReport = {
  totalSales: 15000000,
  totalTransactions: 245,
  averageOrderValue: 61224,
  salesByDate: [
    { date: '2026-01-01', sales: 1200000 },
    { date: '2026-01-02', sales: 1500000 },
    { date: '2026-01-03', sales: 980000 },
    { date: '2026-01-04', sales: 1700000 },
    { date: '2026-01-05', sales: 1100000 },
  ],
};

export const mockFinancialReport = {
  totalRevenue: 15000000,
  totalCost: 6000000,
  grossProfit: 9000000,
  grossMargin: 60.0,
  netProfit: 7500000,
  netMargin: 50.0,
};

export const mockCustomerReport = {
  totalCustomers: 128,
  newCustomers: 15,
  returningCustomers: 113,
  averageVisitFrequency: 3.2,
};

export const mockKDSOrders = [
  {
    id: 'kds-1',
    orderNumber: '001',
    tableName: 'Meja 3',
    orderType: 'dine_in',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    elapsedMinutes: 3,
    priority: 'normal',
    items: [
      { id: 'kds-item-1', productName: 'Nasi Goreng Spesial', quantity: 2, notes: null, modifiers: [], status: 'pending' },
      { id: 'kds-item-2', productName: 'Es Teh Manis', quantity: 2, notes: 'Kurang gula', modifiers: [], status: 'pending' },
    ],
  },
  {
    id: 'kds-2',
    orderNumber: '002',
    tableName: null,
    orderType: 'takeaway',
    createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    elapsedMinutes: 7,
    priority: 'urgent',
    items: [
      { id: 'kds-item-3', productName: 'Mie Ayam Bakso', quantity: 1, notes: 'Tanpa sayur', modifiers: ['Extra bakso'], status: 'preparing' },
    ],
  },
  {
    id: 'kds-3',
    orderNumber: '003',
    tableName: 'Meja 1',
    orderType: 'dine_in',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    elapsedMinutes: 12,
    priority: 'vip',
    items: [
      { id: 'kds-item-4', productName: 'Nasi Goreng Spesial', quantity: 1, notes: null, modifiers: [], status: 'ready' },
      { id: 'kds-item-5', productName: 'Es Teh Manis', quantity: 1, notes: null, modifiers: [], status: 'ready' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Route Interceptors
// ---------------------------------------------------------------------------

/**
 * Sets up API route mocking for all common endpoints.
 * Call this after page creation and before navigation.
 */
export async function setupApiMocks(page: Page): Promise<void> {
  // Auth
  await page.route('**/api/v1/auth/login', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLoginResponse),
      });
    } else {
      await route.continue();
    }
  });

  // Products
  await page.route('**/api/v1/products*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      // Single product detail
      const detailMatch = url.match(/\/products\/([^/?]+)$/);
      if (detailMatch) {
        const product = mockProducts.find((p) => p.id === detailMatch[1]);
        await route.fulfill({
          status: product ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(product ?? { message: 'Not found' }),
        });
        return;
      }

      // Product list
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProducts),
      });
    } else if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'prod-new', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'prod-1', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });

  // Categories
  await page.route('**/api/v1/categories*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCategories),
    });
  });

  // Employees
  await page.route('**/api/v1/employees*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      const detailMatch = url.match(/\/employees\/([^/?]+)$/);
      if (detailMatch) {
        const employee = mockEmployees.find((e) => e.id === detailMatch[1]);
        await route.fulfill({
          status: employee ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(employee ?? { message: 'Not found' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEmployees),
      });
    } else if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'emp-new', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'emp-1', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });

  // Outlets (settings)
  await page.route('**/api/v1/settings/outlets*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOutlets),
    });
  });

  // Outlets (standalone endpoint)
  await page.route('**/api/v1/outlets*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOutlets),
    });
  });

  // Reports - Sales
  await page.route('**/api/v1/reports/sales*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSalesReport),
    });
  });

  // Reports - Financial
  await page.route('**/api/v1/reports/financial*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockFinancialReport),
    });
  });

  // Reports - Customers
  await page.route('**/api/v1/reports/customers*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCustomerReport),
    });
  });

  // POS Products
  await page.route('**/api/v1/pos/products*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPOSProducts),
    });
  });

  // POS Categories
  await page.route('**/api/v1/pos/categories*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPOSCategories),
    });
  });

  // POS Transactions
  await page.route('**/api/v1/pos/transactions*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'txn-1',
          transactionNumber: 'TXN-2026-0001',
          status: 'completed',
          total: 35000,
          createdAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  // KDS Orders
  await page.route('**/api/v1/kds/orders*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockKDSOrders),
    });
  });

  // KDS Bump Item
  await page.route('**/api/v1/kds/items/*/bump', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // KDS Notify Cashier
  await page.route('**/api/v1/kds/orders/*/notify*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // KDS Update Order Status
  await page.route('**/api/v1/kds/orders/*/status*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Customers
  await page.route('**/api/v1/customers*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'cust-1', name: 'Budi Santoso', email: 'budi@test.com', phone: '081234567890' },
        { id: 'cust-2', name: 'Sari Putri', email: 'sari@test.com', phone: '081298765432' },
      ]),
    });
  });

  // Tables
  await page.route('**/api/v1/tables*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'table-1', name: 'Meja 1', capacity: 4, status: 'available' },
        { id: 'table-2', name: 'Meja 2', capacity: 2, status: 'available' },
        { id: 'table-3', name: 'Meja 3', capacity: 6, status: 'occupied' },
      ]),
    });
  });

  // Catch-all for any remaining API calls that are not explicitly handled
  await page.route('**/api/v1/**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}
