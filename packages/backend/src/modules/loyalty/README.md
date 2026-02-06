# Loyalty Module

This module manages the loyalty program system including points earning, redemption, tier management, and analytics.

## Architecture

The loyalty module has been refactored into focused services following clean architecture principles:

```
loyalty/
├── types/
│   └── interfaces.ts           # TypeScript types and interfaces
├── business-rules/
│   ├── points.rules.ts         # Points calculation logic
│   ├── tier.rules.ts           # Tier evaluation logic
│   └── expiry.rules.ts         # Points expiry logic
├── repositories/
│   └── loyalty.repository.ts   # Database operations
├── services/
│   ├── points-management.service.ts  # Points operations
│   ├── tier-management.service.ts    # Tier operations
│   ├── expiry.service.ts             # Points expiry processing
│   └── analytics.service.ts          # Analytics and reporting
├── loyalty.service.ts          # Main facade service
├── loyalty.controller.ts       # REST API endpoints
├── loyalty-cron.service.ts     # Scheduled jobs
├── loyalty.module.ts           # NestJS module
└── index.ts                    # Public exports
```

## Services

### 1. LoyaltyService (Facade)

Main service that delegates to specialized services. Use this for most operations to maintain backward compatibility.

**Location:** `loyalty.service.ts` (145 lines)

**Responsibilities:**
- Delegates to specialized services
- Maintains backward compatibility
- Single entry point for external modules

### 2. PointsManagementService

Handles all points-related operations.

**Location:** `services/points-management.service.ts` (198 lines)

**Key Methods:**
- `earnPoints()` - Earn points from a transaction
- `redeemPoints()` - Redeem points for discount
- `adjustPoints()` - Manual points adjustment (admin)
- `calculatePotentialPoints()` - Preview points calculation
- `calculateRedemptionValue()` - Calculate discount from points

### 3. TierManagementService

Manages loyalty tiers and customer tier status.

**Location:** `services/tier-management.service.ts` (159 lines)

**Key Methods:**
- `getTiers()` - List all tiers
- `createTier()` - Create new tier
- `updateTier()` - Update tier configuration
- `deleteTier()` - Soft delete tier
- `checkAndUpgradeTiers()` - Evaluate all customers' tiers
- `getCustomerLoyaltyInfo()` - Get customer's loyalty status

### 4. ExpiryService

Handles points expiration processing.

**Location:** `services/expiry.service.ts` (119 lines)

**Key Methods:**
- `processExpiredPoints()` - Process expired points for a business

### 5. AnalyticsService

Provides loyalty program analytics and reporting.

**Location:** `services/analytics.service.ts` (180 lines)

**Key Methods:**
- `getLoyaltyAnalytics()` - Overall program analytics
- `getTopCustomers()` - Top customers by points
- `getCustomersByTier()` - Customers in a specific tier
- `getTransactionSummary()` - Transaction statistics

## Business Rules

Business logic is extracted into separate rule classes:

### PointsRules

**Location:** `business-rules/points.rules.ts` (100 lines)

**Static Methods:**
- `calculateEarnedPoints()` - Calculate points from transaction amount
- `calculateRedemptionValue()` - Calculate discount from points
- `validateRedemption()` - Validate redemption request
- `calculateNewBalance()` - Calculate balance after operations

### TierRules

**Location:** `business-rules/tier.rules.ts` (124 lines)

**Static Methods:**
- `findEligibleTier()` - Find highest tier customer qualifies for
- `findNextTier()` - Find next tier above customer's points
- `evaluateTierChange()` - Check if tier upgrade/downgrade needed
- `calculatePointsToNextTier()` - Calculate points needed for next tier

### ExpiryRules

**Location:** `business-rules/expiry.rules.ts` (97 lines)

**Static Methods:**
- `calculateExpiryDate()` - Calculate when points will expire
- `shouldExpire()` - Check if points should be expired
- `hasExpiryEnabled()` - Check if program has expiry enabled
- `groupExpiryByCustomer()` - Group expired transactions by customer

## Repository

### LoyaltyRepository

**Location:** `repositories/loyalty.repository.ts` (188 lines)

**Responsibilities:**
- All database operations via Prisma
- Program CRUD
- Tier CRUD
- Transaction CRUD
- Customer points updates

## Types

All TypeScript interfaces are centralized in `types/interfaces.ts` (86 lines):

- `LoyaltyConfig` - Program configuration
- `TierConfig` - Tier configuration
- `EarnPointsResult` - Points earning result
- `RedeemPointsResult` - Points redemption result
- `CustomerLoyaltyInfo` - Customer loyalty status
- `ILoyaltyRepository` - Repository interface

## Usage Examples

### Earn Points

```typescript
import { LoyaltyService } from './modules/loyalty';

const result = await loyaltyService.earnPoints(
  customerId,
  transactionId,
  transactionAmount,
  businessId
);

// result: { pointsEarned, multiplier, newBalance, tierName }
```

### Redeem Points

```typescript
const result = await loyaltyService.redeemPoints(
  customerId,
  pointsToRedeem,
  businessId,
  transactionId,
  employeeId
);

// result: { pointsRedeemed, discountAmount, newBalance }
```

### Get Customer Loyalty Info

```typescript
const info = await loyaltyService.getCustomerLoyaltyInfo(
  customerId,
  businessId
);

// info: { customer, currentTier, nextTier, pointsToNextTier, recentTransactions }
```

### Tier Evaluation

```typescript
const summary = await loyaltyService.checkAndUpgradeTiers(businessId);

// summary: { evaluated, upgraded, downgraded, unchanged, changes[] }
```

### Analytics

```typescript
const analytics = await loyaltyService.getLoyaltyAnalytics(businessId);

// analytics: { totalMembers, pointsOutstanding, tierDistribution, redemptionRate, ... }
```

## Testing

Each service can be tested independently:

```typescript
describe('PointsManagementService', () => {
  it('should calculate points correctly', async () => {
    const result = await pointsService.earnPoints(...);
    expect(result.pointsEarned).toBe(100);
  });
});
```

Business rules are pure functions, easy to unit test:

```typescript
describe('PointsRules', () => {
  it('should calculate earned points', () => {
    const result = PointsRules.calculateEarnedPoints(amount, program, tier);
    expect(result.totalPoints).toBe(expectedPoints);
  });
});
```

## File Size Summary

| File | Lines | Purpose |
|------|-------|---------|
| `loyalty.service.ts` | 145 | Facade service |
| `types/interfaces.ts` | 86 | Type definitions |
| `business-rules/points.rules.ts` | 100 | Points logic |
| `business-rules/tier.rules.ts` | 124 | Tier logic |
| `business-rules/expiry.rules.ts` | 97 | Expiry logic |
| `repositories/loyalty.repository.ts` | 188 | Database ops |
| `services/points-management.service.ts` | 198 | Points operations |
| `services/tier-management.service.ts` | 159 | Tier operations |
| `services/expiry.service.ts` | 119 | Expiry processing |
| `services/analytics.service.ts` | 180 | Analytics |

**Total:** ~1,396 lines (down from 789 lines in single file, but better organized)

**Average file size:** ~140 lines

All files are under 200 lines, meeting the requirement.

## Benefits of Refactoring

1. **Separation of Concerns** - Each service has a single, clear responsibility
2. **Testability** - Business rules are pure functions, easy to test
3. **Maintainability** - Smaller files are easier to understand and modify
4. **Reusability** - Rules can be reused across different services
5. **Type Safety** - Centralized type definitions ensure consistency
6. **Backward Compatibility** - Facade pattern maintains existing API

## Migration Notes

The refactored code maintains full backward compatibility. Existing code using `LoyaltyService` will continue to work without changes.

To use specialized services directly:

```typescript
// Before
import { LoyaltyService } from './modules/loyalty/loyalty.service';

// After (optional)
import { PointsManagementService } from './modules/loyalty';
import { TierManagementService } from './modules/loyalty';
```
