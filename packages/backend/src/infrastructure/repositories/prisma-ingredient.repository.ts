import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  IIngredientRepository,
  IngredientRecord,
  IngredientStockLevelRecord,
  RecipeRecord,
  CreateIngredientData,
  UpdateIngredientData,
  CreateRecipeData,
  UpdateRecipeData,
  PartialIngredient,
  IngredientPage,
  StockAdjustmentParams,
  StockAdjustmentResult,
} from '../../domain/interfaces/repositories/ingredient.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumberRequired } from './decimal.helper';
import type { Ingredient, Recipe, RecipeItem } from '@prisma/client';

type RecipeWithItems = Recipe & { items: RecipeItem[] };
type Db = PrismaService | Prisma.TransactionClient;

/** Upper bound for list methods (R13). */
export const MAX_INGREDIENT_ROWS = 5000;

// Moved to the domain interface; re-exported for existing imports.
export type { IngredientPage, StockAdjustmentParams, StockAdjustmentResult };

const PARTIAL_INGREDIENT_SELECT = { id: true, name: true, sku: true, unit: true } as const;

/**
 * Ingredient persistence. Every method that takes a client-supplied id is scoped by the
 * caller's business (R3); `businessId` is required (and re-checked at runtime).
 */
@Injectable()
export class PrismaIngredientRepository implements IIngredientRepository {
  constructor(private readonly prisma: PrismaService) {}

  private requireBusiness(businessId: string | undefined): string {
    if (!businessId) throw new Error('PrismaIngredientRepository: businessId is required');
    return businessId;
  }

  // ==================== Ingredient CRUD ====================

  async findById(id: string, businessId: string): Promise<IngredientRecord | null> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, businessId: this.requireBusiness(businessId) },
    });
    return ingredient ? this.toIngredientRecord(ingredient) : null;
  }

  async findByBusiness(
    businessId: string,
    activeOnly = true,
    page: IngredientPage = {},
  ): Promise<IngredientRecord[]> {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { businessId, ...(activeOnly && { isActive: true }) },
      orderBy: { name: 'asc' },
      skip: page.skip,
      take: page.take ?? MAX_INGREDIENT_ROWS,
    });
    return ingredients.map((i) => this.toIngredientRecord(i));
  }

  async findBySKU(businessId: string, sku: string): Promise<IngredientRecord | null> {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { businessId, sku } });
    return ingredient ? this.toIngredientRecord(ingredient) : null;
  }

  async create(data: CreateIngredientData): Promise<IngredientRecord> {
    const created = await this.prisma.ingredient.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        costPerUnit: data.costPerUnit ?? 0,
        imageUrl: data.imageUrl,
      },
    });
    return this.toIngredientRecord(created);
  }

  async update(
    id: string,
    data: UpdateIngredientData,
    businessId: string,
  ): Promise<IngredientRecord> {
    const scope = { id, businessId: this.requireBusiness(businessId) };
    const result = await this.prisma.ingredient.updateMany({
      where: scope,
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.costPerUnit !== undefined && { costPerUnit: data.costPerUnit }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    if (result.count === 0) throw new NotFoundException('Ingredient not found');
    const updated = await this.prisma.ingredient.findFirstOrThrow({ where: scope });
    return this.toIngredientRecord(updated);
  }

  async delete(id: string, businessId: string): Promise<void> {
    const result = await this.prisma.ingredient.updateMany({
      where: { id, businessId: this.requireBusiness(businessId) },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Ingredient not found');
  }

  // ==================== Stock Level ====================

  async getStockLevelsByOutlet(
    outletId: string,
    businessId: string,
    page: IngredientPage = {},
  ): Promise<Array<IngredientStockLevelRecord & { ingredient?: PartialIngredient }>> {
    const stocks = await this.prisma.ingredientStockLevel.findMany({
      where: {
        outletId,
        ingredient: { businessId: this.requireBusiness(businessId) },
      },
      include: { ingredient: { select: PARTIAL_INGREDIENT_SELECT } },
      orderBy: { ingredient: { name: 'asc' } },
      skip: page.skip,
      take: page.take ?? MAX_INGREDIENT_ROWS,
    });
    return stocks.map((stock) => ({ ...this.toStockRecord(stock), ingredient: stock.ingredient }));
  }

  /** Rows with quantity <= low_stock_alert, filtered in SQL (not in JS), capped. */
  async getLowStock(
    outletId: string,
    businessId: string,
  ): Promise<Array<IngredientStockLevelRecord & { ingredient: PartialIngredient }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        outlet_id: string;
        ingredient_id: string;
        quantity: Prisma.Decimal;
        low_stock_alert: Prisma.Decimal;
        updated_at: Date;
        name: string;
        sku: string | null;
        unit: string;
      }>
    >`
      SELECT sl.id, sl.outlet_id, sl.ingredient_id, sl.quantity, sl.low_stock_alert, sl.updated_at,
             i.name, i.sku, i.unit
      FROM ingredient_stock_levels sl
      JOIN ingredients i ON i.id = sl.ingredient_id
      WHERE sl.outlet_id = ${outletId}::uuid
        AND i.business_id = ${this.requireBusiness(businessId)}::uuid
        AND sl.quantity <= sl.low_stock_alert
      ORDER BY sl.quantity ASC
      LIMIT ${MAX_INGREDIENT_ROWS}
    `;
    return rows.map((r) => ({
      id: r.id,
      outletId: r.outlet_id,
      ingredientId: r.ingredient_id,
      quantity: Number(r.quantity),
      lowStockAlert: Number(r.low_stock_alert),
      updatedAt: r.updated_at,
      ingredient: { id: r.ingredient_id, name: r.name, sku: r.sku, unit: r.unit },
    }));
  }

  /**
   * @deprecated Absolute writes lose concurrent changes (R9); use `applyStockAdjustment`.
   * Kept for interface compatibility; ownership of ingredient and outlet is verified.
   */
  async updateStockLevel(
    outletId: string,
    ingredientId: string,
    quantity: number,
    businessId: string,
  ): Promise<IngredientStockLevelRecord> {
    await this.assertIngredientAndOutlet(
      this.prisma,
      this.requireBusiness(businessId),
      outletId,
      ingredientId,
    );
    const updated = await this.prisma.ingredientStockLevel.upsert({
      where: { outletId_ingredientId: { outletId, ingredientId } },
      create: { outletId, ingredientId, quantity },
      update: { quantity },
    });
    return this.toStockRecord(updated);
  }

  /** Interface form of `applyStockAdjustment` (manual adjustment movement). */
  async adjustStock(
    outletId: string,
    ingredientId: string,
    quantity: number,
    referenceId: string | undefined,
    referenceType: string | undefined,
    notes: string | undefined,
    businessId: string,
  ): Promise<void> {
    await this.applyStockAdjustment({
      businessId: this.requireBusiness(businessId),
      outletId,
      ingredientId,
      quantity,
      referenceId,
      referenceType,
      notes,
    });
  }

  /**
   * Atomic stock adjustment (R9): in ONE transaction the ingredient and outlet are checked
   * against the business, the row is created if missing and incremented, or decremented
   * only when enough stock exists (`quantity >= n`, otherwise 400), and the movement is
   * written. No absolute read-modify-write.
   */
  async applyStockAdjustment(
    params: StockAdjustmentParams,
    tx?: Prisma.TransactionClient,
  ): Promise<StockAdjustmentResult> {
    if (!Number.isFinite(params.quantity) || params.quantity === 0) {
      throw new BadRequestException('Quantity must be a non-zero number');
    }
    const run = async (db: Prisma.TransactionClient): Promise<StockAdjustmentResult> => {
      await this.assertIngredientAndOutlet(
        db,
        params.businessId,
        params.outletId,
        params.ingredientId,
      );
      const key = { outletId: params.outletId, ingredientId: params.ingredientId };
      const amount = new Prisma.Decimal(params.quantity).abs();

      let level;
      if (params.quantity > 0) {
        level = await db.ingredientStockLevel.upsert({
          where: { outletId_ingredientId: key },
          create: { ...key, quantity: amount },
          update: { quantity: { increment: amount } },
        });
      } else {
        const result = await db.ingredientStockLevel.updateMany({
          where: { ...key, quantity: { gte: amount } },
          data: { quantity: { decrement: amount } },
        });
        if (result.count === 0) {
          throw new BadRequestException('Insufficient stock for this operation');
        }
        level = await db.ingredientStockLevel.findUniqueOrThrow({
          where: { outletId_ingredientId: key },
        });
      }

      const signed = new Prisma.Decimal(params.quantity);
      await db.ingredientStockMovement.create({
        data: {
          ...key,
          movementType: params.movementType ?? 'adjustment',
          quantity: signed,
          referenceId: params.referenceId ?? null,
          referenceType: params.referenceType ?? null,
          notes: params.notes ?? null,
          createdBy: params.createdBy ?? null,
        },
      });

      return {
        stockLevelId: level.id,
        previousQuantity: level.quantity.minus(signed).toNumber(),
        newQuantity: level.quantity.toNumber(),
      };
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  private async assertIngredientAndOutlet(
    db: Db,
    businessId: string,
    outletId: string,
    ingredientId: string,
  ): Promise<void> {
    const [ingredient, outlet] = await Promise.all([
      db.ingredient.count({ where: { id: ingredientId, businessId } }),
      db.outlet.count({ where: { id: outletId, businessId } }),
    ]);
    if (ingredient === 0) throw new NotFoundException('Ingredient not found');
    if (outlet === 0) throw new NotFoundException('Outlet not found');
  }

  // ==================== Recipe ====================

  async findRecipeById(id: string, businessId: string): Promise<RecipeRecord | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, product: { businessId: this.requireBusiness(businessId) } },
      include: { items: true },
    });
    return recipe ? this.toRecipeRecord(recipe) : null;
  }

  /**
   * Recipes of a product in the business. `variantId` undefined = all recipes of the
   * product; `null` = only the base recipe; a string = only that variant's recipe.
   */
  async findRecipesByProduct(
    productId: string,
    variantId: string | null | undefined,
    businessId: string,
  ): Promise<RecipeRecord[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        productId,
        product: { businessId: this.requireBusiness(businessId) },
        ...(variantId !== undefined && { variantId }),
      },
      include: { items: true },
      take: 100,
    });
    return recipes.map((r) => this.toRecipeRecord(r));
  }

  /** Nested create: recipe and items are one statement. Callers verify all ids first. */
  async createRecipe(data: CreateRecipeData): Promise<RecipeRecord> {
    const created = await this.prisma.recipe.create({
      data: {
        productId: data.productId,
        variantId: data.variantId,
        notes: data.notes,
        items: { create: data.items },
      },
      include: { items: true },
    });
    return this.toRecipeRecord(created);
  }

  /** Replaces items and notes in one transaction, scoped to the business. */
  async updateRecipe(
    id: string,
    data: UpdateRecipeData,
    businessId: string,
  ): Promise<RecipeRecord> {
    const scopedBusiness = this.requireBusiness(businessId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.recipe.count({
        where: { id, product: { businessId: scopedBusiness } },
      });
      if (owned === 0) throw new NotFoundException('Recipe not found');
      return tx.recipe.update({
        where: { id },
        data: {
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.items && { items: { deleteMany: {}, create: data.items } }),
        },
        include: { items: true },
      });
    });
    return this.toRecipeRecord(updated);
  }

  async deleteRecipe(id: string, businessId: string): Promise<void> {
    const result = await this.prisma.recipe.deleteMany({
      where: { id, product: { businessId: this.requireBusiness(businessId) } },
    });
    if (result.count === 0) throw new NotFoundException('Recipe not found');
  }

  async findRecipesByIngredient(ingredientId: string, businessId: string): Promise<RecipeRecord[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        items: { some: { ingredientId } },
        product: { businessId: this.requireBusiness(businessId) },
      },
      include: { items: true },
      take: 100,
    });
    return recipes.map((r) => this.toRecipeRecord(r));
  }

  // ==================== Mappers ====================

  private toStockRecord(stock: {
    id: string;
    outletId: string;
    ingredientId: string;
    quantity: Prisma.Decimal;
    lowStockAlert: Prisma.Decimal;
    updatedAt: Date;
  }): IngredientStockLevelRecord {
    return {
      id: stock.id,
      outletId: stock.outletId,
      ingredientId: stock.ingredientId,
      quantity: stock.quantity.toNumber(),
      lowStockAlert: stock.lowStockAlert.toNumber(),
      updatedAt: stock.updatedAt,
    };
  }

  private toIngredientRecord(ingredient: Ingredient): IngredientRecord {
    return {
      id: ingredient.id,
      businessId: ingredient.businessId,
      name: ingredient.name,
      sku: ingredient.sku,
      unit: ingredient.unit,
      costPerUnit: decimalToNumberRequired(ingredient.costPerUnit),
      imageUrl: ingredient.imageUrl,
      isActive: ingredient.isActive,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    };
  }

  private toRecipeRecord(recipe: RecipeWithItems): RecipeRecord {
    return {
      id: recipe.id,
      productId: recipe.productId,
      variantId: recipe.variantId,
      notes: recipe.notes,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      items: recipe.items.map((item) => ({
        id: item.id,
        recipeId: item.recipeId,
        ingredientId: item.ingredientId,
        quantity: item.quantity.toNumber(),
        unit: item.unit,
        createdAt: item.createdAt,
      })),
    };
  }
}
