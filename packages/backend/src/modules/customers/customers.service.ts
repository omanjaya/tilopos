import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { Decimal } from '@prisma/client/runtime/library';
import type {
  CustomerImportRow,
  CustomerImportResult,
  CustomerImportResultError,
  BirthdayCustomer,
} from '../../application/dtos/customer-import-export.dto';

type SegmentName = 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive';

export interface CustomerSegmentSummary {
  segment: SegmentName;
  label: string;
  description: string;
  count: number;
}

export interface SegmentCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalSpent: number;
  visitCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}

interface PurchaseHistoryTransaction {
  id: string;
  receiptNumber: string;
  transactionType: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  createdAt: Date;
  items: Array<{
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
}

export interface PurchaseHistoryResult {
  customerId: string;
  total: number;
  transactions: PurchaseHistoryTransaction[];
}

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalSpent: Decimal;
  visitCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSegmentsSummary(businessId: string): Promise<{
    totalCustomers: number;
    segments: CustomerSegmentSummary[];
  }> {
    const customers = await this.fetchCustomersForSegmentation(businessId);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Calculate VIP threshold: top 10% by spend
    const sortedBySpend = [...customers].sort(
      (a, b) => b.totalSpent.toNumber() - a.totalSpent.toNumber(),
    );
    const vipThresholdIndex = Math.max(1, Math.ceil(customers.length * 0.1));
    const vipThreshold =
      sortedBySpend.length > 0
        ? sortedBySpend[Math.min(vipThresholdIndex - 1, sortedBySpend.length - 1)].totalSpent.toNumber()
        : 0;

    const newCount = customers.filter(
      (c) => c.createdAt >= thirtyDaysAgo,
    ).length;

    const returningCount = customers.filter(
      (c) => c.visitCount >= 3,
    ).length;

    const vipCount = customers.filter(
      (c) => c.totalSpent.toNumber() >= vipThreshold && vipThreshold > 0,
    ).length;

    const atRiskCount = customers.filter((c) => {
      if (!c.lastVisitAt) return false;
      return c.lastVisitAt < sixtyDaysAgo && c.lastVisitAt >= ninetyDaysAgo;
    }).length;

    const inactiveCount = customers.filter((c) => {
      if (!c.lastVisitAt) {
        // No visit and created more than 90 days ago
        return c.createdAt < ninetyDaysAgo;
      }
      return c.lastVisitAt < ninetyDaysAgo;
    }).length;

    return {
      totalCustomers: customers.length,
      segments: [
        {
          segment: 'new',
          label: 'New Customers',
          description: 'Created in the last 30 days',
          count: newCount,
        },
        {
          segment: 'returning',
          label: 'Returning Customers',
          description: '3 or more transactions',
          count: returningCount,
        },
        {
          segment: 'vip',
          label: 'VIP Customers',
          description: 'Top 10% by total spend',
          count: vipCount,
        },
        {
          segment: 'at-risk',
          label: 'At-Risk Customers',
          description: 'No transaction in 60-90 days',
          count: atRiskCount,
        },
        {
          segment: 'inactive',
          label: 'Inactive Customers',
          description: 'No transaction in 90+ days',
          count: inactiveCount,
        },
      ],
    };
  }

  async getCustomersBySegment(
    businessId: string,
    segment: SegmentName,
  ): Promise<SegmentCustomer[]> {
    const customers = await this.fetchCustomersForSegmentation(businessId);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    let filtered: CustomerRow[];

    switch (segment) {
      case 'new':
        filtered = customers.filter((c) => c.createdAt >= thirtyDaysAgo);
        break;

      case 'returning':
        filtered = customers.filter((c) => c.visitCount >= 3);
        break;

      case 'vip': {
        const sortedBySpend = [...customers].sort(
          (a, b) => b.totalSpent.toNumber() - a.totalSpent.toNumber(),
        );
        const vipThresholdIndex = Math.max(1, Math.ceil(customers.length * 0.1));
        const vipThreshold =
          sortedBySpend.length > 0
            ? sortedBySpend[Math.min(vipThresholdIndex - 1, sortedBySpend.length - 1)].totalSpent.toNumber()
            : 0;
        filtered = customers.filter(
          (c) => c.totalSpent.toNumber() >= vipThreshold && vipThreshold > 0,
        );
        break;
      }

      case 'at-risk':
        filtered = customers.filter((c) => {
          if (!c.lastVisitAt) return false;
          return c.lastVisitAt < sixtyDaysAgo && c.lastVisitAt >= ninetyDaysAgo;
        });
        break;

      case 'inactive':
        filtered = customers.filter((c) => {
          if (!c.lastVisitAt) {
            return c.createdAt < ninetyDaysAgo;
          }
          return c.lastVisitAt < ninetyDaysAgo;
        });
        break;

      default:
        filtered = [];
    }

    return filtered.map((c) => this.toSegmentCustomer(c));
  }

  async getPurchaseHistory(
    customerId: string,
    limit: number,
    offset: number,
  ): Promise<PurchaseHistoryResult> {
    const transactions = await this.prisma.transaction.findMany({
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

    const total = await this.prisma.transaction.count({
      where: { customerId, status: 'completed' },
    });

    return {
      customerId,
      total,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        receiptNumber: tx.receiptNumber,
        transactionType: tx.transactionType,
        subtotal: tx.subtotal.toNumber(),
        discountAmount: tx.discountAmount.toNumber(),
        taxAmount: tx.taxAmount.toNumber(),
        grandTotal: tx.grandTotal.toNumber(),
        status: tx.status,
        createdAt: tx.createdAt,
        items: tx.items.map((item) => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity.toNumber(),
          unitPrice: item.unitPrice.toNumber(),
          subtotal: item.subtotal.toNumber(),
        })),
        payments: tx.payments.map((p) => ({
          method: p.paymentMethod,
          amount: p.amount.toNumber(),
        })),
      })),
    };
  }

  // ==================== Birthday Features ====================

  async getUpcomingBirthdays(
    businessId: string,
    daysAhead: number = 7,
  ): Promise<BirthdayCustomer[]> {
    const customers = await this.prisma.customer.findMany({
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

    const now = new Date();
    const results: BirthdayCustomer[] = [];

    for (const customer of customers) {
      if (!customer.dateOfBirth) continue;

      const dob = new Date(customer.dateOfBirth);
      const birthdayThisYear = new Date(
        now.getFullYear(),
        dob.getMonth(),
        dob.getDate(),
      );

      // If birthday already passed this year, check next year
      if (birthdayThisYear < now) {
        birthdayThisYear.setFullYear(birthdayThisYear.getFullYear() + 1);
      }

      const diffMs = birthdayThisYear.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= daysAhead) {
        results.push({
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          birthday: customer.dateOfBirth,
          daysUntilBirthday: diffDays,
        });
      }
    }

    // Sort by nearest birthday first
    results.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    return results;
  }

  async sendBirthdayNotifications(
    businessId: string,
    customerIds: string[],
  ): Promise<{ notified: number }> {
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        businessId,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    let notified = 0;

    for (const customer of customers) {
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
      notified++;
    }

    this.logger.log(`Birthday notifications sent: ${notified}`);

    return { notified };
  }

  // ==================== Customer Import/Export ====================

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

      if (!row.name || row.name.trim().length === 0) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
        continue;
      }

      // Check for duplicate by email or phone
      if (row.email) {
        const existingByEmail = await this.prisma.customer.findFirst({
          where: { businessId, email: row.email },
        });
        if (existingByEmail) {
          skipped++;
          continue;
        }
      }

      if (row.phone) {
        const existingByPhone = await this.prisma.customer.findFirst({
          where: { businessId, phone: row.phone },
        });
        if (existingByPhone) {
          skipped++;
          continue;
        }
      }

      // Parse birthday if provided
      let dateOfBirth: Date | null = null;
      if (row.birthday) {
        const parsed = new Date(row.birthday);
        if (!isNaN(parsed.getTime())) {
          dateOfBirth = parsed;
        } else {
          errors.push({ row: rowNum, field: 'birthday', message: 'Invalid date format' });
          continue;
        }
      }

      const validTiers = ['regular', 'silver', 'gold', 'platinum'];
      const tier = row.loyaltyTier && validTiers.includes(row.loyaltyTier)
        ? row.loyaltyTier
        : 'regular';

      try {
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
        imported++;
      } catch {
        errors.push({ row: rowNum, field: 'general', message: `Failed to import customer "${row.name}"` });
      }
    }

    this.logger.log(
      `Customer import: ${imported} imported, ${skipped} skipped, ${errors.length} failed`,
    );

    return { imported, skipped, failed: errors.length, errors };
  }

  parseCsvToCustomerRows(csvData: string): CustomerImportRow[] {
    const lines = csvData.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const dataLines = lines.slice(1);
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

  async exportCustomersCsv(businessId: string, segment?: string): Promise<string> {
    const customers = await this.getCustomersForExport(businessId, segment);

    const header = 'Name,Email,Phone,Birthday,Loyalty Tier,Loyalty Points,Total Spent,Visit Count,Created At';
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

  async exportCustomersJson(businessId: string, segment?: string): Promise<string> {
    const customers = await this.getCustomersForExport(businessId, segment);

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

  private async getCustomersForExport(
    businessId: string,
    segment?: string,
  ): Promise<Array<{
    name: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    loyaltyTier: string;
    loyaltyPoints: number;
    totalSpent: number;
    visitCount: number;
    createdAt: Date;
  }>> {
    if (segment) {
      const validSegments = ['new', 'returning', 'vip', 'at-risk', 'inactive'];
      if (!validSegments.includes(segment)) {
        throw new BadRequestException(`Invalid segment: ${segment}`);
      }

      const segmentCustomers = await this.getCustomersBySegment(
        businessId,
        segment as 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive',
      );

      // Fetch full data for the segment customers
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

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
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

  private async fetchCustomersForSegmentation(businessId: string): Promise<CustomerRow[]> {
    return this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        totalSpent: true,
        visitCount: true,
        loyaltyTier: true,
        loyaltyPoints: true,
        lastVisitAt: true,
        createdAt: true,
      },
    });
  }

  private toSegmentCustomer(c: CustomerRow): SegmentCustomer {
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalSpent: c.totalSpent.toNumber(),
      visitCount: c.visitCount,
      loyaltyTier: c.loyaltyTier,
      loyaltyPoints: c.loyaltyPoints,
      lastVisitAt: c.lastVisitAt,
      createdAt: c.createdAt,
    };
  }
}
