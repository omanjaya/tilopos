import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionItemDto } from './transaction.dto';

export class HoldBillDto {
  @IsUUID()
  @IsOptional()
  outletId?: string;

  @IsUUID()
  @IsOptional()
  clientBillId?: string;

  @IsUUID()
  @IsOptional()
  tableId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  customerName?: string;

  @IsOptional()
  @IsIn(['dine_in', 'takeaway', 'delivery'])
  orderType?: 'dine_in' | 'takeaway' | 'delivery';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999999)
  discountAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class HeldBillsQueryDto {
  @IsUUID()
  @IsOptional()
  outletId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}$/)
  cursor?: string;
}

export class ResumeBillDto {
  @IsOptional()
  @IsUUID()
  requestId?: string;
}
