import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { OutletSettingsRepository } from './outlet-settings.repository';
import { ModifierGroupRepository } from './modifier-group.repository';
import { LoyaltySettingsRepository } from './loyalty-settings.repository';
import { TaxConfigurationRepository } from './tax-configuration.repository';
import { ReceiptTemplateRepository } from './receipt-template.repository';
import { OperatingHoursRepository } from './operating-hours.repository';
import { PaymentMethodRepository } from './payment-method.repository';
import { PrinterConfigRepository } from './printer-config.repository';
import { BusinessSettingsRepository } from './business-settings.repository';

const BIZ = '11111111-1111-1111-1111-111111111111';
const OTHER_OUTLET = '22222222-2222-2222-2222-222222222222';

function createPrisma() {
  const tx = {
    $queryRaw: jest.fn(),
    business: { update: jest.fn() },
    outlet: { update: jest.fn() },
    modifierGroup: { findFirst: jest.fn(), updateMany: jest.fn() },
    modifier: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    business: { findUnique: jest.fn(), update: jest.fn() },
    outlet: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    modifierGroup: { updateMany: jest.fn(), findFirst: jest.fn() },
    loyaltyTier: { updateMany: jest.fn(), findFirst: jest.fn() },
  };
  return { prisma, tx, asService: prisma as unknown as PrismaService };
}

/** Joins a Prisma.sql tagged template back into text for assertions. */
function sqlText(call: unknown[]): string {
  const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];
  return strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''), '');
}

describe('settings repositories: tenant scoping', () => {
  it('updateOutlet scopes by businessId and 404s for a foreign outlet', async () => {
    const { prisma, asService } = createPrisma();
    prisma.outlet.updateMany.mockResolvedValue({ count: 0 });
    const repo = new OutletSettingsRepository(asService);

    await expect(repo.updateOutlet(BIZ, OTHER_OUTLET, { taxRate: 0 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.outlet.updateMany).toHaveBeenCalledWith({
      where: { id: OTHER_OUTLET, businessId: BIZ },
      data: { taxRate: 0 },
    });
  });

  it('deleteOutlet scopes by businessId', async () => {
    const { prisma, asService } = createPrisma();
    prisma.outlet.updateMany.mockResolvedValue({ count: 0 });
    const repo = new OutletSettingsRepository(asService);

    await expect(repo.deleteOutlet(BIZ, OTHER_OUTLET)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.outlet.updateMany.mock.calls[0][0].where).toEqual({
      id: OTHER_OUTLET,
      businessId: BIZ,
    });
  });

  it('findOutletById only finds outlets of the business', async () => {
    const { prisma, asService } = createPrisma();
    prisma.outlet.findFirst.mockResolvedValue(null);
    const repo = new OutletSettingsRepository(asService);

    await expect(repo.findOutletById(BIZ, OTHER_OUTLET)).resolves.toBeNull();
    expect(prisma.outlet.findFirst).toHaveBeenCalledWith({
      where: { id: OTHER_OUTLET, businessId: BIZ },
    });
  });

  it('createOutlet maps a duplicate code to 409', async () => {
    const { prisma, asService } = createPrisma();
    prisma.outlet.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    const repo = new OutletSettingsRepository(asService);

    await expect(
      repo.createOutlet({ businessId: BIZ, name: 'A', code: 'X' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('modifier group update/delete are scoped by businessId', async () => {
    const { prisma, tx, asService } = createPrisma();
    tx.modifierGroup.findFirst.mockResolvedValue(null);
    prisma.modifierGroup.updateMany.mockResolvedValue({ count: 0 });
    const repo = new ModifierGroupRepository(asService);

    await expect(repo.updateModifierGroup(BIZ, 'g1', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.modifierGroup.findFirst.mock.calls[0][0].where).toEqual({
      id: 'g1',
      businessId: BIZ,
    });
    expect(tx.modifierGroup.updateMany).not.toHaveBeenCalled();
    await expect(repo.deleteModifierGroup(BIZ, 'g1')).rejects.toBeInstanceOf(NotFoundException);
    for (const call of prisma.modifierGroup.updateMany.mock.calls) {
      expect(call[0].where).toEqual({ id: 'g1', businessId: BIZ });
    }
  });

  it('modifier group update reconciles modifiers in one transaction', async () => {
    const { tx, asService } = createPrisma();
    tx.modifierGroup.findFirst
      .mockResolvedValueOnce({ minSelection: 0, maxSelection: null })
      .mockResolvedValueOnce({ id: 'g1', modifiers: [] });
    tx.modifier.findMany.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
    const repo = new ModifierGroupRepository(asService);

    await repo.updateModifierGroup(BIZ, 'g1', {
      isRequired: true,
      modifiers: [
        { id: 'm1', name: 'Less sugar', price: 0 },
        { name: 'Extra shot', price: 5000 },
      ],
    });

    expect(tx.modifier.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { name: 'Less sugar', price: 0, sortOrder: 0, isActive: true },
    });
    expect(tx.modifier.create).toHaveBeenCalledWith({
      data: { modifierGroupId: 'g1', name: 'Extra shot', price: 5000, sortOrder: 1 },
    });
    // m2 was left out: deactivated, never hard-deleted (sold lines reference it)
    expect(tx.modifier.updateMany).toHaveBeenCalledWith({
      where: { modifierGroupId: 'g1', isActive: true, id: { notIn: ['m1'] } },
      data: { isActive: false },
    });
  });

  it('modifier group update rejects a modifier id of another group and min > max', async () => {
    const { tx, asService } = createPrisma();
    tx.modifierGroup.findFirst.mockResolvedValue({ minSelection: 0, maxSelection: 2 });
    tx.modifier.findMany.mockResolvedValue([{ id: 'm1' }]);
    const repo = new ModifierGroupRepository(asService);

    await expect(
      repo.updateModifierGroup(BIZ, 'g1', { modifiers: [{ id: 'foreign', name: 'x', price: 0 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(repo.updateModifierGroup(BIZ, 'g1', { minSelection: 3 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('loyalty tier update/delete are scoped by businessId', async () => {
    const { prisma, asService } = createPrisma();
    prisma.loyaltyTier.updateMany.mockResolvedValue({ count: 0 });
    const repo = new LoyaltySettingsRepository(asService);

    await expect(repo.updateLoyaltyTier(BIZ, 't1', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(repo.deleteLoyaltyTier(BIZ, 't1')).rejects.toBeInstanceOf(NotFoundException);
    for (const call of prisma.loyaltyTier.updateMany.mock.calls) {
      expect(call[0].where).toEqual({ id: 't1', businessId: BIZ });
    }
  });

  it('outlet tax/receipt/hours reads 404 for an outlet of another business (no defaults)', async () => {
    const { prisma, asService } = createPrisma();
    prisma.outlet.findFirst.mockResolvedValue(null);

    await expect(
      new TaxConfigurationRepository(asService).getTaxConfig(BIZ, OTHER_OUTLET),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      new ReceiptTemplateRepository(asService).getReceiptTemplate(BIZ, OTHER_OUTLET),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      new OperatingHoursRepository(asService).getOperatingHours(BIZ, OTHER_OUTLET),
    ).rejects.toBeInstanceOf(NotFoundException);
    for (const call of prisma.outlet.findFirst.mock.calls) {
      expect(call[0].where).toEqual({ id: OTHER_OUTLET, businessId: BIZ });
    }
  });

  it('outlet tax update locks the outlet row scoped to the business and 404s when not owned', async () => {
    const { tx, asService } = createPrisma();
    tx.$queryRaw.mockResolvedValue([]);

    await expect(
      new TaxConfigurationRepository(asService).updateTaxConfig(BIZ, OTHER_OUTLET, { taxRate: 0 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const sql = sqlText(tx.$queryRaw.mock.calls[0]);
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain(`business_id = ${BIZ}`);
    expect(tx.outlet.update).not.toHaveBeenCalled();
  });
});

describe('settings repositories: locked JSON read-modify-write', () => {
  it('payment method create merges into the locked settings, preserving other keys', async () => {
    const { prisma, tx, asService } = createPrisma();
    tx.$queryRaw.mockResolvedValue([
      { settings: { printerConfigs: [{ id: 'p1' }], businessPaymentMethods: [] } },
    ]);
    const repo = new PaymentMethodRepository(asService);

    const created = await repo.createBusinessPaymentMethod(BIZ, { name: 'EDC', type: 'card' });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(sqlText(tx.$queryRaw.mock.calls[0])).toContain('FOR UPDATE');
    const saved = tx.business.update.mock.calls[0][0].data.settings;
    expect(saved.printerConfigs).toEqual([{ id: 'p1' }]);
    expect(saved.businessPaymentMethods).toEqual([created]);
  });

  it('listing payment methods never writes', async () => {
    const { prisma, tx, asService } = createPrisma();
    prisma.business.findUnique.mockResolvedValue({ settings: {} });

    const methods = await new PaymentMethodRepository(asService).getBusinessPaymentMethods(BIZ);

    expect(methods.length).toBeGreaterThan(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.business.update).not.toHaveBeenCalled();
  });

  it('printer create keeps unrelated settings keys', async () => {
    const { tx, asService } = createPrisma();
    tx.$queryRaw.mockResolvedValue([{ settings: { taxConfig: { taxRate: 11 } } }]);

    await new PrinterConfigRepository(asService).createPrinterConfig(BIZ, {
      name: 'Kasir',
      type: 'receipt',
      connection: 'usb',
      outletId: OTHER_OUTLET,
    });

    const saved = tx.business.update.mock.calls[0][0].data.settings;
    expect(saved.taxConfig).toEqual({ taxRate: 11 });
    expect(saved.printerConfigs).toHaveLength(1);
  });

  it('business settings patch merges only the given keys', async () => {
    const { prisma, tx, asService } = createPrisma();
    tx.$queryRaw.mockResolvedValue([{ settings: { paymentMethods: ['cash'] } }]);
    prisma.business.findUnique.mockResolvedValue({ id: BIZ });

    await new BusinessSettingsRepository(asService).updateBusiness(BIZ, {
      settings: { brandColor: '#112233' },
    });

    expect(tx.business.update.mock.calls[0][0].data.settings).toEqual({
      paymentMethods: ['cash'],
      brandColor: '#112233',
    });
  });
});
