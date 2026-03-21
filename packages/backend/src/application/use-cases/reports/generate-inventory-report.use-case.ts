import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PdfGeneratorService } from '@infrastructure/export/pdf-generator.service';
import { ExcelGeneratorService } from '@infrastructure/export/excel-generator.service';
import type { Content } from 'pdfmake/interfaces';

export interface GenerateInventoryReportInput {
  outletId: string;
  format: 'pdf' | 'excel';
}

@Injectable()
export class GenerateInventoryReportUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
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

    const dateStr = new Date().toISOString().split('T')[0];

    if (input.format === 'pdf') {
      const tableBody: Content[][] = [
        [
          { text: 'Product', bold: true },
          { text: 'SKU', bold: true },
          { text: 'Stock', bold: true },
          { text: 'Low Alert', bold: true },
          { text: 'Status', bold: true },
        ],
      ];

      for (const row of rows) {
        tableBody.push([
          String(row.productName),
          String(row.sku),
          String(row.currentStock),
          String(row.lowStockAlert),
          String(row.status),
        ]);
      }

      const docDef = {
        defaultStyle: { font: 'Helvetica' as const },
        content: [
          { text: 'Inventory Report', style: 'header' },
          { text: `Date: ${dateStr}`, style: 'subheader' },
          { text: '\n' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto'] as ('*' | 'auto')[],
              body: tableBody,
            },
          },
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10] as [number, number, number, number],
          },
          subheader: { fontSize: 12, color: 'grey' },
        },
      };

      const buffer = await this.pdfGenerator.generate(docDef);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `inventory-report-${dateStr}.pdf`,
      };
    }

    const buffer = await this.excelGenerator.generateInventoryReport({
      title: 'Inventory Report',
      rows,
    });

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `inventory-report-${dateStr}.xlsx`,
    };
  }
}
