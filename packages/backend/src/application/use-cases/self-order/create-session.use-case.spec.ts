import { CreateSelfOrderSessionUseCase, SELF_ORDER_CODE_LENGTH } from './create-session.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('CreateSelfOrderSessionUseCase', () => {
  function makePrisma(table: unknown) {
    return {
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: 'outlet-1' }) },
      table: { findFirst: jest.fn().mockResolvedValue(table) },
      selfOrderSession: {
        create: jest.fn(async ({ data }) => ({ id: 'sess-1', ...data })),
      },
    };
  }

  it('rejects a tableId that does not belong to the outlet', async () => {
    const prisma = makePrisma(null);
    const useCase = new CreateSelfOrderSessionUseCase(prisma as unknown as PrismaService);

    await expect(
      useCase.execute({ outletId: 'outlet-1', tableId: 'table-of-other-tenant' }),
    ).rejects.toThrow('Table not found for this outlet');
    expect(prisma.table.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'table-of-other-tenant', outletId: 'outlet-1' }),
      }),
    );
    expect(prisma.selfOrderSession.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown or inactive outlet', async () => {
    const prisma = makePrisma(null);
    prisma.outlet.findFirst.mockResolvedValue(null);
    const useCase = new CreateSelfOrderSessionUseCase(prisma as unknown as PrismaService);

    await expect(useCase.execute({ outletId: 'nope' })).rejects.toThrow('Outlet not found');
    expect(prisma.selfOrderSession.create).not.toHaveBeenCalled();
  });

  it('issues an unguessable session code', async () => {
    const prisma = makePrisma({ id: 'table-1' });
    const useCase = new CreateSelfOrderSessionUseCase(prisma as unknown as PrismaService);

    const a = await useCase.execute({ outletId: 'outlet-1', tableId: 'table-1' });
    const b = await useCase.execute({ outletId: 'outlet-1', tableId: 'table-1' });
    expect(a.sessionCode).toHaveLength(SELF_ORDER_CODE_LENGTH);
    expect(a.sessionCode).toMatch(/^[A-Z2-9]+$/);
    expect(a.sessionCode).not.toBe(b.sessionCode);
  });
});
