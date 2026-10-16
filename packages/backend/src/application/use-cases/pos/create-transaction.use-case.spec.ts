import { Prisma } from '@prisma/client';
import {
  CreateTransactionUseCase,
  type CreateTransactionInput,
  MAX_OFFLINE_AGE_MS,
} from './create-transaction.use-case';
import type { EventBusService } from '@infrastructure/events/event-bus.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { SalePricingService, PricedSale } from '../../services/sale-pricing.service';
import type { PromotionRulesEngine } from '../../services/promotion-rules.engine';
import type { DocumentNumberService } from '@shared/numbering';
import type { TenantAccessService } from '@shared/tenant';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { BusinessError } from '@shared/errors/business-error';

const D = (v: number) => new Prisma.Decimal(v);

function pricedSale(over: Partial<PricedSale> = {}): PricedSale {
  return {
    lines: [
      {
        productId: 'prod-1',
        variantId: null,
        bundleId: null,
        productName: 'Nasi Goreng',
        variantName: null,
        unitPrice: D(25000),
        quantity: 2,
        subtotal: D(50000),
        notes: null,
        modifiers: [],
      },
    ],
    stockDeductions: [{ productId: 'prod-1', variantId: null, quantity: D(2), note: 'Sale' }],
    subtotal: D(50000),
    discountAmount: D(0),
    discounts: [],
    serviceCharge: D(0),
    taxAmount: D(5500),
    roundingAmount: D(0),
    grandTotal: D(55500),
    priceOverrides: [],
    ...over,
  };
}

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let prisma: {
    shift: { findFirst: jest.Mock };
    table: { count: jest.Mock };
    transaction: { findFirst: jest.Mock };
    customer: { findFirst: jest.Mock };
    loyaltyProgram: { findFirst: jest.Mock };
    loyaltyTier: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    transaction: { create: jest.Mock };
    voucher: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
    stockMovement: { createMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let pricing: { priceSale: jest.Mock };
  let promotionRules: { incrementUsageCount: jest.Mock };
  let eventBus: { publish: jest.Mock };
  let documentNumbers: { next: jest.Mock };
  let tenant: { assertOwned: jest.Mock };

  const input = (over: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
    businessId: 'biz-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    role: 'cashier',
    shiftId: 'shift-1',
    orderType: 'dine_in',
    items: [{ productId: 'prod-1', quantity: 2, unitPrice: 1 }],
    payments: [{ method: 'cash', amount: 100000 }],
    ...over,
  });

  beforeEach(() => {
    tx = {
      transaction: {
        create: jest.fn().mockResolvedValue({ id: 'txn-1', receiptNumber: 'TXN-20260927-0001' }),
      },
      voucher: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn() },
      stockMovement: { createMany: jest.fn() },
      // atomic conditional decrement returns the new level
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'sl-1', quantity: D(48) }]),
    };
    prisma = {
      shift: {
        findFirst: jest.fn().mockResolvedValue({ status: 'open', employeeId: 'emp-1' }),
      },
      table: { count: jest.fn().mockResolvedValue(1) },
      transaction: { findFirst: jest.fn().mockResolvedValue(null) },
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      loyaltyProgram: { findFirst: jest.fn().mockResolvedValue(null) },
      loyaltyTier: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    pricing = { priceSale: jest.fn().mockResolvedValue(pricedSale()) };
    promotionRules = { incrementUsageCount: jest.fn().mockResolvedValue(true) };
    eventBus = { publish: jest.fn() };
    documentNumbers = { next: jest.fn().mockResolvedValue('TXN-20260927-0001') };
    tenant = { assertOwned: jest.fn().mockResolvedValue(undefined) };

    useCase = new CreateTransactionUseCase(
      eventBus as unknown as EventBusService,
      prisma as unknown as PrismaService,
      pricing as unknown as SalePricingService,
      promotionRules as unknown as PromotionRulesEngine,
      documentNumbers as unknown as DocumentNumberService,
      tenant as unknown as TenantAccessService,
    );
  });

  it('persists the server-priced totals, not client prices', async () => {
    const result = await useCase.execute(input());

    expect(pricing.priceSale).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz-1', role: 'cashier', applyCashRounding: true }),
      [{ productId: 'prod-1', quantity: 2, unitPrice: 1 }],
      [],
    );
    const data = tx.transaction.create.mock.calls[0][0].data;
    expect(data.grandTotal).toEqual(D(55500));
    expect(data.items.create[0].unitPrice).toEqual(D(25000));
    expect(data.receiptNumber).toBe('TXN-20260927-0001');
    expect(result).toMatchObject({ transactionId: 'txn-1', grandTotal: 55500, change: 44500 });
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(TransactionCreatedEvent));
  });

  it('rejects a shift of another outlet / business', async () => {
    prisma.shift.findFirst.mockResolvedValue(null);
    await expect(useCase.execute(input())).rejects.toThrow('Shift is not open');
    expect(prisma.shift.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shift-1', outletId: 'outlet-1', outlet: { businessId: 'biz-1' } },
      }),
    );
  });

  it("rejects a cashier selling on a colleague's shift", async () => {
    prisma.shift.findFirst.mockResolvedValue({ status: 'open', employeeId: 'emp-2' });
    await expect(useCase.execute(input())).rejects.toThrow('Shift belongs to another employee');
  });

  it('verifies the customer belongs to the business', async () => {
    tenant.assertOwned.mockRejectedValue(
      new Error('One or more customer references are not accessible'),
    );
    await expect(useCase.execute(input({ customerId: 'cust-x' }))).rejects.toThrow(/customer/);
    expect(tenant.assertOwned).toHaveBeenCalledWith('customer', 'cust-x', 'biz-1');
  });

  it('rejects credit_note payments honestly', async () => {
    await expect(
      useCase.execute(input({ payments: [{ method: 'credit_note', amount: 60000 }] })),
    ).rejects.toThrow('Credit note payments are not supported');
  });

  it('rejects payments below the server grand total', async () => {
    await expect(
      useCase.execute(input({ payments: [{ method: 'cash', amount: 50000 }] })),
    ).rejects.toBeInstanceOf(BusinessError);
  });

  it('never gives change on non-cash overpayment', async () => {
    await expect(
      useCase.execute(input({ payments: [{ method: 'qris', amount: 60000 }] })),
    ).rejects.toThrow(/change is only given in cash/);
  });

  it('consumes a voucher once and fails the sale if it was already redeemed', async () => {
    pricing.priceSale.mockResolvedValue(
      pricedSale({
        discounts: [{ source: 'voucher', voucherId: 'v-1', promotionId: 'p-1', amount: D(5000) }],
        discountAmount: D(5000),
      }),
    );
    tx.voucher.updateMany.mockResolvedValue({ count: 0 });
    await expect(useCase.execute(input())).rejects.toThrow('Voucher already used');
    expect(tx.voucher.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v-1', businessId: 'biz-1', usedAt: null, isActive: true },
      }),
    );
  });

  it('fails when the promotion quota is exhausted', async () => {
    pricing.priceSale.mockResolvedValue(
      pricedSale({
        discounts: [{ source: 'promotion', voucherId: null, promotionId: 'p-1', amount: D(1) }],
      }),
    );
    promotionRules.incrementUsageCount.mockResolvedValue(false);
    await expect(useCase.execute(input())).rejects.toThrow('Promotion usage limit reached');
  });

  it('audit-logs price overrides', async () => {
    pricing.priceSale.mockResolvedValue(
      pricedSale({
        priceOverrides: [
          {
            productId: 'prod-1',
            bundleId: null,
            variantId: null,
            serverPrice: 25000,
            overridePrice: 20000,
          },
        ],
      }),
    );
    await useCase.execute(input({ role: 'supervisor' }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'price_override' }) }),
    );
  });

  describe('idempotent clientTransactionId', () => {
    const clientTransactionId = '6f2b7c9e-0d1a-4c1e-9d7b-1f2e3a4b5c6d';

    it('returns the existing sale instead of creating a duplicate', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'txn-old',
        receiptNumber: 'TXN-OLD',
        grandTotal: D(55500),
        payments: [{ amount: D(60000) }],
      });
      const result = await useCase.execute(input({ clientTransactionId }));
      expect(result).toMatchObject({ transactionId: 'txn-old', duplicate: true, change: 4500 });
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { outletId: 'outlet-1', clientTransactionId } }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('stores the key and resolves a P2002 race to the winning sale', async () => {
      prisma.transaction.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'txn-winner',
        receiptNumber: 'TXN-W',
        grandTotal: D(55500),
        payments: [{ amount: D(55500) }],
      });
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      const result = await useCase.execute(input({ clientTransactionId }));
      expect(result.transactionId).toBe('txn-winner');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('persists clientTransactionId and occurredAt on a new sale', async () => {
      const occurredAt = new Date(Date.now() - 60_000);
      await useCase.execute(input({ clientTransactionId, occurredAt }));
      const data = tx.transaction.create.mock.calls[0][0].data;
      expect(data.clientTransactionId).toBe(clientTransactionId);
      expect(data.createdAt).toEqual(occurredAt);
    });

    it('rejects occurredAt in the future or older than 7 days', async () => {
      await expect(
        useCase.execute(input({ occurredAt: new Date(Date.now() + 60 * 60 * 1000) })),
      ).rejects.toThrow('occurredAt cannot be in the future');
      await expect(
        useCase.execute(input({ occurredAt: new Date(Date.now() - MAX_OFFLINE_AGE_MS - 1000) })),
      ).rejects.toThrow('older than 7 days');
    });
  });
});
