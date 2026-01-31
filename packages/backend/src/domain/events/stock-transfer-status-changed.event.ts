import { DomainEvent } from './domain-event';

export type StockTransferStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'shipped'
  | 'received'
  | 'cancelled';

export class StockTransferStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly transferId: string,
    public readonly sourceOutletId: string,
    public readonly destinationOutletId: string,
    public readonly businessId: string,
    public readonly previousStatus: StockTransferStatus,
    public readonly newStatus: StockTransferStatus,
    public readonly updatedBy: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'stock_transfer.status_changed';
  }
}
