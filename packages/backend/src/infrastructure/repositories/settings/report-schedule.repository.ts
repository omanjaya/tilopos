import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { findBusinessSettings, mutateBusinessSettings, type JsonObject } from './json-settings';

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

function readList(settings: JsonObject): ReportScheduleData[] {
  const list = settings.reportSchedules;
  return Array.isArray(list) ? (list as ReportScheduleData[]).map((item) => ({ ...item })) : [];
}

/**
 * Stored in business.settings.reportSchedules; every write is a locked read-modify-write
 * (mutateBusinessSettings) so concurrent settings edits are not lost.
 */
@Injectable()
export class ReportScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  async getReportSchedules(businessId: string): Promise<ReportScheduleData[]> {
    return readList(await findBusinessSettings(this.prisma, businessId));
  }

  async createReportSchedule(
    businessId: string,
    data: CreateReportScheduleData,
  ): Promise<ReportScheduleData> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const schedules = readList(current);
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
      return { settings: { ...current, reportSchedules: schedules }, result: newSchedule };
    });
  }

  async updateReportSchedule(
    businessId: string,
    id: string,
    data: UpdateReportScheduleData,
  ): Promise<ReportScheduleData> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const schedules = readList(current);
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
      return { settings: { ...current, reportSchedules: schedules }, result: updated };
    });
  }

  async deleteReportSchedule(businessId: string, id: string): Promise<void> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const schedules = readList(current);
      const index = schedules.findIndex((s) => s.id === id);

      if (index === -1) {
        throw new NotFoundException('Report schedule not found');
      }

      const filtered = schedules.filter((s) => s.id !== id);
      return { settings: { ...current, reportSchedules: filtered }, result: undefined };
    });
  }
}
