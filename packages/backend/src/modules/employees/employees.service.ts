import { Injectable } from '@nestjs/common';
import { EmployeeShiftReportsService } from './employee-shift-reports.service';
import { EmployeeScheduleService } from './employee-schedule.service';
import { EmployeeCommissionService } from './employee-commission.service';
import { EmployeeAttendanceService } from './employee-attendance.service';
import type {
  EmployeeShiftReport,
  EmployeeShiftSummary,
  ScheduleEntry,
  WeeklyScheduleGrid,
  CreateScheduleData,
  UpdateScheduleData,
  EmployeeCommission,
  EmployeeCommissionSummary,
  AttendanceClockInResult,
  AttendanceClockOutResult,
  AttendanceRecord,
  EmployeeAttendanceSummary,
} from './employee.types';

/**
 * Main employees service that orchestrates employee-related operations.
 * Delegates to specialized services for shift reports, schedules, commissions, and attendance.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly shiftReportsService: EmployeeShiftReportsService,
    private readonly scheduleService: EmployeeScheduleService,
    private readonly commissionService: EmployeeCommissionService,
    private readonly attendanceService: EmployeeAttendanceService,
  ) {}

  // ==========================================================================
  // Shift Reports - Delegated to EmployeeShiftReportsService
  // ==========================================================================

  async getEmployeeShiftReport(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeShiftReport> {
    return this.shiftReportsService.getEmployeeShiftReport(employeeId, from, to);
  }

  async getAllEmployeeShiftSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeShiftSummary[]> {
    return this.shiftReportsService.getAllEmployeeShiftSummary(outletId, from, to);
  }

  // ==========================================================================
  // Schedule Management - Delegated to EmployeeScheduleService
  // ==========================================================================

  async createSchedule(data: CreateScheduleData): Promise<ScheduleEntry> {
    return this.scheduleService.createSchedule(data);
  }

  async getWeeklySchedule(outletId: string, weekStart: Date): Promise<WeeklyScheduleGrid> {
    return this.scheduleService.getWeeklySchedule(outletId, weekStart);
  }

  async updateSchedule(scheduleId: string, data: UpdateScheduleData): Promise<ScheduleEntry> {
    return this.scheduleService.updateSchedule(scheduleId, data);
  }

  async deleteSchedule(scheduleId: string): Promise<{ message: string }> {
    return this.scheduleService.deleteSchedule(scheduleId);
  }

  // ==========================================================================
  // Commission Calculator - Delegated to EmployeeCommissionService
  // ==========================================================================

  async getEmployeeCommissions(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeCommission> {
    return this.commissionService.getEmployeeCommissions(employeeId, from, to);
  }

  async getAllEmployeeCommissionSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeCommissionSummary[]> {
    return this.commissionService.getAllEmployeeCommissionSummary(outletId, from, to);
  }

  // ==========================================================================
  // Attendance Tracking - Delegated to EmployeeAttendanceService
  // ==========================================================================

  async clockIn(employeeId: string, outletId: string): Promise<AttendanceClockInResult> {
    return this.attendanceService.clockIn(employeeId, outletId);
  }

  async clockOut(employeeId: string): Promise<AttendanceClockOutResult> {
    return this.attendanceService.clockOut(employeeId);
  }

  async getAttendanceRecords(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<AttendanceRecord[]> {
    return this.attendanceService.getAttendanceRecords(employeeId, from, to);
  }

  async getAttendanceSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeAttendanceSummary[]> {
    return this.attendanceService.getAttendanceSummary(outletId, from, to);
  }
}
