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
// Settings Mock Data
// ---------------------------------------------------------------------------

export const mockBusinessSettings = {
  id: 'biz-1',
  name: 'Warung Makan Sejahtera',
  email: 'warung@test.com',
  phone: '021-12345678',
  address: 'Jl. Sudirman No. 123, Jakarta Pusat',
  logoUrl: null,
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
};

export const mockSettingsOutlets = [
  {
    id: 'outlet-1',
    name: 'Outlet Utama',
    code: 'OUT-001',
    address: 'Jl. Sudirman No. 123',
    phone: '021-12345678',
    taxRate: 11,
    serviceCharge: 5,
    isActive: true,
  },
  {
    id: 'outlet-2',
    name: 'Outlet Cabang Kemang',
    code: 'OUT-002',
    address: 'Jl. Kemang Raya No. 45',
    phone: '021-87654321',
    taxRate: 11,
    serviceCharge: 0,
    isActive: true,
  },
  {
    id: 'outlet-3',
    name: 'Outlet Senayan',
    code: 'OUT-003',
    address: 'Jl. Asia Afrika No. 8',
    phone: '021-55512345',
    taxRate: 11,
    serviceCharge: 10,
    isActive: false,
  },
];

export const mockDevices = [
  {
    id: 'dev-1',
    deviceName: 'Kasir Utama',
    deviceType: 'pos_terminal',
    platform: 'Windows',
    outletId: 'outlet-1',
    lastSyncAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: 'dev-2',
    deviceName: 'KDS Dapur',
    deviceType: 'kds_display',
    platform: 'Android',
    outletId: 'outlet-1',
    lastSyncAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: 'dev-3',
    deviceName: 'Mobile Kasir',
    deviceType: 'mobile',
    platform: 'iOS',
    outletId: 'outlet-2',
    lastSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    isActive: false,
  },
];

export const mockNotificationSettings = [
  { id: 'notif-1', type: 'low_stock', channel: 'push', isEnabled: true },
  { id: 'notif-2', type: 'new_order', channel: 'push', isEnabled: true },
  { id: 'notif-3', type: 'order_completed', channel: 'in_app', isEnabled: false },
  { id: 'notif-4', type: 'payment_received', channel: 'email', isEnabled: true },
  { id: 'notif-5', type: 'shift_started', channel: 'in_app', isEnabled: true },
];

export const mockNotificationLogs = [
  {
    id: 'log-1',
    type: 'new_order',
    message: 'Pesanan baru #001 dari Meja 3',
    isRead: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-2',
    type: 'low_stock',
    message: 'Stok Nasi Goreng hampir habis (5 tersisa)',
    isRead: true,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

export const mockTaxConfig = {
  taxRate: 11,
  serviceChargeRate: 5,
  isTaxInclusive: true,
  taxExemptionRules: [
    { id: 'rule-1', name: 'Pemerintah', description: 'Transaksi dengan instansi pemerintah', isActive: true },
    { id: 'rule-2', name: 'Ekspor', description: 'Transaksi untuk ekspor', isActive: false },
  ],
};

export const mockReceiptTemplate = {
  showLogo: true,
  showAddress: true,
  showTaxBreakdown: true,
  showBarcode: false,
  showQrCode: true,
  headerText: 'Selamat Datang',
  footerText: 'Terima kasih atas kunjungan Anda!',
  paperSize: '80mm',
};

export const mockOperatingHours = {
  schedule: [
    { day: 'monday', dayLabel: 'Senin', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'tuesday', dayLabel: 'Selasa', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'wednesday', dayLabel: 'Rabu', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'thursday', dayLabel: 'Kamis', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'friday', dayLabel: 'Jumat', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'saturday', dayLabel: 'Sabtu', isOpen: true, openTime: '09:00', closeTime: '23:00' },
    { day: 'sunday', dayLabel: 'Minggu', isOpen: false, openTime: '09:00', closeTime: '23:00' },
  ],
  specialHours: [
    { id: 'special-1', name: 'Tahun Baru', date: '2026-01-01', isOpen: false, openTime: null, closeTime: null },
    { id: 'special-2', name: 'Idul Fitri', date: '2026-03-31', isOpen: true, openTime: '10:00', closeTime: '18:00' },
  ],
};

export const mockModifierGroups = [
  {
    id: 'mod-grp-1',
    name: 'Tingkat Kepedesan',
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    modifiers: [
      { id: 'mod-1', name: 'Tidak Pedas', price: 0, isActive: true, sortOrder: 0 },
      { id: 'mod-2', name: 'Pedas Sedang', price: 0, isActive: true, sortOrder: 1 },
      { id: 'mod-3', name: 'Pedas Banget', price: 2000, isActive: true, sortOrder: 2 },
    ],
  },
  {
    id: 'mod-grp-2',
    name: 'Topping Tambahan',
    isRequired: false,
    minSelections: 0,
    maxSelections: 3,
    modifiers: [
      { id: 'mod-4', name: 'Telur Ceplok', price: 5000, isActive: true, sortOrder: 0 },
      { id: 'mod-5', name: 'Kerupuk', price: 3000, isActive: true, sortOrder: 1 },
      { id: 'mod-6', name: 'Sate Ayam', price: 8000, isActive: false, sortOrder: 2 },
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

  // Settings - Business
  await page.route('**/api/v1/settings/business*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBusinessSettings),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockBusinessSettings, ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else {
      await route.continue();
    }
  });

  // Settings - Outlets (detailed)
  await page.route('**/api/v1/settings/outlets*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      const detailMatch = url.match(/\/outlets\/([^/?]+)$/);
      if (detailMatch) {
        const outlet = mockSettingsOutlets.find((o) => o.id === detailMatch[1]);
        await route.fulfill({
          status: outlet ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(outlet ?? { message: 'Not found' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSettingsOutlets),
      });
    } else if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'outlet-new', ...JSON.parse(request.postData() ?? '{}'), isActive: true }),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'outlet-1', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });

  // Settings - Devices
  await page.route('**/api/v1/settings/devices*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDevices),
      });
    } else if (url.includes('/sync')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Device synced successfully' }),
      });
    } else if (request.method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });

  // Settings - Notifications
  await page.route('**/api/v1/settings/notifications*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      if (url.includes('/logs')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNotificationLogs),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNotificationSettings),
        });
      }
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Settings - Tax
  await page.route('**/api/v1/settings/tax*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTaxConfig),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockTaxConfig, ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else {
      await route.continue();
    }
  });

  // Settings - Receipt
  await page.route('**/api/v1/settings/receipt*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReceiptTemplate),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockReceiptTemplate, ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else {
      await route.continue();
    }
  });

  // Settings - Operating Hours
  await page.route('**/api/v1/settings/hours*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOperatingHours),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockOperatingHours, ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else {
      await route.continue();
    }
  });

  // Settings - Modifiers
  await page.route('**/api/v1/settings/modifiers*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      const detailMatch = url.match(/\/modifiers\/([^/?]+)$/);
      if (detailMatch) {
        const group = mockModifierGroups.find((g) => g.id === detailMatch[1]);
        await route.fulfill({
          status: group ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(group ?? { message: 'Not found' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockModifierGroups),
      });
    } else if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mod-grp-new', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mod-grp-1', ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
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

  // Reports - Products
  await page.route('**/api/v1/reports/products*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        topProducts: [
          { productName: 'Nasi Goreng Spesial', quantity: 150, revenue: 5250000 },
          { productName: 'Es Teh Manis', quantity: 200, revenue: 1600000 },
          { productName: 'Mie Ayam Bakso', quantity: 80, revenue: 2400000 },
        ],
        totalProducts: 4,
        totalQuantitySold: 430,
      }),
    });
  });

  // Reports - Payment
  await page.route('**/api/v1/reports/payment*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        paymentBreakdown: [
          { method: 'Cash', amount: 8000000, count: 150 },
          { method: 'QRIS', amount: 4000000, count: 60 },
          { method: 'Debit', amount: 3000000, count: 35 },
        ],
        totalAmount: 15000000,
        totalTransactions: 245,
      }),
    });
  });

  // Inventory endpoints
  await page.route('**/api/v1/inventory/stock*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'stock-1', productId: 'prod-1', productName: 'Nasi Goreng Spesial', quantity: 50, minStock: 10 },
        { id: 'stock-2', productId: 'prod-3', productName: 'Mie Ayam Bakso', quantity: 25, minStock: 5 },
      ]),
    });
  });

  await page.route('**/api/v1/inventory/categories*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCategories),
    });
  });

  await page.route('**/api/v1/inventory/products*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockProducts),
    });
  });

  // Shifts (basic mock - detailed mocks in transactions.spec.ts)
  await page.route('**/api/v1/shifts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'shift-1', employeeName: 'John Owner', startTime: '2026-02-06T08:00:00Z', endTime: null, status: 'active' },
      ]),
    });
  });

  // Transactions (basic mock - detailed mocks in transactions.spec.ts)
  await page.route('**/api/v1/transactions*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
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

  // Settlements (basic mock - detailed mocks in transactions.spec.ts)
  await page.route('**/api/v1/settlements*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Dashboard stats
  await page.route('**/api/v1/dashboard*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        todaySales: 2500000,
        todayTransactions: 45,
        topProducts: mockProducts.slice(0, 3),
        recentOrders: [],
      }),
    });
  });

  // Self-Order Sessions
  await page.route('**/api/v1/self-order/sessions/*', async (route) => {
    const request = route.request();
    const url = request.url();

    // Match session code from URL
    const sessionCodeMatch = url.match(/\/sessions\/([^/?]+)/);
    const sessionCode = sessionCodeMatch?.[1];

    if (request.method() === 'GET') {
      // Check for expired session
      if (sessionCode === 'EXPIRED123') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Session not found or expired' }),
        });
        return;
      }

      // Valid session
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSelfOrderSession(sessionCode || 'ABC123')),
      });
    } else if (request.method() === 'POST') {
      // Add item to session or submit session
      if (url.includes('/items')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (url.includes('/submit')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            orderNumber: 'ORD-2026-0042',
            status: 'submitted',
          }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockSelfOrderSession(sessionCode || 'NEW123'),
            sessionCode: sessionCode || 'NEW123',
          }),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Self-Order Menu
  await page.route('**/api/v1/self-order/menu*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSelfOrderMenuItems),
    });
  });

  // Self-Order Orders (for tracking)
  await page.route('**/api/v1/self-order/orders*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      const orderMatch = url.match(/\/orders\/([^/?]+)$/);
      if (orderMatch) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSelfOrderOrderStatus(orderMatch[1])),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockSelfOrderOrderStatus('ORD-2026-0042')]),
      });
    } else {
      await route.continue();
    }
  });

  // Online Store - Admin endpoints
  await page.route('**/api/v1/online-store/stores*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'GET') {
      const detailMatch = url.match(/\/stores\/([^/?]+)$/);
      if (detailMatch) {
        const store = mockOnlineStores.find((s) => s.id === detailMatch[1] || s.slug === detailMatch[1]);
        await route.fulfill({
          status: store ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(store ?? { message: 'Not found' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnlineStores),
      });
    } else if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'store-new',
          businessId: 'biz-1',
          name: body.storeName || body.name,
          slug: body.slug,
          description: body.description || null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockOnlineStores[0], ...JSON.parse(request.postData() ?? '{}') }),
      });
    } else if (request.method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });

  // Online Store - Settings
  await page.route('**/api/v1/online-store/settings*', async (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnlineStoreSettings),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Online Store - Products
  await page.route('**/api/v1/online-store/products*', async (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStorefrontProducts),
      });
    } else if (request.method() === 'PUT' || request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Online Store - Public Storefront
  await page.route('**/api/v1/online-store/s/*/storefront*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockStorefront),
    });
  });

  // Online Store - Public Store Orders
  await page.route('**/api/v1/online-store/s/*/orders*', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockStorefrontOrder),
      });
    } else {
      await route.continue();
    }
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

// ---------------------------------------------------------------------------
// Self-Order Mock Data
// ---------------------------------------------------------------------------

export const mockSelfOrderMenuItems = [
  {
    id: 'menu-1',
    name: 'Nasi Goreng Spesial',
    description: 'Nasi goreng dengan telur, ayam, dan sayuran segar',
    price: 35000,
    imageUrl: null,
    categoryName: 'Makanan',
    isAvailable: true,
  },
  {
    id: 'menu-2',
    name: 'Es Teh Manis',
    description: 'Teh manis segar dengan es batu',
    price: 8000,
    imageUrl: null,
    categoryName: 'Minuman',
    isAvailable: true,
  },
  {
    id: 'menu-3',
    name: 'Mie Ayam Bakso',
    description: 'Mie ayam dengan bakso sapi pilihan',
    price: 30000,
    imageUrl: null,
    categoryName: 'Makanan',
    isAvailable: true,
  },
  {
    id: 'menu-4',
    name: 'Kopi Susu',
    description: 'Kopi susu gula aren',
    price: 18000,
    imageUrl: null,
    categoryName: 'Minuman',
    isAvailable: true,
  },
  {
    id: 'menu-5',
    name: 'Ayam Bakar',
    description: 'Ayam bakar bumbu kecap',
    price: 45000,
    imageUrl: null,
    categoryName: 'Makanan',
    isAvailable: false,
  },
];

export function mockSelfOrderSession(sessionCode: string) {
  return {
    id: `session-${sessionCode}`,
    outletId: 'outlet-1',
    tableId: 'table-3',
    sessionCode: sessionCode,
    status: 'active',
    createdAt: new Date().toISOString(),
    outletName: 'Outlet Utama',
    tableNumber: 'Meja 3',
  };
}

export function mockSelfOrderOrderStatus(orderNumber: string) {
  return {
    orderNumber: orderNumber,
    status: 'preparing',
    items: [
      { productName: 'Nasi Goreng Spesial', quantity: 2, price: 35000 },
      { productName: 'Es Teh Manis', quantity: 2, price: 8000 },
    ],
    subtotal: 86000,
    total: 86000,
    estimatedTime: 15,
    createdAt: new Date().toISOString(),
    tableNumber: 'Meja 3',
  };
}

// ---------------------------------------------------------------------------
// Online Store Mock Data
// ---------------------------------------------------------------------------

export const mockOnlineStores = [
  {
    id: 'store-1',
    businessId: 'biz-1',
    name: 'Kedai Kopi Nusantara',
    slug: 'kedai-kopi-nusantara',
    description: 'Kopi lokal berkualitas tinggi dari berbagai daerah Indonesia',
    isActive: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-02-01T14:30:00Z',
  },
  {
    id: 'store-2',
    businessId: 'biz-1',
    name: 'Warung Makan Bahagia',
    slug: 'warung-makan-bahagia',
    description: 'Masakan rumahan Indonesia',
    isActive: false,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-01-25T09:00:00Z',
  },
];

export const mockOnlineStoreSettings = {
  storeName: 'Kedai Kopi Nusantara',
  logo: null,
  theme: 'light',
  primaryColor: '#3B82F6',
  enableCart: true,
  enableCheckout: true,
  deliveryEnabled: true,
  pickupEnabled: true,
};

export const mockStorefrontCategories = [
  { id: 'cat-1', name: 'Kopi', slug: 'kopi' },
  { id: 'cat-2', name: 'Non-Kopi', slug: 'non-kopi' },
  { id: 'cat-3', name: 'Makanan', slug: 'makanan' },
];

export const mockStorefrontProducts = [
  {
    id: 'prod-1',
    name: 'Kopi Susu Gula Aren',
    description: 'Kopi susu dengan pemanis gula aren asli',
    imageUrl: null,
    price: 25000,
    compareAtPrice: 30000,
    isAvailable: true,
    categoryId: 'cat-1',
    variants: [
      { id: 'var-1', name: 'Regular', price: 25000, sku: 'KSGA-R', isAvailable: true, stock: 50 },
      { id: 'var-2', name: 'Large', price: 32000, sku: 'KSGA-L', isAvailable: true, stock: 30 },
    ],
    modifierGroups: [
      {
        id: 'mod-group-1',
        name: 'Tingkat Gula',
        minSelections: 1,
        maxSelections: 1,
        modifiers: [
          { id: 'mod-1', name: 'Normal', price: 0, isAvailable: true },
          { id: 'mod-2', name: 'Less Sugar', price: 0, isAvailable: true },
          { id: 'mod-3', name: 'Extra Sweet', price: 0, isAvailable: true },
        ],
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Es Teh Manis',
    description: 'Teh manis dingin segar',
    imageUrl: null,
    price: 10000,
    compareAtPrice: null,
    isAvailable: true,
    categoryId: 'cat-2',
    variants: [],
    modifierGroups: [],
  },
  {
    id: 'prod-3',
    name: 'Roti Bakar Coklat',
    description: 'Roti bakar dengan selai coklat',
    imageUrl: null,
    price: 18000,
    compareAtPrice: 22000,
    isAvailable: true,
    categoryId: 'cat-3',
    variants: [],
    modifierGroups: [],
  },
  {
    id: 'prod-4',
    name: 'Espresso',
    description: 'Espresso single shot',
    imageUrl: null,
    price: 15000,
    compareAtPrice: null,
    isAvailable: false,
    categoryId: 'cat-1',
    variants: [],
    modifierGroups: [],
  },
];

export const mockStorefront = {
  id: 'store-1',
  name: 'Kedai Kopi Nusantara',
  slug: 'kedai-kopi-nusantara',
  description: 'Kopi lokal berkualitas tinggi dari berbagai daerah Indonesia',
  logo: null,
  banner: null,
  facebookUrl: 'https://facebook.com/kedaikopinusantara',
  instagramUrl: 'https://instagram.com/kedaikopinusantara',
  whatsappNumber: '6281234567890',
  currency: 'IDR',
  categories: mockStorefrontCategories,
  products: mockStorefrontProducts,
};

export const mockStorefrontOrder = {
  id: 'order-1',
  orderNumber: 'ORD-2026-0001',
  customerName: 'Andi Wijaya',
  total: 57000,
  status: 'pending',
  createdAt: '2026-02-06T12:00:00Z',
};
