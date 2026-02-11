import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionItemDto, PaymentDto } from './transaction.dto';

export class CreateCreditTransactionDto {
  @ApiProperty()
  @IsString()
  outletId!: string;

  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty({ description: 'Customer is required for credit sales' })
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  shiftId!: string;

  @ApiProperty({ enum: ['dine_in', 'takeaway', 'delivery'] })
  @IsEnum(['dine_in', 'takeaway', 'delivery'])
  orderType!: 'dine_in' | 'takeaway' | 'delivery';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ type: [TransactionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @ApiPropertyOptional({ type: [PaymentDto], description: 'Optional down payment' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments?: PaymentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Due date for credit payment (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Notes specific to credit/BON agreement' })
  @IsOptional()
  @IsString()
  creditNotes?: string;
}

export class RecordCreditPaymentDto {
  @ApiProperty({ description: 'Payment amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: ['cash', 'card', 'qris', 'bank_transfer'] })
  @IsString()
  paymentMethod!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreditSaleFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: ['outstanding', 'partially_paid', 'settled', 'overdue'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
