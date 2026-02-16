import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TemplatesService } from '../templates/templates.service';
import { BusinessTypeService } from '../business/services/business-type.service';
import { randomBytes } from 'crypto';
import type {
  OnboardingProgressResponse,
  OnboardingStepStatus,
} from './dto/onboarding.dto';
import type { GuidedSetupDto } from './dto/guided-setup.dto';

export interface GuidedSetupResult {
  business: { updated: boolean };
  businessType: { set: boolean; type: string | null; featuresEnabled: number };
  template: { applied: boolean; categories: number; products: number; modifierGroups: number; modifiers: number; tables: number };
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
    private readonly templatesService: TemplatesService,
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

    // Read existing settings first to avoid overwriting
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    const existingSettings = (business?.settings as Record<string, unknown>) ?? {};

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...existingSettings,
          onboardingDismissed: true,
          onboardingDismissedAt: dismissedAt.toISOString(),
        } as never,
      },
    });

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
    const result: GuidedSetupResult = {
      business: { updated: false },
      businessType: { set: false, type: null, featuresEnabled: 0 },
      template: { applied: false, categories: 0, products: 0, modifierGroups: 0, modifiers: 0, tables: 0 },
      paymentMethods: { configured: false, count: 0 },
      employee: { created: false, id: null },
      onboarding: { completed: false },
    };

    // 1. Update business profile
    if (dto.business) {
      const updateData: Record<string, string> = {};
      if (dto.business.name) updateData.name = dto.business.name;
      if (dto.business.phone) updateData.phone = dto.business.phone;
      if (dto.business.address) updateData.address = dto.business.address;

      if (Object.keys(updateData).length > 0) {
        await this.prisma.business.update({
          where: { id: businessId },
          data: updateData,
        });
        result.business.updated = true;
      }
    }

    // 2. Set business type + enable features
    if (dto.businessType) {
      const typeResult = await this.businessTypeService.changeBusinessType(businessId, dto.businessType);
      result.businessType = {
        set: typeResult.success,
        type: dto.businessType,
        featuresEnabled: typeResult.featuresEnabled,
      };
    }

    // 3. Apply template
    const resolvedOutletId = outletId ?? await this.getFirstOutletId(businessId);
    if (dto.businessType && dto.template?.sections && resolvedOutletId) {
      const templateResult = await this.templatesService.applyTemplate(
        businessId,
        resolvedOutletId,
        dto.businessType,
        dto.template.sections,
      );
      result.template = { applied: true, ...templateResult };
    }

    // 4. Set payment methods
    if (dto.paymentMethods && dto.paymentMethods.length > 0) {
      await this.configurePaymentMethods(businessId, dto.paymentMethods);
      result.paymentMethods = { configured: true, count: dto.paymentMethods.length };
    }

    // 5. Set tax rate on outlet
    if (dto.taxRate !== undefined && resolvedOutletId) {
      await this.prisma.outlet.update({
        where: { id: resolvedOutletId },
        data: { taxRate: dto.taxRate },
      });
    }

    // 6. Create employee (cashier)
    if (dto.employee) {
      const newEmployee = await this.prisma.employee.create({
        data: {
          businessId,
          outletId: resolvedOutletId,
          name: dto.employee.name,
          email: dto.employee.email || null,
          pin: dto.employee.pin,
          role: 'cashier',
        },
      });
      result.employee = { created: true, id: newEmployee.id };
    }

    // 7. Mark onboarding completed
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { onboardingCompleted: true },
    });

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    const existingSettings = (business?.settings as Record<string, unknown>) ?? {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...existingSettings,
          guidedSetupCompleted: true,
          guidedSetupCompletedAt: new Date().toISOString(),
        } as never,
      },
    });

    result.onboarding.completed = true;
    this.logger.log(`Guided setup completed for business ${businessId}`);

    return result;
  }

  private async getFirstOutletId(businessId: string): Promise<string | null> {
    const outlet = await this.prisma.outlet.findFirst({
      where: { businessId, isActive: true },
      select: { id: true },
    });
    return outlet?.id ?? null;
  }

  private async configurePaymentMethods(businessId: string, methods: string[]): Promise<void> {
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

    const paymentMethods = methods.map((m) => ({
      id: randomBytes(16).toString('hex'),
      name: nameMap[m] || m,
      type: typeMap[m] || m,
      isActive: true,
      processingFee: 0,
      settings: {},
    }));

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    const existingSettings = (business?.settings as Record<string, unknown>) ?? {};

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...existingSettings,
          businessPaymentMethods: paymentMethods,
        } as never,
      },
    });
  }

  /**
   * Check if account is created (always true if user exists)
   *
   * @param _businessId - Business ID (unused but kept for consistency)
   * @returns Account created status
   */
  private async checkAccountCreated(_businessId: string): Promise<OnboardingStepStatus> {
    // Account is considered created if the business exists
    return { done: true };
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
    const businessPaymentMethods = settings?.businessPaymentMethods as Array<{ isActive: boolean }> | undefined;

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
    // Check if there are any active printer-type devices
    const printerDevices = await this.prisma.device.findMany({
      where: {
        businessId,
        isActive: true,
        deviceType: 'desktop', // Desktop devices are typically used for POS/receipt printing
      },
    });

    if (printerDevices.length > 0) {
      return { done: true };
    }

    // Also check outlet settings for printer configuration
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId },
      select: { settings: true },
    });

    for (const outlet of outlets) {
      const settings = outlet.settings as Record<string, unknown> | null;
      if (settings?.printerConfigured === true) {
        return { done: true };
      }
    }

    return { done: false };
  }

  /**
   * Get business settings to check onboarding status
   *
   * @param businessId - Business ID
   * @returns Business settings or null
   */
  private async getBusinessSettings(businessId: string): Promise<{ settings: Record<string, unknown> } | null> {
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
