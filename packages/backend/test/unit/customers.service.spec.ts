import { CustomersService } from '../../src/modules/customers/customers.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('CustomersService - Birthday & Import/Export', () => {
  let service: CustomersService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
  });

  beforeEach(() => {
    mockPrisma = {
      customer: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      notificationLog: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new CustomersService(mockPrisma);
  });

  // ==========================================================================
  // getUpcomingBirthdays (getBirthdayAlerts)
  // ==========================================================================

  describe('getUpcomingBirthdays', () => {
    it('should find customers with upcoming birthdays within daysAhead', async () => {
      // Arrange
      const now = new Date();
      const upcomingBirthday = new Date(now);
      upcomingBirthday.setDate(upcomingBirthday.getDate() + 3);
      // Set year to a past year (actual DOB)
      const dob = new Date(upcomingBirthday);
      dob.setFullYear(1990);

      const customers = [
        {
          id: 'cust-1',
          name: 'Birthday Person',
          email: 'birthday@test.com',
          phone: '+628123',
          dateOfBirth: dob,
        },
        {
          id: 'cust-2',
          name: 'Far Birthday',
          email: 'far@test.com',
          phone: '+628124',
          dateOfBirth: new Date(1995, (now.getMonth() + 3) % 12, 15), // 3 months away
        },
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      // Act
      const result = await service.getUpcomingBirthdays('biz-1', 7);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(1);
      const found = result.find((r) => r.customerId === 'cust-1');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Birthday Person');
      expect(found!.daysUntilBirthday).toBeLessThanOrEqual(7);
    });

    it('should return empty array when no birthdays are within range', async () => {
      // Arrange
      const now = new Date();
      const farDob = new Date(1990, (now.getMonth() + 6) % 12, 15);

      const customers = [
        {
          id: 'cust-1',
          name: 'Far Birthday',
          email: 'far@test.com',
          phone: null,
          dateOfBirth: farDob,
        },
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      // Act
      const result = await service.getUpcomingBirthdays('biz-1', 7);

      // Assert
      // The far birthday (6 months away) should not appear
      const found = result.find((r) => r.customerId === 'cust-1');
      expect(found).toBeUndefined();
    });

    it('should handle customers with null dateOfBirth', async () => {
      // Arrange
      const customers = [
        {
          id: 'cust-1',
          name: 'No Birthday',
          email: null,
          phone: null,
          dateOfBirth: null,
        },
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      // Act
      const result = await service.getUpcomingBirthdays('biz-1', 7);

      // Assert
      expect(result).toEqual([]);
    });

    it('should sort results by nearest birthday first', async () => {
      // Arrange
      const now = new Date();
      const dob1 = new Date(1990, now.getMonth(), now.getDate() + 5);
      const dob2 = new Date(1992, now.getMonth(), now.getDate() + 2);

      // Fix for year wrapping
      if (dob1.getMonth() !== now.getMonth()) {
        dob1.setMonth(now.getMonth());
        dob1.setDate(now.getDate() + 5);
      }
      if (dob2.getMonth() !== now.getMonth()) {
        dob2.setMonth(now.getMonth());
        dob2.setDate(now.getDate() + 2);
      }

      const customers = [
        { id: 'cust-far', name: 'Far', email: null, phone: null, dateOfBirth: dob1 },
        { id: 'cust-near', name: 'Near', email: null, phone: null, dateOfBirth: dob2 },
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      // Act
      const result = await service.getUpcomingBirthdays('biz-1', 7);

      // Assert
      if (result.length >= 2) {
        expect(result[0].daysUntilBirthday).toBeLessThanOrEqual(result[1].daysUntilBirthday);
      }
    });
  });

  // ==========================================================================
  // importCustomers
  // ==========================================================================

  describe('importCustomers', () => {
    it('should import valid customer rows', async () => {
      // Arrange
      const rows = [
        { name: 'Alice', email: 'alice@test.com', phone: '+628111' },
        { name: 'Bob', email: 'bob@test.com', phone: '+628222' },
      ];

      // No duplicates
      (mockPrisma.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.customer.create as jest.Mock).mockResolvedValue({ id: 'new-cust' });

      // Act
      const result = await service.importCustomers('biz-1', rows);

      // Assert
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should skip duplicate customers by email', async () => {
      // Arrange
      const rows = [
        { name: 'Alice', email: 'existing@test.com' },
      ];

      // First call (email check) returns existing customer
      (mockPrisma.customer.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'existing-cust',
        email: 'existing@test.com',
      });

      // Act
      const result = await service.importCustomers('biz-1', rows);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should skip duplicate customers by phone', async () => {
      // Arrange
      const rows = [
        { name: 'Bob', phone: '+628999' },
      ];

      // Since row.email is falsy, email check is skipped entirely.
      // Phone check returns existing customer.
      (mockPrisma.customer.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing', phone: '+628999' }); // phone match

      // Act
      const result = await service.importCustomers('biz-1', rows);

      // Assert
      expect(result.skipped).toBe(1);
    });

    it('should report error for missing name', async () => {
      // Arrange
      const rows = [
        { name: '', email: 'test@test.com' },
      ];

      // Act
      const result = await service.importCustomers('biz-1', rows);

      // Assert
      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toBe('Name is required');
    });

    it('should report error for invalid birthday format', async () => {
      // Arrange
      const rows = [
        { name: 'Charlie', birthday: 'not-a-date' },
      ];

      (mockPrisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.importCustomers('biz-1', rows);

      // Assert
      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('birthday');
      expect(result.errors[0].message).toBe('Invalid date format');
    });

    it('should default loyalty tier to regular for invalid tiers', async () => {
      // Arrange
      const rows = [
        { name: 'Dave', loyaltyTier: 'invalid_tier' },
      ];

      (mockPrisma.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.customer.create as jest.Mock).mockResolvedValue({ id: 'new' });

      // Act
      await service.importCustomers('biz-1', rows);

      // Assert
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyTier: 'regular',
        }),
      });
    });
  });

  // ==========================================================================
  // exportCustomersCsv
  // ==========================================================================

  describe('exportCustomersCsv', () => {
    it('should export customers as CSV string', async () => {
      // Arrange
      const customers = [
        {
          name: 'Alice',
          email: 'alice@test.com',
          phone: '+628111',
          dateOfBirth: new Date('1990-05-15'),
          loyaltyTier: 'gold',
          loyaltyPoints: 500,
          totalSpent: makeDecimal(1500000),
          visitCount: 10,
          createdAt: new Date('2025-01-01'),
        },
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      // Act
      const result = await service.exportCustomersCsv('biz-1');

      // Assert
      expect(result).toContain('Name,Email,Phone,Birthday,Loyalty Tier');
      expect(result).toContain('Alice');
      expect(result).toContain('alice@test.com');
      expect(result).toContain('gold');
      expect(result).toContain('1990-05-15');
      const lines = result.split('\n');
      expect(lines).toHaveLength(2); // header + 1 row
    });

    it('should export empty CSV when no customers exist', async () => {
      // Arrange
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.exportCustomersCsv('biz-1');

      // Assert
      const lines = result.split('\n');
      expect(lines).toHaveLength(1); // just the header
      expect(lines[0]).toContain('Name,Email,Phone');
    });
  });

  // ==========================================================================
  // exportCustomersJson
  // ==========================================================================

  describe('exportCustomersJson', () => {
    it('should export customers as JSON string', async () => {
      // Arrange
      const customers = [
        {
          name: 'Alice',
          email: 'alice@test.com',
          phone: '+628111',
          dateOfBirth: new Date('1990-05-15'),
          loyaltyTier: 'gold',
          loyaltyPoints: 500,
          totalSpent: makeDecimal(1500000),
          visitCount: 10,
          createdAt: new Date('2025-01-01'),
        },
      ];
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue(customers);

      // Act
      const result = await service.exportCustomersJson('biz-1');

      // Assert
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Alice');
      expect(parsed[0].email).toBe('alice@test.com');
      expect(parsed[0].loyaltyTier).toBe('gold');
      expect(parsed[0].birthday).toBe('1990-05-15');
      expect(parsed[0].totalSpent).toBe(1500000);
    });
  });

  // ==========================================================================
  // parseCsvToCustomerRows
  // ==========================================================================

  describe('parseCsvToCustomerRows', () => {
    it('should parse CSV customer data correctly', () => {
      // Arrange
      const csv = `name,email,phone,birthday,loyaltyTier
Alice,alice@test.com,+628111,1990-05-15,gold
Bob,bob@test.com,+628222,,regular`;

      // Act
      const result = service.parseCsvToCustomerRows(csv);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[0].email).toBe('alice@test.com');
      expect(result[0].birthday).toBe('1990-05-15');
      expect(result[0].loyaltyTier).toBe('gold');
      expect(result[1].name).toBe('Bob');
    });

    it('should return empty array for CSV with only header', () => {
      // Act
      const result = service.parseCsvToCustomerRows('name,email,phone');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // parseJsonToCustomerRows
  // ==========================================================================

  describe('parseJsonToCustomerRows', () => {
    it('should parse JSON customer data correctly', () => {
      // Arrange
      const json = JSON.stringify([
        { name: 'Alice', email: 'alice@test.com', loyaltyTier: 'gold' },
        { name: 'Bob', phone: '+628222' },
      ]);

      // Act
      const result = service.parseJsonToCustomerRows(json);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[0].email).toBe('alice@test.com');
      expect(result[0].loyaltyTier).toBe('gold');
      expect(result[1].name).toBe('Bob');
      expect(result[1].email).toBeUndefined();
    });

    it('should throw BadRequestException when JSON is not an array', () => {
      // Act & Assert
      expect(() =>
        service.parseJsonToCustomerRows(JSON.stringify({ name: 'Not array' })),
      ).toThrow('JSON data must be an array');
    });
  });
});
