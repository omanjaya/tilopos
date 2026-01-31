import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

export interface CashInInput {
  shiftId: string;
  employeeId: string;
  businessId: string;
  outletId: string;
  amount: number;
  notes?: string;
}

@Injectable()
export class CashInUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(input: CashInInput): Promise<{ success: boolean; newBalance: number }> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift || shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    const currentCash = shift.openingCash + (shift.cashIn || 0) - (shift.cashOut || 0);
    const newBalance = currentCash + input.amount;

    await this.shiftRepo.addCashIn(input.shiftId, input.amount);

    await this.auditRepo.create({
      id: '',
      businessId: input.businessId,
      outletId: input.outletId,
      employeeId: input.employeeId,
      action: 'cash_in',
      entityType: 'shift',
      entityId: input.shiftId,
      oldValue: { cashBalance: currentCash },
      newValue: { cashBalance: newBalance, amount: input.amount, notes: input.notes },
      ipAddress: null,
      deviceId: null,
      metadata: null,
      createdAt: new Date(),
    });

    return { success: true, newBalance };
  }
}
