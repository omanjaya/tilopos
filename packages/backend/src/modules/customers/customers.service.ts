import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { toNumber } from '../../shared/utils/money';
import { paginated, toPrismaPage, type Paginated } from '../../shared/dtos/pagination-query.dto';
import {
  MAX_IMPORT_ROWS,
  type CustomerImportRow,
  type CustomerImportResult,
  type CustomerImportResultError,
  type BirthdayCustomer,
} from '../../application/dtos/customer-import-export.dto';
import type {
  CreateCustomerDto,
  CustomerListQueryDto,
  UpdateCustomerDto,
} from '../../application/dtos/customer.dto';
import type {
  PurchaseHistoryResult,
  PurchaseHistoryTransaction,
  PurchaseHistoryItem,
  PurchaseHistoryPayment,
  ExportCustomerData,
  SegmentName,
} from './customers.types';
import { CustomerSegmentsService } from './customer-segments.service';
import { DEFAULT_LOYALTY_TIER } from '../../application/use-cases/loyalty/loyalty-tier.util';

/** Legacy GET /customers without page/limit returns at most this many rows. */
export const MAX_UNPAGED_CUSTOMERS = 1000;
/** Hard cap for CSV/JSON exports (R13). */
export const MAX_EXPORT_CUSTOMERS = 20_000;
const IMPORT_CHUNK = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields returned for a customer (no internal credit fields). */
const CUSTOMER_SELECT = {
  id: true,
  businessId: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  dateOfBirth: true,
  notes: true,
  customerType: true,
  loyaltyPoints: true,
  loyaltyTier: true,
  totalSpent: true,
  visitCount: true,
  lastVisitAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CustomerSelect;

type CustomerRowSelected = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;

export type CustomerView = Omit<CustomerRowSelected, 'totalSpent' | 'dateOfBirth'> & {
  totalSpent: number;
  dateOfBirth: string | null;
};

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    items: {
      select: {
        productName: true;
        variantName: true;
        quantity: true;
        unitPrice: true;
        subtotal: true;
      };
    };
    payments: { select: { paymentMethod: true; amount: true } };
  };
}>;

/**
 * Customer management: CRUD (tenant-scoped), purchase history, birthdays,
 * import/export. Segmentation lives in CustomerSegmentsService.
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentsService: CustomerSegmentsService,
  ) {}

  // ==================== CRUD ====================

  async list(
    businessId: string,
    query: CustomerListQueryDto,
  ): Promise<CustomerView[] | Paginated<CustomerView>> {
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      businessId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (query.page === undefined && query.limit === undefined) {
      const rows = await this.prisma.customer.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: { name: 'asc' },
        take: MAX_UNPAGED_CUSTOMERS,
      });
      return rows.map((r) => this.toView(r));
    }

    const page = toPrismaPage(query);
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...page,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginated(
      rows.map((r) => this.toView(r)),
      total,
      query,
    );
  }

  async findOne(businessId: string, id: string): Promise<CustomerView> {
    const row = await this.prisma.customer.findFirst({
      where: { id, businessId },
      select: CUSTOMER_SELECT,
    });
    if (!row) throw new NotFoundException('Customer not found');
    return this.toView(row);
  }

  async create(businessId: string, dto: CreateCustomerDto): Promise<CustomerView> {
    await this.assertNoDuplicate(businessId, dto.email, dto.phone);
    const created = await this.prisma.customer.create({
      data: {
        businessId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        dateOfBirth: dto.dateOfBirth ? this.toDateOnly(dto.dateOfBirth) : null,
      },
      select: CUSTOMER_SELECT,
    });
    return this.toView(created);
  }

  /** Explicit field mapping: loyalty/spend fields are never client-writable (R7). */
  async update(businessId: string, id: string, dto: UpdateCustomerDto): Promise<CustomerView> {
    const data: Prisma.CustomerUpdateManyMutationInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth ? this.toDateOnly(dto.dateOfBirth) : null;
    }

    if (dto.email || dto.phone) {
      await this.assertNoDuplicate(businessId, dto.email ?? undefined, dto.phone ?? undefined, id);
    }

    const { count } = await this.prisma.customer.updateMany({ where: { id, businessId }, data });
    if (count === 0) throw new NotFoundException('Customer not found');
    return this.findOne(businessId, id);
  }

  async deactivate(businessId: string, id: string): Promise<void> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, businessId },
      data: { isActive: false },
    });
    if (count === 0) throw new NotFoundException('Customer not found');
  }

  private async assertNoDuplicate(
    businessId: string,
    email: string | undefined,
    phone: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    const or: Prisma.CustomerWhereInput[] = [];
    if (email) or.push({ email: { equals: email, mode: 'insensitive' } });
    if (phone) or.push({ phone });
    if (or.length === 0) return;
    const existing = await this.prisma.customer.findFirst({
      where: {
        businessId,
        isActive: true,
        OR: or,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { email: true, phone: true },
    });
    if (!existing) return;
    if (email && existing.email?.toLowerCase() === email.toLowerCase()) {
      throw new ConflictException('A customer with this email already exists');
    }
    throw new ConflictException('A customer with this phone number already exists');
  }

  private toView(row: CustomerRowSelected): CustomerView {
    return {
      ...row,
      totalSpent: toNumber(row.totalSpent),
      dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString().slice(0, 10) : null,
    };
  }

  /** `YYYY-MM-DD` → Date for a @db.Date column (UTC midnight of that calendar date). */
  private toDateOnly(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Invalid dateOfBirth');
    }
    return date;
  }

  // ==================== Segment Management ====================

  async getSegmentsSummary(businessId: string) {
    return this.segmentsService.getSegmentsSummary(businessId);
  }

  async getCustomersBySegment(
    businessId: string,
    segment: SegmentName,
    page?: { page?: number; limit?: number },
  ) {
    return this.segmentsService.getCustomersBySegment(businessId, segment, page);
  }

  // ==================== Purchase History ====================

  async getPurchaseHistory(
    businessId: string,
    customerId: string,
    limit: number,
    offset: number,
  ): Promise<PurchaseHistoryResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const where: Prisma.TransactionWhereInput = {
      customerId,
      outlet: { businessId },
      status: 'completed',
    };
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          items: {
            select: {
              productName: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
            },
          },
          payments: { select: { paymentMethod: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 100),
        skip: Math.max(offset, 0),
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      customerId,
      total,
      transactions: transactions.map((tx) => this.mapTransactionToHistory(tx)),
    };
  }

  private mapTransactionToHistory(tx: TransactionWithRelations): PurchaseHistoryTransaction {
    return {
      id: tx.id,
      receiptNumber: tx.receiptNumber,
      transactionType: tx.transactionType,
      subtotal: tx.subtotal.toNumber(),
      discountAmount: tx.discountAmount.toNumber(),
      taxAmount: tx.taxAmount.toNumber(),
      grandTotal: tx.grandTotal.toNumber(),
      status: tx.status,
      createdAt: tx.createdAt,
      items: tx.items.map(
        (item): PurchaseHistoryItem => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity.toNumber(),
          unitPrice: item.unitPrice.toNumber(),
          subtotal: item.subtotal.toNumber(),
        }),
      ),
      payments: tx.payments.map(
        (p): PurchaseHistoryPayment => ({
          method: p.paymentMethod,
          amount: p.amount.toNumber(),
        }),
      ),
    };
  }

  // ==================== Birthday Features ====================

  /** Customers whose birthday (calendar date in WIB) falls within `daysAhead` days. */
  async getUpcomingBirthdays(
    businessId: string,
    daysAhead: number = 7,
    now: Date = new Date(),
  ): Promise<BirthdayCustomer[]> {
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true, dateOfBirth: { not: null } },
      select: { id: true, name: true, email: true, phone: true, dateOfBirth: true },
      take: MAX_EXPORT_CUSTOMERS,
    });

    const results: BirthdayCustomer[] = [];
    for (const customer of customers) {
      if (!customer.dateOfBirth) continue;
      const daysUntil = daysUntilBirthday(customer.dateOfBirth, now);
      if (daysUntil <= daysAhead) {
        results.push({
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          birthday: customer.dateOfBirth,
          daysUntilBirthday: daysUntil,
        });
      }
    }
    return results.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  }

  /**
   * There is no customer-facing channel (email/WhatsApp to customers) wired yet,
   * so nothing can be delivered. Fail honestly instead of logging fake "sent"
   * notifications (R10).
   */
  async sendBirthdayNotifications(
    _businessId: string,
    _customerIds: string[],
  ): Promise<{ notified: number }> {
    throw new NotImplementedException({
      success: false,
      reason: 'NOT_CONFIGURED',
      message: 'Birthday notifications to customers are not available yet',
    });
  }

  // ==================== Customer Import/Export ====================

  /**
   * Imports rows in bulk: validates each row, skips duplicates (existing customers
   * are prefetched in one query, duplicates inside the file are detected in memory)
   * and inserts with createMany in chunks inside one DB transaction.
   */
  async importCustomers(
    businessId: string,
    rows: CustomerImportRow[],
  ): Promise<CustomerImportResult> {
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import is limited to ${MAX_IMPORT_ROWS} rows per request`);
    }

    const errors: CustomerImportResultError[] = [];
    let skipped = 0;

    const tierRows = await this.prisma.loyaltyTier.findMany({
      where: { businessId },
      select: { name: true },
    });
    const validTiers = new Map<string, string>(
      [DEFAULT_LOYALTY_TIER, ...tierRows.map((t) => t.name)].map((n) => [n.toLowerCase(), n]),
    );

    const emails = rows.map((r) => r.email?.trim().toLowerCase()).filter((e): e is string => !!e);
    const phones = rows.map((r) => r.phone?.trim()).filter((p): p is string => !!p);
    const existing =
      emails.length || phones.length
        ? await this.prisma.customer.findMany({
            where: {
              businessId,
              OR: [
                ...(emails.length ? [{ email: { in: emails, mode: 'insensitive' as const } }] : []),
                ...(phones.length ? [{ phone: { in: phones } }] : []),
              ],
            },
            select: { email: true, phone: true },
          })
        : [];
    const seenEmails = new Set(existing.map((c) => c.email?.toLowerCase()).filter(Boolean));
    const seenPhones = new Set(existing.map((c) => c.phone).filter(Boolean));

    const toCreate: Prisma.CustomerCreateManyInput[] = [];
    rows.forEach((row, i) => {
      const rowNum = i + 1;
      const name = row.name?.trim() ?? '';
      if (!name) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
        return;
      }
      if (name.length > 255) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is longer than 255 characters' });
        return;
      }
      const email = row.email?.trim() || null;
      if (email && (!EMAIL_PATTERN.test(email) || email.length > 255)) {
        errors.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
        return;
      }
      const phone = row.phone?.trim() || null;
      if (phone && phone.length > 20) {
        errors.push({ row: rowNum, field: 'phone', message: 'Phone is longer than 20 characters' });
        return;
      }
      const { dateOfBirth, error: dateError } = this.parseBirthday(row.birthday);
      if (dateError) {
        errors.push({ row: rowNum, field: 'birthday', message: dateError });
        return;
      }
      if ((email && seenEmails.has(email.toLowerCase())) || (phone && seenPhones.has(phone))) {
        skipped++;
        return;
      }
      if (email) seenEmails.add(email.toLowerCase());
      if (phone) seenPhones.add(phone);

      const tier = row.loyaltyTier
        ? (validTiers.get(row.loyaltyTier.trim().toLowerCase()) ?? DEFAULT_LOYALTY_TIER)
        : DEFAULT_LOYALTY_TIER;

      toCreate.push({
        businessId,
        name,
        email,
        phone,
        dateOfBirth,
        loyaltyTier: tier,
        address: row.address?.slice(0, 1000) || null,
        notes: row.notes?.slice(0, 2000) || null,
      });
    });

    let imported = 0;
    if (toCreate.length > 0) {
      imported = await this.prisma.$transaction(async (tx) => {
        let count = 0;
        for (let i = 0; i < toCreate.length; i += IMPORT_CHUNK) {
          const res = await tx.customer.createMany({ data: toCreate.slice(i, i + IMPORT_CHUNK) });
          count += res.count;
        }
        return count;
      });
    }

    this.logger.log(
      `Customer import: ${imported} imported, ${skipped} skipped, ${errors.length} failed`,
    );
    return { imported, skipped, failed: errors.length, errors };
  }

  parseCsvToCustomerRows(csvData: string): CustomerImportRow[] {
    const lines = csvData.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];
    if (lines.length - 1 > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import is limited to ${MAX_IMPORT_ROWS} rows per request`);
    }

    return lines.slice(1).map((line) => {
      const fields = this.parseCsvLine(line);
      return {
        name: fields[0]?.trim() || '',
        email: fields[1]?.trim() || undefined,
        phone: fields[2]?.trim() || undefined,
        birthday: fields[3]?.trim() || undefined,
        loyaltyTier: fields[4]?.trim() || undefined,
      };
    });
  }

  parseJsonToCustomerRows(jsonData: string): CustomerImportRow[] {
    const parsed: unknown = JSON.parse(jsonData);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON data must be an array');
    }
    if (parsed.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import is limited to ${MAX_IMPORT_ROWS} rows per request`);
    }

    return parsed.map((raw: unknown) => {
      const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      return {
        name: String(item['name'] ?? ''),
        email: item['email'] ? String(item['email']) : undefined,
        phone: item['phone'] ? String(item['phone']) : undefined,
        birthday: item['birthday'] ? String(item['birthday']) : undefined,
        loyaltyTier: item['loyaltyTier'] ? String(item['loyaltyTier']) : undefined,
      };
    });
  }

  async exportCustomersCsv(businessId: string, segment?: SegmentName): Promise<string> {
    const customers = await this.getCustomersForExport(businessId, segment);
    return this.formatCustomersAsCsv(customers);
  }

  async exportCustomersJson(businessId: string, segment?: SegmentName): Promise<string> {
    const customers = await this.getCustomersForExport(businessId, segment);
    return this.formatCustomersAsJson(customers);
  }

  private async getCustomersForExport(
    businessId: string,
    segment?: SegmentName,
  ): Promise<ExportCustomerData[]> {
    let where: Prisma.CustomerWhereInput = { businessId, isActive: true };
    if (segment) {
      const vipThreshold =
        segment === 'vip' ? await this.segmentsService.vipThreshold(businessId) : null;
      if (segment === 'vip' && vipThreshold === null) return [];
      where = this.segmentsService.segmentWhere(businessId, segment, new Date(), vipThreshold);
    }

    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        loyaltyTier: true,
        loyaltyPoints: true,
        totalSpent: true,
        visitCount: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: MAX_EXPORT_CUSTOMERS,
    });

    return customers.map((c) => ({ ...c, totalSpent: toNumber(c.totalSpent) }));
  }

  private formatCustomersAsCsv(customers: ExportCustomerData[]): string {
    const header =
      'Name,Email,Phone,Birthday,Loyalty Tier,Loyalty Points,Total Spent,Visit Count,Created At';
    const rows = customers.map((c) =>
      [
        escapeCsvField(c.name),
        escapeCsvField(c.email || ''),
        escapeCsvField(c.phone || ''),
        c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : '',
        escapeCsvField(c.loyaltyTier),
        c.loyaltyPoints.toString(),
        c.totalSpent.toString(),
        c.visitCount.toString(),
        c.createdAt.toISOString(),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  private formatCustomersAsJson(customers: ExportCustomerData[]): string {
    const data = customers.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      birthday: c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : null,
      loyaltyTier: c.loyaltyTier,
      loyaltyPoints: c.loyaltyPoints,
      totalSpent: c.totalSpent,
      visitCount: c.visitCount,
      createdAt: c.createdAt.toISOString(),
    }));
    return JSON.stringify(data, null, 2);
  }

  // ==================== Private Helper Methods ====================

  /** Accepts `YYYY-MM-DD` (stored as that calendar date) or any parseable date. */
  private parseBirthday(birthday?: string): { dateOfBirth: Date | null; error?: string } {
    if (!birthday) return { dateOfBirth: null };
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      const date = new Date(`${birthday}T00:00:00.000Z`);
      if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) {
        return { dateOfBirth: null, error: 'Invalid date format' };
      }
      return { dateOfBirth: date };
    }
    const parsed = new Date(birthday);
    if (isNaN(parsed.getTime())) {
      return { dateOfBirth: null, error: 'Invalid date format' };
    }
    // Keep the calendar date as seen in WIB.
    const wibDate = new Date(parsed.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
    return { dateOfBirth: new Date(`${wibDate}T00:00:00.000Z`) };
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  }
}

/**
 * Escapes a CSV cell and neutralises spreadsheet formulas (CSV injection):
 * cells starting with = + - @ TAB or CR are prefixed with a single quote.
 */
export function escapeCsvField(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Whole days from today (WIB calendar) until the next birthday. A birthday today is 0.
 * `dateOfBirth` is a @db.Date value (UTC midnight of the calendar date).
 */
export function daysUntilBirthday(dateOfBirth: Date, now: Date): number {
  const today = new Date(now.getTime() + WIB_OFFSET_MS);
  const y = today.getUTCFullYear();
  const todayUtc = Date.UTC(y, today.getUTCMonth(), today.getUTCDate());
  const month = dateOfBirth.getUTCMonth();
  const day = dateOfBirth.getUTCDate();
  let next = Date.UTC(y, month, day);
  if (next < todayUtc) next = Date.UTC(y + 1, month, day);
  return Math.round((next - todayUtc) / DAY_MS);
}
