# Sync Engine Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│  (React Components, Hooks: useSync, useOfflinePOS)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ imports
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      index.ts (Public API)                       │
│  Exports: syncEngine, types, constants, hooks                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ re-exports
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SyncEngine (Orchestrator)                     │
│                     sync-engine.service.ts                       │
│                                                                  │
│  Responsibilities:                                               │
│  • Initialize IndexedDB                                          │
│  • Coordinate services                                           │
│  • Manage online/offline state                                   │
│  • Public API (initialize, queueOperation, processQueue, etc)   │
│  • Event emission (queued, synced, conflict, error)             │
│                                                                  │
│  Dependencies:                                                   │
│  ├─▶ SyncQueueService                                           │
│  ├─▶ SyncExecutorService                                        │
│  ├─▶ ConflictResolverService                                    │
│  └─▶ RetryManagerService                                        │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│SyncQueue    │ │SyncExecutor │ │Conflict     │ │Retry        │
│Service      │ │Service      │ │Resolver     │ │Manager      │
│             │ │             │ │Service      │ │Service      │
│198 lines    │ │208 lines    │ │212 lines    │ │251 lines    │
│             │ │             │ │             │ │             │
│• addToQueue │ │• execute    │ │• resolve    │ │• shouldRetry│
│• getPending │ │  Sync       │ │  Conflict   │ │• calculate  │
│• getFailed  │ │  Operation  │ │• detect     │ │  RetryDelay │
│• getConflict│ │• forcePush  │ │  Conflict   │ │• execute    │
│• updateItem │ │• pullChanges│ │• mergeData  │ │  WithRetry  │
│  Status     │ │• updateCache│ │• apply      │ │• isRetryable│
│• increment  │ │• checkHealth│ │  Manual     │ │  Error      │
│  RetryCount │ │             │ │  Resolution │ │• batchRetry │
│• getQueue   │ │             │ │             │ │             │
│  Status     │ │             │ │             │ │             │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────────────┘
       │               │               │
       │               │               │
       ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         IndexedDB (idb)                          │
│                        TiloPOSDB Schema                          │
│                                                                  │
│  Stores:                                                         │
│  • syncQueue    - Pending sync operations                       │
│  • products     - Cached products                               │
│  • categories   - Cached categories                             │
│  • transactions - Cached transactions                           │
│  • customers    - Cached customers                              │
│  • settings     - App settings                                  │
│  • metadata     - Sync metadata (last sync times)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
                         ▼
                ┌────────────────┐
                │ Backend API    │
                │ (NestJS)       │
                │ /api/v1/*      │
                └────────────────┘
```

## Data Flow

### 1. Write Operation (Create/Update/Delete)

```
User Action
    │
    ▼
SyncEngine.saveLocal() / deleteLocal()
    │
    ├─▶ Update IndexedDB cache (via direct DB access)
    │
    └─▶ SyncQueueService.addToQueue()
            │
            └─▶ Add to syncQueue store in IndexedDB
                    │
                    ▼
                If online:
                SyncEngine.processQueue()
                    │
                    └─▶ For each pending item:
                            │
                            ├─▶ RetryManagerService.executeWithRetry()
                            │       │
                            │       └─▶ SyncExecutorService.executeSyncOperation()
                            │               │
                            │               └─▶ HTTP POST/PUT/DELETE to API
                            │                       │
                            │                       ├─▶ Success: Update queue status
                            │                       │
                            │                       └─▶ Conflict (409):
                            │                               │
                            │                               └─▶ ConflictResolverService.resolveConflict()
                            │                                       │
                            │                                       ├─▶ server-wins: Update cache
                            │                                       ├─▶ client-wins: Force push
                            │                                       └─▶ manual: Emit conflict event
                            │
                            └─▶ Error:
                                    │
                                    └─▶ RetryManagerService.isRetryableError()
                                            │
                                            ├─▶ Yes: Increment retry count
                                            └─▶ No: Mark as failed
```

### 2. Read Operation (Get cached data)

```
User Request
    │
    ▼
SyncEngine.getCached() / getAllCached()
    │
    └─▶ Query IndexedDB directly
            │
            └─▶ Return cached data (offline-first)
```

### 3. Pull Changes from Server

```
SyncEngine.pullChanges()
    │
    └─▶ SyncExecutorService.pullChangesFromServer()
            │
            └─▶ HTTP GET /api/products?since=timestamp
                    │
                    ▼
            SyncExecutorService.batchUpdateLocalCache()
                    │
                    └─▶ Update IndexedDB with server data
```

### 4. Periodic Sync (Background)

```
Timer (every 30 seconds)
    │
    ▼
If online:
    SyncEngine.processQueue()
        │
        └─▶ [Same as Write Operation flow above]
```

## Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SyncEngine                               │
│                                                                  │
│  Events emitted:                                                 │
│  • initialized    - DB ready                                     │
│  • online         - Came online                                  │
│  • offline        - Went offline                                 │
│  • queued         - Item added to queue                          │
│  • queueProcessed - Queue processing complete                    │
│  • syncError      - Sync failed                                  │
│  • conflict       - Conflict detected                            │
│  • pulled         - Changes pulled from server                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ emit
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Listeners                               │
│                                                                  │
│  • Application components (UI updates)                           │
│  • React hooks (useSync, useOfflinePOS)                          │
│  • Logging/monitoring                                            │
│  • Analytics                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Service Dependencies

```
SyncEngine
    │
    ├─▶ SyncQueueService
    │       │
    │       └─▶ IndexedDB (syncQueue store)
    │
    ├─▶ SyncExecutorService
    │       │
    │       ├─▶ IndexedDB (entity stores)
    │       └─▶ Backend API (fetch)
    │
    ├─▶ ConflictResolverService
    │       │
    │       └─▶ SyncExecutorService (for updateCache, forcePush)
    │
    └─▶ RetryManagerService
            │
            └─▶ No external dependencies (pure logic)
```

## Type Hierarchy

```
types/sync.types.ts
    │
    ├─▶ EntityType (union type)
    ├─▶ SyncOperation ('create' | 'update' | 'delete')
    ├─▶ SyncStatus ('pending' | 'syncing' | 'completed' | 'failed' | 'conflict')
    ├─▶ ConflictStrategy ('server-wins' | 'client-wins' | 'manual')
    │
    ├─▶ Interfaces:
    │   ├─▶ SyncQueueItem
    │   ├─▶ CachedEntity<T>
    │   ├─▶ SyncMetadata
    │   ├─▶ SyncEngineConfig
    │   ├─▶ SyncEvent
    │   ├─▶ SyncQueueStatus
    │   ├─▶ RetryOptions
    │   └─▶ ConflictResolution
    │
    ├─▶ Entity Types:
    │   ├─▶ Product
    │   ├─▶ Category
    │   ├─▶ Transaction
    │   └─▶ Customer
    │
    └─▶ Database Schema:
        └─▶ TiloPOSDB extends DBSchema
```

## Configuration Flow

```
constants/sync.constants.ts
    │
    ├─▶ DEFAULT_SYNC_CONFIG
    │   ├─▶ dbName: 'tilopos-offline'
    │   ├─▶ dbVersion: 1
    │   ├─▶ syncInterval: 30000 (30 seconds)
    │   ├─▶ maxRetries: 3
    │   ├─▶ conflictStrategy: 'server-wins'
    │   └─▶ apiBaseUrl: '/api'
    │
    ├─▶ RETRY_CONFIG
    │   ├─▶ BACKOFF_FACTOR: 2
    │   ├─▶ MAX_BACKOFF: 60000 (60 seconds)
    │   └─▶ INITIAL_DELAY: 1000 (1 second)
    │
    ├─▶ ENTITY_TYPES
    ├─▶ SYNC_STATUS
    ├─▶ SYNC_EVENTS
    └─▶ HTTP_STATUS
```

## Initialization Sequence

```
1. new SyncEngine(config?)
    │
    ├─▶ Merge config with DEFAULT_SYNC_CONFIG
    └─▶ Setup window event listeners (online/offline)
        │
        ▼
2. syncEngine.initialize()
    │
    ├─▶ openDB() - Initialize IndexedDB
    │       │
    │       └─▶ Create object stores and indexes
    │
    ├─▶ Initialize services:
    │   ├─▶ new SyncQueueService(db)
    │   ├─▶ new SyncExecutorService(db, config)
    │   ├─▶ new ConflictResolverService(executor, strategy)
    │   └─▶ new RetryManagerService(maxRetries)
    │
    ├─▶ Start sync timer (setInterval)
    │
    └─▶ Emit 'initialized' event
```

## Error Handling Flow

```
Operation fails
    │
    ▼
RetryManagerService.isRetryableError()
    │
    ├─▶ Network error / 5xx → Retryable
    ├─▶ 409 Conflict → Not retryable (use conflict resolver)
    ├─▶ 4xx Client error → Not retryable
    └─▶ Default → Retryable
        │
        ▼
If Retryable:
    │
    ├─▶ RetryManagerService.shouldRetry()
    │       │
    │       └─▶ Check if retryCount < maxRetries
    │               │
    │               ├─▶ Yes: Calculate backoff delay
    │               │       │
    │               │       └─▶ Wait and retry
    │               │
    │               └─▶ No: Mark as failed
    │
    └─▶ SyncQueueService.incrementRetryCount()
            │
            └─▶ Update queue item in IndexedDB

If Not Retryable:
    │
    └─▶ SyncQueueService.updateItemStatus('failed')
```

## Offline/Online State Machine

```
                    ┌──────────┐
                    │  OFFLINE │
                    └────┬─────┘
                         │
              Browser goes online
                         │
                         ▼
                    ┌──────────┐
                    │  ONLINE  │
                    └────┬─────┘
                         │
                         ├─▶ Emit 'online' event
                         │
                         └─▶ SyncEngine.processQueue()
                                  │
                                  └─▶ Sync all pending items
```

## Best Practices for Extension

When adding new features:

1. **New entity type**: Add to `types/sync.types.ts` and update IndexedDB schema
2. **New conflict strategy**: Extend `ConflictResolverService`
3. **New retry strategy**: Extend `RetryManagerService`
4. **New queue operation**: Extend `SyncQueueService`
5. **New API endpoint**: Extend `SyncExecutorService`
6. **New event**: Add to `SYNC_EVENTS` in constants and emit from `SyncEngine`

## Performance Considerations

1. **IndexedDB**: All operations are async, non-blocking
2. **Batch operations**: Use `batchUpdateLocalCache` for multiple items
3. **Indexes**: All stores have appropriate indexes for fast queries
4. **Retry backoff**: Prevents server hammering with exponential delays
5. **Concurrent sync**: Only one queue processing at a time (managed by flag)
6. **Event listeners**: Use weak references where possible to prevent memory leaks
