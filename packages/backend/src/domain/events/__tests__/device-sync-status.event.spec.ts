import { DeviceSyncStatusEvent } from '../device-sync-status.event';
import type { DeviceSyncStatus } from '../device-sync-status.event';
import { DomainEvent } from '../domain-event';

describe('DeviceSyncStatusEvent', () => {
  it('should create event with required payload', () => {
    const event = new DeviceSyncStatusEvent(
      'device-1',
      'POS Terminal 1',
      'outlet-1',
      'biz-1',
      'synced',
    );

    expect(event.deviceId).toBe('device-1');
    expect(event.deviceName).toBe('POS Terminal 1');
    expect(event.outletId).toBe('outlet-1');
    expect(event.businessId).toBe('biz-1');
    expect(event.status).toBe('synced');
  });

  it('should create event with optional lastSyncTime', () => {
    const syncTime = new Date('2025-06-01T10:00:00Z');
    const event = new DeviceSyncStatusEvent(
      'device-1',
      'POS Terminal 1',
      'outlet-1',
      'biz-1',
      'synced',
      syncTime,
    );

    expect(event.lastSyncTime).toEqual(syncTime);
  });

  it('should create event with optional errorMessage', () => {
    const event = new DeviceSyncStatusEvent(
      'device-1',
      'POS Terminal 1',
      'outlet-1',
      'biz-1',
      'failed',
      undefined,
      'Connection timeout',
    );

    expect(event.errorMessage).toBe('Connection timeout');
  });

  it('should have correct event name', () => {
    const event = new DeviceSyncStatusEvent('device-1', 'POS 1', 'outlet-1', 'biz-1', 'syncing');

    expect(event.eventName).toBe('device.sync_status');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new DeviceSyncStatusEvent('device-1', 'POS 1', 'outlet-1', 'biz-1', 'syncing');
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new DeviceSyncStatusEvent('device-1', 'POS 1', 'outlet-1', 'biz-1', 'syncing');

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle all valid DeviceSyncStatus values', () => {
    const statuses: DeviceSyncStatus[] = ['syncing', 'synced', 'failed', 'offline'];

    for (const status of statuses) {
      const event = new DeviceSyncStatusEvent('device-1', 'POS 1', 'outlet-1', 'biz-1', status);
      expect(event.status).toBe(status);
    }
  });

  it('should have undefined optional fields when not provided', () => {
    const event = new DeviceSyncStatusEvent('device-1', 'POS 1', 'outlet-1', 'biz-1', 'synced');

    expect(event.lastSyncTime).toBeUndefined();
    expect(event.errorMessage).toBeUndefined();
  });

  it('should create failed event with both lastSyncTime and errorMessage', () => {
    const lastSync = new Date('2025-06-01T09:55:00Z');
    const event = new DeviceSyncStatusEvent(
      'device-1',
      'POS Terminal 1',
      'outlet-1',
      'biz-1',
      'failed',
      lastSync,
      'Network unreachable',
    );

    expect(event.status).toBe('failed');
    expect(event.lastSyncTime).toEqual(lastSync);
    expect(event.errorMessage).toBe('Network unreachable');
  });
});
