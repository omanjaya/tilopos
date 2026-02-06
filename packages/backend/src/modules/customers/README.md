# Customers Module

The Customers module provides comprehensive customer management functionality including segmentation, purchase history tracking, birthday campaigns, and bulk import/export capabilities.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Types & Interfaces](#types--interfaces)
- [Usage Examples](#usage-examples)
- [API Endpoints](#api-endpoints)

## Overview

The Customers module has been refactored to follow clean code principles with clear separation of concerns:

- **Customer Segmentation**: Automatic categorization of customers into actionable segments
- **Purchase History**: Track and retrieve customer transaction history
- **Birthday Campaigns**: Identify upcoming birthdays and send automated notifications
- **Bulk Operations**: Import/export customers via CSV or JSON
- **Loyalty Integration**: Works seamlessly with loyalty points system

## Architecture

### File Structure

```
customers/
├── customers.service.ts              # Customer management (642 lines)
│   ├── Purchase history
│   ├── Birthday tracking & notifications
│   ├── Import/export (CSV, JSON)
│   └── Data parsing & validation
│
├── customer-segments.service.ts      # Segmentation logic (285 lines)
│   ├── Segment calculation
│   ├── Customer filtering by segment
│   └── Segment summary generation
│
├── customers.types.ts                # Shared types (139 lines)
│   ├── Type definitions
│   ├── Interfaces
│   └── Constants
│
├── customers.controller.ts           # API endpoints (270 lines)
├── customers.module.ts               # NestJS module (43 lines)
└── index.ts                          # Public exports
```

### Design Principles

1. **Single Responsibility**: Each service has a focused purpose
2. **Clear Boundaries**: Segmentation logic separated from customer operations
3. **Maintainability**: Average file size < 300 lines (except main service)
4. **Type Safety**: Comprehensive TypeScript types with no `any` usage
5. **Documentation**: JSDoc comments for all public methods

## Services

### CustomersService

Main service for customer management operations.

**Responsibilities:**
- Purchase history retrieval with pagination
- Birthday tracking and notifications
- Customer import/export (CSV, JSON)
- Data parsing and validation

**Key Methods:**

```typescript
// Purchase History
getPurchaseHistory(customerId: string, limit: number, offset: number): Promise<PurchaseHistoryResult>

// Birthday Features
getUpcomingBirthdays(businessId: string, daysAhead?: number): Promise<BirthdayCustomer[]>
sendBirthdayNotifications(businessId: string, customerIds: string[]): Promise<{ notified: number }>

// Import/Export
importCustomers(businessId: string, rows: CustomerImportRow[]): Promise<CustomerImportResult>
exportCustomersCsv(businessId: string, segment?: string): Promise<string>
exportCustomersJson(businessId: string, segment?: string): Promise<string>

// Data Parsing
parseCsvToCustomerRows(csvData: string): CustomerImportRow[]
parseJsonToCustomerRows(jsonData: string): CustomerImportRow[]
```

### CustomerSegmentsService

Specialized service for customer segmentation analysis.

**Segment Types:**
- **New**: Customers created in the last 30 days
- **Returning**: Customers with 3+ transactions
- **VIP**: Top 10% by total spend
- **At-Risk**: No transaction in 60-90 days
- **Inactive**: No transaction in 90+ days

**Key Methods:**

```typescript
// Get segment summary with counts
getSegmentsSummary(businessId: string): Promise<SegmentsSummaryResult>

// Get customers in specific segment
getCustomersBySegment(businessId: string, segment: SegmentName): Promise<SegmentCustomer[]>
```

**Segmentation Logic:**

```typescript
// Time Periods (configurable in customers.types.ts)
THIRTY_DAYS = 30 days
SIXTY_DAYS = 60 days
NINETY_DAYS = 90 days

// Criteria
VIP_PERCENTILE = 0.1 (top 10%)
RETURNING_MIN_VISITS = 3
```

## Types & Interfaces

### Core Types

```typescript
// Segment identifier
type SegmentName = 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive';

// Valid loyalty tiers
const VALID_LOYALTY_TIERS = ['regular', 'silver', 'gold', 'platinum'];
```

### Interfaces

#### CustomerSegmentSummary

```typescript
interface CustomerSegmentSummary {
  segment: SegmentName;
  label: string;          // Display name
  description: string;    // Human-readable criteria
  count: number;          // Number of customers
}
```

#### SegmentCustomer

```typescript
interface SegmentCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalSpent: number;
  visitCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}
```

#### PurchaseHistoryResult

```typescript
interface PurchaseHistoryResult {
  customerId: string;
  total: number;                              // Total transaction count
  transactions: PurchaseHistoryTransaction[]; // Paginated list
}

interface PurchaseHistoryTransaction {
  id: string;
  receiptNumber: string;
  transactionType: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  createdAt: Date;
  items: PurchaseHistoryItem[];
  payments: PurchaseHistoryPayment[];
}
```

## Usage Examples

### 1. Customer Segmentation

```typescript
import { CustomerSegmentsService } from '@/modules/customers';

// Get all segments summary
const summary = await segmentsService.getSegmentsSummary(businessId);
console.log(summary);
// {
//   totalCustomers: 1500,
//   segments: [
//     { segment: 'new', label: 'New Customers', count: 150 },
//     { segment: 'vip', label: 'VIP Customers', count: 150 },
//     ...
//   ]
// }

// Get customers in VIP segment
const vipCustomers = await segmentsService.getCustomersBySegment(businessId, 'vip');
```

### 2. Purchase History

```typescript
import { CustomersService } from '@/modules/customers';

const history = await customersService.getPurchaseHistory(
  customerId,
  20,  // limit
  0    // offset
);

console.log(history);
// {
//   customerId: 'cust-123',
//   total: 45,
//   transactions: [{ id: 'tx-1', receiptNumber: 'RC-001', ... }]
// }
```

### 3. Birthday Campaigns

```typescript
// Get customers with upcoming birthdays (next 7 days)
const upcoming = await customersService.getUpcomingBirthdays(businessId, 7);

console.log(upcoming);
// [
//   {
//     customerId: 'cust-456',
//     name: 'John Doe',
//     birthday: '1990-05-15',
//     daysUntilBirthday: 2
//   }
// ]

// Send birthday notifications
const customerIds = upcoming.map(c => c.customerId);
const result = await customersService.sendBirthdayNotifications(businessId, customerIds);
// { notified: 5 }
```

### 4. Bulk Import

```typescript
// Import from CSV
const csvData = `Name,Email,Phone,Birthday,Loyalty Tier
John Doe,john@example.com,+628123456789,1990-05-15,silver
Jane Smith,jane@example.com,+628987654321,1985-10-20,gold`;

const rows = customersService.parseCsvToCustomerRows(csvData);
const result = await customersService.importCustomers(businessId, rows);

console.log(result);
// {
//   imported: 2,
//   skipped: 0,
//   failed: 0,
//   errors: []
// }
```

### 5. Export Customers

```typescript
// Export all customers as CSV
const csv = await customersService.exportCustomersCsv(businessId);

// Export VIP segment as JSON
const json = await customersService.exportCustomersJson(businessId, 'vip');
```

## API Endpoints

### Customer Segments

```http
GET /customers/segments
Authorization: Bearer {token}
Roles: OWNER, MANAGER, SUPERVISOR
```

Returns summary of all customer segments.

```http
GET /customers/segments/:segment
Authorization: Bearer {token}
Roles: OWNER, MANAGER, SUPERVISOR
```

Get customers in specific segment. Valid segments: `new`, `returning`, `vip`, `at-risk`, `inactive`.

### Purchase History

```http
GET /customers/:id/history?limit=20&offset=0
Authorization: Bearer {token}
```

Get customer purchase history with pagination.

### Birthday Features

```http
GET /customers/birthdays?daysAhead=7
Authorization: Bearer {token}
Roles: OWNER, MANAGER, SUPERVISOR
```

Get customers with upcoming birthdays.

```http
POST /customers/birthdays/notify
Authorization: Bearer {token}
Roles: OWNER, MANAGER
Content-Type: application/json

{
  "customerIds": ["cust-1", "cust-2"]
}
```

Send birthday notifications to specified customers.

### Import/Export

```http
POST /customers/import
Authorization: Bearer {token}
Roles: OWNER, MANAGER
Content-Type: application/json

{
  "format": "csv",  // or "json"
  "data": "Name,Email,Phone\nJohn,john@example.com,..."
}
```

Bulk import customers from CSV or JSON.

```http
GET /customers/export?format=csv&segment=vip
Authorization: Bearer {token}
Roles: OWNER, MANAGER
```

Export customers as CSV or JSON. Optional segment filter.

## Configuration

### Segment Criteria

Customize segment criteria in `customers.types.ts`:

```typescript
export const SEGMENT_TIME_PERIODS = {
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  SIXTY_DAYS: 60 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
} as const;

export const SEGMENT_CRITERIA = {
  VIP_PERCENTILE: 0.1,        // Top 10% by spend
  RETURNING_MIN_VISITS: 3,    // 3 or more visits
} as const;
```

### Loyalty Tiers

Valid loyalty tiers are defined in `customers.types.ts`:

```typescript
export const VALID_LOYALTY_TIERS = ['regular', 'silver', 'gold', 'platinum'] as const;
```

## Migration Notes

### For Existing Code

The refactoring maintains backward compatibility. Existing code using `CustomersService` for segmentation will continue to work:

```typescript
// This still works (delegates to CustomerSegmentsService)
const segments = await customersService.getSegmentsSummary(businessId);

// But it's recommended to use the dedicated service:
const segments = await customerSegmentsService.getSegmentsSummary(businessId);
```

### Deprecated Methods

The following methods in `CustomersService` are deprecated and delegate to `CustomerSegmentsService`:

- `getSegmentsSummary()` - Use `CustomerSegmentsService.getSegmentsSummary()` instead
- `getCustomersBySegment()` - Use `CustomerSegmentsService.getCustomersBySegment()` instead

## Testing

Run tests for the customers module:

```bash
# Unit tests
npm run test -- customers

# E2E tests
npm run test:e2e -- customers

# Coverage
npm run test:cov -- customers
```

## Performance Considerations

1. **Segment Calculation**: Computed in-memory from customer data. For very large datasets (10k+ customers), consider caching segment results.

2. **Purchase History**: Uses pagination to handle large transaction histories efficiently.

3. **Bulk Import**: Processes rows sequentially with duplicate checking. For large imports (1000+ rows), consider batch processing.

4. **Export**: Loads all matching customers into memory. For very large exports, consider streaming.

## Related Modules

- **Loyalty Module**: Earn/redeem loyalty points
- **Transactions Module**: Transaction creation and management
- **Reports Module**: Customer analytics and insights

## Support

For questions or issues with the Customers module, refer to:
- Main documentation: `/Docs/01-SYSTEM-DESIGN.md`
- API documentation: Swagger UI at `/api-docs`
- Database schema: `/Docs/05-DATABASE-SCHEMA.md`
