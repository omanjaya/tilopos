# Loyalty Module Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         REST API Layer                          │
│                    (loyalty.controller.ts)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Facade Service Layer                       │
│                     (loyalty.service.ts)                        │
│                   Single entry point for all                    │
│                   loyalty operations                            │
└─────┬───────────────┬─────────────┬─────────────┬───────────────┘
      │               │             │             │
      ▼               ▼             ▼             ▼
┌───────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐
│  Points   │ │   Tier     │ │ Expiry   │ │  Analytics  │
│Management │ │Management  │ │ Service  │ │   Service   │
│  Service  │ │  Service   │ │          │ │             │
└─────┬─────┘ └─────┬──────┘ └────┬─────┘ └──────┬──────┘
      │             │              │              │
      │             │              │              │
      └─────────────┴──────────────┴──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Business Rules Layer                        │
│             (Pure functions - no dependencies)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PointsRules  │  │  TierRules   │  │ ExpiryRules  │         │
│  │              │  │              │  │              │         │
│  │ - calculate  │  │ - find tier  │  │ - calculate  │         │
│  │ - validate   │  │ - evaluate   │  │ - check      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                             │
│                 (loyalty.repository.ts)                         │
│                Database operations via Prisma                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                      │
│    loyalty_programs | loyalty_tiers | loyalty_transactions     │
└─────────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

### 1. LoyaltyService (Facade)
**Role:** Unified interface for all loyalty operations

**Dependencies:**
- PointsManagementService
- TierManagementService
- ExpiryService
- AnalyticsService

**Responsibilities:**
- Delegate requests to appropriate services
- Maintain backward compatibility
- Provide simple API for external modules

**Example:**
```typescript
// Single entry point
await loyaltyService.earnPoints(...)
await loyaltyService.redeemPoints(...)
await loyaltyService.getLoyaltyAnalytics(...)
```

### 2. PointsManagementService
**Role:** Handle all points operations

**Dependencies:**
- LoyaltyRepository
- PointsRules
- TierRules

**Operations:**
- Earn points from transactions
- Redeem points for discounts
- Manual points adjustments
- Calculate potential points
- Calculate redemption values

**Flow:**
```
Transaction → Calculate Points → Apply Multiplier → Update Balance → Check Tier
```

### 3. TierManagementService
**Role:** Manage loyalty tiers and customer status

**Dependencies:**
- LoyaltyRepository
- TierRules

**Operations:**
- CRUD operations for tiers
- Program configuration
- Tier evaluation for customers
- Customer loyalty info retrieval

**Flow:**
```
Customer Balance → Find Eligible Tier → Check Change → Update Tier → Log Transaction
```

### 4. ExpiryService
**Role:** Process expired points

**Dependencies:**
- LoyaltyRepository
- ExpiryRules
- PrismaService

**Operations:**
- Find expired transactions
- Group by customer
- Deduct expired points
- Update balances
- Create expiry transactions

**Flow:**
```
Find Old Earned Points → Calculate Expiry → Group by Customer → Deduct Points → Log
```

### 5. AnalyticsService
**Role:** Generate program analytics and reports

**Dependencies:**
- LoyaltyRepository
- PrismaService

**Operations:**
- Overall program metrics
- Tier distribution
- Transaction summaries
- Top customers
- Redemption rates

**Output:**
```typescript
{
  totalMembers: 1250,
  pointsOutstanding: 125000,
  redemptionRate: 35.5,
  tierDistribution: [...],
  topRedeemers: [...]
}
```

## Business Rules

### PointsRules (Pure Functions)
**No dependencies, pure calculations**

```typescript
// Calculate earned points
PointsRules.calculateEarnedPoints(amount, program, tier)
// → { basePoints, multiplier, totalPoints }

// Validate redemption
PointsRules.validateRedemption(points, available, program)
// → { valid, error? }

// Calculate discount
PointsRules.calculateRedemptionValue(points, program)
// → discountAmount
```

### TierRules (Pure Functions)
**No dependencies, pure tier logic**

```typescript
// Find eligible tier
TierRules.findEligibleTier(points, tiers)
// → LoyaltyTier | null

// Evaluate change
TierRules.evaluateTierChange(points, currentTier, tiers)
// → { newTier, isUpgrade, isDowngrade, isChange }

// Calculate points needed
TierRules.calculatePointsToNextTier(points, nextTier)
// → number
```

### ExpiryRules (Pure Functions)
**No dependencies, pure expiry calculations**

```typescript
// Calculate expiry date
ExpiryRules.calculateExpiryDate(earnedAt, program)
// → Date | null

// Check if expired
ExpiryRules.shouldExpire(earnedAt, expiryDate, now)
// → boolean

// Group by customer
ExpiryRules.groupExpiryByCustomer(transactions)
// → Map<customerId, { total, transactions }>
```

## Data Flow Examples

### Earning Points

```
1. Transaction completed
2. Controller → LoyaltyService.earnPoints()
3. LoyaltyService → PointsManagementService.earnPoints()
4. PointsManagementService:
   a. Get program (Repository)
   b. Get customer (Repository)
   c. Get current tier (Repository)
   d. Calculate points (PointsRules.calculateEarnedPoints)
   e. Create transaction (Repository)
   f. Calculate new balance (PointsRules.calculateNewBalance)
   g. Get tiers (Repository)
   h. Find new tier (TierRules.findEligibleTier)
   i. Update customer (Repository)
5. Return result
```

### Redeeming Points

```
1. Customer requests redemption
2. Controller → LoyaltyService.redeemPoints()
3. LoyaltyService → PointsManagementService.redeemPoints()
4. PointsManagementService:
   a. Get program (Repository)
   b. Get customer (Repository)
   c. Validate redemption (PointsRules.validateRedemption)
   d. Calculate discount (PointsRules.calculateRedemptionValue)
   e. Create transaction (Repository)
   f. Calculate new balance (PointsRules.calculateBalanceAfterRedemption)
   g. Update customer (Repository)
5. Return result
```

### Tier Evaluation

```
1. Cron job triggers or manual request
2. Controller → LoyaltyService.checkAndUpgradeTiers()
3. LoyaltyService → TierManagementService.checkAndUpgradeTiers()
4. TierManagementService:
   a. Get tiers (Repository)
   b. Sort tiers (TierRules.sortTiersByMinPoints)
   c. Get customers (Repository)
   d. For each customer:
      - Evaluate tier change (TierRules.evaluateTierChange)
      - Update if changed (Repository)
      - Log transaction (Repository)
5. Return summary
```

### Points Expiry

```
1. Cron job triggers (daily)
2. ExpiryService.processExpiredPoints()
3. ExpiryService:
   a. Get program (Repository)
   b. Check if expiry enabled (ExpiryRules.hasExpiryEnabled)
   c. Calculate threshold (ExpiryRules.calculateExpiryThreshold)
   d. Find expired transactions (PrismaService)
   e. Group by customer (ExpiryRules.groupExpiryByCustomer)
   f. For each customer:
      - Create expiry transaction (Repository)
      - Update balance (Repository)
      - Mark transactions expired (PrismaService)
4. Return result
```

### Analytics

```
1. Admin requests analytics
2. Controller → LoyaltyService.getLoyaltyAnalytics()
3. LoyaltyService → AnalyticsService.getLoyaltyAnalytics()
4. AnalyticsService:
   a. Count total members (PrismaService)
   b. Aggregate points (PrismaService)
   c. Group by tier (PrismaService)
   d. Aggregate transactions (PrismaService)
   e. Calculate metrics
   f. Get top customers (PrismaService)
5. Return analytics object
```

## Dependency Graph

```
LoyaltyService
    ├─→ PointsManagementService
    │       ├─→ LoyaltyRepository
    │       ├─→ PointsRules (pure)
    │       └─→ TierRules (pure)
    │
    ├─→ TierManagementService
    │       ├─→ LoyaltyRepository
    │       └─→ TierRules (pure)
    │
    ├─→ ExpiryService
    │       ├─→ LoyaltyRepository
    │       ├─→ PrismaService
    │       └─→ ExpiryRules (pure)
    │
    └─→ AnalyticsService
            ├─→ LoyaltyRepository
            └─→ PrismaService

LoyaltyRepository
    └─→ PrismaService
```

## Testing Strategy

### Unit Tests (Business Rules)
```typescript
describe('PointsRules', () => {
  // No mocks needed - pure functions
  test('calculate earned points with multiplier')
  test('validate redemption with insufficient points')
  test('calculate discount value')
})
```

### Unit Tests (Services)
```typescript
describe('PointsManagementService', () => {
  // Mock repository
  const mockRepository = {
    getProgram: jest.fn(),
    getCustomer: jest.fn(),
    // ...
  }

  test('earn points creates transaction')
  test('redeem points validates balance')
})
```

### Integration Tests
```typescript
describe('Loyalty Module Integration', () => {
  // Use test database
  test('complete points earning flow')
  test('tier upgrade after earning points')
  test('points expiry processing')
})
```

## Performance Considerations

### Caching Opportunities
- Program configuration (rarely changes)
- Tier list (rarely changes)
- Customer tier lookup (cache with TTL)

### Batch Operations
- Tier evaluation (process in batches)
- Points expiry (batch updates)
- Analytics (use database aggregations)

### Indexing
- Customer points (for tier queries)
- Transaction dates (for expiry queries)
- Transaction type (for analytics)

## Security

### Access Control
- Admin-only: Program config, tier management, manual adjustments
- Employee: Points earning, redemption
- Customer: View loyalty info

### Validation
- All inputs validated via DTOs
- Points calculations checked for overflow
- Balance never goes negative

### Audit Trail
- All transactions logged
- Tier changes recorded
- Manual adjustments tracked with employee ID

## Scalability

### Horizontal Scaling
- Services are stateless
- Can run multiple instances
- Database is the bottleneck (use read replicas)

### Vertical Scaling
- Business rules have minimal CPU impact
- Database queries can be optimized
- Analytics can use materialized views

## Monitoring

### Metrics to Track
- Points earned per day
- Redemption rate
- Average tier distribution
- Expiry processing time
- API response times

### Alerts
- Failed redemptions
- Expiry processing errors
- Tier evaluation failures
- Unusual point adjustments
