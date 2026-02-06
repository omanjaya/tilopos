import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
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
  async inventoryReport(@Query('outletId') outletId: string) {
    return this.prisma.stockLevel.findMany({
      where: { outletId },
      include: { product: true, variant: true },
    });
  }

  @Get('inventory/export')
  @ApiOperation({ summary: 'Export inventory report as PDF or Excel' })
  async exportInventoryReport(
    @Query('outletId') outletId: string,
    @Query('format') format: 'pdf' | 'excel',
    @Res() res: Response,
  ) {
    const result = await this.generateInventoryReport.execute({ outletId, format });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }
}
