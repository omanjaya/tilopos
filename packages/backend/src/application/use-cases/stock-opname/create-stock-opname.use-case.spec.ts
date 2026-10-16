import { CreateStockOpnameUseCase, OPNAME_NUMBER_PREFIX } from './create-stock-opname.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { DocumentNumberService } from '@shared/numbering';

describe('CreateStockOpnameUseCase', () => {
  it('numbers per tenant with the OPN prefix inside the creation transaction', async () => {
    const tx = {
      stockLevel: { findMany: jest.fn().mockResolvedValue([]) },
      stockOpname: {
        create: jest.fn().mockResolvedValue({ id: 'op-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'op-1' }),
      },
      stockOpnameItem: { createMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)) };
    const numbers = { next: jest.fn().mockResolvedValue('OPN-20260927-0001') };
    const useCase = new CreateStockOpnameUseCase(
      prisma as unknown as PrismaService,
      numbers as unknown as DocumentNumberService,
    );

    await useCase.execute({ businessId: 'biz-1', outletId: 'outlet-1', employeeId: 'emp-1' });

    expect(OPNAME_NUMBER_PREFIX).toBe('OPN');
    expect(numbers.next).toHaveBeenCalledWith(tx, 'biz-1', 'OPN');
    expect(tx.stockOpname.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ opnameNumber: 'OPN-20260927-0001' }),
    });
    expect(tx.stockLevel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          outlet: { businessId: 'biz-1' },
          product: { businessId: 'biz-1', trackStock: true },
        }),
      }),
    );
  });
});
