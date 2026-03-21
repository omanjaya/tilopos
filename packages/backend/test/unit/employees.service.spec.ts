import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from '../../src/modules/employees/employees.service';
import { EmployeeShiftReportsService } from '../../src/modules/employees/employee-shift-reports.service';
import { EmployeeScheduleService } from '../../src/modules/employees/employee-schedule.service';
import { EmployeeCommissionService } from '../../src/modules/employees/employee-commission.service';
import { EmployeeAttendanceService } from '../../src/modules/employees/employee-attendance.service';
import { BusinessError } from '../../src/shared/errors/business-error';
import { ErrorCode } from '../../src/shared/constants/error-codes';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let mockShiftReportsService: jest.Mocked<EmployeeShiftReportsService>;
  let mockScheduleService: jest.Mocked<EmployeeScheduleService>;
  let mockCommissionService: jest.Mocked<EmployeeCommissionService>;
  let mockAttendanceService: jest.Mocked<EmployeeAttendanceService>;

  beforeEach(() => {
    mockShiftReportsService = {
      getEmployeeShiftReport: jest.fn(),
      getAllEmployeeShiftSummary: jest.fn(),
    } as unknown as jest.Mocked<EmployeeShiftReportsService>;

    mockScheduleService = {
      createSchedule: jest.fn(),
      getWeeklySchedule: jest.fn(),
      updateSchedule: jest.fn(),
      deleteSchedule: jest.fn(),
    } as unknown as jest.Mocked<EmployeeScheduleService>;

    mockCommissionService = {
      getEmployeeCommissions: jest.fn(),
      getAllEmployeeCommissionSummary: jest.fn(),
    } as unknown as jest.Mocked<EmployeeCommissionService>;

    mockAttendanceService = {
      clockIn: jest.fn(),
      clockOut: jest.fn(),
      getAttendanceRecords: jest.fn(),
      getAttendanceSummary: jest.fn(),
    } as unknown as jest.Mocked<EmployeeAttendanceService>;

    service = new EmployeesService(
      mockShiftReportsService,
      mockScheduleService,
      mockCommissionService,
      mockAttendanceService,
    );
  });

  // ==========================================================================
  // getEmployeeShiftReport
  // ==========================================================================

  describe('getEmployeeShiftReport', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should return a shift report with valid params', async () => {
      const shiftReport = {
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalShifts: 1,
        totalHoursWorked: 8,
        averageShiftDuration: 8,
        totalSales: 300000,
        totalTransactions: 2,
        cashVariance: 500,
        shifts: [
          {
            shiftId: 'shift-1',
            startTime: '2026-01-15T08:00:00.000Z',
            endTime: '2026-01-15T16:00:00.000Z',
            duration: 8,
            sales: 300000,
            transactions: 2,
            cashDifference: 500,
          },
        ],
      };
      mockShiftReportsService.getEmployeeShiftReport.mockResolvedValue(shiftReport);

      const result = await service.getEmployeeShiftReport('emp-1', from, to);

      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('John Doe');
      expect(result.totalShifts).toBe(1);
      expect(result.totalHoursWorked).toBe(8);
      expect(result.averageShiftDuration).toBe(8);
      expect(result.totalSales).toBe(300000);
      expect(result.totalTransactions).toBe(2);
      expect(result.cashVariance).toBe(500);
      expect(result.shifts).toHaveLength(1);
    });

    it('should return empty data when no shifts found', async () => {
      const emptyReport = {
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalShifts: 0,
        totalHoursWorked: 0,
        averageShiftDuration: 0,
        totalSales: 0,
        totalTransactions: 0,
        cashVariance: 0,
        shifts: [],
      };
      mockShiftReportsService.getEmployeeShiftReport.mockResolvedValue(emptyReport);

      const result = await service.getEmployeeShiftReport('emp-1', from, to);

      expect(result.employeeId).toBe('emp-1');
      expect(result.totalShifts).toBe(0);
      expect(result.totalHoursWorked).toBe(0);
      expect(result.averageShiftDuration).toBe(0);
      expect(result.totalSales).toBe(0);
      expect(result.totalTransactions).toBe(0);
      expect(result.cashVariance).toBe(0);
      expect(result.shifts).toHaveLength(0);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockShiftReportsService.getEmployeeShiftReport.mockRejectedValue(
        new NotFoundException('Employee not found'),
      );

      await expect(service.getEmployeeShiftReport('nonexistent', from, to)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // Schedule Management
  // ==========================================================================

  describe('getWeeklySchedule', () => {
    it('should return a 7-day schedule grid', async () => {
      const weekStart = new Date('2026-01-26T00:00:00.000Z');
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const weeklySchedule = {
        weekStart: '2026-01-26',
        weekEnd: '2026-02-01',
        days: Array.from({ length: 7 }, (_, i) => ({
          date: `2026-01-${26 + i}`,
          dayOfWeek: dayNames[i],
          entries: [],
        })),
      };
      mockScheduleService.getWeeklySchedule.mockResolvedValue(weeklySchedule);

      const result = await service.getWeeklySchedule('outlet-1', weekStart);

      expect(result.days).toHaveLength(7);
      expect(result.weekStart).toBe('2026-01-26');
      expect(result.days[0].dayOfWeek).toBeDefined();
    });
  });

  describe('createSchedule', () => {
    it('should create a schedule entry with valid data', async () => {
      const createdSchedule = {
        id: 'sched-1',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        outletId: 'outlet-1',
        date: '2026-02-01',
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Morning shift',
      };
      mockScheduleService.createSchedule.mockResolvedValue(createdSchedule);

      const result = await service.createSchedule({
        employeeId: 'emp-1',
        outletId: 'outlet-1',
        date: '2026-02-01',
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Morning shift',
      });

      expect(result.id).toBe('sched-1');
      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('John Doe');
      expect(result.startTime).toBe('08:00');
      expect(result.endTime).toBe('16:00');
      expect(result.notes).toBe('Morning shift');
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockScheduleService.createSchedule.mockRejectedValue(
        new NotFoundException('Employee not found'),
      );

      await expect(
        service.createSchedule({
          employeeId: 'nonexistent',
          outletId: 'outlet-1',
          date: '2026-02-01',
          startTime: '08:00',
          endTime: '16:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Commission Calculator
  // ==========================================================================

  describe('getEmployeeCommissions', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should calculate commissions for a cashier at 1% rate', async () => {
      const commissionData = {
        employeeId: 'emp-1',
        period: { from: '2026-01-01', to: '2026-01-31' },
        commissionRate: 0.01,
        totalSales: 300000,
        commissionAmount: 3000,
        transactions: [
          { transactionId: 'tx-1', amount: 100000, commission: 1000 },
          { transactionId: 'tx-2', amount: 200000, commission: 2000 },
        ],
      };
      mockCommissionService.getEmployeeCommissions.mockResolvedValue(commissionData);

      const result = await service.getEmployeeCommissions('emp-1', from, to);

      expect(result.commissionRate).toBe(0.01);
      expect(result.totalSales).toBe(300000);
      expect(result.commissionAmount).toBe(3000);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].commission).toBe(1000);
      expect(result.transactions[1].commission).toBe(2000);
    });

    it('should calculate commissions for a manager at 2% rate', async () => {
      const commissionData = {
        employeeId: 'emp-2',
        period: { from: '2026-01-01', to: '2026-01-31' },
        commissionRate: 0.02,
        totalSales: 500000,
        commissionAmount: 10000,
        transactions: [{ transactionId: 'tx-1', amount: 500000, commission: 10000 }],
      };
      mockCommissionService.getEmployeeCommissions.mockResolvedValue(commissionData);

      const result = await service.getEmployeeCommissions('emp-2', from, to);

      expect(result.commissionRate).toBe(0.02);
      expect(result.totalSales).toBe(500000);
      expect(result.commissionAmount).toBe(10000);
    });

    it('should return 0% commission for owner role', async () => {
      const commissionData = {
        employeeId: 'emp-3',
        period: { from: '2026-01-01', to: '2026-01-31' },
        commissionRate: 0,
        totalSales: 1000000,
        commissionAmount: 0,
        transactions: [],
      };
      mockCommissionService.getEmployeeCommissions.mockResolvedValue(commissionData);

      const result = await service.getEmployeeCommissions('emp-3', from, to);

      expect(result.commissionRate).toBe(0);
      expect(result.commissionAmount).toBe(0);
    });

    it('should use default rate for unknown roles', async () => {
      const commissionData = {
        employeeId: 'emp-4',
        period: { from: '2026-01-01', to: '2026-01-31' },
        commissionRate: 0.01,
        totalSales: 100000,
        commissionAmount: 1000,
        transactions: [{ transactionId: 'tx-1', amount: 100000, commission: 1000 }],
      };
      mockCommissionService.getEmployeeCommissions.mockResolvedValue(commissionData);

      const result = await service.getEmployeeCommissions('emp-4', from, to);

      expect(result.commissionRate).toBe(0.01);
      expect(result.commissionAmount).toBe(1000);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockCommissionService.getEmployeeCommissions.mockRejectedValue(
        new NotFoundException('Employee not found'),
      );

      await expect(service.getEmployeeCommissions('nonexistent', from, to)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // Clock In / Clock Out
  // ==========================================================================

  describe('clockIn', () => {
    it('should create attendance record on successful clock in', async () => {
      const clockInResult = {
        attendanceId: 'att-1',
        clockInTime: new Date().toISOString(),
      };
      mockAttendanceService.clockIn.mockResolvedValue(clockInResult);

      const result = await service.clockIn('emp-1', 'outlet-1');

      expect(result.attendanceId).toBe('att-1');
      expect(result.clockInTime).toBeDefined();
    });

    it('should throw BusinessError when already clocked in', async () => {
      mockAttendanceService.clockIn.mockRejectedValue(
        new BusinessError(ErrorCode.ALREADY_CLOCKED_IN, 'Employee is already clocked in'),
      );

      await expect(service.clockIn('emp-1', 'outlet-1')).rejects.toThrow(BusinessError);
      await expect(service.clockIn('emp-1', 'outlet-1')).rejects.toThrow(
        'Employee is already clocked in',
      );
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockAttendanceService.clockIn.mockRejectedValue(new NotFoundException('Employee not found'));

      await expect(service.clockIn('nonexistent', 'outlet-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('clockOut', () => {
    it('should update attendance record on successful clock out', async () => {
      const clockOutResult = {
        attendanceId: 'att-1',
        clockOutTime: new Date().toISOString(),
        hoursWorked: 8,
      };
      mockAttendanceService.clockOut.mockResolvedValue(clockOutResult);

      const result = await service.clockOut('emp-1');

      expect(result.attendanceId).toBe('att-1');
      expect(result.clockOutTime).toBeDefined();
      expect(result.hoursWorked).toBeGreaterThan(0);
    });

    it('should throw BusinessError when not clocked in', async () => {
      mockAttendanceService.clockOut.mockRejectedValue(
        new BusinessError(ErrorCode.NOT_CLOCKED_IN, 'Employee is not clocked in'),
      );

      await expect(service.clockOut('emp-1')).rejects.toThrow(BusinessError);
      await expect(service.clockOut('emp-1')).rejects.toThrow('Employee is not clocked in');
    });
  });
});
