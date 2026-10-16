import { Injectable } from '@nestjs/common';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { ShiftEndedEvent } from '@domain/events/shift-ended.event';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { money, toNumber } from '@shared/utils/money';
import { computeShiftCash } from './shift-cash';

export interface EndShiftInput {
  shiftId: string;
  /** Owner of the shift (the caller, or the employee a supervisor closes it for). */
  employeeId: string;
  /** Caller's business; the shift must belong to one of its outlets. */
  businessId: string;
  closingCash: number;
  notes?: string;
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
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Closes an open shift exactly once (Docs/ENGINEERING-RULES.md R9): totals are
   * computed and the status flips open → closed with a conditional update in one
   * transaction, so a double submit cannot close (or publish) twice.
   */
  async execute(input: EndShiftInput): Promise<EndShiftOutput> {
    const endedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({
        where: { id: input.shiftId, outlet: { businessId: input.businessId } },
      });
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

      const totals = await computeShiftCash(tx, shift);
      const closingCash = money(input.closingCash);
      const difference = closingCash.minus(totals.expectedCash);

      const updated = await tx.shift.updateMany({
        where: { id: shift.id, status: 'open' },
        data: {
          closingCash,
          expectedCash: totals.expectedCash,
          cashDifference: difference,
          endedAt,
          status: 'closed',
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      if (updated.count !== 1) {
        throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
      }

      const employee = await tx.employee.findFirst({
        where: { id: shift.employeeId, businessId: input.businessId },
        select: { name: true },
      });

      return {
        outletId: shift.outletId,
        employeeName: employee?.name ?? '',
        totalSales: totals.totalSales,
        expectedCash: totals.expectedCash,
        closingCash,
        difference,
      };
    });

    this.eventBus.publish(
      new ShiftEndedEvent(
        input.shiftId,
        input.employeeId,
        result.employeeName,
        result.outletId,
        input.businessId,
        toNumber(result.totalSales),
        toNumber(result.closingCash),
      ),
    );

    return {
      shiftId: input.shiftId,
      expectedCash: toNumber(result.expectedCash),
      actualCash: toNumber(result.closingCash),
      difference: toNumber(result.difference),
      endedAt,
    };
  }
}
