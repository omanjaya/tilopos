import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';

export class CashInDto {
  @IsUUID()
  shiftId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999999)
  amount!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class CashOutDto {
  @IsUUID()
  shiftId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999999)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
