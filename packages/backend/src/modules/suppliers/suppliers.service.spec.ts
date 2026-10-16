import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '../../shared/tenant';
import type { DocumentNumberService } from '../../shared/numbering';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import type { UpdateSupplierDto } from '../../application/dtos/supplier.dto';

const user = { businessId: 'biz-1', employeeId: 'emp-1', role: 'manager' } as AuthUser;

function setup() {
  const tx = {
    purchaseOrder: {
      create: jest.fn().mockResolvedValue({ id: 'po-1' }),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
  };
  const prisma = {
    supplier: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({ id: 's-1', name: 'S' }),
    },
    productVariant: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const tenant = {
    assertOutlet: jest.fn().mockResolvedValue('out-1'),
    assertOwned: jest.fn().mockResolvedValue(undefined),
    resolveOutletIds: jest.fn(),
  };
  const numbers = { next: jest.fn().mockResolvedValue('PO-20260927-0001') };
  const service = new SuppliersService(
    prisma as unknown as PrismaService,
    tenant as unknown as TenantAccessService,
    numbers as unknown as DocumentNumberService,
  );
  return { service, prisma, tenant, numbers, tx };
}

const poDto = {
  outletId: 'out-1',
  supplierId: 'sup-1',
  items: [
    { itemName: 'Kopi', quantityOrdered: 3, unitCost: 0.1, productId: 'p-1' },
    { itemName: 'Gula', quantityOrdered: 3, unitCost: 0.2, ingredientId: 'ing-1' },
  ],
};

describe('SuppliersService.createPurchaseOrder', () => {
  it('rejects a supplier from another business before writing', async () => {
    const { service, tenant, prisma } = setup();
    tenant.assertOwned.mockImplementation(async (model: string) => {
      if (model === 'supplier') throw new ForbiddenException('not accessible');
    });
    await expect(service.createPurchaseOrder(user, poDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a product from another business before writing', async () => {
    const { service, tenant, prisma } = setup();
    tenant.assertOwned.mockImplementation(async (model: string) => {
      if (model === 'product') throw new ForbiddenException('not accessible');
    });
    await expect(service.createPurchaseOrder(user, poDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tenant.assertOwned).toHaveBeenCalledWith('product', ['p-1', undefined], 'biz-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a variant that is not in the caller business', async () => {
    const { service, prisma } = setup();
    prisma.productVariant.findMany.mockResolvedValue([]);
    await expect(
      service.createPurchaseOrder(user, {
        ...poDto,
        items: [{ itemName: 'X', quantityOrdered: 1, unitCost: 1, variantId: 'v-foreign' }],
      }),
    ).rejects.toThrow('variants are not accessible');
    expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['v-foreign'] }, product: { businessId: 'biz-1' } },
      }),
    );
  });

  it('computes Decimal totals and uses the per-tenant PO number in the tx', async () => {
    const { service, tx, numbers } = setup();
    await service.createPurchaseOrder(user, poDto);
    expect(numbers.next).toHaveBeenCalledWith(tx, 'biz-1', 'PO');
    const data = tx.purchaseOrder.create.mock.calls[0][0].data;
    expect(data.poNumber).toBe('PO-20260927-0001');
    // 0.3 + 0.6 rounded to 2dp per line = 0.3 + 0.6 = 0.9 exactly
    expect((data.totalAmount as Prisma.Decimal).toString()).toBe('0.9');
    expect(data.createdBy).toBe('emp-1');
  });
});

describe('SuppliersService.updateSupplier', () => {
  it('only passes whitelisted fields and scopes by businessId', async () => {
    const { service, prisma } = setup();
    const body = {
      name: 'New',
      businessId: 'biz-evil',
      id: 'other',
      isActive: false,
    } as unknown as UpdateSupplierDto;

    await service.updateSupplier('biz-1', 's-1', body);

    const call = prisma.supplier.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 's-1', businessId: 'biz-1' });
    expect(call.data).toEqual({ name: 'New' });
  });

  it('404s when the supplier is not in the caller business', async () => {
    const { service, prisma } = setup();
    prisma.supplier.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updateSupplier('biz-1', 's-x', { name: 'N' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('SuppliersService.approvePurchaseOrder', () => {
  it('uses a conditional draft->ordered update and 409s when already transitioned', async () => {
    const { service, tx } = setup();
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: 'po-1', status: 'ordered', notes: null });
    tx.purchaseOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.approvePurchaseOrder('biz-1', 'po-1', 'emp-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.purchaseOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'po-1', outlet: { businessId: 'biz-1' } } }),
    );
    expect(tx.purchaseOrder.updateMany.mock.calls[0][0].where).toEqual({
      id: 'po-1',
      status: { in: ['draft'] },
    });
  });
});
