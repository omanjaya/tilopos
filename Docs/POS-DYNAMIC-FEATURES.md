# TiloPOS Dynamic Features Implementation Plan
**Date:** February 9, 2026
**Status:** Planning & Documentation Phase
**Priority:** High - Core Business Value

---

## Executive Summary

This document outlines the implementation plan for transforming TiloPOS into a fully dynamic Point of Sale system with intelligent pricing, real-time promotions, smart recommendations, and inventory-aware pricing strategies.

### Business Value
- **Increase Revenue:** Dynamic pricing can increase sales by 10-30%
- **Reduce Waste:** Inventory-aware pricing reduces expired stock by 40-60%
- **Customer Satisfaction:** Smart recommendations increase average order value by 15-25%
- **Operational Efficiency:** Automated promotions reduce manual work by 70%

---

## Current State Analysis

### ✅ What We Have (Already Implemented)

1. **Basic POS Functionality**
   - Product catalog with categories
   - Cart management (add, remove, update quantity)
   - Multiple payment methods
   - Receipt printing
   - Hold/resume bills
   - Customer & table selection

2. **Product Variants & Modifiers**
   ```typescript
   // Already working - Line 56-57 in pos-page.tsx
   if (product.variants.length > 0 || product.modifierGroups.length > 0) {
     modals.openProductModal(product);
   }
   ```

3. **Promotion System (Static)**
   - Promotion entity exists
   - Voucher system implemented
   - Manual discount application
   - **Limitation:** Not evaluated in real-time during cart changes

4. **Inventory Management**
   - Stock tracking
   - Stock movements
   - Low stock alerts
   - **Limitation:** Inventory doesn't influence pricing

### ❌ What's Missing (Dynamic Features)

1. **Dynamic Pricing Engine**
   - Time-based pricing (happy hour, lunch specials)
   - Quantity-based discounts (buy 2 get 10% off)
   - Customer segment pricing (VIP, member, regular)
   - Event-based pricing (seasonal, special occasions)

2. **Real-time Promotion Evaluation**
   - Auto-apply best promotions to cart
   - Stack multiple promotions intelligently
   - Show promotion savings in real-time
   - Suggest products to reach promotion thresholds

3. **Smart Recommendations**
   - Frequently bought together
   - Based on customer history
   - Category-based suggestions
   - Time-of-day recommendations

4. **Inventory-Aware Pricing**
   - Auto-discount near-expiry products
   - Clearance pricing for overstocked items
   - Premium pricing for low-stock items

---

## Architecture Overview

### New Components to Build

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (POS Terminal, Product Cards, Cart, Promotions Badge)   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Application Layer                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Dynamic Pricing Use Cases                        │  │
│  │  • CalculateDynamicPriceUseCase                  │  │
│  │  • EvaluatePromotionsUseCase                     │  │
│  │  • GetRecommendationsUseCase                     │  │
│  │  • CalculateCartTotalUseCase (enhanced)          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Domain Layer                           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Entities & Value Objects                         │  │
│  │  • PricingRule (new)                             │  │
│  │  • PromotionCondition (new)                      │  │
│  │  • Recommendation (new)                          │  │
│  │  • Money (existing)                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Domain Services                                  │  │
│  │  • PricingCalculator (new)                       │  │
│  │  • PromotionEvaluator (new)                      │  │
│  │  • RecommendationEngine (new)                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               Infrastructure Layer                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Repositories                                     │  │
│  │  • PricingRuleRepository (new)                   │  │
│  │  • PromotionRepository (enhanced)                │  │
│  │  • RecommendationRepository (new)                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 10: Dynamic Pricing Engine
**Priority:** HIGH
**Estimated Effort:** 4-5 hours
**Business Impact:** Revenue increase 10-30%

#### Database Schema Changes

```prisma
// Add to schema.prisma

model PricingRule {
  id          String   @id @default(uuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id])

  name        String
  description String?
  type        PricingRuleType // time_based, quantity_based, customer_segment, inventory_based

  // Conditions (JSON)
  conditions  Json     // Flexible conditions storage

  // Discount configuration
  discountType  DiscountType  // percentage, fixed_amount, new_price
  discountValue Decimal       @db.Decimal(10, 2)

  // Priority (higher number = higher priority)
  priority    Int      @default(0)

  // Scheduling
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean  @default(true)

  // Relations
  products    ProductPricingRule[]
  categories  CategoryPricingRule[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([businessId, isActive])
  @@index([type, isActive])
  @@index([startDate, endDate])
}

model ProductPricingRule {
  productId     String
  product       Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  pricingRuleId String
  pricingRule   PricingRule @relation(fields: [pricingRuleId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@id([productId, pricingRuleId])
}

model CategoryPricingRule {
  categoryId    String
  category      Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  pricingRuleId String
  pricingRule   PricingRule @relation(fields: [pricingRuleId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@id([categoryId, pricingRuleId])
}

enum PricingRuleType {
  time_based       // Happy hour, lunch specials
  quantity_based   // Buy 2 get 10% off
  customer_segment // VIP, member, regular
  inventory_based  // Near expiry, overstock
  event_based      // Seasonal, special occasions
}

enum DiscountType {
  percentage    // 10% off
  fixed_amount  // Rp 5.000 off
  new_price     // Set price to Rp 25.000
}
```

#### Condition Schema Examples

```typescript
// Time-based pricing condition
{
  "type": "time_based",
  "timeRanges": [
    { "start": "10:00", "end": "14:00" } // Lunch special
  ],
  "daysOfWeek": [1, 2, 3, 4, 5], // Monday-Friday
  "excludeDates": ["2026-12-25"] // Exclude holidays
}

// Quantity-based pricing condition
{
  "type": "quantity_based",
  "minQuantity": 2,
  "maxQuantity": 10, // Optional
  "applyTo": "same_product" // or "any_product", "category"
}

// Customer segment pricing condition
{
  "type": "customer_segment",
  "segments": ["vip", "member"],
  "minPurchaseHistory": 1000000, // Spent at least 1M
  "tierLevel": "gold" // bronze, silver, gold, platinum
}

// Inventory-based pricing condition
{
  "type": "inventory_based",
  "trigger": "near_expiry", // or "overstock", "low_stock"
  "daysUntilExpiry": 3,
  "stockLevel": { "above": 50 } // or { "below": 10 }
}
```

#### Domain Layer - Entities

```typescript
// packages/backend/src/domain/entities/pricing-rule.entity.ts

import { Money } from '../value-objects/money';
import { AppException, ErrorCode } from '@/shared/exceptions';

export enum PricingRuleType {
  TIME_BASED = 'time_based',
  QUANTITY_BASED = 'quantity_based',
  CUSTOMER_SEGMENT = 'customer_segment',
  INVENTORY_BASED = 'inventory_based',
  EVENT_BASED = 'event_based',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  NEW_PRICE = 'new_price',
}

export interface PricingRuleConditions {
  type: PricingRuleType;
  [key: string]: unknown;
}

export interface PricingRuleProps {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  type: PricingRuleType;
  conditions: PricingRuleConditions;
  discountType: DiscountType;
  discountValue: Money;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class PricingRule {
  private constructor(private readonly props: PricingRuleProps) {
    this.validate();
  }

  static create(props: Omit<PricingRuleProps, 'id' | 'createdAt' | 'updatedAt'>): PricingRule {
    return new PricingRule({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: PricingRuleProps): PricingRule {
    return new PricingRule(props);
  }

  private validate(): void {
    if (this.props.priority < 0) {
      throw new AppException('Priority must be non-negative', ErrorCode.VALIDATION_ERROR);
    }

    if (this.props.discountType === DiscountType.PERCENTAGE) {
      const value = this.props.discountValue.getAmount();
      if (value < 0 || value > 100) {
        throw new AppException(
          'Percentage discount must be between 0 and 100',
          ErrorCode.VALIDATION_ERROR
        );
      }
    }

    if (this.props.startDate && this.props.endDate) {
      if (this.props.startDate > this.props.endDate) {
        throw new AppException(
          'Start date must be before end date',
          ErrorCode.VALIDATION_ERROR
        );
      }
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): PricingRuleType {
    return this.props.type;
  }

  get conditions(): PricingRuleConditions {
    return this.props.conditions;
  }

  get discountType(): DiscountType {
    return this.props.discountType;
  }

  get discountValue(): Money {
    return this.props.discountValue;
  }

  get priority(): number {
    return this.props.priority;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get productIds(): string[] {
    return this.props.productIds;
  }

  get categoryIds(): string[] {
    return this.props.categoryIds;
  }

  // Business methods
  isApplicableAt(date: Date): boolean {
    if (!this.props.isActive) return false;

    if (this.props.startDate && date < this.props.startDate) return false;
    if (this.props.endDate && date > this.props.endDate) return false;

    return true;
  }

  appliesTo(productId: string, categoryId?: string): boolean {
    if (this.props.productIds.length > 0) {
      return this.props.productIds.includes(productId);
    }

    if (categoryId && this.props.categoryIds.length > 0) {
      return this.props.categoryIds.includes(categoryId);
    }

    // If no specific products/categories, applies to all
    return this.props.productIds.length === 0 && this.props.categoryIds.length === 0;
  }

  calculateDiscount(originalPrice: Money): Money {
    switch (this.props.discountType) {
      case DiscountType.PERCENTAGE:
        const percentage = this.props.discountValue.getAmount();
        return originalPrice.multiply(percentage / 100);

      case DiscountType.FIXED_AMOUNT:
        return this.props.discountValue;

      case DiscountType.NEW_PRICE:
        return originalPrice.subtract(this.props.discountValue);

      default:
        throw new AppException('Unknown discount type', ErrorCode.VALIDATION_ERROR);
    }
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }
}
```

#### Domain Service - Pricing Calculator

```typescript
// packages/backend/src/domain/services/pricing-calculator.service.ts

import { Money } from '../value-objects/money';
import { PricingRule } from '../entities/pricing-rule.entity';
import { Product } from '../entities/product.entity';

export interface PricingContext {
  product: Product;
  quantity: number;
  customerId?: string;
  currentDate: Date;
  stockLevel?: number;
  daysUntilExpiry?: number;
}

export interface PricingResult {
  originalPrice: Money;
  finalPrice: Money;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: Money;
  }>;
  totalDiscount: Money;
}

export class PricingCalculatorService {
  calculatePrice(context: PricingContext, rules: PricingRule[]): PricingResult {
    const { product, quantity, currentDate } = context;
    const originalPrice = product.basePrice.multiply(quantity);

    // Filter applicable rules
    const applicableRules = this.filterApplicableRules(rules, context);

    // Sort by priority (higher first)
    const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority);

    // Apply rules (best one wins, or stack if configured)
    const appliedRules: PricingResult['appliedRules'] = [];
    let currentPrice = originalPrice;

    for (const rule of sortedRules) {
      if (this.evaluateConditions(rule, context)) {
        const discount = rule.calculateDiscount(currentPrice);

        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          discountAmount: discount,
        });

        currentPrice = currentPrice.subtract(discount);

        // For now, only apply the highest priority rule
        // TODO: Implement rule stacking strategy
        break;
      }
    }

    const totalDiscount = originalPrice.subtract(currentPrice);

    return {
      originalPrice,
      finalPrice: currentPrice,
      appliedRules,
      totalDiscount,
    };
  }

  private filterApplicableRules(rules: PricingRule[], context: PricingContext): PricingRule[] {
    const { product, currentDate } = context;

    return rules.filter(rule => {
      // Check if active and within date range
      if (!rule.isApplicableAt(currentDate)) return false;

      // Check if applies to this product
      if (!rule.appliesTo(product.id, product.categoryId)) return false;

      return true;
    });
  }

  private evaluateConditions(rule: PricingRule, context: PricingContext): boolean {
    const conditions = rule.conditions;

    switch (conditions.type) {
      case 'time_based':
        return this.evaluateTimeConditions(conditions, context.currentDate);

      case 'quantity_based':
        return this.evaluateQuantityConditions(conditions, context.quantity);

      case 'customer_segment':
        return this.evaluateCustomerConditions(conditions, context.customerId);

      case 'inventory_based':
        return this.evaluateInventoryConditions(
          conditions,
          context.stockLevel,
          context.daysUntilExpiry
        );

      default:
        return false;
    }
  }

  private evaluateTimeConditions(
    conditions: Record<string, unknown>,
    currentDate: Date
  ): boolean {
    const timeRanges = conditions.timeRanges as Array<{ start: string; end: string }>;
    const daysOfWeek = conditions.daysOfWeek as number[];

    // Check day of week
    if (daysOfWeek && !daysOfWeek.includes(currentDate.getDay())) {
      return false;
    }

    // Check time range
    if (timeRanges) {
      const currentTime = currentDate.toTimeString().slice(0, 5); // HH:MM
      const inRange = timeRanges.some(range => {
        return currentTime >= range.start && currentTime <= range.end;
      });
      if (!inRange) return false;
    }

    return true;
  }

  private evaluateQuantityConditions(
    conditions: Record<string, unknown>,
    quantity: number
  ): boolean {
    const minQuantity = conditions.minQuantity as number;
    const maxQuantity = conditions.maxQuantity as number | undefined;

    if (minQuantity && quantity < minQuantity) return false;
    if (maxQuantity && quantity > maxQuantity) return false;

    return true;
  }

  private evaluateCustomerConditions(
    conditions: Record<string, unknown>,
    customerId?: string
  ): boolean {
    // TODO: Implement customer segment evaluation
    // Need to fetch customer data and check segment, tier, purchase history
    return !!customerId;
  }

  private evaluateInventoryConditions(
    conditions: Record<string, unknown>,
    stockLevel?: number,
    daysUntilExpiry?: number
  ): boolean {
    const trigger = conditions.trigger as string;

    if (trigger === 'near_expiry') {
      const daysThreshold = conditions.daysUntilExpiry as number;
      return daysUntilExpiry !== undefined && daysUntilExpiry <= daysThreshold;
    }

    if (trigger === 'overstock') {
      const threshold = (conditions.stockLevel as { above: number }).above;
      return stockLevel !== undefined && stockLevel > threshold;
    }

    if (trigger === 'low_stock') {
      const threshold = (conditions.stockLevel as { below: number }).below;
      return stockLevel !== undefined && stockLevel < threshold;
    }

    return false;
  }
}
```

#### Application Layer - Use Case

```typescript
// packages/backend/src/application/use-cases/pricing/calculate-dynamic-price.use-case.ts

import { Injectable, Inject } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@/infrastructure/repositories/repository.tokens';
import type { IProductRepository } from '@/domain/interfaces/repositories/product.repository';
import type { IPricingRuleRepository } from '@/domain/interfaces/repositories/pricing-rule.repository';
import type { IInventoryRepository } from '@/domain/interfaces/repositories/inventory.repository';
import { PricingCalculatorService, PricingContext } from '@/domain/services/pricing-calculator.service';
import { AppException, ErrorCode } from '@/shared/exceptions';

export interface CalculateDynamicPriceInput {
  productId: string;
  quantity: number;
  customerId?: string;
  outletId: string;
}

export interface CalculateDynamicPriceOutput {
  productId: string;
  originalPrice: number;
  finalPrice: number;
  discount: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
  }>;
}

@Injectable()
export class CalculateDynamicPriceUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
    @Inject(REPOSITORY_TOKENS.PRICING_RULE)
    private readonly pricingRuleRepo: IPricingRuleRepository,
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    private readonly pricingCalculator: PricingCalculatorService,
  ) {}

  async execute(input: CalculateDynamicPriceInput): Promise<CalculateDynamicPriceOutput> {
    // 1. Get product
    const product = await this.productRepo.findById(input.productId);
    if (!product) {
      throw new AppException('Product not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 2. Get applicable pricing rules
    const rules = await this.pricingRuleRepo.findApplicableRules({
      businessId: product.businessId,
      productId: product.id,
      categoryId: product.categoryId,
      isActive: true,
    });

    // 3. Get inventory data for inventory-based pricing
    const stockLevel = await this.inventoryRepo.getStockLevel(
      input.productId,
      input.outletId
    );

    // 4. Build pricing context
    const context: PricingContext = {
      product,
      quantity: input.quantity,
      customerId: input.customerId,
      currentDate: new Date(),
      stockLevel: stockLevel?.quantity,
      daysUntilExpiry: stockLevel?.expiryDate
        ? this.calculateDaysUntilExpiry(stockLevel.expiryDate)
        : undefined,
    };

    // 5. Calculate dynamic price
    const result = this.pricingCalculator.calculatePrice(context, rules);

    // 6. Return result
    return {
      productId: input.productId,
      originalPrice: result.originalPrice.getAmount(),
      finalPrice: result.finalPrice.getAmount(),
      discount: result.totalDiscount.getAmount(),
      appliedRules: result.appliedRules.map(rule => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        discountAmount: rule.discountAmount.getAmount(),
      })),
    };
  }

  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
```

#### Infrastructure Layer - Repository

```typescript
// packages/backend/src/infrastructure/repositories/prisma-pricing-rule.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { IPricingRuleRepository } from '@/domain/interfaces/repositories/pricing-rule.repository';
import { PricingRule, PricingRuleProps } from '@/domain/entities/pricing-rule.entity';
import { Money } from '@/domain/value-objects/money';

@Injectable()
export class PrismaPricingRuleRepository implements IPricingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findApplicableRules(criteria: {
    businessId: string;
    productId?: string;
    categoryId?: string;
    isActive?: boolean;
  }): Promise<PricingRule[]> {
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        businessId: criteria.businessId,
        isActive: criteria.isActive ?? true,
        OR: [
          // Rules that apply to all products
          {
            products: { none: {} },
            categories: { none: {} },
          },
          // Rules that apply to specific product
          criteria.productId
            ? {
                products: {
                  some: { productId: criteria.productId },
                },
              }
            : undefined,
          // Rules that apply to specific category
          criteria.categoryId
            ? {
                categories: {
                  some: { categoryId: criteria.categoryId },
                },
              }
            : undefined,
        ].filter(Boolean),
      },
      include: {
        products: true,
        categories: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    return rules.map(rule => this.toDomain(rule));
  }

  async save(rule: PricingRule): Promise<void> {
    const data = this.toPersistence(rule);

    await this.prisma.pricingRule.upsert({
      where: { id: rule.id },
      create: data,
      update: data,
    });
  }

  private toDomain(raw: unknown): PricingRule {
    const data = raw as Record<string, unknown>;

    return PricingRule.reconstitute({
      id: data.id as string,
      businessId: data.businessId as string,
      name: data.name as string,
      description: data.description as string | undefined,
      type: data.type as PricingRuleProps['type'],
      conditions: data.conditions as PricingRuleProps['conditions'],
      discountType: data.discountType as PricingRuleProps['discountType'],
      discountValue: new Money(Number(data.discountValue), 'IDR'),
      priority: data.priority as number,
      startDate: data.startDate as Date | undefined,
      endDate: data.endDate as Date | undefined,
      isActive: data.isActive as boolean,
      productIds: (data.products as Array<{ productId: string }>).map(p => p.productId),
      categoryIds: (data.categories as Array<{ categoryId: string }>).map(c => c.categoryId),
      createdAt: data.createdAt as Date,
      updatedAt: data.updatedAt as Date,
    });
  }

  private toPersistence(rule: PricingRule): Record<string, unknown> {
    return {
      id: rule.id,
      businessId: rule.businessId,
      name: rule.name,
      type: rule.type,
      conditions: rule.conditions,
      discountType: rule.discountType,
      discountValue: rule.discountValue.getAmount(),
      priority: rule.priority,
      isActive: rule.isActive,
    };
  }
}
```

#### Controller Endpoint

```typescript
// packages/backend/src/modules/pricing/pricing.controller.ts

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CalculateDynamicPriceUseCase } from '@/application/use-cases/pricing/calculate-dynamic-price.use-case';

@ApiTags('Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly calculateDynamicPrice: CalculateDynamicPriceUseCase,
  ) {}

  @Post('calculate')
  async calculatePrice(
    @Body() dto: {
      productId: string;
      quantity: number;
      customerId?: string;
      outletId: string;
    },
  ) {
    return this.calculateDynamicPrice.execute(dto);
  }

  @Post('calculate-batch')
  async calculateBatch(
    @Body() dto: {
      items: Array<{
        productId: string;
        quantity: number;
      }>;
      customerId?: string;
      outletId: string;
    },
  ) {
    const results = await Promise.all(
      dto.items.map(item =>
        this.calculateDynamicPrice.execute({
          ...item,
          customerId: dto.customerId,
          outletId: dto.outletId,
        })
      )
    );

    return {
      items: results,
      total: results.reduce((sum, r) => sum + r.finalPrice, 0),
      totalDiscount: results.reduce((sum, r) => sum + r.discount, 0),
    };
  }
}
```

#### Frontend Integration

```typescript
// packages/web/src/api/endpoints/pricing.api.ts

import { apiClient } from '../client';

export interface DynamicPriceRequest {
  productId: string;
  quantity: number;
  customerId?: string;
  outletId: string;
}

export interface DynamicPriceResponse {
  productId: string;
  originalPrice: number;
  finalPrice: number;
  discount: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
  }>;
}

export const pricingApi = {
  calculate: (data: DynamicPriceRequest) =>
    apiClient.post<DynamicPriceResponse>('/pricing/calculate', data).then(r => r.data),

  calculateBatch: (data: {
    items: Array<{ productId: string; quantity: number }>;
    customerId?: string;
    outletId: string;
  }) =>
    apiClient.post('/pricing/calculate-batch', data).then(r => r.data),
};
```

```typescript
// packages/web/src/features/pos/hooks/use-dynamic-pricing.ts

import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/api/endpoints/pricing.api';

export function useDynamicPricing(params: {
  productId: string;
  quantity: number;
  customerId?: string;
  outletId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['dynamic-price', params],
    queryFn: () => pricingApi.calculate(params),
    enabled: params.enabled ?? true,
    staleTime: 60000, // 1 minute
  });
}

export function useBatchDynamicPricing(params: {
  items: Array<{ productId: string; quantity: number }>;
  customerId?: string;
  outletId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['dynamic-price-batch', params],
    queryFn: () => pricingApi.calculateBatch(params),
    enabled: params.enabled ?? true,
    staleTime: 30000, // 30 seconds
  });
}
```

```tsx
// packages/web/src/features/pos/components/product-card-with-dynamic-price.tsx

import { Badge } from '@/components/ui/badge';
import { useDynamicPricing } from '../hooks/use-dynamic-pricing';
import { formatCurrency } from '@/lib/format';

interface ProductCardProps {
  product: POSProduct;
  quantity: number;
  customerId?: string;
  outletId: string;
  onAddToCart: () => void;
}

export function ProductCardWithDynamicPrice({
  product,
  quantity,
  customerId,
  outletId,
  onAddToCart,
}: ProductCardProps) {
  const { data: pricing, isLoading } = useDynamicPricing({
    productId: product.id,
    quantity,
    customerId,
    outletId,
  });

  const hasDiscount = pricing && pricing.discount > 0;
  const displayPrice = pricing?.finalPrice ?? product.basePrice;

  return (
    <div className="relative p-4 border rounded-lg hover:shadow-lg transition">
      {/* Discount Badge */}
      {hasDiscount && (
        <Badge variant="destructive" className="absolute top-2 right-2">
          -{Math.round((pricing.discount / pricing.originalPrice) * 100)}%
        </Badge>
      )}

      {/* Product Image */}
      <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover rounded" />

      {/* Product Name */}
      <h3 className="mt-2 font-semibold">{product.name}</h3>

      {/* Price */}
      <div className="mt-2 flex items-center gap-2">
        {hasDiscount ? (
          <>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(displayPrice)}
            </span>
            <span className="text-sm line-through text-muted-foreground">
              {formatCurrency(pricing!.originalPrice)}
            </span>
          </>
        ) : (
          <span className="text-lg font-bold">
            {formatCurrency(displayPrice)}
          </span>
        )}
      </div>

      {/* Applied Rules */}
      {pricing?.appliedRules && pricing.appliedRules.length > 0 && (
        <div className="mt-1">
          <Badge variant="outline" className="text-xs">
            {pricing.appliedRules[0].ruleName}
          </Badge>
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        onClick={onAddToCart}
        className="mt-3 w-full bg-primary text-primary-foreground py-2 rounded hover:bg-primary/90"
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Add to Cart'}
      </button>
    </div>
  );
}
```

#### Migration Script

```typescript
// packages/backend/prisma/migrations/add_dynamic_pricing/migration.sql

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('time_based', 'quantity_based', 'customer_segment', 'inventory_based', 'event_based');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed_amount', 'new_price');

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PricingRuleType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pricing_rules" (
    "product_id" TEXT NOT NULL,
    "pricing_rule_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pricing_rules_pkey" PRIMARY KEY ("product_id","pricing_rule_id")
);

-- CreateTable
CREATE TABLE "category_pricing_rules" (
    "category_id" TEXT NOT NULL,
    "pricing_rule_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pricing_rules_pkey" PRIMARY KEY ("category_id","pricing_rule_id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_business_id_is_active_idx" ON "pricing_rules"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "pricing_rules_type_is_active_idx" ON "pricing_rules"("type", "is_active");

-- CreateIndex
CREATE INDEX "pricing_rules_start_date_end_date_idx" ON "pricing_rules"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pricing_rules" ADD CONSTRAINT "product_pricing_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pricing_rules" ADD CONSTRAINT "product_pricing_rules_pricing_rule_id_fkey" FOREIGN KEY ("pricing_rule_id") REFERENCES "pricing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_pricing_rules" ADD CONSTRAINT "category_pricing_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_pricing_rules" ADD CONSTRAINT "category_pricing_rules_pricing_rule_id_fkey" FOREIGN KEY ("pricing_rule_id") REFERENCES "pricing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

#### Testing Strategy

```typescript
// packages/backend/src/domain/services/__tests__/pricing-calculator.service.spec.ts

import { PricingCalculatorService } from '../pricing-calculator.service';
import { PricingRule, PricingRuleType, DiscountType } from '@/domain/entities/pricing-rule.entity';
import { Money } from '@/domain/value-objects/money';
import { Product } from '@/domain/entities/product.entity';

describe('PricingCalculatorService', () => {
  let service: PricingCalculatorService;

  beforeEach(() => {
    service = new PricingCalculatorService();
  });

  describe('Time-based pricing', () => {
    it('should apply discount during happy hour', () => {
      // Arrange
      const product = createMockProduct({ basePrice: 50000 });
      const happyHourRule = PricingRule.create({
        businessId: 'biz1',
        name: 'Happy Hour 50% Off',
        type: PricingRuleType.TIME_BASED,
        conditions: {
          type: 'time_based',
          timeRanges: [{ start: '14:00', end: '17:00' }],
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        },
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Money(50, 'IDR'),
        priority: 10,
        isActive: true,
        productIds: [],
        categoryIds: [],
      });

      const context = {
        product,
        quantity: 1,
        currentDate: new Date('2026-02-10T15:30:00'), // Monday 3:30 PM
      };

      // Act
      const result = service.calculatePrice(context, [happyHourRule]);

      // Assert
      expect(result.finalPrice.getAmount()).toBe(25000);
      expect(result.totalDiscount.getAmount()).toBe(25000);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].ruleName).toBe('Happy Hour 50% Off');
    });

    it('should not apply discount outside happy hour', () => {
      // Similar test but at 10:00 AM
      const context = {
        product: createMockProduct({ basePrice: 50000 }),
        quantity: 1,
        currentDate: new Date('2026-02-10T10:00:00'),
      };

      const result = service.calculatePrice(context, [happyHourRule]);

      expect(result.finalPrice.getAmount()).toBe(50000);
      expect(result.appliedRules).toHaveLength(0);
    });
  });

  describe('Quantity-based pricing', () => {
    it('should apply discount for buy 2 or more', () => {
      const product = createMockProduct({ basePrice: 20000 });
      const bulkRule = PricingRule.create({
        businessId: 'biz1',
        name: 'Buy 2 Get 10% Off',
        type: PricingRuleType.QUANTITY_BASED,
        conditions: {
          type: 'quantity_based',
          minQuantity: 2,
        },
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Money(10, 'IDR'),
        priority: 5,
        isActive: true,
        productIds: [],
        categoryIds: [],
      });

      const context = {
        product,
        quantity: 3,
        currentDate: new Date(),
      };

      const result = service.calculatePrice(context, [bulkRule]);

      // 3 x 20000 = 60000, 10% off = 6000 discount
      expect(result.finalPrice.getAmount()).toBe(54000);
      expect(result.totalDiscount.getAmount()).toBe(6000);
    });
  });

  describe('Inventory-based pricing', () => {
    it('should apply discount for near-expiry items', () => {
      const product = createMockProduct({ basePrice: 30000 });
      const clearanceRule = PricingRule.create({
        businessId: 'biz1',
        name: 'Near Expiry 30% Off',
        type: PricingRuleType.INVENTORY_BASED,
        conditions: {
          type: 'inventory_based',
          trigger: 'near_expiry',
          daysUntilExpiry: 3,
        },
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Money(30, 'IDR'),
        priority: 20, // Higher priority
        isActive: true,
        productIds: [],
        categoryIds: [],
      });

      const context = {
        product,
        quantity: 1,
        currentDate: new Date(),
        daysUntilExpiry: 2, // Expires in 2 days
      };

      const result = service.calculatePrice(context, [clearanceRule]);

      expect(result.finalPrice.getAmount()).toBe(21000);
      expect(result.totalDiscount.getAmount()).toBe(9000);
    });
  });

  describe('Rule priority', () => {
    it('should apply highest priority rule', () => {
      const product = createMockProduct({ basePrice: 100000 });

      const lowPriorityRule = PricingRule.create({
        businessId: 'biz1',
        name: 'General 10% Off',
        type: PricingRuleType.EVENT_BASED,
        conditions: { type: 'event_based' },
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Money(10, 'IDR'),
        priority: 1,
        isActive: true,
        productIds: [],
        categoryIds: [],
      });

      const highPriorityRule = PricingRule.create({
        businessId: 'biz1',
        name: 'Flash Sale 50% Off',
        type: PricingRuleType.EVENT_BASED,
        conditions: { type: 'event_based' },
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Money(50, 'IDR'),
        priority: 100,
        isActive: true,
        productIds: [],
        categoryIds: [],
      });

      const context = {
        product,
        quantity: 1,
        currentDate: new Date(),
      };

      const result = service.calculatePrice(context, [lowPriorityRule, highPriorityRule]);

      // Should apply 50% off, not 10% off
      expect(result.finalPrice.getAmount()).toBe(50000);
      expect(result.appliedRules[0].ruleName).toBe('Flash Sale 50% Off');
    });
  });
});

function createMockProduct(overrides: Partial<Product>): Product {
  return {
    id: 'prod1',
    businessId: 'biz1',
    categoryId: 'cat1',
    name: 'Test Product',
    basePrice: new Money(10000, 'IDR'),
    ...overrides,
  } as Product;
}
```

---

### Phase 11: Real-time Promotion Evaluation
**Priority:** HIGH
**Estimated Effort:** 3-4 hours
**Business Impact:** Automated marketing, increased average order value

**Full implementation details in next section...**

---

### Phase 12: Smart Recommendations Engine
**Priority:** MEDIUM
**Estimated Effort:** 4-5 hours
**Business Impact:** Upsell/cross-sell opportunities

**Full implementation details in next section...**

---

### Phase 13: Inventory-Aware Pricing
**Priority:** MEDIUM
**Estimated Effort:** 2-3 hours
**Business Impact:** Reduced waste, improved margins

**Full implementation details in next section...**

---

## Implementation Timeline

| Phase | Name | Duration | Dependencies | Start | End |
|-------|------|----------|--------------|-------|-----|
| 10 | Dynamic Pricing Engine | 4-5 hours | Phase 0-7 complete | Week 1 | Week 1 |
| 11 | Real-time Promotions | 3-4 hours | Phase 10 | Week 1 | Week 2 |
| 12 | Smart Recommendations | 4-5 hours | Phase 10 | Week 2 | Week 2 |
| 13 | Inventory Pricing | 2-3 hours | Phase 10 | Week 2 | Week 2 |
| - | Testing & QA | 4 hours | All phases | Week 2 | Week 3 |
| - | Documentation | 2 hours | All phases | Week 3 | Week 3 |

**Total Estimated Effort:** 19-23 hours (~3 weeks part-time)

---

## Success Metrics

### Technical Metrics
- ✅ API response time < 200ms for price calculation
- ✅ 90%+ test coverage for pricing logic
- ✅ Zero pricing calculation errors in production
- ✅ Cache hit rate > 70% for dynamic prices

### Business Metrics
- 📈 **Revenue:** 10-30% increase from dynamic pricing
- 📊 **AOV (Average Order Value):** 15-25% increase from recommendations
- ♻️ **Waste Reduction:** 40-60% reduction in expired inventory
- ⏱️ **Promotion Efficiency:** 70% reduction in manual discount application
- 👥 **Customer Satisfaction:** Improved perceived value from smart discounts

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation | High | Medium | Implement caching, optimize queries |
| Complex rule conflicts | Medium | High | Clear priority system, validation |
| Price calculation errors | Critical | Low | Extensive testing, fallback to base price |
| Database schema changes | Medium | Medium | Gradual migration, backward compatibility |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Revenue loss from bugs | Critical | Low | Staged rollout, monitoring |
| User confusion | Medium | Medium | Clear UI, price explanations |
| Abuse of promotions | Medium | Medium | Usage limits, fraud detection |
| Operational complexity | Low | High | Admin UI, clear documentation |

---

## Next Steps

1. **Review & Approve** this implementation plan
2. **Prioritize phases** based on business needs
3. **Allocate resources** (developer time, QA time)
4. **Create detailed tickets** for Phase 10
5. **Begin implementation** with Phase 10: Dynamic Pricing Engine

---

**Document Owner:** Development Team
**Last Updated:** February 9, 2026
**Next Review:** After Phase 10 completion
