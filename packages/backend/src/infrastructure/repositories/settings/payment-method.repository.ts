import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import type {
  PaymentMethodConfig,
  BusinessPaymentMethod,
  CreateBusinessPaymentMethodData,
  UpdateBusinessPaymentMethodData,
} from '../../../domain/interfaces/repositories/settings.repository';
import { findBusinessSettings, mutateBusinessSettings, type JsonObject } from './json-settings';

const DEFAULT_LEGACY_METHODS: PaymentMethodConfig[] = [
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

/** Defaults use deterministic ids so they are addressable without being persisted. */
function defaultBusinessMethods(businessId: string): BusinessPaymentMethod[] {
  return [
    {
      id: `${businessId}-cash`,
      name: 'Tunai',
      type: 'cash',
      isActive: true,
      processingFee: 0,
      settings: {},
    },
    {
      id: `${businessId}-qris`,
      name: 'QRIS',
      type: 'qris',
      isActive: true,
      processingFee: 0.7,
      settings: {},
    },
    {
      id: `${businessId}-card`,
      name: 'Kartu Debit/Kredit',
      type: 'card',
      isActive: true,
      processingFee: 2.5,
      settings: {},
    },
    {
      id: `${businessId}-gopay`,
      name: 'GoPay',
      type: 'ewallet',
      isActive: true,
      processingFee: 2,
      settings: {},
    },
    {
      id: `${businessId}-ovo`,
      name: 'OVO',
      type: 'ewallet',
      isActive: true,
      processingFee: 2,
      settings: {},
    },
    {
      id: `${businessId}-bank_transfer`,
      name: 'Transfer Bank',
      type: 'bank_transfer',
      isActive: false,
      processingFee: 0,
      settings: {},
    },
  ];
}

function readBusinessMethods(settings: JsonObject, businessId: string): BusinessPaymentMethod[] {
  const methods = settings.businessPaymentMethods;
  return Array.isArray(methods)
    ? (methods as BusinessPaymentMethod[]).map((m) => ({ ...m }))
    : defaultBusinessMethods(businessId);
}

/**
 * Payment method configuration stored in business.settings.
 * Writes are read-modify-write under a row lock (mutateBusinessSettings);
 * reads never write.
 */
@Injectable()
export class PaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Legacy Payment Methods ====================

  async getPaymentMethods(businessId: string): Promise<PaymentMethodConfig[]> {
    const settings = await findBusinessSettings(this.prisma, businessId);
    const methods = settings.paymentMethods;
    // Onboarding stores a plain string[]; only the object form is the legacy config.
    if (Array.isArray(methods) && methods.every((m) => m && typeof m === 'object')) {
      return methods as PaymentMethodConfig[];
    }
    return DEFAULT_LEGACY_METHODS;
  }

  async updatePaymentMethods(businessId: string, data: PaymentMethodConfig[]): Promise<void> {
    const methods = data.map((m) => ({
      method: m.method,
      enabled: m.enabled,
      displayName: m.displayName,
      processingFee: m.processingFee,
      feeType: m.feeType,
      minAmount: m.minAmount,
      maxAmount: m.maxAmount,
      sortOrder: m.sortOrder,
    }));
    await mutateBusinessSettings(this.prisma, businessId, (current) => ({
      settings: { ...current, paymentMethods: methods },
      result: undefined,
    }));
  }

  // ==================== Business Payment Methods (CRUD API) ====================

  private generatePaymentMethodId(): string {
    return randomBytes(16).toString('hex');
  }

  async getBusinessPaymentMethods(businessId: string): Promise<BusinessPaymentMethod[]> {
    const settings = await findBusinessSettings(this.prisma, businessId);
    return readBusinessMethods(settings, businessId);
  }

  async createBusinessPaymentMethod(
    businessId: string,
    data: CreateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    const newMethod: BusinessPaymentMethod = {
      id: this.generatePaymentMethodId(),
      name: data.name,
      type: data.type,
      isActive: data.isActive ?? true,
      processingFee: data.processingFee ?? 0,
      settings: data.settings ?? {},
    };
    return mutateBusinessSettings(this.prisma, businessId, (current) => ({
      settings: {
        ...current,
        businessPaymentMethods: [...readBusinessMethods(current, businessId), newMethod],
      },
      result: newMethod,
    }));
  }

  async updateBusinessPaymentMethod(
    businessId: string,
    id: string,
    data: UpdateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const methods = readBusinessMethods(current, businessId);
      const index = methods.findIndex((m) => m.id === id);
      if (index === -1) {
        throw new NotFoundException('Payment method not found');
      }
      const updated: BusinessPaymentMethod = {
        ...methods[index],
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.processingFee !== undefined && { processingFee: data.processingFee }),
        ...(data.settings !== undefined && { settings: data.settings }),
      };
      methods[index] = updated;
      return { settings: { ...current, businessPaymentMethods: methods }, result: updated };
    });
  }

  /** Soft delete (isActive = false). */
  async deleteBusinessPaymentMethod(businessId: string, id: string): Promise<void> {
    await mutateBusinessSettings(this.prisma, businessId, (current) => {
      const methods = readBusinessMethods(current, businessId);
      const index = methods.findIndex((m) => m.id === id);
      if (index === -1) {
        throw new NotFoundException('Payment method not found');
      }
      methods[index] = { ...methods[index], isActive: false };
      return { settings: { ...current, businessPaymentMethods: methods }, result: undefined };
    });
  }
}
