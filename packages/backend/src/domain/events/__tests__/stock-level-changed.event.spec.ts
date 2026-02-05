import { StockLevelChangedEvent } from '../stock-level-changed.event';
import { DomainEvent } from '../domain-event';

describe('StockLevelChangedEvent', () => {
  it('should create event with correct payload', () => {
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', null, 50, 48);

    expect(event.outletId).toBe('outlet-1');
    expect(event.productId).toBe('prod-1');
    expect(event.variantId).toBeNull();
    expect(event.previousQuantity).toBe(50);
    expect(event.newQuantity).toBe(48);
  });

  it('should have correct event name', () => {
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', null, 50, 48);

    expect(event.eventName).toBe('stock.level_changed');
  });

  it('should set occurredOn timestamp', () => {
    const before = new Date();
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', null, 50, 48);
    const after = new Date();

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extend DomainEvent', () => {
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', null, 50, 48);

    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('should handle variantId when provided', () => {
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', 'var-1', 20, 15);

    expect(event.variantId).toBe('var-1');
  });

  it('should handle stock increase scenario', () => {
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', null, 10, 60);

    expect(event.previousQuantity).toBe(10);
    expect(event.newQuantity).toBe(60);
  });

  it('should handle stock decrease to zero', () => {
    const event = new StockLevelChangedEvent('outlet-1', 'prod-1', null, 5, 0);

    expect(event.previousQuantity).toBe(5);
    expect(event.newQuantity).toBe(0);
  });
});
