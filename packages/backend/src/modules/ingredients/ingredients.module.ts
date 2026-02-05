import { Module } from '@nestjs/common';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaIngredientRepository } from '../../infrastructure/repositories/prisma-ingredient.repository';
import { PrismaEmployeeRepository } from '../../infrastructure/repositories/prisma-employee.repository';
import { PrismaAuditRepository } from '../../infrastructure/repositories/prisma-audit.repository';

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
import { DeductIngredientsOnSaleUseCase } from '../../application/use-cases/ingredients/deduct-ingredients-on-sale.use-case';

@Module({
  controllers: [IngredientsController],
  providers: [
    // Service
    IngredientsService,

    // Repositories
    { provide: REPOSITORY_TOKENS.INGREDIENT, useClass: PrismaIngredientRepository },
    { provide: REPOSITORY_TOKENS.EMPLOYEE, useClass: PrismaEmployeeRepository },
    { provide: REPOSITORY_TOKENS.AUDIT, useClass: PrismaAuditRepository },

    // Use Cases - Ingredient
    CreateIngredientUseCase,
    UpdateIngredientUseCase,
    DeleteIngredientUseCase,
    GetIngredientsUseCase,
    GetIngredientStockUseCase,
    AdjustIngredientStockUseCase,

    // Use Cases - Recipe
    CreateRecipeUseCase,
    UpdateRecipeUseCase,
    DeleteRecipeUseCase,
    GetRecipesUseCase,

    // Use Cases - Existing
    DeductIngredientsOnSaleUseCase,
  ],
  exports: [DeductIngredientsOnSaleUseCase],
})
export class IngredientsModule {}
