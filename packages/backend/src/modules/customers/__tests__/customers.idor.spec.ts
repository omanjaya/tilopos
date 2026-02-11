import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomersController } from '../customers.controller';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import type { ICustomerRepository } from '../../../domain/interfaces/repositories/customer.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ExcelParserService } from '../../../infrastructure/import/excel-parser.service';
import { CustomersService } from '../customers.service';
import { BusinessScopeGuard } from '../../../shared/guards/business-scope.guard';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

/**
 * IDOR Prevention Tests for Customers Module
 */
describe('Customers IDOR Prevention', () => {
  let controller: CustomersController;
  let guard: BusinessScopeGuard;
  let mockCustomerRepo: jest.Mocked<ICustomerRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;

  const businessA = 'business-a-id';
  const businessB = 'business-b-id';

  const userFromBusinessA: AuthUser = {
    businessId: businessA,
    employeeId: 'emp-a',
    outletId: null,
    role: 'owner',
  };

  const customerFromBusinessB = {
    id: 'cust-b-1',
    businessId: businessB,
    name: 'Customer from Business B',
    email: 'customer@businessb.com',
    phone: '+6281234567890',
    loyaltyPoints: 100,
  };

  beforeEach(async () => {
    mockCustomerRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockPrisma = {
      customer: {
        findUnique: jest.fn(),
      },
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    guard = new BusinessScopeGuard(mockReflector, mockPrisma);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: REPOSITORY_TOKENS.CUSTOMER,
          useValue: mockCustomerRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ExcelParserService,
          useValue: {},
        },
        {
          provide: CustomersService,
          useValue: {
            getPurchaseHistory: jest.fn(),
          },
        },
        // Mock all loyalty use cases
        {
          provide: 'AddLoyaltyPointsUseCase',
          useValue: { execute: jest.fn() },
        },
        {
          provide: 'EarnLoyaltyPointsUseCase',
          useValue: { execute: jest.fn() },
        },
        {
          provide: 'RedeemLoyaltyPointsUseCase',
          useValue: { execute: jest.fn() },
        },
        {
          provide: 'GetLoyaltyBalanceUseCase',
          useValue: { execute: jest.fn() },
        },
        {
          provide: 'GetLoyaltyHistoryUseCase',
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  describe('Cross-Business Customer Access Prevention', () => {
    it('should prevent accessing customer from different business', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(customerFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You do not have access to this customer',
      );
    });

    it('should prevent modifying customer from different business', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(customerFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockCustomerRepo.update).not.toHaveBeenCalled();
    });

    it('should prevent deleting customer from different business', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(customerFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockCustomerRepo.delete).not.toHaveBeenCalled();
    });

    it('should prevent accessing customer purchase history from different business', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(customerFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent manipulating loyalty points for customer from different business', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(customerFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      // Should block all loyalty endpoints
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});

function createMockContext(user: AuthUser, params: Record<string, string>): any {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params,
        body: {},
      }),
    }),
    getHandler: () => ({}),
  };
}
