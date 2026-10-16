import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { money, toNumber } from '@shared/utils/money';
import { GenerateInventoryReportUseCase } from '../../../application/use-cases/reports/generate-inventory-report.use-case';
import {
  InventoryExportQueryDto,
  ReportQueryDto,
} from '../../../application/dtos/report-query.dto';
import { canViewCostData } from '../utils/report-access';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class InventoryReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly generateInventoryReport: GenerateInventoryReportUseCase,
  ) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory stock levels report' })
  async inventoryReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const showCost = canViewCostData(user.role);

    // Only the columns the report needs (F0956)
    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId },
      select: {
        id: true,
        productId: true,
        quantity: true,
        lowStockAlert: true,
        product: { select: { name: true, sku: true, sellUnit: true, costPrice: true } },
        variant: { select: { name: true, sku: true, costPrice: true } },
      },
    });

    let totalValue = money(0);
    let lowStockItems = 0;
    let outOfStockItems = 0;

    const items = stockLevels.map((s) => {
      const qty = money(s.quantity);
      // Variant stock is valued at the variant cost, falling back to the product cost
      const cost = money(s.variant?.costPrice ?? s.product?.costPrice ?? 0);
      const value = qty.times(cost);
      totalValue = totalValue.plus(value);
      if (qty.lte(0)) outOfStockItems++;
      else if (qty.lte(s.lowStockAlert)) lowStockItems++;

      return {
        id: s.id,
        productId: s.productId,
        productName: s.product?.name || s.variant?.name || 'Unknown',
        variantName: s.variant?.name || null,
        sku: s.variant?.sku || s.product?.sku || null,
        currentStock: toNumber(qty),
        lowStockAlert: s.lowStockAlert,
        unit: s.product?.sellUnit || 'pcs',
        // Cost data only for manager and above (R12)
        costPrice: showCost ? toNumber(cost) : null,
        stockValue: showCost ? toNumber(value) : null,
      };
    });

    return {
      totalItems: stockLevels.length,
      lowStockItems,
      outOfStockItems,
      totalValue: showCost ? Math.round(toNumber(totalValue)) : null,
      items,
    };
  }

  @Get('inventory/export')
  @ApiOperation({ summary: 'Export inventory report as PDF or Excel' })
  async exportInventoryReport(
    @CurrentUser() user: AuthUser,
    @Query() query: InventoryExportQueryDto,
    @Res() res: Response,
  ) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

    const result = await this.generateInventoryReport.execute({
      businessId: user.businessId,
      outletId,
      format: query.format,
    });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }
}
