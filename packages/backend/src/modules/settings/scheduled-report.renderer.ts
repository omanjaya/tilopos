import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GenerateSalesReportUseCase } from '@application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '@application/use-cases/reports/generate-inventory-report.use-case';
import { AnalyticsQueriesService } from '@infrastructure/services/analytics-queries.service';
import { PdfGeneratorService } from '@infrastructure/export/pdf-generator.service';
import { parseBusinessDate } from '@shared/utils/business-time';
import { money } from '@shared/utils/money';
import { computeProfit } from '@modules/reports/utils/profit.util';
import type { EmailOptions } from '@infrastructure/notifications/email/email.service';
import type { ReportScheduleData } from '@infrastructure/repositories/settings/report-schedule.repository';

@Injectable()
export class ScheduledReportRenderer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: GenerateSalesReportUseCase,
    private readonly inventory: GenerateInventoryReportUseCase,
    private readonly queries: AnalyticsQueriesService,
    private readonly pdf: PdfGeneratorService,
  ) {}

  async render(
    businessId: string,
    reportType: ReportScheduleData['reportType'],
    period: { startDate: string; endDate: string },
  ): Promise<NonNullable<EmailOptions['attachments']>> {
    // All outlets belong to the persisted schedule's business. No client-supplied scope.
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
      take: 21,
    });
    if (!outlets.length) throw new BadRequestException('No outlets available for the report');
    if (outlets.length > 20)
      throw new BadRequestException('Scheduled reports support at most 20 outlets');
    const attachments: NonNullable<EmailOptions['attachments']> = [];
    let size = 0;
    for (const outlet of outlets) {
      const input = { businessId, outletId: outlet.id, format: 'pdf' as const };
      const report =
        reportType === 'sales'
          ? await this.sales.execute({ ...input, ...period })
          : reportType === 'inventory'
            ? await this.inventory.execute(input)
            : await this.financial(businessId, outlet.id, outlet.name, period);
      size += report.buffer.length;
      if (size > 10 * 1024 * 1024) throw new BadRequestException('Report attachments exceed 10 MB');
      const name = outlet.name.replace(/[^a-zA-Z0-9 _-]/g, '_').slice(0, 60);
      attachments.push({
        filename: `${name}-${outlet.id}-${report.filename}`,
        content: report.buffer,
        contentType: report.contentType,
      });
    }
    return attachments;
  }

  private async financial(
    businessId: string,
    outletId: string,
    outletName: string,
    period: { startDate: string; endDate: string },
  ) {
    const start = parseBusinessDate(period.startDate).start;
    const end = parseBusinessDate(period.endDate).end;
    const where = {
      outletId,
      outlet: { businessId },
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };
    const [sales, refunds, cogs] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, transactionType: 'sale' },
        _sum: { subtotal: true, discountAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, transactionType: 'refund' },
        _sum: { subtotal: true },
      }),
      this.queries.cogs({ outletIds: [outletId], start, end }),
    ]);
    const profit = computeProfit({
      grossSales: sales._sum.subtotal,
      discounts: sales._sum.discountAmount,
      refunds: money(refunds._sum.subtotal).abs(),
      cogs,
    });
    const buffer = await this.pdf.generate({
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: `Laporan Keuangan - ${outletName}`, fontSize: 18, bold: true },
        { text: `${period.startDate} - ${period.endDate} (WIB)`, margin: [0, 10, 0, 10] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              ['Pendapatan neto (Rp)', String(profit.netRevenue)],
              ['Harga pokok penjualan (Rp)', String(profit.expenses)],
              ['Laba kotor (Rp)', String(profit.netProfit)],
              ['Margin laba kotor (%)', String(profit.profitMargin)],
            ],
          },
        },
        {
          text: 'Pendapatan setelah diskon dan refund, tidak termasuk pajak/biaya layanan. Biaya hanya HPP; mengikuti perhitungan laporan keuangan aplikasi.',
          margin: [0, 10, 0, 0],
        },
      ],
    });
    return {
      buffer,
      filename: `financial-report-${period.startDate}.pdf`,
      contentType: 'application/pdf',
    };
  }
}
