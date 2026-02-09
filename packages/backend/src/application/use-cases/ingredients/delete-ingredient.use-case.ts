import { Inject, Injectable } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

@Injectable()
export class DeleteIngredientUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(id: string) {
    const ingredient = await this.ingredientRepository.findById(id);
    if (!ingredient) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Ingredient not found',
      );
    }

    // Check if ingredient is used in any recipe
    const recipes = await this.ingredientRepository.findRecipesByIngredient(id);
    if (recipes.length > 0) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete ingredient that is used in recipes',
      );
    }

    // Soft delete
    await this.ingredientRepository.delete(id);

    return { message: 'Ingredient deleted successfully' };
  }
}
