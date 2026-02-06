import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BusinessError } from '../../shared/errors/business-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import {
  ScheduleEntry,
  WeeklyScheduleGrid,
  WeeklyScheduleDay,
  CreateScheduleData,
  UpdateScheduleData,
} from './employee.types';
import { DAY_NAMES } from './employee.constants';

/**
 * Service responsible for managing employee schedules.
 * Handles creation, updates, deletion, and retrieval of employee work schedules.
 */
@Injectable()
export class EmployeeScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new schedule entry for an employee.
   *
   * @param data - Schedule creation data
   * @returns Created schedule entry
   */
  async createSchedule(data: CreateScheduleData): Promise<ScheduleEntry> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true, name: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const schedule = await this.prisma.employeeSchedule.create({
      data: {
        employeeId: data.employeeId,
        outletId: data.outletId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes ?? null,
      },
      include: {
        employee: { select: { name: true } },
      },
    });

    return {
      id: schedule.id,
      employeeId: schedule.employeeId,
      employeeName: schedule.employee.name,
      outletId: schedule.outletId,
      date: schedule.date.toISOString().split('T')[0],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      notes: schedule.notes,
    };
  }

  /**
   * Get weekly schedule grid for an outlet.
   * Returns a 7-day schedule starting from the specified week start date.
   *
   * @param outletId - Outlet ID
   * @param weekStart - Week start date (typically Monday)
   * @returns Weekly schedule grid with all employee schedules
   */
  async getWeeklySchedule(outletId: string, weekStart: Date): Promise<WeeklyScheduleGrid> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        outletId,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        employee: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const days: WeeklyScheduleDay[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayEntries = schedules
        .filter((s) => s.date.toISOString().split('T')[0] === dateStr)
        .map((s) => ({
          id: s.id,
          employeeId: s.employeeId,
          employeeName: s.employee.name,
          outletId: s.outletId,
          date: dateStr,
          startTime: s.startTime,
          endTime: s.endTime,
          notes: s.notes,
        }));

      days.push({
        date: dateStr,
        dayOfWeek: DAY_NAMES[currentDate.getDay()],
        entries: dayEntries,
      });
    }

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      days,
    };
  }

  /**
   * Update an existing schedule entry.
   *
   * @param scheduleId - Schedule entry ID
   * @param data - Update data
   * @returns Updated schedule entry
   */
  async updateSchedule(scheduleId: string, data: UpdateScheduleData): Promise<ScheduleEntry> {
    const existing = await this.prisma.employeeSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new BusinessError(ErrorCode.SCHEDULE_NOT_FOUND, 'Schedule entry not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.outletId !== undefined) updateData.outletId = data.outletId;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await this.prisma.employeeSchedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        employee: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      employeeId: updated.employeeId,
      employeeName: updated.employee.name,
      outletId: updated.outletId,
      date: updated.date.toISOString().split('T')[0],
      startTime: updated.startTime,
      endTime: updated.endTime,
      notes: updated.notes,
    };
  }

  /**
   * Delete a schedule entry.
   *
   * @param scheduleId - Schedule entry ID
   * @returns Success message
   */
  async deleteSchedule(scheduleId: string): Promise<{ message: string }> {
    const existing = await this.prisma.employeeSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new BusinessError(ErrorCode.SCHEDULE_NOT_FOUND, 'Schedule entry not found');
    }

    await this.prisma.employeeSchedule.delete({
      where: { id: scheduleId },
    });

    return { message: 'Schedule entry deleted' };
  }
}
