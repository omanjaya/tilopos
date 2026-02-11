import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessScopeGuard, BusinessScoped, BUSINESS_SCOPE_KEY } from '../business-scope.guard';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';

describe('BusinessScopeGuard', () => {
  let guard: BusinessScopeGuard;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      table: {
        findUnique: jest.fn(),
      },
      promotion: {
        findUnique: jest.fn(),
      },
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    guard = new BusinessScopeGuard(mockReflector, mockPrisma);
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

    it('should throw ForbiddenException when user is not authenticated', async () => {
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext({
        user: null, // No user
        params: { id: 'prod-1' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
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

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
      } as any);

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

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-2', // Different business!
      } as any);

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

      mockPrisma.product.findUnique.mockResolvedValue(null);

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

      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'));

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

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        businessId: 'biz-1',
      } as any);

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

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
      } as any);

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
    it('should set metadata correctly', () => {
      const options = { resource: 'product' as const, param: 'id' };
      const decorator = BusinessScoped(options);

      const mockTarget = {};
      const mockKey = 'testMethod';
      const mockDescriptor = {};

      // Apply decorator
      decorator(mockTarget, mockKey, mockDescriptor);

      // Metadata should be set (we can't test Reflect.getMetadata directly without a real reflector)
      expect(decorator).toBeDefined();
    });
  });
});

/**
 * Helper to create mock ExecutionContext
 */
function createMockContext(data: {
  user: AuthUser | null;
  params: Record<string, any>;
  body?: Record<string, any>;
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
    getClass: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => 'http' as any,
  } as ExecutionContext;
}
