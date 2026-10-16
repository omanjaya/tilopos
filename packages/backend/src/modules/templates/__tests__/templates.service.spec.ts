import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TemplatesService, type TemplateData } from '../templates.service';

describe('TemplatesService', () => {
  const service = new TemplatesService({} as PrismaService);

  it.each([
    '../../../../etc/passwd',
    '..%2f..%2fsecret',
    'FNB_CAFE',
    'fnb_cafe/../x',
    'unknown_type',
  ])('rejects non-whitelisted type code %s', async (code) => {
    await expect(service.getTemplate(code)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('loads a known template', async () => {
    const template = await service.getTemplate('fnb_cafe');
    expect(template.type).toBe('fnb_cafe');
  });

  describe('applyTemplateData', () => {
    const template: TemplateData = {
      type: 'fnb_cafe',
      label: 'Cafe',
      description: '',
      icon: '',
      categories: [{ name: 'Kopi', sortOrder: 1 }],
      products: [{ name: 'Latte', category: 'Kopi', price: 25000, unit: 'cup', type: 'product' }],
      modifierGroups: [],
      units: [],
      tables: [{ name: 'T1', capacity: 4 }],
      paymentMethods: [],
      taxRate: 11,
    };

    function makeTx(existing: boolean, outletOwned = true) {
      return {
        outlet: { findFirst: jest.fn().mockResolvedValue(outletOwned ? { id: 'o1' } : null) },
        category: {
          findMany: jest.fn().mockResolvedValue(existing ? [{ id: 'c1', name: 'Kopi' }] : []),
          createManyAndReturn: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Kopi' }]),
        },
        product: {
          findMany: jest.fn().mockResolvedValue(existing ? [{ id: 'p1', name: 'Latte' }] : []),
          createManyAndReturn: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Latte' }]),
        },
        outletProduct: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        table: {
          findMany: jest.fn().mockResolvedValue(existing ? [{ name: 'T1' }] : []),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
    }
    const all = { categories: true, products: true, modifiers: true, tables: true };

    it('refuses an outlet of another business', async () => {
      const tx = makeTx(false, false);
      await expect(
        service.applyTemplateData(tx as never, 'biz-a', 'o-b', template, all),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.outlet.findFirst).toHaveBeenCalledWith({
        where: { id: 'o-b', businessId: 'biz-a' },
        select: { id: true },
      });
      expect(tx.category.createManyAndReturn).not.toHaveBeenCalled();
    });

    it('creates rows on first apply', async () => {
      const tx = makeTx(false);
      const result = await service.applyTemplateData(tx as never, 'biz-a', 'o1', template, all);
      expect(result).toMatchObject({ categories: 1, products: 1, tables: 1 });
    });

    it('is idempotent: re-applying does not duplicate rows', async () => {
      const tx = makeTx(true);
      const result = await service.applyTemplateData(tx as never, 'biz-a', 'o1', template, all);
      expect(result).toMatchObject({ categories: 0, products: 0, tables: 0 });
      expect(tx.category.createManyAndReturn).not.toHaveBeenCalled();
      expect(tx.product.createManyAndReturn).not.toHaveBeenCalled();
      expect(tx.table.createMany).not.toHaveBeenCalled();
      // existing outlet availability is re-enabled instead
      expect(tx.outletProduct.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });
  });
});
