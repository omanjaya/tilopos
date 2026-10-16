import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';
import { PaginationQueryDto, MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';

/** Upper bound for a single stock quantity / unit cost (sanity limit, R6). */
const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_COST = 1_000_000_000;

// ─── Supplier CRUD ───────────────────────────────────────────────────────

/** Treats '' as "not provided" for optional contact fields sent by forms. */
const isProvided = (_: unknown, value: unknown) =>
  value !== undefined && value !== null && value !== '';

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @ValidateIf(isProvided)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** Whitelisted editable supplier fields (R7: never pass the raw body to Prisma). */
export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @ValidateIf(isProvided)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/**
 * GET /suppliers. Returns a plain array (bounded by `limit`, default and max 100)
 * so existing clients keep working.
 */
export class SupplierListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  override limit?: number = MAX_PAGE_SIZE;
}

// ─── Analytics ───────────────────────────────────────────────────────────

export class SupplierAnalyticsQueryDto {
  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}

const DATE_RANGES = ['today', 'this_week', 'this_month', 'this_year', 'custom'] as const;

export class SupplierHistoryQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGES })
  @IsOptional()
  @IsIn(DATE_RANGES)
  dateRange?: (typeof DATE_RANGES)[number];

  @ApiPropertyOptional({ description: 'YYYY-MM-DD (Asia/Jakarta business date)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  startDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD (Asia/Jakarta business date)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}/)
  endDate?: string;
}

// ─── Auto-Reorder ────────────────────────────────────────────────────────

export class AutoReorderDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;
}

export class ReorderSuggestionsQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;
}

// ─── Purchase Orders ─────────────────────────────────────────────────────

export class PurchaseOrderListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  override limit?: number = MAX_PAGE_SIZE;
}

export class CreatePurchaseOrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(MAX_QUANTITY)
  quantityOrdered!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_UNIT_COST)
  unitCost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ingredientId?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}

export class ReceivePurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderItemId!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  quantityReceived!: number;
}

/**
 * PUT /suppliers/purchase-orders/:id/receive. Without `items` every line is received
 * in full (remaining quantity); with `items` only the listed quantities are received
 * and the PO becomes `partial` until every line is complete.
 */
export class ReceivePurchaseOrderDto {
  @ApiPropertyOptional({ type: [ReceivePurchaseOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items?: ReceivePurchaseOrderItemDto[];
}

/** The approver is always the authenticated employee (never a body field). */
export class ApprovePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** The rejecter is always the authenticated employee (never a body field). */
export class RejectPurchaseOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
