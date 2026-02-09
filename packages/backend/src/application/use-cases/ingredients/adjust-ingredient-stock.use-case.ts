import { Inject, Injectable } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { IAuditLogRepository } from '../../../domain/interfaces/repositories/audit.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

export interface AdjustIngredientStockParams {
  outletId: string;
  ingredientId: string;
  quantity: number; // Can be positive (add) or negative (deduct)
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  employeeId?: string;
  businessId: string;
}

@Injectable()
export class AdjustIngredientStockUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(params: AdjustIngredientStockParams) {
    // Check if ingredient exists
    const stock = await this.ingredientRepository.getStockLevel(
      params.outletId,
      params.ingredientId,
    );
    if (!stock) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Ingredient stock not found for this outlet',
      );
    }

    const currentQty = Number(stock.quantity);
    const newQty = currentQty + params.quantity;

    // Validate: don't allow negative stock
    if (newQty < 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Insufficient stock for this operation',
      );
    }

    // Adjust stock
    await this.ingredientRepository.adjustStock(
      params.outletId,
      params.ingredientId,
      params.quantity,
      params.referenceId,
      params.referenceType,
      params.notes,
    );

    // Create audit log
    const auditRecord = {
      id: crypto.randomUUID(),
      businessId: params.businessId,
      outletId: params.outletId,
      employeeId: params.employeeId ?? null,
      action: params.quantity >= 0 ? 'INGREDIENT_STOCK_ADD' : 'INGREDIENT_STOCK_DEDUCT',
      entityType: 'IngredientStock',
      entityId: stock.id,
      oldValue: { quantity: currentQty },
      newValue: { quantity: newQty },
      ipAddress: null,
      deviceId: null,
      metadata: {
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        notes: params.notes,
      },
      createdAt: new Date(),
    } as const;

    await this.auditLogRepository.create(auditRecord);

    return {
      ingredientId: params.ingredientId,
      outletId: params.outletId,
      previousQuantity: currentQty,
      newQuantity: newQty,
      adjusted: params.quantity,
    };
  }
}
