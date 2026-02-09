import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AppointmentStatus } from '@prisma/client';

export interface CreateAppointmentDto {
  outletId: string;
  customerId?: string;
  employeeId?: string;
  serviceName: string;
  servicePrice: number;
  startTime: string;
  durationMinutes: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface UpdateAppointmentDto {
  outletId?: string;
  customerId?: string;
  employeeId?: string;
  serviceName?: string;
  servicePrice?: number;
  startTime?: string;
  durationMinutes?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, data: CreateAppointmentDto) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60 * 1000);

    return this.prisma.appointment.create({
      data: {
        businessId,
        outletId: data.outletId,
        customerId: data.customerId ?? null,
        employeeId: data.employeeId ?? null,
        serviceName: data.serviceName,
        servicePrice: data.servicePrice,
        startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        notes: data.notes ?? null,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, businessId: string, data: UpdateAppointmentDto) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};

    if (data.outletId !== undefined) updateData.outletId = data.outletId;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;
    if (data.servicePrice !== undefined) updateData.servicePrice = data.servicePrice;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;

    if (data.startTime !== undefined || data.durationMinutes !== undefined) {
      const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
      const durationMinutes = data.durationMinutes ?? existing.durationMinutes;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      updateData.startTime = startTime;
      updateData.endTime = endTime;
      updateData.durationMinutes = durationMinutes;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  }

  async cancel(id: string, businessId: string, reason?: string) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.cancelled,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: string, businessId: string, status: AppointmentStatus) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string, businessId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, businessId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        employee: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    return appointment;
  }

  async listByDate(outletId: string, businessId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        outletId,
        businessId,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async listByEmployee(employeeId: string, businessId: string, startDate: string, endDate: string) {
    return this.prisma.appointment.findMany({
      where: {
        employeeId,
        businessId,
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async listByCustomer(customerId: string, businessId: string) {
    return this.prisma.appointment.findMany({
      where: {
        customerId,
        businessId,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async checkAvailability(
    outletId: string,
    employeeId: string,
    startTime: string,
    durationMinutes: number,
    excludeId?: string,
  ) {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        outletId,
        employeeId,
        status: {
          in: [
            AppointmentStatus.scheduled,
            AppointmentStatus.confirmed,
            AppointmentStatus.in_progress,
          ],
        },
        ...(excludeId && { id: { not: excludeId } }),
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    return { available: !overlapping };
  }

  async getUpcoming(outletId: string, businessId: string) {
    return this.prisma.appointment.findMany({
      where: {
        outletId,
        businessId,
        startTime: { gte: new Date() },
        status: { in: [AppointmentStatus.scheduled, AppointmentStatus.confirmed] },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
