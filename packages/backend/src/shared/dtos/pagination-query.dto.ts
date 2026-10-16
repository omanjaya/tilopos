import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Standard list pagination (Docs/ENGINEERING-RULES.md R13).
 * Extend it in list query DTOs and pass `toPrismaPage(query)` to findMany.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_PAGE_SIZE;
}

export function toPrismaPage(query: { page?: number; limit?: number } = {}): {
  skip: number;
  take: number;
} {
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(query.page ?? 1, 1);
  return { skip: (page - 1) * limit, take: limit };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function paginated<T>(
  data: T[],
  total: number,
  query: { page?: number; limit?: number } = {},
): Paginated<T> {
  const { take } = toPrismaPage(query);
  const page = Math.max(query.page ?? 1, 1);
  return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
}
