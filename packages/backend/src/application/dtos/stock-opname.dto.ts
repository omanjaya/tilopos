import { IsString, IsOptional, IsArray, IsNumber, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStockOpnameDto {
  @ApiProperty()
  @IsString()
  outletId!: string;

  @ApiPropertyOptional({ description: 'Product IDs to include. If empty, all tracked products.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOpnameItemDto {
  @ApiProperty()
  @IsString()
  itemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  actualQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOpnameItemsDto {
  @ApiProperty({ type: [UpdateOpnameItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOpnameItemDto)
  items!: UpdateOpnameItemDto[];
}
