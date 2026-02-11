import { Controller, Get, Query, UseGuards, Res, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GenerateInventoryReportUseCase } from '../../../application/use-cases/reports/generate-inventory-report.use-case';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class InventoryReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateInventoryReport: GenerateInventoryReportUseCase,
  ) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory stock levels report' })
  async inventoryReport(@CurrentUser() user: AuthUser, @Query('outletId') outletId: string) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId },
      include: { product: true, variant: true },
    });

    // Calculate summary
    const totalItems = stockLevels.length;
    const lowStockItems = stockLevels.filter(
      (s) => Number(s.quantity) <= s.lowStockAlert && Number(s.quantity) > 0,
    ).length;
    const outOfStockItems = stockLevels.filter((s) => Number(s.quantity) <= 0).length;
    const totalValue = stockLevels.reduce((sum, s) => {
      const cost = s.product?.costPrice || s.variant?.costPrice || 0;
      return sum + Number(s.quantity) * Number(cost);
    }, 0);

    // Format items for frontend
    const items = stockLevels.map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product?.name || s.variant?.name || 'Unknown',
      variantName: s.variant?.name || null,
      sku: s.product?.sku || s.variant?.sku || null,
      currentStock: Number(s.quantity),
      lowStockAlert: s.lowStockAlert,
      unit: s.product?.sellUnit || 'pcs',
      costPrice: Number(s.product?.costPrice || s.variant?.costPrice || 0),
      stockValue: Number(s.quantity) * Number(s.product?.costPrice || s.variant?.costPrice || 0),
    }));

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue: Math.round(totalValue),
      items,
    };
  }

  @Get('inventory/export')
  @ApiOperation({ summary: 'Export inventory report as PDF or Excel' })
  async exportInventoryReport(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('format') format: 'pdf' | 'excel',
    @Res() res: Response,
  ) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const result = await this.generateInventoryReport.execute({ outletId, format });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }
}
