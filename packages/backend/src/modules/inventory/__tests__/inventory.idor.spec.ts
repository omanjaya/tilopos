import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InventoryController } from '../inventory.controller';
import { CreateProductUseCase } from '../../../application/use-cases/inventory/create-product.use-case';
import { UpdateStockUseCase } from '../../../application/use-cases/inventory/update-stock.use-case';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import type { IProductRepository } from '../../../domain/interfaces/repositories/product.repository';
import type { IInventoryRepository } from '../../../domain/interfaces/repositories/inventory.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ExcelParserService } from '../../../infrastructure/import/excel-parser.service';
import { InventoryService } from '../inventory.service';
import { OutletProductService } from '../outlet-product.service';
import { BusinessScopeGuard } from '../../../shared/guards/business-scope.guard';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

/**
 * IDOR Prevention Tests for Inventory Module
 *
 * These tests verify that BusinessScopeGuard prevents cross-business access
 * to products, categories, and other inventory resources.
 */
describe('Inventory IDOR Prevention', () => {
  let controller: InventoryController;
  let guard: BusinessScopeGuard;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockInventoryRepo: jest.Mocked<IInventoryRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockProductFindUnique: jest.Mock;
  let mockCategoryFindUnique: jest.Mock;

  // Test data
  const businessA = 'business-a-id';
  const businessB = 'business-b-id';

  const userFromBusinessA: AuthUser = {
    businessId: businessA,
    employeeId: 'emp-a',
    outletId: 'outlet-a',
    role: 'owner',
  };

  const productFromBusinessA = {
    id: 'prod-a-1',
    businessId: businessA,
    name: 'Product from Business A',
    basePrice: 10000,
    isActive: true,
  };

  const productFromBusinessB = {
    id: 'prod-b-1',
    businessId: businessB,
    name: 'Product from Business B',
    basePrice: 15000,
    isActive: true,
  };

  beforeEach(async () => {
    // Create mocks
    mockProductRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByBusinessId: jest.fn(),
    } as unknown as jest.Mocked<IProductRepository>;

    mockInventoryRepo = {} as unknown as jest.Mocked<IInventoryRepository>;

    mockProductFindUnique = jest.fn();
    mockCategoryFindUnique = jest.fn();
    mockPrisma = {
      product: {
        findUnique: mockProductFindUnique,
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findUnique: mockCategoryFindUnique,
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    mockReflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockJwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    // Create guard
    guard = new BusinessScopeGuard(mockReflector, mockPrisma, mockJwtService);

    // Create test module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: CreateProductUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateStockUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: REPOSITORY_TOKENS.PRODUCT,
          useValue: mockProductRepo,
        },
        {
          provide: REPOSITORY_TOKENS.INVENTORY,
          useValue: mockInventoryRepo,
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
          provide: InventoryService,
          useValue: {},
        },
        {
          provide: OutletProductService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  describe('GET /products/:id - Cross-Business Access Prevention', () => {
    it('should prevent user from business A accessing product from business B', async () => {
      // Guard sees product belongs to business B
      mockProductFindUnique.mockResolvedValue(productFromBusinessB as Record<string, unknown>);

      // Simulate guard execution
      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-b-1' });

      // Guard should throw ForbiddenException
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You do not have access to this product',
      );
    });

    it('should allow user from business A to access their own product', async () => {
      // Guard sees product belongs to business A
      mockProductFindUnique.mockResolvedValue(productFromBusinessA as Record<string, unknown>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockProductRepo.findById.mockResolvedValue(productFromBusinessA as any);

      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-a-1' });

      // Guard should allow access
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);

      // Controller method should execute successfully
      const result = await controller.getProduct('prod-a-1');
      expect(result).toEqual(productFromBusinessA);
      expect(mockProductRepo.findById).toHaveBeenCalledWith('prod-a-1');
    });

    it('should prevent enumeration by treating not-found as forbidden', async () => {
      // Resource doesn't exist
      mockProductFindUnique.mockResolvedValue(null);

      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-nonexistent' });

      // Guard should deny access (prevent enumeration)
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PUT /products/:id - Cross-Business Modification Prevention', () => {
    it('should prevent user from business A modifying product from business B', async () => {
      mockProductFindUnique.mockResolvedValue(productFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-b-1' });

      // Guard should block the request
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

      // Controller method should never execute
      expect(mockProductRepo.update).not.toHaveBeenCalled();
    });

    it('should allow user to modify their own product', async () => {
      mockProductFindUnique.mockResolvedValue(productFromBusinessA as Record<string, unknown>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockProductRepo.findById.mockResolvedValue(productFromBusinessA as any);
      mockProductRepo.update.mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { ...productFromBusinessA, name: 'Updated' } as any,
      );

      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-a-1' });

      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);

      await controller.updateProduct('prod-a-1', { name: 'Updated' });
      expect(mockProductRepo.update).toHaveBeenCalled();
    });
  });

  describe('DELETE /products/:id - Cross-Business Deletion Prevention', () => {
    it('should prevent user from business A deleting product from business B', async () => {
      mockProductFindUnique.mockResolvedValue(productFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockProductRepo.delete).not.toHaveBeenCalled();
    });

    it('should allow user to delete their own product', async () => {
      mockProductFindUnique.mockResolvedValue(productFromBusinessA as Record<string, unknown>);
      mockProductRepo.delete.mockResolvedValue(undefined);

      mockReflector.get.mockReturnValue({
        resource: 'product',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'prod-a-1' });

      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);

      await controller.deleteProduct('prod-a-1');
      expect(mockProductRepo.delete).toHaveBeenCalledWith('prod-a-1');
    });
  });

  describe('Category Endpoints - Cross-Business Access Prevention', () => {
    it('should prevent cross-business category access', async () => {
      const categoryFromBusinessB = {
        id: 'cat-b-1',
        businessId: businessB,
        name: 'Category B',
      };

      mockCategoryFindUnique.mockResolvedValue(categoryFromBusinessB as Record<string, unknown>);

      mockReflector.get.mockReturnValue({
        resource: 'category',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'cat-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});

/**
 * Helper to create mock ExecutionContext
 */
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
