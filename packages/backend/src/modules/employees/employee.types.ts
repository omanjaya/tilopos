// ============================================================================
// Shift Report Types
// ============================================================================

export interface ShiftDetail {
  shiftId: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  sales: number;
  transactions: number;
  cashDifference: number | null;
}

export interface EmployeeShiftReport {
  employeeId: string;
  employeeName: string;
  totalShifts: number;
  totalHoursWorked: number;
  averageShiftDuration: number;
  totalSales: number;
  totalTransactions: number;
  cashVariance: number;
  shifts: ShiftDetail[];
}

export interface EmployeeShiftSummary {
  employeeId: string;
  employeeName: string;
  totalShifts: number;
  totalHoursWorked: number;
  totalSales: number;
  totalTransactions: number;
  cashVariance: number;
}

// ============================================================================
// Schedule Types
// ============================================================================

export interface ScheduleEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
}

export interface WeeklyScheduleDay {
  date: string;
  dayOfWeek: string;
  entries: ScheduleEntry[];
}

export interface WeeklyScheduleGrid {
  weekStart: string;
  weekEnd: string;
  days: WeeklyScheduleDay[];
}

export interface CreateScheduleData {
  employeeId: string;
  outletId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateScheduleData {
  employeeId?: string;
  outletId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

// ============================================================================
// Commission Types
// ============================================================================

export interface TransactionCommission {
  transactionId: string;
  amount: number;
  commission: number;
}

export interface EmployeeCommission {
  employeeId: string;
  period: { from: string; to: string };
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
  transactions: TransactionCommission[];
}

export interface EmployeeCommissionSummary {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
  transactionCount: number;
}

// ============================================================================
// Attendance Types
// ============================================================================

export interface AttendanceRecord {
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  status: 'present' | 'absent' | 'late';
}

export interface AttendanceClockInResult {
  attendanceId: string;
  clockInTime: string;
}

export interface AttendanceClockOutResult {
  attendanceId: string;
  clockOutTime: string;
  hoursWorked: number;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalHoursWorked: number;
}
