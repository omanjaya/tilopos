import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  tableId!: string;

  @IsString()
  @MaxLength(255)
  customerName!: string;

  @IsString()
  @MaxLength(20)
  customerPhone!: string;

  @IsNumber()
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

export class GetReservationsQueryDto {
  @IsUUID()
  outletId!: string;

  @IsDateString()
  date!: string;
}
