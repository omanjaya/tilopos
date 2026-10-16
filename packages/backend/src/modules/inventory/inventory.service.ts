import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { TenantAccessService } from '@shared/tenant';
import { DocumentNumberService } from '@shared/numbering';
import { toPrismaPage } from '@shared/dtos/pagination-query.dto';
import { money } from '@shared/utils/money';
import { csvRow, parseCsvLine } from '@infrastructure/import/csv.util';
import type { StockListQueryDto } from '@application/dtos/product-query.dto';
import { MAX_IMPORT_ROWS } from '../../application/dtos/inventory-import-export.dto';
import type {
  ImportProductRow,
  ImportProductsResult,
  ImportResultError,
  StockDiscrepancyItem,
  AutoRequestTransferResult,
} from '../../application/dtos/inventory-import-export.dto';
import { BulkUpdateAction } from '../../application/dtos/bulk-product.dto';
import { OutletProductService } from './outlet-product.service';
import type {
  BulkUpdateProductsDto,
  BulkDeleteProductsDto,
} from '../../application/dtos/bulk-product.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Caps for array responses (R13). */
const MAX_STOCK_ROWS = 5000;
const MAX_EXPORT_ROWS = 10000;
const MAX_AUTO_TRANSFER_ITEMS = 200;

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly tenant: TenantAccessService,
    private readonly documentNumbers: DocumentNumberService,
    private readonly outletProducts: OutletProductService,
  ) {}

  /**
   * Batch import products (CSV/JSON). Rows are fully validated BEFORE the transaction
   * (categories and SKUs are checked with one query each); the valid rows are then
   * created in a single transaction with set-based statements and linked to every
   * active outlet. Nothing is caught inside the transaction, so a DB error rolls the
   * whole batch back instead of leaving an aborted transaction half-applied.
   */
  async importProducts(
    businessId: string,
    rows: ImportProductRow[],
  ): Promise<ImportProductsResult> {
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import is limited to ${MAX_IMPORT_ROWS} rows`);
    }

    const errors: ImportResultError[] = [];
    const validRows: Array<{ rowNum: number; row: ImportProductRow }> = [];
    const skusInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.name || row.name.trim().length === 0) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
        continue;
      }
      if (row.name.trim().length > 255) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is longer than 255 characters' });
        continue;
      }
      if (!Number.isFinite(row.basePrice) || row.basePrice < 0) {
        errors.push({
          row: rowNum,
          field: 'basePrice',
          message: 'Base price is required and must be a non-negative number',
        });
        continue;
      }
      if (
        row.costPrice !== undefined &&
        row.costPrice !== null &&
        (!Number.isFinite(row.costPrice) || row.costPrice < 0)
      ) {
        errors.push({
          row: rowNum,
          field: 'costPrice',
          message: 'Cost price must be a non-negative number',
        });
        continue;
      }
      if (row.categoryId && !UUID_RE.test(row.categoryId)) {
        errors.push({ row: rowNum, field: 'categoryId', message: 'categoryId must be a UUID' });
        continue;
      }
      if (row.sku) {
        if (row.sku.length > 100) {
          errors.push({ row: rowNum, field: 'sku', message: 'SKU is longer than 100 characters' });
          continue;
        }
        if (skusInBatch.has(row.sku)) {
          errors.push({
            row: rowNum,
            field: 'sku',
            message: `Duplicate SKU "${row.sku}" in import data`,
          });
          continue;
        }
        skusInBatch.add(row.sku);
      }

      validRows.push({ rowNum, row });
    }

    // Categories must belong to the caller's business (one query).
    const categoryIds = [
      ...new Set(validRows.map((v) => v.row.categoryId).filter(Boolean)),
    ] as string[];
    const ownedCategories = new Set(
      categoryIds.length
        ? (
            await this.prisma.category.findMany({
              where: { id: { in: categoryIds }, businessId },
              select: { id: true },
            })
          ).map((c) => c.id)
        : [],
    );

    const candidates = validRows.filter(({ row, rowNum }) => {
      if (row.categoryId && !ownedCategories.has(row.categoryId)) {
        errors.push({ row: rowNum, field: 'categoryId', message: 'Category not found' });
        return false;
      }
      return true;
    });

    let imported = 0;
    if (candidates.length > 0) {
      imported = await this.prisma.$transaction(
        async (tx) => {
          // Serialise SKU assignment per business, then reject already-used SKUs in one query.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sku:${businessId}`}))`;
          const skus = candidates.map((c) => c.row.sku).filter((s): s is string => !!s);
          const taken = new Set(
            skus.length
              ? (
                  await tx.product.findMany({
                    where: { businessId, sku: { in: skus } },
                    select: { sku: true },
                  })
                ).map((p) => p.sku)
              : [],
          );

          const toCreate = candidates.filter(({ row, rowNum }) => {
            if (row.sku && taken.has(row.sku)) {
              errors.push({
                row: rowNum,
                field: 'sku',
                message: `SKU "${row.sku}" already exists`,
              });
              return false;
            }
            return true;
          });
          if (toCreate.length === 0) return 0;

          const ids = toCreate.map(() => randomUUID());
          await tx.product.createMany({
            data: toCreate.map(({ row }, idx) => ({
              id: ids[idx],
              businessId,
              sku: row.sku || null,
              name: row.name.trim(),
              description: row.description || null,
              categoryId: row.categoryId || null,
              basePrice: money(row.basePrice),
              costPrice:
                row.costPrice !== undefined && row.costPrice !== null ? money(row.costPrice) : null,
              trackStock: true,
            })),
          });
          // Imported products are visible in every active outlet, like created ones.
          await this.outletProducts.assignToAllOutlets(businessId, ids, tx);
          return ids.length;
        },
        { timeout: 60_000 },
      );
    }

    errors.sort((a, b) => a.row - b.row);
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
    const lines = csvData.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }
    const dataLines = lines.slice(1); // skip header row
    if (dataLines.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import is limited to ${MAX_IMPORT_ROWS} rows`);
    }

    return dataLines.map((line) => {
      const fields = parseCsvLine(line);
      return {
        name: fields[0]?.trim() || '',
        sku: fields[1]?.trim() || undefined,
        categoryId: fields[2]?.trim() || undefined,
        basePrice: this.parseAmount(fields[3]),
        costPrice: fields[4]?.trim() ? this.parseAmount(fields[4]) : undefined,
        description: fields[5]?.trim() || undefined,
      };
    });
  }

  /**
   * Parse JSON string into ImportProductRow array.
   */
  parseJsonToProductRows(jsonData: string): ImportProductRow[] {
    const parsed: unknown = JSON.parse(jsonData);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON data must be an array');
    }
    if (parsed.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import is limited to ${MAX_IMPORT_ROWS} rows`);
    }

    return parsed.map((raw: unknown) => {
      const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      return {
        name: String(item['name'] || ''),
        sku: item['sku'] ? String(item['sku']) : undefined,
        categoryId: item['categoryId'] ? String(item['categoryId']) : undefined,
        basePrice: this.parseAmount(item['basePrice']),
        costPrice:
          item['costPrice'] !== undefined && item['costPrice'] !== null && item['costPrice'] !== ''
            ? this.parseAmount(item['costPrice'])
            : undefined,
        description: item['description'] ? String(item['description']) : undefined,
      };
    });
  }

  /** Strict decimal parse: NaN for anything that is not a plain non-negative number. */
  private parseAmount(value: unknown): number {
    const text = typeof value === 'number' ? String(value) : String(value ?? '').trim();
    return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
  }

  /**
   * Export products as CSV string.
   */
  async exportProductsCsv(businessId: string, categoryId?: string): Promise<string> {
    const products = await this.fetchProductsForExport(businessId, categoryId);

    const header = 'name,sku,categoryName,basePrice,costPrice,description,isActive';
    const rows = products.map((p) =>
      csvRow([
        p.name,
        p.sku ?? '',
        p.categoryName ?? '',
        p.basePrice,
        p.costPrice ?? '',
        p.description ?? '',
        p.isActive ? 'true' : 'false',
      ]),
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
      take: MAX_STOCK_ROWS,
    });

    // Batch query: sum all stock movements grouped by productId+variantId (avoids N+1)
    const productIds = stockLevels.map((sl) => sl.productId).filter(Boolean) as string[];
    if (productIds.length === 0) return [];

    const movementSums = await this.prisma.stockMovement.groupBy({
      by: ['productId', 'variantId'],
      where: { outletId, productId: { in: productIds } },
      _sum: { quantity: true },
    });

    // Build lookup map for movement sums
    const movementMap = new Map<string, number>();
    for (const m of movementSums) {
      const key = `${m.productId || ''}:${m.variantId || ''}`;
      movementMap.set(key, Number(m._sum.quantity ?? 0));
    }

    // Batch query: find last adjustment per product
    const lastAdjustments = await this.prisma.stockMovement.findMany({
      where: { outletId, productId: { in: productIds }, movementType: 'adjustment' },
      orderBy: { createdAt: 'desc' },
      distinct: ['productId'],
      select: { productId: true, createdAt: true },
    });
    const adjustmentMap = new Map<string, Date>();
    for (const a of lastAdjustments) {
      if (a.productId) adjustmentMap.set(a.productId, a.createdAt);
    }

    const discrepancies: StockDiscrepancyItem[] = [];

    for (const sl of stockLevels) {
      if (!sl.productId || !sl.product) continue;

      const key = `${sl.productId}:${sl.variantId || ''}`;
      const expectedQuantity = movementMap.get(key) ?? 0;
      const actualQuantity = Number(sl.quantity);
      const discrepancy = actualQuantity - expectedQuantity;

      if (Math.abs(discrepancy) > 0.001) {
        discrepancies.push({
          productId: sl.product.id,
          productName: sl.product.name,
          expectedQuantity,
          actualQuantity,
          discrepancy,
          lastAdjusted: adjustmentMap.get(sl.productId) ?? null,
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
    if (sourceOutletId === outletId) {
      throw new BadRequestException('Source outlet must be different from destination outlet');
    }

    // Low-stock rows are filtered in SQL (quantity < low_stock_alert), capped.
    const lowStockRows = await this.prisma.$queryRaw<
      Array<{
        product_id: string;
        variant_id: string | null;
        quantity: Prisma.Decimal;
        low_stock_alert: number;
      }>
    >`
      SELECT sl.product_id, sl.variant_id, sl.quantity, sl.low_stock_alert
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      WHERE sl.outlet_id = ${outletId}::uuid
        AND p.business_id = ${businessId}::uuid
        AND p.is_active = true
        AND sl.quantity < sl.low_stock_alert
      ORDER BY sl.quantity ASC
      LIMIT ${MAX_AUTO_TRANSFER_ITEMS}
    `;

    if (lowStockRows.length === 0) {
      throw new BadRequestException('No low stock items found');
    }

    const productIds = [...new Set(lowStockRows.map((r) => r.product_id))];
    const variantIds = [
      ...new Set(lowStockRows.map((r) => r.variant_id).filter(Boolean)),
    ] as string[];
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true, name: true },
      }),
      variantIds.length
        ? this.prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { businessId } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as Array<{ id: string; name: string }>),
    ]);
    const productName = new Map(products.map((p) => [p.id, p.name]));
    const variantName = new Map(variants.map((v) => [v.id, v.name]));

    const transfer = await this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.documentNumbers.next(tx, businessId, 'TRF');
      return tx.stockTransfer.create({
        data: {
          businessId,
          transferNumber,
          sourceOutletId,
          destinationOutletId: outletId,
          status: 'pending',
          notes: 'Auto-generated transfer request for low stock items',
          items: {
            create: lowStockRows.map((sl) => {
              const base = productName.get(sl.product_id) ?? 'Unknown product';
              const variant = sl.variant_id ? variantName.get(sl.variant_id) : undefined;
              const missing = money(sl.low_stock_alert).minus(money(sl.quantity));
              return {
                productId: sl.product_id,
                variantId: sl.variant_id,
                itemName: variant ? `${base} - ${variant}` : base,
                quantitySent: Prisma.Decimal.max(missing, 1),
              };
            }),
          },
        },
      });
    });

    this.logger.log(
      `Auto transfer request created: ${transfer.transferNumber} with ${lowStockRows.length} items`,
    );

    return {
      transferId: transfer.id,
      itemCount: lowStockRows.length,
    };
  }

  /**
   * Bulk update products in a single transaction.
   */
  async bulkUpdateProducts(
    businessId: string,
    dto: BulkUpdateProductsDto,
  ): Promise<{ updated: number; failed: number }> {
    const { action } = dto;
    const productIds = this.uuidsOnly(dto.productIds);

    if (action === BulkUpdateAction.CATEGORY) {
      if (dto.categoryId) {
        if (!UUID_RE.test(dto.categoryId)) {
          throw new BadRequestException('categoryId must be a UUID');
        }
        await this.tenant.assertOwned('category', dto.categoryId, businessId);
      }
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { categoryId: dto.categoryId || null },
      });
      return { updated: result.count, failed: dto.productIds.length - result.count };
    }

    if (action === BulkUpdateAction.STATUS) {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { isActive: dto.isActive ?? true },
      });
      return { updated: result.count, failed: dto.productIds.length - result.count };
    }

    if (action === BulkUpdateAction.TRACK_STOCK) {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { trackStock: dto.trackStock ?? true },
      });
      return { updated: result.count, failed: dto.productIds.length - result.count };
    }

    // Price / cost price: one set-based UPDATE computed in SQL NUMERIC (no JS floats,
    // no read-then-write window). Selling prices round to whole rupiah, cost prices
    // keep their 2 decimals; results never go below 0.
    if (action === BulkUpdateAction.PRICE || action === BulkUpdateAction.COST_PRICE) {
      const { operation, priceType, value } = dto;
      if (!operation || !priceType || value === undefined) {
        throw new BadRequestException(
          'operation, priceType, and value are required for price updates',
        );
      }
      if (
        !['increase', 'decrease'].includes(operation) ||
        !['percentage', 'fixed'].includes(priceType)
      ) {
        throw new BadRequestException('Invalid operation or priceType');
      }
      if (productIds.length === 0) return { updated: 0, failed: dto.productIds.length };

      const sign = operation === 'increase' ? 1 : -1;
      const amount = money(value);
      const column =
        action === BulkUpdateAction.PRICE ? Prisma.raw('base_price') : Prisma.raw('cost_price');
      const scale = action === BulkUpdateAction.PRICE ? 0 : 2;
      const current =
        action === BulkUpdateAction.PRICE
          ? Prisma.sql`base_price`
          : Prisma.sql`COALESCE(cost_price, 0)`;
      const next =
        priceType === 'percentage'
          ? Prisma.sql`${current} * (1 + ${sign}::numeric * ${amount}::numeric / 100)`
          : Prisma.sql`${current} + ${sign}::numeric * ${amount}::numeric`;

      const updated = await this.prisma.$executeRaw`
        UPDATE products
        SET ${column} = GREATEST(0, ROUND(${next}, ${scale})), updated_at = NOW()
        WHERE business_id = ${businessId}::uuid
          AND id = ANY(${productIds}::uuid[])
      `;
      return { updated, failed: dto.productIds.length - updated };
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
    const { hardDelete } = dto;
    const productIds = this.uuidsOnly(dto.productIds);

    if (!hardDelete) {
      const result = await this.prisma.product.updateMany({
        where: { id: { in: productIds }, businessId },
        data: { isActive: false },
      });
      return { deleted: result.count };
    }

    // Hard delete: history check + delete in one transaction so a sale recorded
    // in between cannot be orphaned.
    const { deleted, images } = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true, imageUrl: true },
      });
      const ownedIds = owned.map((p) => p.id);
      if (ownedIds.length === 0) return { deleted: 0, images: [] as typeof owned };

      const withHistory = await tx.transactionItem.findMany({
        where: { productId: { in: ownedIds } },
        select: { productId: true },
        distinct: ['productId'],
      });
      if (withHistory.length > 0) {
        throw new BadRequestException(
          `${withHistory.length} produk memiliki riwayat transaksi dan tidak bisa dihapus permanen. Gunakan soft delete.`,
        );
      }

      const result = await tx.product.deleteMany({ where: { id: { in: ownedIds }, businessId } });
      return { deleted: result.count, images: owned };
    });

    // Clean up orphaned image files after the delete committed.
    for (const product of images) {
      if (!product.imageUrl) continue;
      const match = product.imageUrl.match(/images\/([^/]+)\//);
      if (!match) continue;
      const imageId = match[1];
      try {
        await this.storage.delete(`images/${imageId}/original.jpg`);
        await this.storage.delete(`images/${imageId}/thumbnail.jpg`);
        await this.storage.delete(`images/${imageId}/medium.jpg`);
        this.logger.log(`Deleted image files for product ${product.id}`);
      } catch (err) {
        // intentionally ignored: the product is already deleted; a leftover file is harmless
        this.logger.warn(`Failed to delete image for product ${product.id}: ${String(err)}`);
      }
    }

    return { deleted };
  }

  // ==================== Stock levels ====================

  /**
   * Stock rows of an outlet (product + variant labels). Plain capped array unless
   * page/limit is requested, then `{ data, total, page, limit, totalPages }`.
   */
  async listStockLevels(outletId: string, businessId: string, query: StockListQueryDto) {
    const where: Prisma.StockLevelWhereInput = { outletId, outlet: { businessId } };
    const wantsPage = query.page !== undefined || query.limit !== undefined;
    const page = wantsPage ? toPrismaPage(query) : { skip: 0, take: MAX_STOCK_ROWS };

    const [rows, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { updatedAt: 'desc' },
        ...page,
      }),
      wantsPage ? this.prisma.stockLevel.count({ where }) : Promise.resolve(0),
    ]);

    const data = rows.map((r) => ({ ...r, quantity: Number(r.quantity) }));
    if (!wantsPage) return data;
    return {
      data,
      total,
      page: query.page ?? 1,
      limit: page.take,
      totalPages: Math.max(1, Math.ceil(total / page.take)),
    };
  }

  /** Low-stock rows (quantity <= alert) with product/variant names, capped. */
  async listLowStock(outletId: string, businessId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        outlet_id: string;
        product_id: string | null;
        variant_id: string | null;
        quantity: Prisma.Decimal;
        low_stock_alert: number;
        updated_at: Date;
        product_name: string | null;
        product_sku: string | null;
        variant_name: string | null;
        variant_sku: string | null;
      }>
    >`
      SELECT sl.id, sl.outlet_id, sl.product_id, sl.variant_id, sl.quantity, sl.low_stock_alert,
             sl.updated_at, p.name AS product_name, p.sku AS product_sku,
             v.name AS variant_name, v.sku AS variant_sku
      FROM stock_levels sl
      JOIN outlets o ON o.id = sl.outlet_id
      LEFT JOIN products p ON p.id = sl.product_id
      LEFT JOIN product_variants v ON v.id = sl.variant_id
      WHERE sl.outlet_id = ${outletId}::uuid
        AND o.business_id = ${businessId}::uuid
        AND sl.quantity <= sl.low_stock_alert
      ORDER BY sl.quantity ASC
      LIMIT ${MAX_STOCK_ROWS}
    `;

    return rows.map((r) => ({
      id: r.id,
      outletId: r.outlet_id,
      productId: r.product_id,
      variantId: r.variant_id,
      quantity: Number(r.quantity),
      lowStockAlert: Number(r.low_stock_alert),
      updatedAt: r.updated_at,
      productName: r.product_name,
      sku: r.variant_sku ?? r.product_sku,
      product: r.product_id ? { id: r.product_id, name: r.product_name, sku: r.product_sku } : null,
      variant: r.variant_id ? { id: r.variant_id, name: r.variant_name, sku: r.variant_sku } : null,
    }));
  }

  private uuidsOnly(ids: readonly string[]): string[] {
    return [...new Set(ids.filter((id) => typeof id === 'string' && UUID_RE.test(id)))];
  }

  private async fetchProductsForExport(
    businessId: string,
    categoryId?: string,
  ): Promise<
    Array<{
      name: string;
      sku: string | null;
      categoryName: string | null;
      basePrice: string;
      costPrice: string | null;
      description: string | null;
      isActive: boolean;
    }>
  > {
    const products = await this.prisma.product.findMany({
      where: { businessId, ...(categoryId && { categoryId }) },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: MAX_EXPORT_ROWS,
    });

    return products.map((p) => ({
      name: p.name,
      sku: p.sku,
      categoryName: p.category?.name ?? null,
      basePrice: p.basePrice.toString(),
      costPrice: p.costPrice ? p.costPrice.toString() : null,
      description: p.description,
      isActive: p.isActive,
    }));
  }
}
