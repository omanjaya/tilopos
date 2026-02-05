import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ILoyaltyRepository } from '../../domain/interfaces/repositories/loyalty.repository';
import type { ICustomerRepository } from '../../domain/interfaces/repositories/customer.repository';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import { LoyaltyCronService } from './loyalty-cron.service';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(
    private readonly earnLoyaltyPointsUseCase: EarnLoyaltyPointsUseCase,
    private readonly redeemLoyaltyPointsUseCase: RedeemLoyaltyPointsUseCase,
    private readonly getLoyaltyBalanceUseCase: GetLoyaltyBalanceUseCase,
    private readonly getLoyaltyHistoryUseCase: GetLoyaltyHistoryUseCase,
    private readonly loyaltyCronService: LoyaltyCronService,
    @Inject(REPOSITORY_TOKENS.LOYALTY)
    private readonly loyaltyRepo: ILoyaltyRepository,
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  @Post('earn')
  @ApiOperation({ summary: 'Earn loyalty points from a transaction' })
  async earnPoints(
    @Body() dto: { customerId: string; transactionId: string; transactionTotal: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.earnLoyaltyPointsUseCase.execute({
      customerId: dto.customerId,
      transactionId: dto.transactionId,
      transactionTotal: dto.transactionTotal,
      employeeId: user.employeeId,
    });
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem loyalty points for discount' })
  async redeemPoints(
    @Body() dto: { customerId: string; transactionId: string; pointsToRedeem: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.redeemLoyaltyPointsUseCase.execute({
      customerId: dto.customerId,
      transactionId: dto.transactionId,
      pointsToRedeem: dto.pointsToRedeem,
      employeeId: user.employeeId,
    });
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer loyalty info (points, tier, program status)' })
  async getCustomerLoyalty(@Param('customerId') customerId: string) {
    return this.getLoyaltyBalanceUseCase.execute({ customerId });
  }

  @Get('customer/:customerId/history')
  @ApiOperation({ summary: 'Get customer loyalty transaction history' })
  async getCustomerHistory(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.getLoyaltyHistoryUseCase.execute({
      customerId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Put('adjust')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Manual points adjustment (admin only)' })
  async adjustPoints(
    @Body() dto: { customerId: string; points: number; reason: string },
    @CurrentUser() user: AuthUser,
  ) {
    const customer = await this.customerRepo.findById(dto.customerId);
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    const newBalance = Math.max(0, customer.loyaltyPoints + dto.points);

    await this.loyaltyRepo.createTransaction({
      customerId: dto.customerId,
      type: 'adjusted',
      points: dto.points,
      balanceAfter: newBalance,
      description: dto.reason,
      createdBy: user.employeeId,
    });

    const eligibleTier = await this.loyaltyRepo.findEligibleTier(
      customer.businessId,
      newBalance,
      customer.totalSpent,
    );

    const newTier = eligibleTier ? eligibleTier.name : customer.loyaltyTier;
    await this.loyaltyRepo.updateCustomerPoints(dto.customerId, newBalance, newTier);

    return {
      customerId: dto.customerId,
      previousBalance: customer.loyaltyPoints,
      adjustment: dto.points,
      newBalance,
      tier: newTier,
      reason: dto.reason,
      adjustedBy: user.employeeId,
    };
  }

  // ======================================================================
  // ANALYTICS
  // ======================================================================

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Get loyalty program analytics',
    description:
      'Returns total members by tier, points issued/redeemed, redemption rate, and top redeemers',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Period start (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Period end (ISO 8601)' })
  async getLoyaltyAnalytics(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.loyaltyCronService.getLoyaltyAnalytics(
      user.businessId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ======================================================================
  // TIER EVALUATION (Manual trigger)
  // ======================================================================

  @Post('tiers/evaluate')
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Manually trigger tier check (alias for tiers/evaluate)',
    description: "Checks all customers' total points vs tier thresholds, auto-upgrades/downgrades",
  })
  async checkTiers(@CurrentUser() user: AuthUser) {
    return this.loyaltyCronService.evaluateTiersForBusiness(user.businessId);
  }
}
