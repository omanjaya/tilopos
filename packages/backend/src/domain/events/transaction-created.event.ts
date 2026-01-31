import { DomainEvent } from './domain-event';

export class TransactionCreatedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly outletId: string,
    public readonly grandTotal: number,
    public readonly customerId: string | null,
  ) {
    super();
  }

  get eventName(): string {
    return 'transaction.created';
  }
}
