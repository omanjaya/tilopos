import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyCronService } from './loyalty-cron.service';
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { AdjustLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/adjust-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';

// PrismaService comes from the global DatabaseModule; DistributedLockService from the global LockModule.
@Module({
  controllers: [LoyaltyController],
  providers: [
    LoyaltyCronService,
    EarnLoyaltyPointsUseCase,
    RedeemLoyaltyPointsUseCase,
    AdjustLoyaltyPointsUseCase,
    GetLoyaltyBalanceUseCase,
    GetLoyaltyHistoryUseCase,
  ],
  exports: [
    EarnLoyaltyPointsUseCase,
    RedeemLoyaltyPointsUseCase,
    AdjustLoyaltyPointsUseCase,
    GetLoyaltyBalanceUseCase,
    GetLoyaltyHistoryUseCase,
    LoyaltyCronService,
  ],
})
export class LoyaltyModule {}
