import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StockTransfersService } from './stock-transfers.service';
import { RequestTransferUseCase } from '../../application/use-cases/stock-transfers/request-transfer.use-case';
import { TenantAccessService } from '../../shared/tenant';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { EventBusService } from '../../infrastructure/events/event-bus.service';
import type { DocumentNumberService } from '../../shared/numbering';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';

const BIZ = '11111111-1111-1111-1111-111111111111';
const OUTLET_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OUTLET_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const FOREIGN_OUTLET = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const PRODUCT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const FOREIGN_PRODUCT = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const TRANSFER = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const user: AuthUser = { businessId: BIZ, employeeId: 'emp-1', outletId: null, role: 'manager' };

/** Prisma mock whose `count` answers ownership checks from in-memory tenant data. */
function buildPrisma() {
  const ownedOutlets = new Set([OUTLET_A, OUTLET_B]);
  const ownedProducts = new Set([PRODUCT]);
  const countOwned = (owned: Set<string>) =>
    jest.fn(async ({ where }: { where: { id: { in: string[] }; businessId: string } }) =>
      where.businessId === BIZ ? where.id.in.filter((id) => owned.has(id)).length : 0,
    );

  const prisma = {
    outlet: { count: countOwned(ownedOutlets) },
    product: { count: countOwned(ownedProducts) },
    ingredient: { count: jest.fn(async () => 0) },
    productVariant: { findMany: jest.fn(async () => []) },
    stockTransfer: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    stockTransferItem: { update: jest.fn() },
    stockLevel: { updateMany: jest.fn(), create: jest.fn() },
    ingredientStockLevel: { updateMany: jest.fn(), upsert: jest.fn() },
    stockMovement: { createMany: jest.fn() },
    ingredientStockMovement: { createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return prisma;
}

function setup() {
  const prisma = buildPrisma();
  const client = prisma as unknown as PrismaService;
  const tenant = new TenantAccessService(client);
  const eventBus = { publish: jest.fn() } as unknown as EventBusService;
  const numbers = {
    next: jest.fn().mockResolvedValue('TRF-20260927-0001'),
  } as unknown as DocumentNumberService;
  const service = new StockTransfersService(client, eventBus, tenant, numbers);
  const requestUseCase = new RequestTransferUseCase(client, eventBus, tenant, numbers);
  return { prisma, service, requestUseCase, eventBus };
}

describe('Stock transfers — tenant isolation', () => {
  it('rejects a transfer request whose source outlet belongs to another business', async () => {
    const { prisma, requestUseCase } = setup();
    await expect(
      requestUseCase.execute({
        businessId: BIZ,
        requestedBy: 'emp-1',
        sourceOutletId: FOREIGN_OUTLET,
        destinationOutletId: OUTLET_A,
        items: [{ productId: PRODUCT, itemName: 'Kopi', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.stockTransfer.create).not.toHaveBeenCalled();
  });

  it('rejects a transfer request containing another business product', async () => {
    const { prisma, requestUseCase } = setup();
    await expect(
      requestUseCase.execute({
        businessId: BIZ,
        requestedBy: 'emp-1',
        sourceOutletId: OUTLET_A,
        destinationOutletId: OUTLET_B,
        items: [{ productId: FOREIGN_PRODUCT, itemName: 'Asing', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.stockTransfer.create).not.toHaveBeenCalled();
  });

  it('rejects a direct transfer pulling stock from a foreign outlet without touching stock', async () => {
    const { prisma, service } = setup();
    await expect(
      service.directTransfer(user, {
        sourceOutletId: FOREIGN_OUTLET,
        destinationOutletId: OUTLET_A,
        items: [{ productId: PRODUCT, itemName: 'Kopi', quantity: 5 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.stockLevel.updateMany).not.toHaveBeenCalled();
  });

  it('rejects the same outlet as source and destination', async () => {
    const { service } = setup();
    await expect(
      service.directTransfer(user, {
        sourceOutletId: OUTLET_A,
        destinationOutletId: OUTLET_A,
        items: [{ productId: PRODUCT, itemName: 'Kopi', quantity: 5 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a request with businessId from the caller and a per-tenant number', async () => {
    const { prisma, requestUseCase } = setup();
    prisma.stockTransfer.create.mockResolvedValue({
      id: TRANSFER,
      transferNumber: 'TRF-20260927-0001',
    });
    const result = await requestUseCase.execute({
      businessId: BIZ,
      requestedBy: 'emp-1',
      sourceOutletId: OUTLET_A,
      destinationOutletId: OUTLET_B,
      items: [{ productId: PRODUCT, itemName: 'Kopi', quantity: 2 }],
    });
    expect(result).toEqual({
      transferId: TRANSFER,
      transferNumber: 'TRF-20260927-0001',
      status: 'pending',
    });
    expect(prisma.stockTransfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BIZ, transferNumber: 'TRF-20260927-0001' }),
      }),
    );
  });
});

describe('Stock transfers — receive', () => {
  const transferRow = (variantId: string | null) => ({
    id: TRANSFER,
    businessId: BIZ,
    transferNumber: 'TRF-20260927-0001',
    sourceOutletId: OUTLET_A,
    destinationOutletId: OUTLET_B,
    items: [
      {
        id: 'item-1',
        productId: PRODUCT,
        variantId,
        ingredientId: null,
        itemName: 'Kopi',
        quantitySent: new Prisma.Decimal(10),
        quantityReceived: null,
      },
    ],
  });

  it('rejects a second receive (conditional status update matched nothing) without moving stock', async () => {
    const { prisma, service, eventBus } = setup();
    prisma.stockTransfer.updateMany.mockResolvedValue({ count: 0 });
    prisma.stockTransfer.findFirst.mockResolvedValue({ status: 'received' });

    await expect(service.receive(user, TRANSFER)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.stockTransfer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TRANSFER, businessId: BIZ, status: 'in_transit' },
      }),
    );
    expect(prisma.stockLevel.updateMany).not.toHaveBeenCalled();
    expect(prisma.stockMovement.createMany).not.toHaveBeenCalled();
    expect((eventBus.publish as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('with a null variant only touches the base stock row, records movements and quantityReceived', async () => {
    const { prisma, service } = setup();
    prisma.stockTransfer.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockTransfer.findFirstOrThrow.mockResolvedValue(transferRow(null));
    prisma.stockLevel.updateMany.mockResolvedValue({ count: 1 });

    await service.receive(user, TRANSFER, {
      items: [{ stockTransferItemId: 'item-1', quantityReceived: 8 }],
    });

    const calls = prisma.stockLevel.updateMany.mock.calls.map((c) => c[0]);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.where).toHaveProperty('variantId', null);
      expect(call.where).toHaveProperty('productId', PRODUCT);
    }
    // Source: conditional decrement of the quantity sent.
    expect(calls[0]).toEqual({
      where: { outletId: OUTLET_A, productId: PRODUCT, variantId: null, quantity: { gte: 10 } },
      data: { quantity: { decrement: 10 } },
    });
    // Destination: increment by what actually arrived.
    expect(calls[1]).toEqual({
      where: { outletId: OUTLET_B, productId: PRODUCT, variantId: null },
      data: { quantity: { increment: 8 } },
    });
    expect(prisma.stockTransferItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantityReceived: 8 },
    });
    const movements = prisma.stockMovement.createMany.mock.calls[0][0].data;
    expect(movements).toEqual([
      expect.objectContaining({ outletId: OUTLET_A, movementType: 'transfer_out', quantity: -10 }),
      expect.objectContaining({ outletId: OUTLET_B, movementType: 'transfer_in', quantity: 8 }),
    ]);
  });

  it('fails with 409 when the source no longer has enough stock', async () => {
    const { prisma, service } = setup();
    prisma.stockTransfer.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockTransfer.findFirstOrThrow.mockResolvedValue(transferRow('variant-1'));
    prisma.stockLevel.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.receive(user, TRANSFER)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.stockLevel.updateMany.mock.calls[0][0].where).toHaveProperty(
      'variantId',
      'variant-1',
    );
  });

  it('rejects receiving more than was sent', async () => {
    const { prisma, service } = setup();
    prisma.stockTransfer.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockTransfer.findFirstOrThrow.mockResolvedValue(transferRow(null));

    await expect(
      service.receive(user, TRANSFER, {
        items: [{ stockTransferItemId: 'item-1', quantityReceived: 11 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.stockLevel.updateMany).not.toHaveBeenCalled();
  });
});
