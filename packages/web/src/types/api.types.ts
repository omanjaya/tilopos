export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
  /** Extra machine-readable context, e.g. { retryAfterSeconds } for ACCOUNT_LOCKED. */
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
