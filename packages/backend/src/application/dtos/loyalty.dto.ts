import { IsNumber, IsOptional, Min, IsUUID } from 'class-validator';

export class EarnLoyaltyPointsDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  transactionId!: string;

  @IsNumber()
  @Min(0)
  transactionTotal!: number;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class RedeemLoyaltyPointsDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  transactionId!: string;

  @IsNumber()
  @Min(1)
  pointsToRedeem!: number;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class GetLoyaltyBalanceDto {
  @IsUUID()
  customerId!: string;
}

export class GetLoyaltyHistoryDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
