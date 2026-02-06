# Self-Order & Online Store Architecture

## Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKWARD COMPATIBILITY                    │
│                          (Facades)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌───────────────────────┐   │
│  │  SelfOrderService    │      │  OnlineStoreService   │   │
│  │   (144 lines)        │      │   (facade)            │   │
│  └──────────────────────┘      └───────────────────────┘   │
│           │                              │                   │
│           │ delegates to                 │ delegates to      │
│           ↓                              ↓                   │
└───────────────────────────────────────────────────────────────┘
            │                              │
            │                              │
┌───────────┴──────────────────────────────┴─────────────────┐
│                    REFACTORED SERVICES                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  SELF-ORDER DOMAIN                ONLINE STORE DOMAIN        │
│  ┌───────────────────────┐       ┌──────────────────────┐  │
│  │ SelfOrderSessionService│      │ OnlineStoreConfig    │  │
│  │    (139 lines)         │      │   Service (41 lines) │  │
│  │                        │      └──────────────────────┘  │
│  │ • createSession()      │                                 │
│  │ • getSession()         │      ┌──────────────────────┐  │
│  │ • expireOldSessions()  │      │ OnlineStoreCatalog   │  │
│  └───────────────────────┘       │   Service (56 lines) │  │
│                                   │                      │  │
│  ┌───────────────────────┐       │ • getCatalog()       │  │
│  │ SelfOrderMenuService   │      └──────────────────────┘  │
│  │    (78 lines)          │                                 │
│  │                        │      ┌──────────────────────┐  │
│  │ • getMenu()            │      │ OnlineStoreOrder     │  │
│  └───────────────────────┘       │   Service (186 lines)│  │
│                                   │                      │  │
│  ┌───────────────────────┐       │ • createOrder()      │  │
│  │ SelfOrderCartService   │      │ • updateOrderStatus()│  │
│  │    (104 lines)         │      │ • processPayment()   │  │
│  │                        │      │ • getOrders()        │  │
│  │ • addToCart()          │      └──────────────────────┘  │
│  │ • updateCartItem()     │                                 │
│  └───────────────────────┘                                 │
│                                                              │
│  ┌───────────────────────┐                                 │
│  │ SelfOrderSubmission    │                                 │
│  │    Service (154 lines) │                                 │
│  │                        │                                 │
│  │ • submitOrder()        │                                 │
│  │ • processPayment()     │                                 │
│  │ • confirmPayment()     │                                 │
│  └───────────────────────┘                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      SHARED TYPES                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │ self-order.types.ts  │      │ online-store.types.ts│    │
│  │   (137 lines)        │      │   (120 lines)        │    │
│  │                      │      │                      │    │
│  │ • SessionInfo        │      │ • StoreConfig        │    │
│  │ • CartItem          │      │ • CatalogProduct     │    │
│  │ • PaymentDto        │      │ • StoreOrderInfo     │    │
│  │ • MenuProduct       │      │ • PaymentResult      │    │
│  └──────────────────────┘      └──────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  • PrismaService (Database)                                  │
│  • EventBusService (Domain Events)                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Self-Order Flow

```
Customer Scans QR Code
         ↓
SelfOrderSessionService.createSession()
         ↓
SelfOrderMenuService.getMenu()
         ↓
Customer Browses Menu
         ↓
SelfOrderCartService.addToCart()
         ↓
SelfOrderCartService.updateCartItem()
         ↓
SelfOrderSubmissionService.submitOrder()
         ↓
SelfOrderSubmissionService.processPayment()
         ↓
SelfOrderSubmissionService.confirmPayment()
         ↓
Order sent to KDS (Kitchen Display System)
```

### Online Store Flow

```
Customer Visits Store URL
         ↓
OnlineStoreConfigService.getStore()
         ↓
OnlineStoreCatalogService.getCatalog()
         ↓
Customer Browses Products
         ↓
Customer Checkout
         ↓
OnlineStoreOrderService.createOrder()
         ↓
OnlineStoreOrderService.processPayment()
         ↓
OnlineStoreOrderService.updateOrderStatus()
         ↓
Order Fulfillment
```

## Service Responsibilities Matrix

| Service | Create | Read | Update | Delete | External Integration |
|---------|--------|------|--------|--------|---------------------|
| **SelfOrderSessionService** | ✓ | ✓ | ✓ (expire) | - | - |
| **SelfOrderMenuService** | - | ✓ | - | - | - |
| **SelfOrderCartService** | ✓ | - | ✓ | ✓ | - |
| **SelfOrderSubmissionService** | ✓ | - | ✓ | - | ✓ (Payment Gateway, KDS) |
| **OnlineStoreConfigService** | - | ✓ | - | - | - |
| **OnlineStoreCatalogService** | - | ✓ | - | - | - |
| **OnlineStoreOrderService** | ✓ | ✓ | ✓ | - | ✓ (Payment Gateway) |

## Key Design Decisions

### 1. Facade Pattern
- Maintains backward compatibility
- Allows gradual migration
- Reduces breaking changes

### 2. Single Responsibility Principle
- Each service has one clear purpose
- Easier to test and maintain
- Better code organization

### 3. Service Composition
- Services can be composed for complex operations
- Dependency injection enables flexibility
- Testability through mocking

### 4. Type Safety
- Strong typing with TypeScript
- Shared type definitions
- Clear contracts between services

### 5. Domain Separation
- Self-order features isolated from online store
- Clear boundaries between domains
- Independent scaling and development

## Performance Considerations

### Database Queries
- Each service uses Prisma ORM efficiently
- Includes only necessary relations
- Pagination support in list operations

### Caching Opportunities
- **Menu data**: Can be cached per outlet (changes infrequently)
- **Store configuration**: Can be cached per slug
- **Product catalog**: Can be cached with invalidation on updates

### Event-Driven Architecture
- Order submission emits events for KDS
- Decoupled components
- Scalable architecture

## Testing Strategy

### Unit Tests
- Test each service in isolation
- Mock dependencies (Prisma, EventBus)
- Test business logic thoroughly

### Integration Tests
- Test service interactions
- Use test database
- Verify end-to-end flows

### E2E Tests
- Test complete user journeys
- QR code scan → Order submission
- Store browsing → Checkout

## Security Considerations

### Session Management
- Time-limited sessions (60 minutes)
- Secure session codes (crypto.randomBytes)
- Automatic expiration

### Payment Processing
- Mock implementations for development
- Gateway integration points clearly marked
- Payment method validation

### Data Access
- Services enforce business rules
- Database constraints via Prisma
- Input validation at service level
