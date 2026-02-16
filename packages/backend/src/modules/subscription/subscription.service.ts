import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { XenditGateway } from '../../infrastructure/services/payment/xendit/xendit-gateway';
import { MidtransGateway } from '../../infrastructure/services/payment/midtrans-gateway';
import { SUBSCRIPTION_PLANS, getPlanConfig } from '../../config/subscription-plans.config';
import { BillingCycle } from './dto/create-subscription.dto';
import type { SubscriptionInfoDto, InvoiceDto, UpgradeResultDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xenditGateway: XenditGateway,
    private readonly midtransGateway: MidtransGateway,
  ) {}

  async getSubscription(businessId: string): Promise<SubscriptionInfoDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const plan = business.subscriptionPlan as 'free' | 'premium';
    const planConfig = getPlanConfig(plan);

    // Find active subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        businessId,
        status: { in: ['active', 'trial'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const isTrialActive = subscription?.status === 'trial' &&
      subscription.trialEndsAt != null &&
      subscription.trialEndsAt > now;

    let daysRemaining: number | null = null;
    if (subscription?.endDate) {
      daysRemaining = Math.max(0, Math.ceil(
        (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ));
    }

    return {
      plan,
      status: (subscription?.status as SubscriptionInfoDto['status']) ?? (plan === 'free' ? 'active' : 'expired'),
      billingCycle: subscription?.billingCycle ?? null,
      startDate: subscription?.startDate?.toISOString() ?? null,
      endDate: subscription?.endDate?.toISOString() ?? null,
      trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      cancelledAt: subscription?.cancelledAt?.toISOString() ?? null,
      isTrialActive,
      daysRemaining,
      planConfig: {
        name: planConfig.name,
        monthlyPrice: planConfig.monthlyPrice,
        yearlyPrice: planConfig.yearlyPrice,
        description: planConfig.description,
        restrictedFeatures: planConfig.restrictedFeatures,
      },
    };
  }

  async createUpgrade(
    businessId: string,
    billingCycle: BillingCycle,
    provider: 'midtrans' | 'xendit' = 'xendit',
  ): Promise<UpgradeResultDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, email: true, subscriptionPlan: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check if already premium with active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        businessId,
        status: 'active',
        endDate: { gt: new Date() },
      },
    });

    if (activeSubscription && business.subscriptionPlan === 'premium') {
      throw new BadRequestException('Sudah memiliki langganan Premium aktif');
    }

    const premiumConfig = SUBSCRIPTION_PLANS.premium;
    const amount = billingCycle === BillingCycle.YEARLY
      ? premiumConfig.yearlyPrice
      : premiumConfig.monthlyPrice;

    // Generate invoice number
    const invoiceCount = await this.prisma.invoice.count({ where: { businessId } });
    const invoiceNumber = `INV-${businessId.substring(0, 8).toUpperCase()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

    const now = new Date();
    const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Create invoice record
    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        invoiceNumber,
        amount,
        status: 'pending',
        dueDate,
        provider,
        metadata: {
          billingCycle,
          plan: 'premium',
          businessName: business.name,
        },
      },
    });

    // Create payment via gateway
    let paymentUrl: string | null = null;

    if (provider === 'xendit') {
      const result = await this.xenditGateway.processPayment({
        method: 'invoice',
        amount,
        referenceNumber: invoiceNumber,
        description: `TiloPOS Premium - ${billingCycle === BillingCycle.YEARLY ? 'Tahunan' : 'Bulanan'}`,
        expirySeconds: 86400,
        customer: {
          name: business.name,
          email: business.email || undefined,
        },
      });

      if (result.success && result.paymentData) {
        paymentUrl = (result.paymentData.invoiceUrl as string) || null;
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paymentRef: result.transactionRef,
            paymentUrl,
          },
        });
      }
    } else {
      const result = await this.midtransGateway.processPayment({
        method: 'bank_transfer',
        amount,
        referenceNumber: invoiceNumber,
        description: `TiloPOS Premium - ${billingCycle === BillingCycle.YEARLY ? 'Tahunan' : 'Bulanan'}`,
        metadata: {
          customer: {
            firstName: business.name,
            email: business.email || '',
          },
        },
      });

      if (result.success) {
        const paymentData = result as unknown as Record<string, unknown>;
        paymentUrl = (paymentData.redirectUrl as string) || (paymentData.actionUrl as string) || null;
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paymentRef: result.transactionRef,
            paymentUrl,
          },
        });
      }
    }

    this.logger.log(`Upgrade invoice created: ${invoiceNumber} (${provider}) for business ${businessId}`);

    return {
      invoiceId: invoice.id,
      invoiceNumber,
      amount: Number(amount),
      paymentUrl,
      provider,
      expiresAt: dueDate.toISOString(),
    };
  }

  async handlePaymentCallback(
    provider: 'midtrans' | 'xendit',
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      let invoiceNumber: string | undefined;
      let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending';

      if (provider === 'xendit') {
        invoiceNumber = payload.external_id as string;
        const xenditStatus = (payload.status as string)?.toUpperCase();
        if (xenditStatus === 'PAID' || xenditStatus === 'SETTLED') {
          paymentStatus = 'completed';
        } else if (xenditStatus === 'EXPIRED' || xenditStatus === 'FAILED') {
          paymentStatus = 'failed';
        }
      } else {
        invoiceNumber = payload.order_id as string;
        // Verify Midtrans webhook
        const webhookResult = await this.midtransGateway.handleWebhook(payload);
        if (!webhookResult.success) {
          return { success: false, message: 'Invalid webhook signature' };
        }
        if (webhookResult.transactionStatus === 'completed') {
          paymentStatus = 'completed';
        } else if (webhookResult.transactionStatus === 'failed') {
          paymentStatus = 'failed';
        }
      }

      if (!invoiceNumber) {
        return { success: false, message: 'Missing invoice reference' };
      }

      const invoice = await this.prisma.invoice.findUnique({
        where: { invoiceNumber },
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found: ${invoiceNumber}`);
        return { success: false, message: 'Invoice not found' };
      }

      if (invoice.status === 'paid') {
        return { success: true, message: 'Already processed' };
      }

      if (paymentStatus === 'completed') {
        await this.activateSubscription(invoice.id);
        this.logger.log(`Payment completed for invoice ${invoiceNumber}`);
        return { success: true, message: 'Payment processed successfully' };
      }

      if (paymentStatus === 'failed') {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'failed' },
        });
        return { success: true, message: 'Payment failed' };
      }

      return { success: true, message: 'Pending' };
    } catch (error) {
      this.logger.error('Payment callback error', error);
      return { success: false, message: 'Internal error processing callback' };
    }
  }

  private async activateSubscription(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const metadata = invoice.metadata as Record<string, unknown>;
    const billingCycle = (metadata.billingCycle as string) || 'monthly';

    const now = new Date();
    const endDate = new Date(now);
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Expire any existing active subscriptions
    await this.prisma.subscription.updateMany({
      where: {
        businessId: invoice.businessId,
        status: { in: ['active', 'trial'] },
      },
      data: { status: 'expired' },
    });

    // Create new subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        businessId: invoice.businessId,
        plan: 'premium',
        status: 'active',
        billingCycle,
        startDate: now,
        endDate,
      },
    });

    // Update invoice
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: now,
        subscriptionId: subscription.id,
      },
    });

    // Update business subscription
    await this.prisma.business.update({
      where: { id: invoice.businessId },
      data: {
        subscriptionPlan: SubscriptionPlan.premium,
        subscriptionExpiresAt: endDate,
      },
    });

    this.logger.log(
      `Subscription activated for business ${invoice.businessId} until ${endDate.toISOString()}`,
    );
  }

  async cancelSubscription(businessId: string, reason?: string): Promise<{ message: string }> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        businessId,
        status: { in: ['active', 'trial'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new BadRequestException('Tidak ada langganan aktif');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    this.logger.log(
      `Subscription cancelled for business ${businessId}. Reason: ${reason || 'N/A'}. Active until ${subscription.endDate.toISOString()}`,
    );

    return {
      message: `Langganan dibatalkan. Fitur Premium tetap aktif sampai ${subscription.endDate.toLocaleDateString('id-ID')}`,
    };
  }

  async getInvoices(businessId: string): Promise<InvoiceDto[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.amount),
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      paymentMethod: inv.paymentMethod,
      provider: inv.provider,
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  async startTrial(businessId: string): Promise<void> {
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { businessId },
    });

    if (existingSubscription) {
      return; // Already had a subscription, no trial
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + SUBSCRIPTION_PLANS.premium.trialDays);

    await this.prisma.subscription.create({
      data: {
        businessId,
        plan: 'premium',
        status: 'trial',
        billingCycle: 'monthly',
        startDate: now,
        endDate: trialEnd,
        trialEndsAt: trialEnd,
      },
    });

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlan: SubscriptionPlan.premium,
        subscriptionExpiresAt: trialEnd,
      },
    });

    this.logger.log(`Trial started for business ${businessId} until ${trialEnd.toISOString()}`);
  }

  async checkAndExpireSubscriptions(): Promise<number> {
    const now = new Date();

    // Find expired subscriptions
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trial', 'cancelled'] },
        endDate: { lte: now },
      },
      select: { id: true, businessId: true },
    });

    if (expired.length === 0) return 0;

    // Expire subscriptions
    await this.prisma.subscription.updateMany({
      where: {
        id: { in: expired.map((s) => s.id) },
      },
      data: { status: 'expired' },
    });

    // Downgrade businesses to free
    const businessIds = [...new Set(expired.map((s) => s.businessId))] as string[];
    await this.prisma.business.updateMany({
      where: { id: { in: businessIds } },
      data: {
        subscriptionPlan: SubscriptionPlan.free,
        subscriptionExpiresAt: null,
      },
    });

    this.logger.log(`Expired ${expired.length} subscriptions, downgraded ${businessIds.length} businesses`);
    return expired.length;
  }
}
