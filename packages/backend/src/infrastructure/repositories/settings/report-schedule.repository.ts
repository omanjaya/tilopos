import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { nextReportSendAt } from '@shared/utils/report-schedule-calendar';
import { findBusinessSettings, mutateBusinessSettings, type JsonObject } from './json-settings';

export interface ReportScheduleData {
  id: string;
  reportType: 'sales' | 'financial' | 'inventory';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive: boolean;
  nextSendAt: string | null;
  lastSentAt: string | null;
  lastStatus?: 'pending' | 'processing' | 'sent' | 'failed' | 'unknown';
  lastError?: string | null;
  lastAttemptAt?: string | null;
  /** Internal fencing token; never accepted from API clients. */
  runId?: string | null;
  scheduledFor?: string | null;
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
      if (schedules.length >= 100)
        throw new BadRequestException('Maximum 100 report schedules per business');
      const newSchedule: ReportScheduleData = {
        id: this.generateId(),
        reportType: data.reportType,
        frequency: data.frequency,
        recipients: [...new Set(data.recipients)],
        isActive: data.isActive ?? true,
        nextSendAt: data.isActive === false ? null : nextReportSendAt(data.frequency, new Date()),
        lastStatus: 'pending',
        lastError: null,
        lastAttemptAt: null,
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
      if (existing.lastStatus === 'processing')
        throw new ConflictException('Report delivery is in progress; try again later');
      const updated: ReportScheduleData = {
        ...existing,
        ...(data.reportType !== undefined && { reportType: data.reportType }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.recipients !== undefined && { recipients: data.recipients }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      };

      updated.nextSendAt = updated.isActive
        ? nextReportSendAt(updated.frequency, new Date())
        : null;
      updated.runId = null;
      updated.scheduledFor = null;
      // Keep the previous result visible until the next attempt.
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

      if (schedules[index].lastStatus === 'processing')
        throw new ConflictException('Report delivery is in progress; try again later');
      const filtered = schedules.filter((s) => s.id !== id);
      return { settings: { ...current, reportSchedules: filtered }, result: undefined };
    });
  }

  /** DB row lock fences replicas even if the Redis scheduler lease expires. */
  async claimDue(businessId: string, id: string, now: Date): Promise<ReportScheduleData | null> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const schedules = readList(current);
      const schedule = schedules.find((s) => s.id === id);
      let result: ReportScheduleData | null = null;
      if (schedule?.isActive) {
        if (schedule.lastStatus === 'processing') {
          if (now.getTime() - new Date(schedule.lastAttemptAt!).getTime() > 30 * 60_000) {
            // SMTP may have accepted the message before the worker stopped. Never replay it.
            schedule.lastStatus = 'unknown';
            schedule.lastError = 'DELIVERY_INTERRUPTED';
            schedule.runId = null;
            schedule.nextSendAt = nextReportSendAt(schedule.frequency, now);
          }
        } else if (!schedule.nextSendAt) {
          schedule.nextSendAt = nextReportSendAt(schedule.frequency, now);
          schedule.lastStatus ??= 'pending';
        } else if (new Date(schedule.nextSendAt) <= now) {
          schedule.scheduledFor =
            schedule.lastStatus === 'failed' && schedule.scheduledFor
              ? schedule.scheduledFor
              : schedule.nextSendAt;
          schedule.runId = randomUUID();
          schedule.lastStatus = 'processing';
          schedule.lastError = null;
          schedule.lastAttemptAt = now.toISOString();
          result = { ...schedule, recipients: [...schedule.recipients] };
        }
      }
      return { settings: { ...current, reportSchedules: schedules }, result };
    });
  }

  async isCurrentRun(businessId: string, id: string, runId: string): Promise<boolean> {
    return (await this.getReportSchedules(businessId)).some(
      (s) =>
        s.id === id &&
        s.isActive &&
        s.runId === runId &&
        s.lastStatus === 'processing' &&
        Date.now() - new Date(s.lastAttemptAt!).getTime() < 29 * 60_000,
    );
  }

  async finishRun(
    businessId: string,
    id: string,
    runId: string,
    status: 'sent' | 'failed' | 'unknown',
    error: string | null,
    now: Date,
  ): Promise<boolean> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const schedules = readList(current);
      const schedule = schedules.find(
        (s) => s.id === id && s.runId === runId && s.lastStatus === 'processing',
      );
      if (schedule) {
        schedule.lastStatus = status;
        schedule.lastError = error;
        schedule.runId = null;
        if (status === 'sent') schedule.lastSentAt = now.toISOString();
        schedule.nextSendAt =
          status === 'failed'
            ? new Date(now.getTime() + 15 * 60_000).toISOString()
            : nextReportSendAt(schedule.frequency, now);
      }
      return { settings: { ...current, reportSchedules: schedules }, result: !!schedule };
    });
  }
}
