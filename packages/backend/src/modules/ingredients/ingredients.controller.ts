import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';

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
} from '../../application/dtos/ingredient.dto';
import {
  IngredientImportDto,
  IngredientExportQueryDto,
  LowStockAlertQueryDto,
} from '../../application/dtos/ingredient-features.dto';

@ApiTags('Ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(
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
  @ApiOperation({ summary: 'Get all ingredients for business' })
  async list(@CurrentUser() user: AuthUser) {
    return this.getIngredientsUseCase.execute({
      businessId: user.businessId,
      activeOnly: true,
    });
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
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
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Update an ingredient' })
  async update(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.updateIngredientUseCase.execute({
      id,
      name: dto.name,
      sku: dto.sku,
      unit: dto.unit,
      costPerUnit: dto.costPerUnit,
      imageUrl: dto.imageUrl,
      isActive: dto.isActive,
    });
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Delete (deactivate) an ingredient' })
  async remove(@Param('id') id: string) {
    return this.deleteIngredientUseCase.execute(id);
  }

  // ==================== Stock Levels ====================

  @Get('stock/:outletId')
  @ApiOperation({ summary: 'Get ingredient stock levels for outlet' })
  async getStock(@Param('outletId') outletId: string, @Query('lowOnly') lowOnly?: string) {
    return this.getIngredientStockUseCase.execute({
      outletId,
      lowStockOnly: lowOnly === 'true',
    });
  }

  @Post('stock/adjust')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Adjust ingredient stock (add/deduct)' })
  async adjustStock(@Body() dto: AdjustIngredientStockDto, @CurrentUser() user: AuthUser) {
    if (!user.outletId) {
      throw new Error('User must be assigned to an outlet');
    }

    return this.adjustIngredientStockUseCase.execute({
      outletId: user.outletId,
      ingredientId: dto.ingredientId,
      quantity: dto.quantity,
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
      notes: dto.notes,
      employeeId: user.employeeId,
      businessId: user.businessId,
    });
  }

  // ==================== Recipes ====================

  @Get('recipes')
  @ApiOperation({ summary: 'Get recipes by product' })
  async listRecipes(@Query() query: RecipeQueryDto) {
    return this.getRecipesUseCase.execute({
      productId: query.productId,
      variantId: query.variantId,
    });
  }

  @Post('recipes')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Create a new recipe' })
  async createRecipe(@Body() dto: CreateRecipeDto) {
    return this.createRecipeUseCase.execute({
      productId: dto.productId,
      variantId: dto.variantId,
      notes: dto.notes,
      items: dto.items,
    });
  }

  @Put('recipes/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Update a recipe' })
  async updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.updateRecipeUseCase.execute({
      id,
      notes: dto.notes,
      items: dto.items,
    });
  }

  @Delete('recipes/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Delete a recipe' })
  async deleteRecipe(@Param('id') id: string) {
    return this.deleteRecipeUseCase.execute(id);
  }

  // ==================== Import / Export ====================

  @Post('import')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Import ingredients from CSV/JSON data' })
  async importIngredients(@Body() dto: IngredientImportDto, @CurrentUser() user: AuthUser) {
    return this.ingredientsService.importIngredients(user.businessId, dto.data, dto.format);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all ingredients as CSV or JSON with optional stock levels' })
  async exportIngredients(@Query() query: IngredientExportQueryDto, @CurrentUser() user: AuthUser) {
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
      'Returns ingredients below minimum stock level, grouped by outlet, with reorder suggestions based on average daily consumption and lead time.',
  })
  async getLowStockAlerts(@Query() query: LowStockAlertQueryDto) {
    return this.ingredientsService.getLowStockAlerts(query.outletId, query.threshold);
  }

  // ==================== Stock Alerts (formatted) ====================

  @Get('stock-alerts')
  @ApiOperation({
    summary: 'Get formatted stock alerts',
    description:
      'Returns formatted alerts with ingredient name, current level, minimum level, and deficit for ingredients below their minimum threshold.',
  })
  async getStockAlerts(@Query() query: LowStockAlertQueryDto) {
    const lowStockItems = await this.ingredientsService.getLowStockAlerts(
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

  // ==================== Recipe Cost History ====================

  @Get('recipes/:id/cost-history')
  @ApiOperation({
    summary: 'Get recipe cost history over time',
    description:
      'Track how recipe costs change over time as ingredient costs change. Returns current cost and historical snapshots.',
  })
  async getRecipeCostHistory(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ingredientsService.getRecipeCostHistory(id, startDate, endDate);
  }
}
