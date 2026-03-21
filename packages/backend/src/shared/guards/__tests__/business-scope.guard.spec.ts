import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BusinessScopeGuard, BusinessScoped } from '../business-scope.guard';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';

describe('BusinessScopeGuard', () => {
  let guard: BusinessScopeGuard;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockProductFindUnique: jest.Mock;
  let mockCustomerFindUnique: jest.Mock;
  let mockOrderFindUnique: jest.Mock;
  let mockTableFindUnique: jest.Mock;
  let mockPromotionFindUnique: jest.Mock;

  beforeEach(async () => {
    mockProductFindUnique = jest.fn();
    mockCustomerFindUnique = jest.fn();
    mockOrderFindUnique = jest.fn();
    mockTableFindUnique = jest.fn();
    mockPromotionFindUnique = jest.fn();

    mockPrisma = {
      product: {
        findUnique: mockProductFindUnique,
      },
      customer: {
        findUnique: mockCustomerFindUnique,
      },
      order: {
        findUnique: mockOrderFindUnique,
      },
      table: {
        findUnique: mockTableFindUnique,
      },
      promotion: {
        findUnique: mockPromotionFindUnique,
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

  describe('canActivate', () => {
    it('should allow access when no decorator is present', async () => {
      mockReflector.get.mockReturnValue(null);

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: { id: 'prod-1' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow access when user is not authenticated (let JwtAuthGuard handle it)', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext({
        user: null, // No user - guard defers to JwtAuthGuard
        params: { id: 'prod-1' },
      });

      // Guard returns true to let JwtAuthGuard handle auth
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when resource ID is missing', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
        optional: false,
      });

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: {}, // No id parameter
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing id parameter');
    });

    it('should allow access when resource ID is missing but optional is true', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
        optional: true,
      });

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: {}, // No id parameter
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow access when resource belongs to user business', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      mockProductFindUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
      } as Record<string, unknown>);

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: { id: 'prod-1' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        select: { businessId: true },
      });
    });

    it('should deny access when resource belongs to different business', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      mockProductFindUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-2', // Different business!
      } as Record<string, unknown>);

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: { id: 'prod-1' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You do not have access to this product',
      );
    });

    it('should deny access when resource is not found', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      mockProductFindUnique.mockResolvedValue(null);

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: { id: 'prod-999' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle errors gracefully and deny access', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      mockProductFindUnique.mockRejectedValue(new Error('Database error'));

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: { id: 'prod-1' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should work with different resource types', async () => {
      // Test customer
      mockReflector.get.mockReturnValue({
        resource: 'customer',
        param: 'id',
      });

      mockCustomerFindUnique.mockResolvedValue({
        id: 'cust-1',
        businessId: 'biz-1',
      } as Record<string, unknown>);

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: { id: 'cust-1' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        select: { businessId: true },
      });
    });

    it('should read ID from request body if not in params', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'productId',
      });

      mockProductFindUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
      } as Record<string, unknown>);

      const context = createMockContext({
        user: { businessId: 'biz-1', employeeId: 'emp-1', outletId: null, role: 'owner' },
        params: {},
        body: { productId: 'prod-1' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('BusinessScoped decorator', () => {
    it('should be a valid decorator function', () => {
      const options = { resource: 'product' as const, param: 'id' };
      const decorator = BusinessScoped(options);

      // Verify decorator is a function
      expect(typeof decorator).toBe('function');
      expect(decorator).toBeDefined();
    });
  });
});

/**
 * Helper to create mock ExecutionContext
 */
function createMockContext(data: {
  user: AuthUser | null;
  params: Record<string, unknown>;
  body?: Record<string, unknown>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: data.user,
        params: data.params,
        body: data.body || {},
      }),
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
}
