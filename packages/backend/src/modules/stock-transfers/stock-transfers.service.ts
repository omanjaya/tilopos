import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockTransferStatus as DbTransferStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { StockTransferStatusChangedEvent } from '../../domain/events/stock-transfer-status-changed.event';
import type { StockTransferStatus as EventStatus } from '../../domain/events/stock-transfer-status-changed.event';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '../../shared/tenant';
import { DocumentNumberService } from '../../shared/numbering';
import { toPrismaPage } from '../../shared/dtos/pagination-query.dto';
import type {
  DirectStockTransferDto,
  ListStockTransfersQueryDto,
  ReceiveTransferDto,
} from '../../application/dtos/stock-transfer.dto';
import {
  assertTemplateOwned,
  assertTransferItemsOwned,
  decrementStock,
  incrementStock,
  recordTransferMovements,
  type MovementInput,
} from './transfer-stock.helper';

export interface DiscrepancyItem {
  itemName: string;
  quantitySent: number;
  quantityReceived: number;
  difference: number;
}

export interface TransferDiscrepancy {
  transferId: string;
  transferNumber: string;
  sourceOutletName: string;
  destinationOutletName: string;
  status: string;
  shippedAt: Date | null;
  receivedAt: Date | null;
  items: DiscrepancyItem[];
  percentDiscrepancy: number;
}

export interface AutoTransferResult {
  transferId: string;
  transferNumber: string;
  itemCount: number;
}

export interface DirectTransferResult {
  transferId: string;
  transferNumber: string;
  status: 'received';
  itemCount: number;
}

/** Upper bound for discrepancy reports (R13). */
const MAX_DISCREPANCY_TRANSFERS = 500;
/** Upper bound for low-stock rows considered by auto-request. */
const MAX_AUTO_REQUEST_ITEMS = 200;

const NAME_SELECT = { select: { id: true, name: true } } as const;

/** Shape returned by list/get: employees and outlets expose only id + name (R12). */
const TRANSFER_INCLUDE = {
  items: true,
  sourceOutlet: NAME_SELECT,
  destinationOutlet: NAME_SELECT,
  requestedByEmployee: NAME_SELECT,
  approvedByEmployee: NAME_SELECT,
  receivedByEmployee: NAME_SELECT,
} satisfies Prisma.StockTransferInclude;

/** Maps DB status to the domain-event vocabulary. */
const EVENT_STATUS: Record<DbTransferStatus, EventStatus> = {
  pending: 'requested',
  approved: 'approved',
  in_transit: 'shipped',
  received: 'received',
  rejected: 'rejected',
  cancelled: 'cancelled',
};

@Injectable()
export class StockTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly tenant: TenantAccessService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  list(businessId: string, query: ListStockTransfersQueryDto) {
    return this.prisma.stockTransfer.findMany({
      where: { businessId, ...(query.status ? { status: query.status } : {}) },
      include: TRANSFER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...toPrismaPage(query),
    });
  }

  async get(businessId: string, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, businessId },
      include: TRANSFER_INCLUDE,
    });
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }
    return transfer;
  }

  // -------------------------------------------------------------------------
  // Status transitions (conditional updates, R9)
  // -------------------------------------------------------------------------

  async approve(user: AuthUser, id: string) {
    return this.transition(user, id, 'pending', 'approved', {
      approvedBy: user.employeeId,
      approvedAt: new Date(),
    });
  }

  async ship(user: AuthUser, id: string) {
    return this.transition(user, id, 'approved', 'in_transit', { shippedAt: new Date() });
  }

  private async transition(
    user: AuthUser,
    id: string,
    from: DbTransferStatus,
    to: DbTransferStatus,
    data: Prisma.StockTransferUncheckedUpdateManyInput,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.stockTransfer.updateMany({
        where: { id, businessId: user.businessId, status: from },
        data: { ...data, status: to },
      });
      if (result.count === 0) {
        await this.throwTransitionError(tx, user.businessId, id, from);
      }
      return tx.stockTransfer.findFirstOrThrow({ where: { id, businessId: user.businessId } });
    });

    this.publish(updated, from, to, user.employeeId);
    return updated;
  }

  /**
   * Receives an in-transit transfer: the status flip is the first statement of
   * the transaction and is conditional, so a second (concurrent) receive fails
   * with 409 before any stock moves. Source loses quantitySent (conditional
   * decrement), destination gains quantityReceived (from the request, default
   * quantitySent), and both sides get ledger rows.
   */
  async receive(user: AuthUser, id: string, dto: ReceiveTransferDto = {}) {
    const overrides = new Map<string, number>();
    for (const line of dto.items ?? []) {
      if (overrides.has(line.stockTransferItemId)) {
        throw new BadRequestException('Duplicate stockTransferItemId in receive request');
      }
      overrides.set(line.stockTransferItemId, line.quantityReceived);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const flipped = await tx.stockTransfer.updateMany({
        where: { id, businessId: user.businessId, status: 'in_transit' },
        data: { status: 'received', receivedBy: user.employeeId, receivedAt: new Date() },
      });
      if (flipped.count === 0) {
        await this.throwTransitionError(tx, user.businessId, id, 'in_transit');
      }

      const transfer = await tx.stockTransfer.findFirstOrThrow({
        where: { id, businessId: user.businessId },
        include: { items: true },
      });

      const knownIds = new Set(transfer.items.map((i) => i.id));
      for (const itemId of overrides.keys()) {
        if (!knownIds.has(itemId)) {
          throw new BadRequestException(`Item ${itemId} is not part of this transfer`);
        }
      }

      const movements: MovementInput[] = [];
      for (const item of transfer.items) {
        const sent = item.quantitySent.toNumber();
        const received = overrides.get(item.id) ?? sent;
        if (received > sent) {
          throw new BadRequestException(
            `Jumlah diterima "${item.itemName}" (${received}) melebihi jumlah dikirim (${sent})`,
          );
        }
        if (!item.productId && !item.ingredientId) {
          // Free-text line (product deleted): nothing to move, but record what arrived.
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { quantityReceived: received },
          });
          continue;
        }

        await decrementStock(tx, transfer.sourceOutletId, item, sent);
        await incrementStock(tx, transfer.destinationOutletId, item, received);
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { quantityReceived: received },
        });

        const base = {
          item,
          referenceId: transfer.id,
          referenceType: 'stock_transfer',
          createdBy: user.employeeId,
        };
        movements.push(
          {
            ...base,
            outletId: transfer.sourceOutletId,
            quantity: -sent,
            movementType: 'transfer_out',
            notes: `Transfer keluar: ${transfer.transferNumber}`,
          },
          {
            ...base,
            outletId: transfer.destinationOutletId,
            quantity: received,
            movementType: 'transfer_in',
            notes: `Transfer masuk: ${transfer.transferNumber}`,
          },
        );
      }
      await recordTransferMovements(tx, movements);

      return tx.stockTransfer.findFirstOrThrow({
        where: { id, businessId: user.businessId },
        include: { items: true },
      });
    });

    this.publish(updated, 'in_transit', 'received', user.employeeId);
    return updated;
  }

  /** Immediate transfer (no approval workflow): validated, atomic, conditional decrement. */
  async directTransfer(user: AuthUser, dto: DirectStockTransferDto): Promise<DirectTransferResult> {
    const { businessId } = user;
    if (dto.sourceOutletId === dto.destinationOutletId) {
      throw new BadRequestException('Outlet asal dan tujuan tidak boleh sama');
    }
    await this.tenant.assertOutlet(user, dto.sourceOutletId);
    await this.tenant.assertOutlet(user, dto.destinationOutletId);
    await assertTransferItemsOwned(this.prisma, this.tenant, businessId, dto.items);
    await assertTemplateOwned(this.prisma, businessId, dto.templateId);

    const now = new Date();
    const transfer = await this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.documentNumbers.next(tx, businessId, 'TRF');
      const created = await tx.stockTransfer.create({
        data: {
          businessId,
          transferNumber,
          sourceOutletId: dto.sourceOutletId,
          destinationOutletId: dto.destinationOutletId,
          status: 'received',
          notes: dto.notes || null,
          templateId: dto.templateId ?? null,
          requestedBy: user.employeeId,
          approvedBy: user.employeeId,
          receivedBy: user.employeeId,
          approvedAt: now,
          shippedAt: now,
          receivedAt: now,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId || null,
              variantId: item.variantId || null,
              ingredientId: item.ingredientId || null,
              itemName: item.itemName,
              quantitySent: item.quantity,
              quantityReceived: item.quantity,
            })),
          },
        },
        select: { id: true, transferNumber: true },
      });

      const movements: MovementInput[] = [];
      for (const item of dto.items) {
        await decrementStock(tx, dto.sourceOutletId, item, item.quantity);
        await incrementStock(tx, dto.destinationOutletId, item, item.quantity);
        const base = {
          item,
          referenceId: created.id,
          referenceType: 'direct_transfer',
          createdBy: user.employeeId,
        };
        movements.push(
          {
            ...base,
            outletId: dto.sourceOutletId,
            quantity: -item.quantity,
            movementType: 'transfer_out',
            notes: `Transfer langsung ke outlet tujuan: ${transferNumber}`,
          },
          {
            ...base,
            outletId: dto.destinationOutletId,
            quantity: item.quantity,
            movementType: 'transfer_in',
            notes: `Transfer langsung dari outlet asal: ${transferNumber}`,
          },
        );
      }
      await recordTransferMovements(tx, movements);
      return created;
    });

    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        transfer.id,
        dto.sourceOutletId,
        dto.destinationOutletId,
        businessId,
        'requested',
        'received',
        user.employeeId,
      ),
    );

    return {
      transferId: transfer.id,
      transferNumber: transfer.transferNumber,
      status: 'received',
      itemCount: dto.items.length,
    };
  }

  // -------------------------------------------------------------------------
  // Reports / automation
  // -------------------------------------------------------------------------

  async getDiscrepancies(businessId: string, from: Date, to: Date): Promise<TransferDiscrepancy[]> {
    const transfers = await this.prisma.stockTransfer.findMany({
      where: {
        businessId,
        status: 'received',
        receivedAt: { gte: from, lte: to },
      },
      include: {
        items: true,
        sourceOutlet: NAME_SELECT,
        destinationOutlet: NAME_SELECT,
      },
      orderBy: { receivedAt: 'desc' },
      take: MAX_DISCREPANCY_TRANSFERS,
    });

    const discrepancies: TransferDiscrepancy[] = [];

    for (const transfer of transfers) {
      const discrepantItems: DiscrepancyItem[] = [];

      for (const item of transfer.items) {
        const sent = Number(item.quantitySent);
        // Legacy rows received before quantityReceived was recorded: treat as fully received.
        const received = item.quantityReceived !== null ? Number(item.quantityReceived) : sent;

        if (sent !== received) {
          discrepantItems.push({
            itemName: item.itemName,
            quantitySent: sent,
            quantityReceived: received,
            difference: received - sent,
          });
        }
      }

      if (discrepantItems.length > 0) {
        const totalSent = transfer.items.reduce((sum, item) => sum + Number(item.quantitySent), 0);
        const totalDifference = discrepantItems.reduce(
          (sum, item) => sum + Math.abs(item.difference),
          0,
        );
        const percentDiscrepancy =
          totalSent > 0 ? Math.round((totalDifference / totalSent) * 100 * 10) / 10 : 0;

        discrepancies.push({
          transferId: transfer.id,
          transferNumber: transfer.transferNumber,
          sourceOutletName: transfer.sourceOutlet.name,
          destinationOutletName: transfer.destinationOutlet.name,
          status: transfer.status,
          shippedAt: transfer.shippedAt,
          receivedAt: transfer.receivedAt,
          items: discrepantItems,
          percentDiscrepancy,
        });
      }
    }

    return discrepancies;
  }

  async autoCreateTransferRequest(
    user: AuthUser,
    destinationOutletId: string,
    sourceOutletId: string,
  ): Promise<AutoTransferResult | null> {
    const { businessId } = user;
    if (sourceOutletId === destinationOutletId) {
      throw new BadRequestException('Outlet asal dan tujuan tidak boleh sama');
    }
    await this.tenant.assertOutlet(user, destinationOutletId);
    await this.tenant.assertOutlet(user, sourceOutletId);

    const lowStockItems = await this.prisma.$queryRaw<RawLowStockRow[]>`
      SELECT
        sl.product_id,
        p.name AS product_name,
        sl.quantity AS current_stock,
        sl.low_stock_alert AS minimum_stock
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      WHERE sl.outlet_id = ${destinationOutletId}::uuid
        AND p.business_id = ${businessId}::uuid
        AND sl.product_id IS NOT NULL
        AND sl.variant_id IS NULL
        AND sl.quantity <= sl.low_stock_alert
        AND p.is_active = true
      ORDER BY sl.quantity ASC
      LIMIT ${MAX_AUTO_REQUEST_ITEMS}
    `;

    if (lowStockItems.length === 0) {
      return null;
    }

    // One query for every source stock row instead of one per product (R13).
    const sourceStocks = await this.prisma.stockLevel.findMany({
      where: {
        outletId: sourceOutletId,
        productId: { in: lowStockItems.map((i) => i.product_id) },
        variantId: null,
      },
      select: { productId: true, quantity: true, lowStockAlert: true },
    });
    const sourceByProduct = new Map(sourceStocks.map((s) => [s.productId, s]));

    const transferItems: TransferItemData[] = [];
    for (const item of lowStockItems) {
      const sourceStock = sourceByProduct.get(item.product_id);
      if (!sourceStock) continue;

      const availableToTransfer = Number(sourceStock.quantity) - sourceStock.lowStockAlert;
      if (availableToTransfer <= 0) continue;

      const needed = Number(item.minimum_stock) * 2 - Number(item.current_stock);
      const quantityToTransfer = Math.floor(Math.min(needed, availableToTransfer));

      if (quantityToTransfer > 0) {
        transferItems.push({
          productId: item.product_id,
          itemName: item.product_name,
          quantity: quantityToTransfer,
        });
      }
    }

    if (transferItems.length === 0) {
      return null;
    }

    const transfer = await this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.documentNumbers.next(tx, businessId, 'TRF');
      return tx.stockTransfer.create({
        data: {
          businessId,
          transferNumber,
          sourceOutletId,
          destinationOutletId,
          status: 'pending',
          notes: 'Auto-generated transfer request for low stock items',
          requestedBy: user.employeeId,
          items: {
            create: transferItems.map((item) => ({
              productId: item.productId,
              itemName: item.itemName,
              quantitySent: item.quantity,
            })),
          },
        },
        select: { id: true, transferNumber: true },
      });
    });

    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        transfer.id,
        sourceOutletId,
        destinationOutletId,
        businessId,
        'requested',
        'requested',
        user.employeeId,
      ),
    );

    return {
      transferId: transfer.id,
      transferNumber: transfer.transferNumber,
      itemCount: transferItems.length,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Distinguishes "not yours / missing" (404) from "wrong status" (409) after a failed conditional update. */
  private async throwTransitionError(
    tx: Prisma.TransactionClient,
    businessId: string,
    id: string,
    expected: DbTransferStatus,
  ): Promise<never> {
    const current = await tx.stockTransfer.findFirst({
      where: { id, businessId },
      select: { status: true },
    });
    if (!current) {
      throw new NotFoundException('Transfer not found');
    }
    throw new ConflictException(
      `Transfer berstatus "${current.status}"; aksi ini hanya untuk transfer berstatus "${expected}".`,
    );
  }

  private publish(
    transfer: {
      id: string;
      sourceOutletId: string;
      destinationOutletId: string;
      businessId: string;
    },
    from: DbTransferStatus,
    to: DbTransferStatus,
    employeeId: string,
  ): void {
    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        transfer.id,
        transfer.sourceOutletId,
        transfer.destinationOutletId,
        transfer.businessId,
        EVENT_STATUS[from],
        EVENT_STATUS[to],
        employeeId,
      ),
    );
  }
}

interface RawLowStockRow {
  product_id: string;
  product_name: string;
  current_stock: number | string;
  minimum_stock: number | string;
}

interface TransferItemData {
  productId: string;
  itemName: string;
  quantity: number;
}
