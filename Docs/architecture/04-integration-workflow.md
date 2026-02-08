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
