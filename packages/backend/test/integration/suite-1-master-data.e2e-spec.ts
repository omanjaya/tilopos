import { INestApplication } from '@nestjs/common';
import { getTestApp } from './helpers/test-app';
import { testContext, saveContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

// Unique suffix per test run to avoid duplicates in database
const runId = Date.now().toString(36).slice(-4);

describe('Suite 1: Master Data', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();

    // Ensure auth tokens are available (in case running standalone)
    if (!testContext.auth.owner) {
      await loginAs('owner');
      await loginAs('manager');
      await loginAs('cashier');
      await loginAs('superAdmin');
      await loginAs('supervisor');
      await loginAs('kitchen');
      await loginAs('inventory');
    }
  });

  // ================================================================
  // 1A. Categories
  // ================================================================
  describe('1A - Categories', () => {
    it('1.1 - should create category "Makanan"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/inventory/categories')
        .send({ name: 'Makanan' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Makanan');
      expect(res.body.businessId).toBe(testContext.businessId);
      testContext.created.categoryIds.push(res.body.id);
    });

    it('1.2 - should create category "Minuman"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/inventory/categories')
        .send({ name: 'Minuman' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Minuman');
      testContext.created.categoryIds.push(res.body.id);
    });

    it('should list categories', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/inventory/categories').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const names = res.body.map((c: any) => c.name);
      expect(names).toContain('Makanan');
      expect(names).toContain('Minuman');
    });
  });

  // ================================================================
  // 1B. Products
  // ================================================================
  describe('1B - Products', () => {
    it('1.3 - should create "Nasi Goreng" (trackStock=true)', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/inventory/products')
        .send({
          businessId: testContext.businessId,
          name: 'Nasi Goreng Test',
          categoryId: testContext.created.categoryIds[0], // Makanan
          basePrice: 25000,
          costPrice: 15000,
          trackStock: true,
        })
        .expect(201);

      // CreateProductUseCase returns { productId, variantIds }
      expect(res.body.productId).toBeDefined();
      expect(res.body.variantIds).toBeDefined();
      testContext.created.productIds.push(res.body.productId);
    });

    it('1.4 - should create "Es Teh" (trackStock=true)', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/inventory/products')
        .send({
          businessId: testContext.businessId,
          name: 'Es Teh Test',
          categoryId: testContext.created.categoryIds[1], // Minuman
          basePrice: 8000,
          costPrice: 3000,
          trackStock: true,
        })
        .expect(201);

      expect(res.body.productId).toBeDefined();
      testContext.created.productIds.push(res.body.productId);
    });

    it('1.5 - should create "Mie Ayam" (trackStock=true)', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/inventory/products')
        .send({
          businessId: testContext.businessId,
          name: 'Mie Ayam Test',
          categoryId: testContext.created.categoryIds[0], // Makanan
          basePrice: 22000,
          costPrice: 12000,
          trackStock: true,
        })
        .expect(201);

      expect(res.body.productId).toBeDefined();
      testContext.created.productIds.push(res.body.productId);
    });

    it('1.6 - should create "Kopi Susu" (trackStock=false)', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/inventory/products')
        .send({
          businessId: testContext.businessId,
          name: 'Kopi Susu Test',
          categoryId: testContext.created.categoryIds[1], // Minuman
          basePrice: 15000,
          costPrice: 5000,
          trackStock: false,
        })
        .expect(201);

      expect(res.body.productId).toBeDefined();
      testContext.created.productIds.push(res.body.productId);
    });

    it('1.7 - should list products', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/inventory/products').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Should contain our 4 test products (plus any seeded ones)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testNames = res.body.map((p: any) => p.name).filter((n: string) => n.includes('Test'));
      expect(testNames.length).toBeGreaterThanOrEqual(4);
    });

    it('1.8 - should get product detail', async () => {
      const productId = testContext.created.productIds[0]; // Nasi Goreng
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/inventory/products/${productId}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.name).toBe('Nasi Goreng Test');
      expect(res.body.basePrice).toBe(25000);
      expect(res.body.trackStock).toBe(true);
      expect(res.body.categoryId).toBe(testContext.created.categoryIds[0]);
    });
  });

  // ================================================================
  // 1C. Employees
  // ================================================================
  describe('1C - Employees', () => {
    it('1.9 - should list employees', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/employees').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      // Verify structure
      const firstEmployee = res.body[0];
      expect(firstEmployee).toHaveProperty('id');
      expect(firstEmployee).toHaveProperty('name');
      expect(firstEmployee).toHaveProperty('role');
      expect(firstEmployee).toHaveProperty('isActive');
    });

    it('1.10 - should create employee "Kasir Test"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/employees')
        .send({
          name: 'Kasir Test',
          email: 'kasirtest@brewbites.id',
          pin: '5678',
          role: 'cashier',
          outletId: testContext.outletId,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Kasir Test');
      expect(res.body.role).toBe('cashier');
      testContext.created['employeeIds'] = testContext.created['employeeIds'] || [];
      testContext.created['employeeIds'].push(res.body.id);
    });
  });

  // ================================================================
  // 1D. Customers
  // ================================================================
  describe('1D - Customers', () => {
    it('1.11 - should create customer "Budi Customer"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/customers')
        .send({
          name: 'Budi Customer Test',
          email: 'buditest@gmail.com',
          phone: '08123456789',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Budi Customer Test');
      expect(res.body.loyaltyPoints).toBe(0);
      expect(res.body.visitCount).toBe(0);
      testContext.created.customerIds.push(res.body.id);
    });

    it('1.12 - should create customer "Siti Customer"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/customers')
        .send({
          name: 'Siti Customer Test',
          phone: '08198765432',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Siti Customer Test');
      testContext.created.customerIds.push(res.body.id);
    });

    it('1.13 - should list customers', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/customers').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testNames = res.body.map((c: any) => c.name).filter((n: string) => n.includes('Test'));
      expect(testNames.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ================================================================
  // 1E. Tables
  // ================================================================
  describe('1E - Tables', () => {
    it('1.14 - should create table "T1"', async () => {
      const tableName = `T1-Test-${runId}`;
      const res = await authRequest(app, 'owner')
        .post('/api/v1/tables')
        .send({
          outletId: testContext.outletId,
          name: tableName,
          capacity: 4,
          section: 'Indoor',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(tableName);
      expect(res.body.capacity).toBe(4);
      expect(res.body.status).toBe('available');
      testContext.created.tableIds.push(res.body.id);
    });

    it('1.15 - should create table "T2"', async () => {
      const tableName = `T2-Test-${runId}`;
      const res = await authRequest(app, 'owner')
        .post('/api/v1/tables')
        .send({
          outletId: testContext.outletId,
          name: tableName,
          capacity: 6,
          section: 'Outdoor',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(tableName);
      testContext.created.tableIds.push(res.body.id);
    });

    it('1.16 - should list tables with status available', async () => {
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/tables?outletId=${testContext.outletId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Verify our newly created tables exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ourTables = res.body.filter((t: any) => testContext.created.tableIds.includes(t.id));
      expect(ourTables.length).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ourTables.forEach((t: any) => {
        expect(t.status).toBe('available');
      });
    });
  });

  // ================================================================
  // 1F. Ingredients
  // ================================================================
  describe('1F - Ingredients', () => {
    it('1.17 - should create ingredient "Beras"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/ingredients')
        .send({
          name: 'Beras Test',
          unit: 'kg',
          costPerUnit: 12000,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Beras Test');
      expect(res.body.unit).toBe('kg');
      testContext.created.ingredientIds.push(res.body.id);
    });

    it('1.18 - should create ingredient "Teh"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/ingredients')
        .send({
          name: 'Teh Test',
          unit: 'gram',
          costPerUnit: 50,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Teh Test');
      testContext.created.ingredientIds.push(res.body.id);
    });

    it('1.19 - should create ingredient "Minyak Goreng"', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/ingredients')
        .send({
          name: 'Minyak Goreng Test',
          unit: 'liter',
          costPerUnit: 18000,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      testContext.created.ingredientIds.push(res.body.id);
    });

    it('should list ingredients', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/ingredients').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testIngredients = res.body.filter((i: any) => i.name.includes('Test'));
      expect(testIngredients.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ================================================================
  // 1G. Promotions & Vouchers
  // ================================================================
  describe('1G - Promotions & Vouchers', () => {
    it('1.20 - should create promotion "Diskon 20%"', async () => {
      const now = new Date();
      const validFrom = now.toISOString();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 days

      const res = await authRequest(app, 'owner')
        .post('/api/v1/promotions')
        .send({
          name: 'Diskon 20% Test',
          description: 'Diskon 20% untuk testing',
          discountType: 'percentage',
          discountValue: 20,
          validFrom,
          validUntil,
          usageLimit: 50,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Diskon 20% Test');
      expect(res.body.discountType).toBe('percentage');
      expect(res.body.discountValue).toBe(20);
      expect(res.body.isActive).toBe(true);
      testContext.created['promotionIds'] = testContext.created['promotionIds'] || [];
      testContext.created['promotionIds'].push(res.body.id);
    });

    it('1.21 - should generate 5 vouchers', async () => {
      const now = new Date();
      const validFrom = now.toISOString();
      const validTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await authRequest(app, 'owner')
        .post('/api/v1/promotions/vouchers/generate')
        .send({
          prefix: 'TEST',
          quantity: 5,
          discountType: 'percentage',
          discountValue: 20,
          validFrom,
          validTo,
          usageLimit: 1,
        })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(5);
      // Store first voucher code for later tests
      testContext.created['voucherCodes'] = testContext.created['voucherCodes'] || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.body.forEach((v: any) => {
        expect(v.code).toMatch(/^TEST/);
        testContext.created['voucherCodes'].push(v.code);
      });
    });

    it('1.22 - should validate a voucher code', async () => {
      const code = testContext.created['voucherCodes'][0];
      const res = await authRequest(app, 'owner')
        .post('/api/v1/promotions/vouchers/validate')
        .send({
          code,
          total: 100000,
        })
        .expect(201);

      expect(res.body.valid).toBe(true);
    });

    it('should list promotions', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/promotions').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testPromos = res.body.filter((p: any) => p.name.includes('Test'));
      expect(testPromos.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ================================================================
  // Summary: Verify all created data is in context
  // ================================================================
  describe('Summary', () => {
    it('should have all master data IDs stored in context', () => {
      expect(testContext.created.categoryIds.length).toBeGreaterThanOrEqual(2);
      expect(testContext.created.productIds.length).toBeGreaterThanOrEqual(4);
      expect(testContext.created.customerIds.length).toBeGreaterThanOrEqual(2);
      expect(testContext.created.tableIds.length).toBeGreaterThanOrEqual(2);
      expect(testContext.created.ingredientIds.length).toBeGreaterThanOrEqual(3);
      expect(testContext.created['promotionIds'].length).toBeGreaterThanOrEqual(1);
      expect(testContext.created['voucherCodes'].length).toBeGreaterThanOrEqual(5);

      // Log summary for debugging
      console.log('\n=== Suite 1 Summary ===');
      console.log(`Categories: ${testContext.created.categoryIds.length}`);
      console.log(`Products: ${testContext.created.productIds.length}`);
      console.log(`Customers: ${testContext.created.customerIds.length}`);
      console.log(`Tables: ${testContext.created.tableIds.length}`);
      console.log(`Ingredients: ${testContext.created.ingredientIds.length}`);
      console.log(`Promotions: ${testContext.created['promotionIds'].length}`);
      console.log(`Vouchers: ${testContext.created['voucherCodes'].length}`);
      console.log('========================\n');

      // Persist context for subsequent suites
      saveContext();
    });
  });
});
