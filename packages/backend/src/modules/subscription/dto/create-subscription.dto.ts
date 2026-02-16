import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateUpgradeDto {
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsString()
  provider?: 'midtrans' | 'xendit';
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
