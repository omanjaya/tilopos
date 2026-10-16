import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { AppError, ErrorCode } from '../../shared/errors/app-error';
import { TenantAccessService } from '../../shared/tenant';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IIngredientRepository } from '../../domain/interfaces/repositories/ingredient.repository';
import { toPrismaPage } from '../../shared/dtos/pagination-query.dto';
import { canSeeCost } from '../inventory/product-serializer';

// Use Cases
import { CreateIngredientUseCase } from '../../application/use-cases/ingredients/create-ingredient.use-case';
import { UpdateIngredientUseCase } from '../../application/use-cases/ingredients/update-ingredient.use-case';
import { DeleteIngredientUseCase } from '../../application/use-cases/ingredients/delete-ingredient.use-case';
import { GetIngredientsUseCase } from '../../application/use-cases/ingredients/get-ingredients.use-case';
import { GetIngredientStockUseCase } from '../../application/use-cases/ingredients/get-ingredient-stock.use-case';
import { AdjustIngredientStockUseCase } from '../../application/use-cases/ingredients/adjust-ingredient-stock.use-case';
import { CreateRecipeUseCase } from '../../application/use-cases/ingredients/create-recipe.use-case';
import { UpdateRecipeUseCase } from '../../application/use-cases/ingredients/update-recipe.use-case';
import { DeleteRecipeUseCase } from '../../application/use-cases/ingredients/delete-recipe.use-case';
import { GetRecipesUseCase } from '../../application/use-cases/ingredients/get-recipes.use-case';

// Service
import { IngredientsService } from './ingredients.service';

// DTOs
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  AdjustIngredientStockDto,
  CreateRecipeDto,
  UpdateRecipeDto,
  RecipeQueryDto,
  IngredientListQueryDto,
  IngredientStockQueryDto,
} from '../../application/dtos/ingredient.dto';
import {
  IngredientImportDto,
  IngredientExportQueryDto,
  LowStockAlertQueryDto,
} from '../../application/dtos/ingredient-features.dto';

const INGREDIENT_WRITERS = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY];

/** Hides cost per unit from roles that must not see costs (R12). */
function withCostVisibility<T extends { costPerUnit: number }>(
  row: T,
  user: AuthUser,
): T | (Omit<T, 'costPerUnit'> & { costPerUnit: null }) {
  return canSeeCost(user.role) ? row : { ...row, costPerUnit: null };
}

@ApiTags('Ingredients')
@ApiBearerAuth()
@Controller('ingredients')
export class IngredientsController {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepo: IIngredientRepository,
    private readonly tenant: TenantAccessService,
    private readonly createIngredientUseCase: CreateIngredientUseCase,
    private readonly updateIngredientUseCase: UpdateIngredientUseCase,
    private readonly deleteIngredientUseCase: DeleteIngredientUseCase,
    private readonly getIngredientsUseCase: GetIngredientsUseCase,
    private readonly getIngredientStockUseCase: GetIngredientStockUseCase,
    private readonly adjustIngredientStockUseCase: AdjustIngredientStockUseCase,
    private readonly createRecipeUseCase: CreateRecipeUseCase,
    private readonly updateRecipeUseCase: UpdateRecipeUseCase,
    private readonly deleteRecipeUseCase: DeleteRecipeUseCase,
    private readonly getRecipesUseCase: GetRecipesUseCase,
    private readonly ingredientsService: IngredientsService,
  ) {}

  // ==================== Ingredients ====================

  @Get()
  @ApiOperation({ summary: 'Get ingredients for business (array; page/limit optional, max 100)' })
  async list(@Query() query: IngredientListQueryDto, @CurrentUser() user: AuthUser) {
    const page = query.page !== undefined || query.limit !== undefined ? toPrismaPage(query) : {};
    const rows = await this.getIngredientsUseCase.execute({
      businessId: user.businessId,
      activeOnly: true,
      ...page,
    });
    return rows.map((r) => withCostVisibility(r, user));
  }

  @Post()
  @Roles(...INGREDIENT_WRITERS)
  @ApiOperation({ summary: 'Create a new ingredient' })
  async create(@Body() dto: CreateIngredientDto, @CurrentUser() user: AuthUser) {
    return this.createIngredientUseCase.execute({
      businessId: user.businessId,
      name: dto.name,
      sku: dto.sku,
      unit: dto.unit,
      costPerUnit: dto.costPerUnit,
      imageUrl: dto.imageUrl,
    });
  }

  @Put(':id')
  @Roles(...INGREDIENT_WRITERS)
  @ApiOperation({ summary: 'Update an ingredient' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateIngredientUseCase.execute({
      id,
      businessId: user.businessId,
      name: dto.name,
      sku: dto.sku,
      unit: dto.unit,
      costPerUnit: dto.costPerUnit,
      imageUrl: dto.imageUrl,
      isActive: dto.isActive,
    });
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Delete (deactivate) an ingredient' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.deleteIngredientUseCase.execute(id, user.businessId);
  }

  // ==================== Stock Levels ====================

  @Get('stock/:outletId')
  @ApiOperation({ summary: 'Get ingredient stock levels for outlet' })
  async getStock(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: IngredientStockQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.getIngredientStockUseCase.execute({
      businessId: user.businessId,
      outletId,
      lowStockOnly: query.lowOnly === true,
    });
  }

  @Post('stock/adjust')
  @Roles(...INGREDIENT_WRITERS, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Adjust ingredient stock (add/deduct)' })
  async adjustStock(@Body() dto: AdjustIngredientStockDto, @CurrentUser() user: AuthUser) {
    const outletId = dto.outletId ?? user.outletId;
    if (!outletId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'outletId is required');
    }
    await this.tenant.assertOutlet(user, outletId);

    return this.adjustIngredientStockUseCase.execute({
      businessId: user.businessId,
      outletId,
      ingredientId: dto.ingredientId,
      quantity: dto.quantity,
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
      notes: dto.notes,
      employeeId: user.employeeId,
    });
  }

  // ==================== Recipes ====================

  @Get('recipes')
  @ApiOperation({ summary: 'Get recipes by product' })
  async listRecipes(@Query() query: RecipeQueryDto, @CurrentUser() user: AuthUser) {
    return this.getRecipesUseCase.execute({
      businessId: user.businessId,
      productId: query.productId,
      variantId: query.variantId,
    });
  }

  @Post('recipes')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Create a new recipe' })
  async createRecipe(@Body() dto: CreateRecipeDto, @CurrentUser() user: AuthUser) {
    return this.createRecipeUseCase.execute({
      businessId: user.businessId,
      productId: dto.productId,
      variantId: dto.variantId,
      notes: dto.notes,
      items: dto.items,
    });
  }

  @Put('recipes/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update a recipe' })
  async updateRecipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateRecipeUseCase.execute({
      id,
      businessId: user.businessId,
      notes: dto.notes,
      items: dto.items,
    });
  }

  @Delete('recipes/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Delete a recipe' })
  async deleteRecipe(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.deleteRecipeUseCase.execute(id, user.businessId);
  }

  // ==================== Import / Export ====================

  @Post('import')
  @Roles(...INGREDIENT_WRITERS)
  @ApiOperation({ summary: 'Import ingredients (parsed rows, max 1000)' })
  async importIngredients(@Body() dto: IngredientImportDto, @CurrentUser() user: AuthUser) {
    return this.ingredientsService.importIngredients(user.businessId, dto.data);
  }

  @Get('export')
  @Roles(...INGREDIENT_WRITERS)
  @ApiOperation({ summary: 'Export all ingredients as CSV or JSON with optional stock levels' })
  async exportIngredients(@Query() query: IngredientExportQueryDto, @CurrentUser() user: AuthUser) {
    if (query.outletId) await this.tenant.assertOutlet(user, query.outletId);
    return this.ingredientsService.exportIngredients(
      user.businessId,
      query.format,
      query.outletId,
      query.includeStock,
    );
  }

  // ==================== Low Stock Alerts ====================

  @Get('low-stock')
  @ApiOperation({
    summary: 'Get low stock alerts with reorder suggestions',
    description:
      'Returns ingredients below minimum stock level for the outlet, with reorder suggestions based on average daily consumption and lead time.',
  })
  async getLowStockAlerts(@Query() query: LowStockAlertQueryDto, @CurrentUser() user: AuthUser) {
    await this.tenant.assertOutlet(user, query.outletId);
    return this.ingredientsService.getLowStockAlerts(
      user.businessId,
      query.outletId,
      query.threshold,
    );
  }

  // ==================== Stock Alerts (formatted) ====================

  @Get('stock-alerts')
  @ApiOperation({
    summary: 'Get formatted stock alerts',
    description:
      'Returns formatted alerts with ingredient name, current level, minimum level, and deficit for ingredients below their minimum threshold.',
  })
  async getStockAlerts(@Query() query: LowStockAlertQueryDto, @CurrentUser() user: AuthUser) {
    await this.tenant.assertOutlet(user, query.outletId);
    const lowStockItems = await this.ingredientsService.getLowStockAlerts(
      user.businessId,
      query.outletId,
      query.threshold,
    );

    return {
      totalAlerts: lowStockItems.length,
      alerts: lowStockItems.map((item) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        unit: item.unit,
        outletId: item.outletId,
        currentLevel: item.currentStock,
        minimumLevel: item.minStockLevel,
        deficit: item.deficit,
        severity:
          item.deficit > item.minStockLevel
            ? ('critical' as const)
            : item.currentStock <= 0
              ? ('critical' as const)
              : ('warning' as const),
        message:
          item.currentStock <= 0
            ? `${item.ingredientName} is OUT OF STOCK (need ${item.deficit} ${item.unit})`
            : `${item.ingredientName} is LOW: ${item.currentStock} ${item.unit} remaining (min: ${item.minStockLevel} ${item.unit}, deficit: ${item.deficit} ${item.unit})`,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  // ==================== Recipe Cost ====================

  @Get('recipes/:id/cost-history')
  @Roles(...INGREDIENT_WRITERS)
  @ApiOperation({
    summary: 'Get current recipe cost',
    description:
      'Returns the recipe cost from current ingredient costs. `history` is always empty and `historyAvailable` false: ingredient cost changes are not versioned.',
  })
  async getRecipeCostHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ingredientsService.getRecipeCostHistory(id, user.businessId);
  }

  // ==================== Get by ID (must be AFTER all static routes) ====================

  @Get(':id')
  @ApiOperation({ summary: 'Get ingredient by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const ingredient = await this.ingredientRepo.findById(id, user.businessId);
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return withCostVisibility(ingredient, user);
  }
}
