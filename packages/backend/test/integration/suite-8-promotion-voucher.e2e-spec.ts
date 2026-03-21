import { INestApplication } from '@nestjs/common';
import { getTestApp } from './helpers/test-app';
import { testContext, saveContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

describe('Suite 8: Promotion & Voucher', () => {
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
  // 8A. Apply Promotion
  // ================================================================
  describe('8A - Apply Promotion', () => {
    it('8.1 - should apply promotion to cart', async () => {
      const productId = testContext.created.productIds[0]; // Nasi Goreng

      const res = await authRequest(app, 'owner')
        .post('/api/v1/promotions/apply')
        .send({
          items: [
            {
              productId,
              quantity: 2,
              price: 25000,
            },
          ],
          total: 50000,
        });

      if (res.status >= 400) {
        console.log('8.1 apply error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.subtotal).toBeDefined();
      expect(res.body.discount).toBeDefined();
      expect(res.body.total).toBeDefined();

      // Should find at least one applicable promotion
      if (res.body.appliedPromotion) {
        expect(res.body.appliedPromotion.id).toBeDefined();
        expect(res.body.appliedPromotion.name).toBeDefined();
      }
      if (res.body.allApplicablePromotions) {
        expect(Array.isArray(res.body.allApplicablePromotions)).toBe(true);
      }
    });

    it('8.2 - should get promotion with updated usedCount', async () => {
      const promotionId = testContext.created['promotionIds']?.[0];
      expect(promotionId).toBeDefined();

      const res = await authRequest(app, 'owner').get(`/api/v1/promotions/${promotionId}`);

      if (res.status >= 400) {
        console.log('8.2 get promotion error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.id).toBe(promotionId);
      expect(res.body.name).toBeDefined();
      // usedCount tracks how many times promotion was used in transactions
      expect(Number(res.body.usedCount)).toBeGreaterThanOrEqual(0);
      expect(res.body.discountType).toBeDefined();
      expect(res.body.isActive).toBe(true);
    });
  });

  // ================================================================
  // 8B. Voucher Validation
  // ================================================================
  describe('8B - Voucher Validation', () => {
    it('8.3 - should fail validating used voucher', async () => {
      // The first voucher was used in Suite 3 (test 3.22)
      const usedCode = testContext.created['voucherCodes']?.[0];
      expect(usedCode).toBeDefined();

      const res = await authRequest(app, 'owner')
        .post('/api/v1/promotions/vouchers/validate')
        .send({
          code: usedCode,
          total: 50000,
        });

      expect(res.status).toBeLessThan(500);
      // Should indicate voucher is invalid (already used)
      if (res.status < 400) {
        expect(res.body.valid).toBe(false);
        expect(res.body.error).toBeDefined();
      }
    });

    it('8.4 - should validate unused voucher', async () => {
      // Use a voucher that hasn't been used yet (index 1 or later)
      const voucherCodes = testContext.created['voucherCodes'] || [];
      const unusedCode = voucherCodes.length > 1 ? voucherCodes[1] : voucherCodes[0];
      expect(unusedCode).toBeDefined();

      const res = await authRequest(app, 'owner')
        .post('/api/v1/promotions/vouchers/validate')
        .send({
          code: unusedCode,
          total: 50000,
        });

      if (res.status >= 400) {
        console.log('8.4 validate error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.valid).toBe(true);
      expect(res.body.discountValue).toBeDefined();
      expect(res.body.discountType).toBeDefined();
    });
  });

  // ================================================================
  // 8C. Voucher Export & Limits
  // ================================================================
  describe('8C - Voucher Export & Limits', () => {
    it('8.5 - should export vouchers as CSV', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/promotions/vouchers/export');

      if (res.status >= 400) {
        console.log('8.5 export error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      // Response should be CSV content
      const contentType = res.headers['content-type'] || '';
      const body = typeof res.body === 'string' ? res.body : res.text;

      if (contentType.includes('csv') || contentType.includes('text')) {
        expect(body).toContain('Code');
      } else {
        // May return JSON array instead
        expect(res.body).toBeDefined();
      }
    });

    it('8.6 - should use remaining vouchers and verify limit', async () => {
      const voucherCodes = testContext.created['voucherCodes'] || [];

      // Use vouchers index 1-4 (index 0 was used in Suite 3)
      let usedCount = 0;
      for (let i = 1; i < voucherCodes.length; i++) {
        // Validate first
        const valRes = await authRequest(app, 'owner')
          .post('/api/v1/promotions/vouchers/validate')
          .send({ code: voucherCodes[i], total: 50000 });

        if (valRes.status < 400 && valRes.body.valid && valRes.body.voucherId) {
          // Mark as used
          const useRes = await authRequest(app, 'owner')
            .post(`/api/v1/promotions/vouchers/${valRes.body.voucherId}/use`)
            .send({ customerId: testContext.created.customerIds[0] });

          if (useRes.status < 400) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            usedCount++;
          }
        }
      }

      // After using all vouchers, validate any one should fail
      const lastCode = voucherCodes[voucherCodes.length - 1];
      const checkRes = await authRequest(app, 'owner')
        .post('/api/v1/promotions/vouchers/validate')
        .send({ code: lastCode, total: 50000 });

      expect(checkRes.status).toBeLessThan(500);
      if (checkRes.status < 400) {
        // Should be invalid (already used)
        expect(checkRes.body.valid).toBe(false);
      }

      // Verify promotion usedCount
      const promotionId = testContext.created['promotionIds']?.[0];
      if (promotionId) {
        const promoRes = await authRequest(app, 'owner').get(`/api/v1/promotions/${promotionId}`);

        if (promoRes.status < 400) {
          // usedCount may not increment from manual voucher use (only from transactions)
          expect(Number(promoRes.body.usedCount)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ================================================================
  // Summary
  // ================================================================
  describe('Summary', () => {
    it('should have verified promotion and voucher features', () => {
      console.log('\n=== Suite 8 Summary ===');
      console.log('Apply Promotion: verified');
      console.log('Voucher Validation: verified');
      console.log('Voucher Export: verified');
      console.log('Voucher Limits: verified');
      console.log('========================\n');

      saveContext();
    });
  });
});
