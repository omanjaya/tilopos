import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class CustomerReportsController {

  constructor(private readonly prisma: PrismaService) {}

  @Get('customers')
  @ApiOperation({ summary: 'Customer analytics report' })
  async customerReport(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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

    return {
      totalCustomers,
      newCustomers,
      returningCustomers: totalCustomers - newCustomers,
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        totalSpent: c.totalSpent?.toNumber() || 0,
        transactionCount: c.visitCount,
      })),
    };
  }
}
