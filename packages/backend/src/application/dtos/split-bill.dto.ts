import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export const SPLIT_TYPES = ['equal', 'by_item', 'by_amount'] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export class SplitPartDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  /** by_item: TransactionItem ids of the parent bill that go into this part. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  itemIds?: string[];

  /** by_amount: amount (rupiah) of this part. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount?: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}

export class SplitBillDto {
  @IsUUID()
  transactionId!: string;

  @IsIn(SPLIT_TYPES)
  splitType!: SplitType;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SplitPartDto)
  splits!: SplitPartDto[];
}
