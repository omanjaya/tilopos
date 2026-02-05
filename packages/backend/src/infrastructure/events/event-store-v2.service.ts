/**
 * EventStore V2 - Enhanced with versioning, snapshots, and replay
 *
 * Features:
 * - Event versioning with upcaster support
 * - Snapshot store for aggregate state
 * - Replay from snapshot functionality
 * - Event migration for schema changes
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StoredEvent, AggregateState, EventReducer } from './event-store';

// ==================== Additional Types ====================

export interface Snapshot {
  id: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface EventUpcaster {
  /** Event type this upcaster handles */
  eventType: string;

  /** Minimum version this upcaster applies to */
  fromVersion: number;

  /** Transform event data to new schema */
  upcast(event: StoredEvent): StoredEvent;
}

export interface EventMigration {
  /** Migration name/identifier */
  name: string;

  /** Event types this migration applies to */
  eventTypes: string[];

  /** Transform function */
  migrate(event: StoredEvent): StoredEvent;
}

export interface EventEnvelope {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ==================== Enhanced EventStore ====================

@Injectable()
export class EventStoreV2 {
  private readonly logger = new Logger(EventStoreV2.name);
  private readonly upcasters: Map<string, EventUpcaster[]> = new Map();
  private readonly migrations: EventMigration[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // Basic Event Operations (from original EventStore)
  // ===========================================================================

  /**
   * Append a new event for a given aggregate
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
   * Retrieve all events for a given aggregate
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
   * Replay all events for an aggregate through a reducer
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
      const upcastedEvent = this.applyUpcasters(event);
      state = reducer(state, upcastedEvent);
      version = upcastedEvent.version;
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

  // ===========================================================================
  // Event Versioning & Upcasting
  // ===========================================================================

  /**
   * Register an event upcaster for a specific event type
   */
  registerUpcaster(upcaster: EventUpcaster): void {
    const key = `${upcaster.eventType}:v${upcaster.fromVersion}`;
    const existing = this.upcasters.get(key) || [];
    existing.push(upcaster);
    this.upcasters.set(key, existing);
    this.logger.debug(`Registered upcaster for ${key}`);
  }

  /**
   * Register a batch of upcasters
   */
  registerUpcasters(upcasters: EventUpcaster[]): void {
    for (const upcaster of upcasters) {
      this.registerUpcaster(upcaster);
    }
  }

  /**
   * Apply upcasters to an event based on its version
   */
  private applyUpcasters(event: StoredEvent): StoredEvent {
    let upcasted = event;

    // Get all upcasters for this event type
    const typeUpcasters = Array.from(this.upcasters.values())
      .flat()
      .filter((u) => u.eventType === event.eventType && u.fromVersion <= event.version)
      .sort((a, b) => a.fromVersion - b.fromVersion);

    for (const upcaster of typeUpcasters) {
      try {
        upcasted = upcaster.upcast(upcasted);
        this.logger.debug(
          `Upcasted ${event.eventType} from v${event.version} using ${upcaster.eventType}:v${upcaster.fromVersion}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to upcast event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw error;
      }
    }

    return upcasted;
  }

  // ===========================================================================
  // Event Migration
  // ===========================================================================

  /**
   * Register an event migration
   */
  registerMigration(migration: EventMigration): void {
    this.migrations.push(migration);
    this.logger.debug(`Registered migration: ${migration.name}`);
  }

  /**
   * Migrate events to a new schema
   */
  async migrateEvents(
    aggregateId?: string,
    aggregateType?: string,
    beforeVersion?: number,
  ): Promise<{ migrated: number; errors: string[] }> {
    this.logger.log('Starting event migration...');

    const events = await this.getEvents(aggregateId || '', aggregateType);
    const toMigrate = beforeVersion ? events.filter((e) => e.version < beforeVersion) : events;

    let migrated = 0;
    const errors: string[] = [];

    for (const event of toMigrate) {
      try {
        let migratedEvent = event;

        // Apply applicable migrations
        for (const migration of this.migrations) {
          if (
            migration.eventTypes.includes('*') ||
            migration.eventTypes.includes(event.eventType)
          ) {
            migratedEvent = migration.migrate(migratedEvent);
          }
        }

        // Update stored event if changed
        if (migratedEvent !== event) {
          await this.prisma.auditLog.update({
            where: { id: event.id },
            data: {
              newValue: migratedEvent.eventData as never,
              metadata: { ...migratedEvent.metadata, migrated: true } as never,
            },
          });
          migrated++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Event ${event.id}: ${msg}`);
        this.logger.error(`Failed to migrate event ${event.id}: ${msg}`);
      }
    }

    this.logger.log(`Migration complete: ${migrated} events migrated, ${errors.length} errors`);
    return { migrated, errors };
  }

  // ===========================================================================
  // Snapshot Management
  // ===========================================================================

  /**
   * Save a snapshot of aggregate state
   */
  async saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    state: Record<string, unknown>,
    version: number,
    metadata?: Record<string, unknown>,
  ): Promise<Snapshot> {
    const record = await this.prisma.auditLog.create({
      data: {
        businessId: '00000000-0000-0000-0000-000000000000',
        action: 'snapshot',
        entityType: `snapshot:${aggregateType}`,
        entityId: aggregateId,
        oldValue: { version } as never,
        newValue: state as never,
        metadata: (metadata || {}) as never,
      },
    });

    const snapshot: Snapshot = {
      id: record.id,
      aggregateId,
      aggregateType,
      version,
      state: record.newValue as Record<string, unknown>,
      timestamp: record.createdAt,
      metadata: record.metadata as Record<string, unknown>,
    };

    this.logger.debug(`Snapshot saved for ${aggregateType}:${aggregateId} at version ${version}`);

    return snapshot;
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  async getLatestSnapshot(aggregateId: string, aggregateType: string): Promise<Snapshot | null> {
    const record = await this.prisma.auditLog.findFirst({
      where: {
        entityType: `snapshot:${aggregateType}`,
        entityId: aggregateId,
        action: 'snapshot',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      aggregateId: record.entityId || aggregateId,
      aggregateType: record.entityType.replace('snapshot:', ''),
      version: ((record.oldValue as Record<string, unknown>)?.version as number) || 0,
      state: record.newValue as Record<string, unknown>,
      timestamp: record.createdAt,
      metadata: record.metadata as Record<string, unknown>,
    };
  }

  /**
   * Get all snapshots for an aggregate
   */
  async getSnapshots(aggregateId: string, aggregateType: string): Promise<Snapshot[]> {
    const records = await this.prisma.auditLog.findMany({
      where: {
        entityType: `snapshot:${aggregateType}`,
        entityId: aggregateId,
        action: 'snapshot',
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      id: record.id,
      aggregateId: record.entityId || aggregateId,
      aggregateType: record.entityType.replace('snapshot:', ''),
      version: ((record.oldValue as Record<string, unknown>)?.version as number) || 0,
      state: record.newValue as Record<string, unknown>,
      timestamp: record.createdAt,
      metadata: record.metadata as Record<string, unknown>,
    }));
  }

  /**
   * Delete old snapshots, keeping only the N most recent
   */
  async pruneSnapshots(aggregateId: string, aggregateType: string, keepCount = 5): Promise<number> {
    const snapshots = await this.getSnapshots(aggregateId, aggregateType);

    if (snapshots.length <= keepCount) {
      return 0;
    }

    const toDelete = snapshots.slice(keepCount);
    const idsToDelete = toDelete.map((s) => s.id);

    await this.prisma.auditLog.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    this.logger.debug(
      `Pruned ${idsToDelete.length} old snapshots for ${aggregateType}:${aggregateId}`,
    );

    return idsToDelete.length;
  }

  // ===========================================================================
  // Enhanced Replay
  // ===========================================================================

  /**
   * Replay events from a snapshot forward
   */
  async replayFromSnapshot(
    aggregateId: string,
    reducer: EventReducer,
    aggregateType?: string,
  ): Promise<AggregateState> {
    const snapshot = await this.getLatestSnapshot(aggregateId, aggregateType || '');

    if (!snapshot) {
      return this.replay(aggregateId, reducer, {}, aggregateType);
    }

    const events = await this.getEvents(aggregateId, aggregateType);
    const eventsAfterSnapshot = events.filter((e) => e.version > snapshot.version);

    let state = { ...snapshot.state };
    let version = snapshot.version;

    for (const event of eventsAfterSnapshot) {
      const upcastedEvent = this.applyUpcasters(event);
      state = reducer(state, upcastedEvent);
      version = upcastedEvent.version;
    }

    this.logger.debug(
      `Replayed from snapshot: ${eventsAfterSnapshot.length} events from v${snapshot.version} to v${version}`,
    );

    return {
      id: aggregateId,
      version,
      state,
    };
  }

  /**
   * Get events with upcasting applied
   */
  async getEventsUpcasted(aggregateId: string, aggregateType?: string): Promise<StoredEvent[]> {
    const events = await this.getEvents(aggregateId, aggregateType);
    return events.map((e) => this.applyUpcasters(e));
  }

  /**
   * Replay with automatic snapshot creation
   */
  async replayWithSnapshot(
    aggregateId: string,
    reducer: EventReducer,
    aggregateType: string,
    snapshotThreshold = 100,
  ): Promise<AggregateState> {
    const events = await this.getEvents(aggregateId, aggregateType);

    if (events.length < snapshotThreshold) {
      return this.replay(aggregateId, reducer, {}, aggregateType);
    }

    const result = await this.replayFromSnapshot(aggregateId, reducer, aggregateType);

    const snapshot = await this.getLatestSnapshot(aggregateId, aggregateType);
    const eventsSinceSnapshotCount = events.filter(
      (e) => !snapshot || e.version > snapshot.version,
    ).length;

    if (eventsSinceSnapshotCount >= snapshotThreshold / 2) {
      await this.saveSnapshot(aggregateId, aggregateType, result.state, result.version);
      await this.pruneSnapshots(aggregateId, aggregateType);
    }

    return result;
  }

  /**
   * Get events by type
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

  // ===========================================================================
  // Event Streaming
  // ===========================================================================

  /**
   * Stream events for an aggregate
   */
  async *streamEvents(
    aggregateId: string,
    aggregateType?: string,
    batchSize = 100,
  ): AsyncGenerator<StoredEvent[], void, unknown> {
    let offset = 0;

    while (true) {
      const events = await this.prisma.auditLog.findMany({
        where: {
          entityId: aggregateId,
          ...(aggregateType && { entityType: aggregateType }),
          action: { startsWith: 'event:' },
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
        skip: offset,
      });

      if (events.length === 0) {
        break;
      }

      const upcasted = events
        .map((record) => ({
          id: record.id,
          aggregateId: record.entityId || aggregateId,
          aggregateType: record.entityType,
          eventType: record.action.replace('event:', ''),
          eventData: record.newValue as Record<string, unknown>,
          version: ((record.oldValue as Record<string, unknown>)?.version as number) || 0,
          occurredOn: record.createdAt,
          metadata: record.metadata as Record<string, unknown>,
        }))
        .map((e) => this.applyUpcasters(e));

      yield upcasted;

      offset += batchSize;

      if (events.length < batchSize) {
        break;
      }
    }
  }
}
