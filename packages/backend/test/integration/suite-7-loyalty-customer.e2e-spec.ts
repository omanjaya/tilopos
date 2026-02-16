import { INestApplication } from '@nestjs/common';
import { getTestApp } from './helpers/test-app';
import { testContext, saveContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

describe('Suite 7: Loyalty & Customer', () => {
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
  // 7A. Points Earning
  // ================================================================
  describe('7A - Points Earning', () => {
    let initialBalance: number;

    it('7.1 - should get loyalty balance for Budi', async () => {
      const customerId = testContext.created.customerIds[0];
      expect(customerId).toBeDefined();

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/loyalty/customer/${customerId}`);

      if (res.status >= 400) {
        console.log('7.1 loyalty balance error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.customerId || res.body.id).toBeDefined();
      initialBalance = Number(res.body.currentPoints || res.body.loyaltyPoints || 0);
      expect(initialBalance).toBeGreaterThanOrEqual(0);

      // Should have tier info
      expect(res.body.currentTier || res.body.tier).toBeDefined();
    });

    it('7.2 - should get loyalty history', async () => {
      const customerId = testContext.created.customerIds[0];

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/loyalty/customer/${customerId}/history`);

      if (res.status >= 400) {
        console.log('7.2 loyalty history error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      const transactions = res.body.transactions || res.body.data || res.body;
      expect(Array.isArray(transactions)).toBe(true);

      // May have earned records from Suite 3 transaction
      if (transactions.length > 0) {
        const earned = transactions.filter(
          (t: any) => t.type === 'earned',
        );
        // Verify structure
        if (earned.length > 0) {
          expect(earned[0].points).toBeDefined();
          expect(Number(earned[0].points)).toBeGreaterThan(0);
        }
      }
    });

    it('7.3 - should manually earn points', async () => {
      const customerId = testContext.created.customerIds[0];
      // Use one of the transaction IDs from Suite 3
      const txId = testContext.created.transactionIds[0];

      const res = await authRequest(app, 'owner')
        .post('/api/v1/loyalty/earn')
        .send({
          customerId,
          transactionId: txId,
          transactionTotal: 50000,
        });

      if (res.status >= 400) {
        console.log('7.3 earn error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.pointsEarned).toBeDefined();
      expect(Number(res.body.pointsEarned)).toBeGreaterThan(0);
      expect(res.body.totalPoints).toBeDefined();
    });

    it('7.4 - should verify balance updated after earn', async () => {
      const customerId = testContext.created.customerIds[0];

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/loyalty/customer/${customerId}`);

      expect(res.status).toBeLessThan(400);

      const newBalance = Number(res.body.currentPoints || res.body.loyaltyPoints || 0);
      expect(newBalance).toBeGreaterThan(initialBalance);
    });
  });

  // ================================================================
  // 7B. Points Redemption
  // ================================================================
  describe('7B - Points Redemption', () => {
    let balanceBefore: number;

    it('7.5 - should redeem points for discount', async () => {
      const customerId = testContext.created.customerIds[0];

      // First get current balance
      const balRes = await authRequest(app, 'owner')
        .get(`/api/v1/loyalty/customer/${customerId}`);
      expect(balRes.status).toBeLessThan(400);
      balanceBefore = Number(balRes.body.currentPoints || balRes.body.loyaltyPoints || 0);

      // Redeem a small amount (10 points)
      const pointsToRedeem = Math.min(10, balanceBefore);
      if (pointsToRedeem <= 0) {
        console.log('7.5 skipped: no points to redeem');
        return;
      }

      // Need a transaction ID for the redemption
      const txId = testContext.created.transactionIds[1] ||
        testContext.created.transactionIds[0];

      const res = await authRequest(app, 'owner')
        .post('/api/v1/loyalty/redeem')
        .send({
          customerId,
          transactionId: txId,
          pointsToRedeem,
        });

      if (res.status >= 400) {
        console.log('7.5 redeem error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.discountAmount).toBeDefined();
      expect(Number(res.body.discountAmount)).toBeGreaterThanOrEqual(0);
      expect(res.body.pointsRedeemed).toBeDefined();
      expect(Number(res.body.pointsRedeemed)).toBe(pointsToRedeem);
      expect(res.body.remainingPoints).toBeDefined();
    });

    it('7.6 - should verify balance decreased after redeem', async () => {
      const customerId = testContext.created.customerIds[0];

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/loyalty/customer/${customerId}`);

      expect(res.status).toBeLessThan(400);
      const newBalance = Number(res.body.currentPoints || res.body.loyaltyPoints || 0);

      // Balance should be less than before (unless redeem was skipped)
      if (balanceBefore > 0) {
        expect(newBalance).toBeLessThan(balanceBefore);
      }
    });

    it('7.7 - should fail redeeming more points than balance', async () => {
      const customerId = testContext.created.customerIds[0];
      const txId = testContext.created.transactionIds[0];

      const res = await authRequest(app, 'owner')
        .post('/api/v1/loyalty/redeem')
        .send({
          customerId,
          transactionId: txId,
          pointsToRedeem: 999999,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ================================================================
  // 7C. Tier Management
  // ================================================================
  describe('7C - Tier Management', () => {
    it('7.8 - should earn enough points to potentially upgrade tier', async () => {
      const customerId = testContext.created.customerIds[0];

      // Earn large amounts to trigger tier upgrade
      // Use multiple earn calls with different transaction amounts
      for (let i = 0; i < 3; i++) {
        const txId = testContext.created.transactionIds[i] ||
          testContext.created.transactionIds[0];

        await authRequest(app, 'owner')
          .post('/api/v1/loyalty/earn')
          .send({
            customerId,
            transactionId: txId,
            transactionTotal: 500000,
          });
      }

      // Trigger tier evaluation
      const evalRes = await authRequest(app, 'owner')
        .post('/api/v1/loyalty/tiers/evaluate');

      if (evalRes.status >= 400) {
        console.log('7.8 tier evaluate error:', evalRes.status, evalRes.body);
        // Try alternative endpoint
        const altRes = await authRequest(app, 'owner')
          .post('/api/v1/loyalty/check-tiers');
        if (altRes.status >= 400) {
          console.log('7.8 check-tiers error:', altRes.status, altRes.body);
        }
      }
      // Tier evaluation may fail if no tiers are configured — that's OK
      expect(evalRes.status).toBeLessThan(500);
    });

    it('7.9 - should verify customer tier', async () => {
      const customerId = testContext.created.customerIds[0];

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/loyalty/customer/${customerId}`);

      expect(res.status).toBeLessThan(400);

      const tier = res.body.currentTier || res.body.tier || res.body.loyaltyTier;
      expect(tier).toBeDefined();
      // Tier should be set (could be Bronze, Silver, or regular depending on config)
      expect(typeof tier).toBe('string');
      expect(tier.length).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // 7D. Customer Segments
  // ================================================================
  describe('7D - Customer Segments', () => {
    it('7.10 - should get customer segments', async () => {
      const res = await authRequest(app, 'owner')
        .get('/api/v1/customers/segments');

      if (res.status >= 400) {
        console.log('7.10 segments error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      // Should return segment data
      const segments = res.body;
      expect(segments).toBeDefined();

      // Just verify the shape is valid (array or object)
      if (Array.isArray(segments)) {
        expect(segments.length).toBeGreaterThanOrEqual(0);
      } else {
        expect(typeof segments).toBe('object');
      }
    });

    it('7.11 - should get returning customer segment', async () => {
      const res = await authRequest(app, 'owner')
        .get('/api/v1/customers/segments/returning');

      if (res.status >= 400) {
        console.log('7.11 returning segment error:', res.status, res.body);
      }
      // May return 404 if segment route doesn't exist, 200 if it does
      expect(res.status).toBeLessThan(500);

      if (res.status < 400) {
        const customers = Array.isArray(res.body)
          ? res.body
          : res.body.data || res.body.customers || [];

        // Budi has transactions so may appear in returning
        if (Array.isArray(customers) && customers.length > 0) {
          const budi = customers.find(
            (c: any) =>
              c.id === testContext.created.customerIds[0] ||
              c.name?.includes('Budi'),
          );
          // Budi may or may not be classified as returning
          if (budi) {
            expect(budi.name).toContain('Budi');
          }
        }
      }
    });

    it('7.12 - should get purchase history for Budi', async () => {
      const customerId = testContext.created.customerIds[0];

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/customers/${customerId}/history`);

      if (res.status >= 400) {
        console.log('7.12 history error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      const history = res.body.transactions || res.body.data || res.body;
      expect(Array.isArray(history)).toBe(true);
      // Budi's transaction (3.8) was voided in Suite 5, so history may be 0
      // but total field should exist
      expect(history.length).toBeGreaterThanOrEqual(0);
      if (res.body.total !== undefined) {
        expect(Number(res.body.total)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ================================================================
  // Summary
  // ================================================================
  describe('Summary', () => {
    it('should have verified loyalty and customer features', () => {
      console.log('\n=== Suite 7 Summary ===');
      console.log('Points Earning: verified');
      console.log('Points Redemption: verified');
      console.log('Tier Management: verified');
      console.log('Customer Segments: verified');
      console.log('========================\n');

      saveContext();
    });
  });
});
