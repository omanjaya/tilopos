import { ShiftStartedEvent } from '../shift-started.event';
import { ShiftEndedEvent } from '../shift-ended.event';
import { DomainEvent } from '../domain-event';

describe('ShiftStartedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new ShiftStartedEvent(
      'shift-1',
      'emp-1',
      'John Doe',
      'outlet-1',
      'biz-1',
    );

    expect(event.shiftId).toBe('shift-1');
    expect(event.employeeId).toBe('emp-1');
    expect(event.employeeName).toBe('John Doe');
    expect(event.outletId).toBe('outlet-1');
    expect(event.businessId).toBe('biz-1');
  });

  it('should have correct event name', () => {
    const event = new ShiftStartedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1');

    expect(event.eventName).toBe('shift.started');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new ShiftStartedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1');
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new ShiftStartedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1');

    expect(event).toBeInstanceOf(DomainEvent);
  });
});

describe('ShiftEndedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new ShiftEndedEvent(
      'shift-1',
      'emp-1',
      'John Doe',
      'outlet-1',
      'biz-1',
      1500000,
      1450000,
    );

    expect(event.shiftId).toBe('shift-1');
    expect(event.employeeId).toBe('emp-1');
    expect(event.employeeName).toBe('John Doe');
    expect(event.outletId).toBe('outlet-1');
    expect(event.businessId).toBe('biz-1');
    expect(event.totalSales).toBe(1500000);
    expect(event.cashCollected).toBe(1450000);
  });

  it('should have correct event name', () => {
    const event = new ShiftEndedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1', 0, 0);

    expect(event.eventName).toBe('shift.ended');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new ShiftEndedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1', 0, 0);
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new ShiftEndedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1', 0, 0);

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle zero sales shift', () => {
    const event = new ShiftEndedEvent('shift-1', 'emp-1', 'John', 'outlet-1', 'biz-1', 0, 0);

    expect(event.totalSales).toBe(0);
    expect(event.cashCollected).toBe(0);
  });
});
