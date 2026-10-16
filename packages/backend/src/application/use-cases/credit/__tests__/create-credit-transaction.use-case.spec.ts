import { Prisma } from '@prisma/client';
import { CreateCreditTransactionUseCase } from '../create-credit-transaction.use-case';
import type { PricedSale, SalePricingService } from '../../../services/sale-pricing.service';
import type { PromotionRulesEngine } from '../../../services/promotion-rules.engine';
import type { DocumentNumberService } from '@shared/numbering';
import type { EventBusService } from '@infrastructure/events/event-bus.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError } from '@shared/errors/business-error';
import { applyStockChanges } from '../../../services/sale-stock';

jest.mock('../../../services/sale-stock', () => ({
  applyStockChanges: jest.fn().mockResolvedValue([]),
}));

const D = (v: number) => new Prisma.Decimal(v);

function pricedSale(grandTotal: number): PricedSale {
  return {
    lines: [
      {
        productId: 'prod-1',
        variantId: null,
        bundleId: null,
        productName: 'Semen',
        variantName: null,
        unitPrice: D(grandTotal),
        quantity: 1,
        subtotal: D(grandTotal),
        notes: null,
        modifiers: [],
      },
    ],
    stockDeductions: [{ productId: 'prod-1', variantId: null, quantity: D(1), note: 'Sale' }],
    subtotal: D(grandTotal),
    discountAmount: D(0),
    discounts: [],
    serviceCharge: D(0),
    taxAmount: D(0),
    roundingAmount: D(0),
    grandTotal: D(grandTotal),
    priceOverrides: [],
  };
}

describe('CreateCreditTransactionUseCase', () => {
  let tx: {
    $queryRaw: jest.Mock;
    transaction: { create: jest.Mock };
    creditSale: { create: jest.Mock };
    customer: { findFirst: jest.Mock };
    voucher: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let prisma: Record<string, unknown>;
  let pricing: { priceSale: jest.Mock };
  let useCase: CreateCreditTransactionUseCase;

  const input = {
    businessId: 'biz-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    role: 'cashier',
    customerId: 'cust-1',
    shiftId: 'shift-1',
    orderType: 'takeaway' as const,
    // Client tries to sell at Rp1: must be ignored by server pricing.
    items: [{ productId: 'prod-1', quantity: 1, unitPrice: 1 }],
  };

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'cust-1' }]),
      transaction: { create: jest.fn().mockResolvedValue({}) },
      creditSale: { create: jest.fn().mockResolvedValue({}) },
      customer: {
        findFirst: jest.fn().mockResolvedValue({ creditLimit: D(100000), creditBalance: D(90000) }),
      },
      voucher: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma = {
      shift: { findFirst: jest.fn().mockResolvedValue({ id: 'shift-1' }) },
      customer: { findFirst: jest.fn().mockResolvedValue({ id: 'cust-1' }) },
      table: { count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    pricing = { priceSale: jest.fn().mockResolvedValue(pricedSale(50000)) };
    useCase = new CreateCreditTransactionUseCase(
      prisma as unknown as PrismaService,
      { publish: jest.fn() } as unknown as EventBusService,
      pricing as unknown as SalePricingService,
      { incrementUsageCount: jest.fn().mockResolvedValue(true) } as unknown as PromotionRulesEngine,
      {
        next: jest.fn().mockResolvedValue('TXN-20260927-0001'),
      } as unknown as DocumentNumberService,
    );
    (applyStockChanges as jest.Mock).mockClear();
  });

  it('persists server prices from SalePricingService, never the client unitPrice', async () => {
    const result = await useCase.execute(input);

    expect(pricing.priceSale).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz-1', applyCashRounding: false }),
      input.items,
      [],
    );
    const data = tx.transaction.create.mock.calls[0][0].data;
    expect(data.grandTotal.toNumber()).toBe(50000);
    expect(data.items.create[0].unitPrice.toNumber()).toBe(50000);
    expect(result.outstandingAmount).toBe(50000);
    expect(result.receiptNumber).toBe('TXN-20260927-0001');
    expect(applyStockChanges).toHaveBeenCalledWith(
      tx,
      expect.any(Array),
      expect.objectContaining({ direction: 'deduct', outletId: 'outlet-1' }),
    );
  });

  it('enforces the credit limit inside the transaction with a conditional update', async () => {
    // Another sale already consumed the limit: the guarded UPDATE matches no row.
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(useCase.execute(input)).rejects.toThrow(/Credit limit exceeded/);
    const sql = (tx.$queryRaw.mock.calls[0][0] as string[]).join('?');
    expect(sql).toContain('credit_balance +');
    expect(sql).toContain('<= credit_limit');
    expect(sql).toContain('business_id');
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.creditSale.create).not.toHaveBeenCalled();
  });

  it('rejects a shift that is not open at this outlet', async () => {
    (prisma.shift as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(BusinessError);
    expect((prisma.shift as { findFirst: jest.Mock }).findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shift-1', outletId: 'outlet-1', status: 'open' },
      }),
    );
  });

  it('rejects a customer from another business', async () => {
    (prisma.customer as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow('Customer not found');
    expect(pricing.priceSale).not.toHaveBeenCalled();
  });

  it('rejects credit notes as down payment and down payments above the total', async () => {
    await expect(
      useCase.execute({ ...input, payments: [{ method: 'credit_note', amount: 1000 }] }),
    ).rejects.toThrow(/Credit notes/);
    await expect(
      useCase.execute({ ...input, payments: [{ method: 'cash', amount: 60000 }] }),
    ).rejects.toThrow(/cannot exceed grand total/);
  });
});
