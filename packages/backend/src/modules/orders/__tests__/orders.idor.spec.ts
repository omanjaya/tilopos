import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BusinessScopeGuard } from '../../../shared/guards/business-scope.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

/**
 * IDOR Prevention Tests for Orders Module
 */
describe('Orders IDOR Prevention', () => {
  let guard: BusinessScopeGuard;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockOrderFindUnique: jest.Mock;

  const businessA = 'business-a-id';
  const businessB = 'business-b-id';

  const userFromBusinessA: AuthUser = {
    businessId: businessA,
    employeeId: 'emp-a',
    outletId: 'outlet-a',
    role: 'owner',
  };

  const orderFromBusinessB = {
    id: 'order-b-1',
    outlet: {
      businessId: businessB,
    },
    outletId: 'outlet-b',
    orderType: 'dine_in',
    status: 'pending',
    totalAmount: 50000,
  };

  beforeEach(() => {
    mockOrderFindUnique = jest.fn();
    mockPrisma = {
      order: {
        findUnique: mockOrderFindUnique,
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

  describe('Cross-Business Order Access Prevention', () => {
    it('should prevent accessing order from different business', async () => {
      mockOrderFindUnique.mockResolvedValue(orderFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You do not have access to this order',
      );
    });

    it('should prevent updating order status from different business', async () => {
      mockOrderFindUnique.mockResolvedValue(orderFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent modifying order items from different business', async () => {
      mockOrderFindUnique.mockResolvedValue(orderFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent canceling order from different business', async () => {
      mockOrderFindUnique.mockResolvedValue(orderFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent setting priority for order from different business', async () => {
      mockOrderFindUnique.mockResolvedValue(orderFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

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
