import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const TABLE_STATUSES = ['available', 'occupied', 'reserved', 'cleaning'] as const;
export type TableStatusValue = (typeof TABLE_STATUSES)[number];

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class CreateTableDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  positionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  positionY?: number;
}

/**
 * Generic table update. Status is intentionally NOT accepted here: status changes
 * go through PUT /tables/:id/status (which validates the linked order).
 */
export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  positionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  positionY?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTableStatusDto {
  @IsIn(TABLE_STATUSES)
  status!: TableStatusValue;

  @IsOptional()
  @IsUUID()
  currentOrderId?: string;
}

export class GetTablesQueryDto {
  /** Optional: without it, tables of every outlet of the caller's business are listed. */
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string;

  @IsOptional()
  @IsIn(TABLE_STATUSES)
  status?: TableStatusValue;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  activeOnly?: boolean;
}

export class TableOutletQueryDto {
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

export class GetTableReservationsQueryDto {
  @IsUUID()
  outletId!: string;

  /** Business date (Asia/Jakarta) as YYYY-MM-DD. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;
}

export class CreateTableReservationDto {
  @IsUUID()
  tableId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerName!: string;

  @IsString()
  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'customerPhone must be a phone number' })
  customerPhone!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  partySize!: number;

  @IsDateString()
  reservedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
