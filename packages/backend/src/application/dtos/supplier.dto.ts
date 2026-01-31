import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierAnalyticsQueryDto {
  @ApiProperty()
  @IsString()
  businessId!: string;

  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}

export class AutoReorderDto {
  @ApiProperty()
  @IsString()
  outletId!: string;
}

export class ReorderSuggestionsQueryDto {
  @ApiProperty()
  @IsString()
  outletId!: string;
}

export class ApprovePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  approvedBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectPurchaseOrderDto {
  @ApiProperty()
  @IsString()
  rejectedBy!: string;

  @ApiProperty()
  @IsString()
  reason!: string;
}
