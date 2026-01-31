import { DomainEvent } from './domain-event';

export class TransactionVoidedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly outletId: string,
    public readonly grandTotal: number,
    public readonly voidedBy: string,
    public readonly reason: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'transaction.voided';
  }
}
