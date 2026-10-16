export type IngredientRecord = {
  id: string;
  businessId: string;
  name: string;
  sku: string | null;
  unit: string;
  costPerUnit: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PartialIngredient = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
};

export type IngredientStockLevelRecord = {
  id: string;
  outletId: string;
  ingredientId: string;
  quantity: number;
  lowStockAlert: number;
  updatedAt: Date;
};
export type RecipeRecord = {
  id: string;
  productId: string;
  variantId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: RecipeItemRecord[];
};
export type RecipeItemRecord = {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  createdAt: Date;
};

export interface CreateIngredientData {
  businessId: string;
  name: string;
  sku?: string | null;
  unit: string;
  costPerUnit?: number;
  imageUrl?: string | null;
}

export interface UpdateIngredientData {
  name?: string;
  sku?: string | null;
  unit?: string;
  costPerUnit?: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface CreateRecipeData {
  productId: string;
  variantId?: string | null;
  notes?: string | null;
  items: {
    ingredientId: string;
    quantity: number;
    unit: string;
  }[];
}

export interface UpdateRecipeData {
  notes?: string | null;
  items?: {
    ingredientId: string;
    quantity: number;
    unit: string;
  }[];
}

export interface IngredientPage {
  skip?: number;
  take?: number;
}

export type IngredientMovementType =
  | 'purchase'
  | 'usage'
  | 'adjustment'
  | 'waste'
  | 'transfer_in'
  | 'transfer_out';

export interface StockAdjustmentParams {
  businessId: string;
  /** Must already be verified to belong to `businessId`. */
  outletId: string;
  ingredientId: string;
  /** Signed: positive adds stock, negative deducts it. Never 0. */
  quantity: number;
  movementType?: IngredientMovementType;
  referenceId?: string | null;
  referenceType?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface StockAdjustmentResult {
  stockLevelId: string;
  previousQuantity: number;
  newQuantity: number;
}

/** Opaque transaction handle (Prisma.TransactionClient in the Prisma implementation). */
export type IngredientTx = unknown;

/**
 * Ingredient persistence. Every method that takes a client-supplied id is tenant scoped (R3):
 * `businessId` is required and ids of other businesses resolve to nothing / NotFound.
 */
export interface IIngredientRepository {
  // Ingredient CRUD
  findById(id: string, businessId: string): Promise<IngredientRecord | null>;
  findByBusiness(
    businessId: string,
    activeOnly?: boolean,
    page?: IngredientPage,
  ): Promise<IngredientRecord[]>;
  findBySKU(businessId: string, sku: string): Promise<IngredientRecord | null>;
  create(data: CreateIngredientData): Promise<IngredientRecord>;
  update(id: string, data: UpdateIngredientData, businessId: string): Promise<IngredientRecord>;
  delete(id: string, businessId: string): Promise<void>;

  // Stock Level
  getStockLevelsByOutlet(
    outletId: string,
    businessId: string,
    page?: IngredientPage,
  ): Promise<Array<IngredientStockLevelRecord & { ingredient?: PartialIngredient }>>;
  getLowStock(
    outletId: string,
    businessId: string,
  ): Promise<Array<IngredientStockLevelRecord & { ingredient: PartialIngredient }>>;
  updateStockLevel(
    outletId: string,
    ingredientId: string,
    quantity: number,
    businessId: string,
  ): Promise<IngredientStockLevelRecord>;
  adjustStock(
    outletId: string,
    ingredientId: string,
    quantity: number,
    referenceId: string | undefined,
    referenceType: string | undefined,
    notes: string | undefined,
    businessId: string,
  ): Promise<void>;
  /** Atomic, tenant-checked adjustment; runs in `tx` when given. */
  applyStockAdjustment(
    params: StockAdjustmentParams,
    tx?: IngredientTx,
  ): Promise<StockAdjustmentResult>;

  // Recipe
  findRecipeById(id: string, businessId: string): Promise<RecipeRecord | null>;
  /** variantId undefined = all recipes of the product; null = the generic recipe only. */
  findRecipesByProduct(
    productId: string,
    variantId: string | null | undefined,
    businessId: string,
  ): Promise<RecipeRecord[]>;
  createRecipe(data: CreateRecipeData): Promise<RecipeRecord>;
  updateRecipe(id: string, data: UpdateRecipeData, businessId: string): Promise<RecipeRecord>;
  deleteRecipe(id: string, businessId: string): Promise<void>;
  findRecipesByIngredient(ingredientId: string, businessId: string): Promise<RecipeRecord[]>;
}
