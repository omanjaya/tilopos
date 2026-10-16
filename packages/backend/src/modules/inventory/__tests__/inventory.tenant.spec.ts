import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '../../../shared/tenant';
import type { DocumentNumberService } from '../../../shared/numbering';
import type { StorageService } from '../../../infrastructure/storage/storage.service';
import type { ExcelParserService } from '../../../infrastructure/import/excel-parser.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { BulkUpdateAction } from '../../../application/dtos/bulk-product.dto';
import { CreateProductUseCase } from '../../../application/use-cases/inventory/create-product.use-case';
import { ProductCatalogService } from '../product-catalog.service';
import { OutletProductService } from '../outlet-product.service';
import { InventoryService } from '../inventory.service';
import { csvCell } from '../../../infrastructure/import/csv.util';

/**
 * Tenant scoping (R3), cost-price exposure (R12) and CSV injection tests for the
 * inventory module. Every query is asserted to carry the caller's businessId.
 */
const BIZ_A = '11111111-1111-4111-8111-111111111111';
const PRODUCT_A = '22222222-2222-4222-8222-222222222222';
const FOREIGN_CATEGORY = '33333333-3333-4333-8333-333333333333';
const OUTLET_A = '44444444-4444-4444-8444-444444444444';
const PRODUCT_B = '55555555-5555-4555-8555-555555555555';

const owner: AuthUser = { businessId: BIZ_A, employeeId: 'emp-1', outletId: null, role: 'owner' };
const cashier: AuthUser = { ...owner, role: 'cashier', outletId: OUTLET_A };

function makePrisma() {
  const prisma = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    productVariant: { findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    costPriceHistory: { findMany: jest.fn().mockResolvedValue([]) },
    productModifierGroup: { findMany: jest.fn().mockResolvedValue([]) },
    outlet: { findMany: jest.fn().mockResolvedValue([{ id: OUTLET_A }]) },
    outletProduct: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $executeRaw: jest.fn().mockResolvedValue(0),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma));
  return prisma;
}

function makeTenant(ownedCategory = false) {
  return {
    assertOutlet: jest.fn().mockResolvedValue(OUTLET_A),
    assertOwned: jest.fn(async (model: string, ids: unknown) => {
      if (model === 'category' && ids === FOREIGN_CATEGORY && !ownedCategory) {
        throw new ForbiddenException('One or more category references are not accessible');
      }
      if (model === 'modifierGroup' && Array.isArray(ids) && ids.length > 0) {
        throw new ForbiddenException('One or more modifierGroup references are not accessible');
      }
    }),
  };
}

describe('Inventory tenant scoping', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let tenant: ReturnType<typeof makeTenant>;
  let outletProducts: OutletProductService;
  let catalog: ProductCatalogService;
  let inventory: InventoryService;

  beforeEach(() => {
    prisma = makePrisma();
    tenant = makeTenant();
    outletProducts = new OutletProductService(prisma as unknown as PrismaService);
    catalog = new ProductCatalogService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
      outletProducts,
      {} as ExcelParserService,
    );
    inventory = new InventoryService(
      prisma as unknown as PrismaService,
      {} as StorageService,
      tenant as unknown as TenantAccessService,
      {
        next: jest.fn().mockResolvedValue('TRF-20260927-0001'),
      } as unknown as DocumentNumberService,
      outletProducts,
    );
  });

  describe('ProductCatalogService', () => {
    it('reads a product only within the caller business', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(catalog.getProduct(owner, PRODUCT_B)).rejects.toThrow(NotFoundException);
      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PRODUCT_B, businessId: BIZ_A } }),
      );
    });

    it('rejects updating a product with a category of another business', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_A });

      await expect(
        catalog.updateProduct(owner, PRODUCT_A, { categoryId: FOREIGN_CATEGORY }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
    });

    it('scopes the product update by businessId and passes SKU/trackStock/null image', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_A, basePrice: 1, variants: [] });

      await catalog.updateProduct(owner, PRODUCT_A, {
        sku: 'SKU-1',
        trackStock: false,
        imageUrl: null,
      });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: PRODUCT_A, businessId: BIZ_A },
        data: { sku: 'SKU-1', trackStock: false, imageUrl: null },
      });
    });

    it('rejects a category parent from another business', async () => {
      await expect(
        catalog.createCategory(owner, { name: 'X', parentId: FOREIGN_CATEGORY }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('does not read cost history of a foreign product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(catalog.getCostHistory(owner, PRODUCT_B)).rejects.toThrow(NotFoundException);
      expect(prisma.costPriceHistory.findMany).not.toHaveBeenCalled();
    });

    it('hides cost prices from cashiers and serialises Decimals', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: PRODUCT_A,
          businessId: BIZ_A,
          basePrice: new Prisma.Decimal('15000.00'),
          costPrice: new Prisma.Decimal('9000.00'),
          variants: [
            { id: 'v1', price: new Prisma.Decimal('16000'), costPrice: new Prisma.Decimal('9500') },
          ],
        },
      ]);

      const rows = (await catalog.listProducts(cashier, {})) as Array<Record<string, unknown>>;
      expect(rows[0]).toMatchObject({ basePrice: 15000, costPrice: null });
      expect((rows[0].variants as Array<Record<string, unknown>>)[0]).toMatchObject({
        price: 16000,
        costPrice: null,
      });
      // cashier with an outlet only sees that outlet's products of their own business
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                businessId: BIZ_A,
                isActive: true,
                outletProducts: { some: { outletId: OUTLET_A, isActive: true } },
              },
              {},
            ],
          },
        }),
      );
    });

    it('lists inactive products only for catalogue managers', async () => {
      await catalog.listProducts(owner, { status: 'inactive' });
      expect(prisma.product.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { AND: [{ businessId: BIZ_A, isActive: false }, {}] },
        }),
      );

      await catalog.listProducts(owner, { status: 'all' });
      expect(prisma.product.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { AND: [{ businessId: BIZ_A }, {}] } }),
      );

      // a cashier asking for inactive products still only gets active ones
      await catalog.listProducts(cashier, { status: 'inactive' });
      expect(prisma.product.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                businessId: BIZ_A,
                isActive: true,
                outletProducts: { some: { outletId: OUTLET_A, isActive: true } },
              },
              {},
            ],
          },
        }),
      );
    });

    it('attaches active modifier groups of the caller business to each product', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: PRODUCT_A, businessId: BIZ_A, basePrice: new Prisma.Decimal('10000') },
        { id: PRODUCT_B, businessId: BIZ_A, basePrice: new Prisma.Decimal('12000') },
      ]);
      prisma.productModifierGroup.findMany.mockResolvedValue([
        {
          productId: PRODUCT_A,
          modifierGroup: {
            id: 'g1',
            name: 'Level pedas',
            selectionType: 'single',
            isRequired: true,
            minSelection: 1,
            maxSelection: 1,
            modifiers: [{ id: 'm1', name: 'Pedas', price: new Prisma.Decimal('2000.00') }],
          },
        },
      ]);

      const rows = (await catalog.listProducts(cashier, {})) as Array<Record<string, unknown>>;

      expect(prisma.productModifierGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId: { in: [PRODUCT_A, PRODUCT_B] },
            product: { businessId: BIZ_A },
            modifierGroup: { businessId: BIZ_A, isActive: true },
          },
        }),
      );
      expect(rows[0].modifierGroups).toEqual([
        {
          id: 'g1',
          name: 'Level pedas',
          selectionType: 'single',
          isRequired: true,
          minSelection: 1,
          maxSelection: 1,
          modifiers: [{ id: 'm1', name: 'Pedas', price: 2000 }],
        },
      ]);
      expect(rows[1].modifierGroups).toEqual([]);
    });

    it('returns a paginated envelope only when page/limit is requested', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(45);

      await expect(catalog.listProducts(owner, { page: 2, limit: 20 })).resolves.toEqual({
        data: [],
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  describe('OutletProductService', () => {
    it('serialises unassigned products and hides cost from roles without cost access', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: PRODUCT_A,
          basePrice: new Prisma.Decimal('15000.00'),
          costPrice: new Prisma.Decimal('9000.00'),
          variants: [],
        },
      ]);

      const asSupervisor = await outletProducts.getUnassignedProducts(
        OUTLET_A,
        BIZ_A,
        'supervisor',
      );
      expect(asSupervisor[0]).toMatchObject({ basePrice: 15000, costPrice: null });

      const asManager = await outletProducts.getUnassignedProducts(OUTLET_A, BIZ_A, 'manager');
      expect(asManager[0]).toMatchObject({ basePrice: 15000, costPrice: 9000 });
    });

    it('links only products of the caller business to the outlet', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: PRODUCT_A }]);

      const result = await outletProducts.bulkAssign(OUTLET_A, BIZ_A, [PRODUCT_A, PRODUCT_B]);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: [PRODUCT_A, PRODUCT_B] }, businessId: BIZ_A },
        select: { id: true },
      });
      expect(prisma.outletProduct.createMany).toHaveBeenCalledWith({
        data: [{ outletId: OUTLET_A, productId: PRODUCT_A, isActive: true }],
        skipDuplicates: true,
      });
      expect(result).toEqual({ assigned: 1, skipped: 1 });
    });
  });

  describe('InventoryService', () => {
    it('rejects a bulk category change to a foreign category', async () => {
      await expect(
        inventory.bulkUpdateProducts(BIZ_A, {
          productIds: [PRODUCT_A],
          action: BulkUpdateAction.CATEGORY,
          categoryId: FOREIGN_CATEGORY,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
    });

    it('rejects imported rows whose category belongs to another business', async () => {
      prisma.category.findMany.mockResolvedValue([]); // not owned

      const result = await inventory.importProducts(BIZ_A, [
        { name: 'Kopi', basePrice: 10000, categoryId: FOREIGN_CATEGORY },
      ]);

      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([
        { row: 1, field: 'categoryId', message: 'Category not found' },
      ]);
      expect(prisma.product.createMany).not.toHaveBeenCalled();
    });

    it('neutralises spreadsheet formulas in the product CSV export', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          name: '=HYPERLINK("http://evil")',
          sku: '+SKU',
          category: { name: '@cat' },
          basePrice: new Prisma.Decimal(1000),
          costPrice: null,
          description: '-1,2',
          isActive: true,
        },
      ]);

      const csv = await inventory.exportProductsCsv(BIZ_A);
      const line = csv.split('\n')[1];
      expect(line).toBe(`"'=HYPERLINK(""http://evil"")",'+SKU,'@cat,1000,,"'-1,2",true`);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BIZ_A } }),
      );
    });
  });

  describe('CreateProductUseCase', () => {
    it('rejects modifier groups of another business before writing anything', async () => {
      const useCase = new CreateProductUseCase(
        prisma as unknown as PrismaService,
        tenant as unknown as TenantAccessService,
      );

      await expect(
        useCase.execute({
          businessId: BIZ_A,
          name: 'Kopi',
          basePrice: 10000,
          trackStock: true,
          modifierGroupIds: ['66666666-6666-4666-8666-666666666666'],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  it('csvCell keeps plain negative numbers as data', () => {
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell('-5')).toBe("'-5");
  });
});
