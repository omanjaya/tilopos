import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DiscrepancyQueryDto {
  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}

export class AutoTransferRequestDto {
  @ApiProperty()
  @IsString()
  destinationOutletId!: string;

  @ApiProperty()
  @IsString()
  sourceOutletId!: string;
}
