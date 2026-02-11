import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerSegmentsService } from './customer-segments.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaCustomerRepository } from '../../infrastructure/repositories/prisma-customer.repository';
import { PrismaLoyaltyRepository } from '../../infrastructure/repositories/prisma-loyalty.repository';
import { ImportModule } from '../../infrastructure/import/import.module';

// Use Cases - Customer
import { AddLoyaltyPointsUseCase } from '../../application/use-cases/customers/add-loyalty-points.use-case';

// Use Cases - Loyalty
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';

@Module({
  imports: [ImportModule],
  controllers: [CustomersController],
  providers: [
    // Services
    CustomersService,
    CustomerSegmentsService,

    // Repositories
    { provide: REPOSITORY_TOKENS.CUSTOMER, useClass: PrismaCustomerRepository },
    { provide: REPOSITORY_TOKENS.LOYALTY, useClass: PrismaLoyaltyRepository },

    // Use Cases
    AddLoyaltyPointsUseCase,
    EarnLoyaltyPointsUseCase,
    RedeemLoyaltyPointsUseCase,
    GetLoyaltyBalanceUseCase,
    GetLoyaltyHistoryUseCase,
  ],
  exports: [
    CustomersService,
    CustomerSegmentsService,
    EarnLoyaltyPointsUseCase,
    RedeemLoyaltyPointsUseCase,
  ],
})
export class CustomersModule {}
