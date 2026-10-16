import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class MergeBillDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  transactionIds!: string[];

  /**
   * Kept for backwards compatibility. The original payments are moved onto the
   * merged bill, so this value is only recorded in the merged bill's notes.
   */
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
