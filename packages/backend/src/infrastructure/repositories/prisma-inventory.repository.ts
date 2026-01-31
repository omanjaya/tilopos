import { Injectable } from '@nestjs/common';
import type {
  IInventoryRepository,
  StockLevelRecord,
  StockMovementRecord,
} from '../../domain/interfaces/repositories/inventory.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumberRequired } from './decimal.helper';
import type { StockLevel as PrismaStockLevel, StockMovement as PrismaStockMovement, Product } from '@prisma/client';

/** Extended Prisma StockLevel type with product relation included */
type StockLevelWithProduct = PrismaStockLevel & {
  product?: Pick<Product, 'id' | 'name' | 'sku'> | null;
};

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStockLevel(
    outletId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<StockLevelRecord | null> {
    const stockLevel = await this.prisma.stockLevel.findFirst({
      where: {
        outletId,
        productId,
        variantId: variantId ?? null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    if (!stockLevel) {
      return null;
    }

    return this.toStockLevelRecord(stockLevel);
  }

  async findStockLevelsByOutlet(outletId: string): Promise<StockLevelRecord[]> {
    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return stockLevels.map((stockLevel) => this.toStockLevelRecord(stockLevel));
  }

  async findLowStockItems(outletId: string): Promise<StockLevelRecord[]> {
    // Prisma does not support comparing two columns in a where clause,
    // so we use a raw query to find items where quantity <= low_stock_alert.
    const rawResults = await this.prisma.$queryRaw<RawStockLevelRow[]>`
      SELECT id, outlet_id, product_id, variant_id, quantity, low_stock_alert, updated_at
      FROM stock_levels
      WHERE outlet_id = ${outletId}::uuid
        AND quantity <= low_stock_alert
      ORDER BY quantity ASC
    `;

    return rawResults.map((row) => this.toStockLevelRecordFromRaw(row));
  }

  async updateStockLevel(id: string, quantity: number): Promise<StockLevelRecord> {
    const updated = await this.prisma.stockLevel.update({
      where: { id },
      data: { quantity },
    });

    return this.toStockLevelRecord(updated);
  }

  async createStockMovement(movement: StockMovementRecord): Promise<StockMovementRecord> {
    const created = await this.prisma.stockMovement.create({
      data: {
        id: movement.id,
        outletId: movement.outletId,
        productId: movement.productId,
        variantId: movement.variantId,
        movementType: movement.movementType as
          | 'sale'
          | 'purchase'
          | 'adjustment'
          | 'transfer_in'
          | 'transfer_out'
          | 'waste'
          | 'return_stock',
        quantity: movement.quantity,
        referenceId: movement.referenceId,
        referenceType: movement.referenceType,
        notes: movement.notes,
        createdBy: movement.createdBy,
      },
    });

    return this.toStockMovementRecord(created);
  }

  private toStockLevelRecord(stockLevel: StockLevelWithProduct): StockLevelRecord {
    return {
      id: stockLevel.id,
      outletId: stockLevel.outletId,
      productId: stockLevel.productId,
      variantId: stockLevel.variantId,
      quantity: decimalToNumberRequired(stockLevel.quantity),
      lowStockAlert: stockLevel.lowStockAlert,
      updatedAt: stockLevel.updatedAt,
      product: stockLevel.product ? {
        id: stockLevel.product.id,
        name: stockLevel.product.name,
        sku: stockLevel.product.sku,
      } : undefined,
    };
  }

  /**
   * Maps a raw SQL result row to StockLevelRecord.
   * Raw queries return snake_case column names from PostgreSQL.
   */
  private toStockLevelRecordFromRaw(row: RawStockLevelRow): StockLevelRecord {
    return {
      id: row.id,
      outletId: row.outlet_id,
      productId: row.product_id ?? null,
      variantId: row.variant_id ?? null,
      quantity: typeof row.quantity === 'number' ? row.quantity : Number(row.quantity),
      lowStockAlert: typeof row.low_stock_alert === 'number'
        ? row.low_stock_alert
        : Number(row.low_stock_alert),
      updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at)),
    };
  }

  private toStockMovementRecord(movement: PrismaStockMovement): StockMovementRecord {
    return {
      id: movement.id,
      outletId: movement.outletId,
      productId: movement.productId,
      variantId: movement.variantId,
      movementType: movement.movementType,
      quantity: decimalToNumberRequired(movement.quantity),
      referenceId: movement.referenceId,
      referenceType: movement.referenceType,
      notes: movement.notes,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,
    };
  }
}

/** Shape of a raw SQL row from the stock_levels table. */
interface RawStockLevelRow {
  id: string;
  outlet_id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number | string;
  low_stock_alert: number | string;
  updated_at: Date | string;
}
