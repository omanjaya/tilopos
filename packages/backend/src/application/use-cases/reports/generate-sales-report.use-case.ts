import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PdfGeneratorService } from '@infrastructure/export/pdf-generator.service';
import { ExcelGeneratorService } from '@infrastructure/export/excel-generator.service';
import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import {
  parseBusinessDate,
  startOfBusinessMonth,
  endOfBusinessDay,
} from '@shared/utils/business-time';
import { money, toNumber } from '@shared/utils/money';

/** Longest export range (R13). */
const MAX_EXPORT_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD of an instant in WIB. */
function wibDateKey(date: Date): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface GenerateSalesReportInput {
  /** Caller's business — the outlet must belong to it (R3). */
  businessId: string;
  outletId: string;
  /** YYYY-MM-DD business dates (WIB). Defaults to the current business month. */
  startDate?: string;
  endDate?: string;
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
    let start: Date;
    let end: Date;
    try {
      start = input.startDate ? parseBusinessDate(input.startDate).start : startOfBusinessMonth();
      end = input.endDate ? parseBusinessDate(input.endDate).end : endOfBusinessDay();
    } catch {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }
    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }
    if (end.getTime() - start.getTime() > MAX_EXPORT_DAYS * DAY_MS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_EXPORT_DAYS} days`);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId: input.outletId,
        outlet: { businessId: input.businessId },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      take: 20001,
      select: {
        createdAt: true,
        grandTotal: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
      },
    });
    if (transactions.length > 20000)
      throw new BadRequestException('Report exceeds 20000 rows; narrow the report scope');

    // Group by WIB business day, summing in Decimal (R8/R14)
    const zero = money(0);
    const grouped = new Map<
      string,
      {
        count: number;
        grandTotal: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        discount: Prisma.Decimal;
        tax: Prisma.Decimal;
      }
    >();
    for (const t of transactions) {
      const dateKey = wibDateKey(t.createdAt);
      const existing = grouped.get(dateKey) || {
        count: 0,
        grandTotal: zero,
        subtotal: zero,
        discount: zero,
        tax: zero,
      };
      existing.count++;
      existing.grandTotal = existing.grandTotal.plus(money(t.grandTotal));
      existing.subtotal = existing.subtotal.plus(money(t.subtotal));
      existing.discount = existing.discount.plus(money(t.discountAmount));
      existing.tax = existing.tax.plus(money(t.taxAmount));
      grouped.set(dateKey, existing);
    }

    const sorted = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    const rows = sorted.map(([date, data]) => ({
      date,
      transactions: data.count,
      totalSales: toNumber(data.grandTotal),
      discount: toNumber(data.discount),
      tax: toNumber(data.tax),
      netSales: toNumber(data.subtotal.minus(data.discount)),
    }));

    const sum = (pick: (d: (typeof sorted)[number][1]) => Prisma.Decimal) =>
      toNumber(sorted.reduce((acc, [, d]) => acc.plus(pick(d)), zero));
    const totals = {
      transactions: rows.reduce((s, r) => s + r.transactions, 0),
      totalSales: sum((d) => d.grandTotal),
      discount: sum((d) => d.discount),
      tax: sum((d) => d.tax),
      netSales: sum((d) => d.subtotal.minus(d.discount)),
    };

    const startLabel = input.startDate ?? wibDateKey(start);
    const endLabel = input.endDate ?? wibDateKey(end);

    const title = 'Sales Report';
    const period = `${startLabel} - ${endLabel}`;

    if (input.format === 'pdf') {
      const docDef = this.pdfGenerator.buildSalesReport({ title, period, rows, totals });
      const buffer = await this.pdfGenerator.generate(docDef);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `sales-report-${startLabel}.pdf`,
      };
    }

    const buffer = await this.excelGenerator.generateSalesReport({ title, period, rows, totals });
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `sales-report-${startLabel}.xlsx`,
    };
  }
}
