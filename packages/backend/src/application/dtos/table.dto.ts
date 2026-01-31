import { IsString, IsNumber, IsOptional, Min, Max, IsUUID, IsIn, MaxLength } from 'class-validator';

export class CreateTableDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  positionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  positionY?: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  positionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  positionY?: number;

  @IsOptional()
  @IsIn(['available', 'occupied', 'reserved', 'cleaning'])
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';

  @IsOptional()
  isActive?: boolean;
}

export class UpdateTableStatusDto {
  @IsIn(['available', 'occupied', 'reserved', 'cleaning'])
  status!: 'available' | 'occupied' | 'reserved' | 'cleaning';

  @IsOptional()
  @IsUUID()
  currentOrderId?: string;
}

export class GetTablesQueryDto {
  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsIn(['available', 'occupied', 'reserved', 'cleaning'])
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';

  @IsOptional()
  activeOnly?: string;
}
