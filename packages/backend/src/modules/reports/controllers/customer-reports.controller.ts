import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class CustomerReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('customers')
  @ApiOperation({ summary: 'Customer analytics report' })
  async customerReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const totalCustomers = await this.prisma.customer.count({
      where: { businessId: user.businessId, isActive: true },
    });

    const newCustomers = await this.prisma.customer.count({
      where: {
        businessId: user.businessId,
        isActive: true,
        createdAt: { gte: start, lte: end },
      },
    });

    const topCustomers = await this.prisma.customer.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { totalSpent: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        totalSpent: true,
        visitCount: true,
      },
    });

    // Returning = customers with more than one completed sale in the period (F0959)
    const repeatBuyers = await this.prisma.transaction.groupBy({
      by: ['customerId'],
      where: {
        outlet: { businessId: user.businessId },
        customerId: { not: null },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      having: { customerId: { _count: { gt: 1 } } },
      _count: { customerId: true },
    });

    return {
      totalCustomers,
      newCustomers,
      returningCustomers: repeatBuyers.length,
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        totalSpent: c.totalSpent?.toNumber() || 0,
        transactionCount: c.visitCount,
      })),
    };
  }
}
