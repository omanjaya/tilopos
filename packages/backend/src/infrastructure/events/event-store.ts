import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// ==================== Types ====================

export interface StoredEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredOn: Date;
  metadata: Record<string, unknown>;
}

export interface EventEnvelope {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AggregateState {
  id: string;
  version: number;
  state: Record<string, unknown>;
}

export type EventReducer = (
  state: Record<string, unknown>,
  event: StoredEvent,
) => Record<string, unknown>;

// ==================== Service ====================

/**
 * EventStore persists all domain events using the AuditLog table.
 *
 * Mapping to AuditLog fields:
 * - aggregateId  -> entityId
 * - aggregateType -> entityType
 * - eventType    -> action
 * - eventData    -> newValue (JSON)
 * - metadata     -> metadata (JSON)
 * - version      -> stored within oldValue as { version: N }
 * - occurredOn   -> createdAt
 *
 * A dedicated businessId is required; we use a sentinel value 'event-store'
 * for system-level events, or the actual business ID for tenant-scoped events.
 */
@Injectable()
export class EventStore {
  private readonly logger = new Logger(EventStore.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a new event for a given aggregate.
   * Automatically assigns a monotonically increasing version number.
   */
  async append(
    envelope: EventEnvelope,
    businessId = '00000000-0000-0000-0000-000000000000',
  ): Promise<StoredEvent> {
    // Get current version for this aggregate
    const latestEvent = await this.prisma.auditLog.findFirst({
      where: {
        entityType: envelope.aggregateType,
        entityId: envelope.aggregateId,
        action: { startsWith: 'event:' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentVersion = latestEvent?.oldValue
      ? (((latestEvent.oldValue as Record<string, unknown>).version as number) ?? 0)
      : 0;

    const newVersion = currentVersion + 1;

    const record = await this.prisma.auditLog.create({
      data: {
        businessId,
        action: `event:${envelope.eventType}`,
        entityType: envelope.aggregateType,
        entityId: envelope.aggregateId,
        oldValue: { version: newVersion } as never,
        newValue: envelope.eventData as never,
        metadata: (envelope.metadata ?? {}) as never,
      },
    });

    const storedEvent: StoredEvent = {
      id: record.id,
      aggregateId: envelope.aggregateId,
      aggregateType: envelope.aggregateType,
      eventType: envelope.eventType,
      eventData: record.newValue as Record<string, unknown>,
      version: newVersion,
      occurredOn: record.createdAt,
      metadata: record.metadata as Record<string, unknown>,
    };

    this.logger.debug(
      `Event appended: ${envelope.eventType} for ${envelope.aggregateType}:${envelope.aggregateId} (v${newVersion})`,
    );

    return storedEvent;
  }

  /**
   * Retrieve all events for a given aggregate, ordered by version ascending.
   */
  async getEvents(aggregateId: string, aggregateType?: string): Promise<StoredEvent[]> {
    const whereClause: Record<string, unknown> = {
      entityId: aggregateId,
      action: { startsWith: 'event:' },
    };

    if (aggregateType) {
      whereClause.entityType = aggregateType;
    }

    const records = await this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => ({
      id: record.id,
      aggregateId: record.entityId ?? aggregateId,
      aggregateType: record.entityType,
      eventType: record.action.replace('event:', ''),
      eventData: record.newValue as Record<string, unknown>,
      version: ((record.oldValue as Record<string, unknown>)?.version as number) ?? 0,
      occurredOn: record.createdAt,
      metadata: record.metadata as Record<string, unknown>,
    }));
  }

  /**
   * Query events by event type, optionally filtered by a since timestamp.
   */
  async getEventsByType(eventType: string, since?: Date): Promise<StoredEvent[]> {
    const whereClause: Record<string, unknown> = {
      action: `event:${eventType}`,
    };

    if (since) {
      whereClause.createdAt = { gte: since };
    }

    const records = await this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => ({
      id: record.id,
      aggregateId: record.entityId ?? '',
      aggregateType: record.entityType,
      eventType: record.action.replace('event:', ''),
      eventData: record.newValue as Record<string, unknown>,
      version: ((record.oldValue as Record<string, unknown>)?.version as number) ?? 0,
      occurredOn: record.createdAt,
      metadata: record.metadata as Record<string, unknown>,
    }));
  }

  /**
   * Replay all events for an aggregate through a reducer function
   * to rebuild the current aggregate state.
   */
  async replay(
    aggregateId: string,
    reducer: EventReducer,
    initialState: Record<string, unknown> = {},
    aggregateType?: string,
  ): Promise<AggregateState> {
    const events = await this.getEvents(aggregateId, aggregateType);

    let state = { ...initialState };
    let version = 0;

    for (const event of events) {
      state = reducer(state, event);
      version = event.version;
    }

    this.logger.debug(
      `Replayed ${events.length} events for aggregate ${aggregateId} to version ${version}`,
    );

    return {
      id: aggregateId,
      version,
      state,
    };
  }
}
