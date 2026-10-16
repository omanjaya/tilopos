import { Inject, Injectable } from '@nestjs/common';
import type { IAuditLogRepository } from '../../../domain/interfaces/repositories/audit.repository';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface AdjustIngredientStockParams {
  businessId: string;
  /** Must already be verified to belong to `businessId`. */
  outletId: string;
  ingredientId: string;
  quantity: number; // positive adds, negative deducts; never 0
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  employeeId?: string;
}

/**
 * Manual ingredient stock adjustment. Ownership check, conditional increment/decrement
 * and the movement row are one transaction inside the repository (R3, R9); the audit log
 * is written after the stock change committed.
 */
@Injectable()
export class AdjustIngredientStockUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(params: AdjustIngredientStockParams) {
    const result = await this.ingredientRepository.applyStockAdjustment({
      businessId: params.businessId,
      outletId: params.outletId,
      ingredientId: params.ingredientId,
      quantity: params.quantity,
      movementType: 'adjustment',
      referenceId: params.referenceId,
      referenceType: params.referenceType ?? 'manual_adjustment',
      notes: params.notes,
      createdBy: params.employeeId,
    });

    await this.auditLogRepository.create({
      id: crypto.randomUUID(),
      businessId: params.businessId,
      outletId: params.outletId,
      employeeId: params.employeeId ?? null,
      action: params.quantity >= 0 ? 'INGREDIENT_STOCK_ADD' : 'INGREDIENT_STOCK_DEDUCT',
      entityType: 'IngredientStock',
      entityId: result.stockLevelId,
      oldValue: { quantity: result.previousQuantity },
      newValue: { quantity: result.newQuantity },
      ipAddress: null,
      deviceId: null,
      metadata: {
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        notes: params.notes,
      },
      createdAt: new Date(),
    });

    return {
      ingredientId: params.ingredientId,
      outletId: params.outletId,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      adjusted: params.quantity,
    };
  }
}
