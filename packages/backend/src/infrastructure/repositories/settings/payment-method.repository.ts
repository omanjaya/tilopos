import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import type {
  PaymentMethodConfig,
  BusinessPaymentMethod,
  CreateBusinessPaymentMethodData,
  UpdateBusinessPaymentMethodData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing payment methods.
 * Handles payment method configurations, processing fees, and CRUD operations.
 */
@Injectable()
export class PaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Legacy Payment Methods ====================

  /**
   * Get payment methods configuration (legacy format)
   * Returns default payment methods if not configured
   */
  async getPaymentMethods(businessId: string): Promise<PaymentMethodConfig[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    const settings = (business?.settings as Record<string, unknown>) || {};
    const methods = settings.paymentMethods as PaymentMethodConfig[] | undefined;

    if (methods && Array.isArray(methods)) {
      return methods;
    }

    // Default payment methods
    return [
      { method: 'cash', enabled: true, displayName: 'Tunai', sortOrder: 1 },
      {
        method: 'qris',
        enabled: true,
        displayName: 'QRIS',
        processingFee: 0.7,
        feeType: 'percentage',
        sortOrder: 2,
      },
      {
        method: 'card',
        enabled: true,
        displayName: 'Kartu Debit/Kredit',
        processingFee: 2.5,
        feeType: 'percentage',
        sortOrder: 3,
      },
      {
        method: 'gopay',
        enabled: true,
        displayName: 'GoPay',
        processingFee: 2,
        feeType: 'percentage',
        sortOrder: 4,
      },
      {
        method: 'ovo',
        enabled: true,
        displayName: 'OVO',
        processingFee: 2,
        feeType: 'percentage',
        sortOrder: 5,
      },
      {
        method: 'dana',
        enabled: true,
        displayName: 'DANA',
        processingFee: 1.5,
        feeType: 'percentage',
        sortOrder: 6,
      },
      {
        method: 'shopeepay',
        enabled: true,
        displayName: 'ShopeePay',
        processingFee: 1.5,
        feeType: 'percentage',
        sortOrder: 7,
      },
      { method: 'bank_transfer', enabled: false, displayName: 'Transfer Bank', sortOrder: 8 },
    ];
  }

  /**
   * Update payment methods configuration (legacy format)
   */
  async updatePaymentMethods(businessId: string, data: PaymentMethodConfig[]): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    const currentSettings = (business?.settings as Record<string, unknown>) || {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          paymentMethods: data,
        } as never,
      },
    });
  }

  // ==================== Business Payment Methods (New CRUD API) ====================

  /**
   * Generate unique payment method ID
   */
  private generatePaymentMethodId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Get all business payment methods
   * @throws NotFoundException if business not found
   */
  async getBusinessPaymentMethods(businessId: string): Promise<BusinessPaymentMethod[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const settings = (business.settings as Record<string, unknown>) || {};
    const methods = settings.businessPaymentMethods as BusinessPaymentMethod[] | undefined;

    if (methods && Array.isArray(methods)) {
      return methods;
    }

    // Default payment methods
    const defaults: BusinessPaymentMethod[] = [
      {
        id: this.generatePaymentMethodId(),
        name: 'Tunai',
        type: 'cash',
        isActive: true,
        processingFee: 0,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'QRIS',
        type: 'qris',
        isActive: true,
        processingFee: 0.7,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'Kartu Debit/Kredit',
        type: 'card',
        isActive: true,
        processingFee: 2.5,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'GoPay',
        type: 'ewallet',
        isActive: true,
        processingFee: 2,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'OVO',
        type: 'ewallet',
        isActive: true,
        processingFee: 2,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'Transfer Bank',
        type: 'bank_transfer',
        isActive: false,
        processingFee: 0,
        settings: {},
      },
    ];

    return defaults;
  }

  /**
   * Create a new business payment method
   */
  async createBusinessPaymentMethod(
    businessId: string,
    data: CreateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    const methods = await this.getBusinessPaymentMethods(businessId);
    const newMethod: BusinessPaymentMethod = {
      id: this.generatePaymentMethodId(),
      name: data.name,
      type: data.type,
      isActive: data.isActive ?? true,
      processingFee: data.processingFee ?? 0,
      settings: data.settings ?? {},
    };

    methods.push(newMethod);
    await this.saveBusinessPaymentMethods(businessId, methods);
    return newMethod;
  }

  /**
   * Update an existing business payment method
   * @throws NotFoundException if payment method not found
   */
  async updateBusinessPaymentMethod(
    businessId: string,
    id: string,
    data: UpdateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    const methods = await this.getBusinessPaymentMethods(businessId);
    const index = methods.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new NotFoundException('Payment method not found');
    }

    const existing = methods[index];
    const updated: BusinessPaymentMethod = {
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.processingFee !== undefined && { processingFee: data.processingFee }),
      ...(data.settings !== undefined && { settings: data.settings }),
    };

    methods[index] = updated;
    await this.saveBusinessPaymentMethods(businessId, methods);
    return updated;
  }

  /**
   * Soft delete a business payment method (set isActive to false)
   * @throws NotFoundException if payment method not found
   */
  async deleteBusinessPaymentMethod(businessId: string, id: string): Promise<void> {
    const methods = await this.getBusinessPaymentMethods(businessId);
    const index = methods.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new NotFoundException('Payment method not found');
    }

    // Soft-delete by setting isActive to false
    methods[index] = { ...methods[index], isActive: false };
    await this.saveBusinessPaymentMethods(businessId, methods);
  }

  /**
   * Save payment methods to business settings
   */
  private async saveBusinessPaymentMethods(
    businessId: string,
    methods: BusinessPaymentMethod[],
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    const currentSettings = (business?.settings as Record<string, unknown>) || {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          businessPaymentMethods: methods,
        } as never,
      },
    });
  }
}
