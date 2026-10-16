import { Type } from 'class-transformer';
import {
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

export const WAITING_LIST_STATUSES = [
  'waiting',
  'notified',
  'seated',
  'cancelled',
  'no_show',
] as const;
export type WaitingListStatusValue = (typeof WAITING_LIST_STATUSES)[number];

const PHONE = /^[0-9+\-\s()]{6,20}$/;

/** POST /tables/waiting-list (legacy body uses `phone`). */
export class AddToWaitingListDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerName!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  partySize!: number;

  @IsOptional()
  @Matches(PHONE, { message: 'phone must be a phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredSection?: string;
}

/** POST /waiting-list */
export class CreateWaitingListEntryDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerName!: string;

  @IsOptional()
  @Matches(PHONE, { message: 'customerPhone must be a phone number' })
  customerPhone?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  partySize!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredSection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** PUT /waiting-list/:id — status transitions are validated by the service. */
export class UpdateWaitingListEntryDto {
  @IsOptional()
  @IsIn(WAITING_LIST_STATUSES)
  status?: WaitingListStatusValue;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  estimatedWait?: number;
}

export class SeatFromWaitingListDto {
  @IsUUID()
  tableId!: string;
}

export class WaitingListQueryDto {
  /** Optional: without it, entries of every outlet of the caller's business are listed. */
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @IsOptional()
  @IsIn(WAITING_LIST_STATUSES)
  status?: WaitingListStatusValue;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class WaitingListStatsQueryDto {
  @IsOptional()
  @IsUUID()
  outletId?: string;
}
