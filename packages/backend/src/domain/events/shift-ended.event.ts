import { DomainEvent } from './domain-event';

export class ShiftEndedEvent extends DomainEvent {
  constructor(
    public readonly shiftId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
    public readonly outletId: string,
    public readonly businessId: string,
    public readonly totalSales: number,
    public readonly cashCollected: number,
  ) {
    super();
  }

  get eventName(): string {
    return 'shift.ended';
  }
}
