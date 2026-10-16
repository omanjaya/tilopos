import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundItemDto {
  @ApiProperty()
  @IsUUID()
  transactionItemId!: string;

  @ApiProperty({ description: 'Quantity to refund (up to 3 decimals for weighed items)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100000)
  quantity!: number;

  @ApiProperty({ enum: ['defect', 'wrong_order', 'customer_request', 'other'] })
  @IsEnum(['defect', 'wrong_order', 'customer_request', 'other'])
  reason!: 'defect' | 'wrong_order' | 'customer_request' | 'other';
}

export class ProcessRefundDto {
  @ApiProperty()
  @IsUUID()
  transactionId!: string;

  @ApiProperty({ type: [RefundItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items!: RefundItemDto[];

  @ApiProperty({ enum: ['cash', 'original_method', 'store_credit'] })
  @IsEnum(['cash', 'original_method', 'store_credit'])
  refundMethod!: 'cash' | 'original_method' | 'store_credit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
