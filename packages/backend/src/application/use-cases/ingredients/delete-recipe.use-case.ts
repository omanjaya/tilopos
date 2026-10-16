import { Inject, Injectable } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

@Injectable()
export class DeleteRecipeUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  /** Scoped delete (recipe -> product.businessId); 404 when not in the business. */
  async execute(id: string, businessId: string) {
    await this.ingredientRepository.deleteRecipe(id, businessId);
    return { message: 'Recipe deleted successfully' };
  }
}
