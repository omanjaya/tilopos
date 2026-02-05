import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundItemDto {
  @ApiProperty()
  @IsString()
  transactionItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: ['defect', 'wrong_order', 'customer_request', 'other'] })
  @IsEnum(['defect', 'wrong_order', 'customer_request', 'other'])
  reason!: 'defect' | 'wrong_order' | 'customer_request' | 'other';
}

export class ProcessRefundDto {
  @ApiProperty()
  @IsString()
  transactionId!: string;

  @ApiProperty({ type: [RefundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items!: RefundItemDto[];

  @ApiProperty({ enum: ['cash', 'original_method', 'store_credit'] })
  @IsEnum(['cash', 'original_method', 'store_credit'])
  refundMethod!: 'cash' | 'original_method' | 'store_credit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
