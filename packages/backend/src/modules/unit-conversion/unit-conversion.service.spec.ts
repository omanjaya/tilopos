import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UnitConversionService } from './unit-conversion.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';

describe('UnitConversionService (tenant scoping)', () => {
  const user = { businessId: 'biz-a' };
  let prisma: { unitConversion: Record<string, jest.Mock>; $transaction: jest.Mock };
  let tenant: { assertOutlet: jest.Mock; assertOwned: jest.Mock };
  let service: UnitConversionService;

  beforeEach(() => {
    prisma = {
      unitConversion: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    tenant = { assertOutlet: jest.fn(), assertOwned: jest.fn().mockResolvedValue(undefined) };
    service = new UnitConversionService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
    );
  });

  it('rejects a conversion for another tenant product', async () => {
    tenant.assertOwned.mockRejectedValue(new ForbiddenException());
    await expect(
      service.create(user, {
        productId: 'prod-b',
        fromUnit: 'box',
        fromUnitLabel: 'Box',
        toUnit: 'pcs',
        toUnitLabel: 'Pcs',
        conversionFactor: 12,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects convert/list for another tenant product', async () => {
    tenant.assertOwned.mockRejectedValue(new ForbiddenException());
    await expect(service.convert(user, 'prod-b', 1, 'box', 'pcs')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.listByProduct(user, 'prod-b')).rejects.toThrow(ForbiddenException);
  });

  it('update and delete are scoped through product.businessId', async () => {
    prisma.unitConversion.findFirst.mockResolvedValue(null);
    await expect(service.update(user, 'c1', { isDefault: true })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.unitConversion.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', product: { businessId: 'biz-a' } },
    });
    expect(prisma.unitConversion.updateMany).not.toHaveBeenCalled();

    await expect(service.delete(user, 'c1')).rejects.toThrow(NotFoundException);
    expect(prisma.unitConversion.deleteMany).toHaveBeenCalledWith({
      where: { id: 'c1', product: { businessId: 'biz-a' } },
    });
  });
});
