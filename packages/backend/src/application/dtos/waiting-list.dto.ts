import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class AddToWaitingListDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  @MaxLength(255)
  customerName!: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  partySize!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredSection?: string;
}

export class SeatFromWaitingListDto {
  @IsUUID()
  tableId!: string;
}
