import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrdersController } from '../orders.controller';
import { CreateOrderUseCase } from '../../../application/use-cases/orders/create-order.use-case';
import { UpdateOrderStatusUseCase } from '../../../application/use-cases/orders/update-order-status.use-case';
import { ModifyOrderUseCase } from '../../../application/use-cases/orders/modify-order.use-case';
import { CancelOrderUseCase } from '../../../application/use-cases/orders/cancel-order.use-case';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import type { IOrderRepository } from '../../../domain/interfaces/repositories/order.repository';
import { OrdersService } from '../orders.service';
import { BusinessScopeGuard } from '../../../shared/guards/business-scope.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

/**
 * IDOR Prevention Tests for Orders Module
 */
describe('Orders IDOR Prevention', () => {
  let controller: OrdersController;
  let guard: BusinessScopeGuard;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockOrdersService: jest.Mocked<OrdersService>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockReflector: jest.Mocked<Reflector>;

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
    businessId: businessB,
    outletId: 'outlet-b',
    orderType: 'dine_in',
    status: 'pending',
    totalAmount: 50000,
  };

  beforeEach(async () => {
    mockOrderRepo = {
      findById: jest.fn(),
    } as any;

    mockOrdersService = {
      modifyItems: jest.fn(),
      cancel: jest.fn(),
      setPriority: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    guard = new BusinessScopeGuard(mockReflector, mockPrisma);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: CreateOrderUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateOrderStatusUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ModifyOrderUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CancelOrderUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: REPOSITORY_TOKENS.ORDER,
          useValue: mockOrderRepo,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('Cross-Business Order Access Prevention', () => {
    it('should prevent accessing order from different business', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFromBusinessB as any);

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
      mockPrisma.order.findUnique.mockResolvedValue(orderFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent modifying order items from different business', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockOrdersService.modifyItems).not.toHaveBeenCalled();
    });

    it('should prevent canceling order from different business', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockOrdersService.cancel).not.toHaveBeenCalled();
    });

    it('should prevent setting priority for order from different business', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(orderFromBusinessB as any);

      mockReflector.get.mockReturnValue({
        resource: 'order',
        param: 'id',
      });

      const context = createMockContext(userFromBusinessA, { id: 'order-b-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockOrdersService.setPriority).not.toHaveBeenCalled();
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
