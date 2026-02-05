import { CustomersService } from '../customers.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
  });

  const makeCustomer = (overrides: Record<string, unknown> = {}) => ({
    id: 'cust-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+628123456789',
    totalSpent: makeDecimal(500000),
    visitCount: 5,
    loyaltyTier: 'gold',
    loyaltyPoints: 1000,
    lastVisitAt: daysAgo(10),
    createdAt: daysAgo(60),
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = {
      customer: {
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new CustomersService(mockPrisma);
  });

  describe('getSegmentsSummary', () => {
    it('should return segment summary with correct counts', async () => {
      const customers = [
        // New customer (created 5 days ago)
        makeCustomer({
          id: 'cust-new',
          createdAt: daysAgo(5),
          visitCount: 1,
          totalSpent: makeDecimal(50000),
          lastVisitAt: daysAgo(5),
        }),
        // Returning customer (5+ visits)
        makeCustomer({
          id: 'cust-returning',
          createdAt: daysAgo(120),
          visitCount: 10,
          totalSpent: makeDecimal(1000000),
          lastVisitAt: daysAgo(10),
        }),
        // At-risk customer (last visit 75 days ago)
        makeCustomer({
          id: 'cust-atrisk',
          createdAt: daysAgo(200),
          visitCount: 2,
          totalSpent: makeDecimal(100000),
          lastVisitAt: daysAgo(75),
        }),
        // Inactive customer (last visit 120 days ago)
        makeCustomer({
          id: 'cust-inactive',
          createdAt: daysAgo(300),
          visitCount: 1,
          totalSpent: makeDecimal(30000),
          lastVisitAt: daysAgo(120),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getSegmentsSummary('biz-1');

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
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
      expect(result.totalCustomers).toBe(4);

      const newSegment = result.segments.find((s) => s.segment === 'new');
      expect(newSegment).toBeDefined();
      expect(newSegment!.count).toBe(1);

      const returningSegment = result.segments.find((s) => s.segment === 'returning');
      expect(returningSegment).toBeDefined();
      expect(returningSegment!.count).toBe(1);

      const atRiskSegment = result.segments.find((s) => s.segment === 'at-risk');
      expect(atRiskSegment).toBeDefined();
      expect(atRiskSegment!.count).toBe(1);

      const inactiveSegment = result.segments.find((s) => s.segment === 'inactive');
      expect(inactiveSegment).toBeDefined();
      expect(inactiveSegment!.count).toBe(1);
    });

    it('should return all five segment types', async () => {
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSegmentsSummary('biz-1');

      expect(result.segments).toHaveLength(5);
      const segmentNames = result.segments.map((s) => s.segment);
      expect(segmentNames).toEqual(['new', 'returning', 'vip', 'at-risk', 'inactive']);
    });

    it('should return zero counts when no customers exist', async () => {
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSegmentsSummary('biz-1');

      expect(result.totalCustomers).toBe(0);
      result.segments.forEach((segment) => {
        expect(segment.count).toBe(0);
      });
    });

    it('should include labels and descriptions for each segment', async () => {
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSegmentsSummary('biz-1');

      const newSegment = result.segments.find((s) => s.segment === 'new');
      expect(newSegment!.label).toBe('New Customers');
      expect(newSegment!.description).toBe('Created in the last 30 days');

      const vipSegment = result.segments.find((s) => s.segment === 'vip');
      expect(vipSegment!.label).toBe('VIP Customers');
      expect(vipSegment!.description).toBe('Top 10% by total spend');
    });

    it('should calculate VIP based on top 10% by spend', async () => {
      // 10 customers, VIP should be top 1 (10%)
      const customers = Array.from({ length: 10 }, (_, i) =>
        makeCustomer({
          id: `cust-${i}`,
          totalSpent: makeDecimal((i + 1) * 100000),
          visitCount: 1,
          createdAt: daysAgo(60),
          lastVisitAt: daysAgo(10),
        }),
      );
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getSegmentsSummary('biz-1');

      const vipSegment = result.segments.find((s) => s.segment === 'vip');
      expect(vipSegment!.count).toBeGreaterThanOrEqual(1);
    });

    it('should classify customer with no lastVisitAt and old createdAt as inactive', async () => {
      const customers = [
        makeCustomer({
          id: 'cust-no-visit',
          lastVisitAt: null,
          createdAt: daysAgo(100),
          visitCount: 0,
          totalSpent: makeDecimal(0),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getSegmentsSummary('biz-1');

      const inactiveSegment = result.segments.find((s) => s.segment === 'inactive');
      expect(inactiveSegment!.count).toBe(1);
    });
  });

  describe('getCustomersBySegment', () => {
    it('should return new customers (created within 30 days)', async () => {
      const customers = [
        makeCustomer({
          id: 'cust-new',
          createdAt: daysAgo(5),
          totalSpent: makeDecimal(50000),
        }),
        makeCustomer({
          id: 'cust-old',
          createdAt: daysAgo(60),
          totalSpent: makeDecimal(500000),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getCustomersBySegment('biz-1', 'new');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cust-new');
    });

    it('should return returning customers (3+ visits)', async () => {
      const customers = [
        makeCustomer({
          id: 'cust-returning',
          visitCount: 5,
          createdAt: daysAgo(60),
          totalSpent: makeDecimal(300000),
        }),
        makeCustomer({
          id: 'cust-new-visitor',
          visitCount: 1,
          createdAt: daysAgo(60),
          totalSpent: makeDecimal(50000),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getCustomersBySegment('biz-1', 'returning');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cust-returning');
      expect(result[0].visitCount).toBe(5);
    });

    it('should return at-risk customers (no visit in 60-90 days)', async () => {
      const customers = [
        makeCustomer({
          id: 'cust-atrisk',
          lastVisitAt: daysAgo(75),
          createdAt: daysAgo(200),
          visitCount: 2,
          totalSpent: makeDecimal(200000),
        }),
        makeCustomer({
          id: 'cust-recent',
          lastVisitAt: daysAgo(10),
          createdAt: daysAgo(200),
          visitCount: 2,
          totalSpent: makeDecimal(200000),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getCustomersBySegment('biz-1', 'at-risk');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cust-atrisk');
    });

    it('should return inactive customers (no visit in 90+ days)', async () => {
      const customers = [
        makeCustomer({
          id: 'cust-inactive',
          lastVisitAt: daysAgo(100),
          createdAt: daysAgo(300),
          visitCount: 1,
          totalSpent: makeDecimal(30000),
        }),
        makeCustomer({
          id: 'cust-active',
          lastVisitAt: daysAgo(5),
          createdAt: daysAgo(300),
          visitCount: 10,
          totalSpent: makeDecimal(500000),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getCustomersBySegment('biz-1', 'inactive');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cust-inactive');
    });

    it('should map customer records to SegmentCustomer format', async () => {
      const customers = [
        makeCustomer({
          id: 'cust-1',
          name: 'Jane',
          email: 'jane@test.com',
          phone: '+6281234',
          totalSpent: makeDecimal(250000),
          visitCount: 4,
          loyaltyTier: 'silver',
          loyaltyPoints: 500,
          lastVisitAt: daysAgo(10),
          createdAt: daysAgo(60),
        }),
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      const result = await service.getCustomersBySegment('biz-1', 'returning');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'cust-1',
        name: 'Jane',
        email: 'jane@test.com',
        phone: '+6281234',
        totalSpent: 250000,
        visitCount: 4,
        loyaltyTier: 'silver',
        loyaltyPoints: 500,
        lastVisitAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });

    it('should return empty array for unknown segment', async () => {
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCustomersBySegment(
        'biz-1',
        'unknown' as 'all' | 'vip' | 'regular' | 'new' | 'dormant',
      );

      expect(result).toEqual([]);
    });
  });
});
