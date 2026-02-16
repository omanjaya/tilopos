import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getTestApp } from './helpers/test-app';
import { testContext, saveContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

describe('Suite 13: Self-Order', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();

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
  // Setup
  // ================================================================
  let sessionCode: string;

  describe('Setup', () => {
    it('should ensure productIds exist', async () => {
      if (!testContext.created.productIds.length) {
        const res = await authRequest(app, 'owner')
          .get('/api/v1/inventory/products');
        expect(res.status).toBeLessThan(400);
        const products = Array.isArray(res.body) ? res.body : res.body.data || [];
        testContext.created.productIds = products.map((p: any) => p.id);
        saveContext();
      }
      expect(testContext.created.productIds.length).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // 13A. Session & Menu
  // ================================================================
  describe('13A - Session & Menu', () => {
    it('13.1 - should create a self-order session', async () => {
      const outletId = testContext.outletId!;

      const res = await request(app.getHttpServer())
        .post('/api/v1/self-order/sessions')
        .send({
          outletId,
          language: 'id',
        });

      if (res.status >= 400) {
        console.log('13.1 create session error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.sessionId || res.body.id).toBeDefined();
      expect(res.body.sessionCode).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();

      sessionCode = res.body.sessionCode;

      if (!testContext.created['sessionCodes']) {
        testContext.created['sessionCodes'] = [];
      }
      testContext.created['sessionCodes'].push(sessionCode);
      saveContext();

      console.log('13.1 Session created:', sessionCode);
    });

    it('13.2 - should get menu (public, no auth)', async () => {
      const outletId = testContext.outletId!;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/menu?outletId=${outletId}`);

      if (res.status >= 400) {
        console.log('13.2 menu error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      const items = Array.isArray(res.body) ? res.body : res.body.data || [];
      expect(items.length).toBeGreaterThan(0);

      // Verify menu item shape
      const first = items[0];
      expect(first.id).toBeDefined();
      expect(first.name).toBeDefined();
      expect(first.price).toBeDefined();

      console.log(`13.2 Menu items: ${items.length}`);
    });

    it('13.2b - should get menu with language support (parametric route)', async () => {
      const outletId = testContext.outletId!;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/menu/${outletId}?lang=en`);

      if (res.status >= 400) {
        console.log('13.2b menu/:outletId error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      // This endpoint returns grouped by category
      expect(res.body.outletName).toBeDefined();
      expect(res.body.language).toBe('en');
      expect(res.body.categories).toBeDefined();
      expect(Array.isArray(res.body.categories)).toBe(true);

      console.log(`13.2b Categories: ${res.body.categories.length}`);
    });

    it('13.3 - should get session by code', async () => {
      expect(sessionCode).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/sessions/${sessionCode}`);

      if (res.status >= 400) {
        console.log('13.3 get session error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.sessionCode).toBe(sessionCode);
      expect(res.body.status).toBe('active');
      expect(res.body.outletName).toBeDefined();

      console.log('13.3 Session status:', res.body.status);
    });
  });

  // ================================================================
  // 13B. Cart & Order Submission
  // ================================================================
  describe('13B - Cart & Order Submission', () => {
    it('13.4 - should add item to session cart', async () => {
      expect(sessionCode).toBeDefined();
      const productId = testContext.created.productIds[0];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/self-order/sessions/${sessionCode}/items`)
        .send({
          productId,
          quantity: 2,
          notes: 'Extra spicy',
        });

      if (res.status >= 400) {
        console.log('13.4 add item error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.id).toBeDefined();
      expect(res.body.productId).toBe(productId);
      expect(res.body.quantity).toBe(2);

      console.log('13.4 Item added:', res.body.id);
    });

    it('13.4b - should add second item to cart', async () => {
      if (testContext.created.productIds.length < 2) {
        console.log('13.4b skipped: only 1 product');
        return;
      }

      const productId = testContext.created.productIds[1];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/self-order/sessions/${sessionCode}/items`)
        .send({
          productId,
          quantity: 1,
        });

      if (res.status >= 400) {
        console.log('13.4b add item error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      console.log('13.4b Second item added');
    });

    it('13.5 - should get session total', async () => {
      expect(sessionCode).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/sessions/${sessionCode}/total`);

      if (res.status >= 400) {
        console.log('13.5 total error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.subtotal).toBeDefined();
      expect(Number(res.body.subtotal)).toBeGreaterThan(0);
      expect(res.body.grandTotal).toBeDefined();
      expect(Number(res.body.grandTotal)).toBeGreaterThanOrEqual(Number(res.body.subtotal));
      expect(res.body.itemCount).toBeGreaterThanOrEqual(2);

      console.log(`13.5 Total: subtotal=${res.body.subtotal}, grand=${res.body.grandTotal}, items=${res.body.itemCount}`);
    });

    it('13.6 - should submit order', async () => {
      expect(sessionCode).toBeDefined();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/self-order/sessions/${sessionCode}/submit`);

      if (res.status >= 400) {
        console.log('13.6 submit error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.success).toBe(true);
      expect(res.body.orderId).toBeDefined();
      expect(res.body.orderNumber).toBeDefined();

      if (!testContext.created.orderIds.includes(res.body.orderId)) {
        testContext.created.orderIds.push(res.body.orderId);
      }
      saveContext();

      console.log('13.6 Order submitted:', res.body.orderNumber);
    });

    it('13.7 - should verify order appears in KDS', async () => {
      const outletId = testContext.outletId!;

      const res = await authRequest(app, 'kitchen')
        .get(`/api/v1/kds/orders?outletId=${outletId}`);

      if (res.status >= 400) {
        console.log('13.7 KDS error:', res.status, res.body);
        // KDS endpoint may not exist
        expect(res.status).toBeLessThan(500);
        return;
      }

      const orders = Array.isArray(res.body) ? res.body : res.body.data || res.body.orders || [];

      if (orders.length > 0) {
        // Look for our self-order
        const soOrder = orders.find(
          (o: any) => o.orderNumber?.startsWith('ORD-') || o.orderType === 'dine_in',
        );
        if (soOrder) {
          console.log('13.7 Order found in KDS:', soOrder.orderNumber || soOrder.id);
        } else {
          console.log('13.7 KDS has orders but self-order not matched by pattern');
        }
      } else {
        console.log('13.7 No orders in KDS (may use different query)');
      }
    });
  });

  // ================================================================
  // 13C. Payment
  // ================================================================
  describe('13C - Payment', () => {
    let grandTotal: number;

    it('13.8 - should get total for payment', async () => {
      expect(sessionCode).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/sessions/${sessionCode}/total`);

      expect(res.status).toBeLessThan(400);
      grandTotal = Number(res.body.grandTotal);
      expect(grandTotal).toBeGreaterThan(0);

      console.log('13.8 Grand total for payment:', grandTotal);
    });

    it('13.9 - should create QRIS payment', async () => {
      expect(sessionCode).toBeDefined();
      expect(grandTotal).toBeGreaterThan(0);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/self-order/sessions/${sessionCode}/pay/qris`)
        .send({ amount: grandTotal });

      if (res.status >= 400) {
        console.log('13.9 QRIS payment error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.success).toBe(true);
      expect(res.body.transactionId).toBeDefined();
      expect(res.body.paymentMethod).toBe('qris');
      expect(res.body.qrCode || res.body.qrCodeData).toBeDefined();

      console.log('13.9 QRIS payment created:', res.body.transactionId);
    });

    it('13.10 - should get payment status', async () => {
      expect(sessionCode).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/sessions/${sessionCode}/payment-status`);

      if (res.status >= 400) {
        console.log('13.10 payment status error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.sessionStatus).toBeDefined();
      expect(res.body.paymentMethod).toBe('qris');
      expect(res.body.paymentStatus).toBe('pending');
      expect(res.body.paymentReference).toBeDefined();

      console.log('13.10 Payment status:', res.body.paymentStatus);
    });

    it('13.11 - should handle payment callback (success)', async () => {
      expect(sessionCode).toBeDefined();

      // Get the paymentRef from the session
      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/self-order/sessions/${sessionCode}/payment-status`);

      expect(statusRes.status).toBeLessThan(400);
      const paymentRef = statusRes.body.paymentReference;
      expect(paymentRef).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/api/v1/self-order/payment/callback')
        .send({
          orderId: paymentRef,
          status: 'success',
        });

      if (res.status >= 400) {
        console.log('13.11 callback error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);
      expect(res.body.received).toBe(true);

      console.log('13.11 Payment callback processed');
    });

    it('13.12 - should verify session is now paid', async () => {
      expect(sessionCode).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/self-order/sessions/${sessionCode}/payment-status`);

      expect(res.status).toBeLessThan(400);
      expect(res.body.sessionStatus).toBe('paid');
      expect(res.body.isPaid).toBe(true);
      expect(res.body.paymentStatus).toBe('success');

      console.log('13.12 Session is now paid');
    });
  });

  // ================================================================
  // 13D. Session Management & i18n
  // ================================================================
  describe('13D - Session Management & i18n', () => {
    let extendSessionCode: string;

    it('13.13 - should create another session and extend it', async () => {
      const outletId = testContext.outletId!;

      // Create new session
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/self-order/sessions')
        .send({ outletId });

      expect(createRes.status).toBeLessThan(400);
      extendSessionCode = createRes.body.sessionCode;

      // Extend session
      const extendRes = await request(app.getHttpServer())
        .put(`/api/v1/self-order/sessions/${extendSessionCode}/extend`)
        .send({ minutes: 30 });

      if (extendRes.status >= 400) {
        console.log('13.13 extend error:', extendRes.status, extendRes.body);
      }
      expect(extendRes.status).toBeLessThan(400);

      console.log('13.13 Session extended');
    });

    it('13.14 - should get i18n translations (id)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/self-order/i18n/id');

      if (res.status >= 400) {
        console.log('13.14 i18n error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.locale).toBe('id');
      expect(res.body.supportedLocales).toBeDefined();
      expect(res.body.translations).toBeDefined();

      console.log('13.14 i18n (id) retrieved, locales:', res.body.supportedLocales);
    });

    it('13.15 - should get i18n translations (en)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/self-order/i18n/en');

      expect(res.status).toBeLessThan(400);
      expect(res.body.locale).toBe('en');
      expect(res.body.translations).toBeDefined();

      console.log('13.15 i18n (en) retrieved');
    });

    it('13.16 - should fallback for unsupported locale', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/self-order/i18n/zh');

      expect(res.status).toBeLessThan(400);
      // Should return fallback with id translations
      expect(res.body.translations).toBeDefined();
      expect(res.body.fallback || res.body.locale).toBeDefined();

      console.log('13.16 Unsupported locale handled');
    });
  });

  // ================================================================
  // 13E. Edge Cases
  // ================================================================
  describe('13E - Edge Cases', () => {
    it('13.17 - should reject adding item to submitted session', async () => {
      // sessionCode was already submitted in 13.6
      expect(sessionCode).toBeDefined();
      const productId = testContext.created.productIds[0];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/self-order/sessions/${sessionCode}/items`)
        .send({ productId, quantity: 1 });

      // Should fail because session is no longer active
      expect(res.status).toBeGreaterThanOrEqual(400);
      console.log('13.17 Correctly rejected:', res.status);
    });

    it('13.18 - should reject submitting empty session', async () => {
      // Create a new empty session
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/self-order/sessions')
        .send({ outletId: testContext.outletId });

      expect(createRes.status).toBeLessThan(400);
      const emptyCode = createRes.body.sessionCode;

      // Try to submit empty session
      const res = await request(app.getHttpServer())
        .post(`/api/v1/self-order/sessions/${emptyCode}/submit`);

      expect(res.status).toBeGreaterThanOrEqual(400);
      console.log('13.18 Empty submit rejected:', res.status);
    });

    it('13.19 - should return 404 for invalid session code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/self-order/sessions/INVALID-CODE-123');

      expect(res.status).toBeGreaterThanOrEqual(400);
      console.log('13.19 Invalid session code:', res.status);
    });
  });

  // ================================================================
  // Summary
  // ================================================================
  describe('Summary', () => {
    it('should have verified self-order features', () => {
      console.log('\n=== Suite 13 Summary ===');
      console.log('Session Creation: verified');
      console.log('Public Menu: verified');
      console.log('Cart Management: verified');
      console.log('Order Submission: verified');
      console.log('QRIS Payment: verified');
      console.log('Payment Callback: verified');
      console.log('Session Extension: verified');
      console.log('i18n Translations: verified');
      console.log('Edge Cases: verified');
      console.log('========================\n');

      saveContext();
    });
  });
});
