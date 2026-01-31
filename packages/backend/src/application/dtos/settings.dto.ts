import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Tax Configuration DTOs ====================

export class UpdateTaxConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  serviceChargeEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceChargeRate?: number;
}

export interface TaxConfigResponse {
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  taxInclusive: boolean;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
}

// ==================== Receipt Template DTOs ====================

export type PaperWidth = '58mm' | '80mm';

export class UpdateReceiptTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAddress?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTaxDetails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPaymentMethod?: boolean;

  @ApiPropertyOptional({ enum: ['58mm', '80mm'] })
  @IsOptional()
  @IsEnum(['58mm', '80mm'] as const, { message: 'paperWidth must be either 58mm or 80mm' })
  paperWidth?: PaperWidth;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customMessage?: string;
}

export interface ReceiptTemplateResponse {
  header: string;
  footer: string;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTaxDetails: boolean;
  showPaymentMethod: boolean;
  paperWidth: PaperWidth;
  customMessage: string;
}

// ==================== Operating Hours DTOs ====================

export class OperatingHoursEntryDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'openTime must be in HH:mm format' })
  openTime!: string;

  @ApiProperty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closeTime must be in HH:mm format' })
  closeTime!: string;

  @ApiProperty()
  @IsBoolean()
  isClosed!: boolean;
}

export class UpdateOperatingHoursDto {
  @ApiProperty({ type: [OperatingHoursEntryDto] })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OperatingHoursEntryDto)
  hours!: OperatingHoursEntryDto[];
}

export interface OperatingHoursEntryResponse {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

// ==================== Payment Method DTOs ====================

export type PaymentMethodType = 'cash' | 'card' | 'ewallet' | 'qris' | 'bank_transfer';

export class CreatePaymentMethodDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['cash', 'card', 'ewallet', 'qris', 'bank_transfer'] })
  @IsEnum(['cash', 'card', 'ewallet', 'qris', 'bank_transfer'] as const)
  type!: PaymentMethodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  processingFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['cash', 'card', 'ewallet', 'qris', 'bank_transfer'] })
  @IsOptional()
  @IsEnum(['cash', 'card', 'ewallet', 'qris', 'bank_transfer'] as const)
  type?: PaymentMethodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  processingFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export interface PaymentMethodResponse {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
  processingFee: number;
  settings: Record<string, unknown>;
}
