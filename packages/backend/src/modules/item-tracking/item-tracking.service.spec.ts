import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ItemTrackingService } from './item-tracking.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';
import type { DocumentNumberService } from '@shared/numbering';

describe('ItemTrackingService', () => {
  let prisma: { serviceItem: Record<string, jest.Mock>; $transaction: jest.Mock };
  let tenant: { assertOutlet: jest.Mock; assertOwned: jest.Mock };
  let numbers: { next: jest.Mock };
  let service: ItemTrackingService;

  const dto = {
    outletId: 'o1',
    customerId: 'cust-b',
    itemName: 'Shirt',
    serviceName: 'Wash',
    servicePrice: 10000,
  };

  beforeEach(() => {
    prisma = {
      serviceItem: {
        create: jest.fn().mockResolvedValue({ id: 'i1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    tenant = {
      assertOutlet: jest.fn().mockResolvedValue('o1'),
      assertOwned: jest.fn().mockResolvedValue(undefined),
    };
    numbers = { next: jest.fn().mockResolvedValue('TK-20260927-0001') };
    service = new ItemTrackingService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
      numbers as unknown as DocumentNumberService,
    );
  });

  it('rejects a foreign customer before creating the ticket', async () => {
    tenant.assertOwned.mockRejectedValue(new ForbiddenException());
    await expect(service.receive('biz-a', dto)).rejects.toThrow(ForbiddenException);
    expect(prisma.serviceItem.create).not.toHaveBeenCalled();
  });

  it('numbers tickets with the atomic per-business sequence in the same transaction', async () => {
    await service.receive('biz-a', dto);
    expect(numbers.next).toHaveBeenCalledWith(prisma, 'biz-a', 'TK');
    expect(prisma.serviceItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ticketNumber: 'TK-20260927-0001', businessId: 'biz-a' }),
      }),
    );
  });

  it('scopes status changes and deletes by business', async () => {
    await expect(service.updateStatus('i-b', 'biz-a', 'ready')).rejects.toThrow(NotFoundException);
    expect(prisma.serviceItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i-b', businessId: 'biz-a' } }),
    );
    await expect(service.delete('i-b', 'biz-a')).rejects.toThrow(NotFoundException);
  });
});
