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
  MaxLength,
  IsNotEmpty,
  IsEmail,
  IsUUID,
  ValidateIf,
  IsIP,
  IsIn,
  IsObject,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Outlet DTOs ====================

export class UpdateOutletDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceCharge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

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
  @MaxLength(50)
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
  @MaxLength(500)
  header?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @MaxLength(500)
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
  @IsNotEmpty()
  @MaxLength(100)
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
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
  @IsObject()
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

// ==================== Printer Configuration DTOs ====================

export type PrinterTypeEnum = 'receipt' | 'kitchen' | 'label';
export type PrinterConnectionEnum = 'usb' | 'network' | 'bluetooth';

export class CreatePrinterConfigDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ['receipt', 'kitchen', 'label'] })
  @IsEnum(['receipt', 'kitchen', 'label'] as const)
  type!: PrinterTypeEnum;

  @ApiProperty({ enum: ['usb', 'network', 'bluetooth'] })
  @IsEnum(['usb', 'network', 'bluetooth'] as const)
  connection!: PrinterConnectionEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPrint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  copies?: number;

  @ApiProperty()
  @IsUUID()
  outletId!: string;
}

export class UpdatePrinterConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ['receipt', 'kitchen', 'label'] })
  @IsOptional()
  @IsEnum(['receipt', 'kitchen', 'label'] as const)
  type?: PrinterTypeEnum;

  @ApiPropertyOptional({ enum: ['usb', 'network', 'bluetooth'] })
  @IsOptional()
  @IsEnum(['usb', 'network', 'bluetooth'] as const)
  connection?: PrinterConnectionEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPrint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  copies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

// ==================== Report Schedule DTOs ====================

export type ReportTypeEnum = 'sales' | 'financial' | 'inventory';
export type ReportFrequencyEnum = 'daily' | 'weekly' | 'monthly';

export class CreateReportScheduleDto {
  @ApiProperty({ enum: ['sales', 'financial', 'inventory'] })
  @IsEnum(['sales', 'financial', 'inventory'] as const)
  reportType!: ReportTypeEnum;

  @ApiProperty({ enum: ['daily', 'weekly', 'monthly'] })
  @IsEnum(['daily', 'weekly', 'monthly'] as const)
  frequency!: ReportFrequencyEnum;

  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsEmail({}, { each: true })
  recipients!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateReportScheduleDto {
  @ApiPropertyOptional({ enum: ['sales', 'financial', 'inventory'] })
  @IsOptional()
  @IsEnum(['sales', 'financial', 'inventory'] as const)
  reportType?: ReportTypeEnum;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'] as const)
  frequency?: ReportFrequencyEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsEmail({}, { each: true })
  recipients?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== Business Profile DTOs ====================

/** Keys of business.settings that PUT /settings/business may change (display only). */
export const EDITABLE_BUSINESS_SETTINGS = ['brandColor'] as const;

export class UpdateBusinessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  /**
   * Patch of display settings. Only EDITABLE_BUSINESS_SETTINGS keys are applied;
   * other keys (payment methods, printers, tax, onboarding flags) are owned by
   * their dedicated endpoints and ignored here.
   */
  @ApiPropertyOptional({ description: 'Only brandColor is applied' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class CreateOutletDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceCharge?: number;
}

// ==================== Modifier Group DTOs ====================

export class ModifierInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  price!: number;
}

export class CreateModifierGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ enum: ['single', 'multiple'] })
  @IsOptional()
  @IsIn(['single', 'multiple'])
  selectionType?: 'single' | 'multiple';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minSelection?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxSelection?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ type: [ModifierInputDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ModifierInputDto)
  modifiers!: ModifierInputDto[];
}

/** Modifier line in PUT /settings/modifier-groups/:id: with id = update that modifier, without id = new. */
export class UpdateModifierInputDto extends ModifierInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class UpdateModifierGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['single', 'multiple'] })
  @IsOptional()
  @IsIn(['single', 'multiple'])
  selectionType?: 'single' | 'multiple';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minSelection?: number;

  /** null clears the upper bound. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(100)
  maxSelection?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  /**
   * When present, the full list of modifiers the group should have: items with id are updated,
   * items without id are created, active modifiers missing from the list are deactivated.
   */
  @ApiPropertyOptional({ type: [UpdateModifierInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => UpdateModifierInputDto)
  modifiers?: UpdateModifierInputDto[];
}

// ==================== Loyalty DTOs ====================

export class CreateLoyaltyProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /** Rupiah spent per point earned; must be ≥ 1 (it is a divisor). */
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000_000)
  amountPerPoint!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  redemptionRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  pointExpiryDays?: number;
}

export class UpdateLoyaltyProgramDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000_000)
  amountPerPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  redemptionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  pointExpiryDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLoyaltyTierDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minPoints!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000_000)
  minSpent?: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  pointMultiplier!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  benefits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateLoyaltyTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000_000)
  minSpent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  pointMultiplier?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  benefits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== Legacy per-outlet DTOs ====================

export class UpdateOutletTaxDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceCharge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNumber?: string;
}

export class UpdateLegacyReceiptTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  header?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  footer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showQRCode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTaxDetails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showServiceCharge?: boolean;

  @ApiPropertyOptional({ enum: ['58mm', '80mm'] })
  @IsOptional()
  @IsIn(['58mm', '80mm'])
  paperSize?: '58mm' | '80mm';

  @ApiPropertyOptional({ enum: ['small', 'medium', 'large'] })
  @IsOptional()
  @IsIn(['small', 'medium', 'large'])
  fontSize?: 'small' | 'medium' | 'large';
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class LegacyOperatingHoursEntryDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty()
  @IsBoolean()
  isOpen!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HH_MM, { message: 'openTime must be in HH:mm format' })
  openTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HH_MM, { message: 'closeTime must be in HH:mm format' })
  closeTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HH_MM, { message: 'breakStart must be in HH:mm format' })
  breakStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HH_MM, { message: 'breakEnd must be in HH:mm format' })
  breakEnd?: string;
}

export class LegacyPaymentMethodConfigDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  method!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  processingFee?: number;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  feeType?: 'percentage' | 'fixed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000_000)
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000_000)
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
