import { Injectable } from '@nestjs/common';
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
} from '../../domain/interfaces/repositories/ingredient.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumberRequired } from './decimal.helper';
import type { Ingredient, Recipe, RecipeItem } from '@prisma/client';

type RecipeWithItems = Recipe & { items: RecipeItem[] };

@Injectable()
export class PrismaIngredientRepository implements IIngredientRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Ingredient CRUD ====================

  async findById(id: string): Promise<IngredientRecord | null> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      return null;
    }

    return this.toIngredientRecord(ingredient);
  }

  async findByBusiness(businessId: string, activeOnly = true): Promise<IngredientRecord[]> {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { businessId, ...(activeOnly && { isActive: true }) },
      orderBy: { name: 'asc' },
    });

    return ingredients.map((i) => this.toIngredientRecord(i));
  }

  async findBySKU(businessId: string, sku: string): Promise<IngredientRecord | null> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { businessId, sku },
    });

    if (!ingredient) {
      return null;
    }

    return this.toIngredientRecord(ingredient);
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

  async update(id: string, data: UpdateIngredientData): Promise<IngredientRecord> {
    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.costPerUnit !== undefined && { costPerUnit: data.costPerUnit }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.toIngredientRecord(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ingredient.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== Stock Level ====================

  async getStockLevel(
    outletId: string,
    ingredientId: string,
  ): Promise<IngredientStockLevelRecord | null> {
    const stock = await this.prisma.ingredientStockLevel.findUnique({
      where: {
        outletId_ingredientId: {
          outletId,
          ingredientId,
        },
      },
    });

    if (!stock) {
      return null;
    }

    return {
      id: stock.id,
      outletId: stock.outletId,
      ingredientId: stock.ingredientId,
      quantity: stock.quantity.toNumber(),
      lowStockAlert: stock.lowStockAlert.toNumber(),
      updatedAt: stock.updatedAt,
    };
  }

  async getStockLevelsByOutlet(
    outletId: string,
  ): Promise<Array<IngredientStockLevelRecord & { ingredient?: PartialIngredient }>> {
    const stocks = await this.prisma.ingredientStockLevel.findMany({
      where: { outletId },
      include: { ingredient: true },
    });

    return stocks.map((stock) => ({
      id: stock.id,
      outletId: stock.outletId,
      ingredientId: stock.ingredientId,
      quantity: stock.quantity.toNumber(),
      lowStockAlert: stock.lowStockAlert.toNumber(),
      updatedAt: stock.updatedAt,
      ingredient: stock.ingredient ? this.toPartialIngredient(stock.ingredient) : undefined,
    }));
  }

  async getLowStock(
    outletId: string,
  ): Promise<Array<IngredientStockLevelRecord & { ingredient: PartialIngredient }>> {
    const stocks = await this.prisma.ingredientStockLevel.findMany({
      where: { outletId },
      include: { ingredient: true },
    });

    // Filter stocks where quantity <= lowStockAlert
    return stocks
      .filter((stock) => stock.quantity.toNumber() <= stock.lowStockAlert.toNumber())
      .map((stock) => ({
        id: stock.id,
        outletId: stock.outletId,
        ingredientId: stock.ingredientId,
        quantity: stock.quantity.toNumber(),
        lowStockAlert: stock.lowStockAlert.toNumber(),
        updatedAt: stock.updatedAt,
        ingredient: this.toPartialIngredient(stock.ingredient),
      }));
  }

  async updateStockLevel(
    outletId: string,
    ingredientId: string,
    quantity: number,
  ): Promise<IngredientStockLevelRecord> {
    const updated = await this.prisma.ingredientStockLevel.upsert({
      where: {
        outletId_ingredientId: {
          outletId,
          ingredientId,
        },
      },
      create: {
        outletId,
        ingredientId,
        quantity,
      },
      update: {
        quantity,
      },
    });

    return {
      id: updated.id,
      outletId: updated.outletId,
      ingredientId: updated.ingredientId,
      quantity: updated.quantity.toNumber(),
      lowStockAlert: updated.lowStockAlert.toNumber(),
      updatedAt: updated.updatedAt,
    };
  }

  async adjustStock(
    outletId: string,
    ingredientId: string,
    quantity: number,
    referenceId?: string,
    referenceType?: string,
    notes?: string,
  ): Promise<void> {
    // Get current stock
    const current = await this.getStockLevel(outletId, ingredientId);
    const currentQty = current ? current.quantity : 0;
    const newQty = currentQty + quantity;

    // Update stock level
    await this.updateStockLevel(outletId, ingredientId, newQty);

    // Create movement record
    await this.prisma.ingredientStockMovement.create({
      data: {
        outletId,
        ingredientId,
        movementType: quantity >= 0 ? 'purchase' : 'usage',
        quantity: Math.abs(quantity),
        referenceId,
        referenceType,
        notes,
      },
    });
  }

  // ==================== Recipe ====================

  async findRecipeById(id: string): Promise<RecipeRecord | null> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!recipe) {
      return null;
    }

    return this.toRecipeRecord(recipe);
  }

  async findRecipesByProduct(productId: string, variantId?: string): Promise<RecipeRecord[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        productId,
        ...(variantId !== undefined && { variantId }),
      },
      include: { items: true },
    });

    return recipes.map((r) => this.toRecipeRecord(r));
  }

  async createRecipe(data: CreateRecipeData): Promise<RecipeRecord> {
    const created = await this.prisma.recipe.create({
      data: {
        productId: data.productId,
        variantId: data.variantId,
        notes: data.notes,
        items: {
          create: data.items,
        },
      },
      include: { items: true },
    });

    return this.toRecipeRecord(created);
  }

  async updateRecipe(id: string, data: UpdateRecipeData): Promise<RecipeRecord> {
    // If items are provided, replace existing items
    if (data.items) {
      await this.prisma.recipeItem.deleteMany({
        where: { recipeId: id },
      });
    }

    const updated = await this.prisma.recipe.update({
      where: { id },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.items && {
          items: {
            create: data.items,
          },
        }),
      },
      include: { items: true },
    });

    return this.toRecipeRecord(updated);
  }

  async deleteRecipe(id: string): Promise<void> {
    await this.prisma.recipe.delete({
      where: { id },
    });
  }

  async findRecipesByIngredient(ingredientId: string): Promise<RecipeRecord[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        items: {
          some: {
            ingredientId,
          },
        },
      },
      include: { items: true },
    });

    return recipes.map((r) => this.toRecipeRecord(r));
  }

  // ==================== Mappers ====================

  private toPartialIngredient(ingredient: Ingredient): PartialIngredient {
    return {
      id: ingredient.id,
      name: ingredient.name,
      sku: ingredient.sku,
      unit: ingredient.unit,
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
