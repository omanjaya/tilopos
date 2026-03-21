import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const EMPLOYEE_ROLES = ['cashier', 'kitchen', 'inventory', 'supervisor', 'manager'] as const;

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Name must not be empty' })
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiProperty({ enum: EMPLOYEE_ROLES })
  @IsEnum(EMPLOYEE_ROLES, {
    message: 'Role must be one of: cashier, kitchen, inventory, supervisor, manager',
  })
  role!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_ROLES })
  @IsOptional()
  @IsEnum(EMPLOYEE_ROLES, {
    message: 'Role must be one of: cashier, kitchen, inventory, supervisor, manager',
  })
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StartShiftDto {
  @ApiProperty()
  @IsString()
  outletId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  openingCash!: number;
}

export class EndShiftDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  closingCash!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
