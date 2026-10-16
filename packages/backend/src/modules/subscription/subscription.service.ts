import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import { DocumentNumberService } from '@shared/numbering';
import { XenditGateway } from '../../infrastructure/services/payment/xendit/xendit-gateway';
import { MidtransGateway } from '../../infrastructure/services/payment/midtrans-gateway';
import { SUBSCRIPTION_PLANS, getPlanConfig } from '../../config/subscription-plans.config';
import { BillingCycle } from './dto/create-subscription.dto';
import type { SubscriptionInfoDto, InvoiceDto, UpgradeResultDto } from './dto/subscription.dto';
import type { SubscriptionWebhookDto } from './dto/subscription-webhook.dto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Subscription states that still grant Premium until endDate. */
const LIVE_STATUSES = ['active', 'trial', 'cancelled'] as const;

export interface PaymentCallbackResult {
  success: boolean;
  message: string;
}

/**
 * Adds one billing cycle to `from` (calendar month/year).
 */
export function addBillingCycle(from: Date, billingCycle: string): Date {
  const end = new Date(from);
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

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
    private readonly documentNumbers: DocumentNumberService,
    private readonly config: ConfigService,
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

    const now = new Date();

    // Latest subscription that still grants Premium (a cancelled one runs until endDate)
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        businessId,
        OR: [
          { status: { in: ['active', 'trial'] } },
          { status: 'cancelled', endDate: { gt: now } },
        ],
      },
      orderBy: { endDate: 'desc' },
    });

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
    // The Midtrans gateway only implements the Core API charge (VA/QRIS for POS);
    // there is no hosted (Snap) checkout that returns a payment URL. Fail honestly
    // instead of creating an invoice nobody can pay.
    if (provider !== 'xendit') {
      throw new NotImplementedException(
        'Pembayaran langganan via Midtrans belum tersedia. Gunakan Xendit.',
      );
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, email: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Trial, cancelled-but-running and active subscribers may all pay: the paid
    // period is appended to whatever Premium time remains (see activateSubscription).

    const premiumConfig = SUBSCRIPTION_PLANS.premium;
    const amount =
      billingCycle === BillingCycle.YEARLY ? premiumConfig.yearlyPrice : premiumConfig.monthlyPrice;

    const now = new Date();
    const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const invoice = await this.prisma.$transaction(async (tx) => {
      // Supersede earlier unpaid upgrade attempts so only one invoice is payable.
      await tx.invoice.updateMany({
        where: { businessId, status: 'pending' },
        data: { status: 'expired' },
      });

      const invoiceNumber = await this.documentNumbers.next(tx, businessId, 'INV', {
        daily: false,
      });

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

    const invoiceNumber = invoice.invoiceNumber;
    const description = `TiloPOS Premium - ${billingCycle === BillingCycle.YEARLY ? 'Tahunan' : 'Bulanan'}`;

    // The gateway reference is the invoice id: invoice numbers are only unique
    // per business, while webhooks arrive without tenant context.
    let paymentUrl: string | null = null;
    let paymentRef: string | null = null;
    let failure: string | null = null;
    try {
      const result = await this.xenditGateway.processPayment({
        method: 'invoice',
        amount,
        referenceNumber: invoice.id,
        description,
        expirySeconds: 86400,
        customer: {
          name: business.name,
          email: business.email || undefined,
        },
      });

      const rawUrl = result.success ? ((result.paymentData?.invoiceUrl as string) ?? null) : null;
      if (!result.success) {
        failure = result.message ?? 'gateway returned success=false';
      } else if (!rawUrl || !this.isValidPaymentUrl(rawUrl)) {
        failure = 'gateway returned no valid payment URL';
      } else {
        paymentUrl = rawUrl;
        paymentRef = result.transactionRef || null;
      }
    } catch (error) {
      failure = (error as Error).message;
      this.logger.error(
        `Payment gateway (${provider}) threw for invoice ${invoiceNumber}: ${failure}`,
        (error as Error).stack,
      );
    }

    if (failure || !paymentUrl) {
      this.logger.error(
        `Payment gateway (${provider}) failed for invoice ${invoiceNumber}: ${failure}`,
      );
      await this.prisma.invoice.updateMany({
        where: { id: invoice.id, businessId, status: 'pending' },
        data: { status: 'failed' },
      });
      throw new BadGatewayException('Gagal membuat pembayaran. Silakan coba lagi nanti.');
    }

    await this.prisma.invoice.updateMany({
      where: { id: invoice.id, businessId },
      data: { paymentRef, paymentUrl },
    });

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

  /**
   * Gateway callback. Known no-ops (unknown or already paid invoice, amount
   * mismatch) answer 200 so the provider stops retrying; anything unexpected
   * (DB errors, unverifiable status) propagates as a non-2xx so it retries.
   */
  async handlePaymentCallback(
    provider: 'midtrans' | 'xendit',
    payload: SubscriptionWebhookDto,
  ): Promise<PaymentCallbackResult> {
    let reference: string | undefined;
    let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending';
    let paidAmount: string | number | undefined;
    const currency = payload.currency;

    if (provider === 'xendit') {
      reference = this.stripGatewayPrefix(payload.external_id);
      const xenditStatus = payload.status?.toUpperCase();
      if (xenditStatus === 'PAID' || xenditStatus === 'SETTLED') {
        paymentStatus = 'completed';
      } else if (xenditStatus === 'EXPIRED' || xenditStatus === 'FAILED') {
        paymentStatus = 'failed';
      }
      paidAmount = payload.paid_amount ?? payload.amount;
    } else {
      reference = payload.order_id;
      const webhookResult = await this.midtransGateway.handleWebhook({ ...payload });
      if (!webhookResult.success) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
      if (webhookResult.transactionStatus === 'completed') {
        paymentStatus = 'completed';
      } else if (webhookResult.transactionStatus === 'failed') {
        paymentStatus = 'failed';
      }
      paidAmount = payload.gross_amount;
    }

    if (!reference || reference.trim() === '') {
      throw new BadRequestException('Missing invoice reference');
    }

    const invoice = await this.findInvoiceByReference(reference);

    if (!invoice) {
      this.logger.warn(`Invoice not found for ${provider} reference ${reference}`);
      return { success: false, message: 'Invoice not found' };
    }

    if (invoice.status === 'paid') {
      this.logger.log(`Invoice ${invoice.invoiceNumber} already paid, skipping duplicate callback`);
      return { success: true, message: 'Already processed' };
    }

    if (paymentStatus === 'completed') {
      if (!this.amountMatches(invoice.amount, paidAmount, currency)) {
        this.logger.error(
          `Amount mismatch for invoice ${invoice.invoiceNumber}: expected ${invoice.amount.toString()} IDR, ` +
            `got ${String(paidAmount)} ${currency ?? ''} (${provider}). Not activating.`,
        );
        return { success: false, message: 'Amount mismatch' };
      }

      if (provider === 'xendit') {
        await this.assertXenditInvoicePaid(invoice.paymentRef);
      }

      await this.activateSubscription(invoice.id);
      this.logger.log(`Payment completed for invoice ${invoice.invoiceNumber}`);
      return { success: true, message: 'Payment processed successfully' };
    }

    if (paymentStatus === 'failed') {
      await this.prisma.invoice.updateMany({
        where: { id: invoice.id, businessId: invoice.businessId, status: 'pending' },
        data: { status: 'failed' },
      });
      return { success: true, message: 'Payment failed' };
    }

    return { success: true, message: 'Pending' };
  }

  /** Xendit prefixes external ids with the payment type, e.g. `INV_<invoiceId>`. */
  private stripGatewayPrefix(externalId?: string): string | undefined {
    if (!externalId) return externalId;
    const match = /^[A-Za-z]+_(.+)$/.exec(externalId);
    return match ? match[1] : externalId;
  }

  private async findInvoiceByReference(reference: string) {
    if (UUID_PATTERN.test(reference)) {
      return this.prisma.invoice.findUnique({ where: { id: reference } });
    }
    // Legacy invoices (created before gateway references switched to the id)
    // used a globally distinct `INV-<business prefix>-NNNN` number.
    const matches = await this.prisma.invoice.findMany({
      where: { invoiceNumber: reference },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    if (matches.length > 1) {
      this.logger.error(`Ambiguous invoice reference ${reference}; refusing to guess the tenant`);
      return null;
    }
    return matches[0] ?? null;
  }

  private amountMatches(
    expected: Prisma.Decimal,
    paid: string | number | undefined,
    currency: string | undefined,
  ): boolean {
    if (currency && currency.toUpperCase() !== 'IDR') {
      return false;
    }
    if (paid === undefined || paid === null || paid === '') {
      return false;
    }
    try {
      return new Prisma.Decimal(paid).equals(expected);
    } catch {
      // intentionally ignored: an unparsable amount is treated as a mismatch
      return false;
    }
  }

  /**
   * The Xendit callback is authenticated only by a static token, so confirm the
   * status with the Xendit API before granting Premium. Skipped (with a warning)
   * when no API key is configured, which env validation forbids in production.
   */
  private async assertXenditInvoicePaid(paymentRef: string | null): Promise<void> {
    if (!this.config.get<string>('XENDIT_API_KEY')) {
      this.logger.warn('XENDIT_API_KEY not configured; skipping Xendit status re-check');
      return;
    }
    if (!paymentRef) {
      throw new ServiceUnavailableException('Invoice has no gateway reference to verify');
    }
    const status = await this.xenditGateway.checkStatus(paymentRef);
    if (status !== 'completed') {
      // Not (yet) confirmed by the API: answer non-2xx so Xendit retries later.
      throw new ServiceUnavailableException(`Xendit reports invoice status "${status}"`);
    }
  }

  private async activateSubscription(invoiceId: string): Promise<void> {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return null;

      // Idempotency: claim the invoice with a conditional update. A concurrent or
      // duplicate callback finds count 0 and stops here.
      const claimed = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          businessId: invoice.businessId,
          subscriptionId: null,
          status: { not: 'paid' },
        },
        data: { status: 'paid', paidAt: now },
      });
      if (claimed.count === 0) {
        this.logger.warn(`Invoice ${invoice.invoiceNumber} already processed, skipping activation`);
        return null;
      }

      const metadata = (invoice.metadata ?? {}) as Record<string, unknown>;
      const billingCycle = metadata.billingCycle === 'yearly' ? 'yearly' : 'monthly';

      // Remaining Premium time (trial, active or cancelled-but-running) is kept:
      // the paid period starts when the current one ends.
      const current = await tx.subscription.findFirst({
        where: {
          businessId: invoice.businessId,
          status: { in: [...LIVE_STATUSES] },
          endDate: { gt: now },
        },
        orderBy: { endDate: 'desc' },
        select: { endDate: true },
      });
      const startDate = current && current.endDate > now ? current.endDate : now;
      const endDate = addBillingCycle(startDate, billingCycle);

      // Close every previous live row (including cancelled ones) so no stale
      // record can later drive an expiry/downgrade.
      await tx.subscription.updateMany({
        where: {
          businessId: invoice.businessId,
          status: { in: [...LIVE_STATUSES] },
        },
        data: { status: 'expired' },
      });

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

      await tx.invoice.updateMany({
        where: { id: invoiceId, businessId: invoice.businessId },
        data: { subscriptionId: subscription.id },
      });

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

    await this.prisma.subscription.updateMany({
      where: { id: subscription.id, businessId, status: subscription.status },
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

  /**
   * Starts the Premium trial once per business. Pass `tx` to run inside the
   * caller's transaction (e.g. registration); otherwise a transaction is opened.
   */
  async startTrial(businessId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + SUBSCRIPTION_PLANS.premium.trialDays);

    const run = async (db: Prisma.TransactionClient): Promise<boolean> => {
      const existingSubscription = await db.subscription.findFirst({
        where: { businessId },
        select: { id: true },
      });
      if (existingSubscription) {
        return false; // Already had a subscription, no trial
      }

      await db.subscription.create({
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

      await db.business.update({
        where: { id: businessId },
        data: {
          subscriptionPlan: SubscriptionPlan.premium,
          subscriptionExpiresAt: trialEnd,
        },
      });
      return true;
    };

    const started = tx ? await run(tx) : await this.prisma.$transaction((t) => run(t));

    if (started) {
      this.logger.log(`Trial started for business ${businessId} until ${trialEnd.toISOString()}`);
    }
  }

  /**
   * Expires subscriptions past their end date and downgrades only businesses
   * that have no other subscription still granting Premium. Runs in a single
   * transaction with the status/endDate conditions re-checked in each write,
   * so a renewal landing concurrently is never downgraded.
   */
  async checkAndExpireSubscriptions(): Promise<number> {
    const now = new Date();

    const { expiredCount, downgraded } = await this.prisma.$transaction(async (tx) => {
      const expired = await tx.subscription.findMany({
        where: {
          status: { in: [...LIVE_STATUSES] },
          endDate: { lte: now },
        },
        select: { id: true, businessId: true },
      });

      if (expired.length === 0) return { expiredCount: 0, downgraded: 0 };

      const updated = await tx.subscription.updateMany({
        where: {
          id: { in: expired.map((s) => s.id) },
          status: { in: [...LIVE_STATUSES] },
          endDate: { lte: now },
        },
        data: { status: 'expired' },
      });

      const businessIds = [...new Set(expired.map((s) => s.businessId))];
      const downgradeResult = await tx.business.updateMany({
        where: {
          id: { in: businessIds },
          subscriptions: {
            none: {
              status: { in: [...LIVE_STATUSES] },
              endDate: { gt: now },
            },
          },
        },
        data: {
          subscriptionPlan: SubscriptionPlan.free,
          subscriptionExpiresAt: null,
        },
      });

      return { expiredCount: updated.count, downgraded: downgradeResult.count };
    });

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} subscriptions, downgraded ${downgraded} businesses`);
    }
    return expiredCount;
  }
}
