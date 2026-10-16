import { ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import 'reflect-metadata';
import { ROLES_KEY } from '../../../infrastructure/auth/roles.decorator';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { TemplatesService } from '../../templates/templates.service';
import { BusinessTypeService } from '../services/business-type.service';
import type { FeatureService } from '../services/feature.service';
import type { OutletFeatureService } from '../services/outlet-feature.service';
import { FeatureController } from '../controllers/feature.controller';
import { OutletFeatureController } from '../controllers/outlet-feature.controller';

describe('BusinessTypeService.changeBusinessType', () => {
  function setup(outletOwned: boolean) {
    const tx = {
      business: { findUnique: jest.fn().mockResolvedValue({ businessType: 'custom' }) },
      outlet: { findFirst: jest.fn().mockResolvedValue(outletOwned ? { id: 'o1' } : null) },
      outletProduct: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
      table: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      businessFeature: { count: jest.fn().mockResolvedValue(5) },
    };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
    const featureService = {
      initializeFeaturesForBusinessType: jest.fn(),
    } as unknown as FeatureService;
    const outletFeatureService = {
      initializeFeaturesForOutletType: jest.fn(),
    } as unknown as OutletFeatureService;
    const templatesService = {
      getTemplate: jest.fn().mockResolvedValue({ type: 'fnb_cafe' }),
      applyTemplateData: jest.fn().mockResolvedValue({
        categories: 1,
        products: 2,
        modifierGroups: 0,
        modifiers: 0,
        tables: 1,
      }),
    } as unknown as TemplatesService;
    const service = new BusinessTypeService(
      prisma,
      featureService,
      outletFeatureService,
      templatesService,
    );
    return { service, tx, featureService, templatesService };
  }

  it('rejects an outlet that belongs to another business before any write', async () => {
    const { service, tx, featureService } = setup(false);
    await expect(
      service.changeBusinessType('biz-a', 'fnb_cafe', 'outlet-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.outlet.findFirst).toHaveBeenCalledWith({
      where: { id: 'outlet-b', businessId: 'biz-a' },
      select: { id: true },
    });
    expect(tx.outletProduct.updateMany).not.toHaveBeenCalled();
    expect(featureService.initializeFeaturesForBusinessType).not.toHaveBeenCalled();
  });

  it('runs reset, features and template in the same transaction', async () => {
    const { service, tx, featureService, templatesService } = setup(true);
    const result = await service.changeBusinessType('biz-a', 'fnb_cafe', 'o1');
    expect(result.templateApplied).toBe(true);
    expect(featureService.initializeFeaturesForBusinessType).toHaveBeenCalledWith(
      'biz-a',
      'fnb_cafe',
      tx,
    );
    expect((templatesService.applyTemplateData as jest.Mock).mock.calls[0][0]).toBe(tx);
  });

  it('propagates template errors other than "not found"', async () => {
    const { service, templatesService } = setup(true);
    (templatesService.getTemplate as jest.Mock).mockRejectedValue(
      new InternalServerErrorException('disk error'),
    );
    await expect(service.changeBusinessType('biz-a', 'fnb_cafe', 'o1')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

describe('Business type/feature route roles', () => {
  it('PUT /business/type is owner only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, FeatureController.prototype.changeBusinessType)).toEqual([
      'owner',
    ]);
  });

  it('outlet type and feature changes are owner/manager', () => {
    for (const h of [
      OutletFeatureController.prototype.changeOutletType,
      OutletFeatureController.prototype.toggleFeature,
    ]) {
      expect(Reflect.getMetadata(ROLES_KEY, h)).toEqual(['owner', 'manager']);
    }
  });
});
