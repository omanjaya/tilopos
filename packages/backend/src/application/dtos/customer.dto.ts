import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PHONE_PATTERN = /^[0-9+()\-\s]{3,20}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /customers. Loyalty fields (points, tier, totalSpent, visitCount) are
 * server-owned and cannot be set by clients (R7).
 */
export class CreateCustomerDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must contain 3-20 digits/phone characters' })
  phone?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** PUT /customers/:id. `null` clears an optional field. */
export class UpdateCustomerDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Transform(trim)
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must contain 3-20 digits/phone characters' })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(1000)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'YYYY-MM-DD' })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Matches(DATE_ONLY, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

/**
 * GET /customers. Without page/limit the response is the legacy plain array
 * (capped at MAX_UNPAGED_CUSTOMERS); with page or limit it is `{ data, meta }`.
 */
export class CustomerListQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CustomerHistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class SegmentCustomersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

/** Multipart body of POST /customers/import-xlsx (mappings is a JSON string). */
export class CustomerXlsxImportDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sheetName!: string;

  @ApiProperty({ description: 'JSON array of { excelColumn, field }' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  mappings!: string;
}
