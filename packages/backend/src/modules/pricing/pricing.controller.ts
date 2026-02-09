import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import { CalculateDynamicPriceUseCase } from '../../application/use-cases/pricing/calculate-dynamic-price.use-case';
import { CalculatePriceDto, CalculateBatchPriceDto } from './dto/calculate-price.dto';

@Controller('api/v1/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(
    private readonly calculateDynamicPrice: CalculateDynamicPriceUseCase,
  ) {}

  @Post('calculate')
  @Roles('owner', 'manager', 'supervisor', 'cashier')
  async calculate(
    @CurrentBusiness() businessId: string,
    @Body() dto: CalculatePriceDto,
  ) {
    const result = await this.calculateDynamicPrice.execute({
      businessId,
      ...dto,
    });

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
  @Roles('owner', 'manager', 'supervisor', 'cashier')
  async calculateBatch(
    @CurrentBusiness() businessId: string,
    @Body() dto: CalculateBatchPriceDto,
  ) {
    const resultsMap = await this.calculateDynamicPrice.executeBatch({
      businessId,
      ...dto,
    });

    const results = Array.from(resultsMap.entries()).map(([productId, result]) => ({
      productId,
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
  @Roles('owner', 'manager', 'supervisor', 'cashier')
  async previewRules(
    @CurrentBusiness() businessId: string,
    @Body() dto: CalculatePriceDto,
  ) {
    const rules = await this.calculateDynamicPrice.previewRules({
      businessId,
      ...dto,
    });

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
  @Roles('owner', 'manager', 'supervisor', 'cashier')
  async getPotentialSavings(
    @CurrentBusiness() businessId: string,
    @Body() dto: CalculatePriceDto,
  ) {
    const savings = await this.calculateDynamicPrice.getPotentialSavings({
      businessId,
      ...dto,
    });

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
