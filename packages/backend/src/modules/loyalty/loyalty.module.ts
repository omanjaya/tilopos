import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyCronService } from './loyalty-cron.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaLoyaltyRepository } from '../../infrastructure/repositories/prisma-loyalty.repository';
import { PrismaCustomerRepository } from '../../infrastructure/repositories/prisma-customer.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Use Cases - Loyalty
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';

// Refactored services
import { LoyaltyService } from './loyalty.service';
import { LoyaltyRepository } from './repositories/loyalty.repository';
import { PointsManagementService } from './services/points-management.service';
import { TierManagementService } from './services/tier-management.service';
import { ExpiryService } from './services/expiry.service';
import { AnalyticsService } from './services/analytics.service';

@Module({
  controllers: [LoyaltyController],
  providers: [
    // Infrastructure
    PrismaService,

    // Repositories
    { provide: REPOSITORY_TOKENS.LOYALTY, useClass: PrismaLoyaltyRepository },
    { provide: REPOSITORY_TOKENS.CUSTOMER, useClass: PrismaCustomerRepository },
    LoyaltyRepository,

    // Refactored services
    LoyaltyService,
    PointsManagementService,
    TierManagementService,
    ExpiryService,
    AnalyticsService,

    // Legacy cron service
    LoyaltyCronService,

    // Use Cases
    EarnLoyaltyPointsUseCase,
    RedeemLoyaltyPointsUseCase,
    GetLoyaltyBalanceUseCase,
    GetLoyaltyHistoryUseCase,
  ],
  exports: [
    EarnLoyaltyPointsUseCase,
    RedeemLoyaltyPointsUseCase,
    GetLoyaltyBalanceUseCase,
    GetLoyaltyHistoryUseCase,
    LoyaltyCronService,
    LoyaltyService,
    PointsManagementService,
    TierManagementService,
    ExpiryService,
    AnalyticsService,
  ],
})
export class LoyaltyModule {}
