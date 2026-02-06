/**
 * Self-Order & Online Store Service (Facade)
 *
 * This file provides backward compatibility by delegating to the refactored services.
 * New code should import the specific services directly from ./services/
 *
 * @deprecated Use individual services from ./services/ instead
 */

import { Injectable } from '@nestjs/common';
import { SelfOrderSessionService } from './services/self-order-session.service';
import { SelfOrderMenuService } from './services/self-order-menu.service';
import { SelfOrderCartService } from './services/self-order-cart.service';
import { SelfOrderSubmissionService } from './services/self-order-submission.service';
import { OnlineStoreConfigService } from './services/online-store-config.service';
import { OnlineStoreCatalogService } from './services/online-store-catalog.service';
import { OnlineStoreOrderService } from './services/online-store-order.service';
import type {
  SelfOrderSessionInfo,
  AddToCartDto,
  SelfOrderPaymentDto,
  MenuResponse,
  OrderSubmissionResult,
  PaymentResult,
} from './types';
import type {
  OnlineStoreConfig,
  StoreCatalogResponse,
  StoreOrderInfo,
  CreateStoreOrderDto,
  StorePaymentResult,
  GetStoreOrdersOptions,
} from './types';
import { StoreOrderStatus } from '@prisma/client';

// Re-export types for backward compatibility
export type {
  SelfOrderSessionInfo,
  SelfOrderCartItem,
  AddToCartDto,
  SelfOrderPaymentDto,
} from './types';
export type { OnlineStoreConfig, StoreOrderInfo } from './types';

/**
 * Self-Order Service Facade
 *
 * Delegates to refactored services for backward compatibility.
 * @deprecated Use SelfOrderSessionService, SelfOrderMenuService, etc. directly
 */
@Injectable()
export class SelfOrderService {
  constructor(
    private readonly sessionService: SelfOrderSessionService,
    private readonly menuService: SelfOrderMenuService,
    private readonly cartService: SelfOrderCartService,
    private readonly submissionService: SelfOrderSubmissionService,
  ) {}

  async createSession(outletId: string, tableId?: string): Promise<SelfOrderSessionInfo> {
    return this.sessionService.createSession(outletId, tableId);
  }

  async getSession(sessionCode: string): Promise<SelfOrderSessionInfo> {
    return this.sessionService.getSession(sessionCode);
  }

  async getMenu(outletId: string): Promise<MenuResponse> {
    return this.menuService.getMenu(outletId);
  }

  async addToCart(data: AddToCartDto): Promise<SelfOrderSessionInfo> {
    return this.cartService.addToCart(data);
  }

  async updateCartItem(
    sessionId: string,
    itemIndex: number,
    quantity: number,
  ): Promise<SelfOrderSessionInfo> {
    return this.cartService.updateCartItem(sessionId, itemIndex, quantity);
  }

  async submitOrder(sessionId: string): Promise<OrderSubmissionResult> {
    return this.submissionService.submitOrder(sessionId);
  }

  async processPayment(data: SelfOrderPaymentDto): Promise<PaymentResult> {
    return this.submissionService.processPayment(data);
  }

  async confirmPayment(sessionId: string, referenceNumber: string): Promise<void> {
    return this.submissionService.confirmPayment(sessionId, referenceNumber);
  }

  async expireOldSessions(): Promise<{ expired: number }> {
    return this.sessionService.expireOldSessions();
  }
}

/**
 * Online Store Service Facade
 *
 * Delegates to refactored services for backward compatibility.
 * @deprecated Use OnlineStoreConfigService, OnlineStoreCatalogService, etc. directly
 */
@Injectable()
export class OnlineStoreService {
  constructor(
    private readonly configService: OnlineStoreConfigService,
    private readonly catalogService: OnlineStoreCatalogService,
    private readonly orderService: OnlineStoreOrderService,
  ) {}

  async getStore(slug: string): Promise<OnlineStoreConfig | null> {
    return this.configService.getStore(slug);
  }

  async getCatalog(storeId: string): Promise<StoreCatalogResponse> {
    return this.catalogService.getCatalog(storeId);
  }

  async createOrder(storeId: string, data: CreateStoreOrderDto): Promise<StoreOrderInfo> {
    return this.orderService.createOrder(storeId, data);
  }

  async updateOrderStatus(orderId: string, status: StoreOrderStatus): Promise<void> {
    return this.orderService.updateOrderStatus(orderId, status);
  }

  async processPayment(
    orderId: string,
    method: 'qris' | 'bank_transfer',
  ): Promise<StorePaymentResult> {
    return this.orderService.processPayment(orderId, method);
  }

  async getOrders(storeId: string, options?: GetStoreOrdersOptions): Promise<StoreOrderInfo[]> {
    return this.orderService.getOrders(storeId, options);
  }
}
