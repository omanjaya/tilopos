# Layered Architecture - TiloPOS

> **Version:** 1.0  
> **Last Updated:** January 2026  
> **Status:** Planning Phase

---

## 1. Architecture Overview

The system follows a **Clean Architecture** pattern with distinct layers, ensuring separation of concerns, testability, and maintainability.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    PRESENTATION LAYER                            │     │
│    │         (UI Components, Controllers, View Models)                │     │
│    └───────────────────────────┬─────────────────────────────────────┘     │
│                                │                                            │
│    ┌───────────────────────────▼─────────────────────────────────────┐     │
│    │                    APPLICATION LAYER                             │     │
│    │              (Use Cases, DTOs, Mappers)                          │     │
│    └───────────────────────────┬─────────────────────────────────────┘     │
│                                │                                            │
│    ┌───────────────────────────▼─────────────────────────────────────┐     │
│    │                      DOMAIN LAYER                                │     │
│    │         (Entities, Business Rules, Interfaces)                   │     │
│    └───────────────────────────┬─────────────────────────────────────┘     │
│                                │                                            │
│    ┌───────────────────────────▼─────────────────────────────────────┐     │
│    │                  INFRASTRUCTURE LAYER                            │     │
│    │       (Database, External APIs, File System, Cache)              │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Details

### 2.1 Presentation Layer

**Purpose:** Handle user interactions and display data

```
/src/presentation
├── /web                        # Web Backoffice
│   ├── /pages                  # Page components
│   ├── /layouts                # Layout templates
│   ├── /components             # Reusable UI components
│   └── /hooks                  # Custom React hooks
│
├── /pos                        # POS Terminal Application
│   ├── /screens                # Screen components
│   ├── /widgets                # POS-specific widgets
│   └── /controllers            # Screen controllers
│
├── /kds                        # Kitchen Display System
│   ├── /displays               # KDS display components
│   └── /controls               # Bump bar/touch controls
│
└── /mobile                     # Mobile Application
    ├── /screens                # Mobile screens
    ├── /navigation             # Navigation config
    └── /components             # Mobile components
```

**Key Components:**

| Component | Responsibility |
|-----------|----------------|
| **Pages/Screens** | Route-level components |
| **Components** | Reusable UI building blocks |
| **Hooks** | Stateful logic abstraction |
| **Controllers** | Bridge between UI and Use Cases |
| **View Models** | UI-specific data transformation |

---

### 2.2 Application Layer

**Purpose:** Orchestrate business operations and define use cases

```
/src/application
├── /use-cases
│   ├── /auth
│   │   ├── LoginUseCase.ts
│   │   ├── LogoutUseCase.ts
│   │   └── RefreshTokenUseCase.ts
│   │
│   ├── /pos
│   │   ├── CreateTransactionUseCase.ts
│   │   ├── ProcessPaymentUseCase.ts
│   │   ├── ApplyDiscountUseCase.ts
│   │   ├── ProcessRefundUseCase.ts
│   │   └── GenerateReceiptUseCase.ts
│   │
│   ├── /inventory
│   │   ├── CreateProductUseCase.ts
│   │   ├── UpdateStockUseCase.ts
│   │   ├── TransferStockUseCase.ts
│   │   └── AdjustInventoryUseCase.ts
│   │
│   ├── /orders
│   │   ├── CreateOrderUseCase.ts
│   │   ├── UpdateOrderStatusUseCase.ts
│   │   └── CancelOrderUseCase.ts
│   │
│   ├── /kds
│   │   ├── ReceiveOrderUseCase.ts
│   │   ├── BumpOrderUseCase.ts
│   │   └── RecallOrderUseCase.ts
│   │
│   ├── /customers
│   │   ├── CreateCustomerUseCase.ts
│   │   ├── AddLoyaltyPointsUseCase.ts
│   │   ├── RedeemPointsUseCase.ts
│   │   └── UpgradeLoyaltyTierUseCase.ts
│   │
│   ├── /employees
│   │   ├── ClockInUseCase.ts
│   │   ├── ClockOutUseCase.ts
│   │   └── StartShiftUseCase.ts
│   │
│   ├── /promotions
│   │   ├── ApplyPromoUseCase.ts
│   │   ├── ValidateVoucherUseCase.ts
│   │   └── CalculateDiscountUseCase.ts
│   │
│   ├── /tables
│   │   ├── SplitBillUseCase.ts
│   │   ├── MergeBillUseCase.ts
│   │   ├── TransferTableUseCase.ts
│   │   ├── AddToWaitingListUseCase.ts
│   │   └── SeatFromWaitingListUseCase.ts
│   │
│   ├── /billing
│   │   ├── ProcessMultiPaymentUseCase.ts
│   │   ├── ProcessPartialRefundUseCase.ts
│   │   └── IssueCreditNoteUseCase.ts
│   │
│   ├── /self-order
│   │   ├── CreateSessionUseCase.ts
│   │   ├── AddToCartUseCase.ts
│   │   ├── SubmitSelfOrderUseCase.ts
│   │   └── ProcessSelfPaymentUseCase.ts
│   │
│   ├── /online-store
│   │   ├── CreateStoreUseCase.ts
│   │   ├── SyncProductCatalogUseCase.ts
│   │   ├── ProcessStoreOrderUseCase.ts
│   │   ├── UpdateOrderStatusUseCase.ts
│   │   └── FulfillShipmentUseCase.ts
│   │
│   ├── /ingredients
│   │   ├── CreateIngredientUseCase.ts
│   │   ├── ManageRecipeUseCase.ts
│   │   ├── DeductIngredientsOnSaleUseCase.ts
│   │   └── PurchaseIngredientsUseCase.ts
│   │
│   ├── /suppliers
│   │   ├── CreateSupplierUseCase.ts
│   │   ├── CreatePurchaseOrderUseCase.ts
│   │   └── ReceivePurchaseOrderUseCase.ts
│   │
│   ├── /stock-transfers
│   │   ├── RequestTransferUseCase.ts
│   │   ├── ApproveTransferUseCase.ts
│   │   ├── ShipTransferUseCase.ts
│   │   └── ReceiveTransferUseCase.ts
│   │
│   ├── /devices
│   │   ├── RegisterDeviceUseCase.ts
│   │   ├── UnregisterDeviceUseCase.ts
│   │   └── RemoteWipeUseCase.ts
│   │
│   ├── /notifications
│   │   ├── SendNotificationUseCase.ts
│   │   ├── ConfigureAlertUseCase.ts
│   │   └── ScheduleReportUseCase.ts
│   │
│   ├── /audit
│   │   ├── LogAuditEventUseCase.ts
│   │   └── QueryAuditTrailUseCase.ts
│   │
│   ├── /settlements
│   │   ├── ReconcileSettlementUseCase.ts
│   │   └── GenerateSettlementReportUseCase.ts
│   │
│   └── /reports
│       ├── GenerateSalesReportUseCase.ts
│       ├── GenerateInventoryReportUseCase.ts
│       ├── GenerateIngredientCostReportUseCase.ts
│       ├── GenerateSettlementReportUseCase.ts
│       └── ExportReportUseCase.ts
│
├── /dtos
│   ├── TransactionDTO.ts
│   ├── ProductDTO.ts
│   ├── OrderDTO.ts
│   └── CustomerDTO.ts
│
├── /mappers
│   ├── TransactionMapper.ts
│   ├── ProductMapper.ts
│   └── CustomerMapper.ts
│
└── /services
    ├── TransactionService.ts
    ├── InventoryService.ts
    └── ReportingService.ts
```

**Use Case Pattern:**

```typescript
// Example: CreateTransactionUseCase

export interface CreateTransactionInput {
  outletId: string;
  employeeId: string;
  customerId?: string;
  items: TransactionItemInput[];
  payments: PaymentInput[];
  discounts?: DiscountInput[];
}

export interface CreateTransactionOutput {
  transactionId: string;
  receiptNumber: string;
  total: Money;
  change: Money;
  loyaltyPointsEarned?: number;
}

export class CreateTransactionUseCase {
  constructor(
    private transactionRepo: ITransactionRepository,
    private inventoryRepo: IInventoryRepository,
    private loyaltyService: ILoyaltyService,
    private receiptGenerator: IReceiptGenerator,
  ) {}

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    // 1. Validate input
    // 2. Calculate totals with discounts
    // 3. Process payment
    // 4. Deduct inventory
    // 5. Award loyalty points
    // 6. Generate receipt
    // 7. Return result
  }
}
```

---

### 2.3 Domain Layer

**Purpose:** Core business logic, entities, and rules

```
/src/domain
├── /entities
│   ├── Transaction.ts
│   ├── TransactionItem.ts
│   ├── Product.ts
│   ├── ProductVariant.ts
│   ├── Category.ts
│   ├── Modifier.ts
│   ├── Customer.ts
│   ├── Employee.ts
│   ├── Outlet.ts
│   ├── Order.ts
│   ├── OrderItem.ts
│   ├── Table.ts
│   ├── Shift.ts
│   ├── LoyaltyProgram.ts
│   ├── Promotion.ts
│   ├── Voucher.ts
│   ├── Payment.ts
│   ├── Modifier.ts
│   ├── ModifierGroup.ts
│   ├── Ingredient.ts
│   ├── Recipe.ts
│   ├── Supplier.ts
│   ├── PurchaseOrder.ts
│   ├── StockTransfer.ts
│   ├── WaitingListEntry.ts
│   ├── Device.ts
│   ├── OnlineStore.ts
│   ├── StoreOrder.ts
│   ├── OnlineOrder.ts
│   ├── SelfOrderSession.ts
│   ├── PaymentSettlement.ts
│   ├── AuditLog.ts
│   ├── Notification.ts
│   └── CreditNote.ts
│
├── /value-objects
│   ├── Money.ts
│   ├── Quantity.ts
│   ├── SKU.ts
│   ├── Email.ts
│   ├── PhoneNumber.ts
│   ├── Address.ts
│   ├── TaxRate.ts
│   ├── ReceiptNumber.ts
│   ├── SessionCode.ts
│   └── DeviceFingerprint.ts
│
├── /aggregates
│   ├── CartAggregate.ts
│   ├── OrderAggregate.ts
│   ├── ShiftAggregate.ts
│   ├── StockTransferAggregate.ts
│   ├── PurchaseOrderAggregate.ts
│   └── SelfOrderAggregate.ts
│
├── /interfaces
│   ├── repositories/
│   │   ├── ITransactionRepository.ts
│   │   ├── IProductRepository.ts
│   │   ├── ICustomerRepository.ts
│   │   ├── IOrderRepository.ts
│   │   ├── IInventoryRepository.ts
│   │   ├── IIngredientRepository.ts
│   │   ├── ISupplierRepository.ts
│   │   ├── IStockTransferRepository.ts
│   │   ├── IOnlineOrderRepository.ts
│   │   ├── IOnlineStoreRepository.ts
│   │   ├── ISelfOrderRepository.ts
│   │   ├── IDeviceRepository.ts
│   │   ├── IAuditLogRepository.ts
│   │   ├── ISettlementRepository.ts
│   │   └── IWaitingListRepository.ts
│   │
│   └── services/
│       ├── IPaymentGateway.ts
│       ├── ILoyaltyService.ts
│       ├── INotificationService.ts
│       ├── IPrinterService.ts
│       ├── IMarketplaceService.ts
│       ├── IShippingService.ts
│       ├── ISocialCommerceService.ts
│       └── IDeviceManagementService.ts
│
├── /events
│   ├── TransactionCreatedEvent.ts
│   ├── OrderStatusChangedEvent.ts
│   ├── StockLevelChangedEvent.ts
│   ├── CustomerCreatedEvent.ts
│   ├── OnlineOrderReceivedEvent.ts
│   ├── SelfOrderSubmittedEvent.ts
│   ├── StockTransferStatusChangedEvent.ts
│   ├── IngredientLowStockEvent.ts
│   ├── SettlementCompletedEvent.ts
│   ├── DeviceRegisteredEvent.ts
│   └── LoyaltyTierChangedEvent.ts
│
├── /rules
│   ├── DiscountCalculationRules.ts
│   ├── TaxCalculationRules.ts
│   ├── LoyaltyPointRules.ts
│   ├── LoyaltyTierRules.ts
│   ├── RefundPolicyRules.ts
│   ├── PartialRefundRules.ts
│   ├── SplitBillRules.ts
│   └── IngredientDeductionRules.ts
│
└── /exceptions
    ├── InsufficientStockException.ts
    ├── InsufficientIngredientException.ts
    ├── InvalidPaymentException.ts
    ├── TransactionNotFoundException.ts
    ├── UnauthorizedActionException.ts
    ├── TransferNotApprovedException.ts
    ├── DeviceNotRegisteredException.ts
    ├── SessionExpiredException.ts
    └── RefundNotAllowedException.ts
```

**Entity Example:**

```typescript
// Transaction Entity

export class Transaction {
  private readonly id: TransactionId;
  private readonly outletId: OutletId;
  private readonly employeeId: EmployeeId;
  private customerId?: CustomerId;
  private items: TransactionItem[];
  private payments: Payment[];
  private status: TransactionStatus;
  private readonly createdAt: Date;
  
  // Value Objects
  private subtotal: Money;
  private taxAmount: Money;
  private serviceCharge: Money;
  private discountAmount: Money;
  private grandTotal: Money;

  constructor(props: TransactionProps) {
    this.validate(props);
    // Initialize...
  }

  // Domain Methods
  addItem(item: TransactionItem): void {
    this.items.push(item);
    this.recalculateTotals();
  }

  removeItem(itemId: string): void {
    this.items = this.items.filter(i => i.id !== itemId);
    this.recalculateTotals();
  }

  applyDiscount(discount: Discount): void {
    // Apply discount logic with validation
  }

  processPayment(payment: Payment): PaymentResult {
    // Payment processing with validation
  }

  canRefund(): boolean {
    return this.status === TransactionStatus.COMPLETED 
      && this.isWithinRefundPeriod();
  }

  private recalculateTotals(): void {
    // Recalculate all totals
  }
}
```

---

### 2.4 Infrastructure Layer

**Purpose:** External system implementations and data persistence

```
/src/infrastructure
├── /database
│   ├── /prisma
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── /repositories
│   │   ├── PrismaTransactionRepository.ts
│   │   ├── PrismaProductRepository.ts
│   │   ├── PrismaCustomerRepository.ts
│   │   ├── PrismaOrderRepository.ts
│   │   ├── PrismaInventoryRepository.ts
│   │   ├── PrismaIngredientRepository.ts
│   │   ├── PrismaSupplierRepository.ts
│   │   ├── PrismaStockTransferRepository.ts
│   │   ├── PrismaOnlineOrderRepository.ts
│   │   ├── PrismaOnlineStoreRepository.ts
│   │   ├── PrismaSelfOrderRepository.ts
│   │   ├── PrismaDeviceRepository.ts
│   │   ├── PrismaAuditLogRepository.ts
│   │   ├── PrismaSettlementRepository.ts
│   │   └── PrismaWaitingListRepository.ts
│   │
│   └── /seeders
│       ├── ProductSeeder.ts
│       └── CategorySeeder.ts
│
├── /cache
│   ├── RedisClient.ts
│   └── CacheRepository.ts
│
├── /external
│   ├── /payment
│   │   ├── GopayAdapter.ts
│   │   ├── OvoAdapter.ts
│   │   ├── DanaAdapter.ts
│   │   ├── QrisAdapter.ts
│   │   └── PaymentGatewayFactory.ts
│   │
│   ├── /delivery
│   │   ├── GofoodAdapter.ts
│   │   ├── GrabfoodAdapter.ts
│   │   ├── ShopeefoodAdapter.ts
│   │   └── MarketplaceAdapterFactory.ts
│   │
│   ├── /social-commerce
│   │   ├── InstagramCatalogAdapter.ts
│   │   ├── FacebookShopAdapter.ts
│   │   ├── GoogleShoppingAdapter.ts
│   │   ├── ShopeeSyncAdapter.ts
│   │   ├── TokopediaSyncAdapter.ts
│   │   └── WhatsappCatalogAdapter.ts
│   │
│   ├── /shipping
│   │   ├── ShippingCalculatorService.ts
│   │   └── TrackingService.ts
│   │
│   ├── /accounting
│   │   ├── AccurateAdapter.ts
│   │   ├── JurnalAdapter.ts
│   │   └── ERPNextAdapter.ts
│   │
│   └── /notification
│       ├── WhatsappAdapter.ts
│       ├── TelegramAdapter.ts
│       ├── EmailAdapter.ts
│       ├── SmsAdapter.ts
│       └── PushNotificationAdapter.ts
│
├── /hardware
│   ├── /printer
│   │   ├── ThermalPrinterService.ts
│   │   └── ReceiptFormatter.ts
│   │
│   ├── /scanner
│   │   └── BarcodeReaderService.ts
│   │
│   └── /display
│       └── CustomerDisplayService.ts
│
├── /messaging
│   ├── RabbitMQClient.ts
│   ├── EventPublisher.ts
│   └── EventSubscriber.ts
│
├── /storage
│   ├── S3StorageService.ts
│   └── LocalStorageService.ts
│
└── /sync
    ├── OfflineSyncManager.ts
    ├── ConflictResolver.ts
    └── SyncQueue.ts
```

**Repository Implementation Example:**

```typescript
// PrismaTransactionRepository.ts

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: TransactionId): Promise<Transaction | null> {
    const data = await this.prisma.transaction.findUnique({
      where: { id: id.value },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });

    if (!data) return null;
    return TransactionMapper.toDomain(data);
  }

  async save(transaction: Transaction): Promise<void> {
    const data = TransactionMapper.toPersistence(transaction);
    
    await this.prisma.transaction.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findByDateRange(
    outletId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const data = await this.prisma.transaction.findMany({
      where: {
        outletId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(TransactionMapper.toDomain);
  }
}
```

---

## 3. Cross-Cutting Concerns

### 3.1 Shared/Common Layer

```
/src/shared
├── /constants
│   ├── PaymentMethods.ts
│   ├── OrderStatus.ts
│   ├── TransactionStatus.ts
│   └── ErrorCodes.ts
│
├── /utils
│   ├── DateUtils.ts
│   ├── MoneyUtils.ts
│   ├── ValidationUtils.ts
│   └── EncryptionUtils.ts
│
├── /errors
│   ├── AppError.ts
│   ├── ValidationError.ts
│   └── BusinessError.ts
│
├── /logging
│   ├── Logger.ts
│   └── LoggerFactory.ts
│
├── /middleware
│   ├── AuthMiddleware.ts
│   ├── ErrorHandlerMiddleware.ts
│   ├── RateLimitMiddleware.ts
│   └── LoggingMiddleware.ts
│
└── /decorators
    ├── Transactional.ts
    ├── Cacheable.ts
    └── Loggable.ts
```

---

## 4. Module Organization

### 4.1 Feature-Based Module Structure

```
/src/modules
├── /auth
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── ...
│
├── /pos
│   ├── pos.module.ts
│   ├── pos.controller.ts
│   ├── cart/
│   ├── payment/
│   └── receipt/
│
├── /inventory
│   ├── inventory.module.ts
│   ├── product/
│   ├── stock/
│   └── transfer/
│
├── /orders
│   ├── orders.module.ts
│   ├── order.controller.ts
│   └── ...
│
├── /kds
│   ├── kds.module.ts
│   ├── kds.gateway.ts (WebSocket)
│   └── ...
│
├── /tables
│   ├── tables.module.ts
│   └── ...
│
├── /customers
│   ├── customers.module.ts
│   ├── loyalty/
│   └── ...
│
├── /employees
│   ├── employees.module.ts
│   ├── shifts/
│   └── attendance/
│
├── /promotions
│   ├── promotions.module.ts
│   ├── discounts/
│   └── vouchers/
│
├── /reports
│   ├── reports.module.ts
│   └── ...
│
├── /settings
│   ├── settings.module.ts
│   ├── outlets/
│   ├── taxes/
│   └── ...
│
├── /self-order
│   ├── self-order.module.ts
│   ├── self-order.controller.ts
│   ├── sessions/
│   └── cart/
│
├── /online-store
│   ├── online-store.module.ts
│   ├── store.controller.ts
│   ├── storefront/
│   ├── store-orders/
│   └── catalog-sync/
│
├── /ingredients
│   ├── ingredients.module.ts
│   ├── recipes/
│   └── stock/
│
├── /suppliers
│   ├── suppliers.module.ts
│   └── purchase-orders/
│
├── /stock-transfers
│   ├── stock-transfers.module.ts
│   └── approval/
│
├── /devices
│   ├── devices.module.ts
│   ├── registration/
│   └── monitoring/
│
├── /notifications
│   ├── notifications.module.ts
│   ├── alerts/
│   └── preferences/
│
├── /audit
│   ├── audit.module.ts
│   └── trail/
│
├── /settlements
│   ├── settlements.module.ts
│   └── reconciliation/
│
└── /integrations
    ├── integrations.module.ts
    ├── gofood/
    ├── grabfood/
    ├── shopeefood/
    ├── social-commerce/
    └── accounting/
```

### 4.3 Key Use Case Details

#### Split Bill Use Case
```typescript
export interface SplitBillInput {
  transactionId: string;
  splitType: 'equal' | 'by_item' | 'by_amount';
  splits: {
    customerName?: string;
    itemIds?: string[];      // for by_item split
    amount?: number;         // for by_amount split
    paymentMethod: string;
  }[];
}

export class SplitBillUseCase {
  async execute(input: SplitBillInput): Promise<SplitBillOutput> {
    // 1. Validate original transaction exists & is open
    // 2. Validate split totals match grand total
    // 3. Create child transactions per split
    // 4. Process payment for each split
    // 5. Link child transactions to parent
    // 6. Close parent transaction when all splits paid
    // 7. Generate receipt per split
  }
}
```

#### Multi-Payment Use Case
```typescript
export interface MultiPaymentInput {
  transactionId: string;
  payments: {
    method: 'cash' | 'card' | 'gopay' | 'ovo' | 'qris' | 'dana' | 'shopeepay';
    amount: number;
    referenceNumber?: string;
  }[];
}

export class ProcessMultiPaymentUseCase {
  async execute(input: MultiPaymentInput): Promise<MultiPaymentOutput> {
    // 1. Validate total payments >= grand total
    // 2. Process each payment method sequentially
    // 3. If any payment fails, rollback completed payments
    // 4. Calculate change from cash portion
    // 5. Record all payment records
    // 6. Finalize transaction
    // 7. Generate receipt with all payment methods listed
  }
}
```

#### Partial Refund Use Case (Improved over competitors)
```typescript
export interface PartialRefundInput {
  transactionId: string;
  items: {
    transactionItemId: string;
    quantity: number;
    reason: 'defect' | 'wrong_order' | 'customer_request' | 'other';
  }[];
  refundMethod: 'cash' | 'original_method' | 'store_credit';
  notes?: string;
}

export class ProcessPartialRefundUseCase {
  async execute(input: PartialRefundInput): Promise<PartialRefundOutput> {
    // 1. Validate transaction is refundable (within policy period)
    // 2. Validate requested items exist in original transaction
    // 3. Calculate refund amount (item prices + proportional tax/discount)
    // 4. Process refund to selected method
    //    - Cash: immediate
    //    - Original method: initiate reversal via payment gateway
    //    - Store credit: create credit note for customer
    // 5. Add stock back for refunded items
    // 6. Reverse ingredient deductions if applicable
    // 7. Adjust loyalty points (deduct earned points proportionally)
    // 8. Create refund record linked to original transaction
    // 9. Log audit event
    // 10. Generate refund receipt
  }
}
```

#### Stock Transfer Workflow Use Case
```typescript
export class RequestTransferUseCase {
  async execute(input: TransferInput): Promise<StockTransfer> {
    // 1. Validate source outlet has sufficient stock
    // 2. Create transfer record (status: pending)
    // 3. Notify destination outlet manager
    // 4. Log audit event
  }
}

export class ApproveTransferUseCase {
  async execute(transferId: string, employeeId: string): Promise<StockTransfer> {
    // 1. Validate employee has approval permission
    // 2. Re-validate stock availability
    // 3. Update status: pending → approved
    // 4. Notify source outlet to ship
    // 5. Log audit event
  }
}

export class ReceiveTransferUseCase {
  async execute(transferId: string, receivedItems: ReceivedItem[]): Promise<StockTransfer> {
    // 1. Validate transfer is in_transit
    // 2. Compare received quantities vs sent quantities
    // 3. Deduct stock from source outlet
    // 4. Add stock to destination outlet
    // 5. Record discrepancies if any
    // 6. Update status: in_transit → received
    // 7. Create stock movement records for both outlets
    // 8. Log audit event
  }
}
```

---

## 5. Data Flow

### 5.1 Request Flow (API)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          REQUEST LIFECYCLE                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Client Request                                                           │
│       │                                                                   │
│       ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    API Gateway / Router                          │    │
│  │  • Rate limiting                                                  │    │
│  │  • Request validation                                             │    │
│  │  • Authentication check                                           │    │
│  └───────────────────────────┬─────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Controller                                   │    │
│  │  • Parse request                                                  │    │
│  │  • Create DTO                                                     │    │
│  │  • Call Use Case                                                  │    │
│  └───────────────────────────┬─────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       Use Case                                    │    │
│  │  • Business logic orchestration                                   │    │
│  │  • Call domain services                                           │    │
│  │  • Call repositories                                              │    │
│  └───────────────────────────┬─────────────────────────────────────┘    │
│                              │                                           │
│          ┌───────────────────┼───────────────────┐                      │
│          ▼                   ▼                   ▼                      │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐             │
│  │   Domain      │   │   Domain      │   │   Repository  │             │
│  │   Entity      │   │   Service     │   │               │             │
│  └───────────────┘   └───────────────┘   └───────────────┘             │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Database / Cache                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Event-Driven Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         EVENT-DRIVEN FLOW                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Transaction Created                                                      │
│       │                                                                   │
│       ▼                                                                   │
│  ┌─────────────────────┐                                                 │
│  │  Event Publisher    │                                                 │
│  │  (RabbitMQ)        │                                                 │
│  └─────────┬───────────┘                                                 │
│            │                                                              │
│            ├────────────────┬────────────────┬────────────────┐          │
│            ▼                ▼                ▼                ▼          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────┐│
│  │  Inventory      │ │  Loyalty        │ │  Analytics      │ │  KDS    ││
│  │  Service        │ │  Service        │ │  Service        │ │  Service││
│  │  (Stock Deduct) │ │  (Add Points)   │ │  (Record)       │ │  (Order)││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Dependency Injection

### 6.1 DI Container Configuration

```typescript
// app.module.ts (NestJS)

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    CacheModule,
    AuthModule,
    PosModule,
    InventoryModule,
    OrdersModule,
    KdsModule,
    CustomersModule,
    EmployeesModule,
    PromotionsModule,
    ReportsModule,
    IntegrationsModule,
    SelfOrderModule,
    OnlineStoreModule,
    IngredientsModule,
    SuppliersModule,
    StockTransfersModule,
    DevicesModule,
    NotificationsModule,
    AuditModule,
    SettlementsModule,
  ],
  providers: [
    // Global providers
    {
      provide: 'ILogger',
      useClass: WinstonLogger,
    },
    {
      provide: 'IEventPublisher',
      useClass: RabbitMQEventPublisher,
    },
  ],
})
export class AppModule {}
```

### 6.2 Repository Provider Pattern

```typescript
// pos.module.ts

@Module({
  imports: [DatabaseModule],
  controllers: [PosController],
  providers: [
    // Use Cases
    CreateTransactionUseCase,
    ProcessPaymentUseCase,
    ApplyDiscountUseCase,
    
    // Services
    TransactionService,
    PaymentService,
    ReceiptService,
    
    // Repositories (Interface Binding)
    {
      provide: 'ITransactionRepository',
      useClass: PrismaTransactionRepository,
    },
    {
      provide: 'IPaymentGateway',
      useFactory: (config: ConfigService) => {
        return new PaymentGatewayFactory(config).create();
      },
      inject: [ConfigService],
    },
  ],
  exports: [TransactionService],
})
export class PosModule {}
```

---

## 7. Testing Strategy by Layer

| Layer | Test Type | Coverage Target |
|-------|-----------|-----------------|
| **Domain** | Unit Tests | 95%+ |
| **Application** | Integration Tests | 85%+ |
| **Infrastructure** | Integration Tests | 80%+ |
| **Presentation** | E2E Tests | 70%+ |

---

> **Next Document:** [03-CLEAN-CODE-PRACTICES.md](./03-CLEAN-CODE-PRACTICES.md)
