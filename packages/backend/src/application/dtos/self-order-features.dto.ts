import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Payment DTOs ====================

export class SelfOrderPaymentDto {
  @ApiProperty({ description: 'Session code for the self-order' })
  @IsString()
  sessionCode!: string;

  @ApiProperty({
    enum: ['qris', 'cash'],
    description: 'Payment method: QRIS for digital payment, cash for pay-at-counter',
  })
  @IsEnum(['qris', 'cash'])
  paymentMethod!: 'qris' | 'cash';

  @ApiProperty({ description: 'Payment amount', type: Number })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'Customer email for receipt' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}

export class SelfOrderPaymentStatusDto {
  @ApiProperty({ description: 'Session code to check payment status' })
  @IsString()
  sessionCode!: string;
}

// ==================== Multi-language DTOs ====================

export class TranslationContentDto {
  @ApiProperty({ description: 'Translated product name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Translated product description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class MenuTranslationDto {
  @ApiProperty({ description: 'Product ID to set translations for' })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description: 'Translations keyed by language code (e.g., {"id": {"name": "..."}, "en": {"name": "..."}})',
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  @IsObject()
  translations!: Record<string, { name: string; description?: string }>;
}

export class MenuTranslationBatchDto {
  @ApiProperty({ type: [MenuTranslationDto], description: 'Array of product translations' })
  @ValidateNested({ each: true })
  @Type(() => MenuTranslationDto)
  items!: MenuTranslationDto[];
}
