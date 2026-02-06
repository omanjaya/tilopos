import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
  CustomerImportRow,
  CustomerImportResult,
  CustomerImportResultError,
  BirthdayCustomer,
} from '../../application/dtos/customer-import-export.dto';
import type {
  PurchaseHistoryResult,
  PurchaseHistoryTransaction,
  PurchaseHistoryItem,
  PurchaseHistoryPayment,
  ExportCustomerData,
  SegmentName,
} from './customers.types';
import { VALID_LOYALTY_TIERS } from './customers.types';
import { CustomerSegmentsService } from './customer-segments.service';

/**
 * Service responsible for customer management operations
 *
 * Handles:
 * - Purchase history retrieval
 * - Birthday tracking and notifications
 * - Customer import/export (CSV, JSON)
 * - Data parsing and validation
 *
 * For segmentation features, see CustomerSegmentsService
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentsService: CustomerSegmentsService,
  ) {}

  // ==================== Segment Management ====================
  // Delegated to CustomerSegmentsService

  /**
   * Get summary of all customer segments
   * @deprecated Use CustomerSegmentsService directly
   */
  async getSegmentsSummary(businessId: string) {
    return this.segmentsService.getSegmentsSummary(businessId);
  }

  /**
   * Get customers in a specific segment
   * @deprecated Use CustomerSegmentsService directly
   */
  async getCustomersBySegment(businessId: string, segment: SegmentName) {
    return this.segmentsService.getCustomersBySegment(businessId, segment);
  }

  // ==================== Purchase History ====================

  /**
   * Get customer purchase history with pagination
   */
  async getPurchaseHistory(
    customerId: string,
    limit: number,
    offset: number,
  ): Promise<PurchaseHistoryResult> {
    const [transactions, total] = await Promise.all([
      this.fetchCustomerTransactions(customerId, limit, offset),
      this.countCustomerTransactions(customerId),
    ]);

    return {
      customerId,
      total,
      transactions: transactions.map((tx) => this.mapTransactionToHistory(tx)),
    };
  }

  /**
   * Fetch customer transactions from database
   * @private
   */
  private async fetchCustomerTransactions(customerId: string, limit: number, offset: number) {
    return this.prisma.transaction.findMany({
      where: { customerId, status: 'completed' },
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
        payments: {
          select: {
            paymentMethod: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count total completed transactions for customer
   * @private
   */
  private async countCustomerTransactions(customerId: string): Promise<number> {
    return this.prisma.transaction.count({
      where: { customerId, status: 'completed' },
    });
  }

  /**
   * Map Prisma transaction to purchase history DTO
   * @private
   */
  private mapTransactionToHistory(tx: any): PurchaseHistoryTransaction {
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
        (item: any): PurchaseHistoryItem => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity.toNumber(),
          unitPrice: item.unitPrice.toNumber(),
          subtotal: item.subtotal.toNumber(),
        }),
      ),
      payments: tx.payments.map(
        (p: any): PurchaseHistoryPayment => ({
          method: p.paymentMethod,
          amount: p.amount.toNumber(),
        }),
      ),
    };
  }

  // ==================== Birthday Features ====================

  /**
   * Get customers with upcoming birthdays within specified days
   */
  async getUpcomingBirthdays(
    businessId: string,
    daysAhead: number = 7,
  ): Promise<BirthdayCustomer[]> {
    const customers = await this.fetchCustomersWithBirthdays(businessId);
    const now = new Date();
    const results: BirthdayCustomer[] = [];

    for (const customer of customers) {
      if (!customer.dateOfBirth) continue;

      const daysUntil = this.calculateDaysUntilBirthday(customer.dateOfBirth, now);

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
   * Send birthday notifications to specified customers
   */
  async sendBirthdayNotifications(
    businessId: string,
    customerIds: string[],
  ): Promise<{ notified: number }> {
    const customers = await this.fetchCustomersForNotification(businessId, customerIds);
    let notified = 0;

    for (const customer of customers) {
      await this.createBirthdayNotification(businessId, customer);
      notified++;
    }

    this.logger.log(`Birthday notifications sent: ${notified}`);
    return { notified };
  }

  /**
   * Fetch customers with birthdays from database
   * @private
   */
  private async fetchCustomersWithBirthdays(businessId: string) {
    return this.prisma.customer.findMany({
      where: {
        businessId,
        isActive: true,
        dateOfBirth: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
      },
    });
  }

  /**
   * Fetch specific customers for birthday notification
   * @private
   */
  private async fetchCustomersForNotification(businessId: string, customerIds: string[]) {
    return this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        businessId,
        isActive: true,
      },
      select: { id: true, name: true },
    });
  }

  /**
   * Calculate days until next birthday
   * @private
   */
  private calculateDaysUntilBirthday(dateOfBirth: Date, now: Date): number {
    const dob = new Date(dateOfBirth);
    const birthdayThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());

    // If birthday already passed this year, check next year
    if (birthdayThisYear < now) {
      birthdayThisYear.setFullYear(birthdayThisYear.getFullYear() + 1);
    }

    const diffMs = birthdayThisYear.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Create birthday notification log entry
   * @private
   */
  private async createBirthdayNotification(
    businessId: string,
    customer: { id: string; name: string },
  ): Promise<void> {
    await this.prisma.notificationLog.create({
      data: {
        businessId,
        notificationType: 'birthday',
        channel: 'push',
        title: `Happy Birthday, ${customer.name}!`,
        body: `Enjoy a special birthday promotion just for you!`,
        status: 'sent',
        metadata: { customerId: customer.id, type: 'birthday_promotion' },
      },
    });
  }

  // ==================== Customer Import/Export ====================

  /**
   * Import customers in bulk from parsed rows
   */
  async importCustomers(
    businessId: string,
    rows: CustomerImportRow[],
  ): Promise<CustomerImportResult> {
    const errors: CustomerImportResultError[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required fields
      const validationError = this.validateImportRow(row, rowNum);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      // Check for duplicates
      const isDuplicate = await this.checkDuplicateCustomer(businessId, row);
      if (isDuplicate) {
        skipped++;
        continue;
      }

      // Parse and validate birthday
      const { dateOfBirth, error: dateError } = this.parseBirthday(row.birthday);
      if (dateError) {
        errors.push({ row: rowNum, field: 'birthday', message: dateError });
        continue;
      }

      // Import customer
      try {
        await this.createImportedCustomer(businessId, row, dateOfBirth);
        imported++;
      } catch {
        errors.push({
          row: rowNum,
          field: 'general',
          message: `Failed to import customer "${row.name}"`,
        });
      }
    }

    this.logger.log(
      `Customer import: ${imported} imported, ${skipped} skipped, ${errors.length} failed`,
    );

    return { imported, skipped, failed: errors.length, errors };
  }

  /**
   * Parse CSV data into customer import rows
   */
  parseCsvToCustomerRows(csvData: string): CustomerImportRow[] {
    const lines = csvData.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const dataLines = lines.slice(1); // Skip header
    return dataLines.map((line) => {
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

  /**
   * Parse JSON data into customer import rows
   */
  parseJsonToCustomerRows(jsonData: string): CustomerImportRow[] {
    const parsed: unknown = JSON.parse(jsonData);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('JSON data must be an array');
    }

    return parsed.map((item: Record<string, unknown>) => ({
      name: String(item['name'] || ''),
      email: item['email'] ? String(item['email']) : undefined,
      phone: item['phone'] ? String(item['phone']) : undefined,
      birthday: item['birthday'] ? String(item['birthday']) : undefined,
      loyaltyTier: item['loyaltyTier'] ? String(item['loyaltyTier']) : undefined,
    }));
  }

  /**
   * Export customers as CSV format
   */
  async exportCustomersCsv(businessId: string, segment?: string): Promise<string> {
    const customers = await this.getCustomersForExport(businessId, segment);
    return this.formatCustomersAsCsv(customers);
  }

  /**
   * Export customers as JSON format
   */
  async exportCustomersJson(businessId: string, segment?: string): Promise<string> {
    const customers = await this.getCustomersForExport(businessId, segment);
    return this.formatCustomersAsJson(customers);
  }

  /**
   * Get customers data for export (all or by segment)
   * @private
   */
  private async getCustomersForExport(
    businessId: string,
    segment?: string,
  ): Promise<ExportCustomerData[]> {
    if (segment) {
      return this.getSegmentCustomersForExport(businessId, segment);
    }

    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
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
    });

    return customers.map((c) => ({
      ...c,
      totalSpent: c.totalSpent.toNumber(),
    }));
  }

  /**
   * Get segment customers full data for export
   * @private
   */
  private async getSegmentCustomersForExport(
    businessId: string,
    segment: string,
  ): Promise<ExportCustomerData[]> {
    const validSegments = ['new', 'returning', 'vip', 'at-risk', 'inactive'];
    if (!validSegments.includes(segment)) {
      throw new BadRequestException(`Invalid segment: ${segment}`);
    }

    const segmentCustomers = await this.segmentsService.getCustomersBySegment(
      businessId,
      segment as SegmentName,
    );

    const customerIds = segmentCustomers.map((c) => c.id);
    const fullCustomers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
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
    });

    return fullCustomers.map((c) => ({
      ...c,
      totalSpent: c.totalSpent.toNumber(),
    }));
  }

  /**
   * Format customers data as CSV string
   * @private
   */
  private formatCustomersAsCsv(customers: ExportCustomerData[]): string {
    const header =
      'Name,Email,Phone,Birthday,Loyalty Tier,Loyalty Points,Total Spent,Visit Count,Created At';
    const rows = customers.map((c) =>
      [
        this.escapeCsvField(c.name),
        this.escapeCsvField(c.email || ''),
        this.escapeCsvField(c.phone || ''),
        c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : '',
        c.loyaltyTier,
        c.loyaltyPoints.toString(),
        c.totalSpent.toString(),
        c.visitCount.toString(),
        c.createdAt.toISOString(),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Format customers data as JSON string
   * @private
   */
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

  /**
   * Validate import row data
   * @private
   */
  private validateImportRow(
    row: CustomerImportRow,
    rowNum: number,
  ): CustomerImportResultError | null {
    if (!row.name || row.name.trim().length === 0) {
      return { row: rowNum, field: 'name', message: 'Name is required' };
    }
    return null;
  }

  /**
   * Check if customer already exists by email or phone
   * @private
   */
  private async checkDuplicateCustomer(
    businessId: string,
    row: CustomerImportRow,
  ): Promise<boolean> {
    if (row.email) {
      const existingByEmail = await this.prisma.customer.findFirst({
        where: { businessId, email: row.email },
      });
      if (existingByEmail) return true;
    }

    if (row.phone) {
      const existingByPhone = await this.prisma.customer.findFirst({
        where: { businessId, phone: row.phone },
      });
      if (existingByPhone) return true;
    }

    return false;
  }

  /**
   * Parse birthday string to Date
   * @private
   */
  private parseBirthday(birthday?: string): {
    dateOfBirth: Date | null;
    error?: string;
  } {
    if (!birthday) {
      return { dateOfBirth: null };
    }

    const parsed = new Date(birthday);
    if (isNaN(parsed.getTime())) {
      return { dateOfBirth: null, error: 'Invalid date format' };
    }

    return { dateOfBirth: parsed };
  }

  /**
   * Create imported customer in database
   * @private
   */
  private async createImportedCustomer(
    businessId: string,
    row: CustomerImportRow,
    dateOfBirth: Date | null,
  ): Promise<void> {
    const tier =
      row.loyaltyTier && VALID_LOYALTY_TIERS.includes(row.loyaltyTier as any)
        ? row.loyaltyTier
        : 'regular';

    await this.prisma.customer.create({
      data: {
        businessId,
        name: row.name.trim(),
        email: row.email || null,
        phone: row.phone || null,
        dateOfBirth,
        loyaltyTier: tier,
      },
    });
  }

  /**
   * Escape CSV field for proper formatting
   * @private
   */
  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Parse single CSV line handling quoted fields
   * @private
   */
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
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    fields.push(current);
    return fields;
  }
}
