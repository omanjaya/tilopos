import { BadRequestException } from '@nestjs/common';

export function getDateRange(
  dateRange?: string,
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (startDate && endDate) {
    const start = new Date(startDate);
    const endParsed = new Date(endDate);

    // Validation: start date must be before or equal to end date
    if (start > endParsed) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    // Validation: dates must be valid
    if (isNaN(start.getTime()) || isNaN(endParsed.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    return { start, end: endParsed };
  }

  switch (dateRange) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
    case 'this_month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
  }
}
