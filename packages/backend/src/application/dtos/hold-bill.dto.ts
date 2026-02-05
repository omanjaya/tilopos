import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class HeldItemDto {
  @IsString()
  productId!: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class HoldBillDto {
  @IsString()
  @IsNotEmpty()
  outletId!: string;

  @IsString()
  @IsOptional()
  tableId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeldItemDto)
  items!: HeldItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
