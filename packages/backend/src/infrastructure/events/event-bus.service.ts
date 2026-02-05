import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';
import { DomainEvent } from '../../domain/events/domain-event';

@Injectable()
export class EventBusService {
  private readonly subject = new Subject<DomainEvent>();

  publish(event: DomainEvent): void {
    this.subject.next(event);
  }

  ofType<T extends DomainEvent>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventType: new (...args: any[]) => T,
  ): Observable<T> {
    return this.subject
      .asObservable()
      .pipe(filter((event): event is T => event instanceof eventType));
  }

  onAll(): Observable<DomainEvent> {
    return this.subject.asObservable();
  }
}
