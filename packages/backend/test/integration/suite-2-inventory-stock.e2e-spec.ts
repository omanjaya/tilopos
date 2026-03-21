import { INestApplication } from '@nestjs/common';
import { getTestApp } from './helpers/test-app';
import { testContext, saveContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

describe('Suite 2: Inventory & Stock Setup', () => {
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
  // 2A. Stock Levels (Product Stock)
  // ================================================================
  describe('2A - Stock Levels', () => {
    it('2.1 - should set stock Nasi Goreng = 100', async () => {
      const res = await authRequest(app, 'owner').post('/api/v1/inventory/stock/adjust').send({
        outletId: testContext.outletId,
        productId: testContext.created.productIds[0], // Nasi Goreng
        adjustmentType: 'set',
        quantity: 100,
        reason: 'Initial stock setup for testing',
      });

      if (res.status >= 400) {
        console.log('2.1 stock adjust error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);
      expect(res.body.newQuantity).toBe(100);
    });

    it('2.2 - should set stock Es Teh = 200', async () => {
      const res = await authRequest(app, 'owner').post('/api/v1/inventory/stock/adjust').send({
        outletId: testContext.outletId,
        productId: testContext.created.productIds[1], // Es Teh
        adjustmentType: 'set',
        quantity: 200,
        reason: 'Initial stock setup for testing',
      });

      expect(res.status).toBeLessThan(400);
      expect(res.body.newQuantity).toBe(200);
    });

    it('2.3 - should set stock Mie Ayam = 50', async () => {
      const res = await authRequest(app, 'owner').post('/api/v1/inventory/stock/adjust').send({
        outletId: testContext.outletId,
        productId: testContext.created.productIds[2], // Mie Ayam
        adjustmentType: 'set',
        quantity: 50,
        reason: 'Initial stock setup for testing',
      });

      expect(res.status).toBeLessThan(400);
      expect(res.body.newQuantity).toBe(50);
    });

    it('2.4 - should get stock levels for outlet', async () => {
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/inventory/stock/${testContext.outletId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      // Find our test products in stock levels
      const nasiGorengStock = res.body.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.productId === testContext.created.productIds[0],
      );
      const esTehStock = res.body.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.productId === testContext.created.productIds[1],
      );
      const mieAyamStock = res.body.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.productId === testContext.created.productIds[2],
      );

      expect(nasiGorengStock).toBeDefined();
      expect(Number(nasiGorengStock.quantity)).toBe(100);
      expect(esTehStock).toBeDefined();
      expect(Number(esTehStock.quantity)).toBe(200);
      expect(mieAyamStock).toBeDefined();
      expect(Number(mieAyamStock.quantity)).toBe(50);
    });

    it('2.5 - should get low stock (empty since all stocked)', async () => {
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/inventory/stock/${testContext.outletId}/low`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Our test products should NOT be in low stock (qty >> default lowStockAlert of 10)
      const testProductIds = testContext.created.productIds.slice(0, 3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lowTestProducts = res.body.filter((s: any) => testProductIds.includes(s.productId));
      expect(lowTestProducts.length).toBe(0);
    });
  });

  // ================================================================
  // 2B. Ingredient Stock
  // ================================================================
  describe('2B - Ingredient Stock', () => {
    // Ingredient stock adjust requires user.outletId from JWT
    // Use 'inventory' role which has outletId
    const stockRole = 'inventory' as const;

    it('2.6 - should set ingredient stock Beras = 50kg', async () => {
      const res = await authRequest(app, stockRole).post('/api/v1/ingredients/stock/adjust').send({
        ingredientId: testContext.created.ingredientIds[0], // Beras
        quantity: 50,
        referenceType: 'adjustment',
        notes: 'Initial stock setup for testing',
      });

      if (res.status >= 400) {
        console.log('2.6 ingredient stock error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);
    });

    it('2.7 - should set ingredient stock Teh = 5000g', async () => {
      const res = await authRequest(app, stockRole).post('/api/v1/ingredients/stock/adjust').send({
        ingredientId: testContext.created.ingredientIds[1], // Teh
        quantity: 5000,
        referenceType: 'adjustment',
        notes: 'Initial stock setup for testing',
      });

      if (res.status >= 400) {
        console.log('2.7 ingredient stock error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);
    });

    it('2.8 - should set ingredient stock Minyak = 20L', async () => {
      const res = await authRequest(app, stockRole).post('/api/v1/ingredients/stock/adjust').send({
        ingredientId: testContext.created.ingredientIds[2], // Minyak Goreng
        quantity: 20,
        referenceType: 'adjustment',
        notes: 'Initial stock setup for testing',
      });

      if (res.status >= 400) {
        console.log('2.8 ingredient stock error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);
    });
  });

  // ================================================================
  // 2C. Recipes
  // ================================================================
  describe('2C - Recipes', () => {
    it('2.9 - should create recipe: Nasi Goreng = Beras 0.3kg + Minyak 0.05L', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/ingredients/recipes')
        .send({
          productId: testContext.created.productIds[0], // Nasi Goreng
          notes: 'Standard portion: 1 plate',
          items: [
            {
              ingredientId: testContext.created.ingredientIds[0], // Beras
              quantity: 0.3,
              unit: 'kg',
            },
            {
              ingredientId: testContext.created.ingredientIds[2], // Minyak Goreng
              quantity: 0.05,
              unit: 'liter',
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.productId).toBe(testContext.created.productIds[0]);
      testContext.created['recipeIds'] = testContext.created['recipeIds'] || [];
      testContext.created['recipeIds'].push(res.body.id);
    });

    it('2.10 - should create recipe: Es Teh = Teh 5g', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/ingredients/recipes')
        .send({
          productId: testContext.created.productIds[1], // Es Teh
          notes: 'Standard portion: 1 glass',
          items: [
            {
              ingredientId: testContext.created.ingredientIds[1], // Teh
              quantity: 5,
              unit: 'gram',
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.productId).toBe(testContext.created.productIds[1]);
      testContext.created['recipeIds'].push(res.body.id);
    });

    it('2.11 - should get recipes for Nasi Goreng', async () => {
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/ingredients/recipes?productId=${testContext.created.productIds[0]}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const recipe = res.body[0];
      expect(recipe.items).toBeDefined();
      expect(recipe.items.length).toBe(2); // Beras + Minyak
    });
  });

  // ================================================================
  // 2D. Bundle Package
  // ================================================================
  describe('2D - Bundle Package', () => {
    it('2.12 - should create bundle "Paket Hemat" (Nasi Goreng + Es Teh = 30000)', async () => {
      const res = await authRequest(app, 'owner')
        .post('/api/v1/bundle-packages')
        .send({
          name: 'Paket Hemat Test',
          description: 'Nasi Goreng + Es Teh bundle untuk testing',
          price: 30000,
          costPrice: 18000,
          items: [
            {
              productId: testContext.created.productIds[0], // Nasi Goreng
              quantity: 1,
            },
            {
              productId: testContext.created.productIds[1], // Es Teh
              quantity: 1,
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Paket Hemat Test');
      expect(Number(res.body.price)).toBe(30000);
      testContext.created['bundleIds'] = testContext.created['bundleIds'] || [];
      testContext.created['bundleIds'].push(res.body.id);
    });

    it('2.13 - should get bundle detail', async () => {
      const bundleId = testContext.created['bundleIds'][0];
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/bundle-packages/${bundleId}`)
        .expect(200);

      expect(res.body.id).toBe(bundleId);
      expect(res.body.name).toBe('Paket Hemat Test');
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(2);
    });
  });

  // ================================================================
  // 2E. Start Shift
  // ================================================================
  describe('2E - Shift', () => {
    it('2.14 - should start shift for cashier (openingCash: 500000)', async () => {
      // End any existing open shift first (from previous test runs)
      const currentShift = await authRequest(app, 'cashier').get(
        '/api/v1/employees/shifts/current',
      );
      if (currentShift.status === 200 && currentShift.body?.id) {
        const employeeId = testContext.auth.cashier?.employeeId;
        await authRequest(app, 'cashier')
          .post(`/api/v1/employees/${employeeId}/shifts/end`)
          .send({ closingCash: 0 });
      }

      const res = await authRequest(app, 'cashier').post('/api/v1/employees/shifts/start').send({
        outletId: testContext.outletId,
        openingCash: 500000,
      });

      if (res.status >= 400) {
        console.log('2.14 shift start error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);
      expect(res.body.shiftId).toBeDefined();
      testContext.created.shiftIds.push(res.body.shiftId);
    });

    it('2.15 - should get current shift', async () => {
      const res = await authRequest(app, 'cashier')
        .get('/api/v1/employees/shifts/current')
        .expect(200);

      expect(res.body).not.toBeNull();
      expect(res.body.id).toBe(testContext.created.shiftIds[0]);
    });

    it('2.16 - should fail starting second shift (already open)', async () => {
      const res = await authRequest(app, 'cashier').post('/api/v1/employees/shifts/start').send({
        outletId: testContext.outletId,
        openingCash: 500000,
      });

      // Should return 400 or 409 (conflict)
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================================================
  // Summary
  // ================================================================
  describe('Summary', () => {
    it('should have all inventory setup data in context', () => {
      // Stock levels were set (verified in 2.4)
      expect(testContext.created.productIds.length).toBeGreaterThanOrEqual(3);
      expect(testContext.created.ingredientIds.length).toBeGreaterThanOrEqual(3);
      expect(testContext.created['recipeIds']?.length).toBeGreaterThanOrEqual(2);
      expect(testContext.created['bundleIds']?.length).toBeGreaterThanOrEqual(1);
      expect(testContext.created.shiftIds.length).toBeGreaterThanOrEqual(1);

      console.log('\n=== Suite 2 Summary ===');
      console.log(`Recipes: ${testContext.created['recipeIds']?.length}`);
      console.log(`Bundles: ${testContext.created['bundleIds']?.length}`);
      console.log(`Active Shifts: ${testContext.created.shiftIds.length}`);
      console.log('========================\n');

      // Persist context for subsequent suites
      saveContext();
    });
  });
});
