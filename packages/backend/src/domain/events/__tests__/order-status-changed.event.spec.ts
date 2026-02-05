import { OrderStatusChangedEvent } from '../order-status-changed.event';
import { DomainEvent } from '../domain-event';

describe('OrderStatusChangedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new OrderStatusChangedEvent('order-1', 'outlet-1', 'pending', 'preparing');

    expect(event.orderId).toBe('order-1');
    expect(event.outletId).toBe('outlet-1');
    expect(event.previousStatus).toBe('pending');
    expect(event.newStatus).toBe('preparing');
  });

  it('should have correct event name', () => {
    const event = new OrderStatusChangedEvent('order-1', 'outlet-1', 'pending', 'preparing');

    expect(event.eventName).toBe('order.status_changed');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new OrderStatusChangedEvent('order-1', 'outlet-1', 'pending', 'preparing');
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new OrderStatusChangedEvent('order-1', 'outlet-1', 'pending', 'preparing');

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle empty previous status (initial creation)', () => {
    const event = new OrderStatusChangedEvent('order-1', 'outlet-1', '', 'pending');

    expect(event.previousStatus).toBe('');
    expect(event.newStatus).toBe('pending');
  });
});
