import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Matches,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Login PINs are exactly 6 digits (matches the web form). */
export const PIN_PATTERN = /^\d{6}$/;
const PIN_MESSAGE = 'PIN must be exactly 6 digits';
/** Upper bound for cash amounts entered at shift open/close (Rp 1 billion). */
const MAX_CASH = 1_000_000_000;

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
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PIN_PATTERN, { message: PIN_MESSAGE })
  pin?: string;

  @ApiProperty({ enum: EMPLOYEE_ROLES })
  @IsEnum(EMPLOYEE_ROLES, {
    message: 'Role must be one of: cashier, kitchen, inventory, supervisor, manager',
  })
  role!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  hourlyRate?: number;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PIN_PATTERN, { message: PIN_MESSAGE })
  pin?: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_ROLES })
  @IsOptional()
  @IsEnum(EMPLOYEE_ROLES, {
    message: 'Role must be one of: cashier, kitchen, inventory, supervisor, manager',
  })
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StartShiftDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(MAX_CASH)
  openingCash!: number;
}

export class EndShiftDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(MAX_CASH)
  closingCash!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** GET /employees — optional outlet filter and bounded paging (response stays an array). */
export class ListEmployeesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ description: 'Case-insensitive match on name, email or phone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: [...EMPLOYEE_ROLES, 'owner'] })
  @IsOptional()
  @IsIn([...EMPLOYEE_ROLES, 'owner'])
  role?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';
}

/** GET /employees/:id/shifts — newest first, bounded paging (response stays an array). */
export class ListEmployeeShiftsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
