import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { SubscriptionService, addBillingCycle } from '../subscription.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { XenditGateway } from '../../../infrastructure/services/payment/xendit/xendit-gateway';
import { MidtransGateway } from '../../../infrastructure/services/payment/midtrans-gateway';
import { DocumentNumberService } from '@shared/numbering';
import { BillingCycle } from '../dto/create-subscription.dto';
import { SUBSCRIPTION_PLANS } from '../../../config/subscription-plans.config';
import type { SubscriptionWebhookDto } from '../dto/subscription-webhook.dto';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockXendit: jest.Mocked<XenditGateway>;
  let mockMidtrans: jest.Mocked<MidtransGateway>;
  let mockNumbers: { next: jest.Mock };
  let configValues: Record<string, string | undefined>;

  const BUSINESS_ID = 'biz-001';
  const INVOICE_ID = '11111111-2222-4333-8444-555555555555';
  const now = new Date('2026-02-19T10:00:00.000Z');
  const MONTHLY = SUBSCRIPTION_PLANS.premium.monthlyPrice;

  const daysFromNow = (days: number): Date => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const pendingInvoice = (overrides: Record<string, unknown> = {}) => ({
    id: INVOICE_ID,
    businessId: BUSINESS_ID,
    invoiceNumber: 'INV-000001',
    amount: new Prisma.Decimal(MONTHLY),
    status: 'pending',
    subscriptionId: null,
    paymentRef: 'xnd-inv-1',
    metadata: { billingCycle: 'monthly' },
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    mockPrisma = {
      business: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      subscription: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      invoice: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
    } as unknown as jest.Mocked<PrismaService>;

    mockXendit = {
      processPayment: jest.fn(),
      checkStatus: jest.fn().mockResolvedValue('completed'),
    } as unknown as jest.Mocked<XenditGateway>;

    mockMidtrans = {
      processPayment: jest.fn(),
      handleWebhook: jest.fn(),
    } as unknown as jest.Mocked<MidtransGateway>;

    mockNumbers = { next: jest.fn().mockResolvedValue('INV-000001') };
    configValues = { XENDIT_API_KEY: 'xnd_test' };
    const config = { get: jest.fn((k: string) => configValues[k]) } as unknown as ConfigService;

    service = new SubscriptionService(
      mockPrisma,
      mockXendit,
      mockMidtrans,
      mockNumbers as unknown as DocumentNumberService,
      config,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── getSubscription ────────────────────────────────────────────────

  describe('getSubscription', () => {
    it('should throw NotFoundException when business not found', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getSubscription(BUSINESS_ID)).rejects.toThrow(NotFoundException);
    });

    it('should return free plan info when no subscription exists', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        subscriptionPlan: 'free',
        subscriptionExpiresAt: null,
      });
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSubscription(BUSINESS_ID);

      expect(result.plan).toBe('free');
      expect(result.status).toBe('active');
      expect(result.isTrialActive).toBe(false);
      expect(result.daysRemaining).toBeNull();
      expect(result.planConfig.name).toBe('Free');
      expect(result.planConfig.restrictedFeatures).toEqual(
        SUBSCRIPTION_PLANS.free.restrictedFeatures,
      );
    });

    it('should return active premium subscription info', async () => {
      const endDate = daysFromNow(20);
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        subscriptionPlan: 'premium',
        subscriptionExpiresAt: endDate,
      });
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        status: 'active',
        billingCycle: 'monthly',
        startDate: daysFromNow(-10),
        endDate,
        trialEndsAt: null,
        cancelledAt: null,
      });

      const result = await service.getSubscription(BUSINESS_ID);

      expect(result.plan).toBe('premium');
      expect(result.status).toBe('active');
      expect(result.billingCycle).toBe('monthly');
      expect(result.daysRemaining).toBe(20);
      expect(result.isTrialActive).toBe(false);
      expect(result.planConfig.name).toBe('Premium');
      expect(result.planConfig.restrictedFeatures).toEqual([]);
    });

    it('should return trial status with isTrialActive true when trial is active', async () => {
      const trialEnd = daysFromNow(7);
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        subscriptionPlan: 'premium',
        subscriptionExpiresAt: trialEnd,
      });
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        status: 'trial',
        billingCycle: 'monthly',
        startDate: daysFromNow(-7),
        endDate: trialEnd,
        trialEndsAt: trialEnd,
        cancelledAt: null,
      });

      const result = await service.getSubscription(BUSINESS_ID);

      expect(result.status).toBe('trial');
      expect(result.isTrialActive).toBe(true);
      expect(result.daysRemaining).toBe(7);
    });

    it('should return expired status when business is premium but subscription expired', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        subscriptionPlan: 'premium',
        subscriptionExpiresAt: daysFromNow(-5),
      });
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSubscription(BUSINESS_ID);

      expect(result.plan).toBe('premium');
      expect(result.status).toBe('expired');
      expect(result.daysRemaining).toBe(0);
    });

    it('should fallback to business.subscriptionExpiresAt when no subscription record exists', async () => {
      const expiresAt = daysFromNow(60);
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        subscriptionPlan: 'premium',
        subscriptionExpiresAt: expiresAt,
      });
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSubscription(BUSINESS_ID);

      expect(result.plan).toBe('premium');
      expect(result.status).toBe('active');
      expect(result.daysRemaining).toBe(60);
      expect(result.endDate).toBe(expiresAt.toISOString());
    });
  });

  // ─── createUpgrade ──────────────────────────────────────────────────

  // ─── createUpgrade ──────────────────────────────────────────────────

  describe('createUpgrade', () => {
    beforeEach(() => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        id: BUSINESS_ID,
        name: 'Toko',
        email: 'owner@toko.id',
      });
      (mockPrisma.invoice.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ id: INVOICE_ID, ...data }),
      );
      (mockXendit.processPayment as jest.Mock).mockResolvedValue({
        success: true,
        transactionRef: 'xnd-inv-1',
        paymentData: { invoiceUrl: 'https://checkout.xendit.co/web/abc' },
      });
    });

    it('throws NotFoundException when business not found', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows a trial business to pay (Bayar Sekarang) and returns the payment URL', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        status: 'trial',
        endDate: daysFromNow(10),
      });

      const result = await service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY);

      expect(result.paymentUrl).toBe('https://checkout.xendit.co/web/abc');
      expect(result.amount).toBe(MONTHLY);
      expect(result.invoiceNumber).toBe('INV-000001');
    });

    it('numbers invoices with DocumentNumberService inside the transaction', async () => {
      await service.createUpgrade(BUSINESS_ID, BillingCycle.YEARLY);

      expect(mockNumbers.next).toHaveBeenCalledWith(mockPrisma, BUSINESS_ID, 'INV', {
        daily: false,
      });
      expect(mockPrisma.invoice.count).not.toHaveBeenCalled();
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: SUBSCRIPTION_PLANS.premium.yearlyPrice }),
        }),
      );
    });

    it('uses the invoice id as gateway reference (numbers are only unique per tenant)', async () => {
      await service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY);
      expect(mockXendit.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({ referenceNumber: INVOICE_ID }),
      );
    });

    it('marks the invoice failed and throws when the gateway returns success:false', async () => {
      (mockXendit.processPayment as jest.Mock).mockResolvedValue({
        success: false,
        transactionRef: '',
        message: 'boom',
      });

      await expect(service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY)).rejects.toThrow(
        BadGatewayException,
      );
      expect(mockPrisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, businessId: BUSINESS_ID, status: 'pending' },
        data: { status: 'failed' },
      });
    });

    it('fails honestly when the gateway returns no trusted payment URL', async () => {
      (mockXendit.processPayment as jest.Mock).mockResolvedValue({
        success: true,
        transactionRef: 'x',
        paymentData: { invoiceUrl: 'https://evil.example.com/pay' },
      });
      await expect(service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('rejects Midtrans (no hosted checkout implemented) before creating an invoice', async () => {
      await expect(
        service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY, 'midtrans'),
      ).rejects.toThrow(NotImplementedException);
      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  // ─── handlePaymentCallback ──────────────────────────────────────────

  describe('handlePaymentCallback', () => {
    const xenditPaid = (
      overrides: Partial<SubscriptionWebhookDto> = {},
    ): SubscriptionWebhookDto => ({
      external_id: `INV_${INVOICE_ID}`,
      status: 'PAID',
      paid_amount: MONTHLY,
      currency: 'IDR',
      ...overrides,
    });

    beforeEach(() => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(pendingInvoice());
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' });
    });

    it('activates Premium on a verified Xendit PAID callback (prefix stripped)', async () => {
      const result = await service.handlePaymentCallback('xendit', xenditPaid());

      expect(result).toEqual({ success: true, message: 'Payment processed successfully' });
      expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: INVOICE_ID } });
      expect(mockXendit.checkStatus).toHaveBeenCalledWith('xnd-inv-1');
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'active',
          endDate: addBillingCycle(now, 'monthly'),
        }),
      });
    });

    it('does not activate when the paid amount differs from the invoice', async () => {
      const result = await service.handlePaymentCallback(
        'xendit',
        xenditPaid({ paid_amount: 1000 }),
      );

      expect(result).toEqual({ success: false, message: 'Amount mismatch' });
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('does not activate when the currency is not IDR', async () => {
      const result = await service.handlePaymentCallback('xendit', xenditPaid({ currency: 'USD' }));
      expect(result.message).toBe('Amount mismatch');
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('answers non-2xx when Xendit API does not confirm the payment', async () => {
      (mockXendit.checkStatus as jest.Mock).mockResolvedValue('pending');
      await expect(service.handlePaymentCallback('xendit', xenditPaid())).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('rethrows unexpected errors so the gateway retries (no 200 on DB failure)', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockRejectedValue(new Error('db down'));
      await expect(service.handlePaymentCallback('xendit', xenditPaid())).rejects.toThrow(
        'db down',
      );
    });

    it('is idempotent: a duplicate callback that loses the claim creates nothing', async () => {
      (mockPrisma.invoice.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      await service.handlePaymentCallback('xendit', xenditPaid());
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('returns already processed for paid invoices', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        pendingInvoice({ status: 'paid' }),
      );
      const result = await service.handlePaymentCallback('xendit', xenditPaid());
      expect(result).toEqual({ success: true, message: 'Already processed' });
    });

    it('returns a 200 no-op when the invoice is unknown', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.handlePaymentCallback('xendit', xenditPaid());
      expect(result).toEqual({ success: false, message: 'Invoice not found' });
    });

    it('rejects a missing reference with 400', async () => {
      await expect(
        service.handlePaymentCallback('xendit', xenditPaid({ external_id: undefined })),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks the invoice failed on EXPIRED', async () => {
      const result = await service.handlePaymentCallback(
        'xendit',
        xenditPaid({ status: 'EXPIRED' }),
      );
      expect(result.message).toBe('Payment failed');
      expect(mockPrisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: INVOICE_ID, businessId: BUSINESS_ID, status: 'pending' },
        data: { status: 'failed' },
      });
    });

    it('rejects a Midtrans callback with an invalid signature (401)', async () => {
      (mockMidtrans.handleWebhook as jest.Mock).mockResolvedValue({ success: false });
      await expect(
        service.handlePaymentCallback('midtrans', { order_id: INVOICE_ID, gross_amount: '1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('activates on a verified Midtrans settlement with the matching gross_amount', async () => {
      (mockMidtrans.handleWebhook as jest.Mock).mockResolvedValue({
        success: true,
        transactionStatus: 'completed',
      });
      const result = await service.handlePaymentCallback('midtrans', {
        order_id: INVOICE_ID,
        gross_amount: `${MONTHLY}.00`,
      });
      expect(result.success).toBe(true);
      expect(mockXendit.checkStatus).not.toHaveBeenCalled();
      expect(mockPrisma.subscription.create).toHaveBeenCalled();
    });

    it('appends the paid period to remaining trial time', async () => {
      const trialEnd = daysFromNow(5);
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({ endDate: trialEnd });

      await service.handlePaymentCallback('xendit', xenditPaid());

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ endDate: addBillingCycle(trialEnd, 'monthly') }),
      });
    });

    it('extends from the end of a cancelled-but-running period and closes stale rows', async () => {
      const cancelledEnd = daysFromNow(12);
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({ endDate: cancelledEnd });
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        pendingInvoice({
          metadata: { billingCycle: 'yearly' },
          amount: new Prisma.Decimal(SUBSCRIPTION_PLANS.premium.yearlyPrice),
        }),
      );

      await service.handlePaymentCallback(
        'xendit',
        xenditPaid({ paid_amount: SUBSCRIPTION_PLANS.premium.yearlyPrice }),
      );

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID, status: { in: ['active', 'trial', 'cancelled'] } },
        data: { status: 'expired' },
      });
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ endDate: addBillingCycle(cancelledEnd, 'yearly') }),
      });
    });
  });

  // ─── cancelSubscription ─────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should throw BadRequestException when no active subscription', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancelSubscription(BUSINESS_ID)).rejects.toThrow(BadRequestException);
    });

    it('should cancel active subscription and return message', async () => {
      const endDate = daysFromNow(15);
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'active',
        endDate,
      });
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.cancelSubscription(BUSINESS_ID, 'Terlalu mahal');

      expect(result.message).toContain('Langganan dibatalkan');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { id: 'sub-1', businessId: BUSINESS_ID, status: 'active' },
        data: {
          status: 'cancelled',
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('should cancel trial subscription', async () => {
      const trialEnd = daysFromNow(5);
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub-trial',
        status: 'trial',
        endDate: trialEnd,
      });
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.cancelSubscription(BUSINESS_ID);

      expect(result.message).toContain('Langganan dibatalkan');
    });
  });

  // ─── getInvoices ────────────────────────────────────────────────────

  describe('getInvoices', () => {
    it('should return mapped invoice list', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          amount: 149000,
          status: 'paid',
          dueDate: new Date('2026-02-20'),
          paidAt: new Date('2026-02-19'),
          paymentMethod: 'bank_transfer',
          provider: 'xendit',
          createdAt: new Date('2026-02-18'),
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-002',
          amount: 1190000,
          status: 'pending',
          dueDate: new Date('2026-02-21'),
          paidAt: null,
          paymentMethod: null,
          provider: 'midtrans',
          createdAt: new Date('2026-02-19'),
        },
      ];
      (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await service.getInvoices(BUSINESS_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        amount: 149000,
        status: 'paid',
        dueDate: expect.any(String),
        paidAt: expect.any(String),
        paymentMethod: 'bank_transfer',
        provider: 'xendit',
        createdAt: expect.any(String),
      });
      expect(result[1].paidAt).toBeNull();
    });

    it('should return empty array when no invoices', async () => {
      (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getInvoices(BUSINESS_ID);

      expect(result).toEqual([]);
    });

    it('should query with correct businessId and limit', async () => {
      (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      await service.getInvoices(BUSINESS_ID);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  // ─── startTrial ─────────────────────────────────────────────────────

  describe('startTrial', () => {
    it('creates a trial and upgrades the business in one transaction', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      await service.startTrial(BUSINESS_ID);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'trial', businessId: BUSINESS_ID }),
      });
      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: expect.objectContaining({ subscriptionPlan: 'premium' }),
      });
    });

    it('uses the caller transaction when given and does not open a new one', async () => {
      const tx = {
        subscription: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
        business: { update: jest.fn() },
      };

      await service.startTrial(BUSINESS_ID, tx as unknown as Prisma.TransactionClient);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(tx.subscription.create).toHaveBeenCalled();
      expect(tx.business.update).toHaveBeenCalled();
    });

    it('skips the trial if the business already had a subscription', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({ id: 'old' });
      await service.startTrial(BUSINESS_ID);
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });
  });

  // ─── checkAndExpireSubscriptions ────────────────────────────────────

  describe('checkAndExpireSubscriptions', () => {
    it('expires overdue rows with the conditions re-checked in the write', async () => {
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([
        { id: 'sub-1', businessId: 'biz-a' },
        { id: 'sub-2', businessId: 'biz-b' },
      ]);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const count = await service.checkAndExpireSubscriptions();

      expect(count).toBe(2);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['sub-1', 'sub-2'] },
          status: { in: ['active', 'trial', 'cancelled'] },
          endDate: { lte: now },
        },
        data: { status: 'expired' },
      });
    });

    it('only downgrades businesses with no other live subscription (stale cancelled row)', async () => {
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([
        { id: 'old-cancelled', businessId: 'biz-a' },
      ]);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.checkAndExpireSubscriptions();

      expect(mockPrisma.business.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['biz-a'] },
          subscriptions: {
            none: { status: { in: ['active', 'trial', 'cancelled'] }, endDate: { gt: now } },
          },
        },
        data: { subscriptionPlan: 'free', subscriptionExpiresAt: null },
      });
    });

    it('returns 0 and writes nothing when nothing expired', async () => {
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([]);
      expect(await service.checkAndExpireSubscriptions()).toBe(0);
      expect(mockPrisma.business.updateMany).not.toHaveBeenCalled();
    });
  });
});
