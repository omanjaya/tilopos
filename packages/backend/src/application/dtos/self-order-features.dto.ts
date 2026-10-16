import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsInt,
  IsEmail,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Matches,
  MaxLength,
  ValidateNested,
  ValidateBy,
  Max,
  Min,
  type ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SELF_ORDER_LANGUAGES = ['id', 'en'] as const;
export type SelfOrderLanguage = (typeof SELF_ORDER_LANGUAGES)[number];

// ==================== Session / cart DTOs ====================

export class CreateSelfOrderSessionDto {
  @ApiProperty({ description: 'Outlet the table QR belongs to' })
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ description: 'Table of the outlet (must belong to outletId)' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ enum: SELF_ORDER_LANGUAGES })
  @IsOptional()
  @IsIn(SELF_ORDER_LANGUAGES as unknown as string[])
  language?: SelfOrderLanguage;
}

export class SelfOrderMenuQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ enum: SELF_ORDER_LANGUAGES })
  @IsOptional()
  @IsIn(SELF_ORDER_LANGUAGES as unknown as string[])
  lang?: SelfOrderLanguage;
}

export class SelfOrderLanguageQueryDto {
  @ApiPropertyOptional({ enum: SELF_ORDER_LANGUAGES })
  @IsOptional()
  @IsIn(SELF_ORDER_LANGUAGES as unknown as string[])
  lang?: SelfOrderLanguage;
}

export class AddSelfOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Modifier ids; prices are resolved on the server',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  modifierIds?: string[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ExtendSelfOrderSessionDto {
  @ApiPropertyOptional({ minimum: 5, maximum: 60, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  minutes?: number;
}

// ==================== Payment DTOs ====================

export const SELF_ORDER_PAYMENT_METHODS = [
  'cash',
  'qris',
  'gopay',
  'ovo',
  'dana',
  'shopeepay',
] as const;
export type SelfOrderPaymentMethod = (typeof SELF_ORDER_PAYMENT_METHODS)[number];

export class SelfOrderPaymentDto {
  @ApiProperty({
    enum: SELF_ORDER_PAYMENT_METHODS,
    description:
      'cash = pay at counter. Digital methods return 501 NOT_CONFIGURED until a gateway is integrated.',
  })
  @IsIn(SELF_ORDER_PAYMENT_METHODS as unknown as string[])
  paymentMethod!: SelfOrderPaymentMethod;

  @ApiProperty({ description: 'Amount the customer expects to pay (must equal server total)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: 'Customer email for receipt' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsOptional()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'customerPhone must be 8-15 digits' })
  customerPhone?: string;
}

export class SelfOrderQrisPaymentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;
}

export const SELF_ORDER_CALLBACK_STATUSES = ['success', 'failed', 'pending'] as const;
export type SelfOrderCallbackStatus = (typeof SELF_ORDER_CALLBACK_STATUSES)[number];

export class SelfOrderPaymentCallbackDto {
  @ApiProperty({ description: 'Payment reference issued by POST /sessions/:code/pay' })
  @IsString()
  @MaxLength(120)
  orderId!: string;

  @ApiProperty({ enum: SELF_ORDER_CALLBACK_STATUSES })
  @IsIn(SELF_ORDER_CALLBACK_STATUSES as unknown as string[])
  status!: SelfOrderCallbackStatus;
}

export class SelfOrderPaymentCallbackAltDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sessionCode?: string;

  @ApiProperty({ description: 'Payment reference issued by POST /sessions/:code/pay' })
  @IsString()
  @MaxLength(120)
  paymentId!: string;

  @ApiProperty({ enum: SELF_ORDER_CALLBACK_STATUSES })
  @IsIn(SELF_ORDER_CALLBACK_STATUSES as unknown as string[])
  status!: SelfOrderCallbackStatus;
}

// ==================== Multi-language DTOs ====================

/**
 * Validates `{ [locale]: { name, description? } }` with supported locales only
 * and bounded string lengths (class-validator cannot validate map values).
 */
function IsTranslationMap(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isTranslationMap',
      validator: {
        validate: (value: unknown): boolean => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
          const entries = Object.entries(value as Record<string, unknown>);
          if (entries.length === 0) return false;
          return entries.every(([locale, content]) => {
            if (!(SELF_ORDER_LANGUAGES as readonly string[]).includes(locale)) return false;
            if (!content || typeof content !== 'object' || Array.isArray(content)) return false;
            const c = content as Record<string, unknown>;
            const allowedKeys = Object.keys(c).every((k) => k === 'name' || k === 'description');
            const nameOk = typeof c.name === 'string' && c.name.length > 0 && c.name.length <= 255;
            const descOk =
              c.description === undefined ||
              c.description === null ||
              (typeof c.description === 'string' && c.description.length <= 2000);
            return allowedKeys && nameOk && descOk;
          });
        },
        defaultMessage: () =>
          `translations must map a supported locale (${SELF_ORDER_LANGUAGES.join(', ')}) to { name (<=255), description? (<=2000) }`,
      },
    },
    validationOptions,
  );
}

export class TranslationContentDto {
  @ApiProperty({ description: 'Translated product name' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Translated product description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class MenuTranslationDto {
  @ApiProperty({ description: 'Product ID to set translations for' })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description: 'Translations keyed by language code (e.g., {"en": {"name": "..."}})',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/TranslationContentDto' },
  })
  @IsTranslationMap()
  translations!: Record<string, { name: string; description?: string }>;
}

export class MenuTranslationBatchDto {
  @ApiProperty({ type: [MenuTranslationDto], description: 'Array of product translations' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MenuTranslationDto)
  items!: MenuTranslationDto[];
}
