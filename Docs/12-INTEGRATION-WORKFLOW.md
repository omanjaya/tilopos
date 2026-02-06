# TiloPOS Integration Workflow & Architecture

**Status:** Production-ready
**Last Updated:** 2026-02-06
**Author:** System Analysis

## Table of Contents

1. [Overview](#overview)
2. [Event-Driven Architecture](#event-driven-architecture)
3. [Core Workflow: POS → Transaction → Order → KDS](#core-workflow-pos--transaction--order--kds)
4. [Cross-Module Integrations](#cross-module-integrations)
5. [Message Queue & Real-time Infrastructure](#message-queue--real-time-infrastructure)
6. [Data Flow Patterns](#data-flow-patterns)
7. [Complete Transaction Example](#complete-transaction-example)
8. [Architectural Insights](#architectural-insights)

---

## Overview

TiloPOS menggunakan **hybrid event-driven architecture** yang menggabungkan:
- **RxJS Event Bus** untuk event handling in-process
- **RabbitMQ** untuk skalabilitas cross-service (dengan auto-fallback)
- **WebSocket Gateways** untuk real-time updates ke client
- **Synchronous operations** untuk critical path (stock validation, payment)

### Design Principles

1. **Eventual Consistency** - Modul sync secara asynchronous via events
2. **Fail-Safe** - Transaction success tidak bergantung pada side effects
3. **Real-time Updates** - WebSocket untuk UX responsif
4. **Multi-tenant** - Semua data scoped by `businessId` dan `outletId`
5. **Audit Trail** - Semua operasi tercatat di AuditLog

---

## Event-Driven Architecture

### Domain Events

Events defined di `/src/domain/events/`:

| Event | Emitted By | Payload | Triggers |
|-------|-----------|---------|----------|
| **TransactionCreatedEvent** | CreateTransactionUseCase | transactionId, outletId, grandTotal, customerId | Stock deduction, loyalty points, ingredient usage, order creation |
| **TransactionVoidedEvent** | VoidTransactionUseCase | transactionId, outletId, grandTotal, voidedBy, reason | Stock reversal, loyalty reversal |
| **OrderStatusChangedEvent** | CreateOrderUseCase, UpdateOrderStatusUseCase | orderId, outletId, previousStatus, newStatus | KDS display updates, table status changes |
| **StockLevelChangedEvent** | Inventory operations | outletId, productId, variantId, previousQuantity, newQuantity | Low stock alerts |
| **StockTransferStatusChangedEvent** | Stock transfer | transferId, sourceOutletId, destinationOutletId, previousStatus, newStatus | Inter-outlet sync |
| **ShiftStartedEvent** | Shift module | shiftId, employeeId, outletId, businessId | Shift initialization |
| **ShiftEndedEvent** | Shift module | shiftId, employeeId, totalSales, cashCollected | Settlement, reporting |

### Event Bus Implementation

```typescript
// EventBusService (RxJS-based)
class EventBusService {
  private subject = new Subject<DomainEvent>();

  publish(event: DomainEvent): void {
    this.subject.next(event);
  }

  ofType<T extends DomainEvent>(eventType: new (...args: any[]) => T): Observable<T> {
    return this.subject.pipe(
      filter(event => event instanceof eventType)
    );
  }
}
```

**Pattern:** Handler subscribe via `OnModuleInit`:

```typescript
@Injectable()
export class TransactionToOrderHandler implements OnModuleInit {
  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      void this.handleTransactionCreated(event);
    });
  }
}
```

### Event Bridge (RxJS ↔ RabbitMQ)

`EventBridgeService` connects in-process events to message queue:

```
RxJS EventBus → EventBridgeService → RabbitMQ
                      ↑
RabbitMQ → QueueHandlers → EventBridgeService → RxJS EventBus
```

**Loop Prevention:** Events from RabbitMQ are marked to prevent re-publishing.

---

## Core Workflow: POS → Transaction → Order → KDS

### Architecture Diagram

```
┌─────────────┐
│  POS Client │
│  (React)    │
└──────┬──────┘
       │ POST /pos/transactions
       ↓
┌─────────────────────────────────────────────────────────────┐
│                    PosController                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              CreateTransactionUseCase                       │
│  1. Validate shift open                                     │
│  2. Validate stock levels (SYNCHRONOUS)                     │
│  3. Create transaction record                               │
│  4. Deduct stock (ATOMIC)                                   │
│  5. Create stock movements                                  │
│  6. PUBLISH: TransactionCreatedEvent                        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│                     EventBus.publish()                         │
│  Distributes to ALL subscribers in parallel                    │
└───┬──────────────────────┬─────────────────────┬──────────────┘
    ↓                      ↓                     ↓
┌──────────────────┐  ┌─────────────────────┐  ┌─────────────────┐
│TransactionEvent  │  │TransactionToOrder   │  │EventBridge      │
│Listener          │  │Handler              │  │Service          │
│                  │  │                     │  │                 │
│• Deduct          │  │1. Check orderType   │  │• RabbitMQ       │
│  ingredients     │  │   (dine_in, etc)    │  │  routing        │
│• Add loyalty     │  │2. Create Order      │  │                 │
│  points          │  │3. PUBLISH:          │  │                 │
│• Audit log       │  │   OrderStatus       │  │                 │
│                  │  │   ChangedEvent      │  │                 │
└──────────────────┘  └──────┬──────────────┘  └─────────────────┘
                             ↓
                    ┌────────────────────┐
                    │CreateOrderUseCase  │
                    │1. Generate number  │
                    │2. Create order     │
                    │3. Create items     │
                    │4. Update table     │
                    │5. PUBLISH event    │
                    └──────┬─────────────┘
                           ↓
                    ┌────────────────────┐
                    │OrderStatusChanged  │
                    │Event               │
                    └──────┬─────────────┘
                           ↓
                    ┌──────────────────────────────┐
                    │  KdsGateway (WebSocket)      │
                    │  Emits: order:status_changed │
                    │  To: outlet:{outletId} room  │
                    └──────┬───────────────────────┘
                           ↓
                    ┌────────────────┐
                    │  KDS Display   │
                    │  (Real-time)   │
                    └────────────────┘
```

### Step-by-Step Flow

#### 1. POS Transaction Creation

**Endpoint:** `POST /api/v1/pos/transactions`

**Payload:**
```json
{
  "outletId": "outlet-123",
  "employeeId": "emp-456",
  "shiftId": "shift-789",
  "orderType": "dine_in",
  "tableId": "table-5",
  "customerId": "cust-42",
  "items": [
    {
      "productId": "coffee-espresso",
      "variantId": "large",
      "quantity": 2,
      "modifierIds": ["extra-shot"],
      "notes": "No sugar"
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 50000,
      "referenceNumber": null
    }
  ],
  "notes": "For table 5"
}
```

**Processing:** `CreateTransactionUseCase.execute()`

```typescript
async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
  // 1. Validate shift is open
  const shift = await this.validateShift(input.shiftId);

  // 2. Fetch products & validate stock (SYNCHRONOUS - can fail transaction)
  const products = await this.fetchProducts(input.items);
  await this.validateStockLevels(input.outletId, input.items);

  // 3. Calculate totals
  const { subtotal, taxAmount, serviceCharge, grandTotal } = this.calculateTotals(items);

  // 4. Create transaction (ATOMIC)
  const transaction = await this.prisma.$transaction(async (tx) => {
    // Create transaction record
    const txn = await tx.transaction.create({ data: { /* ... */ } });

    // Create items
    await tx.transactionItem.createMany({ data: items });

    // Create payments
    await tx.payment.createMany({ data: payments });

    // Deduct stock
    for (const item of items) {
      if (item.product.trackStock) {
        await tx.stockLevel.update({
          where: { outletId_productId_variantId: { /* ... */ } },
          data: { quantity: { decrement: item.quantity } }
        });

        // Create stock movement (audit trail)
        await tx.stockMovement.create({
          data: {
            type: 'sale',
            quantity: -item.quantity,
            transactionId: txn.id,
            /* ... */
          }
        });
      }
    }

    return txn;
  });

  // 5. Publish event (AFTER transaction committed)
  this.eventBus.publish(
    new TransactionCreatedEvent(
      transaction.id,
      input.outletId,
      transaction.grandTotal,
      input.customerId
    )
  );

  return {
    transactionId: transaction.id,
    receiptNumber: transaction.receiptNumber,
    grandTotal: transaction.grandTotal,
    change: calculateChange(payments, grandTotal),
  };
}
```

#### 2. Event Processing (Parallel)

**A. TransactionEventListener** (Side effects)

```typescript
@Injectable()
export class TransactionEventListener implements OnModuleInit {
  onModuleInit() {
    this.eventBus.ofType(TransactionCreatedEvent).subscribe(async (event) => {
      // Run in parallel, errors won't fail transaction
      await Promise.allSettled([
        this.deductIngredients(event.transactionId),
        this.addLoyaltyPoints(event.transactionId, event.customerId),
        this.logAuditEntry(event),
      ]);
    });
  }

  // Deduct recipe ingredients from inventory
  private async deductIngredients(transactionId: string): Promise<void> {
    const items = await this.findTransactionItems(transactionId);

    for (const item of items) {
      const recipe = await this.findRecipe(item.productId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        // Deduct: beans, milk, sugar, etc.
        await this.prisma.ingredientStockLevel.update({
          where: { outletId_ingredientId: { /* ... */ } },
          data: { quantity: { decrement: ingredient.quantity * item.quantity } }
        });

        // Create movement
        await this.prisma.ingredientStockMovement.create({
          data: { type: 'usage', quantity: -ingredient.quantity * item.quantity }
        });
      }
    }
  }

  // Add loyalty points to customer
  private async addLoyaltyPoints(transactionId: string, customerId?: string): Promise<void> {
    if (!customerId) return;

    const transaction = await this.findTransaction(transactionId);
    const customer = await this.findCustomer(customerId);
    if (!customer.isActive) return;

    const loyaltyProgram = await this.findLoyaltyProgram(customer.businessId);
    if (!loyaltyProgram) return;

    // Calculate points
    const pointsEarned = Math.floor(
      (transaction.grandTotal / loyaltyProgram.amountPerPoint) *
      (customer.tierMultiplier || 1.0)
    );

    // Update customer
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: { increment: pointsEarned },
        totalSpent: { increment: transaction.grandTotal },
        visitCount: { increment: 1 },
      }
    });

    // Create loyalty transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'earned',
        points: pointsEarned,
        transactionId,
      }
    });

    // Check tier upgrade
    await this.checkTierUpgrade(customerId);
  }
}
```

**B. TransactionToOrderHandler** (KDS integration)

```typescript
@Injectable()
export class TransactionToOrderHandler implements OnModuleInit {
  onModuleInit() {
    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      void this.handleTransactionCreated(event);
    });
  }

  private async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    try {
      // 1. Fetch transaction with items
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: event.transactionId },
        include: { items: { include: { product: true } } },
      });

      if (!transaction) return;

      // 2. Filter: Only create orders for dine_in, takeaway, delivery
      const orderTypes = ['dine_in', 'takeaway', 'delivery'];
      if (!orderTypes.includes(transaction.orderType)) {
        this.logger.debug(`Skipping order creation for ${transaction.orderType}`);
        return;
      }

      // 3. Skip if no items
      if (transaction.items.length === 0) return;

      // 4. Filter valid items (non-null productId)
      const validItems = transaction.items
        .filter((item) => item.productId !== null)
        .map((item) => ({
          productId: item.productId!,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity), // Convert Prisma Decimal
          notes: item.notes || undefined,
          station: item.product?.categoryId || undefined, // Assign station by category
        }));

      if (validItems.length === 0) return;

      // 5. Create order for kitchen
      const orderResult = await this.createOrderUseCase.execute({
        outletId: transaction.outletId,
        orderType: transaction.orderType as 'dine_in' | 'takeaway' | 'delivery',
        tableId: transaction.tableId || undefined,
        customerId: transaction.customerId || undefined,
        items: validItems,
        notes: transaction.notes || undefined,
        priority: 0, // Normal priority
      });

      this.logger.log(
        `✅ Created order ${orderResult.orderNumber} from transaction ${event.transactionId}`
      );
    } catch (error) {
      // Don't throw - transaction already completed
      this.logger.error(`❌ Failed to create order: ${error.message}`);
    }
  }
}
```

#### 3. Order Creation & Table Update

**CreateOrderUseCase.execute():**

```typescript
async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
  // 1. Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // 2. Fetch products for names
  const products = await this.prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) } },
  });

  // 3. Create order
  const order = await this.orderRepo.save({
    id: crypto.randomUUID(),
    outletId: input.outletId,
    orderNumber,
    orderType: input.orderType,
    tableId: input.tableId || null,
    customerId: input.customerId || null,
    status: 'pending',
    priority: input.priority ?? 0,
    notes: input.notes || null,
    estimatedTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Create order items
  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    await this.prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId || null,
        productName: product?.name || 'Unknown',
        quantity: item.quantity,
        station: item.station || null,
        notes: item.notes || null,
        status: 'pending',
      },
    });
  }

  // 5. Update table status (if dine-in)
  if (input.tableId) {
    await this.prisma.table.update({
      where: { id: input.tableId },
      data: {
        status: 'occupied',
        currentOrderId: order.id,
        occupiedAt: new Date(),
      },
    });
  }

  // 6. Publish event
  this.eventBus.publish(
    new OrderStatusChangedEvent(order.id, input.outletId, '', 'pending')
  );

  return {
    orderId: order.id,
    orderNumber,
    estimatedTime: null,
  };
}
```

#### 4. Real-time KDS Update

**KdsGateway (WebSocket):**

```typescript
@WebSocketGateway({ namespace: 'kds', cors: true })
export class KdsGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer() server: Server;

  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    // Subscribe to OrderStatusChangedEvent
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {
      // Emit to all clients in outlet room
      this.server.to(`outlet:${event.outletId}`).emit('order:status_changed', {
        orderId: event.orderId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
      });

      // Special notification for ready orders
      if (event.newStatus === 'ready') {
        this.server.to(`outlet:${event.outletId}`).emit('order:ready', {
          orderId: event.orderId,
        });
      }
    });
  }

  handleConnection(client: Socket) {
    // Validate JWT token
    const token = client.handshake.auth.token;
    const payload = this.jwtService.verify(token);

    // Set user context
    client.data.userId = payload.userId;
    client.data.businessId = payload.businessId;

    // Auto-join outlet room
    const outletId = client.handshake.query.outletId as string;
    client.join(`outlet:${outletId}`);

    this.logger.log(`Client ${client.id} joined outlet:${outletId}`);
  }
}
```

**Frontend KDS (React):**

```typescript
// KDS page connects to WebSocket
const socket = io('http://localhost:3001/kds', {
  auth: { token: authStore.accessToken },
  query: { outletId: user.outletId },
});

socket.on('order:status_changed', (data) => {
  // Update order in React Query cache
  queryClient.setQueryData(['orders', data.orderId], (old) => ({
    ...old,
    status: data.newStatus,
  }));

  // Show toast notification
  toast({ title: `Order ${data.orderId} is now ${data.newStatus}` });
});

socket.on('order:ready', (data) => {
  // Play notification sound
  playNotificationSound();

  // Show prominent alert
  showAlert(`Order ${data.orderId} is ready for pickup!`);
});
```

---

## Cross-Module Integrations

### 1. POS ↔ Inventory (Stock Management)

#### Synchronous Stock Validation (Critical Path)

**During transaction creation (MUST succeed):**

```typescript
// CreateTransactionUseCase
private async validateStockLevels(outletId: string, items: TransactionItemInput[]): Promise<void> {
  for (const item of items) {
    const product = await this.prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product.trackStock) continue; // Skip non-tracked items

    const stockLevel = await this.prisma.stockLevel.findUnique({
      where: {
        outletId_productId_variantId: {
          outletId,
          productId: item.productId,
          variantId: item.variantId || null,
        },
      },
    });

    if (!stockLevel || stockLevel.quantity < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${product.name}. Available: ${stockLevel?.quantity || 0}, Required: ${item.quantity}`
      );
    }
  }
}
```

**Stock deduction (ATOMIC with transaction):**

```typescript
// Inside prisma.$transaction()
await tx.stockLevel.update({
  where: { outletId_productId_variantId: { /* ... */ } },
  data: { quantity: { decrement: item.quantity } }
});

// Audit trail
await tx.stockMovement.create({
  data: {
    type: 'sale',
    quantity: -item.quantity,
    productId: item.productId,
    variantId: item.variantId,
    outletId,
    transactionId: transaction.id,
    performedBy: input.employeeId,
    notes: `Sale: ${product.name}`,
  }
});
```

#### Asynchronous Ingredient Deduction (Side Effect)

**After transaction committed:**

```typescript
// TransactionEventListener
private async deductIngredients(transactionId: string): Promise<void> {
  const items = await this.prisma.transactionItem.findMany({
    where: { transactionId },
    include: { product: { include: { recipe: { include: { ingredients: true } } } } },
  });

  for (const item of items) {
    const recipe = item.product.recipe;
    if (!recipe) continue; // Product has no recipe

    for (const recipeIngredient of recipe.ingredients) {
      const ingredientQty = recipeIngredient.quantity * Number(item.quantity);

      // Deduct ingredient stock
      await this.prisma.ingredientStockLevel.update({
        where: {
          outletId_ingredientId: {
            outletId: item.outletId,
            ingredientId: recipeIngredient.ingredientId,
          },
        },
        data: { quantity: { decrement: ingredientQty } },
      });

      // Create movement
      await this.prisma.ingredientStockMovement.create({
        data: {
          type: 'usage',
          quantity: -ingredientQty,
          ingredientId: recipeIngredient.ingredientId,
          outletId: item.outletId,
          transactionId,
          notes: `Used in ${item.productName}`,
        },
      });

      // Check low stock alert
      const ingredientStock = await this.prisma.ingredientStockLevel.findUnique({
        where: { outletId_ingredientId: { /* ... */ } },
        include: { ingredient: true },
      });

      if (ingredientStock.quantity <= ingredientStock.lowStockAlert) {
        // Publish low stock event
        this.eventBus.publish(
          new StockLevelChangedEvent(
            item.outletId,
            null, // Not a product, it's an ingredient
            recipeIngredient.ingredientId,
            ingredientStock.quantity + ingredientQty,
            ingredientStock.quantity
          )
        );
      }
    }
  }
}
```

### 2. POS ↔ Loyalty (Points Earning)

**Triggered by:** `TransactionCreatedEvent`

```typescript
// TransactionEventListener
private async addLoyaltyPoints(transactionId: string, customerId?: string): Promise<void> {
  if (!customerId) {
    this.logger.debug('No customer attached to transaction, skipping loyalty');
    return;
  }

  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { include: { loyaltyProgram: true } } },
  });

  if (!customer.isActive) {
    this.logger.debug(`Customer ${customerId} is inactive, skipping loyalty`);
    return;
  }

  const loyaltyProgram = customer.business.loyaltyProgram;
  if (!loyaltyProgram || !loyaltyProgram.isActive) {
    this.logger.debug('No active loyalty program for this business');
    return;
  }

  const transaction = await this.prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  // Calculate points based on amount spent
  const tierMultiplier = this.getTierMultiplier(customer.loyaltyTier, loyaltyProgram);
  const pointsEarned = Math.floor(
    (Number(transaction.grandTotal) / Number(loyaltyProgram.amountPerPoint)) * tierMultiplier
  );

  if (pointsEarned === 0) {
    this.logger.debug('Transaction amount too low to earn points');
    return;
  }

  // Update customer atomically
  await this.prisma.customer.update({
    where: { id: customerId },
    data: {
      loyaltyPoints: { increment: pointsEarned },
      totalSpent: { increment: transaction.grandTotal },
      visitCount: { increment: 1 },
      lastVisitAt: new Date(),
    },
  });

  // Create loyalty transaction (audit trail)
  await this.prisma.loyaltyTransaction.create({
    data: {
      customerId,
      type: 'earned',
      points: pointsEarned,
      description: `Earned from transaction ${transaction.receiptNumber}`,
      transactionId,
      createdBy: transaction.employeeId,
    },
  });

  this.logger.log(`Added ${pointsEarned} loyalty points to customer ${customerId}`);

  // Check tier upgrade
  const tierUpgrade = await this.checkTierUpgrade(customerId, loyaltyProgram);
  if (tierUpgrade) {
    this.logger.log(`Customer ${customerId} upgraded to ${tierUpgrade.newTier}`);

    // Optionally: Send notification
    await this.notificationService.send({
      userId: customer.userId,
      type: 'loyalty_tier_upgrade',
      title: 'Congratulations! Tier Upgrade',
      message: `You've been upgraded to ${tierUpgrade.newTier}!`,
    });
  }
}

private getTierMultiplier(customerTier: string, program: LoyaltyProgram): number {
  const tier = program.tiers.find((t) => t.name === customerTier);
  return tier?.pointsMultiplier || 1.0;
}

private async checkTierUpgrade(customerId: string, program: LoyaltyProgram) {
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
  });

  const sortedTiers = program.tiers.sort((a, b) => b.minPoints - a.minPoints);

  for (const tier of sortedTiers) {
    if (customer.loyaltyPoints >= tier.minPoints && customer.loyaltyTier !== tier.name) {
      // Upgrade customer
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyTier: tier.name },
      });

      return { newTier: tier.name, previousTier: customer.loyaltyTier };
    }
  }

  return null;
}
```

### 3. Orders ↔ Tables (Status Management)

#### Table Occupation (Order Created)

```typescript
// CreateOrderUseCase
if (input.tableId) {
  await this.prisma.table.update({
    where: { id: input.tableId },
    data: {
      status: 'occupied',
      currentOrderId: order.id,
      occupiedAt: new Date(),
    },
  });
}
```

#### Table Release (Order Completed)

```typescript
// OrderEventListener
@Injectable()
export class OrderEventListener implements OnModuleInit {
  onModuleInit() {
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe(async (event) => {
      if (event.newStatus === 'completed') {
        await this.handleOrderCompleted(event);
      }
    });
  }

  private async handleOrderCompleted(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
    });

    if (!order.tableId) return; // Not a dine-in order

    // Check if there are other active orders for this table
    const activeOrders = await this.prisma.order.findMany({
      where: {
        tableId: order.tableId,
        status: { in: ['pending', 'cooking', 'ready'] },
      },
    });

    if (activeOrders.length === 0) {
      // No other active orders, release table
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: {
          status: 'available',
          currentOrderId: null,
        },
      });

      this.logger.log(`Table ${order.tableId} is now available`);
    } else {
      this.logger.debug(`Table ${order.tableId} still has ${activeOrders.length} active orders`);
    }
  }
}
```

### 4. Self-Order ↔ POS (Customer Ordering)

#### Self-Order Session Creation

```typescript
// Self-Order flow
POST /api/v1/self-order/sessions
{
  "outletId": "outlet-123",
  "tableId": "table-7"
}

Response:
{
  "sessionCode": "ABCD1234",
  "expiresAt": "2026-02-06T12:00:00Z",
  "qrCode": "data:image/png;base64,..."
}
```

#### Customer Places Order

```typescript
// Customer scans QR, adds items
POST /api/v1/self-order/sessions/{sessionCode}/items
{
  "productId": "coffee-latte",
  "variantId": "large",
  "quantity": 1,
  "notes": "Extra hot"
}

// Customer checks out
POST /api/v1/self-order/sessions/{sessionCode}/checkout
{
  "paymentMethod": "qris"
}
```

#### Backend Creates Transaction

```typescript
// SelfOrderSubmissionService
async submitOrder(sessionCode: string, paymentInfo: PaymentInfo): Promise<Transaction> {
  const session = await this.validateSession(sessionCode);

  const items = await this.prisma.selfOrderItem.findMany({
    where: { sessionId: session.id },
  });

  // Create transaction via POS flow
  const transaction = await this.createTransactionUseCase.execute({
    outletId: session.outletId,
    orderType: 'dine_in',
    tableId: session.tableId,
    customerId: session.customerId,
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      notes: item.notes,
    })),
    payments: [
      {
        method: paymentInfo.method,
        amount: calculateTotal(items),
        referenceNumber: paymentInfo.referenceNumber,
      },
    ],
  });

  // TransactionCreatedEvent → TransactionToOrderHandler → KDS order created
  // (Same flow as regular POS)

  return transaction;
}
```

### 5. Transactions ↔ Reports (Data Aggregation)

**Reports query transaction data with complex filters:**

```typescript
// SalesReportService
async getSalesReport(filters: ReportFilters): Promise<SalesReportData> {
  const { startDate, endDate, outletId, employeeId, orderType } = filters;

  // Aggregate transactions
  const transactions = await this.prisma.transaction.findMany({
    where: {
      outletId,
      employeeId,
      orderType,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'completed',
    },
    include: {
      items: { include: { product: true } },
      payments: true,
    },
  });

  // Calculate metrics
  const totalSales = transactions.reduce((sum, txn) => sum + Number(txn.grandTotal), 0);
  const totalTransactions = transactions.length;
  const averageTransactionValue = totalSales / totalTransactions;

  // Group by date for chart
  const salesByDate = groupBy(transactions, (txn) => formatDate(txn.createdAt));

  // Group by payment method
  const paymentBreakdown = groupBy(
    transactions.flatMap((txn) => txn.payments),
    (payment) => payment.method
  );

  // Top products
  const itemsSold = transactions.flatMap((txn) => txn.items);
  const topProducts = groupBy(itemsSold, (item) => item.productId)
    .map((group) => ({
      productName: group[0].product.name,
      quantitySold: group.reduce((sum, item) => sum + Number(item.quantity), 0),
      revenue: group.reduce((sum, item) => sum + Number(item.subtotal), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Compare with previous period
  const previousPeriodData = await this.getSalesReport({
    ...filters,
    startDate: subtractDays(startDate, dateDiff(startDate, endDate)),
    endDate: startDate,
  });

  const comparison = {
    salesGrowth: calculateGrowth(totalSales, previousPeriodData.totalSales),
    transactionGrowth: calculateGrowth(totalTransactions, previousPeriodData.totalTransactions),
  };

  return {
    totalSales,
    totalTransactions,
    averageTransactionValue,
    salesByDate,
    paymentBreakdown,
    topProducts,
    comparison,
  };
}
```

---

## Message Queue & Real-time Infrastructure

### RabbitMQ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Exchange: tilo.events                   │
│                        (type: topic)                         │
└────┬──────────────┬────────────────┬──────────────┬─────────┘
     │              │                │              │
     ↓              ↓                ↓              ↓
┌─────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐
│pos.         │ │inventory.  │ │kds.      │ │customers.    │
│transactions │ │stock       │ │orders    │ │loyalty       │
└─────────────┘ └────────────┘ └──────────┘ └──────────────┘
```

**Routing Keys:**

| Queue | Binding Keys | Purpose |
|-------|--------------|---------|
| `pos.transactions` | `transaction.created`, `transaction.voided`, `payment.received` | Transaction analytics |
| `inventory.stock` | `stock.level_changed`, `stock.transfer_completed` | Inventory alerts, sync |
| `kds.orders` | `order.created`, `order.status_changed` | KDS notifications |
| `customers.loyalty` | `transaction.created`, `transaction.voided` | Loyalty processing |
| `notifications.send` | `notification.send`, `stock.level_changed` | Push notifications |

### EventBridgeService Implementation

```typescript
@Injectable()
export class EventBridgeService implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  onModuleInit() {
    // RxJS → RabbitMQ (publish to queue)
    this.bridgeRxJSToRabbitMQ();

    // RabbitMQ → RxJS (subscribe from queue)
    this.bridgeRabbitMQToRxJS();
  }

  private bridgeRxJSToRabbitMQ(): void {
    // Subscribe to all domain events
    this.eventBus.subject.subscribe((event) => {
      // Skip events that came from RabbitMQ (prevent loop)
      if ((event as any).__fromRabbitMQ) return;

      // Determine routing key
      const routingKey = this.getRoutingKey(event);

      // Publish to RabbitMQ
      this.rabbitmqService.publish('tilo.events', routingKey, event);

      this.logger.debug(`Published ${event.constructor.name} to RabbitMQ`);
    });
  }

  private bridgeRabbitMQToRxJS(): void {
    // Register queue handlers
    const queues = [
      'pos.transactions.bridge',
      'inventory.stock.bridge',
      'kds.orders.bridge',
      'customers.loyalty.bridge',
      'notifications.send.bridge',
    ];

    for (const queue of queues) {
      this.rabbitmqService.subscribe(queue, async (event) => {
        // Mark as from RabbitMQ to prevent re-publishing
        (event as any).__fromRabbitMQ = true;

        // Republish to RxJS EventBus
        this.eventBus.publish(event);

        this.logger.debug(`Bridged ${event.constructor.name} from RabbitMQ to RxJS`);
      });
    }
  }

  private getRoutingKey(event: DomainEvent): string {
    const eventName = event.constructor.name.replace('Event', '').toLowerCase();

    // Convert camelCase to dot.notation
    return eventName.replace(/([A-Z])/g, '.$1').toLowerCase();
    // TransactionCreatedEvent → transaction.created
    // OrderStatusChangedEvent → order.status.changed
  }
}
```

### WebSocket Gateways

#### KdsGateway (Kitchen Display)

```typescript
@WebSocketGateway({ namespace: 'kds', cors: true })
export class KdsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server: Server;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    // Subscribe to order events
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {
      this.handleOrderStatusChanged(event);
    });
  }

  handleConnection(client: Socket) {
    try {
      // Validate JWT
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);

      // Set user context
      client.data.userId = payload.userId;
      client.data.businessId = payload.businessId;
      client.data.outletId = payload.outletId;

      // Join rooms
      client.join(`outlet:${payload.outletId}`);
      client.join(`business:${payload.businessId}`);

      this.logger.log(`KDS client ${client.id} connected to outlet:${payload.outletId}`);
    } catch (error) {
      this.logger.error(`KDS client connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`KDS client ${client.id} disconnected`);
  }

  private handleOrderStatusChanged(event: OrderStatusChangedEvent): void {
    // Emit to outlet room
    this.server.to(`outlet:${event.outletId}`).emit('order:status_changed', {
      orderId: event.orderId,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      timestamp: new Date(),
    });

    // Special notification for ready orders
    if (event.newStatus === 'ready') {
      this.server.to(`outlet:${event.outletId}`).emit('order:ready', {
        orderId: event.orderId,
      });
    }
  }

  @SubscribeMessage('order:update_status')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; newStatus: string },
  ) {
    // Update order status (will trigger OrderStatusChangedEvent)
    await this.updateOrderStatusUseCase.execute({
      orderId: data.orderId,
      newStatus: data.newStatus,
      updatedBy: client.data.userId,
    });

    return { success: true };
  }
}
```

#### NotificationsGateway (Global Notifications)

```typescript
@WebSocketGateway({ namespace: 'notifications', cors: true })
export class NotificationsGateway implements OnModuleInit {
  @WebSocketServer() server: Server;

  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    // Subscribe to ALL domain events
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Transaction events
    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('transaction:created', event);
    });

    // Order events
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('order:status_changed', event);
    });

    // Stock events
    this.eventBus.ofType(StockLevelChangedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('inventory:stock_changed', event);
    });

    // Shift events
    this.eventBus.ofType(ShiftStartedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('shift:started', event);
    });

    this.eventBus.ofType(ShiftEndedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('shift:ended', event);
    });

    // Sync events
    this.eventBus.ofType(DeviceSyncStatusEvent).subscribe((event) => {
      this.server.emit('sync:status', event);
    });
  }
}
```

---

## Data Flow Patterns

### Sources of Truth

| Data Type | Primary Source | Sync Method | Propagation |
|-----------|---------------|-------------|-------------|
| **Transaction** | POS Module → Database | Synchronous write | Events → Listeners |
| **Order** | Orders Module → Database | Synchronous write | Events → WebSocket |
| **Stock Level** | Inventory Module → Database | Synchronous update | Events → Alerts |
| **Loyalty Points** | Customers Module → Database | Async via event | None (single write) |
| **Table Status** | Orders Module → Database | Async via event | None (single write) |

### Consistency Models

#### Strong Consistency (ACID)
- Transaction creation with stock deduction
- Payment processing
- All database writes in `prisma.$transaction()`

#### Eventual Consistency (Event-driven)
- Ingredient stock deduction (separate from product stock)
- Loyalty points earning (doesn't affect transaction)
- Order creation from transaction (non-blocking)
- Audit logging (fire-and-forget)

### Error Handling Strategy

**Critical path (must succeed):**
```typescript
try {
  // Stock validation
  await this.validateStockLevels();

  // Atomic transaction
  const txn = await this.prisma.$transaction(async (tx) => {
    // Create transaction
    // Deduct stock
    // Create payments
  });

  return txn; // Must succeed
} catch (error) {
  // Rollback everything
  throw new BadRequestException('Transaction failed');
}
```

**Side effects (fail-safe):**
```typescript
// After transaction committed
this.eventBus.publish(new TransactionCreatedEvent(/* ... */));

// Listeners handle errors internally
this.eventBus.ofType(TransactionCreatedEvent).subscribe(async (event) => {
  try {
    await this.deductIngredients(event.transactionId);
  } catch (error) {
    // Log error, don't throw
    this.logger.error(`Failed to deduct ingredients: ${error.message}`);
    // Transaction already completed, this is a side effect
  }
});
```

---

## Complete Transaction Example

### Scenario: Customer Orders 2 Coffees at Table 5

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Customer Action (POS Terminal)                              │
└────────────────────────────────────────────────────────────────┘

Cashier:
  - Scans product: Coffee Latte (Large) × 2
  - Selects table: Table 5
  - Adds customer: John Doe (loyalty member)
  - Order type: Dine In
  - Payment: Cash 100,000 IDR

Frontend sends:
POST /api/v1/pos/transactions
{
  "outletId": "outlet-123",
  "employeeId": "emp-456",
  "shiftId": "shift-789",
  "orderType": "dine_in",
  "tableId": "table-5",
  "customerId": "cust-john",
  "items": [
    {
      "productId": "coffee-latte",
      "variantId": "large",
      "quantity": 2,
      "modifierIds": ["extra-shot"],
      "notes": null
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 100000,
      "referenceNumber": null
    }
  ]
}

┌────────────────────────────────────────────────────────────────┐
│ 2. Transaction Creation (Backend)                              │
└────────────────────────────────────────────────────────────────┘

CreateTransactionUseCase.execute():

  [Validation Phase]
  ✓ Shift is open (shift-789 status: open)
  ✓ Product exists (coffee-latte, variant: large)
  ✓ Modifier exists (extra-shot, price: +5000)
  ✓ Stock available:
      coffee-latte (large): 50 in stock, need 2 ✓
      extra-shot (addon): unlimited ✓

  [Calculation Phase]
  Item price: 25,000 × 2 = 50,000
  Modifier: 5,000 × 2 = 10,000
  Subtotal: 60,000
  Tax (10%): 6,000
  Service charge (5%): 3,000
  Grand total: 69,000

  [Database Transaction - ATOMIC]
  BEGIN TRANSACTION;

    1. Create transaction record:
       INSERT INTO transactions (
         id: txn-abc123
         receiptNumber: RCP-2026020601
         transactionType: sale
         orderType: dine_in
         status: completed
         subtotal: 60000
         taxAmount: 6000
         serviceCharge: 3000
         grandTotal: 69000
         outletId: outlet-123
         employeeId: emp-456
         shiftId: shift-789
         customerId: cust-john
         tableId: table-5
       )

    2. Create transaction items:
       INSERT INTO transaction_items (
         transactionId: txn-abc123
         productId: coffee-latte
         variantId: large
         productName: "Coffee Latte"
         variantName: "Large"
         quantity: 2
         unitPrice: 30000  (25000 + 5000 modifier)
         subtotal: 60000
       )

    3. Create payments:
       INSERT INTO payments (
         transactionId: txn-abc123
         method: cash
         amount: 100000
         referenceNumber: null
       )

    4. Deduct stock:
       UPDATE stock_levels SET
         quantity = quantity - 2
       WHERE outletId = 'outlet-123'
         AND productId = 'coffee-latte'
         AND variantId = 'large'

       Result: 50 → 48

    5. Create stock movement (audit):
       INSERT INTO stock_movements (
         type: sale
         quantity: -2
         productId: coffee-latte
         variantId: large
         outletId: outlet-123
         transactionId: txn-abc123
         performedBy: emp-456
       )

  COMMIT TRANSACTION;

  [Event Publishing]
  EventBus.publish(
    new TransactionCreatedEvent(
      transactionId: txn-abc123,
      outletId: outlet-123,
      grandTotal: 69000,
      customerId: cust-john
    )
  )

┌────────────────────────────────────────────────────────────────┐
│ 3. Event Propagation (Parallel Listeners)                      │
└────────────────────────────────────────────────────────────────┘

EventBus subscribers fire SIMULTANEOUSLY:

┌─────────────────────────────────────────────────────────┐
│ Listener 1: TransactionEventListener                    │
└─────────────────────────────────────────────────────────┘

  [A] Deduct Ingredients:
      - Fetch coffee-latte recipe:
          * Coffee beans: 20g per cup
          * Milk: 200ml per cup
          * Sugar: 10g per cup

      - Deduct from ingredient stock:
          Beans: 1000g → 960g  (20g × 2)
          Milk: 5000ml → 4600ml  (200ml × 2)
          Sugar: 500g → 480g  (10g × 2)

      - Create ingredient movements (audit trail)

      - Check low stock:
          Sugar: 480g < 500g threshold ⚠️
          Publish: StockLevelChangedEvent
          → StockEventListener → Send alert to manager

  [B] Add Loyalty Points:
      - Fetch customer: John Doe
      - Loyalty program: amountPerPoint = 50,000
      - Customer tier: Silver (multiplier: 1.2)

      - Calculate:
          basePoints = floor(69,000 / 50,000) = 1
          bonusPoints = 1 × 1.2 = 1.2 → floor = 1
          totalPoints = 1

      - Update customer:
          loyaltyPoints: 120 → 121
          totalSpent: 500,000 → 569,000
          visitCount: 5 → 6

      - Create loyalty transaction:
          INSERT INTO loyalty_transactions (
            customerId: cust-john
            type: earned
            points: 1
            transactionId: txn-abc123
          )

      - Check tier upgrade:
          Current: Silver (min 100 points)
          Next: Gold (min 500 points)
          121 < 500 → No upgrade

  [C] Audit Log:
      INSERT INTO audit_logs (
        entityType: transaction
        entityId: txn-abc123
        action: transaction_created
        performedBy: emp-456
        metadata: { receiptNumber, grandTotal, ... }
      )

┌─────────────────────────────────────────────────────────┐
│ Listener 2: TransactionToOrderHandler                   │
└─────────────────────────────────────────────────────────┘

  [Order Creation]
  1. Fetch transaction with items
  2. Check orderType: dine_in ✓ (create order)
  3. Filter items: coffee-latte (productId not null) ✓

  4. Call CreateOrderUseCase:

     - Generate order number: ORD-LZR8K

     - Create order:
       INSERT INTO orders (
         id: order-xyz789
         orderNumber: ORD-LZR8K
         orderType: dine_in
         tableId: table-5
         customerId: cust-john
         status: pending
         priority: 0
         outletId: outlet-123
       )

     - Create order items:
       INSERT INTO order_items (
         orderId: order-xyz789
         productId: coffee-latte
         variantId: large
         productName: "Coffee Latte"
         quantity: 2
         station: hot_drinks  (from product.categoryId)
         notes: null
         status: pending
       )

     - Update table status:
       UPDATE tables SET
         status = 'occupied',
         currentOrderId = 'order-xyz789',
         occupiedAt = NOW()
       WHERE id = 'table-5'

       Result: available → occupied

     - Publish event:
       EventBus.publish(
         new OrderStatusChangedEvent(
           orderId: order-xyz789,
           outletId: outlet-123,
           previousStatus: '',
           newStatus: 'pending'
         )
       )

┌─────────────────────────────────────────────────────────┐
│ Listener 3: EventBridgeService (if RabbitMQ available)  │
└─────────────────────────────────────────────────────────┘

  [RabbitMQ Publishing]
  - Convert event to routing key:
      TransactionCreatedEvent → "transaction.created"

  - Publish to exchange "tilo.events":
      routingKey: transaction.created
      payload: {
        transactionId: txn-abc123,
        outletId: outlet-123,
        grandTotal: 69000,
        customerId: cust-john
      }

  - Routed to queues:
      ✓ pos.transactions
      ✓ customers.loyalty (duplicate processing, idempotent)

┌────────────────────────────────────────────────────────────────┐
│ 4. Order Event Propagation                                     │
└────────────────────────────────────────────────────────────────┘

OrderStatusChangedEvent listeners:

┌─────────────────────────────────────────────────────────┐
│ KdsGateway (WebSocket)                                   │
└─────────────────────────────────────────────────────────┘

  [Real-time Broadcast]
  - Emit to room: outlet:outlet-123
  - Event: "order:status_changed"
  - Payload: {
      orderId: order-xyz789,
      orderNumber: ORD-LZR8K,
      previousStatus: '',
      newStatus: 'pending',
      timestamp: 2026-02-06T10:15:30Z
    }

  - Connected clients:
      * KDS Display (Kitchen Staff) → Updates UI
      * Manager Dashboard → Updates order count
      * Cashier Terminal → Shows order created

┌─────────────────────────────────────────────────────────┐
│ OrderEventListener                                       │
└─────────────────────────────────────────────────────────┘

  [Audit Log]
  INSERT INTO audit_logs (
    entityType: order
    entityId: order-xyz789
    action: order_status_changed
    metadata: { previousStatus: '', newStatus: 'pending' }
  )

┌────────────────────────────────────────────────────────────────┐
│ 5. KDS Display (Frontend React)                                │
└────────────────────────────────────────────────────────────────┘

WebSocket listener receives event:

socket.on('order:status_changed', (data) => {
  // data: { orderId, orderNumber, newStatus, ... }

  // Update React Query cache
  queryClient.setQueryData(['orders'], (oldOrders) => [
    ...oldOrders,
    {
      id: data.orderId,
      orderNumber: data.orderNumber,
      status: data.newStatus,
      table: 'Table 5',
      items: [
        { name: 'Coffee Latte', quantity: 2, station: 'hot_drinks' }
      ],
      createdAt: new Date(),
    }
  ]);

  // Play notification sound
  playSound('/sounds/new-order.mp3');

  // Show toast
  toast({
    title: 'New Order',
    description: `${data.orderNumber} - Table 5`,
  });
});

Kitchen staff sees new order card:
┌─────────────────────────────────┐
│ 🆕 ORD-LZR8K      Table 5       │
│ ────────────────────────────────│
│ ☕ Coffee Latte (Large) × 2     │
│ Status: PENDING                 │
│ Time: 10:15 AM                  │
│                                 │
│ [Start Cooking]                 │
└─────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 6. Kitchen Workflow                                             │
└────────────────────────────────────────────────────────────────┘

Kitchen staff clicks "Start Cooking":

PATCH /api/v1/orders/order-xyz789
{ "status": "cooking" }

→ UpdateOrderStatusUseCase.execute()
→ Publishes: OrderStatusChangedEvent(order-xyz789, outlet-123, 'pending', 'cooking')
→ KdsGateway emits: order:status_changed
→ KDS Display updates: PENDING → COOKING ⏳

Kitchen completes order, clicks "Ready":

PATCH /api/v1/orders/order-xyz789
{ "status": "ready" }

→ Publishes: OrderStatusChangedEvent(order-xyz789, outlet-123, 'cooking', 'ready')
→ KdsGateway emits: order:status_changed + order:ready 🔔
→ KDS Display: COOKING → READY ✅
→ Cashier Terminal: Notification "Table 5 order ready"

Customer finishes, staff marks complete:

PATCH /api/v1/orders/order-xyz789
{ "status": "completed" }

→ Publishes: OrderStatusChangedEvent(order-xyz789, outlet-123, 'ready', 'completed')
→ OrderEventListener:
    * Checks other orders for table-5
    * No active orders found
    * Updates table-5: occupied → available

┌────────────────────────────────────────────────────────────────┐
│ 7. Final State                                                  │
└────────────────────────────────────────────────────────────────┘

Database state:
  ✓ Transaction: txn-abc123 (status: completed, grandTotal: 69000)
  ✓ Stock: coffee-latte (48 units, was 50)
  ✓ Ingredients: beans (960g), milk (4600ml), sugar (480g)
  ✓ Customer: loyaltyPoints (121, +1), totalSpent (569000, +69000)
  ✓ Order: order-xyz789 (status: completed)
  ✓ Table: table-5 (status: available, currentOrderId: null)
  ✓ Audit logs: 4 entries (transaction, loyalty, order created, order completed)

Frontend state:
  ✓ POS: Receipt printed, cart cleared
  ✓ KDS: Order card removed (completed)
  ✓ Table layout: Table 5 green (available)
  ✓ Manager dashboard: +69000 sales, +1 transaction

COMPLETE! Total time: ~2 seconds
```

---

## Architectural Insights

### Resilience Patterns

#### 1. Fire-and-Forget Side Effects

```typescript
// Transaction already committed before event publishing
const transaction = await this.createTransaction(input);

// These can fail without affecting transaction success
this.eventBus.publish(new TransactionCreatedEvent(transaction.id));
```

**Benefit:** Transaction completion is not blocked by side effects.

#### 2. Promise.allSettled for Parallel Operations

```typescript
await Promise.allSettled([
  this.deductIngredients(transactionId),
  this.addLoyaltyPoints(transactionId, customerId),
  this.logAuditEntry(event),
]);
// Even if one fails, others continue
```

**Benefit:** One failing operation doesn't block others.

#### 3. Idempotent Event Handlers

```typescript
// Can safely process the same event multiple times
async addLoyaltyPoints(transactionId: string, customerId: string) {
  // Check if already processed
  const existing = await this.prisma.loyaltyTransaction.findFirst({
    where: { transactionId },
  });

  if (existing) {
    this.logger.warn(`Loyalty points already added for ${transactionId}`);
    return; // Skip duplicate processing
  }

  // Process points...
}
```

**Benefit:** Safe for retry mechanisms, RabbitMQ re-delivery.

### Event Ordering

**No guaranteed ordering between listeners:**
- TransactionCreatedEvent triggers 3+ listeners simultaneously
- Listeners execute in parallel via `Promise.allSettled`
- Race conditions possible (e.g., audit log may write before loyalty points)

**Solution:** Use timestamps or sequence numbers if ordering matters.

### Scalability Considerations

**Current (monolithic):**
```
All modules in single NestJS app
→ In-process RxJS EventBus
→ Fast, low latency
```

**Future (microservices):**
```
Separate services communicate via RabbitMQ
→ EventBridgeService handles cross-service events
→ Each service has its own database
→ Eventual consistency via event sourcing
```

**Migration path:** Already built-in! Just enable RabbitMQ and split modules into services.

### Multi-Tenancy

**Data isolation:**
- All entities have `businessId` (from JWT)
- Queries always filter by `businessId`
- Outlets belong to businesses (`outlet.businessId`)

**Event propagation:**
- Events include `outletId` and `businessId`
- WebSocket rooms: `outlet:{outletId}`, `business:{businessId}`
- Only authenticated users in same business receive events

### Audit Trail Completeness

**Every operation logged:**
- `AuditLog` table captures all state changes
- Includes: entity type, entity ID, action, old/new values, performed by
- Enables compliance, debugging, rollback simulation

**Event listeners ensure logging:**
```typescript
// Every domain event has a listener that creates audit log
this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
  this.prisma.auditLog.create({
    data: { entityType: 'transaction', action: 'created', /* ... */ }
  });
});
```

---

## Summary

TiloPOS implements a **robust, scalable, event-driven architecture** with:

1. **Clear separation of concerns:** Modules own their data, communicate via events
2. **Resilience:** Side effects don't block critical paths
3. **Real-time UX:** WebSocket for instant KDS updates
4. **Eventual consistency:** Asynchronous event propagation with idempotent handlers
5. **Future-proof:** RabbitMQ bridge enables microservices migration
6. **Complete audit trail:** Every operation logged for compliance
7. **Multi-tenancy:** Secure data isolation by business

**Key workflows documented:**
- ✅ POS → Transaction → Order → KDS (end-to-end)
- ✅ Stock deduction (synchronous + asynchronous ingredients)
- ✅ Loyalty points earning with tier upgrades
- ✅ Table status management (occupy → release)
- ✅ Self-order → POS integration
- ✅ Reports data aggregation

**Integration map complete** - all modules, events, and data flows documented.
