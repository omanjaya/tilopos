import { DomainEvent } from './domain-event';

export class OrderStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly outletId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'order.status_changed';
  }
}
