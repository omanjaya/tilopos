import { Injectable } from '@nestjs/common';
import { AUDIT_ACTIONS } from '@modules/audit/audit-actions';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { money } from '@shared/utils/money';
import { expectedDrawerCash } from '../../services/cash-drawer';
import { lockOpenShift } from './shift-lock';

export interface CashInInput {
  shiftId: string;
  employeeId: string;
  businessId: string;
  /** Caller's outlet; null for owners without one (the shift's outlet is used). */
  outletId: string | null;
  amount: number;
  notes?: string;
}

@Injectable()
export class CashInUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CashInInput): Promise<{ success: boolean; newBalance: number }> {
    if (!(input.amount > 0)) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Amount must be positive');
    }
    return this.prisma.$transaction(async (tx) => {
      const shift = await lockOpenShift(tx, input.shiftId, input.outletId, input.businessId);
      const currentCash = await expectedDrawerCash(tx, shift);
      const amount = money(input.amount);
      const newBalance = currentCash.plus(amount);

      await tx.shift.update({
        where: { id: shift.id },
        data: { cashIn: { increment: amount } },
      });
      await tx.auditLog.create({
        data: {
          businessId: input.businessId,
          outletId: shift.outletId,
          employeeId: input.employeeId,
          action: AUDIT_ACTIONS.CASH_IN,
          entityType: 'shift',
          entityId: shift.id,
          oldValue: { cashBalance: currentCash.toNumber() },
          newValue: {
            cashBalance: newBalance.toNumber(),
            amount: amount.toNumber(),
            notes: input.notes ?? null,
          },
        },
      });
      return { success: true, newBalance: newBalance.toNumber() };
    });
  }
}
