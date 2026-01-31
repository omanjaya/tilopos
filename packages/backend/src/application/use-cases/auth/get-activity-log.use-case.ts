import { Injectable } from '@nestjs/common';

export interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface GetActivityLogInput {
  employeeId: string;
  page?: number;
  limit?: number;
}

export interface GetActivityLogOutput {
  activities: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetActivityLogUseCase {
  async execute(input: GetActivityLogInput): Promise<GetActivityLogOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    // Get audit logs for the employee
    // This would need to be implemented in the repository
    // For now, returning a stub response
    const activities: ActivityLogEntry[] = [];

    return {
      activities,
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
}
