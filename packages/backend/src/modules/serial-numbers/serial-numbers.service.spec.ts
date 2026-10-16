import { ConflictException, ForbiddenException } from '@nestjs/common';
import { SerialNumbersService } from './serial-numbers.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';

describe('SerialNumbersService', () => {
  let prisma: { serialNumber: Record<string, jest.Mock> };
  let tenant: { assertOutlet: jest.Mock; assertOwned: jest.Mock };
  let service: SerialNumbersService;

  beforeEach(() => {
    prisma = {
      serialNumber: {
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 's1', status: 'sold' }),
      },
    };
    tenant = {
      assertOutlet: jest.fn().mockResolvedValue('o1'),
      assertOwned: jest.fn().mockResolvedValue(undefined),
    };
    service = new SerialNumbersService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
    );
  });

  it('markSold only transitions from in_stock/returned', async () => {
    await service.markSold('s1', 'biz-a');
    expect(prisma.serialNumber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1', businessId: 'biz-a', status: { in: ['in_stock', 'returned'] } },
      }),
    );
  });

  it('rejects selling a serial that is already sold', async () => {
    prisma.serialNumber.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markSold('s1', 'biz-a')).rejects.toThrow(ConflictException);
  });

  it('rejects a foreign customer on sale before writing', async () => {
    tenant.assertOwned.mockImplementation(async (model: string, id: unknown) => {
      if (model === 'customer' && id) throw new ForbiddenException();
    });
    await expect(service.markSold('s1', 'biz-a', 'cust-b')).rejects.toThrow(ForbiddenException);
    expect(prisma.serialNumber.updateMany).not.toHaveBeenCalled();
  });

  it('rejects registering against a foreign product', async () => {
    tenant.assertOwned.mockRejectedValue(new ForbiddenException());
    await expect(
      service.register('biz-a', { productId: 'p-b', outletId: 'o1', serialNumber: 'SN1' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.serialNumber.create).not.toHaveBeenCalled();
  });
});
