import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface GetTablesParams {
  /** Outlets already verified by TenantAccessService (never empty-means-all). */
  outletIds: string[];
  section?: string;
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
  activeOnly?: boolean;
}

@Injectable()
export class GetTablesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GetTablesParams) {
    if (params.outletIds.length === 0) {
      return [];
    }
    const where: Prisma.TableWhereInput = {
      outletId: { in: params.outletIds },
      ...(params.section && { section: params.section }),
      ...(params.status && { status: params.status }),
      ...((params.activeOnly || params.section || params.status) && { isActive: true }),
    };
    const tables = await this.prisma.table.findMany({
      where,
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
      take: 1000,
    });
    return tables.map((t) => ({
      id: t.id,
      outletId: t.outletId,
      name: t.name,
      capacity: t.capacity,
      section: t.section,
      positionX: t.positionX,
      positionY: t.positionY,
      status: t.status,
      currentOrderId: t.currentOrderId,
      occupiedAt: t.occupiedAt,
      isActive: t.isActive,
      createdAt: t.createdAt,
    }));
  }
}
