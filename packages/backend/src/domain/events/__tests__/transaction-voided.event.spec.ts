import { TransactionVoidedEvent } from '../transaction-voided.event';
import { DomainEvent } from '../domain-event';

describe('TransactionVoidedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new TransactionVoidedEvent(
      'txn-1',
      'outlet-1',
      55500,
      'emp-1',
      'Customer request',
    );

    expect(event.transactionId).toBe('txn-1');
    expect(event.outletId).toBe('outlet-1');
    expect(event.grandTotal).toBe(55500);
    expect(event.voidedBy).toBe('emp-1');
    expect(event.reason).toBe('Customer request');
  });

  it('should have correct event name', () => {
    const event = new TransactionVoidedEvent('txn-1', 'outlet-1', 55500, 'emp-1', 'reason');

    expect(event.eventName).toBe('transaction.voided');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new TransactionVoidedEvent('txn-1', 'outlet-1', 55500, 'emp-1', 'reason');
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new TransactionVoidedEvent('txn-1', 'outlet-1', 55500, 'emp-1', 'reason');

    expect(event).toBeInstanceOf(DomainEvent);
  });
});
