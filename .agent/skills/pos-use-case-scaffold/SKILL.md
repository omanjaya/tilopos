---
name: pos-use-case-scaffold
description: "Scaffolds POS business logic use cases including transactions, payments, refunds, split bills, inventory operations, KDS orders, and loyalty programs. Use when implementing POS-specific business logic."
---

# POS Use Case Scaffold

## Goal
Generate use case classes for POS business operations following the MokaPOS Clean Architecture and domain rules.

## Instructions

1. Read `Docs/02-LAYERED-ARCHITECTURE.md` for use case structure
2. Read `Docs/01-SYSTEM-DESIGN.md` for subsystem details
3. Read `.agent/rules/pos-domain.md` for business rules
4. Determine the use case type from user request

## Use Case Categories

### Transaction Use Cases
- `CreateTransactionUseCase` — Cart checkout to completed transaction
- `VoidTransactionUseCase` — Cancel/void with audit log
- `ProcessMultiPaymentUseCase` — Multiple payment methods in 1 transaction
- `ProcessPartialRefundUseCase` — Per-item refund with proportional recalculation
- `SplitBillUseCase` — Split 1 transaction into multiple (equal, by item, by amount)
- `MergeBillUseCase` — Merge multiple tables into 1 bill
- `GenerateReceiptUseCase` — Generate receipt for printing/email/SMS

### Inventory Use Cases
- `DeductStockOnSaleUseCase` — Auto-deduct product stock on transaction
- `DeductIngredientsOnSaleUseCase` — Auto-deduct ingredients based on recipe
- `AdjustStockUseCase` — Manual stock adjustment with reason
- `RequestTransferUseCase` — Inter-outlet stock transfer request
- `ApproveTransferUseCase` — Manager approval for transfer
- `ReceiveTransferUseCase` — Destination outlet receives transfer

### KDS Use Cases
- `SendToKitchenUseCase` — Route order items to kitchen stations
- `BumpOrderUseCase` — Mark order/item as completed
- `RecallOrderUseCase` — Bring back bumped order
- `UpdateCookingStatusUseCase` — Update item cooking status

### Loyalty Use Cases
- `AwardLoyaltyPointsUseCase` — Calculate & add points on transaction
- `RedeemPointsUseCase` — Use points for discount or free item
- `UpgradeLoyaltyTierUseCase` — Auto-upgrade tier based on spending

## Template: Use Case with Domain Events
```typescript
@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject('ITransactionRepository') private txRepo: ITransactionRepository,
    @Inject('IInventoryRepository') private invRepo: IInventoryRepository,
    @Inject('ILoyaltyService') private loyaltyService: ILoyaltyService,
    @Inject('IEventPublisher') private eventPublisher: IEventPublisher,
  ) {}

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    // 1. Validate items exist and have sufficient stock
    // 2. Calculate subtotal, apply discounts
    // 3. Calculate tax (PPN 11% default)
    // 4. Calculate service charge (if configured)
    // 5. Process payment(s)
    // 6. Create transaction record
    // 7. Deduct stock
    // 8. Deduct ingredients (if recipe exists)
    // 9. Award loyalty points (if customer linked)
    // 10. Publish TransactionCreatedEvent
    // 11. Return output with receipt data
  }
}
```

## Business Rules Reference
- Amount: DECIMAL(15,2), currency IDR
- Tax: PPN 11% (configurable per outlet)
- Receipt number: `{OUTLET_CODE}-{YYYYMMDD}-{SEQUENCE}`
- Refund: proportional tax & discount recalculation
- Audit log: WAJIB untuk void, refund, discount override
- Multi-tenancy: filter by business_id di semua query

## Constraints
- Use case HANYA orchestrate — business logic di Domain Entity
- Use case TIDAK boleh langsung akses database — gunakan repository interface
- Setiap use case = 1 responsibility
- Input/Output menggunakan DTO, BUKAN domain entity langsung
