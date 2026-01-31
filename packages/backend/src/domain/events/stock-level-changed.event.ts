import { DomainEvent } from './domain-event';

export class StockLevelChangedEvent extends DomainEvent {
  constructor(
    public readonly outletId: string,
    public readonly productId: string,
    public readonly variantId: string | null,
    public readonly previousQuantity: number,
    public readonly newQuantity: number,
  ) {
    super();
  }

  get eventName(): string {
    return 'stock.level_changed';
  }
}
