import { IsString, IsOptional, IsDateString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Date ranges accept YYYY-MM-DD (a WIB business day) or a full ISO timestamp.
// The controller caps every range at MAX_REPORT_RANGE_DAYS.

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
  @IsUUID()
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
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
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
  @MaxLength(1000)
  notes?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
  @MaxLength(1000)
  notes?: string;
}

export class ScheduleQueryDto {
  @ApiProperty({ description: 'Outlet ID' })
  @IsUUID()
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
  @IsUUID()
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
  @IsUUID()
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
  @IsUUID()
  outletId!: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  to!: string;
}
