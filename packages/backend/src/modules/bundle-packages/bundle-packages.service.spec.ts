import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BundlePackagesService } from './bundle-packages.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';

describe('BundlePackagesService (tenant scoping)', () => {
  let prisma: { productVariant: { findMany: jest.Mock }; $transaction: jest.Mock };
  let tenant: { assertOutlet: jest.Mock; assertOwned: jest.Mock };
  let service: BundlePackagesService;
  const base = { name: 'Combo', price: 10000 };

  beforeEach(() => {
    prisma = { productVariant: { findMany: jest.fn() }, $transaction: jest.fn() };
    tenant = { assertOutlet: jest.fn(), assertOwned: jest.fn().mockResolvedValue(undefined) };
    service = new BundlePackagesService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
    );
  });

  it('rejects items with another tenant product', async () => {
    tenant.assertOwned.mockRejectedValue(new ForbiddenException());
    await expect(
      service.create('biz-a', { ...base, items: [{ productId: 'p-b', quantity: 1 }] }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a variant that belongs to a different product', async () => {
    prisma.productVariant.findMany.mockResolvedValue([{ id: 'v1', productId: 'p-other' }]);
    await expect(
      service.create('biz-a', {
        ...base,
        items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('verifies outletIds belong to the business', async () => {
    tenant.assertOwned.mockImplementation(async (model: string, ids: unknown) => {
      if (model === 'outlet' && ids) throw new ForbiddenException();
    });
    await expect(
      service.create('biz-a', {
        ...base,
        items: [{ productId: 'p1', quantity: 1 }],
        outletIds: ['o-b'],
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
