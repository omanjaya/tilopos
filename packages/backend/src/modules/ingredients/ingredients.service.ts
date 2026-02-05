import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// ==================== Types ====================

export interface IngredientImportItem {
  name: string;
  unit: string;
  costPerUnit?: number;
  minStockLevel?: number;
  supplierId?: string;
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

export type ExportFormat = 'csv' | 'json';

// ==================== Service ====================

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);
  private readonly DEFAULT_LEAD_TIME_DAYS = 3;
  private readonly CONSUMPTION_LOOKBACK_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CSV Parsing Helpers ====================

  /**
   * Parse CSV string into IngredientImportItem array.
   * Expects header row: name,unit,costPerUnit,sku,minStockLevel,supplierId
   */
  parseCsvToIngredientItems(csv: string): IngredientImportItem[] {
    const lines = csv
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const unitIdx = headers.indexOf('unit');
    const costIdx = headers.indexOf('costperunit');
    const skuIdx = headers.indexOf('sku');
    const minStockIdx = headers.indexOf('minstocklevel');
    const supplierIdx = headers.indexOf('supplierid');

    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const item: IngredientImportItem = {
        name: nameIdx >= 0 ? cols[nameIdx] : '',
        unit: unitIdx >= 0 ? cols[unitIdx] : '',
      };
      if (costIdx >= 0 && cols[costIdx]) {
        const parsed = parseFloat(cols[costIdx]);
        if (!isNaN(parsed)) item.costPerUnit = parsed;
      }
      if (skuIdx >= 0 && cols[skuIdx]) {
        item.sku = cols[skuIdx];
      }
      if (minStockIdx >= 0 && cols[minStockIdx]) {
        const parsed = parseFloat(cols[minStockIdx]);
        if (!isNaN(parsed)) item.minStockLevel = parsed;
      }
      if (supplierIdx >= 0 && cols[supplierIdx]) {
        item.supplierId = cols[supplierIdx];
      }
      return item;
    });
  }

  /**
   * Parse JSON string into IngredientImportItem array.
   */
  parseJsonToIngredientItems(json: string): IngredientImportItem[] {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON data must be an array');
    }
    return parsed as IngredientImportItem[];
  }

  /**
   * Import ingredients from CSV or JSON format.
   * Detects duplicates by name. Creates new, updates existing with matching names.
   * Returns count of created, updated, skipped.
   */
  async importIngredients(
    businessId: string,
    data: IngredientImportItem[] | string,
    format: ExportFormat = 'json',
  ): Promise<IngredientImportResult> {
    let items: IngredientImportItem[];

    if (typeof data === 'string') {
      items =
        format === 'csv'
          ? this.parseCsvToIngredientItems(data)
          : this.parseJsonToIngredientItems(data);
    } else {
      items = data;
    }

    const result: IngredientImportResult = {
      total: items.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Track names seen in this batch to detect duplicates within the import
    const seenNames = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Validate required fields
      if (!item.name || !item.unit) {
        result.errors.push({
          row: i + 1,
          name: item.name || 'unknown',
          error: 'Missing required fields: name and unit are required',
        });
        continue;
      }

      // Detect duplicate within the same import batch
      const normalizedName = item.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        result.skipped++;
        continue;
      }
      seenNames.add(normalizedName);

      try {
        // Check if ingredient already exists by name within business
        const existing = await this.prisma.ingredient.findFirst({
          where: { businessId, name: item.name },
        });

        if (existing) {
          // Update existing ingredient
          await this.prisma.ingredient.update({
            where: { id: existing.id },
            data: {
              unit: item.unit,
              ...(item.costPerUnit !== undefined && { costPerUnit: item.costPerUnit }),
              ...(item.sku !== undefined && { sku: item.sku }),
              isActive: true,
            },
          });
          result.updated++;
        } else {
          // Create new ingredient
          await this.prisma.ingredient.create({
            data: {
              businessId,
              name: item.name,
              unit: item.unit,
              costPerUnit: item.costPerUnit ?? 0,
              sku: item.sku,
            },
          });
          result.created++;
        }

        this.logger.debug(`Imported ingredient: ${item.name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          row: i + 1,
          name: item.name,
          error: message,
        });
      }
    }

    this.logger.log(
      `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
    );

    return result;
  }

  /**
   * Export all ingredients for a business in CSV or JSON format.
   * Optionally includes stock levels per outlet.
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
            stockLevels: outletId ? { where: { outletId } } : true,
          }
        : undefined,
      orderBy: { name: 'asc' },
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
          ing as { stockLevels?: { outletId: string; quantity: number; lowStockAlert: number }[] }
        ).stockLevels?.map((sl) => ({
          outletId: sl.outletId,
          quantity: Number(sl.quantity),
          lowStockAlert: Number(sl.lowStockAlert),
        })),
      }),
    }));

    if (format === 'csv') {
      return this.ingredientsToCsv(exportItems);
    }

    return exportItems;
  }

  /**
   * Convert ingredient export items to CSV string.
   */
  ingredientsToCsv(items: IngredientExportItem[]): string {
    const header = 'name,sku,unit,costPerUnit,isActive,createdAt';
    const rows = items.map((item) =>
      [
        item.name,
        item.sku ?? '',
        item.unit,
        item.costPerUnit,
        item.isActive,
        item.createdAt.toISOString(),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Get low stock alerts for an outlet.
   * Groups ingredients below min stock level and provides reorder suggestions
   * based on average daily consumption and lead time.
   */
  async getLowStockAlerts(
    outletId: string,
    customThreshold?: number,
  ): Promise<LowStockAlertItem[]> {
    // Verify outlet exists
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }

    // Get all ingredient stock levels for the outlet with ingredient info
    const stockLevels = await this.prisma.ingredientStockLevel.findMany({
      where: { outletId },
      include: { ingredient: true },
    });

    // Calculate lookback date for consumption data
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.CONSUMPTION_LOOKBACK_DAYS);

    // Get consumption movements for the lookback period
    const consumptionMovements = await this.prisma.ingredientStockMovement.findMany({
      where: {
        outletId,
        movementType: 'usage',
        createdAt: { gte: lookbackDate },
      },
    });

    // Build consumption map: ingredientId -> total consumed
    const consumptionMap = new Map<string, number>();
    for (const movement of consumptionMovements) {
      const current = consumptionMap.get(movement.ingredientId) || 0;
      consumptionMap.set(movement.ingredientId, current + Number(movement.quantity));
    }

    const alerts: LowStockAlertItem[] = [];

    for (const stock of stockLevels) {
      const currentQty = Number(stock.quantity);
      const minLevel = customThreshold ?? Number(stock.lowStockAlert);

      if (currentQty <= minLevel) {
        const totalConsumed = consumptionMap.get(stock.ingredientId) || 0;
        const avgDailyConsumption = totalConsumed / this.CONSUMPTION_LOOKBACK_DAYS;
        const leadTimeDays = this.DEFAULT_LEAD_TIME_DAYS;

        // Suggested reorder: enough to cover lead time + buffer to reach min stock
        const deficit = minLevel - currentQty;
        const leadTimeNeed = avgDailyConsumption * leadTimeDays;
        const suggestedQuantity = Math.max(
          Math.ceil(deficit + leadTimeNeed),
          Math.ceil(avgDailyConsumption * leadTimeDays * 2),
        );

        alerts.push({
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
        });
      }
    }

    // Sort by deficit descending (most urgent first)
    alerts.sort((a, b) => b.deficit - a.deficit);

    return alerts;
  }

  /**
   * Get recipe cost history.
   * Calculates the current cost of a recipe based on current ingredient costs,
   * and tracks historical cost snapshots from ingredient stock movements.
   */
  async getRecipeCostHistory(
    recipeId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    currentCost: RecipeCostSnapshot;
    history: RecipeCostSnapshot[];
  }> {
    // Get recipe with items and ingredients
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Calculate current cost
    const currentCost: RecipeCostSnapshot = {
      recipeId: recipe.id,
      productId: recipe.productId,
      date: new Date(),
      totalCost: 0,
      items: recipe.items.map((item) => {
        const costPerUnit = Number(item.ingredient.costPerUnit);
        const quantity = Number(item.quantity);
        const itemCost = costPerUnit * quantity;

        return {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient.name,
          quantity,
          unit: item.unit,
          costPerUnit,
          itemCost,
        };
      }),
    };
    currentCost.totalCost = currentCost.items.reduce((sum, item) => sum + item.itemCost, 0);

    // Build historical cost snapshots from purchase movements (cost changes)
    const ingredientIds = recipe.items.map((item) => item.ingredientId);

    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const purchaseMovements = await this.prisma.ingredientStockMovement.findMany({
      where: {
        ingredientId: { in: ingredientIds },
        movementType: 'purchase',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: 'asc' },
      include: { ingredient: true },
    });

    // Group movements by date (day granularity) to build cost snapshots
    const snapshotsByDate = new Map<string, RecipeCostSnapshot>();

    // Build a cost-per-unit timeline per ingredient
    const ingredientCostTimeline = new Map<string, Array<{ date: Date; costPerUnit: number }>>();
    for (const item of recipe.items) {
      ingredientCostTimeline.set(item.ingredientId, []);
    }

    for (const movement of purchaseMovements) {
      const timeline = ingredientCostTimeline.get(movement.ingredientId);
      if (timeline) {
        // Derive cost from movement: total cost / quantity
        const movementQty = Number(movement.quantity);
        if (movementQty > 0) {
          timeline.push({
            date: movement.createdAt,
            costPerUnit: Number(movement.ingredient.costPerUnit),
          });
        }
      }
    }

    // Generate snapshots for each unique date a purchase occurred
    const uniqueDates = new Set<string>();
    for (const movement of purchaseMovements) {
      const dateKey = movement.createdAt.toISOString().split('T')[0];
      uniqueDates.add(dateKey);
    }

    for (const dateKey of uniqueDates) {
      const snapshotDate = new Date(dateKey);

      const snapshot: RecipeCostSnapshot = {
        recipeId: recipe.id,
        productId: recipe.productId,
        date: snapshotDate,
        totalCost: 0,
        items: recipe.items.map((item) => {
          const timeline = ingredientCostTimeline.get(item.ingredientId) || [];
          // Find the latest cost on or before this date
          const applicableCosts = timeline.filter((entry) => entry.date <= snapshotDate);
          const latestCost =
            applicableCosts.length > 0
              ? applicableCosts[applicableCosts.length - 1].costPerUnit
              : Number(item.ingredient.costPerUnit);

          const quantity = Number(item.quantity);
          const itemCost = latestCost * quantity;

          return {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredient.name,
            quantity,
            unit: item.unit,
            costPerUnit: latestCost,
            itemCost,
          };
        }),
      };
      snapshot.totalCost = snapshot.items.reduce((sum, item) => sum + item.itemCost, 0);
      snapshotsByDate.set(dateKey, snapshot);
    }

    const history = Array.from(snapshotsByDate.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    return { currentCost, history };
  }
}
