/**
 * Promotions & Rules Engine
 * 
 * Features:
 * - BOGO (Buy One Get One)
 * - Bundle discounts
 * - Time-based promotions
 * - Customer-specific promotions
 * - Voucher/coupon codes
 * - Auto-apply at POS
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Promotion, Voucher, DiscountType, Prisma } from '@prisma/client';

// Types
export type PromotionType =
    | 'percentage_discount'
    | 'fixed_discount'
    | 'bogo'                    // Buy One Get One
    | 'bundle'                  // Bundle pricing
    | 'free_item'               // Free item with purchase
    | 'minimum_spend'           // Discount on min spend
    | 'happy_hour'              // Time-based discount
    | 'first_purchase'          // New customer discount
    | 'birthday'                // Birthday discount
    | 'loyalty_tier';           // Tier-specific discount

export interface PromotionRule {
    type: PromotionType;

    // Discount configuration
    discountType?: DiscountType;        // 'percentage' | 'fixed' | 'bogo'
    discountValue?: number;             // Amount or percentage
    maxDiscount?: number;               // Cap for percentage discounts

    // Conditions
    minPurchase?: number;               // Minimum transaction amount
    minQuantity?: number;               // Minimum quantity for BOGO
    buyQuantity?: number;               // BOGO: buy X
    getQuantity?: number;               // BOGO: get Y free

    // Product targeting
    applicableProducts?: string[];      // Specific product IDs
    applicableCategories?: string[];    // Specific category IDs
    excludeProducts?: string[];         // Excluded products

    // Time conditions
    dayOfWeek?: number[];               // 0-6 (Sunday-Saturday)
    startTime?: string;                 // HH:mm
    endTime?: string;                   // HH:mm

    // Customer conditions
    loyaltyTiers?: string[];            // Applicable tiers
    customerTypes?: string[];           // individual, company
    firstPurchaseOnly?: boolean;
    birthdayOnly?: boolean;

    // Bundle configuration
    bundleProducts?: string[];          // Products in bundle
    bundlePrice?: number;               // Fixed bundle price

    // Usage limits
    maxUsageTotal?: number;             // Total uses allowed
    maxUsagePerCustomer?: number;       // Per customer limit
}

export interface CreatePromotionDto {
    businessId: string;
    name: string;
    description?: string;
    type: PromotionType;
    rules: PromotionRule;
    startDate: Date;
    endDate?: Date;
    priority?: number;                  // Higher = applied first
    stackable?: boolean;                // Can combine with other promos
    autoApply?: boolean;                // Auto-apply at POS
}

export interface CartItem {
    productId: string;
    variantId?: string;
    categoryId?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface AppliedPromotion {
    promotionId: string;
    promotionName: string;
    type: PromotionType;
    discountAmount: number;
    appliedToItems?: string[];          // Product IDs affected
    freeItems?: CartItem[];             // Free items to add
    description: string;
}

export interface PromotionResult {
    appliedPromotions: AppliedPromotion[];
    totalDiscount: number;
    freeItems: CartItem[];
    originalTotal: number;
    finalTotal: number;
}

// ========================================
// PROMOTIONS SERVICE
// ========================================

@Injectable()
export class PromotionsService {
    constructor(private readonly prisma: PrismaService) { }

    // ========================================
    // PROMOTION CRUD
    // ========================================

    async getPromotions(businessId: string, activeOnly = true): Promise<Promotion[]> {
        const where: Prisma.PromotionWhereInput = { businessId };

        if (activeOnly) {
            const now = new Date();
            where.isActive = true;
            where.validFrom = { lte: now };
            where.validUntil = { gte: now };
        }

        return this.prisma.promotion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async getPromotionById(id: string): Promise<Promotion> {
        const promo = await this.prisma.promotion.findUnique({ where: { id } });
        if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
        return promo;
    }

    async createPromotion(data: CreatePromotionDto): Promise<Promotion> {
        return this.prisma.promotion.create({
            data: {
                businessId: data.businessId,
                name: data.name,
                description: data.description,
                discountType: data.rules.discountType ?? 'percentage',
                discountValue: data.rules.discountValue ?? 0,
                validFrom: data.startDate,
                validUntil: data.endDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                applicableTo: data.rules as unknown as Prisma.InputJsonValue,
            },
        });
    }

    async updatePromotion(id: string, data: Partial<CreatePromotionDto>): Promise<Promotion> {
        return this.prisma.promotion.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                applicableTo: data.rules as unknown as Prisma.InputJsonValue,
            },
        });
    }

    async deletePromotion(id: string): Promise<void> {
        await this.prisma.promotion.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ========================================
    // VOUCHER/COUPON MANAGEMENT
    // ========================================

    async createVoucher(
        businessId: string,
        promotionId: string,
        code: string,
        _maxUses?: number,
        _customerId?: string,
    ): Promise<Voucher> {
        return this.prisma.voucher.create({
            data: {
                businessId,
                promotionId,
                code: code.toUpperCase(),
            },
        });
    }

    async validateVoucher(code: string, businessId: string, _customerId?: string): Promise<(Voucher & { promotion: Promotion | null }) | null> {
        const voucher = await this.prisma.voucher.findFirst({
            where: {
                code: code.toUpperCase(),
                businessId,
                isActive: true,
            },
            include: { promotion: true },
        });

        if (!voucher) return null;

        // Check if already used
        if (voucher.usedAt) {
            return null;
        }

        // Check expiry
        if (voucher.expiresAt && voucher.expiresAt < new Date()) {
            return null;
        }

        // Check promotion validity
        const now = new Date();
        const promo = voucher.promotion;
        if (!promo?.isActive) return null;
        if (promo.validFrom > now) return null;
        if (promo.validUntil && promo.validUntil < now) return null;

        return voucher;
    }

    async useVoucher(id: string): Promise<void> {
        await this.prisma.voucher.update({
            where: { id },
            data: { usedAt: new Date() },
        });
    }

    // ========================================
    // RULES ENGINE - AUTO-APPLY PROMOTIONS
    // ========================================

    /**
     * Apply all eligible promotions to cart
     */
    async applyPromotions(
        businessId: string,
        items: CartItem[],
        customerId?: string,
        voucherCode?: string,
    ): Promise<PromotionResult> {
        const appliedPromotions: AppliedPromotion[] = [];
        const freeItems: CartItem[] = [];
        let totalDiscount = 0;
        const originalTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Get active promotions
        const promotions = await this.getPromotions(businessId, true);
        const now = new Date();

        // Get customer info if provided
        let customer = null;
        if (customerId) {
            customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        }

        // Apply voucher first if provided
        if (voucherCode) {
            const voucher = await this.validateVoucher(voucherCode, businessId, customerId);
            if (voucher?.promotion) {
                const result = this.evaluatePromotion(
                    voucher.promotion,
                    voucher.promotion.applicableTo as unknown as PromotionRule,
                    items,
                    customer,
                    now,
                );
                if (result) {
                    appliedPromotions.push(result);
                    totalDiscount += result.discountAmount;
                    if (result.freeItems) freeItems.push(...result.freeItems);
                    await this.useVoucher(voucher.id);
                }
            }
        }

        // Apply auto-apply promotions
        for (const promo of promotions) {
            const rules = promo.applicableTo as unknown as PromotionRule;

            // Skip if we already have a promo applied
            if (appliedPromotions.length > 0) continue;

            const result = this.evaluatePromotion(promo, rules, items, customer, now);
            if (result) {
                appliedPromotions.push(result);
                totalDiscount += result.discountAmount;
                if (result.freeItems) freeItems.push(...result.freeItems);
            }
        }

        return {
            appliedPromotions,
            totalDiscount,
            freeItems,
            originalTotal,
            finalTotal: Math.max(0, originalTotal - totalDiscount),
        };
    }

    /**
     * Evaluate single promotion against cart
     */
    private evaluatePromotion(
        promo: Promotion,
        rules: PromotionRule,
        items: CartItem[],
        customer: { loyaltyTier: string; visitCount: number; dateOfBirth?: Date | null } | null,
        now: Date,
    ): AppliedPromotion | null {
        // Check time conditions
        if (!this.checkTimeConditions(rules, now)) return null;

        // Check customer conditions
        if (!this.checkCustomerConditions(rules, customer, now)) return null;

        // Get applicable items
        const applicableItems = this.getApplicableItems(items, rules);
        if (applicableItems.length === 0 && !['minimum_spend', 'first_purchase'].includes(rules.type)) {
            return null;
        }

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Check minimum purchase
        if (rules.minPurchase && subtotal < rules.minPurchase) return null;

        // Evaluate based on type
        switch (rules.type) {
            case 'percentage_discount':
                return this.applyPercentageDiscount(promo, rules, applicableItems);

            case 'fixed_discount':
                return this.applyFixedDiscount(promo, rules, subtotal);

            case 'bogo':
                return this.applyBogo(promo, rules, applicableItems);

            case 'bundle':
                return this.applyBundle(promo, rules, items);

            case 'happy_hour':
                return this.applyPercentageDiscount(promo, rules, applicableItems);

            case 'minimum_spend':
                return this.applyFixedDiscount(promo, rules, subtotal);

            case 'first_purchase':
            case 'birthday':
            case 'loyalty_tier':
                return this.applyPercentageDiscount(promo, rules, applicableItems.length > 0 ? applicableItems : items);

            default:
                return null;
        }
    }

    private checkTimeConditions(rules: PromotionRule, now: Date): boolean {
        // Check day of week
        if (rules.dayOfWeek && rules.dayOfWeek.length > 0) {
            if (!rules.dayOfWeek.includes(now.getDay())) return false;
        }

        // Check time range
        if (rules.startTime && rules.endTime) {
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            if (currentTime < rules.startTime || currentTime > rules.endTime) return false;
        }

        return true;
    }

    private checkCustomerConditions(
        rules: PromotionRule,
        customer: { loyaltyTier: string; visitCount: number; dateOfBirth?: Date | null } | null,
        now: Date,
    ): boolean {
        // First purchase only
        if (rules.firstPurchaseOnly) {
            if (!customer || customer.visitCount > 0) return false;
        }

        // Birthday only
        if (rules.birthdayOnly) {
            if (!customer?.dateOfBirth) return false;
            const bday = new Date(customer.dateOfBirth);
            if (bday.getMonth() !== now.getMonth() || bday.getDate() !== now.getDate()) return false;
        }

        // Loyalty tier check
        if (rules.loyaltyTiers && rules.loyaltyTiers.length > 0) {
            if (!customer || !rules.loyaltyTiers.includes(customer.loyaltyTier)) return false;
        }

        return true;
    }

    private getApplicableItems(items: CartItem[], rules: PromotionRule): CartItem[] {
        return items.filter(item => {
            // Exclude check
            if (rules.excludeProducts?.includes(item.productId)) return false;

            // Include check
            if (rules.applicableProducts && rules.applicableProducts.length > 0) {
                return rules.applicableProducts.includes(item.productId);
            }
            if (rules.applicableCategories && rules.applicableCategories.length > 0) {
                return item.categoryId && rules.applicableCategories.includes(item.categoryId);
            }

            return true; // All items applicable
        });
    }

    private applyPercentageDiscount(
        promo: Promotion,
        rules: PromotionRule,
        items: CartItem[],
    ): AppliedPromotion | null {
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        let discount = subtotal * ((rules.discountValue || 0) / 100);

        // Apply max discount cap
        if (rules.maxDiscount && discount > rules.maxDiscount) {
            discount = rules.maxDiscount;
        }

        return {
            promotionId: promo.id,
            promotionName: promo.name,
            type: rules.type,
            discountAmount: discount,
            appliedToItems: items.map(i => i.productId),
            description: `${rules.discountValue}% off`,
        };
    }

    private applyFixedDiscount(
        promo: Promotion,
        rules: PromotionRule,
        _subtotal: number,
    ): AppliedPromotion | null {
        return {
            promotionId: promo.id,
            promotionName: promo.name,
            type: rules.type,
            discountAmount: rules.discountValue || 0,
            description: `Rp ${(rules.discountValue || 0).toLocaleString()} off`,
        };
    }

    private applyBogo(
        promo: Promotion,
        rules: PromotionRule,
        items: CartItem[],
    ): AppliedPromotion | null {
        const buyQty = rules.buyQuantity || 1;
        const getQty = rules.getQuantity || 1;

        // Find cheapest applicable item for free
        const applicableItems = items.filter(i => i.quantity >= buyQty);
        if (applicableItems.length === 0) return null;

        const cheapest = applicableItems.reduce((min, item) =>
            item.unitPrice < min.unitPrice ? item : min
        );

        const freeItemsCount = Math.floor(cheapest.quantity / buyQty) * getQty;
        const discount = cheapest.unitPrice * Math.min(freeItemsCount, cheapest.quantity);

        return {
            promotionId: promo.id,
            promotionName: promo.name,
            type: 'bogo',
            discountAmount: discount,
            appliedToItems: [cheapest.productId],
            description: `Buy ${buyQty} Get ${getQty} Free`,
        };
    }

    private applyBundle(
        promo: Promotion,
        rules: PromotionRule,
        items: CartItem[],
    ): AppliedPromotion | null {
        if (!rules.bundleProducts || !rules.bundlePrice) return null;

        // Check if all bundle products are present
        const presentProducts = items.map(i => i.productId);
        const hasAllBundleProducts = rules.bundleProducts.every(p => presentProducts.includes(p));

        if (!hasAllBundleProducts) return null;

        // Calculate bundle discount
        const bundleItems = items.filter(i => rules.bundleProducts!.includes(i.productId));
        const regularTotal = bundleItems.reduce((sum, i) => sum + i.subtotal, 0);
        const discount = regularTotal - rules.bundlePrice;

        if (discount <= 0) return null;

        return {
            promotionId: promo.id,
            promotionName: promo.name,
            type: 'bundle',
            discountAmount: discount,
            appliedToItems: rules.bundleProducts,
            description: `Bundle deal: Rp ${rules.bundlePrice.toLocaleString()}`,
        };
    }
}
