# TiloPOS Dynamic Features - Phase 11-13 Implementation
**Continuation of:** POS-DYNAMIC-FEATURES.md
**Date:** February 9, 2026

---

## Phase 11: Real-time Promotion Evaluation
**Priority:** HIGH
**Estimated Effort:** 3-4 hours
**Dependencies:** Phase 10 (Dynamic Pricing Engine)
**Business Impact:** Automated marketing, 15-25% increase in average order value

### Overview

Build an intelligent promotion engine that automatically evaluates cart contents and applies the best combination of promotions in real-time. This eliminates manual discount application and ensures customers always get the best deal.

### Key Features

1. **Auto-Apply Promotions** - Evaluate cart on every change
2. **Smart Stacking** - Combine multiple promotions intelligently
3. **Threshold Suggestions** - "Add Rp 15.000 more to get free shipping"
4. **Promotion Visibility** - Show available and active promotions
5. **Usage Tracking** - Track redemptions and limits

---

### Database Schema

```prisma
// Enhance existing Promotion model
model Promotion {
  id              String    @id @default(uuid())
  businessId      String
  business        Business  @relation(fields: [businessId], references: [id])

  name            String
  description     String?
  type            PromotionType // existing

  // NEW: Enhanced condition system
  conditions      Json      // Flexible condition engine
  rewards         Json      // Reward configuration

  // Stacking rules
  canStackWith    String[]  // IDs of promotions this can stack with
  stackPriority   Int       @default(0)

  // Usage limits
  usageLimit      Int?
  usedCount       Int       @default(0)
  perCustomerLimit Int?

  // Validity
  validFrom       DateTime
  validUntil      DateTime
  isActive        Boolean   @default(true)

  // Relations
  vouchers        Voucher[]
  redemptions     PromotionRedemption[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([businessId, isActive])
  @@index([validFrom, validUntil])
}

model PromotionRedemption {
  id            String    @id @default(uuid())
  promotionId   String
  promotion     Promotion @relation(fields: [promotionId], references: [id])

  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id])

  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])

  discountAmount Decimal  @db.Decimal(10, 2)
  appliedAt     DateTime @default(now())

  @@index([promotionId])
  @@index([customerId])
  @@index([transactionId])
}
```

### Condition Schema Examples

```typescript
// Minimum purchase condition
{
  "type": "min_purchase",
  "amount": 100000,
  "includeDiscounts": false
}

// Product/category condition
{
  "type": "product_condition",
  "products": ["prod-123", "prod-456"],
  "categories": ["cat-789"],
  "quantity": { "min": 2, "max": 10 }
}

// Customer segment condition
{
  "type": "customer_condition",
  "segments": ["vip", "member"],
  "firstTimeOnly": false,
  "minTransactionCount": 5
}

// Time-based condition
{
  "type": "time_condition",
  "daysOfWeek": [1, 2, 3, 4, 5], // Mon-Fri
  "timeRanges": [{ "start": "10:00", "end": "14:00" }]
}

// Bundle condition (buy X get Y)
{
  "type": "bundle_condition",
  "buyProducts": ["prod-123"],
  "buyQuantity": 2,
  "getProducts": ["prod-456"],
  "getQuantity": 1
}
```

### Reward Schema Examples

```typescript
// Percentage discount
{
  "type": "percentage_discount",
  "value": 20,
  "maxDiscount": 50000,
  "applyTo": "all" // or "specific_products", "cheapest_item"
}

// Fixed amount discount
{
  "type": "fixed_discount",
  "value": 10000
}

// Free items
{
  "type": "free_items",
  "items": [
    { "productId": "prod-456", "quantity": 1 }
  ]
}

// Free shipping
{
  "type": "free_shipping"
}

// Points/cashback
{
  "type": "points",
  "value": 100,
  "multiplier": 2 // 2x points
}
```

---

### Domain Layer

```typescript
// packages/backend/src/domain/entities/promotion.entity.ts

export interface PromotionConditions {
  type: string;
  [key: string]: unknown;
}

export interface PromotionReward {
  type: 'percentage_discount' | 'fixed_discount' | 'free_items' | 'free_shipping' | 'points';
  [key: string]: unknown;
}

export interface CartItem {
  productId: string;
  categoryId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartContext {
  items: CartItem[];
  subtotal: number;
  customerId?: string;
  customerSegment?: string;
  transactionCount?: number;
  isFirstPurchase?: boolean;
  currentDate: Date;
}

export interface EvaluationResult {
  isEligible: boolean;
  discountAmount: number;
  reason?: string;
  thresholdRemaining?: number; // Amount needed to qualify
}

export class Promotion {
  // ... existing properties

  evaluateEligibility(context: CartContext): EvaluationResult {
    // Check validity period
    if (!this.isActiveAt(context.currentDate)) {
      return { isEligible: false, discountAmount: 0, reason: 'Promotion expired' };
    }

    // Check usage limits
    if (this.hasReachedUsageLimit()) {
      return { isEligible: false, discountAmount: 0, reason: 'Usage limit reached' };
    }

    // Evaluate conditions
    const conditionResult = this.evaluateConditions(context);
    if (!conditionResult.isEligible) {
      return conditionResult;
    }

    // Calculate reward
    const discountAmount = this.calculateReward(context);

    return {
      isEligible: true,
      discountAmount,
    };
  }

  private evaluateConditions(context: CartContext): EvaluationResult {
    const conditions = this.props.conditions as PromotionConditions;

    switch (conditions.type) {
      case 'min_purchase':
        return this.evaluateMinPurchase(conditions, context);

      case 'product_condition':
        return this.evaluateProductCondition(conditions, context);

      case 'customer_condition':
        return this.evaluateCustomerCondition(conditions, context);

      case 'time_condition':
        return this.evaluateTimeCondition(conditions, context);

      case 'bundle_condition':
        return this.evaluateBundleCondition(conditions, context);

      default:
        return { isEligible: false, discountAmount: 0, reason: 'Unknown condition type' };
    }
  }

  private evaluateMinPurchase(
    conditions: Record<string, unknown>,
    context: CartContext
  ): EvaluationResult {
    const minAmount = conditions.amount as number;
    const subtotal = context.subtotal;

    if (subtotal >= minAmount) {
      return { isEligible: true, discountAmount: 0 };
    }

    return {
      isEligible: false,
      discountAmount: 0,
      reason: 'Minimum purchase not met',
      thresholdRemaining: minAmount - subtotal,
    };
  }

  private evaluateProductCondition(
    conditions: Record<string, unknown>,
    context: CartContext
  ): EvaluationResult {
    const requiredProducts = (conditions.products as string[]) || [];
    const requiredCategories = (conditions.categories as string[]) || [];
    const quantityReq = conditions.quantity as { min?: number; max?: number } | undefined;

    // Check if cart contains required products or categories
    const matchingItems = context.items.filter(item => {
      const matchesProduct = requiredProducts.includes(item.productId);
      const matchesCategory = item.categoryId && requiredCategories.includes(item.categoryId);
      return matchesProduct || matchesCategory;
    });

    const totalQuantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);

    // Check quantity requirements
    if (quantityReq?.min && totalQuantity < quantityReq.min) {
      return {
        isEligible: false,
        discountAmount: 0,
        reason: `Need ${quantityReq.min - totalQuantity} more items`,
      };
    }

    if (quantityReq?.max && totalQuantity > quantityReq.max) {
      return {
        isEligible: false,
        discountAmount: 0,
        reason: 'Exceeded maximum quantity',
      };
    }

    return { isEligible: true, discountAmount: 0 };
  }

  private calculateReward(context: CartContext): number {
    const reward = this.props.rewards as PromotionReward;

    switch (reward.type) {
      case 'percentage_discount': {
        const percentage = reward.value as number;
        const maxDiscount = (reward.maxDiscount as number) || Infinity;
        const discount = (context.subtotal * percentage) / 100;
        return Math.min(discount, maxDiscount);
      }

      case 'fixed_discount':
        return reward.value as number;

      case 'free_shipping':
        // Assume shipping cost from context or fixed amount
        return 10000; // Example: Rp 10.000

      default:
        return 0;
    }
  }

  canStackWith(other: Promotion): boolean {
    const allowedIds = this.props.canStackWith || [];
    return allowedIds.includes(other.id) || allowedIds.length === 0;
  }
}
```

### Domain Service - Promotion Evaluator

```typescript
// packages/backend/src/domain/services/promotion-evaluator.service.ts

export interface PromotionEvaluationResult {
  promotion: Promotion;
  discountAmount: number;
  isApplied: boolean;
  reason?: string;
  thresholdRemaining?: number;
}

export interface BestCombinationResult {
  promotions: PromotionEvaluationResult[];
  totalDiscount: number;
  finalTotal: number;
  suggestions: string[]; // e.g., "Add Rp 15.000 to get free shipping"
}

export class PromotionEvaluatorService {
  evaluateAll(
    context: CartContext,
    availablePromotions: Promotion[]
  ): PromotionEvaluationResult[] {
    return availablePromotions.map(promotion => {
      const result = promotion.evaluateEligibility(context);

      return {
        promotion,
        discountAmount: result.discountAmount,
        isApplied: result.isEligible,
        reason: result.reason,
        thresholdRemaining: result.thresholdRemaining,
      };
    });
  }

  findBestCombination(
    context: CartContext,
    availablePromotions: Promotion[]
  ): BestCombinationResult {
    // Step 1: Evaluate all promotions
    const evaluations = this.evaluateAll(context, availablePromotions);

    // Step 2: Filter eligible promotions
    const eligible = evaluations.filter(e => e.isApplied);

    // Step 3: Find best stacking combination
    const bestCombo = this.findBestStack(eligible, context.subtotal);

    // Step 4: Generate suggestions for near-miss promotions
    const suggestions = this.generateSuggestions(evaluations, context);

    return {
      promotions: bestCombo.promotions,
      totalDiscount: bestCombo.totalDiscount,
      finalTotal: context.subtotal - bestCombo.totalDiscount,
      suggestions,
    };
  }

  private findBestStack(
    eligible: PromotionEvaluationResult[],
    subtotal: number
  ): {
    promotions: PromotionEvaluationResult[];
    totalDiscount: number;
  } {
    if (eligible.length === 0) {
      return { promotions: [], totalDiscount: 0 };
    }

    // Sort by stack priority and discount amount
    const sorted = [...eligible].sort((a, b) => {
      const priorityDiff = b.promotion.stackPriority - a.promotion.stackPriority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.discountAmount - a.discountAmount;
    });

    // Greedy algorithm: try to stack from highest priority
    const applied: PromotionEvaluationResult[] = [];
    let totalDiscount = 0;

    for (const current of sorted) {
      // Check if can stack with already applied
      const canStack = applied.every(a => current.promotion.canStackWith(a.promotion));

      if (canStack) {
        applied.push(current);
        totalDiscount += current.discountAmount;

        // Don't allow discount > subtotal
        if (totalDiscount >= subtotal) {
          totalDiscount = subtotal;
          break;
        }
      }
    }

    return { promotions: applied, totalDiscount };
  }

  private generateSuggestions(
    evaluations: PromotionEvaluationResult[],
    context: CartContext
  ): string[] {
    const suggestions: string[] = [];

    // Find near-miss promotions (not eligible but close)
    const nearMiss = evaluations.filter(
      e => !e.isApplied && e.thresholdRemaining !== undefined && e.thresholdRemaining > 0
    );

    for (const promo of nearMiss) {
      const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;
      suggestions.push(
        `Tambah ${formatCurrency(promo.thresholdRemaining!)} lagi untuk ${promo.promotion.name}`
      );
    }

    return suggestions;
  }
}
```

---

### Application Layer - Use Case

```typescript
// packages/backend/src/application/use-cases/promotions/evaluate-cart-promotions.use-case.ts

import { Injectable, Inject } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@/infrastructure/repositories/repository.tokens';
import type { IPromotionRepository } from '@/domain/interfaces/repositories/promotion.repository';
import { PromotionEvaluatorService, CartContext } from '@/domain/services/promotion-evaluator.service';

export interface EvaluateCartPromotionsInput {
  businessId: string;
  outletId: string;
  items: Array<{
    productId: string;
    categoryId?: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  customerId?: string;
}

export interface EvaluateCartPromotionsOutput {
  eligiblePromotions: Array<{
    id: string;
    name: string;
    description: string;
    discountAmount: number;
    isApplied: boolean;
  }>;
  totalDiscount: number;
  originalTotal: number;
  finalTotal: number;
  suggestions: string[];
}

@Injectable()
export class EvaluateCartPromotionsUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.PROMOTION)
    private readonly promotionRepo: IPromotionRepository,
    private readonly evaluator: PromotionEvaluatorService,
  ) {}

  async execute(input: EvaluateCartPromotionsInput): Promise<EvaluateCartPromotionsOutput> {
    // 1. Calculate cart totals
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 2. Fetch active promotions
    const activePromotions = await this.promotionRepo.findActive({
      businessId: input.businessId,
      currentDate: new Date(),
    });

    // 3. Build cart context
    const context: CartContext = {
      items: input.items,
      subtotal,
      customerId: input.customerId,
      currentDate: new Date(),
    };

    // 4. Evaluate promotions
    const result = this.evaluator.findBestCombination(context, activePromotions);

    // 5. Return result
    return {
      eligiblePromotions: result.promotions.map(p => ({
        id: p.promotion.id,
        name: p.promotion.name,
        description: p.promotion.description || '',
        discountAmount: p.discountAmount,
        isApplied: p.isApplied,
      })),
      totalDiscount: result.totalDiscount,
      originalTotal: subtotal,
      finalTotal: result.finalTotal,
      suggestions: result.suggestions,
    };
  }
}
```

---

### Controller Endpoint

```typescript
// packages/backend/src/modules/promotions/promotions.controller.ts

@Post('evaluate-cart')
@Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
async evaluateCart(
  @Body() dto: {
    outletId: string;
    items: Array<{
      productId: string;
      categoryId?: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    customerId?: string;
  },
  @CurrentUser() user: AuthUser,
) {
  return this.evaluateCartPromotions.execute({
    businessId: user.businessId,
    ...dto,
  });
}
```

---

### Frontend Integration

```typescript
// packages/web/src/api/endpoints/promotions.api.ts

export const promotionsApi = {
  evaluateCart: (data: {
    outletId: string;
    items: Array<{
      productId: string;
      categoryId?: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    customerId?: string;
  }) => apiClient.post('/promotions/evaluate-cart', data).then(r => r.data),
};
```

```typescript
// packages/web/src/features/pos/hooks/use-cart-promotions.ts

import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { useCartStore } from '@/stores/cart.store';

export function useCartPromotions(outletId: string) {
  const items = useCartStore(s => s.items);
  const customerId = useCartStore(s => s.customerId);

  return useQuery({
    queryKey: ['cart-promotions', outletId, items, customerId],
    queryFn: () =>
      promotionsApi.evaluateCart({
        outletId,
        items: items.map(item => ({
          productId: item.productId,
          categoryId: item.categoryId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        customerId,
      }),
    enabled: items.length > 0,
    staleTime: 10000, // 10 seconds
  });
}
```

```tsx
// packages/web/src/features/pos/components/promotions-banner.tsx

import { Badge } from '@/components/ui/badge';
import { Gift, TrendingUp } from 'lucide-react';
import { useCartPromotions } from '../hooks/use-cart-promotions';
import { formatCurrency } from '@/lib/format';

interface PromotionsBannerProps {
  outletId: string;
}

export function PromotionsBanner({ outletId }: PromotionsBannerProps) {
  const { data: promos } = useCartPromotions(outletId);

  if (!promos || (promos.eligiblePromotions.length === 0 && promos.suggestions.length === 0)) {
    return null;
  }

  const activePromos = promos.eligiblePromotions.filter(p => p.isApplied);

  return (
    <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
      {/* Active Promotions */}
      {activePromos.length > 0 && (
        <div className="flex items-start gap-2">
          <Gift className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-green-900">Promo Aktif</p>
            {activePromos.map(promo => (
              <div key={promo.id} className="flex items-center justify-between mt-1">
                <span className="text-sm text-green-800">{promo.name}</span>
                <Badge variant="outline" className="bg-green-100">
                  -{formatCurrency(promo.discountAmount)}
                </Badge>
              </div>
            ))}
            <p className="text-sm font-bold text-green-900 mt-2">
              Total Hemat: {formatCurrency(promos.totalDiscount)}
            </p>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {promos.suggestions.length > 0 && (
        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-green-200">
          <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900">Hampir dapat promo!</p>
            {promos.suggestions.map((suggestion, idx) => (
              <p key={idx} className="text-sm text-orange-800 mt-1">
                {suggestion}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 12: Smart Recommendations Engine
**Priority:** MEDIUM
**Estimated Effort:** 4-5 hours
**Dependencies:** Phase 10
**Business Impact:** 15-25% increase in average order value

### Overview

Build an intelligent recommendation engine that suggests products based on:
- Frequently bought together patterns
- Customer purchase history
- Time of day patterns
- Category-based suggestions
- Seasonal trends

### Database Schema

```prisma
model ProductRecommendation {
  id              String    @id @default(uuid())
  businessId      String
  business        Business  @relation(fields: [businessId], references: [id])

  sourceProductId String
  sourceProduct   Product   @relation("SourceProduct", fields: [sourceProductId], references: [id])

  recommendedProductId String
  recommendedProduct   Product @relation("RecommendedProduct", fields: [recommendedProductId], references: [id])

  // Metrics
  confidence      Float     // 0.0 to 1.0
  frequency       Int       @default(0) // How often bought together
  lastUpdated     DateTime  @default(now())

  // Filters
  timeOfDay       String?   // "morning", "afternoon", "evening"
  dayOfWeek       Int?      // 0-6

  @@unique([sourceProductId, recommendedProductId])
  @@index([sourceProductId, confidence])
  @@index([businessId])
}

model CustomerPreference {
  id          String    @id @default(uuid())
  customerId  String
  customer    Customer  @relation(fields: [customerId], references: [id])

  // Favorite categories
  categories  Json      // Array of { categoryId, score }

  // Favorite products
  products    Json      // Array of { productId, purchaseCount }

  // Preferences
  preferences Json      // { avgOrderValue, preferredTimeOfDay, etc }

  lastUpdated DateTime  @default(now())

  @@unique([customerId])
  @@index([customerId])
}
```

### Algorithm - Frequently Bought Together

```typescript
// packages/backend/src/domain/services/recommendation-engine.service.ts

export interface RecommendationContext {
  cartItems: Array<{ productId: string; categoryId?: string }>;
  customerId?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: number;
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  reason: string;
  confidence: number;
  imageUrl?: string;
  price: number;
}

export class RecommendationEngineService {
  async generateRecommendations(
    context: RecommendationContext,
    limit: number = 5
  ): Promise<ProductRecommendation[]> {
    const recommendations: Map<string, ProductRecommendation> = new Map();

    // Strategy 1: Frequently bought together
    const fbtRecs = await this.getFrequentlyBoughtTogether(context);
    fbtRecs.forEach(rec => recommendations.set(rec.productId, rec));

    // Strategy 2: Customer history-based
    if (context.customerId) {
      const historyRecs = await this.getCustomerHistoryRecommendations(context);
      historyRecs.forEach(rec => {
        const existing = recommendations.get(rec.productId);
        if (!existing || rec.confidence > existing.confidence) {
          recommendations.set(rec.productId, rec);
        }
      });
    }

    // Strategy 3: Category-based
    const categoryRecs = await this.getCategoryRecommendations(context);
    categoryRecs.forEach(rec => {
      if (!recommendations.has(rec.productId)) {
        recommendations.set(rec.productId, rec);
      }
    });

    // Strategy 4: Time-based
    const timeRecs = await this.getTimeBasedRecommendations(context);
    timeRecs.forEach(rec => {
      if (!recommendations.has(rec.productId)) {
        recommendations.set(rec.productId, rec);
      }
    });

    // Sort by confidence and return top N
    return Array.from(recommendations.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private async getFrequentlyBoughtTogether(
    context: RecommendationContext
  ): Promise<ProductRecommendation[]> {
    // Query ProductRecommendation table
    // Return products frequently bought with cart items
    return [];
  }

  private async getCustomerHistoryRecommendations(
    context: RecommendationContext
  ): Promise<ProductRecommendation[]> {
    // Query CustomerPreference table
    // Return favorite products not in cart
    return [];
  }

  private async getCategoryRecommendations(
    context: RecommendationContext
  ): Promise<ProductRecommendation[]> {
    // Find popular products in same categories as cart items
    return [];
  }

  private async getTimeBasedRecommendations(
    context: RecommendationContext
  ): Promise<ProductRecommendation[]> {
    // Find products popular at this time of day
    // e.g., coffee in morning, desserts in evening
    return [];
  }
}
```

### Background Job - Update Recommendations

```typescript
// packages/backend/src/infrastructure/jobs/update-recommendations.job.ts

@Injectable()
export class UpdateRecommendationsJob {
  @Cron('0 2 * * *') // Run at 2 AM daily
  async updateFrequentlyBoughtTogether() {
    // Analyze last 30 days of transactions
    // Find product pairs that appear together > N times
    // Update ProductRecommendation table with confidence scores

    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: { gte: this.get30DaysAgo() },
        status: 'completed',
      },
      include: {
        items: true,
      },
    });

    const pairs = this.findProductPairs(transactions);
    await this.updateRecommendationTable(pairs);
  }

  private findProductPairs(transactions: unknown[]): Map<string, number> {
    const pairCounts = new Map<string, number>();

    for (const tx of transactions) {
      const items = (tx as { items: Array<{ productId: string }> }).items;
      const productIds = items.map(i => i.productId);

      // Generate all pairs
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const pair = [productIds[i], productIds[j]].sort().join('|');
          pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
        }
      }
    }

    return pairCounts;
  }
}
```

---

## Phase 13: Inventory-Aware Pricing
**Priority:** MEDIUM
**Estimated Effort:** 2-3 hours
**Dependencies:** Phase 10
**Business Impact:** 40-60% waste reduction

### Overview

Automatically adjust prices based on inventory levels:
- **Near-expiry discounts** - Reduce price as expiry date approaches
- **Overstock clearance** - Clear excess inventory
- **Low-stock premium** - Increase price for scarce items (optional)

### Implementation

```typescript
// This integrates with Phase 10's PricingRule system
// Add new inventory-based pricing rules automatically

export class InventoryPricingService {
  @Cron('0 * * * *') // Every hour
  async updateInventoryPricing() {
    // 1. Find products near expiry
    const nearExpiry = await this.findNearExpiryProducts();

    // 2. Create/update pricing rules
    for (const product of nearExpiry) {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(product.expiryDate);
      const discountPercentage = this.calculateExpiryDiscount(daysUntilExpiry);

      await this.createOrUpdatePricingRule({
        productId: product.id,
        type: 'inventory_based',
        discountType: 'percentage',
        discountValue: discountPercentage,
        priority: 100, // High priority
      });
    }
  }

  private calculateExpiryDiscount(daysUntilExpiry: number): number {
    if (daysUntilExpiry <= 1) return 50; // 50% off
    if (daysUntilExpiry <= 3) return 30; // 30% off
    if (daysUntilExpiry <= 7) return 20; // 20% off
    return 0;
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('PromotionEvaluatorService', () => {
  it('should apply min purchase promotion', () => {});
  it('should stack compatible promotions', () => {});
  it('should not stack incompatible promotions', () => {});
  it('should generate threshold suggestions', () => {});
});

describe('RecommendationEngineService', () => {
  it('should recommend frequently bought together', () => {});
  it('should recommend based on customer history', () => {});
  it('should recommend time-appropriate products', () => {});
});
```

### Integration Tests
```typescript
describe('POST /promotions/evaluate-cart', () => {
  it('should return eligible promotions', async () => {
    const cart = {
      outletId: 'outlet1',
      items: [
        { productId: 'prod1', price: 50000, quantity: 2 },
      ],
    };

    const response = await request(app).post('/promotions/evaluate-cart').send(cart);

    expect(response.body).toHaveProperty('eligiblePromotions');
    expect(response.body).toHaveProperty('totalDiscount');
  });
});
```

---

## Rollout Plan

### Week 1: Phase 10 + 11
- Day 1-2: Database schema + migrations
- Day 3-4: Domain layer (entities, services)
- Day 5: Application layer (use cases)
- Day 6: Infrastructure + Controllers
- Day 7: Frontend integration + testing

### Week 2: Phase 12 + 13
- Day 1-2: Recommendations engine
- Day 3: Background jobs
- Day 4: Inventory pricing automation
- Day 5-6: Frontend components
- Day 7: Integration testing

### Week 3: QA + Launch
- Day 1-2: End-to-end testing
- Day 3: Performance testing
- Day 4: User acceptance testing
- Day 5: Documentation
- Day 6-7: Gradual rollout + monitoring

---

**Next:** Begin Phase 10 implementation with database migration
