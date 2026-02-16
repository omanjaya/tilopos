import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
  ImportProductRow,
  ImportProductsResult,
  ImportResultError,
  StockDiscrepancyItem,
  AutoRequestTransferResult,
} from '../../application/dtos/inventory-import-export.dto';
import { BulkUpdateAction } from '../../application/dtos/bulk-product.dto';
import type { BulkUpdateProductsDto, BulkDeleteProductsDto } from '../../application/dtos/bulk-product.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batch import products. Uses a Prisma transaction for atomicity.
   */
  async importProducts(
    businessId: string,
    rows: ImportProductRow[],
  ): Promise<ImportProductsResult> {
    const errors: ImportResultError[] = [];
    const validRows: Array<{ index: number; row: ImportProductRow }> = [];

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.name || row.name.trim().length === 0) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
        continue;
      }

      if (row.basePrice === undefined || row.basePrice === null || isNaN(row.basePrice)) {
        errors.push({
          row: rowNum,
          field: 'basePrice',
          message: 'Base price is required and must be a number',
        });
        continue;
      }

      if (row.basePrice < 0) {
        errors.push({
          row: rowNum,
          field: 'basePrice',
          message: 'Base price must be non-negative',
        });
        continue;
      }

      if (row.costPrice !== undefined && row.costPrice !== null && row.costPrice < 0) {
        errors.push({
          row: rowNum,
          field: 'costPrice',
          message: 'Cost price must be non-negative',
        });
        continue;
      }

      // Check duplicate SKU within the import batch
      if (row.sku) {
        const existing = await this.prisma.product.findFirst({
          where: { businessId, sku: row.sku },
        });
        if (existing) {
          errors.push({ row: rowNum, field: 'sku', message: `SKU "${row.sku}" already exists` });
          continue;
        }

        const duplicateInBatch = validRows.find((vr) => vr.row.sku && vr.row.sku === row.sku);
        if (duplicateInBatch) {
          errors.push({
            row: rowNum,
            field: 'sku',
            message: `Duplicate SKU "${row.sku}" in import data`,
          });
          continue;
        }
      }

      validRows.push({ index: i, row });
    }

    // Bulk create in a transaction
    let imported = 0;

    if (validRows.length > 0) {
      try {
        await this.prisma.$transaction(async (tx) => {
          for (const { row, index } of validRows) {
            try {
              await tx.product.create({
                data: {
                  businessId,
                  sku: row.sku || null,
                  name: row.name.trim(),
                  description: row.description || null,
                  categoryId: row.categoryId || null,
                  basePrice: row.basePrice,
                  costPrice: row.costPrice ?? null,
                  trackStock: true,
                },
              });
              imported++;
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unknown error';
              errors.push({ row: index + 1, field: 'general', message });
            }
          }
        });
      } catch (err) {
        this.logger.error('Batch import transaction failed', err);
        throw new BadRequestException('Batch import failed. No products were imported.');
      }
    }

    this.logger.log(`Product import: ${imported} imported, ${errors.length} failed`);

    return {
      imported,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Parse CSV string into ImportProductRow array.
   * Expected headers: name, sku, categoryId, basePrice, costPrice, description
   */
  parseCsvToProductRows(csvData: string): ImportProductRow[] {
    const lines = csvData.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const rows: ImportProductRow[] = [];

    for (const line of dataLines) {
      const fields = this.parseCsvLine(line);
      rows.push({
        name: fields[0]?.trim() || '',
        sku: fields[1]?.trim() || undefined,
        categoryId: fields[2]?.trim() || undefined,
        basePrice: parseFloat(fields[3]?.trim() || '0'),
        costPrice: fields[4]?.trim() ? parseFloat(fields[4].trim()) : undefined,
        description: fields[5]?.trim() || undefined,
      });
    }

    return rows;
  }

  /**
   * Parse JSON string into ImportProductRow array.
   */
  parseJsonToProductRows(jsonData: string): ImportProductRow[] {
    const parsed: unknown = JSON.parse(jsonData);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON data must be an array');
    }

    return parsed.map((item: Record<string, unknown>) => ({
      name: String(item['name'] || ''),
      sku: item['sku'] ? String(item['sku']) : undefined,
      categoryId: item['categoryId'] ? String(item['categoryId']) : undefined,
      basePrice: Number(item['basePrice'] || 0),
      costPrice: item['costPrice'] !== undefined ? Number(item['costPrice']) : undefined,
      description: item['description'] ? String(item['description']) : undefined,
    }));
  }

  /**
   * Export products as CSV string.
   */
  async exportProductsCsv(businessId: string, categoryId?: string): Promise<string> {
    const products = await this.fetchProductsForExport(businessId, categoryId);

    const header = 'name,sku,category,basePrice,costPrice,description,isActive';
    const rows = products.map((p) =>
      [
        this.escapeCsvField(p.name),
        this.escapeCsvField(p.sku || ''),
        this.escapeCsvField(p.categoryName || ''),
        p.basePrice.toString(),
        p.costPrice?.toString() || '',
        this.escapeCsvField(p.description || ''),
        p.isActive ? 'true' : 'false',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Export products as JSON string.
   */
  async exportProductsJson(businessId: string, categoryId?: string): Promise<string> {
    const products = await this.fetchProductsForExport(businessId, categoryId);

    const data = products.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.categoryName,
      basePrice: p.basePrice,
      costPrice: p.costPrice,
      description: p.description,
      isActive: p.isActive,
    }));

    return JSON.stringify(data, null, 2);
  }

  /**
   * Get stock discrepancies by comparing movement totals vs actual stock levels.
   */
  async getStockDiscrepancies(outletId: string): Promise<StockDiscrepancyItem[]> {
    // Get actual stock levels
    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId, productId: { not: null } },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    const discrepancies: StockDiscrepancyItem[] = [];

    for (const sl of stockLevels) {
      if (!sl.productId || !sl.product) continue;

      // Sum all stock movements for this product at this outlet
      const movements = await this.prisma.stockMovement.aggregate({
        where: {
          outletId,
          productId: sl.productId,
          variantId: sl.variantId,
        },
        _sum: { quantity: true },
      });

      const expectedQuantity = movements._sum.quantity ? Number(movements._sum.quantity) : 0;
      const actualQuantity = Number(sl.quantity);
      const discrepancy = actualQuantity - expectedQuantity;

      if (Math.abs(discrepancy) > 0.001) {
        // Find last adjustment
        const lastAdjustment = await this.prisma.stockMovement.findFirst({
          where: {
            outletId,
            productId: sl.productId,
            movementType: 'adjustment',
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        discrepancies.push({
          productId: sl.product.id,
          productName: sl.product.name,
          expectedQuantity,
          actualQuantity,
          discrepancy,
          lastAdjusted: lastAdjustment?.createdAt ?? null,
        });
      }
    }

    return discrepancies;
  }

  /**
   * Auto-create stock transfer request for low stock items.
   */
  async autoRequestTransfer(
    businessId: string,
    outletId: string,
    sourceOutletId: string,
  ): Promise<AutoRequestTransferResult> {
    // Find all low stock items at the destination outlet
    const lowStockItems = await this.prisma.stockLevel.findMany({
      where: {
        outletId,
        productId: { not: null },
      },
      include: {
        product: { select: { id: true, name: true, isActive: true } },
      },
    });

    const itemsToTransfer = lowStockItems.filter((sl) => {
      if (!sl.product || !sl.product.isActive) return false;
      return Number(sl.quantity) < sl.lowStockAlert;
    });

    if (itemsToTransfer.length === 0) {
      throw new BadRequestException('No low stock items found');
    }

    // Generate transfer number
    const transferCount = await this.prisma.stockTransfer.count({
      where: { businessId },
    });
    const transferNumber = `AT${(transferCount + 1).toString().padStart(6, '0')}`;

    // Create transfer request with items
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        businessId,
        transferNumber,
        sourceOutletId,
        destinationOutletId: outletId,
        status: 'pending',
        notes: 'Auto-generated transfer request for low stock items',
        items: {
          create: itemsToTransfer.map((sl) => ({
            productId: sl.productId,
            variantId: sl.variantId,
            itemName: sl.product!.name,
            quantitySent: Math.max(sl.lowStockAlert - Number(sl.quantity), 1),
          })),
        },
      },
    });

    this.logger.log(
      `Auto transfer request created: ${transferNumber} with ${itemsToTransfer.length} items`,
    );

    return {
      transferId: transfer.id,
      itemCount: itemsToTransfer.length,
    };
  }

  /**
   * Bulk update products in a single transaction.
   */
  async bulkUpdateProducts(
    businessId: string,
    dto: BulkUpdateProductsDto,
  ): Promise<{ updated: number; failed: number }> {
    const { productIds, action } = dto;

    // For simple field updates, use updateMany (single query)
    if (action === BulkUpdateAction.CATEGORY) {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { categoryId: dto.categoryId || null },
      });
      return { updated: result.count, failed: productIds.length - result.count };
    }

    if (action === BulkUpdateAction.STATUS) {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { isActive: dto.isActive ?? true },
      });
      return { updated: result.count, failed: productIds.length - result.count };
    }

    if (action === BulkUpdateAction.TRACK_STOCK) {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { trackStock: dto.trackStock ?? true },
      });
      return { updated: result.count, failed: productIds.length - result.count };
    }

    // For price/costPrice, compute new values per product in a transaction
    if (action === BulkUpdateAction.PRICE || action === BulkUpdateAction.COST_PRICE) {
      const { operation, priceType, value } = dto;
      if (!operation || !priceType || value === undefined) {
        throw new BadRequestException('operation, priceType, and value are required for price updates');
      }

      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true, basePrice: true, costPrice: true },
      });

      let updated = 0;

      await this.prisma.$transaction(async (tx) => {
        for (const product of products) {
          const currentPrice = action === BulkUpdateAction.PRICE
            ? Number(product.basePrice)
            : Number(product.costPrice ?? 0);

          let newPrice: number;
          if (priceType === 'percentage') {
            const change = (currentPrice * value) / 100;
            newPrice = operation === 'increase' ? currentPrice + change : currentPrice - change;
          } else {
            newPrice = operation === 'increase' ? currentPrice + value : currentPrice - value;
          }

          newPrice = Math.max(0, Math.round(newPrice));

          const data = action === BulkUpdateAction.PRICE
            ? { basePrice: newPrice }
            : { costPrice: newPrice };

          await tx.product.update({ where: { id: product.id }, data });
          updated++;
        }
      });

      return { updated, failed: productIds.length - updated };
    }

    throw new BadRequestException(`Unknown bulk action: ${action}`);
  }

  /**
   * Bulk delete (soft or hard) products.
   */
  async bulkDeleteProducts(
    businessId: string,
    dto: BulkDeleteProductsDto,
  ): Promise<{ deleted: number }> {
    const { productIds, hardDelete } = dto;

    if (!hardDelete) {
      // Soft delete: set isActive = false
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { isActive: false },
      });
      return { deleted: result.count };
    }

    // Hard delete: check for transaction history first
    const productsWithTx = await this.prisma.transactionItem.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true },
      distinct: ['productId'],
    });

    const protectedIds = new Set(productsWithTx.map((t) => t.productId).filter(Boolean));

    if (protectedIds.size > 0) {
      throw new BadRequestException(
        `${protectedIds.size} produk memiliki riwayat transaksi dan tidak bisa dihapus permanen. Gunakan soft delete.`,
      );
    }

    const result = await this.prisma.product.deleteMany({
      where: { id: { in: productIds }, businessId },
    });

    return { deleted: result.count };
  }

  private async fetchProductsForExport(
    businessId: string,
    categoryId?: string,
  ): Promise<
    Array<{
      name: string;
      sku: string | null;
      categoryName: string | null;
      basePrice: number;
      costPrice: number | null;
      description: string | null;
      isActive: boolean;
    }>
  > {
    const where: Record<string, unknown> = { businessId };
    if (categoryId) {
      where['categoryId'] = categoryId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      name: p.name,
      sku: p.sku,
      categoryName: p.category?.name ?? null,
      basePrice: Number(p.basePrice),
      costPrice: p.costPrice ? Number(p.costPrice) : null,
      description: p.description,
      isActive: p.isActive,
    }));
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    fields.push(current);
    return fields;
  }
}
