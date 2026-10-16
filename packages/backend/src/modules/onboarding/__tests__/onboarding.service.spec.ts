import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { BusinessTypeService } from '../../business/services/business-type.service';
import { OnboardingService } from '../onboarding.service';

describe('OnboardingService.guidedSetup', () => {
  function setup(settings: Record<string, unknown> = {}) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ settings }]),
      business: { update: jest.fn() },
      outlet: {
        findFirst: jest.fn().mockResolvedValue({ id: 'o1' }),
        updateMany: jest.fn(),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'emp-new' }),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
    const businessTypeService = { changeBusinessType: jest.fn() } as unknown as BusinessTypeService;
    return { service: new OnboardingService(prisma, businessTypeService), tx, businessTypeService };
  }

  it('stores the cashier PIN as a bcrypt hash, never plaintext', async () => {
    const { service, tx } = setup();
    await service.guidedSetup('biz-a', 'owner-1', 'o1', {
      employee: { name: 'Kasir', pin: '123456' },
    });
    const data = tx.employee.create.mock.calls[0][0].data;
    expect(data.pin).not.toBe('123456');
    expect(await bcrypt.compare('123456', data.pin)).toBe(true);
    expect(data.role).toBe('cashier');
  });

  it('cannot be re-run once completed', async () => {
    const { service, tx } = setup({ guidedSetupCompleted: true });
    await expect(
      service.guidedSetup('biz-a', 'owner-1', 'o1', { businessType: 'fnb_cafe' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.business.update).not.toHaveBeenCalled();
  });

  it('applies the business type/template once, inside the transaction', async () => {
    const { service, tx, businessTypeService } = setup();
    (businessTypeService.changeBusinessType as jest.Mock).mockResolvedValue({
      success: true,
      featuresEnabled: 4,
      templateApplied: true,
      templateData: { categories: 1, products: 2, modifierGroups: 0, modifiers: 0, tables: 0 },
    });
    const sections = { categories: true, products: true };
    const result = await service.guidedSetup('biz-a', 'owner-1', 'o1', {
      businessType: 'fnb_cafe',
      template: { sections },
    });
    expect(businessTypeService.changeBusinessType).toHaveBeenCalledTimes(1);
    expect(businessTypeService.changeBusinessType).toHaveBeenCalledWith(
      'biz-a',
      'fnb_cafe',
      'o1',
      tx,
      sections,
    );
    expect(result.template).toMatchObject({ applied: true, products: 2 });
  });
});
