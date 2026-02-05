import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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

@Injectable()
export class StockTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDiscrepancies(businessId: string, from: Date, to: Date): Promise<TransferDiscrepancy[]> {
    const transfers = await this.prisma.stockTransfer.findMany({
      where: {
        businessId,
        status: 'received',
        receivedAt: { gte: from, lte: to },
      },
      include: {
        items: true,
        sourceOutlet: true,
        destinationOutlet: true,
      },
      orderBy: { receivedAt: 'desc' },
    });

    const discrepancies: TransferDiscrepancy[] = [];

    for (const transfer of transfers) {
      const discrepantItems: DiscrepancyItem[] = [];

      for (const item of transfer.items) {
        const sent = Number(item.quantitySent);
        const received = item.quantityReceived !== null ? Number(item.quantityReceived) : 0;

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
    businessId: string,
    destinationOutletId: string,
    sourceOutletId: string,
    requestedBy: string,
  ): Promise<AutoTransferResult | null> {
    const lowStockItems = await this.prisma.$queryRaw<RawLowStockRow[]>`
      SELECT
        sl.product_id,
        p.name AS product_name,
        sl.quantity AS current_stock,
        sl.low_stock_alert AS minimum_stock
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      WHERE sl.outlet_id = ${destinationOutletId}::uuid
        AND sl.product_id IS NOT NULL
        AND sl.quantity <= sl.low_stock_alert
        AND p.is_active = true
      ORDER BY sl.quantity ASC
    `;

    if (lowStockItems.length === 0) {
      return null;
    }

    const transferItems: TransferItemData[] = [];

    for (const item of lowStockItems) {
      const sourceStock = await this.prisma.stockLevel.findFirst({
        where: {
          outletId: sourceOutletId,
          productId: item.product_id,
        },
      });

      if (!sourceStock) continue;

      const sourceQuantity = Number(sourceStock.quantity);
      const sourceAlert = sourceStock.lowStockAlert;
      const availableToTransfer = sourceQuantity - sourceAlert;

      if (availableToTransfer <= 0) continue;

      const currentStock =
        typeof item.current_stock === 'number' ? item.current_stock : Number(item.current_stock);
      const minimumStock =
        typeof item.minimum_stock === 'number' ? item.minimum_stock : Number(item.minimum_stock);

      const needed = minimumStock * 2 - currentStock;
      const quantityToTransfer = Math.min(needed, availableToTransfer);

      if (quantityToTransfer > 0) {
        transferItems.push({
          productId: item.product_id,
          itemName: item.product_name,
          quantity: Math.ceil(quantityToTransfer),
        });
      }
    }

    if (transferItems.length === 0) {
      return null;
    }

    const transferNumber = `TRF-AUTO-${Date.now().toString(36).toUpperCase()}`;

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        businessId,
        transferNumber,
        sourceOutletId,
        destinationOutletId,
        status: 'pending',
        notes: 'Auto-generated transfer request for low stock items',
        requestedBy,
        items: {
          create: transferItems.map((item) => ({
            productId: item.productId,
            itemName: item.itemName,
            quantitySent: item.quantity,
          })),
        },
      },
    });

    return {
      transferId: transfer.id,
      transferNumber,
      itemCount: transferItems.length,
    };
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
