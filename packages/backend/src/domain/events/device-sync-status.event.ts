import { DomainEvent } from './domain-event';

export type DeviceSyncStatus = 'syncing' | 'synced' | 'failed' | 'offline';

export class DeviceSyncStatusEvent extends DomainEvent {
  constructor(
    public readonly deviceId: string,
    public readonly deviceName: string,
    public readonly outletId: string,
    public readonly businessId: string,
    public readonly status: DeviceSyncStatus,
    public readonly lastSyncTime?: Date,
    public readonly errorMessage?: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'device.sync_status';
  }
}
