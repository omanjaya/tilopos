import { Injectable } from '@nestjs/common';
import { AUDIT_ACTIONS } from '@modules/audit/audit-actions';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { money } from '@shared/utils/money';
import { expectedDrawerCash } from '../../services/cash-drawer';
import { lockOpenShift } from './shift-lock';

export interface CashOutInput {
  shiftId: string;
  employeeId: string;
  businessId: string;
  /** Caller's outlet; null for owners without one (the shift's outlet is used). */
  outletId: string | null;
  amount: number;
  reason: string;
  notes?: string;
}

@Injectable()
export class CashOutUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CashOutInput): Promise<{ success: boolean; newBalance: number }> {
    if (!(input.amount > 0)) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Amount must be positive');
    }
    // Balance check and write happen under the shift row lock, so two concurrent
    // cash-outs can never take more than the drawer holds (R9).
    return this.prisma.$transaction(async (tx) => {
      const shift = await lockOpenShift(tx, input.shiftId, input.outletId, input.businessId);
      const currentCash = await expectedDrawerCash(tx, shift);
      const amount = money(input.amount);
      if (amount.gt(currentCash)) {
        throw new BusinessError(ErrorCode.INSUFFICIENT_CASH, 'Insufficient cash in drawer');
      }
      const newBalance = currentCash.minus(amount);

      await tx.shift.update({
        where: { id: shift.id },
        data: { cashOut: { increment: amount } },
      });
      await tx.auditLog.create({
        data: {
          businessId: input.businessId,
          outletId: shift.outletId,
          employeeId: input.employeeId,
          action: AUDIT_ACTIONS.CASH_OUT,
          entityType: 'shift',
          entityId: shift.id,
          oldValue: { cashBalance: currentCash.toNumber() },
          newValue: {
            cashBalance: newBalance.toNumber(),
            amount: amount.toNumber(),
            reason: input.reason,
            notes: input.notes ?? null,
          },
        },
      });
      return { success: true, newBalance: newBalance.toNumber() };
    });
  }
}
