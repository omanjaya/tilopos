import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from '../../src/modules/employees/employees.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { BusinessError } from '../../src/shared/errors/business-error';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
  });

  beforeEach(() => {
    mockPrisma = {
      employee: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      shift: {
        findMany: jest.fn(),
      },
      employeeSchedule: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      employeeAttendance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new EmployeesService(mockPrisma);
  });

  // ==========================================================================
  // getEmployeeShiftReport
  // ==========================================================================

  describe('getEmployeeShiftReport', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should return a shift report with valid params', async () => {
      // Arrange
      const employee = { id: 'emp-1', name: 'John Doe' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      const shiftStart = new Date('2026-01-15T08:00:00.000Z');
      const shiftEnd = new Date('2026-01-15T16:00:00.000Z');

      const shifts = [
        {
          id: 'shift-1',
          employeeId: 'emp-1',
          startedAt: shiftStart,
          endedAt: shiftEnd,
          cashDifference: makeDecimal(500),
          transactions: [
            { id: 'tx-1', grandTotal: makeDecimal(100000) },
            { id: 'tx-2', grandTotal: makeDecimal(200000) },
          ],
        },
      ];
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);

      // Act
      const result = await service.getEmployeeShiftReport('emp-1', from, to);

      // Assert
      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('John Doe');
      expect(result.totalShifts).toBe(1);
      expect(result.totalHoursWorked).toBe(8);
      expect(result.averageShiftDuration).toBe(8);
      expect(result.totalSales).toBe(300000);
      expect(result.totalTransactions).toBe(2);
      expect(result.cashVariance).toBe(500);
      expect(result.shifts).toHaveLength(1);
      expect(result.shifts[0].shiftId).toBe('shift-1');
      expect(result.shifts[0].duration).toBe(8);
      expect(result.shifts[0].sales).toBe(300000);
      expect(result.shifts[0].transactions).toBe(2);
      expect(result.shifts[0].cashDifference).toBe(500);
    });

    it('should return empty data when no shifts found', async () => {
      // Arrange
      const employee = { id: 'emp-1', name: 'John Doe' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getEmployeeShiftReport('emp-1', from, to);

      // Assert
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
      // Arrange
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getEmployeeShiftReport('nonexistent', from, to),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Schedule Management
  // ==========================================================================

  describe('getWeeklySchedule', () => {
    it('should return a 7-day schedule grid', async () => {
      // Arrange
      const weekStart = new Date('2026-01-26T00:00:00.000Z');
      (mockPrisma.employeeSchedule.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getWeeklySchedule('outlet-1', weekStart);

      // Assert
      expect(result.days).toHaveLength(7);
      expect(result.weekStart).toBe('2026-01-26');
      expect(result.days[0].dayOfWeek).toBeDefined();
    });
  });

  describe('createSchedule', () => {
    it('should create a schedule entry with valid data', async () => {
      // Arrange
      const employee = { id: 'emp-1', name: 'John Doe' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      const scheduleDate = new Date('2026-02-01');
      const createdSchedule = {
        id: 'sched-1',
        employeeId: 'emp-1',
        outletId: 'outlet-1',
        date: scheduleDate,
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Morning shift',
        employee: { name: 'John Doe' },
      };
      (mockPrisma.employeeSchedule.create as jest.Mock).mockResolvedValue(createdSchedule);

      // Act
      const result = await service.createSchedule({
        employeeId: 'emp-1',
        outletId: 'outlet-1',
        date: '2026-02-01',
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Morning shift',
      });

      // Assert
      expect(result.id).toBe('sched-1');
      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('John Doe');
      expect(result.startTime).toBe('08:00');
      expect(result.endTime).toBe('16:00');
      expect(result.notes).toBe('Morning shift');
      expect(mockPrisma.employeeSchedule.create).toHaveBeenCalledWith({
        data: {
          employeeId: 'emp-1',
          outletId: 'outlet-1',
          date: expect.any(Date),
          startTime: '08:00',
          endTime: '16:00',
          notes: 'Morning shift',
        },
        include: { employee: { select: { name: true } } },
      });
    });

    it('should throw NotFoundException if employee not found', async () => {
      // Arrange
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
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
      // Arrange
      const employee = { id: 'emp-1', role: 'cashier' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      const transactions = [
        { id: 'tx-1', grandTotal: makeDecimal(100000) },
        { id: 'tx-2', grandTotal: makeDecimal(200000) },
      ];
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue(transactions);

      // Act
      const result = await service.getEmployeeCommissions('emp-1', from, to);

      // Assert
      expect(result.commissionRate).toBe(0.01);
      expect(result.totalSales).toBe(300000);
      expect(result.commissionAmount).toBe(3000);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].commission).toBe(1000);
      expect(result.transactions[1].commission).toBe(2000);
    });

    it('should calculate commissions for a manager at 2% rate', async () => {
      // Arrange
      const employee = { id: 'emp-2', role: 'manager' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      const transactions = [
        { id: 'tx-1', grandTotal: makeDecimal(500000) },
      ];
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue(transactions);

      // Act
      const result = await service.getEmployeeCommissions('emp-2', from, to);

      // Assert
      expect(result.commissionRate).toBe(0.02);
      expect(result.totalSales).toBe(500000);
      expect(result.commissionAmount).toBe(10000);
    });

    it('should return 0% commission for owner role', async () => {
      // Arrange
      const employee = { id: 'emp-3', role: 'owner' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { id: 'tx-1', grandTotal: makeDecimal(1000000) },
      ]);

      // Act
      const result = await service.getEmployeeCommissions('emp-3', from, to);

      // Assert
      expect(result.commissionRate).toBe(0);
      expect(result.commissionAmount).toBe(0);
    });

    it('should use default rate for unknown roles', async () => {
      // Arrange
      const employee = { id: 'emp-4', role: 'custom_role' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { id: 'tx-1', grandTotal: makeDecimal(100000) },
      ]);

      // Act
      const result = await service.getEmployeeCommissions('emp-4', from, to);

      // Assert
      expect(result.commissionRate).toBe(0.01); // DEFAULT_COMMISSION_RATE
      expect(result.commissionAmount).toBe(1000);
    });

    it('should throw NotFoundException if employee not found', async () => {
      // Arrange
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getEmployeeCommissions('nonexistent', from, to),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // Clock In / Clock Out
  // ==========================================================================

  describe('clockIn', () => {
    it('should create attendance record on successful clock in', async () => {
      // Arrange
      const employee = { id: 'emp-1', name: 'John' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.employeeAttendance.findFirst as jest.Mock).mockResolvedValue(null);

      const clockInTime = new Date();
      const createdAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        clockInTime,
        clockOutTime: null,
        status: 'present',
      };
      (mockPrisma.employeeAttendance.create as jest.Mock).mockResolvedValue(createdAttendance);

      // Act
      const result = await service.clockIn('emp-1', 'outlet-1');

      // Assert
      expect(result.attendanceId).toBe('att-1');
      expect(result.clockInTime).toBeDefined();
      expect(mockPrisma.employeeAttendance.create).toHaveBeenCalledWith({
        data: {
          employeeId: 'emp-1',
          outletId: 'outlet-1',
          clockInTime: expect.any(Date),
          status: 'present',
        },
      });
    });

    it('should throw BusinessError when already clocked in', async () => {
      // Arrange
      const employee = { id: 'emp-1', name: 'John' };
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      const existingAttendance = {
        id: 'att-existing',
        employeeId: 'emp-1',
        clockInTime: new Date(),
        clockOutTime: null,
      };
      (mockPrisma.employeeAttendance.findFirst as jest.Mock).mockResolvedValue(existingAttendance);

      // Act & Assert
      await expect(service.clockIn('emp-1', 'outlet-1')).rejects.toThrow(BusinessError);
      await expect(service.clockIn('emp-1', 'outlet-1')).rejects.toThrow(
        'Employee is already clocked in',
      );
    });

    it('should throw NotFoundException if employee not found', async () => {
      // Arrange
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.clockIn('nonexistent', 'outlet-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clockOut', () => {
    it('should update attendance record on successful clock out', async () => {
      // Arrange
      const clockInTime = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        clockInTime,
        clockOutTime: null,
      };
      (mockPrisma.employeeAttendance.findFirst as jest.Mock).mockResolvedValue(existingAttendance);

      const updatedAttendance = {
        id: 'att-1',
        employeeId: 'emp-1',
        clockInTime,
        clockOutTime: new Date(),
        hoursWorked: makeDecimal(8),
      };
      (mockPrisma.employeeAttendance.update as jest.Mock).mockResolvedValue(updatedAttendance);

      // Act
      const result = await service.clockOut('emp-1');

      // Assert
      expect(result.attendanceId).toBe('att-1');
      expect(result.clockOutTime).toBeDefined();
      expect(result.hoursWorked).toBeGreaterThan(0);
      expect(mockPrisma.employeeAttendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          clockOutTime: expect.any(Date),
          hoursWorked: expect.anything(),
        },
      });
    });

    it('should throw BusinessError when not clocked in', async () => {
      // Arrange
      (mockPrisma.employeeAttendance.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.clockOut('emp-1')).rejects.toThrow(BusinessError);
      await expect(service.clockOut('emp-1')).rejects.toThrow(
        'Employee is not clocked in',
      );
    });
  });
});
