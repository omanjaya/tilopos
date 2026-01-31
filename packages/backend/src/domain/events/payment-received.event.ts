import { DomainEvent } from './domain-event';

export class PaymentReceivedEvent extends DomainEvent {
  constructor(
    public readonly paymentId: string,
    public readonly transactionId: string,
    public readonly outletId: string,
    public readonly businessId: string,
    public readonly amount: number,
    public readonly paymentMethod: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'payment.received';
  }
}
