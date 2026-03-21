import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BusinessScopeGuard } from '../../../shared/guards/business-scope.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

/**
 * IDOR Prevention Tests for Customers Module
 */
describe('Customers IDOR Prevention', () => {
  let guard: BusinessScopeGuard;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockCustomerFindUnique: jest.Mock;

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

  beforeEach(() => {
    mockCustomerFindUnique = jest.fn();
    mockPrisma = {
      customer: {
        findUnique: mockCustomerFindUnique,
      },
    } as unknown as jest.Mocked<PrismaService>;

    mockReflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockJwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    guard = new BusinessScopeGuard(mockReflector, mockPrisma, mockJwtService);
  });

  describe('Cross-Business Customer Access Prevention', () => {
    it('should prevent accessing customer from different business', async () => {
      mockCustomerFindUnique.mockResolvedValue(customerFromBusinessB as Record<string, unknown>);

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
      mockCustomerFindUnique.mockResolvedValue(customerFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent deleting customer from different business', async () => {
      mockCustomerFindUnique.mockResolvedValue(customerFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent accessing customer purchase history from different business', async () => {
      mockCustomerFindUnique.mockResolvedValue(customerFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cust-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent manipulating loyalty points for customer from different business', async () => {
      mockCustomerFindUnique.mockResolvedValue(customerFromBusinessB as Record<string, unknown>);

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

function createMockContext(user: AuthUser, params: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params,
        body: {},
      }),
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
}
