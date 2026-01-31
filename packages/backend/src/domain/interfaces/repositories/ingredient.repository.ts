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

export interface IIngredientRepository {
  // Ingredient CRUD
  findById(id: string): Promise<IngredientRecord | null>;
  findByBusiness(businessId: string, activeOnly?: boolean): Promise<IngredientRecord[]>;
  findBySKU(businessId: string, sku: string): Promise<IngredientRecord | null>;
  create(data: CreateIngredientData): Promise<IngredientRecord>;
  update(id: string, data: UpdateIngredientData): Promise<IngredientRecord>;
  delete(id: string): Promise<void>;

  // Stock Level
  getStockLevel(outletId: string, ingredientId: string): Promise<IngredientStockLevelRecord | null>;
  getStockLevelsByOutlet(outletId: string): Promise<Array<IngredientStockLevelRecord & { ingredient?: PartialIngredient }>>;
  getLowStock(outletId: string): Promise<Array<IngredientStockLevelRecord & { ingredient: PartialIngredient }>>;
  updateStockLevel(outletId: string, ingredientId: string, quantity: number): Promise<IngredientStockLevelRecord>;
  adjustStock(outletId: string, ingredientId: string, quantity: number, referenceId?: string, referenceType?: string, notes?: string): Promise<void>;

  // Recipe
  findRecipeById(id: string): Promise<RecipeRecord | null>;
  findRecipesByProduct(productId: string, variantId?: string): Promise<RecipeRecord[]>;
  createRecipe(data: CreateRecipeData): Promise<RecipeRecord>;
  updateRecipe(id: string, data: UpdateRecipeData): Promise<RecipeRecord>;
  deleteRecipe(id: string): Promise<void>;
  findRecipesByIngredient(ingredientId: string): Promise<RecipeRecord[]>;
}
