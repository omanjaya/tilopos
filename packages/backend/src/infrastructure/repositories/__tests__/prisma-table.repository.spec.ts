import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { PrismaTableRepository } from '../prisma-table.repository';
import { AppError } from '../../../shared/errors/app-error';

const BIZ = 'biz-1';

function setup() {
  const prisma = {
    table: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  return { prisma, repo: new PrismaTableRepository(prisma as unknown as PrismaService) };
}

describe('PrismaTableRepository tenant scoping', () => {
  it('findById only matches tables of an outlet of the business', async () => {
    const { prisma, repo } = setup();
    prisma.table.findFirst.mockResolvedValue(null);
    await expect(repo.findById('t1', BIZ)).resolves.toBeNull();
    expect(prisma.table.findFirst).toHaveBeenCalledWith({
      where: { id: 't1', outlet: { businessId: BIZ } },
    });
  });

  it('update/delete/updateStatus 404 for a table of another business', async () => {
    const { prisma, repo } = setup();
    prisma.table.updateMany.mockResolvedValue({ count: 0 });

    await expect(repo.update('t1', { name: 'A1' }, BIZ)).rejects.toBeInstanceOf(NotFoundException);
    await expect(repo.delete('t1', BIZ)).rejects.toBeInstanceOf(NotFoundException);
    await expect(repo.updateStatus('t1', 'occupied', undefined, BIZ)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    for (const call of prisma.table.updateMany.mock.calls) {
      expect(call[0].where).toEqual({ id: 't1', outlet: { businessId: BIZ } });
    }
  });

  it('maps the active-name unique index to a 409 DUPLICATE_TABLE', async () => {
    const { prisma, repo } = setup();
    prisma.table.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    const error = await repo.create({ outletId: 'o1', name: 'A1' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).getStatus()).toBe(409);
  });
});
