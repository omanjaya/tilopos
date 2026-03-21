import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { XenditGateway } from '../../infrastructure/services/payment/xendit/xendit-gateway';
import { MidtransGateway } from '../../infrastructure/services/payment/midtrans-gateway';
import { SUBSCRIPTION_PLANS, getPlanConfig } from '../../config/subscription-plans.config';
import { BillingCycle } from './dto/create-subscription.dto';
import type { SubscriptionInfoDto, InvoiceDto, UpgradeResultDto } from './dto/subscription.dto';

const ALLOWED_PAYMENT_HOSTNAMES = [
  'app.midtrans.com',
  'payment.midtrans.com',
  'app.sandbox.midtrans.com',
  'app.xendit.co',
  'checkout.xendit.co',
  'checkout-staging.xendit.co',
];

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xenditGateway: XenditGateway,
    private readonly midtransGateway: MidtransGateway,
  ) {}

  private isValidPaymentUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        this.logger.warn(
          `Payment URL rejected — invalid protocol: ${parsed.protocol} (url: ${url})`,
        );
        return false;
      }
      if (!ALLOWED_PAYMENT_HOSTNAMES.includes(parsed.hostname)) {
        this.logger.warn(
          `Payment URL rejected — untrusted hostname: ${parsed.hostname} (url: ${url})`,
        );
        return false;
      }
      return true;
    } catch {
      this.logger.warn(`Payment URL rejected — malformed URL: ${url}`);
      return false;
    }
  }

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
    const isTrialActive =
      subscription?.status === 'trial' &&
      subscription.trialEndsAt != null &&
      subscription.trialEndsAt > now;

    // Calculate daysRemaining from subscription record, fallback to business.subscriptionExpiresAt
    const effectiveEndDate = subscription?.endDate ?? business.subscriptionExpiresAt;
    let daysRemaining: number | null = null;
    if (effectiveEndDate) {
      daysRemaining = Math.max(
        0,
        Math.ceil((effectiveEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    // Determine status: use subscription record, fallback to checking business expiry
    let status: SubscriptionInfoDto['status'];
    if (subscription) {
      status = subscription.status as SubscriptionInfoDto['status'];
    } else if (plan === 'free') {
      status = 'active';
    } else if (business.subscriptionExpiresAt && business.subscriptionExpiresAt > now) {
      status = 'active';
    } else {
      status = 'expired';
    }

    return {
      plan,
      status,
      billingCycle: subscription?.billingCycle ?? null,
      startDate: subscription?.startDate?.toISOString() ?? null,
      endDate:
        subscription?.endDate?.toISOString() ??
        business.subscriptionExpiresAt?.toISOString() ??
        null,
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

    // Check if already premium with a non-expired subscription (active or trial)
    // - active + not expired  -> already premium, block upgrade
    // - trial  + not expired  -> should use "Bayar Sekarang" flow, block upgrade
    // - cancelled / expired   -> user wants to re-subscribe, allow upgrade
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        businessId,
        status: { in: ['active', 'trial'] },
        endDate: { gt: new Date() },
      },
    });

    if (existingSubscription && business.subscriptionPlan === 'premium') {
      if (existingSubscription.status === 'trial') {
        throw new BadRequestException(
          'Anda sedang dalam masa trial. Gunakan fitur "Bayar Sekarang" untuk berlangganan Premium.',
        );
      }
      throw new BadRequestException('Sudah memiliki langganan Premium aktif');
    }

    const premiumConfig = SUBSCRIPTION_PLANS.premium;
    const amount =
      billingCycle === BillingCycle.YEARLY ? premiumConfig.yearlyPrice : premiumConfig.monthlyPrice;

    const now = new Date();
    const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate invoice number atomically to prevent race conditions
    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoiceCount = await tx.invoice.count({ where: { businessId } });
      const invoiceNumber = `INV-${businessId.substring(0, 8).toUpperCase()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

      return tx.invoice.create({
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
    });

    // Create payment via gateway
    const invoiceNumber = invoice.invoiceNumber;
    let paymentUrl: string | null = null;

    try {
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
          const rawUrl = (result.paymentData.invoiceUrl as string) || null;
          paymentUrl = rawUrl && this.isValidPaymentUrl(rawUrl) ? rawUrl : null;
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
          const rawUrl =
            (paymentData.redirectUrl as string) || (paymentData.actionUrl as string) || null;
          paymentUrl = rawUrl && this.isValidPaymentUrl(rawUrl) ? rawUrl : null;
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              paymentRef: result.transactionRef,
              paymentUrl,
            },
          });
        }
      }
    } catch (error) {
      // Payment gateway failed — mark the invoice as failed to prevent orphaned pending invoices
      this.logger.error(
        `Payment gateway (${provider}) failed for invoice ${invoiceNumber}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'failed' },
      });
      throw new BadRequestException('Gagal membuat pembayaran. Silakan coba lagi nanti.');
    }

    this.logger.log(
      `Upgrade invoice created: ${invoiceNumber} (${provider}) for business ${businessId}`,
    );

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

      // Validate invoiceNumber: reject if empty, null, or undefined
      if (!invoiceNumber || invoiceNumber.trim() === '') {
        this.logger.warn(`Payment callback received with empty invoice reference from ${provider}`);
        return { success: false, message: 'Missing invoice reference' };
      }

      const invoice = await this.prisma.invoice.findFirst({
        where: { invoiceNumber, status: { not: 'paid' } },
        orderBy: { createdAt: 'desc' },
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found: ${invoiceNumber}`);
        return { success: false, message: 'Invoice not found' };
      }

      // Idempotency: if invoice is already paid, return success without re-processing
      if (invoice.status === 'paid') {
        this.logger.log(`Invoice ${invoiceNumber} already paid, skipping duplicate callback`);
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
    const now = new Date();

    // Wrap ALL database operations (including the read + idempotency check)
    // in a single transaction to prevent race conditions from concurrent
    // webhook callbacks creating duplicate subscriptions.
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) return null;

      // Idempotency check: if the invoice already has a subscriptionId,
      // it was already processed (e.g. duplicate webhook). Return early.
      // This check is inside the transaction so concurrent calls cannot
      // both read subscriptionId as null and proceed.
      if (invoice.subscriptionId) {
        this.logger.warn(
          `Invoice ${invoice.invoiceNumber} already processed with subscription ${invoice.subscriptionId}, skipping duplicate activation`,
        );
        return null;
      }

      const metadata = invoice.metadata as Record<string, unknown>;
      const billingCycle = (metadata.billingCycle as string) || 'monthly';

      const endDate = new Date(now);
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Expire any existing active subscriptions
      await tx.subscription.updateMany({
        where: {
          businessId: invoice.businessId,
          status: { in: ['active', 'trial'] },
        },
        data: { status: 'expired' },
      });

      // Create new subscription
      const subscription = await tx.subscription.create({
        data: {
          businessId: invoice.businessId,
          plan: 'premium',
          status: 'active',
          billingCycle,
          startDate: now,
          endDate,
        },
      });

      // Update invoice as paid and link to the new subscription
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: now,
          subscriptionId: subscription.id,
        },
      });

      // Update business subscription plan
      await tx.business.update({
        where: { id: invoice.businessId },
        data: {
          subscriptionPlan: SubscriptionPlan.premium,
          subscriptionExpiresAt: endDate,
        },
      });

      return { businessId: invoice.businessId, endDate };
    });

    if (result) {
      this.logger.log(
        `Subscription activated for business ${result.businessId} until ${result.endDate.toISOString()}`,
      );
    }
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

    this.logger.log(
      `Expired ${expired.length} subscriptions, downgraded ${businessIds.length} businesses`,
    );
    return expired.length;
  }
}
