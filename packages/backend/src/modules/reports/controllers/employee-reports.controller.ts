import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class EmployeeReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('employees')
  @ApiOperation({
    summary: 'Employee performance report (sales, voids, refunds, avg items per transaction)',
  })
  async employeeReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const employeeSales = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
        employeeId: { not: null },
      },
      _sum: { grandTotal: true },
      _count: true,
      _avg: { grandTotal: true },
    });

    const employeeIds = employeeSales
      .map((e) => e.employeeId)
      .filter((id): id is string => id !== null);

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, role: true },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Void counts per employee
    const voidCounts = await this.prisma.transaction.groupBy({
      by: ['voidedBy'],
      where: {
        outletId,
        status: 'voided',
        voidedAt: { gte: start, lte: end },
        voidedBy: { not: null },
      },
      _count: true,
    });

    const voidMap = new Map(voidCounts.map((v) => [v.voidedBy, v._count]));

    // Refund counts per employee
    const refundCounts = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        outletId,
        transactionType: 'refund',
        createdAt: { gte: start, lte: end },
        employeeId: { not: null },
      },
      _count: true,
    });

    const refundMap = new Map(refundCounts.map((r) => [r.employeeId, r._count]));

    // Average items per transaction per employee
    const transactionsWithItems = await this.prisma.transaction.findMany({
      where: {
        outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
        employeeId: { in: employeeIds },
      },
      select: {
        employeeId: true,
        items: { select: { quantity: true } },
      },
    });

    const employeeItemCounts = new Map<string, { totalItems: number; transactionCount: number }>();
    for (const tx of transactionsWithItems) {
      if (!tx.employeeId) continue;
      const existing = employeeItemCounts.get(tx.employeeId) || {
        totalItems: 0,
        transactionCount: 0,
      };
      const txItemCount = tx.items.reduce((sum, item) => sum + item.quantity.toNumber(), 0);
      existing.totalItems += txItemCount;
      existing.transactionCount += 1;
      employeeItemCounts.set(tx.employeeId, existing);
    }

    const report = employeeSales.map((es) => {
      const employee = es.employeeId ? employeeMap.get(es.employeeId) : null;
      const itemData = es.employeeId ? employeeItemCounts.get(es.employeeId) : null;
      const avgItems =
        itemData && itemData.transactionCount > 0
          ? Math.round((itemData.totalItems / itemData.transactionCount) * 10) / 10
          : 0;

      return {
        employeeId: es.employeeId,
        employeeName: employee?.name || 'Unknown',
        role: employee?.role || 'unknown',
        totalSales: es._sum.grandTotal?.toNumber() || 0,
        transactionCount: es._count,
        averageTransaction: es._avg.grandTotal?.toNumber() || 0,
        voidCount: es.employeeId ? voidMap.get(es.employeeId) || 0 : 0,
        refundCount: es.employeeId ? refundMap.get(es.employeeId) || 0 : 0,
        averageItemsPerTransaction: avgItems,
      };
    });

    report.sort((a, b) => b.totalSales - a.totalSales);

    return {
      period: { start, end },
      employees: report,
      summary: {
        totalEmployees: report.length,
        totalSales: report.reduce((s, e) => s + e.totalSales, 0),
        totalTransactions: report.reduce((s, e) => s + e.transactionCount, 0),
        totalVoids: report.reduce((s, e) => s + e.voidCount, 0),
        totalRefunds: report.reduce((s, e) => s + e.refundCount, 0),
      },
    };
  }
}
