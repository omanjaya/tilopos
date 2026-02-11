# Architecture Analysis — TiloPOS

**Date:** 2026-02-11
**Scope:** Backend (NestJS) + Frontend (React) codebase architecture review

---

## Overall Architecture Score: 7.5/10

| Area | Score | Notes |
|------|-------|-------|
| Module organization | 8/10 | 46 feature modules, clean boundaries |
| Repository pattern | 6/10 | 11 repos implemented, but 522+ direct Prisma calls bypass it |
| Event-driven architecture | 8/10 | RxJS event bus + event store v2 |
| Frontend state management | 8.5/10 | Clean Zustand + TanStack Query separation |
| Error handling | 9/10 | Global filter with correlation IDs |
| Database schema | 8/10 | Well-indexed, proper multi-tenancy |
| Test coverage | 3/10 | ~37 backend specs, ~14 frontend tests |
| Code quality (SRP) | 6/10 | 9+ god classes remain |

---

## 1. Backend Module Structure

### What's Good

**46 feature modules** properly isolated:
```
modules/
  auth/          orders/         loyalty/
  pos/           kds/            settlements/
  products/      tables/         pricing/
  inventory/     self-order/     appointments/
  customers/     online-store/   work-orders/
  employees/     suppliers/      serial-numbers/
  reports/       promotions/     item-tracking/
  ...
```

- Each module encapsulates controller + service + DTOs
- No circular dependencies detected between modules
- Clean dependency injection via NestJS providers
- Repository tokens for abstraction: `REPOSITORY_TOKENS.PRODUCT`, etc.

### What Needs Work

**Repository Pattern Only Partially Applied:**

| Layer | Count | Status |
|-------|-------|--------|
| Repository tokens defined | 18 | Defined in `repository.tokens.ts` |
| Repositories implemented | 11 | Prisma implementations exist |
| Direct Prisma calls in services | 522+ | Bypass repository layer |

Many services inject `PrismaService` directly instead of going through the repository:

```typescript
// BAD — service directly uses Prisma
constructor(private readonly prisma: PrismaService) {}

async findProducts(businessId: string) {
  return this.prisma.product.findMany({ where: { businessId } });
}

// GOOD — service uses repository abstraction
constructor(
  @Inject(REPOSITORY_TOKENS.PRODUCT)
  private readonly productRepo: IProductRepository,
) {}
```

**Recommendation:** Gradually migrate direct Prisma calls to repository methods. Priority:
1. Services with >500 LOC (most impact)
2. Services that duplicate query logic
3. Services used in tests (easier to mock via interface)

---

## 2. God Classes Still Present

Despite previous refactoring (Phase 1 & 2 eliminated 18 god classes), new ones have grown:

### Backend

| Service | LOC | Violation |
|---------|-----|-----------|
| OnlineStoreService | 923 | Catalog sync + analytics + inventory + config |
| NotificationsService | 675 | Push + email + SMS + WhatsApp in one service |
| CustomersService | 668 | CRUD + segmentation + loyalty + analytics |
| SuppliersService | 587 | Supplier + purchase order + invoice |
| PaymentGatewayService | 570 | Processing + refunds + reconciliation |
| TablesService | 540 | Table CRUD + layout + reservation + status |

### Frontend

| Component | LOC | Violation |
|-----------|-----|-----------|
| WaitingListPageMobile | 565 | All waiting list logic in one file |
| StockPageMobile | 548 | All inventory operations |
| ShiftsPage | 532 | All shift management |
| MyProfilePage | 528 | All profile settings |

### Suggested Splits

**OnlineStoreService (923 LOC) →**
- `CatalogSyncService` — sync products/categories to store
- `StoreAnalyticsService` — store metrics and reporting
- `StoreConfigService` — store settings and configuration
- `OnlineStoreService` — thin facade that delegates

**NotificationsService (675 LOC) →**
- `PushNotificationService` — Firebase/APNs push
- `EmailNotificationService` — SMTP/template emails
- `SmsNotificationService` — SMS gateway
- `WhatsAppNotificationService` — WhatsApp Business API
- `NotificationDispatcher` — routes to appropriate channel

---

## 3. Database Schema Analysis

**File:** `packages/backend/prisma/schema.prisma` (2,271 lines)

### Strengths

- **80+ tables** with proper relations
- **Multi-tenant design:** `businessId` + `outletId` scoping throughout
- **Smart indexing strategy:**
  ```prisma
  @@index([businessId], map: "idx_categories_business")
  @@index([businessId, isActive], map: "idx_products_business_active")
  @@unique([outletId, productId, variantId], map: "uq_stock_outlet_product_variant")
  ```
- **35+ enum types** properly defined
- **100+ foreign keys** with cascading

### Potential N+1 Query Risks

```typescript
// repositories fetch without needed relations
async findByBusinessId(businessId: string): Promise<ProductRecord[]> {
  // Missing: include variants, stockLevels
  const products = await this.prisma.product.findMany({
    where: { businessId, isActive: true },
  });
}
// Callers then fetch relations separately → N+1
```

**Recommendation:** Define standard "include presets" per entity:
```typescript
const PRODUCT_INCLUDES = {
  list: { variants: true, category: true },
  detail: { variants: true, category: true, stockLevels: true, modifierGroups: true },
  pos: { variants: { where: { isActive: true } }, stockLevels: true },
};
```

---

## 4. Event System

### Event Bus (RxJS)
**File:** `packages/backend/src/infrastructure/events/event-bus.service.ts`

Clean Subject-based implementation:
```typescript
publish(event: DomainEvent): void {
  this.subject.next(event);
}

ofType<T extends DomainEvent>(eventType: new (...args: any[]) => T): Observable<T> {
  return this.subject.asObservable()
    .pipe(filter((event): event is T => event instanceof eventType));
}
```

### Event Store V2
**File:** `packages/backend/src/infrastructure/events/event-store-v2.service.ts`

Advanced event sourcing with:
- Event versioning + upcasters
- Snapshot store
- Uses AuditLog table for persistence

### Missing Pieces

1. **No dead-letter queue:** Failed event handlers silently drop events
   - TODO in `transaction-event.listener.ts`: "Add to dead letter queue for retry"
2. **No event replay mechanism** from persistent store
3. **Limited error recovery** in event listeners
4. **Version tracking via JSON** instead of dedicated column (less queryable)

---

## 5. Frontend State Management

### Zustand Stores

| Store | LOC | Responsibility | Persistence |
|-------|-----|----------------|-------------|
| AuthStore | 47 | Auth state, token, user | localStorage |
| CartStore | 354 | Cart items, payments, held bills | localStorage |
| UIStore | 63 | Theme, sidebar, outlet selection | localStorage |

**Assessment:** Clean separation of concerns. Each store has single responsibility.

### Server vs Client State

```
Server State (TanStack Query)     Client State (Zustand)
├── Products                      ├── Auth (token, user)
├── Customers                     ├── Cart (items, payments)
├── Orders                        ├── UI (theme, sidebar)
├── Reports                       └── Offline queue
├── Inventory
└── Settings
```

**Issues Found:**
1. `CartStore` hardcodes `TAX_RATE = 0.11` and `SERVICE_CHARGE_RATE = 0.05` instead of fetching from settings API
2. Held bills stored only in localStorage — no server backup, lost on browser data clear
3. No conflict resolution if cart modified server-side (offline sync edge case)

---

## 6. Error Handling Architecture

### Backend — Excellent

**Global Exception Filter** (`shared/filters/global-exception.filter.ts`):
```typescript
// Structured error response
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "...",
  "details": { ... },
  "correlationId": "uuid",
  "timestamp": "ISO8601",
  "path": "/api/v1/..."
}
```

- Catches all exceptions (`@Catch()`)
- Generates correlation IDs for tracing
- Conditional logging (500+ only)
- Never leaks stack traces

### Frontend — Good

**Error Boundary** (`components/shared/error-boundary.tsx`):
- Class component with `getDerivedStateFromError`
- Graceful fallback UI with reload button
- Console logging for debugging

**Missing:** Integration with Sentry for production error tracking on frontend.

---

## 7. API Contract

### Swagger/OpenAPI
- Configured in `main.ts` at `/api/docs`
- Bearer auth annotation present
- Individual endpoint documentation is sparse

### DTO Consistency
- Backend: class-validator DTOs with strict validation
- Frontend: TypeScript interfaces in `types/`
- **Gap:** No shared schema or codegen between frontend/backend
- **Risk:** DTO drift between frontend and backend

**Recommendation:** Consider OpenAPI codegen:
```bash
# Generate TypeScript client from backend Swagger
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3001/api/docs-json \
  -g typescript-axios \
  -o packages/web/src/api/generated
```

---

## 8. Test Coverage

### Current State

| Area | Files | Estimated Coverage |
|------|-------|-------------------|
| Backend repositories | 11 spec files | ~60% of repos |
| Backend services | 15 spec files | ~10% of services |
| Backend controllers | 5 spec files | ~5% of controllers |
| Backend use cases | 6 spec files | ~15% of use cases |
| Frontend stores | 2 test files | ~50% of stores |
| Frontend components | 0 test files | 0% |
| Frontend pages | 0 test files | 0% |
| E2E tests | Playwright configured | Not implemented |

### Recommended Test Strategy

**Priority 1 — Critical paths:**
1. Auth flow (login, token refresh, logout)
2. POS transaction (create, payment, refund)
3. Payment webhooks (Xendit, Midtrans)
4. Stock management (movements, transfers)

**Priority 2 — Business logic:**
1. Cart calculations (discounts, tax, service charge)
2. Promotion rules engine
3. Report aggregations
4. Self-order flow

**Priority 3 — Integration:**
1. E2E tests with Playwright for critical user journeys
2. API integration tests with database seeding

---

## 9. Unfinished Features (TODOs)

| Feature | File | Impact |
|---------|------|--------|
| Customer segment checking | `promotion-rules.engine.ts` | Promotions won't target segments |
| Category ID checking | `promotion-rules.engine.ts` | Category-based promos broken |
| Dead letter queue | `transaction-event.listener.ts` | Events silently dropped on failure |
| Analytics queries (6x TODO) | `analytics.service.ts` | All analytics currently mocked |
| ML-based predictions | `analytics.service.ts` | Recommendation engine mocked |

---

## 10. Dependency Architecture

```
                    AppModule
                       |
        ┌──────────────┼──────────────┐
        |              |              |
   Infrastructure   Feature      Shared
   ├── Database     Modules      ├── Filters
   ├── Cache        ├── Auth     ├── Guards
   ├── Queue        ├── POS      ├── Decorators
   ├── Events       ├── Orders   └── Errors
   ├── Logging      ├── Reports
   ├── Health       └── ... (46 total)
   └── Monitoring

Direction of dependencies: Feature → Infrastructure → Shared
(Clean architecture: outer layers depend on inner layers)
```

**Strengths:**
- Infrastructure modules are imported at root level
- Feature modules import only from infrastructure/shared
- No feature-to-feature direct imports detected

**Concern:**
- Orders module exports SelfOrderService and OnlineStoreService
- If these grow, could create tight coupling

---

## Summary of Recommendations

### Quick Wins (Days)
1. Add include presets to prevent N+1 queries
2. Sync cart tax/service rates from settings API
3. Add env var validation at startup
4. Implement dead-letter queue for events

### Medium Term (Sprints)
1. Migrate 522+ direct Prisma calls to repositories
2. Split 6 backend god classes (>500 LOC)
3. Split 4 frontend god components (>500 LOC)
4. Add tests for critical paths (target 50% coverage)
5. Set up OpenAPI codegen for DTO consistency

### Long Term (Quarter)
1. Complete domain/application layer separation
2. Full event sourcing with replay capability
3. Implement ML-based analytics (currently mocked)
4. E2E test suite for all critical user journeys
5. Performance profiling and query optimization
