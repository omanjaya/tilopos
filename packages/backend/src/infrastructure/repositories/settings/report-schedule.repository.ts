import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

export interface ReportScheduleData {
  id: string;
  reportType: 'sales' | 'financial' | 'inventory';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive: boolean;
  nextSendAt: string | null;
  lastSentAt: string | null;
}

export interface CreateReportScheduleData {
  reportType: 'sales' | 'financial' | 'inventory';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive?: boolean;
}

export interface UpdateReportScheduleData {
  reportType?: 'sales' | 'financial' | 'inventory';
  frequency?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  isActive?: boolean;
}

@Injectable()
export class ReportScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  async getReportSchedules(businessId: string): Promise<ReportScheduleData[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const settings = (business.settings as Record<string, unknown>) || {};
    const schedules = settings.reportSchedules as ReportScheduleData[] | undefined;

    if (schedules && Array.isArray(schedules)) {
      return schedules;
    }

    return [];
  }

  async createReportSchedule(
    businessId: string,
    data: CreateReportScheduleData,
  ): Promise<ReportScheduleData> {
    const schedules = await this.getReportSchedules(businessId);
    const newSchedule: ReportScheduleData = {
      id: this.generateId(),
      reportType: data.reportType,
      frequency: data.frequency,
      recipients: data.recipients,
      isActive: data.isActive ?? true,
      nextSendAt: null,
      lastSentAt: null,
    };

    schedules.push(newSchedule);
    await this.saveReportSchedules(businessId, schedules);
    return newSchedule;
  }

  async updateReportSchedule(
    businessId: string,
    id: string,
    data: UpdateReportScheduleData,
  ): Promise<ReportScheduleData> {
    const schedules = await this.getReportSchedules(businessId);
    const index = schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException('Report schedule not found');
    }

    const existing = schedules[index];
    const updated: ReportScheduleData = {
      ...existing,
      ...(data.reportType !== undefined && { reportType: data.reportType }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.recipients !== undefined && { recipients: data.recipients }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    schedules[index] = updated;
    await this.saveReportSchedules(businessId, schedules);
    return updated;
  }

  async deleteReportSchedule(businessId: string, id: string): Promise<void> {
    const schedules = await this.getReportSchedules(businessId);
    const index = schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException('Report schedule not found');
    }

    const filtered = schedules.filter((s) => s.id !== id);
    await this.saveReportSchedules(businessId, filtered);
  }

  private async saveReportSchedules(
    businessId: string,
    schedules: ReportScheduleData[],
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    const currentSettings = (business?.settings as Record<string, unknown>) || {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          reportSchedules: schedules,
        } as never,
      },
    });
  }
}
