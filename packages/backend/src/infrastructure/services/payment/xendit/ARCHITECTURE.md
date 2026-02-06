# Xendit Gateway Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        XenditGateway                             │
│              (Main Coordinator & Entry Point)                    │
│                                                                  │
│  • Implements IPaymentGateway interface                         │
│  • Routes requests to appropriate services                      │
│  • Configuration management                                     │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├── Orchestrates ───────────────────────────────┐
             │                                               │
    ┌────────▼────────────┐                    ┌────────────▼─────────┐
    │  Payment Services   │                    │  Support Services     │
    └─────────────────────┘                    └──────────────────────┘
             │                                               │
    ┌────────┴────────────────┐                 ┌──────────┴──────────┐
    │                         │                 │                     │
┌───▼───────┐           ┌────▼────┐      ┌─────▼─────┐       ┌──────▼──────┐
│   QRIS    │           │   VA    │      │  Refund   │       │   Status    │
│  Service  │           │ Service │      │  Service  │       │   Service   │
└───────────┘           └─────────┘      └───────────┘       └─────────────┘
┌───────────┐           ┌─────────┐      ┌───────────┐       ┌─────────────┐
│  E-Wallet │           │ Invoice │      │  Webhook  │       │    Utils    │
│  Service  │           │ Service │      │  Service  │       │   Service   │
└───────────┘           └─────────┘      └───────────┘       └─────────────┘
┌───────────┐
│  Retail   │                            ┌─────────────────────────────────┐
│  Service  │                            │      Base Service (Abstract)     │
└───────────┘                            │  • HTTP client functionality     │
      │                                  │  • Error handling                │
      └──────────── All extend ──────────┤  • Authentication                │
                                         └─────────────────────────────────┘
```

## Payment Processing Flow

```
┌─────────┐
│ Request │  processPayment(input)
└────┬────┘
     │
     ▼
┌──────────────────────────┐
│   XenditGateway          │
│   1. Normalize method    │ ─────► XenditUtilsService.normalizePaymentMethod()
│   2. Validate amount     │ ─────► XenditUtilsService.validateAmount()
│   3. Generate ID         │ ─────► XenditUtilsService.generateExternalId()
└──────────┬───────────────┘
           │
           ▼
     ┌────────────┐
     │ Route to   │
     │  Service   │
     └─────┬──────┘
           │
  ┌────────┴────────────────────────┐
  │                                 │
  ▼                                 ▼
┌──────────────┐           ┌────────────────┐
│ QRIS Service │           │ Invoice Service│
│ • Create QR  │           │ • Create invoice│
│ • POST /qr   │           │ • POST /invoice│
└──────┬───────┘           └────────┬───────┘
       │                            │
       ▼                            ▼
┌──────────────────────────────────────┐
│         Xendit API                   │
└──────────────────────────────────────┘
```

## Refund Processing Flow

```
┌─────────┐
│ Request │  refundPayment(ref, amount, reason)
└────┬────┘
     │
     ▼
┌──────────────────────────┐
│   XenditGateway          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   RefundService          │
│   1. Extract type        │ ─────► extractPaymentType(ref)
│   2. Route to method     │
└──────────┬───────────────┘
           │
  ┌────────┴──────────────────┐
  │                           │
  ▼                           ▼
┌──────────────┐     ┌─────────────────┐
│ QRIS Service │     │ Invoice Service │
│ refund()     │     │ refund()        │
└──────┬───────┘     └────────┬────────┘
       │                      │
       └──────────┬───────────┘
                  │
                  ▼
       ┌────────────────────┐
       │  Xendit API        │
       │  POST /refunds     │
       └────────────────────┘
```

## Status Check Flow

```
┌─────────┐
│ Request │  checkStatus(ref)
└────┬────┘
     │
     ▼
┌──────────────────────────┐
│   XenditGateway          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   StatusService          │
│   1. Extract type        │ ─────► extractPaymentType(ref)
│   2. Route to method     │
└──────────┬───────────────┘
           │
  ┌────────┴──────────────────┐
  │                           │
  ▼                           ▼
┌──────────────┐     ┌─────────────────┐
│ QRIS Service │     │ Invoice Service │
│ getStatus()  │     │ getStatus()     │
└──────┬───────┘     └────────┬────────┘
       │                      │
       └──────────┬───────────┘
                  │
                  ▼
       ┌────────────────────┐
       │  Xendit API        │
       │  GET /payment/id   │
       └────────┬───────────┘
                │
                ▼
       ┌────────────────────┐
       │ Status Mapping     │
       │ PAID → completed   │
       │ PENDING → pending  │
       │ EXPIRED → failed   │
       └────────────────────┘
```

## Webhook Processing Flow

```
┌──────────────┐
│ Xendit API   │
│  Sends Event │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  Webhook Endpoint        │
│  POST /webhooks/xendit   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   XenditGateway          │
│   verifyWebhookSignature()│
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   WebhookService         │
│   1. Verify signature    │ ─────► HMAC SHA256
│   2. Validate payload    │
│   3. Parse payload       │
│   4. Normalize status    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Application Handler     │
│  Update payment status   │
└──────────────────────────┘
```

## Service Dependencies

```
XenditGateway
    ├─ depends on ─► XenditQRISService
    ├─ depends on ─► XenditVirtualAccountService
    ├─ depends on ─► XenditEwalletService
    ├─ depends on ─► XenditRetailService
    ├─ depends on ─► XenditInvoiceService
    ├─ depends on ─► XenditRefundService
    │                   ├─ depends on ─► XenditQRISService
    │                   ├─ depends on ─► XenditVirtualAccountService
    │                   └─ depends on ─► XenditInvoiceService
    ├─ depends on ─► XenditStatusService
    │                   ├─ depends on ─► XenditQRISService
    │                   ├─ depends on ─► XenditVirtualAccountService
    │                   ├─ depends on ─► XenditEwalletService
    │                   └─ depends on ─► XenditInvoiceService
    └─ depends on ─► XenditWebhookService

All payment services extend XenditBaseService
All services use XenditUtilsService (static methods)
```

## Data Flow

```
┌──────────────────┐
│  Configuration   │
│  • API Key       │
│  • Webhook Token │
│  • Webhook URL   │
│  • Base URL      │
└────────┬─────────┘
         │
         ▼
┌────────────────────────┐
│  XenditConfig          │
│  (injected to gateway) │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  XenditGateway         │
│  (creates services)    │
└────────┬───────────────┘
         │
         ├─► Service 1 ───► Xendit API ───► Response
         ├─► Service 2 ───► Xendit API ───► Response
         └─► Service N ───► Xendit API ───► Response
```

## Error Handling

```
┌─────────────────┐
│  Service Call   │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│  Try/Catch Block │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌───────┐
│Success│  │ Error │
└───┬───┘  └───┬───┘
    │          │
    │          ▼
    │     ┌─────────────────┐
    │     │ Base Service    │
    │     │ handleError()   │
    │     │ • Log details   │
    │     │ • Extract info  │
    │     └─────────────────┘
    │
    ▼
┌────────────────┐
│  Return Result │
│  • Success     │
│  • Failure     │
└────────────────┘
```

## Key Design Patterns

### 1. Service Layer Pattern
- Each payment method has its own service
- Services encapsulate business logic
- Clean separation of concerns

### 2. Coordinator Pattern
- Main gateway coordinates multiple services
- RefundService coordinates refund operations
- StatusService coordinates status checks

### 3. Template Method Pattern
- XenditBaseService provides template HTTP methods
- Child services implement specific payment logic

### 4. Strategy Pattern
- Different payment strategies (QRIS, VA, E-wallet, etc.)
- Runtime selection based on payment method

### 5. Factory Pattern
- XenditUtilsService generates external IDs
- Normalizes payment methods
- Creates appropriate service instances

## Security Architecture

```
┌──────────────────┐
│  External Call   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Signature Check     │
│  HMAC SHA256         │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌────────┐
│ Allow│  │ Reject │
└──────┘  └────────┘
```

## Module Integration

```
┌────────────────────────────────┐
│      PaymentModule             │
└────────┬───────────────────────┘
         │
         ├─► XenditGateway
         ├─► MidtransGateway
         └─► MockPaymentGateway
                 │
                 ▼
         ┌───────────────────┐
         │ PaymentGateway    │
         │ Factory           │
         └───────┬───────────┘
                 │
                 ▼
         ┌───────────────────┐
         │ Application Layer │
         │ • Use Cases       │
         │ • Webhooks        │
         └───────────────────┘
```

## Testing Strategy

```
┌─────────────────────────────────────┐
│          Unit Tests                 │
│  • Test each service in isolation   │
│  • Mock HTTP responses              │
│  • Test validation logic            │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       Integration Tests             │
│  • Test service coordination        │
│  • Test gateway with real services  │
│  • Test webhook verification        │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│          E2E Tests                  │
│  • Test with Xendit sandbox         │
│  • Test all payment methods         │
│  • Test complete flows              │
└─────────────────────────────────────┘
```
