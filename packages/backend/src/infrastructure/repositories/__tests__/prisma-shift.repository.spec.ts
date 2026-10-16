import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaShiftRepository } from '../prisma-shift.repository';
import type { PrismaService } from '../../database/prisma.service';

const BUSINESS = 'biz-1';

function shiftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    startedAt: new Date(),
    endedAt: null,
    openingCash: new Prisma.Decimal(100000),
    closingCash: null,
    expectedCash: null,
    cashDifference: null,
    cashIn: new Prisma.Decimal(0),
    cashOut: new Prisma.Decimal(0),
    notes: null,
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function build() {
  const prisma = {
    shift: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };
  return { prisma, repo: new PrismaShiftRepository(prisma as unknown as PrismaService) };
}

describe('PrismaShiftRepository', () => {
  it('scopes findById by the outlet business', async () => {
    const { prisma, repo } = build();
    prisma.shift.findFirst.mockResolvedValue(null);

    await expect(repo.findById('shift-1', BUSINESS)).resolves.toBeNull();
    expect(prisma.shift.findFirst).toHaveBeenCalledWith({
      where: { id: 'shift-1', outlet: { businessId: BUSINESS } },
    });
  });

  it('closes only an open shift of the tenant (conditional update)', async () => {
    const { prisma, repo } = build();
    prisma.shift.updateMany.mockResolvedValue({ count: 1 });
    prisma.shift.findFirst.mockResolvedValue(shiftRow({ status: 'closed' }));

    const record = await repo.close('shift-1', BUSINESS, {
      closingCash: 0.1 + 0.2,
      expectedCash: 100000,
      cashDifference: -99999.7,
      endedAt: new Date(),
    });

    expect(record.status).toBe('closed');
    const call = prisma.shift.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'shift-1', outlet: { businessId: BUSINESS }, status: 'open' });
    expect(call.data.closingCash.toString()).toBe('0.3');
  });

  it('refuses to close an already closed shift instead of overwriting it', async () => {
    const { prisma, repo } = build();
    prisma.shift.updateMany.mockResolvedValue({ count: 0 });
    prisma.shift.findFirst.mockResolvedValue(shiftRow({ status: 'closed' }));

    await expect(
      repo.close('shift-1', BUSINESS, {
        closingCash: 1,
        expectedCash: 1,
        cashDifference: 0,
        endedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns NotFound for another tenant shift', async () => {
    const { prisma, repo } = build();
    prisma.shift.updateMany.mockResolvedValue({ count: 0 });
    prisma.shift.count.mockResolvedValue(0);

    await expect(repo.addCashIn('shift-x', BUSINESS, 5000)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects cash movements on a closed shift', async () => {
    const { prisma, repo } = build();
    prisma.shift.updateMany.mockResolvedValue({ count: 0 });
    prisma.shift.count.mockResolvedValue(1);

    await expect(repo.addCashOut('shift-1', BUSINESS, 5000)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
