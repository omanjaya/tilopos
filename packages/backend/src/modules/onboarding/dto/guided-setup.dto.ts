import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  ArrayMaxSize,
  ArrayUnique,
  ValidateNested,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Wizard payment method ids (mapped to payment types by OnboardingService). */
export const ONBOARDING_PAYMENT_METHODS = [
  'cash',
  'qris',
  'debit',
  'credit',
  'transfer',
  'ewallet',
] as const;

class BusinessProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^\+?[0-9\s-]{6,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;
}

class TemplateSectionsDto {
  @IsBoolean()
  @IsOptional()
  categories?: boolean;

  @IsBoolean()
  @IsOptional()
  products?: boolean;

  @IsBoolean()
  @IsOptional()
  modifiers?: boolean;

  @IsBoolean()
  @IsOptional()
  tables?: boolean;

  /** Units are applied through each product's sellUnit; accepted for compatibility. */
  @IsBoolean()
  @IsOptional()
  units?: boolean;
}

class TemplateConfigDto {
  @ValidateNested()
  @Type(() => TemplateSectionsDto)
  sections!: TemplateSectionsDto;
}

/** First cashier created by the wizard (role is always cashier). */
class EmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  pin!: string;
}

export class GuidedSetupDto {
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  business?: BusinessProfileDto;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z][a-z0-9_]{0,29}$/, { message: 'businessType must be a business type code' })
  businessType?: string;

  @ValidateNested()
  @Type(() => TemplateConfigDto)
  @IsOptional()
  template?: TemplateConfigDto;

  @IsArray()
  @ArrayMaxSize(ONBOARDING_PAYMENT_METHODS.length)
  @ArrayUnique()
  @IsIn(ONBOARDING_PAYMENT_METHODS, { each: true })
  @IsOptional()
  paymentMethods?: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @ValidateNested()
  @Type(() => EmployeeDto)
  @IsOptional()
  employee?: EmployeeDto;
}
