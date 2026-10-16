import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { AdjustLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/adjust-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';
import {
  AdjustLoyaltyPointsDto,
  EarnLoyaltyPointsDto,
  LoyaltyAnalyticsQueryDto,
  LoyaltyHistoryQueryDto,
  RedeemLoyaltyPointsDto,
} from '../../application/dtos/loyalty.dto';
import { LoyaltyCronService } from './loyalty-cron.service';
import { RequireFeature } from '../../common/guards/feature.guard';

@ApiTags('Loyalty')
@ApiBearerAuth()
@RequireFeature('customer_loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(
    private readonly earnLoyaltyPointsUseCase: EarnLoyaltyPointsUseCase,
    private readonly redeemLoyaltyPointsUseCase: RedeemLoyaltyPointsUseCase,
    private readonly adjustLoyaltyPointsUseCase: AdjustLoyaltyPointsUseCase,
    private readonly getLoyaltyBalanceUseCase: GetLoyaltyBalanceUseCase,
    private readonly getLoyaltyHistoryUseCase: GetLoyaltyHistoryUseCase,
    private readonly loyaltyCronService: LoyaltyCronService,
  ) {}

  @Post('earn')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Earn loyalty points for a completed sale (amount is read from the transaction)',
  })
  async earnPoints(@Body() dto: EarnLoyaltyPointsDto, @CurrentUser() user: AuthUser) {
    return this.earnLoyaltyPointsUseCase.execute({
      businessId: user.businessId,
      customerId: dto.customerId,
      transactionId: dto.transactionId,
      employeeId: user.employeeId,
    });
  }

  @Post('redeem')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Redeem loyalty points for discount' })
  async redeemPoints(@Body() dto: RedeemLoyaltyPointsDto, @CurrentUser() user: AuthUser) {
    return this.redeemLoyaltyPointsUseCase.execute({
      businessId: user.businessId,
      customerId: dto.customerId,
      transactionId: dto.transactionId,
      pointsToRedeem: dto.pointsToRedeem,
      employeeId: user.employeeId,
    });
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer loyalty info (points, tier, program status)' })
  async getCustomerLoyalty(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getLoyaltyBalanceUseCase.execute({ businessId: user.businessId, customerId });
  }

  @Get('customer/:customerId/history')
  @ApiOperation({ summary: 'Get customer loyalty transaction history' })
  async getCustomerHistory(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: LoyaltyHistoryQueryDto,
  ) {
    return this.getLoyaltyHistoryUseCase.execute({
      businessId: user.businessId,
      customerId,
      limit: query.limit,
    });
  }

  @Put('adjust')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Manual points adjustment (admin only)' })
  async adjustPoints(@Body() dto: AdjustLoyaltyPointsDto, @CurrentUser() user: AuthUser) {
    return this.adjustLoyaltyPointsUseCase.execute({
      businessId: user.businessId,
      customerId: dto.customerId,
      points: dto.points,
      reason: dto.reason,
      employeeId: user.employeeId,
    });
  }

  // ======================================================================
  // ANALYTICS
  // ======================================================================

  @Get('analytics')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Get loyalty program analytics',
    description:
      'Returns total members by tier, points issued/redeemed, redemption rate, and top redeemers',
  })
  async getLoyaltyAnalytics(
    @CurrentUser() user: AuthUser,
    @Query() query: LoyaltyAnalyticsQueryDto,
  ) {
    return this.loyaltyCronService.getLoyaltyAnalytics(
      user.businessId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  // ======================================================================
  // TIER EVALUATION (Manual trigger)
  // ======================================================================

  @Post('tiers/evaluate')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Manually trigger tier evaluation',
    description:
      'Evaluates all customers against tier thresholds and upgrades/downgrades as needed',
  })
  async evaluateTiers(@CurrentUser() user: AuthUser) {
    return this.loyaltyCronService.evaluateTiersForBusiness(user.businessId);
  }

  @Post('check-tiers')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Manually trigger tier check (alias for tiers/evaluate)',
    description: "Checks all customers' total points vs tier thresholds, auto-upgrades/downgrades",
  })
  async checkTiers(@CurrentUser() user: AuthUser) {
    return this.loyaltyCronService.evaluateTiersForBusiness(user.businessId);
  }
}
