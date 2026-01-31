import { TransactionCreatedEvent } from '../transaction-created.event';
import { DomainEvent } from '../domain-event';

describe('TransactionCreatedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new TransactionCreatedEvent(
      'txn-1',
      'outlet-1',
      55500,
      'cust-1',
    );

    expect(event.transactionId).toBe('txn-1');
    expect(event.outletId).toBe('outlet-1');
    expect(event.grandTotal).toBe(55500);
    expect(event.customerId).toBe('cust-1');
  });

  it('should have correct event name', () => {
    const event = new TransactionCreatedEvent('txn-1', 'outlet-1', 55500, null);

    expect(event.eventName).toBe('transaction.created');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new TransactionCreatedEvent('txn-1', 'outlet-1', 55500, null);
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new TransactionCreatedEvent('txn-1', 'outlet-1', 55500, null);

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle null customerId', () => {
    const event = new TransactionCreatedEvent('txn-1', 'outlet-1', 55500, null);

    expect(event.customerId).toBeNull();
  });

  it('should store immutable properties', () => {
    const event = new TransactionCreatedEvent('txn-1', 'outlet-1', 55500, 'cust-1');

    // readonly properties: attempting to access confirms they exist
    expect(event.transactionId).toBe('txn-1');
    expect(event.outletId).toBe('outlet-1');
    expect(event.grandTotal).toBe(55500);
    expect(event.customerId).toBe('cust-1');
  });
});
