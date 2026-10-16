import { Prisma } from '@prisma/client';
import { CalculateDynamicPriceUseCase } from '../calculate-dynamic-price.use-case';
import { PricingCalculatorService } from '../../../../domain/services/pricing-calculator.service';
import type { IPricingRuleRepository } from '../../../repositories/pricing-rule.repository';
import type { PrismaService } from '../../../../infrastructure/database/prisma.service';

describe('CalculateDynamicPriceUseCase', () => {
  const repo = {
    findActiveForProduct: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
  } as unknown as IPricingRuleRepository;
  const prisma = {
    product: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'p1', basePrice: new Prisma.Decimal(25000), categoryId: 'c1' }]),
    },
    productVariant: { findMany: jest.fn().mockResolvedValue([]) },
    stockLevel: { findMany: jest.fn().mockResolvedValue([]) },
    customer: { findFirst: jest.fn().mockResolvedValue({ loyaltyTier: 'gold' }) },
  };
  const useCase = new CalculateDynamicPriceUseCase(
    repo,
    new PricingCalculatorService(),
    prisma as unknown as PrismaService,
  );

  it('uses the DB price and category scoped to the business', async () => {
    const result = await useCase.execute({ businessId: 'biz-1', productId: 'p1', quantity: 2 });
    expect(result.originalPrice.amount).toBe(25000);
    expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ['p1'] },
      businessId: 'biz-1',
    });
    expect(repo.findActiveForProduct).toHaveBeenCalledWith('biz-1', 'p1', 'c1');
  });

  it('rejects products of another business', async () => {
    prisma.product.findMany.mockResolvedValueOnce([]);
    await expect(
      useCase.execute({ businessId: 'biz-1', productId: 'foreign', quantity: 1 }),
    ).rejects.toThrow(/not found/);
  });

  it('returns one batch result per input line (duplicates do not collapse)', async () => {
    const results = await useCase.executeBatch({
      businessId: 'biz-1',
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p1', quantity: 3 },
      ],
    });
    expect(results.map((r) => r.index)).toEqual([0, 1]);
  });
});
