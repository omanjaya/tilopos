import { IsString, IsOptional, IsDateString, IsInt, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateVoucherBatchDto {
  @ApiProperty({ description: 'ID of the promotion to link vouchers to' })
  @IsString()
  promotionId!: string;

  @ApiProperty({ description: 'Prefix for generated voucher codes (e.g. "PROMO")' })
  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'prefix must be 2-10 uppercase alphanumeric characters' })
  prefix!: string;

  @ApiProperty({ description: 'Number of vouchers to generate', minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Expiration date for the vouchers' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export interface GenerateVoucherBatchResponse {
  generated: number;
  vouchers: Array<{ code: string; expiresAt: Date | null }>;
}
