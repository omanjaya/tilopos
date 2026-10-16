import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  BusinessTypeService,
  TYPE_CHANGE_TX_OPTIONS,
} from '../business/services/business-type.service';
import { randomBytes } from 'crypto';
import type { OnboardingProgressResponse, OnboardingStepStatus } from './dto/onboarding.dto';
import type { GuidedSetupDto } from './dto/guided-setup.dto';

export interface GuidedSetupResult {
  business: { updated: boolean };
  businessType: { set: boolean; type: string | null; featuresEnabled: number };
  template: {
    applied: boolean;
    categories: number;
    products: number;
    modifierGroups: number;
    modifiers: number;
    tables: number;
  };
  paymentMethods: { configured: boolean; count: number };
  employee: { created: boolean; id: string | null };
  onboarding: { completed: boolean };
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly PRODUCTS_TARGET = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTypeService: BusinessTypeService,
  ) {}

  /**
   * Get onboarding progress for a business
   *
   * @param businessId - Business ID from authenticated user
   * @returns Onboarding progress with all step statuses
   */
  async getProgress(businessId: string): Promise<OnboardingProgressResponse> {
    // Execute all checks in parallel for better performance
    const [
      accountCreated,
      productsCount,
      paymentConfigured,
      employeesCount,
      firstTransaction,
      printerConfigured,
      businessSettings,
    ] = await Promise.all([
      this.checkAccountCreated(businessId),
      this.getProductCount(businessId),
      this.checkPaymentConfigured(businessId),
      this.getEmployeeCount(businessId),
      this.checkFirstTransaction(businessId),
      this.checkPrinterConfigured(businessId),
      this.getBusinessSettings(businessId),
    ]);

    const productsAdded = productsCount >= this.PRODUCTS_TARGET;
    const employeeAdded = employeesCount >= 1;

    // Calculate overall progress percentage
    const totalSteps = 6;
    const completedSteps = [
      accountCreated.done,
      productsAdded,
      paymentConfigured.done,
      employeeAdded,
      firstTransaction.done,
      printerConfigured.done,
    ].filter(Boolean).length;

    const progress = Math.round((completedSteps / totalSteps) * 100);
    const isCompleted = progress === 100;

    // Check dismissed status from business settings
    const settings = (businessSettings?.settings as Record<string, unknown>) ?? {};
    const isDismissed = settings.onboardingDismissed === true;

    // Get completion timestamp
    const completedAt =
      isCompleted && settings.onboardingCompletedAt
        ? new Date(settings.onboardingCompletedAt as string)
        : null;

    return {
      isDismissed,
      isCompleted,
      steps: {
        createAccount: accountCreated.done,
        addProducts: productsAdded,
        productCount: productsCount,
        setupPayments: paymentConfigured.done,
        addEmployees: employeeAdded,
        firstTransaction: firstTransaction.done,
        setupPrinter: printerConfigured.done,
      },
      completedAt,
      progress,
    };
  }

  /**
   * Dismiss the onboarding checklist
   *
   * @param businessId - Business ID from authenticated user
   * @returns Updated business settings
   */
  async dismissChecklist(businessId: string): Promise<{ dismissed: boolean; dismissedAt: Date }> {
    const dismissedAt = new Date();

    await this.prisma.$transaction((tx) =>
      this.patchBusinessSettings(tx, businessId, {
        onboardingDismissed: true,
        onboardingDismissedAt: dismissedAt.toISOString(),
      }),
    );

    return {
      dismissed: true,
      dismissedAt,
    };
  }

  /**
   * All-in-one guided setup: business profile, type, template, payments, employee
   */
  async guidedSetup(
    businessId: string,
    employeeId: string,
    outletId: string | null,
    dto: GuidedSetupDto,
  ): Promise<GuidedSetupResult> {
    // Hash outside the transaction (CPU-bound, keeps the row lock short).
    const hashedPin = dto.employee ? await bcrypt.hash(dto.employee.pin, 10) : null;

    const result = await this.prisma.$transaction(
      (tx) => this.guidedSetupInTx(tx, businessId, employeeId, outletId, dto, hashedPin),
      TYPE_CHANGE_TX_OPTIONS,
    );

    this.logger.log(`Guided setup completed for business ${businessId}`);
    return result;
  }

  private async guidedSetupInTx(
    tx: Prisma.TransactionClient,
    businessId: string,
    employeeId: string,
    outletId: string | null,
    dto: GuidedSetupDto,
    hashedPin: string | null,
  ): Promise<GuidedSetupResult> {
    const result: GuidedSetupResult = {
      business: { updated: false },
      businessType: { set: false, type: null, featuresEnabled: 0 },
      template: {
        applied: false,
        categories: 0,
        products: 0,
        modifierGroups: 0,
        modifiers: 0,
        tables: 0,
      },
      paymentMethods: { configured: false, count: 0 },
      employee: { created: false, id: null },
      onboarding: { completed: false },
    };

    // Lock the business row: serialises concurrent setups and settings writers.
    const settings = await this.lockBusinessSettings(tx, businessId);
    if (settings.guidedSetupCompleted === true) {
      throw new ConflictException('Guided setup has already been completed');
    }

    // 1. Update business profile
    if (dto.business) {
      const updateData: Prisma.BusinessUpdateInput = {};
      if (dto.business.name) updateData.name = dto.business.name;
      if (dto.business.phone) updateData.phone = dto.business.phone;
      if (dto.business.address) updateData.address = dto.business.address;

      if (Object.keys(updateData).length > 0) {
        await tx.business.update({ where: { id: businessId }, data: updateData });
        result.business.updated = true;
      }
    }

    const resolvedOutletId = await this.resolveOutletId(tx, businessId, outletId);

    // 2+3. Set business type, enable features and apply the template ONCE
    //      (changeBusinessType applies the selected template sections itself).
    if (dto.businessType) {
      const typeResult = await this.businessTypeService.changeBusinessType(
        businessId,
        dto.businessType,
        resolvedOutletId ?? undefined,
        tx,
        dto.template?.sections,
      );
      result.businessType = {
        set: typeResult.success,
        type: dto.businessType,
        featuresEnabled: typeResult.featuresEnabled,
      };
      if (typeResult.templateApplied && typeResult.templateData) {
        result.template = { applied: true, ...typeResult.templateData };
      }
    }

    // 4. Set payment methods
    if (dto.paymentMethods && dto.paymentMethods.length > 0) {
      settings.businessPaymentMethods = this.buildPaymentMethods(dto.paymentMethods);
      result.paymentMethods = { configured: true, count: dto.paymentMethods.length };
    }

    // 5. Set tax rate on outlet
    if (dto.taxRate !== undefined && resolvedOutletId) {
      await tx.outlet.updateMany({
        where: { id: resolvedOutletId, businessId },
        data: { taxRate: dto.taxRate },
      });
    }

    // 6. Create employee (cashier) with a hashed PIN
    if (dto.employee && hashedPin) {
      if (dto.employee.email) {
        const taken = await tx.employee.findFirst({
          where: { email: { equals: dto.employee.email, mode: 'insensitive' } },
          select: { id: true },
        });
        if (taken) {
          throw new ConflictException('Email is already used by another employee');
        }
      }
      const newEmployee = await tx.employee.create({
        data: {
          businessId,
          outletId: resolvedOutletId,
          name: dto.employee.name,
          email: dto.employee.email || null,
          pin: hashedPin,
          role: 'cashier',
        },
        select: { id: true },
      });
      result.employee = { created: true, id: newEmployee.id };
    }

    // 7. Mark onboarding completed
    await tx.employee.updateMany({
      where: { id: employeeId, businessId },
      data: { onboardingCompleted: true },
    });

    settings.guidedSetupCompleted = true;
    settings.guidedSetupCompletedAt = new Date().toISOString();
    await tx.business.update({
      where: { id: businessId },
      data: { settings: settings as Prisma.InputJsonValue },
    });

    result.onboarding.completed = true;
    return result;
  }

  /**
   * Reads business.settings with a row lock (SELECT ... FOR UPDATE) so the
   * read-modify-write of the JSON column cannot lose concurrent updates.
   * Must be called inside a transaction.
   */
  private async lockBusinessSettings(
    tx: Prisma.TransactionClient,
    businessId: string,
  ): Promise<Record<string, unknown>> {
    const rows = await tx.$queryRaw<{ settings: unknown }[]>`
      SELECT settings FROM businesses WHERE id = ${businessId}::uuid FOR UPDATE`;
    const raw = rows[0]?.settings;
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  }

  private async patchBusinessSettings(
    tx: Prisma.TransactionClient,
    businessId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const settings = await this.lockBusinessSettings(tx, businessId);
    await tx.business.update({
      where: { id: businessId },
      data: { settings: { ...settings, ...patch } as Prisma.InputJsonValue },
    });
  }

  /** The caller's outlet (verified to belong to the business) or the first active one. */
  private async resolveOutletId(
    tx: Prisma.TransactionClient,
    businessId: string,
    outletId: string | null,
  ): Promise<string | null> {
    if (outletId) {
      const owned = await tx.outlet.findFirst({
        where: { id: outletId, businessId },
        select: { id: true },
      });
      if (owned) return owned.id;
    }
    const outlet = await tx.outlet.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return outlet?.id ?? null;
  }

  private buildPaymentMethods(methods: string[]) {
    const typeMap: Record<string, string> = {
      cash: 'cash',
      qris: 'qris',
      debit: 'card',
      credit: 'card',
      transfer: 'bank_transfer',
      ewallet: 'ewallet',
    };

    const nameMap: Record<string, string> = {
      cash: 'Tunai',
      qris: 'QRIS',
      debit: 'Kartu Debit',
      credit: 'Kartu Kredit',
      transfer: 'Transfer Bank',
      ewallet: 'E-Wallet',
    };

    return methods.map((m) => ({
      id: randomBytes(16).toString('hex'),
      name: nameMap[m] || m,
      type: typeMap[m] || m,
      isActive: true,
      processingFee: 0,
      settings: {},
    }));
  }

  /**
   * Account step: done once the business exists (the caller is authenticated
   * as an employee of it).
   */
  private async checkAccountCreated(businessId: string): Promise<OnboardingStepStatus> {
    const count = await this.prisma.business.count({ where: { id: businessId } });
    return { done: count > 0 };
  }

  /**
   * Count active products for the business
   *
   * @param businessId - Business ID
   * @returns Number of active products
   */
  private async getProductCount(businessId: string): Promise<number> {
    const count = await this.prisma.product.count({
      where: {
        businessId,
        isActive: true,
      },
    });
    return count;
  }

  /**
   * Check if payment methods are configured
   *
   * @param businessId - Business ID
   * @returns Payment configuration status
   */
  private async checkPaymentConfigured(businessId: string): Promise<OnboardingStepStatus> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) {
      return { done: false };
    }

    const settings = business.settings as Record<string, unknown> | null;
    const businessPaymentMethods = settings?.businessPaymentMethods as
      | Array<{ isActive: boolean }>
      | undefined;

    // Check if at least one payment method is active
    if (businessPaymentMethods && Array.isArray(businessPaymentMethods)) {
      const hasActiveMethod = businessPaymentMethods.some((method) => method.isActive === true);
      return { done: hasActiveMethod };
    }

    // Default: cash is always available
    return { done: true };
  }

  /**
   * Count active employees for the business
   *
   * @param businessId - Business ID
   * @returns Number of active employees
   */
  private async getEmployeeCount(businessId: string): Promise<number> {
    const count = await this.prisma.employee.count({
      where: {
        businessId,
        isActive: true,
      },
    });
    return count;
  }

  /**
   * Check if first transaction exists for the business
   *
   * @param businessId - Business ID
   * @returns First transaction status
   */
  private async checkFirstTransaction(businessId: string): Promise<OnboardingStepStatus> {
    // Find any transaction for this business through outlets
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId },
      select: { id: true },
    });

    if (outlets.length === 0) {
      return { done: false };
    }

    const outletIds = outlets.map((o) => o.id);

    const transactionCount = await this.prisma.transaction.count({
      where: {
        outletId: { in: outletIds },
        status: 'completed',
      },
    });

    return { done: transactionCount > 0 };
  }

  /**
   * Check if printer is configured for the business
   *
   * @param businessId - Business ID
   * @returns Printer configuration status
   */
  private async checkPrinterConfigured(businessId: string): Promise<OnboardingStepStatus> {
    // Printers are configured in Settings > Printers (business.settings.printerConfigs).
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    const settings = business?.settings as Record<string, unknown> | null;
    const printers = settings?.printerConfigs;
    const hasActivePrinter =
      Array.isArray(printers) &&
      printers.some(
        (p) =>
          typeof p === 'object' && p !== null && (p as { isActive?: unknown }).isActive !== false,
      );
    return { done: hasActivePrinter };
  }

  /**
   * Get business settings to check onboarding status
   *
   * @param businessId - Business ID
   * @returns Business settings or null
   */
  private async getBusinessSettings(
    businessId: string,
  ): Promise<{ settings: Record<string, unknown> } | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) return null;

    return {
      settings: (business.settings as Record<string, unknown>) ?? {},
    };
  }
}
