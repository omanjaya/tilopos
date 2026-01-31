import { StockTransferStatusChangedEvent } from '../stock-transfer-status-changed.event';
import type { StockTransferStatus } from '../stock-transfer-status-changed.event';
import { DomainEvent } from '../domain-event';

describe('StockTransferStatusChangedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1',
      'outlet-source',
      'outlet-dest',
      'biz-1',
      'requested',
      'approved',
      'emp-1',
    );

    expect(event.transferId).toBe('transfer-1');
    expect(event.sourceOutletId).toBe('outlet-source');
    expect(event.destinationOutletId).toBe('outlet-dest');
    expect(event.businessId).toBe('biz-1');
    expect(event.previousStatus).toBe('requested');
    expect(event.newStatus).toBe('approved');
    expect(event.updatedBy).toBe('emp-1');
  });

  it('should have correct event name', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'requested', 'approved', 'emp-1',
    );

    expect(event.eventName).toBe('stock_transfer.status_changed');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'requested', 'approved', 'emp-1',
    );
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'requested', 'approved', 'emp-1',
    );

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle approved to shipped transition', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'approved', 'shipped', 'emp-2',
    );

    expect(event.previousStatus).toBe('approved');
    expect(event.newStatus).toBe('shipped');
  });

  it('should handle shipped to received transition', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'shipped', 'received', 'emp-3',
    );

    expect(event.previousStatus).toBe('shipped');
    expect(event.newStatus).toBe('received');
  });

  it('should handle rejection transition', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'requested', 'rejected', 'emp-1',
    );

    expect(event.previousStatus).toBe('requested');
    expect(event.newStatus).toBe('rejected');
  });

  it('should handle cancellation transition', () => {
    const event = new StockTransferStatusChangedEvent(
      'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'requested', 'cancelled', 'emp-1',
    );

    expect(event.newStatus).toBe('cancelled');
  });

  it('should accept all valid StockTransferStatus values', () => {
    const statuses: StockTransferStatus[] = [
      'requested', 'approved', 'rejected', 'shipped', 'received', 'cancelled',
    ];

    for (const status of statuses) {
      const event = new StockTransferStatusChangedEvent(
        'transfer-1', 'outlet-source', 'outlet-dest', 'biz-1', 'requested', status, 'emp-1',
      );
      expect(event.newStatus).toBe(status);
    }
  });
});
