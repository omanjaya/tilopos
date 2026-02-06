# Sync Engine Services

Refactored offline-first sync engine with separation of concerns into focused, maintainable services.

## Architecture

The sync engine has been split into 5 specialized services coordinated by a main orchestrator:

```
services/sync/
├── sync-engine.service.ts       (434 lines) - Main orchestrator
├── sync-queue.service.ts        (198 lines) - Queue management
├── sync-executor.service.ts     (208 lines) - Execute sync operations
├── conflict-resolver.service.ts (212 lines) - Resolve sync conflicts
├── retry-manager.service.ts     (251 lines) - Retry failed operations
├── types/
│   └── sync.types.ts            (187 lines) - TypeScript interfaces
├── constants/
│   └── sync.constants.ts        (80 lines)  - Configuration constants
└── index.ts                     (27 lines)  - Public API exports
```

**Total:** 1,597 lines (vs 688 lines in original monolithic file)

The increase in total lines is due to:
- Better separation of concerns
- More comprehensive error handling
- Additional utility methods
- Improved type safety
- Better documentation

## Services Overview

### 1. SyncQueueService (sync-queue.service.ts)

Manages the sync queue for offline operations.

**Responsibilities:**
- Add operations to queue
- Get pending/failed/conflict items
- Update item status
- Increment retry count
- Remove items from queue
- Get queue statistics

**Key Methods:**
```typescript
addToQueue<T>(entityType, entityId, operation, data, maxRetries): Promise<string>
getPendingItems(): Promise<SyncQueueItem[]>
getFailedItems(): Promise<SyncQueueItem[]>
getConflictItems(): Promise<SyncQueueItem[]>
updateItemStatus(id, status, error?): Promise<void>
markAsConflict(id, conflictData): Promise<void>
incrementRetryCount(id): Promise<number>
removeFromQueue(id): Promise<void>
getQueueStatus(): Promise<SyncQueueStatus>
clearCompleted(): Promise<void>
```

### 2. SyncExecutorService (sync-executor.service.ts)

Executes sync operations by communicating with the backend API.

**Responsibilities:**
- Send operations to backend
- Handle HTTP requests/responses
- Update local cache with server data
- Force push for client-wins strategy
- Pull changes from server
- Check server connectivity

**Key Methods:**
```typescript
executeSyncOperation(item): Promise<void>
forcePushToServer(item): Promise<void>
pullChangesFromServer(entityType, since, outletId?): Promise<unknown[]>
updateLocalCache(entityType, entityId, data): Promise<void>
batchUpdateLocalCache(entityType, items): Promise<void>
checkServerHealth(): Promise<boolean>
```

**Custom Errors:**
```typescript
ConflictError - Thrown when HTTP 409 conflict detected
```

### 3. ConflictResolverService (conflict-resolver.service.ts)

Handles sync conflicts between local and server data.

**Responsibilities:**
- Detect conflicts
- Apply resolution strategies (server-wins, client-wins, manual)
- Manual conflict resolution
- Data merging utilities

**Key Methods:**
```typescript
resolveConflict(item, serverData): Promise<ConflictResolution>
applyManualResolution(item, useServerVersion, customData?): Promise<ConflictResolution>
detectConflict(localData, serverData, localVersion, serverVersion): boolean
mergeData(localData, serverData, preferLocal?): Record<string, unknown>
getConflictDetails(item): ConflictDetails | null
setStrategy(strategy): void
getStrategy(): ConflictStrategy
```

**Conflict Strategies:**
- `server-wins` - Accept server version (default)
- `client-wins` - Force push local version
- `manual` - Mark for manual resolution

### 4. RetryManagerService (retry-manager.service.ts)

Manages retry logic for failed sync operations with exponential backoff.

**Responsibilities:**
- Execute operations with retry logic
- Calculate exponential backoff delays
- Determine if errors are retryable
- Batch retry multiple items
- Timeout handling

**Key Methods:**
```typescript
shouldRetry(item): boolean
calculateRetryDelay(retryCount): number
executeWithRetry<T>(operation, item, onRetry?): Promise<T>
isRetryableError(error): boolean
getRetryStatus(item): RetryStatus
resetRetryCount(item): SyncQueueItem
executeWithTimeout<T>(operation, timeoutMs): Promise<T>
batchRetry<T>(items, operation, options?): Promise<Array<Result>>
```

**Retry Configuration:**
- Initial delay: 1000ms
- Backoff factor: 2x (exponential)
- Max backoff: 60000ms (60 seconds)
- Default max retries: 3

### 5. SyncEngine (sync-engine.service.ts)

Main orchestrator that coordinates all sync services.

**Responsibilities:**
- Initialize IndexedDB and services
- Manage online/offline state
- Coordinate queue processing
- Delegate to specialized services
- Event emission and listening
- Public API for the application

**Key Methods:**
```typescript
initialize(): Promise<void>
queueOperation<T>(entityType, entityId, operation, data): Promise<string>
processQueue(): Promise<void>
pullChanges(entityType, outletId?): Promise<void>
getQueueStatus(): Promise<SyncQueueStatus>
getCached<T>(entityType, id): Promise<T | null>
getAllCached<T>(entityType, filter?): Promise<T[]>
saveLocal<T>(entityType, data, operation?): Promise<string>
deleteLocal(entityType, id): Promise<void>
clearCache(): Promise<void>
on(event, callback): void
off(event, callback): void
destroy(): void
```

**Properties:**
- `online` - Get current online status

## Usage

### Initialization

```typescript
import { syncEngine } from '@/services/sync';

// Initialize (call once on app startup)
await syncEngine.initialize();
```

### Queue Operations

```typescript
// Queue a create operation
const id = await syncEngine.queueOperation(
  'products',
  'prod-123',
  'create',
  { name: 'Coffee', price: 5000 }
);

// Queue an update
await syncEngine.queueOperation(
  'products',
  'prod-123',
  'update',
  { name: 'Coffee', price: 5500 }
);

// Queue a delete
await syncEngine.queueOperation(
  'products',
  'prod-123',
  'delete',
  null
);
```

### Cache Operations

```typescript
// Save locally (auto-queues for sync)
const id = await syncEngine.saveLocal(
  'products',
  { name: 'Coffee', price: 5000 },
  'create'
);

// Get cached item
const product = await syncEngine.getCached('products', 'prod-123');

// Get all cached items
const products = await syncEngine.getAllCached('products', {
  outletId: 'outlet-1'
});

// Delete locally (auto-queues for sync)
await syncEngine.deleteLocal('products', 'prod-123');

// Clear all cache
await syncEngine.clearCache();
```

### Pull Changes from Server

```typescript
// Pull all changes since last sync
await syncEngine.pullChanges('products');

// Pull for specific outlet
await syncEngine.pullChanges('products', 'outlet-1');
```

### Manual Sync

```typescript
// Trigger immediate sync
await syncEngine.processQueue();
```

### Queue Status

```typescript
const status = await syncEngine.getQueueStatus();
console.log(status);
// { pending: 5, failed: 1, conflicts: 0 }
```

### Event Listeners

```typescript
// Listen for sync events
syncEngine.on('queued', (event) => {
  console.log('Item queued:', event);
});

syncEngine.on('queueProcessed', (event) => {
  console.log('Queue processed:', event.processed, 'items');
});

syncEngine.on('conflict', (event) => {
  console.log('Conflict detected:', event.item);
});

syncEngine.on('syncError', (event) => {
  console.error('Sync error:', event.error);
});

// Listen to all events
syncEngine.on('*', (event) => {
  console.log('Sync event:', event.type);
});

// Remove listener
syncEngine.off('queued', callback);
```

### React Hook

```typescript
import { useSyncStatus } from '@/services/sync';

function MyComponent() {
  const { isOnline, queueStatus } = useSyncStatus();

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Pending: {queueStatus.pending}</p>
      <p>Failed: {queueStatus.failed}</p>
      <p>Conflicts: {queueStatus.conflicts}</p>
    </div>
  );
}
```

## Configuration

```typescript
import { SyncEngine } from '@/services/sync';

const customEngine = new SyncEngine({
  dbName: 'my-app-db',
  dbVersion: 1,
  syncInterval: 60000, // 1 minute
  maxRetries: 5,
  conflictStrategy: 'client-wins',
  apiBaseUrl: '/api/v1',
});

await customEngine.initialize();
```

## Event Types

| Event | Description | Data |
|-------|-------------|------|
| `initialized` | Database initialized | `{ timestamp }` |
| `online` | Device came online | `{ timestamp }` |
| `offline` | Device went offline | `{ timestamp }` |
| `queued` | Item added to queue | `{ id, entityType, operation }` |
| `queueProcessed` | Queue processing complete | `{ processed, timestamp }` |
| `syncError` | Sync operation failed | `{ item, error }` |
| `conflict` | Conflict detected | `{ item, serverData }` |
| `pulled` | Changes pulled from server | `{ entityType, count }` |

## Entity Types

Supported entity types:
- `products`
- `categories`
- `transactions`
- `customers`
- `orders`
- `settings`

## Error Handling

### Retryable Errors
- Network errors (fetch failures)
- 5xx server errors
- Timeout errors

### Non-Retryable Errors
- 4xx client errors (400, 401, 403, 404)
- Conflict errors (409) - handled by conflict resolver

### Conflict Resolution

When a conflict occurs (HTTP 409):

1. **Server-wins** (default): Accept server version, update local cache
2. **Client-wins**: Force push local version to server
3. **Manual**: Mark for manual resolution, emit conflict event

```typescript
// Manual conflict resolution example
syncEngine.on('conflict', async (event) => {
  const { item, serverData } = event;

  // Show UI to user for decision
  const useServer = await showConflictDialog(item.data, serverData);

  // Resolve via conflict resolver
  // (You'd need to access the internal service or use queue methods)
});
```

## IndexedDB Schema

### Object Stores

1. **syncQueue** - Pending sync operations
   - Indexes: by-status, by-timestamp, by-entity

2. **products** - Cached products
   - Indexes: by-outlet, by-category

3. **categories** - Cached categories
   - Indexes: by-outlet

4. **transactions** - Cached transactions
   - Indexes: by-outlet, by-status, by-date

5. **customers** - Cached customers
   - Indexes: by-phone

6. **settings** - App settings

7. **metadata** - Sync metadata (last sync times)

## Migration from Old Service

The new modular architecture is backward compatible. Update imports:

```typescript
// Old import
import { syncEngine } from '@/services/sync-engine.service';

// New import
import { syncEngine } from '@/services/sync';
```

All public APIs remain the same.

## Best Practices

1. **Initialize once** - Call `syncEngine.initialize()` once on app startup
2. **Use cache for reads** - Always read from cache first for offline-first behavior
3. **Queue for writes** - Use `saveLocal()` and `deleteLocal()` for automatic queuing
4. **Handle events** - Listen to sync events for UI feedback
5. **Clean up** - Call `destroy()` when unmounting app
6. **Monitor queue** - Regularly check queue status for failed/conflict items
7. **Test offline** - Always test with network throttling/offline mode

## Performance Considerations

- **Batch operations**: Pull changes uses batch updates for efficiency
- **Indexed queries**: All stores have appropriate indexes for fast queries
- **Background sync**: Automatic sync every 30 seconds (configurable)
- **Retry backoff**: Exponential backoff prevents server hammering
- **Concurrent retries**: Batch retry supports concurrent processing (default: 3)

## Troubleshooting

### Queue not processing
- Check online status: `syncEngine.online`
- Check queue status: `await syncEngine.getQueueStatus()`
- Manually trigger: `await syncEngine.processQueue()`

### Conflicts not resolving
- Check conflict strategy in config
- Listen to `conflict` events
- Verify server returns proper 409 responses

### Items stuck in failed state
- Check error messages in queue items
- Verify server is accessible
- Check if errors are retryable
- Consider resetting retry count for manual retry

## Development

### Running Tests

```bash
npm run test
```

### Debugging

Enable verbose logging:

```typescript
syncEngine.on('*', (event) => {
  console.log('[SyncEngine]', event.type, event);
});
```

## License

Internal TiloPOS service - not for external distribution.
