import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
  OnboardingProgressResponse,
  OnboardingStepStatus,
} from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  private readonly PRODUCTS_TARGET = 5;

  constructor(private readonly prisma: PrismaService) {}

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
