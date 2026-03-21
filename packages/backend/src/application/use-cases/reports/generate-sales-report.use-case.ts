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

  async execute(
    input: GenerateSalesReportInput,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId: input.outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        grandTotal: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
      },
    });

    // Group by date string instead of exact timestamp
    const grouped = new Map<
      string,
      { count: number; grandTotal: number; subtotal: number; discount: number; tax: number }
    >();
    for (const t of transactions) {
      const dateKey = t.createdAt.toISOString().split('T')[0];
      const existing = grouped.get(dateKey) || {
        count: 0,
        grandTotal: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
      };
      existing.count++;
      existing.grandTotal += t.grandTotal?.toNumber?.() ?? Number(t.grandTotal) ?? 0;
      existing.subtotal += t.subtotal?.toNumber?.() ?? Number(t.subtotal) ?? 0;
      existing.discount += t.discountAmount?.toNumber?.() ?? Number(t.discountAmount) ?? 0;
      existing.tax += t.taxAmount?.toNumber?.() ?? Number(t.taxAmount) ?? 0;
      grouped.set(dateKey, existing);
    }

    const rows = Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      transactions: data.count,
      totalSales: data.grandTotal,
      discount: data.discount,
      tax: data.tax,
      netSales: data.subtotal - data.discount,
    }));

    const totals = {
      transactions: rows.reduce((s, r) => s + r.transactions, 0),
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
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `sales-report-${input.startDate}.pdf`,
      };
    }

    const buffer = await this.excelGenerator.generateSalesReport({ title, period, rows, totals });
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `sales-report-${input.startDate}.xlsx`,
    };
  }
}
