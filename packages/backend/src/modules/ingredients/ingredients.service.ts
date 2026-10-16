import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { csvRow } from '../../infrastructure/import/csv.util';
import { addBusinessDays, startOfBusinessDay } from '../../shared/utils/business-time';
import { money, sumMoney } from '../../shared/utils/money';

// ==================== Types ====================

export interface IngredientImportItem {
  name: string;
  unit: string;
  costPerUnit?: number;
  sku?: string;
}

export interface IngredientImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

export interface IngredientExportItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  costPerUnit: number;
  isActive: boolean;
  createdAt: Date;
  stockLevels?: Array<{
    outletId: string;
    quantity: number;
    lowStockAlert: number;
  }>;
}

export interface LowStockAlertItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  outletId: string;
  currentStock: number;
  minStockLevel: number;
  deficit: number;
  reorderSuggestion: {
    suggestedQuantity: number;
    basedOnAvgDailyConsumption: number;
    leadTimeDays: number;
  };
}

export interface RecipeCostSnapshot {
  recipeId: string;
  productId: string;
  date: Date;
  totalCost: number;
  items: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    itemCost: number;
  }>;
}

export interface RecipeCostResult {
  currentCost: RecipeCostSnapshot;
  /**
   * Always empty: ingredient cost changes are not versioned, so any past snapshot would
   * be fabricated from today's cost. See `historyAvailable`.
   */
  history: RecipeCostSnapshot[];
  historyAvailable: false;
  historyNote: string;
}

export type ExportFormat = 'csv' | 'json';

/** Caps (R13). */
const MAX_EXPORT_ROWS = 10000;
const MAX_ALERT_ROWS = 5000;

// ==================== Service ====================

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);
  private readonly DEFAULT_LEAD_TIME_DAYS = 3;
  private readonly CONSUMPTION_LOOKBACK_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import ingredients (already-parsed rows, max 1000 via DTO). Duplicates are matched by
   * name (case-insensitive) within the business. Everything is validated first, existing
   * names/SKUs are loaded with one query each, and all writes run in ONE transaction.
   */
  async importIngredients(
    businessId: string,
    items: IngredientImportItem[],
  ): Promise<IngredientImportResult> {
    const result: IngredientImportResult = {
      total: items.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const rows: Array<{ row: number; item: IngredientImportItem; key: string }> = [];
    const seen = new Set<string>();
    items.forEach((item, i) => {
      const name = item.name?.trim();
      if (!name || !item.unit?.trim()) {
        result.errors.push({
          row: i + 1,
          name: item.name || 'unknown',
          error: 'Missing required fields: name and unit are required',
        });
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        result.skipped++;
        return;
      }
      seen.add(key);
      rows.push({ row: i + 1, item: { ...item, name, unit: item.unit.trim() }, key });
    });
    if (rows.length === 0) return result;

    await this.prisma.$transaction(
      async (tx) => {
        // Serialise imports per business so two concurrent imports cannot create duplicates.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ingredient-import:${businessId}`}))`;

        const existing = await tx.ingredient.findMany({
          where: {
            businessId,
            OR: rows.map((r) => ({ name: { equals: r.item.name, mode: 'insensitive' as const } })),
          },
          select: { id: true, name: true, sku: true },
        });
        const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e]));

        const skus = rows.map((r) => r.item.sku).filter((s): s is string => !!s);
        const skuOwners = skus.length
          ? await tx.ingredient.findMany({
              where: { businessId, sku: { in: skus } },
              select: { id: true, sku: true },
            })
          : [];
        const skuOwner = new Map(skuOwners.map((s) => [s.sku, s.id]));

        const toCreate: Prisma.IngredientCreateManyInput[] = [];
        const toUpdate: Array<{ id: string; item: IngredientImportItem }> = [];
        const skusInBatch = new Set<string>();

        for (const { row, item, key } of rows) {
          const match = byName.get(key);
          if (item.sku) {
            const owner = skuOwner.get(item.sku);
            if ((owner && owner !== match?.id) || skusInBatch.has(item.sku)) {
              result.errors.push({
                row,
                name: item.name,
                error: `SKU "${item.sku}" is already used`,
              });
              continue;
            }
            skusInBatch.add(item.sku);
          }
          if (match) {
            toUpdate.push({ id: match.id, item });
          } else {
            toCreate.push({
              businessId,
              name: item.name,
              unit: item.unit,
              costPerUnit: money(item.costPerUnit ?? 0),
              sku: item.sku ?? null,
            });
          }
        }

        if (toCreate.length > 0) {
          await tx.ingredient.createMany({ data: toCreate });
        }
        for (const { id, item } of toUpdate) {
          await tx.ingredient.updateMany({
            where: { id, businessId },
            data: {
              unit: item.unit,
              ...(item.costPerUnit !== undefined && { costPerUnit: money(item.costPerUnit) }),
              ...(item.sku !== undefined && { sku: item.sku }),
              isActive: true,
            },
          });
        }
        result.created = toCreate.length;
        result.updated = toUpdate.length;
      },
      { timeout: 60_000 },
    );

    result.errors.sort((a, b) => a.row - b.row);
    this.logger.log(
      `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
    );
    return result;
  }

  /**
   * Export ingredients (capped) as CSV or JSON, optionally with stock levels.
   * `outletId` must already be verified to belong to `businessId`.
   */
  async exportIngredients(
    businessId: string,
    format: ExportFormat = 'json',
    outletId?: string,
    includeStock = false,
  ): Promise<IngredientExportItem[] | string> {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { businessId },
      include: includeStock
        ? {
            stockLevels: outletId ? { where: { outletId } } : { where: { outlet: { businessId } } },
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: MAX_EXPORT_ROWS,
    });

    const exportItems: IngredientExportItem[] = ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      sku: ing.sku,
      unit: ing.unit,
      costPerUnit: Number(ing.costPerUnit),
      isActive: ing.isActive,
      createdAt: ing.createdAt,
      ...(includeStock && {
        stockLevels: (
          ing as {
            stockLevels?: {
              outletId: string;
              quantity: Prisma.Decimal;
              lowStockAlert: Prisma.Decimal;
            }[];
          }
        ).stockLevels?.map((sl) => ({
          outletId: sl.outletId,
          quantity: Number(sl.quantity),
          lowStockAlert: Number(sl.lowStockAlert),
        })),
      }),
    }));

    return format === 'csv' ? this.ingredientsToCsv(exportItems) : exportItems;
  }

  /** CSV with proper quoting and spreadsheet formula-injection neutralisation. */
  ingredientsToCsv(items: IngredientExportItem[]): string {
    const header = 'name,sku,unit,costPerUnit,isActive,createdAt';
    const rows = items.map((item) =>
      csvRow([
        item.name,
        item.sku ?? '',
        item.unit,
        item.costPerUnit,
        item.isActive,
        item.createdAt.toISOString(),
      ]),
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Low-stock alerts for an outlet of `businessId` (verified by the caller) with reorder
   * suggestions from the average daily usage over the last 30 business days.
   */
  async getLowStockAlerts(
    businessId: string,
    outletId: string,
    customThreshold?: number,
  ): Promise<LowStockAlertItem[]> {
    const outlet = await this.prisma.outlet.count({ where: { id: outletId, businessId } });
    if (outlet === 0) throw new NotFoundException('Outlet not found');

    // Filter in SQL: either the per-row alert level or the custom threshold.
    const stockLevels =
      customThreshold !== undefined
        ? await this.prisma.ingredientStockLevel.findMany({
            where: {
              outletId,
              ingredient: { businessId },
              quantity: { lte: customThreshold },
            },
            include: { ingredient: { select: { name: true, unit: true } } },
            take: MAX_ALERT_ROWS,
          })
        : (
            await this.prisma.$queryRaw<
              Array<{
                ingredient_id: string;
                outlet_id: string;
                quantity: Prisma.Decimal;
                low_stock_alert: Prisma.Decimal;
                name: string;
                unit: string;
              }>
            >`
              SELECT sl.ingredient_id, sl.outlet_id, sl.quantity, sl.low_stock_alert, i.name, i.unit
              FROM ingredient_stock_levels sl
              JOIN ingredients i ON i.id = sl.ingredient_id
              WHERE sl.outlet_id = ${outletId}::uuid
                AND i.business_id = ${businessId}::uuid
                AND sl.quantity <= sl.low_stock_alert
              LIMIT ${MAX_ALERT_ROWS}
            `
          ).map((r) => ({
            ingredientId: r.ingredient_id,
            outletId: r.outlet_id,
            quantity: new Prisma.Decimal(r.quantity),
            lowStockAlert: new Prisma.Decimal(r.low_stock_alert),
            ingredient: { name: r.name, unit: r.unit },
          }));

    if (stockLevels.length === 0) return [];

    // Usage totals per ingredient, aggregated in the database.
    const lookbackDate = startOfBusinessDay(
      addBusinessDays(new Date(), -this.CONSUMPTION_LOOKBACK_DAYS),
    );
    const usage = await this.prisma.ingredientStockMovement.groupBy({
      by: ['ingredientId'],
      where: {
        outletId,
        movementType: 'usage',
        createdAt: { gte: lookbackDate },
        ingredientId: { in: stockLevels.map((s) => s.ingredientId) },
      },
      _sum: { quantity: true },
    });
    // Usage is stored as negative quantities by sales; take the magnitude.
    const consumptionMap = new Map(
      usage.map((u) => [u.ingredientId, Math.abs(Number(u._sum.quantity ?? 0))]),
    );

    const alerts: LowStockAlertItem[] = stockLevels.map((stock) => {
      const currentQty = Number(stock.quantity);
      const minLevel = customThreshold ?? Number(stock.lowStockAlert);
      const avgDailyConsumption =
        (consumptionMap.get(stock.ingredientId) ?? 0) / this.CONSUMPTION_LOOKBACK_DAYS;
      const leadTimeDays = this.DEFAULT_LEAD_TIME_DAYS;
      const deficit = minLevel - currentQty;
      const suggestedQuantity = Math.max(
        Math.ceil(deficit + avgDailyConsumption * leadTimeDays),
        Math.ceil(avgDailyConsumption * leadTimeDays * 2),
      );

      return {
        ingredientId: stock.ingredientId,
        ingredientName: stock.ingredient.name,
        unit: stock.ingredient.unit,
        outletId: stock.outletId,
        currentStock: currentQty,
        minStockLevel: minLevel,
        deficit,
        reorderSuggestion: {
          suggestedQuantity: suggestedQuantity > 0 ? suggestedQuantity : 1,
          basedOnAvgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
          leadTimeDays,
        },
      };
    });

    alerts.sort((a, b) => b.deficit - a.deficit);
    return alerts;
  }

  /**
   * Current recipe cost from current ingredient costs (Decimal arithmetic).
   *
   * Historical snapshots are NOT returned: ingredient cost changes are not versioned
   * (no cost history per purchase), so the previous implementation fabricated "history"
   * from today's cost. `historyAvailable: false` says so explicitly.
   */
  async getRecipeCostHistory(recipeId: string, businessId: string): Promise<RecipeCostResult> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, product: { businessId } },
      include: {
        items: { include: { ingredient: { select: { name: true, costPerUnit: true } } } },
      },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const items = recipe.items.map((item) => {
      const itemCost = money(item.ingredient.costPerUnit).times(item.quantity);
      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        costPerUnit: Number(item.ingredient.costPerUnit),
        itemCost,
      };
    });

    return {
      currentCost: {
        recipeId: recipe.id,
        productId: recipe.productId,
        date: new Date(),
        totalCost: sumMoney(items.map((i) => i.itemCost))
          .toDecimalPlaces(2)
          .toNumber(),
        items: items.map((i) => ({ ...i, itemCost: i.itemCost.toDecimalPlaces(4).toNumber() })),
      },
      history: [],
      historyAvailable: false,
      historyNote: 'Ingredient cost changes are not versioned; only the current cost is available.',
    };
  }
}
