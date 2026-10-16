import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HoldBillUseCase, HoldBillInput } from '../hold-bill.use-case';
import { HeldBillStore } from '@infrastructure/cache/held-bill.store';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { SalePricingService } from '@application/services/sale-pricing.service';
import type { TenantAccessService } from '@shared/tenant/tenant-access.service';

const decimal = (value: number) => new Prisma.Decimal(value);
describe('HoldBillUseCase', () => {
  const hold = jest.fn();
  const priceSale = jest.fn();
  const assertOwned = jest.fn();
  const findFirst = jest.fn();
  let useCase: HoldBillUseCase;
  const input: HoldBillInput = {
    businessId: 'b',
    outletId: 'o',
    employeeId: 'e',
    role: 'cashier',
    items: [{ productId: 'p', quantity: 2, modifierIds: ['m'] }],
    orderType: 'takeaway',
    customerId: 'c',
    discountPercent: 5,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    priceSale.mockResolvedValue({
      lines: [
        {
          productId: 'p',
          variantId: null,
          bundleId: null,
          productName: 'Coffee',
          variantName: null,
          quantity: 2,
          notes: null,
          unitPrice: decimal(15000),
          modifiers: [{ modifierId: 'm', modifierName: 'Milk', price: decimal(3000) }],
        },
      ],
      subtotal: decimal(30000),
      discountAmount: decimal(1500),
      priceOverrides: [],
    });
    useCase = new HoldBillUseCase(
      { hold } as unknown as HeldBillStore,
      { table: { findFirst } } as unknown as PrismaService,
      { priceSale } as unknown as SalePricingService,
      { assertOwned } as unknown as TenantAccessService,
    );
  });
  it('uses server pricing with the authenticated role, outlet and customer', async () => {
    await useCase.execute(input);
    expect(priceSale).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b',
        outletId: 'o',
        role: 'cashier',
        customerId: 'c',
        orderType: 'takeaway',
        applyCashRounding: false,
      }),
      input.items,
      [{ type: 'percentage', value: 5 }],
    );
    expect(hold.mock.calls[0][0]).toMatchObject({
      businessId: 'b',
      outletId: 'o',
      customerId: 'c',
      orderType: 'takeaway',
      discountPercent: 5,
      subtotal: 30000,
      discountTotal: 1500,
      items: [
        {
          productName: 'Coffee',
          unitPrice: 12000,
          modifiers: [{ id: 'm', name: 'Milk', price: 3000 }],
        },
      ],
    });
    expect(assertOwned).toHaveBeenCalledWith('customer', 'c', 'b');
    expect(assertOwned).toHaveBeenCalledWith('product', ['p'], 'b');
  });
  it('uses a stable client id and request fingerprint for retries', async () => {
    const request = { ...input, clientBillId: 'stable' };
    expect(await useCase.execute(request)).toEqual({ billId: 'stable' });
    await useCase.execute(request);
    expect(hold.mock.calls[0][0].requestHash).toBe(hold.mock.calls[1][0].requestHash);
  });
  it('rejects a foreign customer before holding anything', async () => {
    assertOwned.mockRejectedValue(new NotFoundException());
    await expect(useCase.execute(input)).rejects.toThrow();
    expect(hold).not.toHaveBeenCalled();
  });
  it('rejects a table from another outlet', async () => {
    findFirst.mockResolvedValue(null);
    await expect(useCase.execute({ ...input, tableId: 't' })).rejects.toThrow('Table not found');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't', outletId: 'o', outlet: { businessId: 'b' } } }),
    );
  });
  it('propagates pricing and storage errors', async () => {
    priceSale.mockRejectedValueOnce(new Error('invalid modifier'));
    await expect(useCase.execute(input)).rejects.toThrow('invalid modifier');
    hold.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(useCase.execute(input)).rejects.toThrow('Redis unavailable');
  });
});
