import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { PrismaPromotionRepository } from '../../infrastructure/repositories/prisma-promotion.repository';
import { UpdatePromotionDto } from '../../application/dtos/promotion.dto';
import { PromotionsService } from './promotions.service';

const BIZ = 'biz-a';
const PROMO_ID = '11111111-1111-4111-8111-111111111111';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: PROMO_ID,
  businessId: BIZ,
  name: 'Promo',
  description: null,
  discountType: 'percentage',
  discountValue: new Prisma.Decimal(10),
  minPurchase: null,
  maxDiscount: null,
  validFrom: new Date('2026-01-01T00:00:00Z'),
  validUntil: new Date('2026-12-31T00:00:00Z'),
  usageLimit: null,
  usedCount: 3,
  applicableTo: {},
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function build() {
  const prisma = {
    promotion: {
      findFirst: jest.fn().mockResolvedValue(row()),
      findFirstOrThrow: jest.fn().mockResolvedValue(row()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve(row({ ...data, discountValue: new Prisma.Decimal(data.discountValue) })),
        ),
    },
  };
  const tenant = { assertOwned: jest.fn().mockResolvedValue(undefined) };
  const repo = new PrismaPromotionRepository(prisma as unknown as PrismaService);
  const service = new PromotionsService(
    prisma as unknown as PrismaService,
    repo,
    tenant as unknown as TenantAccessService,
  );
  return { prisma, repo, service, tenant };
}

describe('PromotionsService.update', () => {
  it('ignores businessId / usedCount / isActive smuggled into the body', async () => {
    const { prisma, service } = build();

    await service.update(BIZ, PROMO_ID, {
      name: 'Renamed',
      businessId: 'other-tenant',
      usedCount: 0,
      isActive: true,
    } as unknown as UpdatePromotionDto);

    const call = prisma.promotion.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: PROMO_ID, businessId: BIZ });
    expect(call.data).toEqual({ name: 'Renamed' });
  });

  it('UpdatePromotionDto rejects businessId and usedCount', () => {
    const dto = plainToInstance(UpdatePromotionDto, { businessId: 'x', usedCount: 0 });
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((e) => e.property).sort()).toEqual(['businessId', 'usedCount']);
  });

  it('a promotion of another business is a 404', async () => {
    const { prisma, service } = build();
    prisma.promotion.findFirst.mockResolvedValue(null);
    await expect(service.update(BIZ, PROMO_ID, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.promotion.updateMany).not.toHaveBeenCalled();
  });

  it('rejects percentage > 100 and inverted periods', async () => {
    const { service } = build();
    await expect(service.update(BIZ, PROMO_ID, { discountValue: 150 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.update(BIZ, PROMO_ID, { validUntil: '2025-01-01T00:00:00Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PromotionsService.create', () => {
  it('persists applicableTo and verifies its ids belong to the business', async () => {
    const { prisma, service, tenant } = build();
    const productId = '22222222-2222-4222-8222-222222222222';

    await service.create(BIZ, {
      name: 'Only coffee',
      discountType: 'fixed',
      discountValue: 5000,
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2026-02-01T00:00:00Z',
      applicableTo: { productIds: [productId] },
    });

    expect(tenant.assertOwned).toHaveBeenCalledWith('product', [productId], BIZ);
    expect(prisma.promotion.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ businessId: BIZ, applicableTo: { productIds: [productId] } }),
    );
  });
});
