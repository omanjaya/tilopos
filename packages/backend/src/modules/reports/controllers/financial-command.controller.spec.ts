import { Prisma } from '@prisma/client';
import { FinancialCommandController } from './financial-command.controller';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { RedisService } from '../../../infrastructure/cache/redis.service';
import type { TenantAccessService } from '@shared/tenant';
import type { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';

const D = (v: number) => new Prisma.Decimal(v);
const user = { employeeId: 'e1', businessId: 'biz', outletId: null, role: 'owner' };

function setup() {
  const prisma = {
    transaction: {
      aggregate: jest.fn(async ({ where }: { where: { transactionType: string } }) =>
        where.transactionType === 'sale'
          ? // subtotal 1,000,000 ; discount 100,000 ; tax 99,000 (grand 999,000)
            { _sum: { subtotal: D(1_000_000), discountAmount: D(100_000), taxAmount: D(99_000) } }
          : { _sum: { subtotal: D(-50_000) } },
      ),
    },
    purchaseOrder: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: D(700_000) } }),
    },
  };
  const queries = {
    cogs: jest.fn().mockResolvedValue(400_000),
    salesByDay: jest.fn().mockResolvedValue([]),
    cogsByDay: jest.fn().mockResolvedValue(new Map()),
    refundsByDay: jest.fn().mockResolvedValue(new Map()),
  };
  const tenant = { resolveOutletIds: jest.fn().mockResolvedValue(['o1']) };
  const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
  const controller = new FinancialCommandController(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
    tenant as unknown as TenantAccessService,
    queries as unknown as AnalyticsQueriesService,
  );
  return { controller, tenant };
}

describe('FinancialCommandController.getRevenueExpense (F1027)', () => {
  it('subtracts discount once, excludes tax, and uses COGS (not purchases) as expense', async () => {
    const { controller } = setup();
    const r = (await controller.getRevenueExpense(user, { dateRange: 'this_month' })) as {
      totalRevenue: number;
      totalExpenses: number;
      netProfit: number;
      breakdown: { purchases: number };
    };
    // 1,000,000 - 100,000 discount - 50,000 refunds
    expect(r.totalRevenue).toBe(850_000);
    // COGS only; the 700,000 of received POs is informational
    expect(r.totalExpenses).toBe(400_000);
    expect(r.netProfit).toBe(450_000);
    expect(r.breakdown.purchases).toBe(700_000);
  });

  it('resolves the outlet filter through TenantAccessService', async () => {
    const { controller, tenant } = setup();
    await controller.getRevenueExpense(user, { outletId: 'o1' });
    expect(tenant.resolveOutletIds).toHaveBeenCalledWith(user, 'o1');
  });
});
