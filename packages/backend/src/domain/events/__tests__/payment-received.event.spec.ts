import { PaymentReceivedEvent } from '../payment-received.event';
import { DomainEvent } from '../domain-event';

describe('PaymentReceivedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new PaymentReceivedEvent(
      'pay-1',
      'txn-1',
      'outlet-1',
      'biz-1',
      55500,
      'cash',
    );

    expect(event.paymentId).toBe('pay-1');
    expect(event.transactionId).toBe('txn-1');
    expect(event.outletId).toBe('outlet-1');
    expect(event.businessId).toBe('biz-1');
    expect(event.amount).toBe(55500);
    expect(event.paymentMethod).toBe('cash');
  });

  it('should have correct event name', () => {
    const event = new PaymentReceivedEvent('pay-1', 'txn-1', 'outlet-1', 'biz-1', 55500, 'cash');

    expect(event.eventName).toBe('payment.received');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new PaymentReceivedEvent('pay-1', 'txn-1', 'outlet-1', 'biz-1', 55500, 'cash');
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new PaymentReceivedEvent('pay-1', 'txn-1', 'outlet-1', 'biz-1', 55500, 'cash');

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle different payment methods', () => {
    const cashEvent = new PaymentReceivedEvent('pay-1', 'txn-1', 'outlet-1', 'biz-1', 55500, 'cash');
    const debitEvent = new PaymentReceivedEvent('pay-2', 'txn-1', 'outlet-1', 'biz-1', 55500, 'debit_card');
    const qrisEvent = new PaymentReceivedEvent('pay-3', 'txn-1', 'outlet-1', 'biz-1', 55500, 'qris');

    expect(cashEvent.paymentMethod).toBe('cash');
    expect(debitEvent.paymentMethod).toBe('debit_card');
    expect(qrisEvent.paymentMethod).toBe('qris');
  });
});
