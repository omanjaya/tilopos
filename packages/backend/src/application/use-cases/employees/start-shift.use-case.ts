import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { ShiftStartedEvent } from '@domain/events/shift-started.event';
import { BusinessError } from '@shared/errors/business-error';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IEmployeeRepository } from '@domain/interfaces/repositories/employee.repository';

export interface StartShiftInput {
  outletId: string;
  employeeId: string;
  openingCash: number;
}

export interface StartShiftOutput {
  shiftId: string;
  startedAt: Date;
}

@Injectable()
export class StartShiftUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: StartShiftInput): Promise<StartShiftOutput> {
    const employee = await this.employeeRepo.findById(input.employeeId);
    if (!employee || !employee.isActive) {
      throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND, 'Employee not found or inactive');
    }

    const openShift = await this.shiftRepo.findOpenShift(input.employeeId);
    if (openShift) {
      throw new BusinessError(ErrorCode.SHIFT_ALREADY_OPEN, 'Employee already has an open shift');
    }

    const shift = await this.shiftRepo.create({
      outletId: input.outletId,
      employeeId: input.employeeId,
      openingCash: input.openingCash,
      startedAt: new Date(),
    });

    this.eventBus.publish(
      new ShiftStartedEvent(shift.id, input.employeeId, employee.name, input.outletId, employee.businessId),
    );

    return {
      shiftId: shift.id,
      startedAt: shift.startedAt,
    };
  }
}
