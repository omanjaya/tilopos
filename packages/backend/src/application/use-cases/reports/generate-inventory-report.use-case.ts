import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ExcelGeneratorService } from '@infrastructure/export/excel-generator.service';

export interface GenerateInventoryReportInput {
  outletId: string;
  format: 'pdf' | 'excel';
}

@Injectable()
export class GenerateInventoryReportUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  async execute(
    input: GenerateInventoryReportInput,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId: input.outletId },
      include: { product: true, variant: true },
    });

    const rows = stockLevels.map((sl) => ({
      productName: sl.product?.name || 'Unknown',
      sku: sl.product?.sku || '',
      currentStock: sl.quantity.toNumber(),
      lowStockAlert: sl.lowStockAlert,
      status: sl.quantity.toNumber() <= sl.lowStockAlert ? 'LOW' : 'OK',
    }));

    const buffer = await this.excelGenerator.generateInventoryReport({
      title: 'Inventory Report',
      rows,
    });

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }
}
