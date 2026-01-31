import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PdfGeneratorService } from '@infrastructure/export/pdf-generator.service';
import { ExcelGeneratorService } from '@infrastructure/export/excel-generator.service';

export interface GenerateSalesReportInput {
  outletId: string;
  startDate: string;
  endDate: string;
  format: 'pdf' | 'excel';
}

@Injectable()
export class GenerateSalesReportUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  async execute(input: GenerateSalesReportInput): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    const transactions = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        outletId: input.outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      _sum: { grandTotal: true, subtotal: true, discountAmount: true, taxAmount: true },
      _count: true,
    });

    const rows = transactions.map(t => ({
      date: t.createdAt.toISOString().split('T')[0],
      transactions: t._count,
      totalSales: t._sum.grandTotal?.toNumber() || 0,
      discount: t._sum.discountAmount?.toNumber() || 0,
      tax: t._sum.taxAmount?.toNumber() || 0,
      netSales: (t._sum.subtotal?.toNumber() || 0) - (t._sum.discountAmount?.toNumber() || 0),
    }));

    const totals = {
      transactions: rows.reduce((s, r) => s + (r.transactions as number), 0),
      totalSales: rows.reduce((s, r) => s + r.totalSales, 0),
      discount: rows.reduce((s, r) => s + r.discount, 0),
      tax: rows.reduce((s, r) => s + r.tax, 0),
      netSales: rows.reduce((s, r) => s + r.netSales, 0),
    };

    const title = 'Sales Report';
    const period = `${input.startDate} - ${input.endDate}`;

    if (input.format === 'pdf') {
      const docDef = this.pdfGenerator.buildSalesReport({ title, period, rows, totals });
      const buffer = await this.pdfGenerator.generate(docDef);
      return { buffer, contentType: 'application/pdf', filename: `sales-report-${input.startDate}.pdf` };
    }

    const buffer = await this.excelGenerator.generateSalesReport({ title, period, rows, totals });
    return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `sales-report-${input.startDate}.xlsx` };
  }
}
