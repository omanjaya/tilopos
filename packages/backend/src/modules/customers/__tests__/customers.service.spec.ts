import { Prisma } from '@prisma/client';
import { NotFoundException, NotImplementedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CustomersService, daysUntilBirthday, escapeCsvField } from '../customers.service';
import { CustomerSegmentsService } from '../customer-segments.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdateCustomerDto } from '../../../application/dtos/customer.dto';

const BIZ = 'biz-a';

function makePrisma() {
  return {
    customer: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
      createMany: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
    },
    loyaltyTier: { findMany: jest.fn().mockResolvedValue([]) },
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(),
  };
}

function build() {
  const prisma = makePrisma();
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  const segments = new CustomerSegmentsService(prisma as unknown as PrismaService);
  const service = new CustomersService(prisma as unknown as PrismaService, segments);
  return { prisma, segments, service };
}

describe('CustomersService CRUD', () => {
  it('update never writes loyalty/spend fields even if present on the body', async () => {
    const { prisma, service } = build();
    prisma.customer.findFirst.mockResolvedValue({
      id: 'c1',
      totalSpent: new Prisma.Decimal(0),
      dateOfBirth: null,
    });

    const body = { name: 'New', loyaltyPoints: 99999, totalSpent: 1, loyaltyTier: 'gold' };
    await service.update(BIZ, 'c1', body as never);

    const call = prisma.customer.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'c1', businessId: BIZ });
    expect(call.data).toEqual({ name: 'New' });
  });

  it('UpdateCustomerDto rejects server-owned fields (forbidNonWhitelisted)', () => {
    const dto = plainToInstance(UpdateCustomerDto, { name: 'x', loyaltyPoints: 5 });
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((e) => e.property)).toContain('loyaltyPoints');
  });

  it('update of a customer from another business is a 404', async () => {
    const { prisma, service } = build();
    prisma.customer.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update(BIZ, 'foreign', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findOne is scoped by businessId', async () => {
    const { prisma, service } = build();
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(service.findOne(BIZ, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign', businessId: BIZ } }),
    );
  });

  it('legacy list (no page) is bounded; paged list returns { data, meta }', async () => {
    const { prisma, service } = build();
    await service.list(BIZ, {});
    expect(prisma.customer.findMany.mock.calls[0][0].take).toBe(1000);

    prisma.customer.count.mockResolvedValue(3);
    const res = await service.list(BIZ, { page: 2, limit: 2 });
    expect(prisma.customer.findMany.mock.calls[1][0]).toEqual(
      expect.objectContaining({ skip: 2, take: 2 }),
    );
    expect(res).toEqual(expect.objectContaining({ meta: expect.objectContaining({ total: 3 }) }));
  });
});

describe('CustomersService birthdays', () => {
  it('birthday notifications fail honestly instead of pretending to send', async () => {
    const { service } = build();
    await expect(service.sendBirthdayNotifications(BIZ, ['c1'])).rejects.toBeInstanceOf(
      NotImplementedException,
    );
  });

  it('counts days in the WIB calendar', () => {
    const dob = new Date('1990-09-27T00:00:00.000Z');
    // 2026-09-26 18:00 UTC = 2026-09-27 01:00 WIB -> birthday is today
    expect(daysUntilBirthday(dob, new Date('2026-09-26T18:00:00.000Z'))).toBe(0);
    // 2026-09-26 16:00 UTC = 2026-09-26 23:00 WIB -> tomorrow
    expect(daysUntilBirthday(dob, new Date('2026-09-26T16:00:00.000Z'))).toBe(1);
    // just passed -> next year
    expect(daysUntilBirthday(dob, new Date('2026-09-28T01:00:00.000Z'))).toBe(364);
  });
});

describe('CustomersService import/export', () => {
  it('neutralises spreadsheet formulas in CSV cells', () => {
    expect(escapeCsvField('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvField('+62811')).toBe("'+62811");
    expect(escapeCsvField('@cmd')).toBe("'@cmd");
    expect(escapeCsvField('Budi')).toBe('Budi');
  });

  it('import prefetches duplicates once and inserts with createMany', async () => {
    const { prisma, service } = build();
    prisma.customer.findMany.mockResolvedValue([{ email: 'old@x.id', phone: null }]);

    const result = await service.importCustomers(BIZ, [
      { name: 'A', email: 'old@x.id' },
      { name: 'B', email: 'b@x.id' },
      { name: 'B2', email: 'B@x.id' },
      { name: '', email: 'c@x.id' },
      { name: 'D', email: 'not-an-email' },
    ]);

    expect(result).toEqual(expect.objectContaining({ imported: 1, skipped: 2, failed: 2 }));
    expect(prisma.customer.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.customer.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.customer.createMany.mock.calls[0][0].data[0]).toEqual(
      expect.objectContaining({ businessId: BIZ, name: 'B', loyaltyTier: 'regular' }),
    );
  });
});

describe('CustomersService import validation', () => {
  it('skips duplicate phones, rejects bad birthdays and falls back to the default tier', async () => {
    const { prisma, service } = build();
    prisma.customer.findMany.mockResolvedValue([{ email: null, phone: '0811' }]);
    prisma.loyaltyTier.findMany.mockResolvedValue([{ name: 'Gold' }]);

    const result = await service.importCustomers(BIZ, [
      { name: 'Dup phone', phone: '0811' },
      { name: 'Bad date', birthday: '31/31/2020' },
      { name: 'Gold member', loyaltyTier: 'gold' },
      { name: 'Unknown tier', loyaltyTier: 'platinum-x' },
    ]);

    expect(result).toEqual(expect.objectContaining({ imported: 2, skipped: 1, failed: 1 }));
    expect(result.errors[0]).toEqual(expect.objectContaining({ row: 2, field: 'birthday' }));
    const created = prisma.customer.createMany.mock.calls[0][0].data;
    expect(created.map((c: { loyaltyTier: string }) => c.loyaltyTier)).toEqual(['Gold', 'regular']);
  });
});

describe('CustomerSegmentsService', () => {
  it('computes counts with COUNT queries scoped to the business', async () => {
    const { prisma, segments } = build();
    prisma.customer.count.mockResolvedValue(10);
    prisma.customer.findFirst.mockResolvedValue({ totalSpent: new Prisma.Decimal(500) });

    const summary = await segments.getSegmentsSummary(BIZ);

    expect(summary.totalCustomers).toBe(10);
    expect(summary.segments).toHaveLength(5);
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    for (const [args] of prisma.customer.count.mock.calls) {
      expect(args.where.businessId).toBe(BIZ);
    }
  });

  it('VIP threshold is the spend at the top-10% rank (Decimal)', async () => {
    const { prisma, segments } = build();
    prisma.customer.count.mockResolvedValue(25);
    prisma.customer.findFirst.mockResolvedValue({ totalSpent: new Prisma.Decimal('1000.50') });

    const threshold = await segments.vipThreshold(BIZ);

    expect(threshold?.toString()).toBe('1000.5');
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, where: { businessId: BIZ, isActive: true } }),
    );
  });

  it('segment lists are paginated', async () => {
    const { prisma, segments } = build();
    await segments.getCustomersBySegment(BIZ, 'returning', { page: 3, limit: 50 });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 100 }),
    );
  });

  it('inactive segment covers never-visited old customers', () => {
    const { segments } = build();
    const where = segments.segmentWhere(BIZ, 'inactive', new Date(), null);
    expect(where.OR).toHaveLength(2);
  });
});
