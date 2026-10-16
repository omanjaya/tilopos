import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';
import type { ListStockOpnameQueryDto } from '@application/dtos/stock-opname.dto';
import { OPNAME_DETAIL_INCLUDE } from '@application/use-cases/stock-opname/opname-common';

/** Read side of stock opname (list/detail), kept out of the controller (R18). */
@Injectable()
export class StockOpnameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  /**
   * Newest-first list (plain array, max 100 per page). Counted/discrepancy counts come
   * from two grouped queries instead of one query per opname.
   */
  async list(user: AuthUser, query: ListStockOpnameQueryDto) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    const where: Prisma.StockOpnameWhereInput = {
      outletId: { in: outletIds },
      outlet: { businessId: user.businessId },
      ...(query.status && { status: query.status }),
    };
    const take = query.limit ?? MAX_PAGE_SIZE;
    const skip = ((query.page ?? 1) - 1) * take;

    const opnames = await this.prisma.stockOpname.findMany({
      where,
      include: {
        outlet: { select: { name: true } },
        createdByEmployee: { select: { name: true } },
        approvedByEmployee: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    if (opnames.length === 0) return [];

    const ids = opnames.map((o) => o.id);
    const [counted, discrepant] = await Promise.all([
      this.prisma.stockOpnameItem.groupBy({
        by: ['opnameId'],
        where: { opnameId: { in: ids }, actualQuantity: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.stockOpnameItem.groupBy({
        by: ['opnameId'],
        where: { opnameId: { in: ids }, difference: { not: 0 } },
        _count: { _all: true },
      }),
    ]);
    const countedMap = new Map(counted.map((c) => [c.opnameId, c._count._all]));
    const discrepantMap = new Map(discrepant.map((c) => [c.opnameId, c._count._all]));

    return opnames.map(({ _count, ...o }) => ({
      ...o,
      itemCount: _count.items,
      countedCount: countedMap.get(o.id) ?? 0,
      discrepancyCount: discrepantMap.get(o.id) ?? 0,
    }));
  }

  async getById(user: AuthUser, id: string) {
    const opname = await this.prisma.stockOpname.findFirst({
      where: { id, outlet: { businessId: user.businessId } },
      include: OPNAME_DETAIL_INCLUDE,
    });
    if (!opname) throw new NotFoundException('Stock opname not found');
    return opname;
  }
}
