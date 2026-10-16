import { Prisma } from '@prisma/client';
import { PrismaCreditSaleRepository } from '../prisma-credit-sale.repository';
import type { PrismaService } from '../../database/prisma.service';

describe('PrismaCreditSaleRepository', () => {
  const groupBy = jest.fn();
  const customerFindMany = jest.fn();
  const findFirst = jest.fn();
  const prisma = {
    creditSale: { groupBy, findFirst },
    customer: { findMany: customerFindMany },
  } as unknown as PrismaService;
  const repo = new PrismaCreditSaleRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('getCustomerOutstanding is scoped by businessId, includes overdue and drops foreign customers', async () => {
    groupBy.mockResolvedValue([
      {
        customerId: 'mine',
        _sum: { outstandingAmount: new Prisma.Decimal('150000.50') },
        _count: { id: 2 },
        _min: { createdAt: new Date('2026-09-01') },
      },
      {
        customerId: 'foreign',
        _sum: { outstandingAmount: new Prisma.Decimal(1) },
        _count: { id: 1 },
        _min: { createdAt: null },
      },
    ]);
    customerFindMany.mockResolvedValue([{ id: 'mine', name: 'Budi' }]);

    const result = await repo.getCustomerOutstanding('biz-1', ['outlet-1']);

    const where = groupBy.mock.calls[0][0].where;
    expect(where.outlet).toEqual({ businessId: 'biz-1' });
    expect(where.customer).toEqual({ businessId: 'biz-1' });
    expect(where.outletId).toEqual({ in: ['outlet-1'] });
    expect(where.status.in).toContain('overdue');
    expect(customerFindMany.mock.calls[0][0].where.businessId).toBe('biz-1');
    expect(result).toEqual([
      expect.objectContaining({
        customerId: 'mine',
        customerName: 'Budi',
        totalOutstanding: 150000.5,
      }),
    ]);
  });

  it('findById always filters by the owning business', async () => {
    findFirst.mockResolvedValue(null);
    await expect(repo.findById('cs-1', 'biz-1')).resolves.toBeNull();
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: 'cs-1',
      outlet: { businessId: 'biz-1' },
    });
  });
});
