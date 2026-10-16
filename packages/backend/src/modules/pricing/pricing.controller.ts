import { Controller, Post, Body } from '@nestjs/common';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import {
  CalculateDynamicPriceUseCase,
  type CalculatePriceInput,
} from '../../application/use-cases/pricing/calculate-dynamic-price.use-case';
import { CalculatePriceDto, CalculateBatchPriceDto } from './dto/calculate-price.dto';

const PRICING_ROLES = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
] as const;

/**
 * Read-only price previews (POST because of the request body). Only ids are
 * taken from the client; prices/stock/segments are loaded server-side.
 */
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly calculateDynamicPrice: CalculateDynamicPriceUseCase,
    private readonly tenant: TenantAccessService,
  ) {}

  private async resolveOutlet(user: AuthUser, requested?: string): Promise<string | null> {
    const outletId = requested ?? user.outletId;
    return outletId ? this.tenant.assertOutlet(user, outletId) : null;
  }

  private async toInput(user: AuthUser, dto: CalculatePriceDto): Promise<CalculatePriceInput> {
    return {
      businessId: user.businessId,
      productId: dto.productId,
      variantId: dto.variantId,
      quantity: dto.quantity,
      outletId: await this.resolveOutlet(user, dto.outletId),
      customerId: dto.customerId,
      cartTotal: dto.cartTotal,
      cartItemCount: dto.cartItemCount,
    };
  }

  @Post('calculate')
  @Roles(...PRICING_ROLES)
  async calculate(@CurrentUser() user: AuthUser, @Body() dto: CalculatePriceDto) {
    const result = await this.calculateDynamicPrice.execute(await this.toInput(user, dto));

    return {
      success: true,
      data: {
        originalPrice: result.originalPrice.amount,
        finalPrice: result.finalPrice.amount,
        totalDiscount: result.totalDiscount.amount,
        savingsPercentage: result.savingsPercentage,
        appliedRules: result.appliedRules.map((rule) => ({
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          discountType: rule.discountType,
          discountValue: rule.discountValue,
          discountAmount: rule.discountAmount.amount,
        })),
      },
    };
  }

  @Post('calculate-batch')
  @Roles(...PRICING_ROLES)
  async calculateBatch(@CurrentUser() user: AuthUser, @Body() dto: CalculateBatchPriceDto) {
    const batch = await this.calculateDynamicPrice.executeBatch({
      businessId: user.businessId,
      items: dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      outletId: await this.resolveOutlet(user, dto.outletId),
      customerId: dto.customerId,
    });

    const results = batch.map(({ index, productId, variantId, result }) => ({
      index,
      productId,
      variantId,
      originalPrice: result.originalPrice.amount,
      finalPrice: result.finalPrice.amount,
      totalDiscount: result.totalDiscount.amount,
      savingsPercentage: result.savingsPercentage,
      appliedRules: result.appliedRules.map((rule) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        discountAmount: rule.discountAmount.amount,
      })),
    }));

    return {
      success: true,
      data: results,
    };
  }

  @Post('preview-rules')
  @Roles(...PRICING_ROLES)
  async previewRules(@CurrentUser() user: AuthUser, @Body() dto: CalculatePriceDto) {
    const rules = await this.calculateDynamicPrice.previewRules(await this.toInput(user, dto));

    return {
      success: true,
      data: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        priority: rule.priority,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        description: rule.description,
      })),
    };
  }

  @Post('potential-savings')
  @Roles(...PRICING_ROLES)
  async getPotentialSavings(@CurrentUser() user: AuthUser, @Body() dto: CalculatePriceDto) {
    const savings = await this.calculateDynamicPrice.getPotentialSavings(
      await this.toInput(user, dto),
    );

    return {
      success: true,
      data: savings.map((item) => ({
        ruleId: item.rule.id,
        ruleName: item.rule.name,
        requiredQuantity: item.requiredQuantity,
        potentialSaving: item.potentialSaving.amount,
      })),
    };
  }
}
