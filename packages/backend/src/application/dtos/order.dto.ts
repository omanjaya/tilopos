import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'] as const;
export type OrderTypeValue = (typeof ORDER_TYPES)[number];

/** Statuses a client may set through PUT /orders/:id/status (cancel has its own endpoint). */
export const ORDER_STATUS_UPDATES = [
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
] as const;
export type OrderStatusUpdate = (typeof ORDER_STATUS_UPDATES)[number];

export const ORDER_LIST_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
] as const;

export const MAX_ORDER_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 999;
export const MAX_ORDER_PRIORITY = 10;

export class OrderItemInputDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1, maximum: MAX_ITEM_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  station?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: "Defaults to the caller's outlet" })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ enum: ORDER_TYPES })
  @IsIn(ORDER_TYPES)
  orderType!: OrderTypeValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_ORDER_PRIORITY })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ORDER_PRIORITY)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Omit to list every outlet of the business' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ enum: ORDER_LIST_STATUSES, description: 'Default: active orders' })
  @IsOptional()
  @IsIn(ORDER_LIST_STATUSES)
  status?: (typeof ORDER_LIST_STATUSES)[number];

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUS_UPDATES })
  @IsIn(ORDER_STATUS_UPDATES)
  status!: OrderStatusUpdate;
}

export class UpdateOrderItemDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_ITEM_QUANTITY })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ModifyOrderItemsDto {
  @ApiPropertyOptional({ type: [OrderItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  addItems?: OrderItemInputDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  removeItemIds?: string[];

  @ApiPropertyOptional({ type: [UpdateOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  updateItems?: UpdateOrderItemDto[];
}

export class ModifyOrderDto extends ModifyOrderItemsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_ORDER_PRIORITY })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ORDER_PRIORITY)
  priority?: number;
}

export class CancelOrderDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
