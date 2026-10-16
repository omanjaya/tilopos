import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateUpgradeDto {
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsIn(['midtrans', 'xendit'])
  provider?: 'midtrans' | 'xendit';
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
