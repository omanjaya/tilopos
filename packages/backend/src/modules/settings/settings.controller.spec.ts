import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../../infrastructure/auth/roles.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import type { SettingsRepository } from '../../infrastructure/repositories/settings/settings.repository';
import type { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { SettingsController } from './settings.controller';

const owner: AuthUser = { employeeId: 'e1', businessId: 'b1', outletId: null, role: 'owner' };
const manager: AuthUser = { employeeId: 'e2', businessId: 'b1', outletId: 'o1', role: 'manager' };

function setup() {
  const repo = {
    updateBusiness: jest.fn().mockResolvedValue({}),
    createPrinterConfig: jest.fn().mockResolvedValue({}),
    updateTaxConfig: jest.fn().mockResolvedValue({}),
    getBusinessPaymentMethods: jest.fn().mockResolvedValue([]),
    getOutletReceiptTemplate: jest.fn().mockResolvedValue({ header: 'H' }),
  };
  const tenant = {
    assertOutlet: jest.fn().mockRejectedValue(new ForbiddenException()),
  };
  const controller = new SettingsController(
    repo as unknown as SettingsRepository,
    tenant as unknown as TenantAccessService,
  );
  return { repo, tenant, controller };
}

describe('SettingsController', () => {
  it('PUT business applies only whitelisted settings keys', async () => {
    const { repo, controller } = setup();
    await controller.updateBusiness(owner, {
      name: 'Toko',
      settings: { brandColor: '#aabbcc', paymentMethods: ['hacked'], guidedSetupCompleted: false },
    });
    expect(repo.updateBusiness).toHaveBeenCalledWith('b1', {
      name: 'Toko',
      phone: undefined,
      email: undefined,
      address: undefined,
      settings: { brandColor: '#aabbcc' },
    });
  });

  it('PUT business rejects an invalid brand color', async () => {
    const { controller } = setup();
    await expect(
      controller.updateBusiness(owner, { settings: { brandColor: 'javascript:alert(1)' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('business profile and outlet create/delete are owner-only', () => {
    const proto = SettingsController.prototype;
    for (const handler of [proto.updateBusiness, proto.createOutlet, proto.deleteOutlet]) {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['owner']);
    }
  });

  it('printer config verifies the outlet belongs to the business', async () => {
    const { repo, tenant, controller } = setup();
    await expect(
      controller.createPrinterConfig(owner, {
        name: 'P',
        type: 'receipt',
        connection: 'usb',
        outletId: 'foreign',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tenant.assertOutlet).toHaveBeenCalledWith(owner, 'foreign');
    expect(repo.createPrinterConfig).not.toHaveBeenCalled();
  });

  it('manager cannot edit tax of another outlet', async () => {
    const { repo, controller } = setup();
    await expect(controller.updateTaxConfig(manager, 'o2', { taxRate: 0 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.updateTaxConfig).not.toHaveBeenCalled();
  });

  describe('POS read-only views', () => {
    const cashier: AuthUser = {
      employeeId: 'e3',
      businessId: 'b1',
      outletId: 'o1',
      role: 'cashier',
    };

    it('are readable by every POS role but not by kitchen/inventory', () => {
      const proto = SettingsController.prototype;
      for (const handler of [proto.getPosPaymentMethods, proto.getPosReceiptTemplate]) {
        const roles = Reflect.getMetadata(ROLES_KEY, handler) as string[];
        expect(roles).toEqual(
          expect.arrayContaining(['owner', 'manager', 'supervisor', 'cashier']),
        );
        expect(roles).not.toContain('kitchen');
        expect(roles).not.toContain('inventory');
      }
    });

    it('returns only active methods, without settings, with the transaction method value', async () => {
      const { repo, controller } = setup();
      repo.getBusinessPaymentMethods.mockResolvedValue([
        { id: 'c', name: 'Tunai', type: 'cash', isActive: true, processingFee: 0, settings: {} },
        {
          id: 'g',
          name: 'Go-Pay',
          type: 'ewallet',
          isActive: true,
          processingFee: 2,
          settings: { apiKey: 'x' },
        },
        {
          id: 'w',
          name: 'Dompet X',
          type: 'ewallet',
          isActive: true,
          processingFee: 0,
          settings: {},
        },
        {
          id: 'b',
          name: 'Transfer',
          type: 'bank_transfer',
          isActive: false,
          processingFee: 0,
          settings: {},
        },
      ]);

      const result = await controller.getPosPaymentMethods(cashier);

      expect(repo.getBusinessPaymentMethods).toHaveBeenCalledWith('b1');
      expect(result).toEqual([
        { id: 'c', name: 'Tunai', type: 'cash', processingFee: 0, method: 'cash' },
        { id: 'g', name: 'Go-Pay', type: 'ewallet', processingFee: 2, method: 'gopay' },
        { id: 'w', name: 'Dompet X', type: 'ewallet', processingFee: 0, method: null },
      ]);
    });

    it('receipt template defaults to the cashier outlet and verifies a requested outlet', async () => {
      const { repo, tenant, controller } = setup();
      await expect(controller.getPosReceiptTemplate(cashier, {})).resolves.toEqual({ header: 'H' });
      expect(repo.getOutletReceiptTemplate).toHaveBeenCalledWith('b1', 'o1');

      await expect(
        controller.getPosReceiptTemplate(cashier, { outletId: 'other' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tenant.assertOutlet).toHaveBeenCalledWith(cashier, 'other');
    });
  });
});
