import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';

export interface EndShiftInput {
  shiftId: string;
  employeeId: string;
  closingCash: number;
}

export interface EndShiftOutput {
  shiftId: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
  endedAt: Date;
}

@Injectable()
export class EndShiftUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: EndShiftInput): Promise<EndShiftOutput> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift) {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift not found');
    }

    if (shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    if (shift.employeeId !== input.employeeId) {
      throw new BusinessError(
        ErrorCode.UNAUTHORIZED_ACTION,
        'This shift does not belong to the employee',
      );
    }

    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        transaction: { shiftId: input.shiftId, transactionType: 'sale' },
        paymentMethod: 'cash',
        status: 'completed',
      },
      _sum: { amount: true },
    });

    const cashRefunds = await this.prisma.payment.aggregate({
      where: {
        transaction: { shiftId: input.shiftId, transactionType: 'refund' },
        paymentMethod: 'cash',
        status: 'completed',
      },
      _sum: { amount: true },
    });

    const totalCashIn = cashPayments._sum.amount?.toNumber() || 0;
    const totalCashOut = Math.abs(cashRefunds._sum.amount?.toNumber() || 0);
    const expectedCash = shift.openingCash + totalCashIn - totalCashOut;
    const difference = input.closingCash - expectedCash;
    const endedAt = new Date();

    await this.shiftRepo.close(input.shiftId, {
      closingCash: input.closingCash,
      expectedCash,
      cashDifference: difference,
      endedAt,
    });

    return {
      shiftId: input.shiftId,
      expectedCash,
      actualCash: input.closingCash,
      difference,
      endedAt,
    };
  }
}
