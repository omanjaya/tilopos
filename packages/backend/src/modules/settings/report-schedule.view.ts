import type { ReportScheduleRecord } from '@domain/interfaces/repositories/settings.repository';

/** Do not expose worker fencing tokens or mutable delivery internals. */
export function reportScheduleView(schedule: ReportScheduleRecord, deliveryConfigured: boolean) {
  return {
    id: schedule.id,
    reportType: schedule.reportType,
    frequency: schedule.frequency,
    recipients: schedule.recipients,
    isActive: schedule.isActive,
    nextSendAt: schedule.nextSendAt,
    lastSentAt: schedule.lastSentAt,
    lastStatus: schedule.lastStatus ?? 'pending',
    lastError: schedule.lastError ?? null,
    lastAttemptAt: schedule.lastAttemptAt ?? null,
    deliveryConfigured,
  };
}
