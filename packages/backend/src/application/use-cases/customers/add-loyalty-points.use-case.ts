import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository';

export interface AddLoyaltyPointsInput {
  customerId: string;
  transactionId: string;
  transactionTotal: number;
}

export interface AddLoyaltyPointsOutput {
  pointsEarned: number;
  totalPoints: number;
  tierChanged: boolean;
  newTier?: string;
}

@Injectable()
export class AddLoyaltyPointsUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: AddLoyaltyPointsInput): Promise<AddLoyaltyPointsOutput> {
    const customer = await this.customerRepo.findById(input.customerId);
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    const loyaltyProgram = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId: customer.businessId, isActive: true },
    });

    if (!loyaltyProgram) {
      return { pointsEarned: 0, totalPoints: customer.loyaltyPoints, tierChanged: false };
    }

    const amountPerPoint = loyaltyProgram.amountPerPoint.toNumber();
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId: customer.businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const currentTier = tiers.find((t) => t.name === customer.loyaltyTier);
    const multiplier = currentTier ? currentTier.pointMultiplier.toNumber() : 1;

    const pointsEarned = Math.floor((input.transactionTotal / amountPerPoint) * multiplier);
    const totalPoints = customer.loyaltyPoints + pointsEarned;

    await this.customerRepo.update(input.customerId, {
      loyaltyPoints: totalPoints,
      totalSpent: customer.totalSpent + input.transactionTotal,
      visitCount: customer.visitCount + 1,
    });

    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: input.customerId,
        transactionId: input.transactionId,
        type: 'earned',
        points: pointsEarned,
        balanceAfter: totalPoints,
        description: `Earned from transaction`,
      },
    });

    let tierChanged = false;
    let newTier: string | undefined;

    for (const tier of tiers.reverse()) {
      if (totalPoints >= tier.minPoints && tier.name !== customer.loyaltyTier) {
        tierChanged = true;
        newTier = tier.name;
        await this.customerRepo.update(input.customerId, { loyaltyTier: tier.name });
        break;
      }
    }

    return { pointsEarned, totalPoints, tierChanged, newTier };
  }
}
