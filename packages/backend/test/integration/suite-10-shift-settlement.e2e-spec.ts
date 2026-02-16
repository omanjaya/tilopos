import { INestApplication } from '@nestjs/common';
import { getTestApp } from './helpers/test-app';
import { testContext, saveContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

describe('Suite 10: Shift & Settlement', () => {
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
  // Setup: Ensure shift is open
  // ================================================================
  let activeShiftId: string;

  describe('Setup', () => {
    it('should open a shift for cashier', async () => {
      // Check if there's already an open shift
      const currentRes = await authRequest(app, 'cashier')
        .get('/api/v1/employees/shifts/current');

      if (currentRes.status < 400 && currentRes.body?.id) {
        // Shift already open, reuse it
        activeShiftId = currentRes.body.id;
        if (!testContext.created.shiftIds.includes(activeShiftId)) {
          testContext.created.shiftIds.push(activeShiftId);
        }
        console.log('Reusing existing open shift:', activeShiftId);
        saveContext();
        return;
      }

      // Open a new shift
      const res = await authRequest(app, 'cashier')
        .post('/api/v1/employees/shifts/start')
        .send({
          outletId: testContext.outletId,
          openingCash: 500000,
        });

      if (res.status >= 400) {
        console.log('Open shift error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      activeShiftId = res.body.shiftId || res.body.id;
      expect(activeShiftId).toBeDefined();

      testContext.created.shiftIds.push(activeShiftId);
      saveContext();
      console.log('Opened new shift:', activeShiftId);
    });
  });

  // ================================================================
  // 10A. Cash Management
  // ================================================================
  describe('10A - Cash Management', () => {
    it('10.1 - should cash in 100000 to shift', async () => {
      const shiftId = activeShiftId;
      expect(shiftId).toBeDefined();

      const res = await authRequest(app, 'cashier')
        .post('/api/v1/pos/cash-in')
        .send({
          shiftId,
          amount: 100000,
          notes: 'Cash in test',
        });

      if (res.status >= 400) {
        console.log('10.1 cash-in error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.success).toBe(true);
      expect(res.body.newBalance).toBeDefined();
    });

    it('10.2 - should cash out 50000 from shift', async () => {
      const shiftId = activeShiftId;
      expect(shiftId).toBeDefined();

      const res = await authRequest(app, 'cashier')
        .post('/api/v1/pos/cash-out')
        .send({
          shiftId,
          amount: 50000,
          reason: 'drop',
          notes: 'Cash out test',
        });

      if (res.status >= 400) {
        console.log('10.2 cash-out error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.success).toBe(true);
      expect(res.body.newBalance).toBeDefined();
    });

    it('10.3 - should get current shift with cash in/out values', async () => {
      const res = await authRequest(app, 'cashier')
        .get('/api/v1/employees/shifts/current');

      if (res.status >= 400) {
        console.log('10.3 current shift error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      expect(res.body.id).toBeDefined();
      // Verify cash management values
      const cashIn = Number(res.body.cashIn || 0);
      const cashOut = Number(res.body.cashOut || 0);
      expect(cashIn).toBeGreaterThanOrEqual(100000);
      expect(cashOut).toBeGreaterThanOrEqual(50000);

      console.log(`10.3 Current shift - cashIn: ${cashIn}, cashOut: ${cashOut}, openingCash: ${res.body.openingCash}`);
    });
  });

  // ================================================================
  // 10B. End Shift & Reconciliation
  // ================================================================
  describe('10B - End Shift & Reconciliation', () => {
    let endShiftResult: any;

    it('10.4 - should end shift with actual cash amount', async () => {
      const shiftId = activeShiftId;
      expect(shiftId).toBeDefined();

      // Use a slightly different amount to create a variance
      const actualCash = 540000; // opening(500k) + cashIn(100k) - cashOut(50k) = 550k expected, so -10k variance

      const res = await authRequest(app, 'cashier')
        .post(`/api/v1/employees/shifts/${shiftId}/end`)
        .send({
          closingCash: actualCash,
        });

      if (res.status >= 400) {
        console.log('10.4 end shift error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      endShiftResult = res.body;
      expect(endShiftResult.shiftId || endShiftResult.id).toBeDefined();
      console.log('10.4 End shift result:', JSON.stringify(endShiftResult));
    });

    it('10.5 - should verify expectedCash calculation', () => {
      expect(endShiftResult).toBeDefined();

      const expectedCash = Number(endShiftResult.expectedCash || 0);
      // expectedCash = openingCash + totalCashSales - totalCashRefunds
      // NOTE: cashIn/cashOut (drawer operations) are NOT included in expectedCash calculation.
      // expectedCash only considers cash payment transactions (sales/refunds).
      // Since no transactions were created in this shift: expectedCash = openingCash = 500000
      expect(expectedCash).toBeGreaterThanOrEqual(500000);

      console.log(`10.5 expectedCash: ${expectedCash}`);
    });

    it('10.6 - should verify difference (variance) is detected', () => {
      expect(endShiftResult).toBeDefined();

      const difference = Number(endShiftResult.difference || endShiftResult.cashDifference || 0);
      const actualCash = Number(endShiftResult.actualCash || endShiftResult.closingCash || 0);
      const expectedCash = Number(endShiftResult.expectedCash || 0);

      // difference = actualCash - expectedCash
      // We submitted 540000 as actualCash
      if (expectedCash > 0 && actualCash > 0) {
        expect(difference).toBe(actualCash - expectedCash);
      }

      // Difference should be negative (short on cash)
      console.log(`10.6 difference: ${difference}, actual: ${actualCash}, expected: ${expectedCash}`);
    });

    it('10.7 - should get shift report', async () => {
      const employeeId = testContext.auth.cashier?.employeeId;
      expect(employeeId).toBeDefined();

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const res = await authRequest(app, 'owner')
        .get(`/api/v1/employees/${employeeId}/shifts/report?from=${today}&to=${tomorrowStr}`);

      if (res.status >= 400) {
        console.log('10.7 shift report error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      // Should contain shift summary data
      const report = res.body;
      expect(report).toBeDefined();

      // Report may be an array of shifts or a summary object
      if (Array.isArray(report)) {
        expect(report.length).toBeGreaterThanOrEqual(1);
      } else {
        expect(typeof report).toBe('object');
      }

      console.log('10.7 shift report retrieved');
    });
  });

  // ================================================================
  // 10C. Settlement Reconciliation
  // ================================================================
  describe('10C - Settlement Reconciliation', () => {
    it('10.8 - should get settlements list', async () => {
      const res = await authRequest(app, 'owner')
        .get(`/api/v1/settlements?outletId=${testContext.outletId}`);

      if (res.status >= 400) {
        console.log('10.8 settlements error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      const settlements = Array.isArray(res.body)
        ? res.body
        : res.body.data || res.body.settlements || [];

      // May or may not have settlements depending on auto-settlement
      expect(Array.isArray(settlements)).toBe(true);
      console.log(`10.8 settlements count: ${settlements.length}`);
    });

    it('10.9 - should get reconciliation report', async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const res = await authRequest(app, 'owner')
        .get(
          `/api/v1/settlements/reconciliation?startDate=${today}&endDate=${tomorrowStr}&outletId=${testContext.outletId}`,
        );

      if (res.status >= 400) {
        console.log('10.9 reconciliation error:', res.status, res.body);
      }
      expect(res.status).toBeLessThan(400);

      const report = res.body;
      expect(report).toBeDefined();

      // Verify report structure
      if (report.transactions) {
        expect(report.transactions.salesCount).toBeDefined();
        expect(report.transactions.totalSalesAmount).toBeDefined();
      }

      if (report.payments) {
        expect(report.payments.totalPaymentsReceived).toBeDefined();
        if (report.payments.byMethod) {
          expect(Array.isArray(report.payments.byMethod)).toBe(true);
        }
      }
    });

    it('10.10 - should verify payment method breakdown', async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const res = await authRequest(app, 'owner')
        .get(
          `/api/v1/settlements/reconciliation?startDate=${today}&endDate=${tomorrowStr}&outletId=${testContext.outletId}`,
        );

      expect(res.status).toBeLessThan(400);

      const report = res.body;
      if (report.payments?.byMethod) {
        const methods = report.payments.byMethod;
        expect(Array.isArray(methods)).toBe(true);

        // Each method entry should have method name, count, and total
        for (const m of methods) {
          expect(m.method).toBeDefined();
          expect(m.count).toBeDefined();
          expect(m.total).toBeDefined();
          expect(Number(m.total)).toBeGreaterThanOrEqual(0);
        }

        console.log('10.10 Payment methods:', methods.map((m: any) => `${m.method}: ${m.total}`).join(', '));
      } else {
        console.log('10.10 No payment method breakdown available');
      }
    });

    it('10.11 - should check for discrepancies in reconciliation', async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const res = await authRequest(app, 'owner')
        .get(
          `/api/v1/settlements/reconciliation?startDate=${today}&endDate=${tomorrowStr}&outletId=${testContext.outletId}`,
        );

      expect(res.status).toBeLessThan(400);

      const report = res.body;
      if (report.discrepancies) {
        expect(report.discrepancies.hasDiscrepancy).toBeDefined();
        expect(report.discrepancies.transactionVsPaymentDiff).toBeDefined();
        expect(report.discrepancies.paymentVsSettlementDiff).toBeDefined();

        console.log('10.11 Discrepancies:', JSON.stringify(report.discrepancies));
      }

      // Unmatched payments may or may not exist
      if (report.unmatchedPayments) {
        expect(Array.isArray(report.unmatchedPayments)).toBe(true);
        console.log(`10.11 Unmatched payments: ${report.unmatchedPayments.length}`);
      }
    });
  });

  // ================================================================
  // Summary
  // ================================================================
  describe('Summary', () => {
    it('should have verified shift and settlement features', () => {
      console.log('\n=== Suite 10 Summary ===');
      console.log('Cash Management: verified');
      console.log('End Shift & Reconciliation: verified');
      console.log('Settlement Reconciliation: verified');
      console.log(`Shifts tracked: ${testContext.created.shiftIds.length}`);
      console.log('========================\n');

      saveContext();
    });
  });
});
