import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

@Injectable()
export class DeleteRecipeUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(id: string) {
    const recipe = await this.ingredientRepository.findRecipeById(id);
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    await this.ingredientRepository.deleteRecipe(id);

    return { message: 'Recipe deleted successfully' };
  }
}
