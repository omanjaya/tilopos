import { IsString, IsOptional, IsDateString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Shift Report DTOs
// ============================================================================

export class ShiftReportQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}

export class ShiftSummaryQueryDto {
  @ApiProperty({ description: 'Outlet ID' })
  @IsString()
  outletId!: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}

// ============================================================================
// Schedule DTOs
// ============================================================================

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  outletId!: string;

  @ApiProperty({ description: 'Date (ISO 8601 date)' })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Start time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @ApiProperty({ description: 'End time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Date (ISO 8601 date)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Start time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ScheduleQueryDto {
  @ApiProperty({ description: 'Outlet ID' })
  @IsString()
  outletId!: string;

  @ApiProperty({ description: 'Start of week date (ISO 8601)' })
  @IsDateString()
  weekStart!: string;
}

// ============================================================================
// Commission DTOs
// ============================================================================

export class CommissionQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}

export class CommissionSummaryQueryDto {
  @ApiProperty({ description: 'Outlet ID' })
  @IsString()
  outletId!: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}

// ============================================================================
// Attendance DTOs
// ============================================================================

export class ClockInDto {
  @ApiProperty()
  @IsString()
  outletId!: string;
}

export class AttendanceQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}

export class AttendanceSummaryQueryDto {
  @ApiProperty({ description: 'Outlet ID' })
  @IsString()
  outletId!: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}
