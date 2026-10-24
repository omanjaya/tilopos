import { ScheduledReportRenderer } from '../scheduled-report.renderer';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GenerateSalesReportUseCase } from '@application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '@application/use-cases/reports/generate-inventory-report.use-case';
import { AnalyticsQueriesService } from '@infrastructure/services/analytics-queries.service';
import { PdfGeneratorService } from '@infrastructure/export/pdf-generator.service';
import { money } from '@shared/utils/money';

describe('scheduled report rendering', () => {
  const prisma = { outlet: { findMany: jest.fn() }, transaction: { aggregate: jest.fn() } };
  const sales = { execute: jest.fn() },
    inventory = { execute: jest.fn() },
    queries = { cogs: jest.fn() },
    pdf = { generate: jest.fn() };
  let renderer: ScheduledReportRenderer;
  const period = { startDate: '2026-10-01', endDate: '2026-10-31' };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.outlet.findMany.mockResolvedValue([{ id: 'outlet', name: 'Shop' }]);
    sales.execute.mockResolvedValue({
      buffer: Buffer.from('sales'),
      filename: 'sales.pdf',
      contentType: 'application/pdf',
    });
    inventory.execute.mockResolvedValue({
      buffer: Buffer.from('stock'),
      filename: 'stock.pdf',
      contentType: 'application/pdf',
    });
    pdf.generate.mockResolvedValue(Buffer.from('financial'));
    renderer = new ScheduledReportRenderer(
      prisma as unknown as PrismaService,
      sales as unknown as GenerateSalesReportUseCase,
      inventory as unknown as GenerateInventoryReportUseCase,
      queries as unknown as AnalyticsQueriesService,
      pdf as unknown as PdfGeneratorService,
    );
  });
  it('reuses the sales export with an explicit tenant and outlet', async () => {
    await renderer.render('business', 'sales', period);
    expect(prisma.outlet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'business' }, take: 21 }),
    );
    expect(sales.execute).toHaveBeenCalledWith({
      businessId: 'business',
      outletId: 'outlet',
      ...period,
      format: 'pdf',
    });
  });
  it('reuses the inventory snapshot export', async () => {
    await renderer.render('business', 'inventory', period);
    expect(inventory.execute).toHaveBeenCalledWith({
      businessId: 'business',
      outletId: 'outlet',
      format: 'pdf',
    });
  });
  it('computes financial revenue with Decimal and tenant-scoped queries', async () => {
    prisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { subtotal: money(100), discountAmount: money(10) } })
      .mockResolvedValueOnce({ _sum: { subtotal: money(-5) } });
    queries.cogs.mockResolvedValue(40);
    await renderer.render('business', 'financial', period);
    for (const [args] of prisma.transaction.aggregate.mock.calls)
      expect(args.where).toMatchObject({
        outletId: 'outlet',
        outlet: { businessId: 'business' },
        status: 'completed',
      });
    expect(queries.cogs).toHaveBeenCalledWith({
      outletIds: ['outlet'],
      start: new Date('2026-09-30T17:00:00Z'),
      end: new Date('2026-10-31T16:59:59.999Z'),
    });
    expect(JSON.stringify(pdf.generate.mock.calls[0][0])).toContain('85');
    expect(JSON.stringify(pdf.generate.mock.calls[0][0])).toContain('45');
  });
  it('fails honestly instead of truncating outlets or oversized attachments', async () => {
    prisma.outlet.findMany.mockResolvedValueOnce(
      Array.from({ length: 21 }, (_, i) => ({ id: String(i), name: 'Shop' })),
    );
    await expect(renderer.render('business', 'sales', period)).rejects.toThrow();
    sales.execute.mockResolvedValueOnce({
      buffer: Buffer.alloc(11 * 1024 * 1024),
      filename: 'sales.pdf',
      contentType: 'application/pdf',
    });
    await expect(renderer.render('business', 'sales', period)).rejects.toThrow();
  });
});
