import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

export interface CashOutInput {
  shiftId: string;
  employeeId: string;
  businessId: string;
  outletId: string;
  amount: number;
  reason: string;
  notes?: string;
}

@Injectable()
export class CashOutUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(input: CashOutInput): Promise<{ success: boolean; newBalance: number }> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift || shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    const currentCash = shift.openingCash + (shift.cashIn || 0) - (shift.cashOut || 0);
    if (input.amount > currentCash) {
      throw new BusinessError(ErrorCode.INSUFFICIENT_CASH, 'Insufficient cash in drawer');
    }

    const newBalance = currentCash - input.amount;

    await this.shiftRepo.addCashOut(input.shiftId, input.amount);

    await this.auditRepo.create({
      id: '',
      businessId: input.businessId,
      outletId: input.outletId,
      employeeId: input.employeeId,
      action: 'cash_out',
      entityType: 'shift',
      entityId: input.shiftId,
      oldValue: { cashBalance: currentCash },
      newValue: { cashBalance: newBalance, amount: input.amount, reason: input.reason, notes: input.notes },
      ipAddress: null,
      deviceId: null,
      metadata: null,
      createdAt: new Date(),
    });

    return { success: true, newBalance };
  }
}
