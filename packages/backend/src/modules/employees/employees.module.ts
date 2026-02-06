import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeShiftReportsService } from './employee-shift-reports.service';
import { EmployeeScheduleService } from './employee-schedule.service';
import { EmployeeCommissionService } from './employee-commission.service';
import { EmployeeAttendanceService } from './employee-attendance.service';
import { StartShiftUseCase } from '../../application/use-cases/employees/start-shift.use-case';
import { EndShiftUseCase } from '../../application/use-cases/employees/end-shift.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaEmployeeRepository } from '../../infrastructure/repositories/prisma-employee.repository';
import { PrismaShiftRepository } from '../../infrastructure/repositories/prisma-shift.repository';

@Module({
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeeShiftReportsService,
    EmployeeScheduleService,
    EmployeeCommissionService,
    EmployeeAttendanceService,
    StartShiftUseCase,
    EndShiftUseCase,
    { provide: REPOSITORY_TOKENS.EMPLOYEE, useClass: PrismaEmployeeRepository },
    { provide: REPOSITORY_TOKENS.SHIFT, useClass: PrismaShiftRepository },
  ],
})
export class EmployeesModule {}
