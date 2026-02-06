# TiloPOS Integration Architecture - Visual Diagrams

**Companion Document:** [12-INTEGRATION-WORKFLOW.md](./12-INTEGRATION-WORKFLOW.md)
**Last Updated:** 2026-02-06

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Event Flow Diagram](#event-flow-diagram)
3. [Module Interaction Map](#module-interaction-map)
4. [POS Transaction Flow](#pos-transaction-flow)
5. [Data Consistency Model](#data-consistency-model)
6. [WebSocket Real-time Architecture](#websocket-real-time-architecture)
7. [Multi-tenant Data Isolation](#multi-tenant-data-isolation)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TiloPOS System Architecture                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────── FRONTEND (React + TypeScript) ─────────────────────────┐
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   POS    │  │   KDS    │  │ Reports  │  │ Products │  │Inventory │    │
│  │  Page    │  │  Page    │  │   Page   │  │   Page   │  │   Page   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │              │             │              │           │
│       └─────────────┴──────────────┴─────────────┴──────────────┘           │
│                                    │                                         │
│                            ┌───────▼───────┐                                │
│                            │  API Client   │                                │
│                            │  (Axios)      │                                │
│                            └───────┬───────┘                                │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTP/REST + WebSocket
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────┐
│                      BACKEND (NestJS + TypeScript)                           │
│                                                                              │
│  ┌─────────────────────── API Layer (Controllers) ────────────────────────┐ │
│  │  PosController │ OrdersController │ ProductsController │ ...           │ │
│  └────────┬────────────────┬──────────────────┬────────────────────────────┘ │
│           │                │                  │                              │
│  ┌────────▼────────────────▼──────────────────▼────────────────────────────┐ │
│  │                    Application Layer (Use Cases)                        │ │
│  │  CreateTransactionUseCase │ CreateOrderUseCase │ UpdateStockUseCase    │ │
│  └────────┬─────────────────┬──────────────────┬─────────────────────────┘ │
│           │                 │                  │                            │
│  ┌────────▼─────────────────▼──────────────────▼─────────────────────────┐ │
│  │                      Domain Layer (Events)                             │ │
│  │  TransactionCreatedEvent │ OrderStatusChangedEvent │ StockLevelChanged │ │
│  └────────┬─────────────────┬──────────────────┬─────────────────────────┘ │
│           │                 │                  │                            │
│           │        ┌────────▼────────┐         │                            │
│           └────────►  EventBus       ◄─────────┘                            │
│                    │  (RxJS Subject) │                                      │
│                    └────┬───────┬────┘                                      │
│                         │       │                                           │
│              ┌──────────┘       └───────────┐                               │
│              ▼                              ▼                               │
│  ┌────────────────────┐          ┌──────────────────────┐                  │
│  │  Event Listeners   │          │  EventBridgeService  │                  │
│  │  - Transaction     │          │  (RxJS ↔ RabbitMQ)   │                  │
│  │  - Order           │          └──────────┬───────────┘                  │
│  │  - Stock           │                     │                               │
│  └──────────┬─────────┘                     │                               │
│             │                               │                               │
│  ┌──────────▼───────────────────────────────▼───────────────────────────┐  │
│  │                   Infrastructure Layer                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │  │
│  │  │ Prisma   │  │  Redis   │  │ RabbitMQ │  │  WebSocket Gateways  │ │  │
│  │  │  (ORM)   │  │ (Cache)  │  │ (Queue)  │  │  - KDS               │ │  │
│  │  │          │  │          │  │          │  │  - Notifications     │ │  │
│  │  └────┬─────┘  └──────────┘  └────┬─────┘  └──────────┬───────────┘ │  │
│  └───────┼─────────────────────────────┼──────────────────┼─────────────┘  │
└──────────┼─────────────────────────────┼──────────────────┼─────────────────┘
           │                             │                  │
           ▼                             ▼                  │
    ┌─────────────┐            ┌──────────────────┐        │
    │ PostgreSQL  │            │    RabbitMQ      │        │ WebSocket
    │  Database   │            │   Message Bus    │        │
    └─────────────┘            └──────────────────┘        │
                                                            │
┌───────────────────────────────────────────────────────────▼─────────────────┐
│                         REAL-TIME CLIENTS                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │   KDS    │  │ Manager  │  │ Cashier  │  │  Mobile  │                   │
│  │ Display  │  │Dashboard │  │ Terminal │  │   App    │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Event-Driven Flow Architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘

                                USER ACTION
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   API Controller      │
                        │  (HTTP Endpoint)      │
                        └──────────┬────────────┘
                                   │
                                   ▼
                        ┌───────────────────────┐
                        │     Use Case          │
                        │  - Validate           │
                        │  - Business Logic     │
                        │  - Database Write     │
                        └──────────┬────────────┘
                                   │
                                   │ SUCCESS ✓
                                   ▼
                        ┌───────────────────────┐
                        │  EventBus.publish()   │
                        │  (DomainEvent)        │
                        └──────────┬────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
     │   Listener 1   │  │   Listener 2   │  │   Listener 3   │
     │  (Side Effect) │  │  (Side Effect) │  │ (EventBridge)  │
     └────────┬───────┘  └────────┬───────┘  └────────┬───────┘
              │                   │                    │
              ▼                   ▼                    ▼
     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
     │ Update Related │  │  Create Audit  │  │ Publish to MQ  │
     │    Entities    │  │      Log       │  │  (RabbitMQ)    │
     └────────────────┘  └────────────────┘  └────────┬───────┘
                                                       │
                                    ┌──────────────────┤
                                    ▼                  ▼
                           ┌─────────────┐   ┌─────────────────┐
                           │ Queue       │   │ WebSocket       │
                           │ Handlers    │   │ Gateways        │
                           └─────────────┘   └────────┬────────┘
                                                       │
                                                       ▼
                                             ┌──────────────────┐
                                             │ Connected Clients│
                                             │ (Real-time UI)   │
                                             └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Event Types Flow                                 │
└─────────────────────────────────────────────────────────────────────────────┘

TransactionCreatedEvent
    ├─→ TransactionEventListener
    │   ├─ Deduct ingredients (async)
    │   ├─ Add loyalty points (async)
    │   └─ Create audit log
    │
    ├─→ TransactionToOrderHandler
    │   └─ Create KDS order
    │       └─ Publishes: OrderStatusChangedEvent
    │
    └─→ EventBridgeService
        └─ RabbitMQ: transaction.created
            ├─ Queue: pos.transactions
            └─ Queue: customers.loyalty

OrderStatusChangedEvent
    ├─→ KdsGateway (WebSocket)
    │   └─ Emit: order:status_changed
    │       └─ KDS Display updates in real-time
    │
    ├─→ OrderEventListener
    │   ├─ If status = 'completed': Release table
    │   └─ Create audit log
    │
    └─→ NotificationsGateway (WebSocket)
        └─ Emit: order:status_changed
            └─ All outlet clients notified

StockLevelChangedEvent
    └─→ StockEventListener
        └─ If quantity < threshold: Send low stock alert

ShiftStartedEvent / ShiftEndedEvent
    └─→ NotificationsGateway
        └─ Emit shift status to outlet staff
```

---

## Module Interaction Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Module Dependencies & Data Flow                      │
└─────────────────────────────────────────────────────────────────────────────┘

                                ┌──────────────┐
                                │     POS      │
                                │   Module     │
                                └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
          ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
          │  Inventory   │   │  Customers   │   │    Orders    │
          │   Module     │   │   Module     │   │    Module    │
          └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
                 │                  │                  │
                 │ Reads stock      │ Updates          │ Creates
                 │ Deducts items    │ loyalty points   │ KDS order
                 │                  │ Increments       │
                 ▼                  │ visit count      ▼
          ┌──────────────┐          ▼           ┌──────────────┐
          │ StockLevel   │   ┌──────────────┐   │    Order     │
          │ (Database)   │   │   Customer   │   │  (Database)  │
          └──────┬───────┘   │  (Database)  │   └──────┬───────┘
                 │           └──────────────┘          │
                 │                                     │
                 │                                     │ Updates
                 │                                     ▼
                 │                              ┌──────────────┐
                 │                              │    Table     │
                 │                              │  (Database)  │
                 │                              └──────────────┘
                 │
                 ▼
          ┌──────────────┐
          │   Recipe     │ ◄────── Ingredients
          │  (Database)  │         deduction
          └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Synchronous vs Asynchronous                         │
└─────────────────────────────────────────────────────────────────────────────┘

SYNCHRONOUS (Must succeed for transaction to complete):
    POS → Inventory
        ├─ Validate stock levels (throw error if insufficient)
        └─ Deduct product stock (atomic transaction)

    POS → Payments
        └─ Process payment (must succeed)

ASYNCHRONOUS (Fire-and-forget, transaction already committed):
    POS → Inventory
        └─ Deduct recipe ingredients (via event listener)

    POS → Customers
        └─ Add loyalty points (via event listener)

    POS → Orders
        └─ Create KDS order (via event handler)

    Any → Audit
        └─ Create audit logs (via event listeners)

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Integration Points                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  Self-Order │
│   Module    │
└──────┬──────┘
       │ Creates transaction
       │ via POS flow
       ▼
┌─────────────┐        TransactionCreatedEvent        ┌──────────────┐
│     POS     │ ──────────────────────────────────────►│   Orders     │
│   Module    │                                        │   Module     │
└──────┬──────┘                                        └──────┬───────┘
       │                                                      │
       │ Validates & deducts                                 │ Updates
       ▼                                                      ▼
┌─────────────┐                                        ┌──────────────┐
│  Inventory  │                                        │    Tables    │
│   Module    │                                        │    Module    │
└─────────────┘                                        └──────────────┘

┌─────────────┐
│   Reports   │◄────── Queries historical data ───────┐
│   Module    │                                        │
└─────────────┘                                        │
       │                                               │
       └───────► Reads from all transaction tables ───┘
                 - Transactions
                 - TransactionItems
                 - Payments
                 - Orders
                 - StockMovements
                 - LoyaltyTransactions
```

---

## POS Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  Complete POS Transaction Lifecycle                         │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: CART BUILDING
┌────────────────────────────┐
│  User adds items to cart   │
│  - Scan barcode / search   │
│  - Select variant          │
│  - Add modifiers           │
│  - Set quantity            │
└────────────┬───────────────┘
             │ (Client-side only, no API calls)
             ▼
┌────────────────────────────┐
│   Cart State (Zustand)     │
│   items: [{...}, {...}]    │
└────────────┬───────────────┘
             │
             │ User clicks "Checkout"
             ▼

PHASE 2: PAYMENT
┌────────────────────────────┐
│   Payment Modal Opens      │
│   - Shows grand total      │
│   - Select payment method  │
│   - Enter amount received  │
│   - Calculate change       │
└────────────┬───────────────┘
             │ User clicks "Complete Payment"
             ▼

PHASE 3: TRANSACTION CREATION (BACKEND)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  POST /api/v1/pos/transactions                                              │
│  {                                                                           │
│    outletId, employeeId, shiftId,                                           │
│    orderType, tableId, customerId,                                          │
│    items: [...],                                                            │
│    payments: [...]                                                          │
│  }                                                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CreateTransactionUseCase.execute()                                 │   │
│  │                                                                      │   │
│  │  Step 1: VALIDATION                                                 │   │
│  │  ├─ Validate shift is open ✓                                        │   │
│  │  ├─ Validate products exist ✓                                       │   │
│  │  ├─ Validate stock levels (CRITICAL - can fail transaction) ✓      │   │
│  │  └─ Validate payment amount >= grand total ✓                        │   │
│  │                                                                      │   │
│  │  Step 2: CALCULATION                                                │   │
│  │  ├─ Calculate item totals (price × quantity + modifiers)            │   │
│  │  ├─ Calculate subtotal                                              │   │
│  │  ├─ Calculate tax (subtotal × taxRate)                              │   │
│  │  ├─ Calculate service charge (subtotal × serviceChargeRate)         │   │
│  │  └─ Calculate grand total                                           │   │
│  │                                                                      │   │
│  │  Step 3: DATABASE TRANSACTION (ATOMIC)                              │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │ BEGIN TRANSACTION;                                            │  │   │
│  │  │                                                               │  │   │
│  │  │ 1. INSERT INTO transactions (...)                            │  │   │
│  │  │    → Creates transaction record                              │  │   │
│  │  │                                                               │  │   │
│  │  │ 2. INSERT INTO transaction_items (...)                       │  │   │
│  │  │    → Creates line items                                      │  │   │
│  │  │                                                               │  │   │
│  │  │ 3. INSERT INTO payments (...)                                │  │   │
│  │  │    → Records payment methods                                 │  │   │
│  │  │                                                               │  │   │
│  │  │ 4. UPDATE stock_levels SET quantity = quantity - X           │  │   │
│  │  │    → Deducts product stock (CRITICAL)                        │  │   │
│  │  │                                                               │  │   │
│  │  │ 5. INSERT INTO stock_movements (...)                         │  │   │
│  │  │    → Audit trail for stock changes                           │  │   │
│  │  │                                                               │  │   │
│  │  │ COMMIT;                                                       │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Step 4: EVENT PUBLISHING (AFTER COMMIT)                            │   │
│  │  EventBus.publish(                                                  │   │
│  │    new TransactionCreatedEvent(txnId, outletId, total, custId)     │   │
│  │  )                                                                   │   │
│  │                                                                      │   │
│  │  Step 5: RETURN RESPONSE                                            │   │
│  │  {                                                                   │   │
│  │    transactionId,                                                   │   │
│  │    receiptNumber,                                                   │   │
│  │    grandTotal,                                                      │   │
│  │    change                                                           │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ Transaction committed ✓
                               ▼

PHASE 4: EVENT PROCESSING (PARALLEL)
┌────────────────────────────────────────────────────────────────────────────┐
│  EventBus distributes TransactionCreatedEvent to all subscribers           │
└───┬────────────────────────┬───────────────────────┬───────────────────────┘
    │                        │                       │
    ▼                        ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│ Listener 1:     │  │ Listener 2:     │  │ Handler:            │
│ Transaction     │  │ EventBridge     │  │ TransactionToOrder  │
│ EventListener   │  │ Service         │  │                     │
└────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘
         │                    │                       │
         │                    │                       │
    ┌────┴────┬───────┐       │                       │
    ▼         ▼       ▼       │                       │
┌────────┐ ┌────┐ ┌───────┐  │                       │
│Deduct  │ │Add │ │Audit  │  │                       │
│Ingred. │ │Loy.│ │Log    │  │                       │
└────────┘ └────┘ └───────┘  │                       │
                              │                       │
                              ▼                       ▼
                    ┌─────────────────┐    ┌──────────────────┐
                    │ Publish to MQ   │    │ Create KDS Order │
                    │ - pos.trans.    │    │                  │
                    │ - cust.loyalty  │    │ Publishes:       │
                    └─────────────────┘    │ OrderStatusChgd  │
                                           └────────┬─────────┘
                                                    │
                                                    ▼
                                         ┌────────────────────┐
                                         │ KdsGateway emits   │
                                         │ to WebSocket       │
                                         └────────┬───────────┘
                                                  │
                                                  ▼
                                         ┌────────────────────┐
                                         │ KDS Display updates│
                                         │ (Real-time)        │
                                         └────────────────────┘

PHASE 5: CLIENT RECEIPT
┌────────────────────────────┐
│  Frontend receives response│
│  - Fetch receipt data      │
│  - Show receipt preview    │
│  - Print receipt (optional)│
│  - Clear cart              │
└────────────────────────────┘

TIME BREAKDOWN:
├─ Cart building: Variable (user interaction)
├─ Payment input: ~5-10 seconds
├─ API call: ~200-500ms
│   ├─ Validation: ~50ms
│   ├─ Calculation: ~10ms
│   ├─ Database write: ~100-300ms (atomic transaction)
│   └─ Event publish: ~1ms
├─ Event processing: ~500-2000ms (parallel, non-blocking)
│   ├─ Ingredient deduction: ~200-500ms
│   ├─ Loyalty points: ~100-200ms
│   ├─ Order creation: ~200-500ms
│   └─ Audit log: ~50ms
└─ Receipt display: ~200ms

TOTAL USER-FACING TIME: ~500ms (transaction creation + response)
TOTAL BACKGROUND TIME: ~2 seconds (event processing completes after user sees receipt)
```

---

## Data Consistency Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Consistency Guarantees by Operation                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  STRONG CONSISTENCY (ACID Transactions)                                  │
│  All-or-nothing atomicity with immediate consistency                     │
└──────────────────────────────────────────────────────────────────────────┘

    Transaction Creation
    ┌────────────────────────────────────────────────────────────┐
    │  prisma.$transaction(async (tx) => {                       │
    │    await tx.transaction.create(...)        ← Atomic        │
    │    await tx.transactionItem.createMany(...) ← Atomic       │
    │    await tx.payment.createMany(...)        ← Atomic        │
    │    await tx.stockLevel.update(...)         ← Atomic        │
    │    await tx.stockMovement.create(...)      ← Atomic        │
    │  })                                                         │
    │                                                             │
    │  If ANY step fails → ALL steps rollback                    │
    │  Isolation level: READ COMMITTED                           │
    └────────────────────────────────────────────────────────────┘

    Stock Validation
    ┌────────────────────────────────────────────────────────────┐
    │  MUST succeed before transaction commits                   │
    │  - Read current stock level                                │
    │  - Check: available >= required                            │
    │  - Throw error if insufficient (fails transaction)         │
    └────────────────────────────────────────────────────────────┘

    Payment Processing
    ┌────────────────────────────────────────────────────────────┐
    │  MUST succeed before transaction commits                   │
    │  - Validate payment gateway (if card/QRIS)                 │
    │  - Verify amount >= grand total                            │
    │  - Create payment records atomically                       │
    └────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  EVENTUAL CONSISTENCY (Event-Driven)                                     │
│  Asynchronous updates, guaranteed delivery, may lag behind source        │
└──────────────────────────────────────────────────────────────────────────┘

    Ingredient Stock Deduction
    ┌────────────────────────────────────────────────────────────┐
    │  Triggered by: TransactionCreatedEvent                     │
    │  Timing: After transaction committed                       │
    │  Guarantee: At-least-once execution                        │
    │  Failure mode: Logged, doesn't affect transaction          │
    │  Consistency: Eventually consistent (~500ms delay)         │
    │                                                             │
    │  Recipe: Coffee → Beans (20g), Milk (200ml), Sugar (10g)   │
    │  Transaction: 2 coffees sold                               │
    │  Event fires → Listener deducts:                           │
    │    - Beans: -40g (async)                                   │
    │    - Milk: -400ml (async)                                  │
    │    - Sugar: -20g (async)                                   │
    └────────────────────────────────────────────────────────────┘

    Loyalty Points Earning
    ┌────────────────────────────────────────────────────────────┐
    │  Triggered by: TransactionCreatedEvent                     │
    │  Timing: After transaction committed                       │
    │  Guarantee: At-least-once (idempotent via transactionId)   │
    │  Failure mode: Customer doesn't earn points (logged)       │
    │  Consistency: Eventually consistent (~200ms delay)         │
    │                                                             │
    │  Customer spending: 69,000 IDR                             │
    │  Loyalty program: 50,000 IDR = 1 point                     │
    │  Event fires → Listener calculates:                        │
    │    - Base points: floor(69000/50000) = 1                   │
    │    - Tier multiplier: 1.2 (Silver tier)                    │
    │    - Final points: 1 × 1.2 = 1 (rounded)                   │
    │  Customer.loyaltyPoints += 1 (async update)                │
    └────────────────────────────────────────────────────────────┘

    Order Creation (for KDS)
    ┌────────────────────────────────────────────────────────────┐
    │  Triggered by: TransactionCreatedEvent                     │
    │  Timing: After transaction committed                       │
    │  Guarantee: At-least-once execution                        │
    │  Failure mode: Kitchen doesn't see order (logged)          │
    │  Consistency: Eventually consistent (~300ms delay)         │
    │  Recovery: Manual order creation possible                  │
    │                                                             │
    │  If orderType in [dine_in, takeaway, delivery]:            │
    │    Event fires → Handler creates Order entity              │
    │    Order.status = pending                                  │
    │    Table.status = occupied (if dine_in)                    │
    │    Publishes: OrderStatusChangedEvent                      │
    │      → WebSocket → KDS display updates                     │
    └────────────────────────────────────────────────────────────┘

    Audit Logging
    ┌────────────────────────────────────────────────────────────┐
    │  Triggered by: All domain events                           │
    │  Timing: After event published                             │
    │  Guarantee: Best-effort (fire-and-forget)                  │
    │  Failure mode: Missing audit entry (logged to console)     │
    │  Consistency: Eventually consistent (~50ms delay)          │
    │  Recovery: None (non-critical)                             │
    └────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  CONSISTENCY TRADE-OFFS                                                  │
└──────────────────────────────────────────────────────────────────────────┘

    ✓ PROS of Eventual Consistency:
      - Transaction completes FAST (~500ms vs ~3 seconds)
      - No blocking on non-critical operations
      - Resilient to failures (transaction still succeeds)
      - Scalable (events processed in parallel)

    ✗ CONS of Eventual Consistency:
      - Ingredient stock may lag behind product stock
      - Customer may see points update with delay
      - KDS order appears seconds after payment
      - Audit logs may be incomplete if listener fails

    MITIGATION STRATEGIES:
      1. Idempotency: Check if event already processed
         ```typescript
         const existing = await prisma.loyaltyTransaction.findFirst({
           where: { transactionId }
         });
         if (existing) return; // Already processed
         ```

      2. Retry mechanism: RabbitMQ auto-retries failed events
         - Max retries: 3
         - Backoff: Exponential (1s, 2s, 4s)
         - Dead Letter Queue: For manual recovery

      3. Monitoring: Log all event processing failures
         - Alert if failure rate > 1%
         - Dashboard shows event lag

      4. Manual recovery: Admin tools to re-trigger events
         - "Recalculate loyalty points" button
         - "Create missing KDS order" action
```

---

## WebSocket Real-time Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WebSocket Communication Flow                             │
└─────────────────────────────────────────────────────────────────────────────┘

CLIENT (React Frontend)
    │
    │ Connect to WebSocket
    ▼
┌───────────────────────────────────────────────────────────────┐
│  const socket = io('http://localhost:3001/kds', {            │
│    auth: { token: authStore.accessToken },                   │
│    query: { outletId: user.outletId }                        │
│  });                                                          │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ WebSocket Handshake
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  BACKEND: KdsGateway                                                     │
│                                                                          │
│  @WebSocketGateway({ namespace: 'kds', cors: true })                    │
│                                                                          │
│  handleConnection(client: Socket) {                                     │
│    // 1. Verify JWT token                                               │
│    const token = client.handshake.auth.token;                           │
│    const payload = jwtService.verify(token);                            │
│                                                                          │
│    // 2. Set user context on socket                                     │
│    client.data.userId = payload.userId;                                 │
│    client.data.businessId = payload.businessId;                         │
│    client.data.outletId = payload.outletId;                             │
│                                                                          │
│    // 3. Join rooms based on context                                    │
│    client.join(`outlet:${payload.outletId}`);                           │
│    client.join(`business:${payload.businessId}`);                       │
│    client.join(`user:${payload.userId}`);                               │
│                                                                          │
│    logger.log(`Client ${client.id} joined outlet:${outletId}`);         │
│  }                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
                            │
                            │ Connection established ✓
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Room Structure                                                          │
│                                                                          │
│  outlet:outlet-123                                                       │
│  ├─ client-abc (Kitchen Staff #1)                                       │
│  ├─ client-def (Kitchen Staff #2)                                       │
│  ├─ client-ghi (Manager Dashboard)                                      │
│  └─ client-jkl (Cashier Terminal)                                       │
│                                                                          │
│  business:business-456                                                   │
│  ├─ outlet:outlet-123 (all clients above)                               │
│  ├─ outlet:outlet-789 (other outlet's clients)                          │
│  └─ admin-dashboard (business owner)                                    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Event Broadcasting Flow                                                 │
└──────────────────────────────────────────────────────────────────────────┘

BACKEND: Domain Event Published
    │
    │ OrderStatusChangedEvent(orderId, outletId, 'pending', 'cooking')
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  KdsGateway.onModuleInit()                                               │
│                                                                          │
│  this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {   │
│    // Emit to all clients in outlet room                                │
│    this.server                                                           │
│      .to(`outlet:${event.outletId}`)                                    │
│      .emit('order:status_changed', {                                    │
│        orderId: event.orderId,                                          │
│        previousStatus: event.previousStatus,                            │
│        newStatus: event.newStatus,                                      │
│        timestamp: new Date()                                            │
│      });                                                                 │
│                                                                          │
│    // Special notification for ready orders                             │
│    if (event.newStatus === 'ready') {                                   │
│      this.server                                                         │
│        .to(`outlet:${event.outletId}`)                                  │
│        .emit('order:ready', {                                           │
│          orderId: event.orderId                                         │
│        });                                                               │
│    }                                                                     │
│  });                                                                     │
└──────────────────────────────────────────────────────────────────────────┘
                            │
                            │ Broadcast to room
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  WebSocket Server broadcasts to:                                        │
│  - outlet:outlet-123 room (4 connected clients)                         │
└──────────────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Kitchen #1   │    │ Kitchen #2   │    │ Manager      │
│ (React)      │    │ (React)      │    │ Dashboard    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │ All receive event simultaneously     │
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────┐
│  socket.on('order:status_changed', (data) => {           │
│    // Update React Query cache                           │
│    queryClient.setQueryData(['orders', data.orderId],    │
│      (old) => ({ ...old, status: data.newStatus })       │
│    );                                                     │
│                                                           │
│    // Update UI immediately (no API call needed)         │
│    // Show toast notification                            │
│    toast({ title: `Order ${data.orderId} is cooking` }); │
│  });                                                      │
│                                                           │
│  socket.on('order:ready', (data) => {                    │
│    // Play notification sound                            │
│    playSound('/sounds/order-ready.mp3');                 │
│                                                           │
│    // Show prominent alert                               │
│    showAlert(`Order ${data.orderId} ready for pickup!`); │
│  });                                                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Multi-Gateway Architecture                                              │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│  Domain Events     │
│  (EventBus)        │
└──────┬─────────────┘
       │
       ├─────────────────────────────────────────────┐
       │                                             │
       ▼                                             ▼
┌────────────────────┐                    ┌────────────────────┐
│  KdsGateway        │                    │ NotificationsGate  │
│  (namespace: /kds) │                    │ (namespace: /noti) │
│                    │                    │                    │
│ Subscribes to:     │                    │ Subscribes to:     │
│ - OrderStatusChgd  │                    │ - ALL events       │
│                    │                    │ - Transaction      │
│ Emits:             │                    │ - Order            │
│ - order:status_chg │                    │ - Stock            │
│ - order:ready      │                    │ - Shift            │
│ - order:cancelled  │                    │ - Sync             │
└────────┬───────────┘                    └────────┬───────────┘
         │                                         │
         │ Clients connect:                        │ Clients connect:
         │ io('/kds')                              │ io('/notifications')
         │                                         │
         ▼                                         ▼
┌────────────────────┐                    ┌────────────────────┐
│ KDS Display        │                    │ All Pages          │
│ (Kitchen only)     │                    │ (Global updates)   │
└────────────────────┘                    └────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Connection Lifecycle                                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. CLIENT CONNECTS
   → Gateway validates JWT
   → Sets user context on socket.data
   → Joins appropriate rooms

2. CLIENT SUBSCRIBES TO EVENTS
   → Frontend registers socket.on() listeners
   → Ready to receive real-time updates

3. BACKEND PUBLISHES EVENT
   → EventBus distributes to all subscribers
   → Gateway receives event
   → Emits to WebSocket room

4. CLIENT RECEIVES EVENT
   → socket.on() callback fires
   → Updates local state (React Query, Zustand)
   → UI re-renders with new data

5. CLIENT DISCONNECTS
   → Gateway removes from rooms
   → Logs disconnection

6. CLIENT RECONNECTS
   → Automatic reconnection (Socket.IO)
   → Re-authenticates with JWT
   → Re-joins rooms
   → Receives missed events (if implemented)

┌──────────────────────────────────────────────────────────────────────────┐
│  Benefits of WebSocket Architecture                                     │
└──────────────────────────────────────────────────────────────────────────┘

✓ Real-time updates (no polling)
  - Order appears on KDS instantly after POS transaction
  - Status changes propagate in <100ms

✓ Reduced server load
  - No repeated API calls for updates
  - Single connection per client

✓ Better UX
  - Instant feedback
  - Notifications with sound/animation
  - Multi-device sync (same user on multiple devices)

✓ Scalable
  - Rooms isolate events by outlet/business
  - Only relevant clients receive updates
  - Horizontal scaling possible (with Redis adapter)
```

---

## Multi-tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Multi-Tenancy Architecture                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Authentication & Context                                                │
└──────────────────────────────────────────────────────────────────────────┘

USER LOGIN
    │
    │ POST /auth/login { email, password }
    ▼
┌────────────────────────────────────────────────────────────┐
│  AuthService.validateUser()                                │
│  - Verify credentials                                      │
│  - Fetch user with employee relation                       │
│  - Load employee.outlet (includes outlet.businessId)       │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  JWT Payload:                                              │
│  {                                                         │
│    userId: "user-123",                                     │
│    employeeId: "emp-456",                                  │
│    outletId: "outlet-789",                                 │
│    businessId: "biz-abc",         ← CRITICAL FOR ISOLATION│
│    role: "cashier",                                        │
│    iat: 1234567890,                                        │
│    exp: 1234654290                                         │
│  }                                                         │
└────────────────────────┬───────────────────────────────────┘
                         │
                         │ JWT signed with secret
                         ▼
                    Access Token
                    (sent to client)

┌──────────────────────────────────────────────────────────────────────────┐
│  Request Authorization                                                   │
└──────────────────────────────────────────────────────────────────────────┘

CLIENT REQUEST
    │
    │ GET /api/v1/products
    │ Authorization: Bearer <JWT>
    ▼
┌────────────────────────────────────────────────────────────┐
│  AuthGuard (NestJS)                                        │
│  - Extract JWT from header                                 │
│  - Verify signature                                        │
│  - Decode payload                                          │
│  - Attach to request.user                                  │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  Controller receives request:                              │
│  @UseGuards(JwtAuthGuard, RolesGuard)                      │
│  @Roles('cashier', 'manager')                              │
│  async getProducts(@CurrentUser() user: JwtPayload) {      │
│    return this.productService.findAll(user.businessId);    │
│  }                                                          │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  Service filters by businessId:                            │
│  async findAll(businessId: string) {                       │
│    return this.prisma.product.findMany({                   │
│      where: { businessId }  ← AUTO-SCOPING               │
│    });                                                      │
│  }                                                          │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Database Schema Design                                                  │
└──────────────────────────────────────────────────────────────────────────┘

Business (Tenant)
    ├─ id (PK)
    ├─ name
    └─ subscriptionPlan

Outlet
    ├─ id (PK)
    ├─ businessId (FK → Business)    ← TENANT BOUNDARY
    ├─ name
    └─ address

Product
    ├─ id (PK)
    ├─ businessId (FK → Business)    ← TENANT BOUNDARY
    ├─ outletId (FK → Outlet)        ← OUTLET FILTER (optional)
    ├─ name
    └─ price

Transaction
    ├─ id (PK)
    ├─ outletId (FK → Outlet)        ← OUTLET FILTER
    ├─ businessId (implicit via outlet.businessId)
    ├─ employeeId (FK → Employee)
    └─ customerId (FK → Customer)

Customer
    ├─ id (PK)
    ├─ businessId (FK → Business)    ← TENANT BOUNDARY
    ├─ name
    └─ loyaltyPoints

Order
    ├─ id (PK)
    ├─ outletId (FK → Outlet)        ← OUTLET FILTER
    ├─ businessId (implicit via outlet.businessId)
    ├─ orderNumber
    └─ status

┌──────────────────────────────────────────────────────────────────────────┐
│  Query Patterns                                                          │
└──────────────────────────────────────────────────────────────────────────┘

❌ NEVER query without businessId:
    await prisma.product.findMany();  // Returns ALL products from ALL businesses!

✓ ALWAYS scope by businessId:
    await prisma.product.findMany({
      where: { businessId: user.businessId }
    });

✓ For outlet-specific data:
    await prisma.transaction.findMany({
      where: {
        outletId: user.outletId,              // Outlet filter
        outlet: { businessId: user.businessId } // Business filter (for safety)
      }
    });

✓ For cross-outlet data (business-wide):
    await prisma.customer.findMany({
      where: { businessId: user.businessId }
    });
    // Returns customers across ALL outlets in the business

┌──────────────────────────────────────────────────────────────────────────┐
│  Event Isolation                                                         │
└──────────────────────────────────────────────────────────────────────────┘

Domain Event Published:
    TransactionCreatedEvent(txnId, outletId, total, custId)
                                     ^
                                     └─ Contains outlet context

Event Listeners:
    ✓ Auto-scoped by outletId in event
    ✓ Query data with outlet filter:
        await prisma.transaction.findUnique({
          where: { id: event.transactionId },
          include: { outlet: true }  // Contains businessId
        });

WebSocket Rooms:
    ✓ Clients join: outlet:{outletId}
    ✓ Events emit to: outlet:{outletId}
    ✓ Only clients in that outlet receive updates

RabbitMQ Messages:
    ✓ Routing key includes: businessId.outletId
    ✓ Queue handlers filter by businessId

┌──────────────────────────────────────────────────────────────────────────┐
│  Data Isolation Guarantees                                               │
└──────────────────────────────────────────────────────────────────────────┘

1. USER AUTHENTICATION
   ✓ JWT contains businessId (from employee.outlet.businessId)
   ✓ Cannot be modified by client (signed token)

2. API QUERIES
   ✓ All queries filtered by businessId from JWT
   ✓ AuthGuard rejects requests without valid JWT
   ✓ RolesGuard enforces role-based access

3. WEBSOCKET CONNECTIONS
   ✓ JWT validated on connection
   ✓ Clients join rooms scoped by outlet/business
   ✓ Events only broadcast to authorized rooms

4. EVENT PROCESSING
   ✓ Events contain outletId (includes businessId implicitly)
   ✓ Listeners query data with outlet/business filter
   ✓ No cross-tenant data leakage

5. DATABASE CONSTRAINTS
   ✓ Foreign keys enforce referential integrity
   ✓ Indexes on businessId for query performance
   ✓ Multi-column unique constraints include businessId

┌──────────────────────────────────────────────────────────────────────────┐
│  Example: Cross-Tenant Isolation Test                                   │
└──────────────────────────────────────────────────────────────────────────┘

Tenant A (businessId: biz-111)
    Outlet A1 (outletId: outlet-aaa)
        Product: Coffee (id: prod-111)
        Transaction: txn-111

Tenant B (businessId: biz-222)
    Outlet B1 (outletId: outlet-bbb)
        Product: Coffee (id: prod-222)
        Transaction: txn-222

Test 1: User from Tenant A queries products
    User A JWT: { businessId: 'biz-111', outletId: 'outlet-aaa' }
    Query: GET /api/v1/products
    Result: [{ id: 'prod-111', name: 'Coffee' }]  ✓ Only Tenant A products

Test 2: User from Tenant A tries to access Tenant B product
    User A JWT: { businessId: 'biz-111', ... }
    Query: GET /api/v1/products/prod-222
    Result: 404 Not Found  ✓ Blocked by businessId filter

Test 3: WebSocket event isolation
    Order created at Outlet B1 (Tenant B)
    Event: OrderStatusChangedEvent(order-bbb, outlet-bbb, ...)
    Emits to: outlet:outlet-bbb room
    User A connected to: outlet:outlet-aaa room
    Result: User A does NOT receive event  ✓ Room isolation

Test 4: Direct database query attempt
    User A tries: SELECT * FROM products WHERE id = 'prod-222'
    ❌ NOT POSSIBLE - No direct SQL access from API
    ✓ All queries go through Prisma with businessId filter
```

---

## Summary

Dokumentasi visual ini menunjukkan:

1. **System Architecture Overview** - Layered architecture dari frontend hingga database
2. **Event Flow Diagram** - Bagaimana events dipublish dan diproses
3. **Module Interaction Map** - Dependencies antar module dengan sync/async patterns
4. **POS Transaction Flow** - Complete lifecycle dengan timing breakdown
5. **Data Consistency Model** - Strong vs eventual consistency dengan trade-offs
6. **WebSocket Real-time Architecture** - Room-based broadcasting dengan lifecycle
7. **Multi-tenant Data Isolation** - Security model dengan JWT dan query patterns

Semua diagram menggunakan ASCII art yang bisa ditampilkan di terminal atau markdown viewer.
