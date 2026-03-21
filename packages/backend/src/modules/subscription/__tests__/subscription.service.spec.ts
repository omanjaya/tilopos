import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { XenditGateway } from '../../../infrastructure/services/payment/xendit/xendit-gateway';
import { MidtransGateway } from '../../../infrastructure/services/payment/midtrans-gateway';
import { BillingCycle } from '../dto/create-subscription.dto';
import { SUBSCRIPTION_PLANS } from '../../../config/subscription-plans.config';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockXendit: jest.Mocked<XenditGateway>;
  let mockMidtrans: jest.Mocked<MidtransGateway>;

  const BUSINESS_ID = 'biz-001';
  const now = new Date('2026-02-19T10:00:00.000Z');

  const daysFromNow = (days: number): Date => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    mockPrisma = {
      business: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      invoice: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
    } as unknown as jest.Mocked<PrismaService>;

    mockXendit = {
      processPayment: jest.fn(),
    } as unknown as jest.Mocked<XenditGateway>;

    mockMidtrans = {
      processPayment: jest.fn(),
      handleWebhook: jest.fn(),
    } as unknown as jest.Mocked<MidtransGateway>;

    service = new SubscriptionService(mockPrisma, mockXendit, mockMidtrans);
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

  describe('createUpgrade', () => {
    const mockBusiness = {
      id: BUSINESS_ID,
      name: 'Toko ABC',
      email: 'toko@example.com',
      subscriptionPlan: 'free',
    };

    beforeEach(() => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(mockBusiness);
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);
    });

    it('should throw NotFoundException when business not found', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already has active premium', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        ...mockBusiness,
        subscriptionPlan: 'premium',
      });
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'active',
        endDate: daysFromNow(15),
      });

      await expect(service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create monthly invoice with Xendit payment', async () => {
      const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: expect.any(String),
        amount: SUBSCRIPTION_PLANS.premium.monthlyPrice,
        status: 'pending',
      };
      (mockPrisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);
      (mockXendit.processPayment as jest.Mock).mockResolvedValue({
        success: true,
        transactionRef: 'xendit-ref-123',
        paymentData: { invoiceUrl: 'https://checkout.xendit.co/inv-123' },
      });

      const result = await service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY, 'xendit');

      expect(result.amount).toBe(SUBSCRIPTION_PLANS.premium.monthlyPrice);
      expect(result.paymentUrl).toBe('https://checkout.xendit.co/inv-123');
      expect(result.provider).toBe('xendit');
      expect(mockXendit.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'invoice',
          amount: SUBSCRIPTION_PLANS.premium.monthlyPrice,
          description: 'TiloPOS Premium - Bulanan',
        }),
      );
    });

    it('should create yearly invoice with correct price', async () => {
      const mockInvoice = {
        id: 'inv-2',
        invoiceNumber: 'INV-BIZ-001-0001',
        amount: SUBSCRIPTION_PLANS.premium.yearlyPrice,
        status: 'pending',
      };
      (mockPrisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);
      (mockXendit.processPayment as jest.Mock).mockResolvedValue({
        success: true,
        transactionRef: 'xendit-ref-456',
        paymentData: { invoiceUrl: 'https://checkout.xendit.co/inv-456' },
      });

      const result = await service.createUpgrade(BUSINESS_ID, BillingCycle.YEARLY, 'xendit');

      expect(result.amount).toBe(SUBSCRIPTION_PLANS.premium.yearlyPrice);
      expect(mockXendit.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: SUBSCRIPTION_PLANS.premium.yearlyPrice,
          description: 'TiloPOS Premium - Tahunan',
        }),
      );
    });

    it('should create invoice with Midtrans provider', async () => {
      const mockInvoice = {
        id: 'inv-3',
        invoiceNumber: 'INV-BIZ-001-0001',
        amount: SUBSCRIPTION_PLANS.premium.monthlyPrice,
        status: 'pending',
      };
      (mockPrisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);
      (mockMidtrans.processPayment as jest.Mock).mockResolvedValue({
        success: true,
        transactionRef: 'midtrans-ref-789',
        redirectUrl: 'https://app.midtrans.com/snap/v1/pay-789',
      });

      const result = await service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY, 'midtrans');

      expect(result.provider).toBe('midtrans');
      expect(mockMidtrans.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'bank_transfer',
          amount: SUBSCRIPTION_PLANS.premium.monthlyPrice,
        }),
      );
    });

    it('should generate sequential invoice numbers', async () => {
      (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(5);
      const mockInvoice = {
        id: 'inv-4',
        invoiceNumber: expect.any(String),
        amount: SUBSCRIPTION_PLANS.premium.monthlyPrice,
        status: 'pending',
      };
      (mockPrisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);
      (mockXendit.processPayment as jest.Mock).mockResolvedValue({ success: false });

      await service.createUpgrade(BUSINESS_ID, BillingCycle.MONTHLY);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: expect.stringContaining('-0006'),
          }),
        }),
      );
    });
  });

  // ─── handlePaymentCallback ──────────────────────────────────────────

  describe('handlePaymentCallback', () => {
    const mockInvoice = {
      id: 'inv-1',
      businessId: BUSINESS_ID,
      invoiceNumber: 'INV-BIZ-0001-0001',
      amount: 149000,
      status: 'pending',
      metadata: { billingCycle: 'monthly', plan: 'premium' },
    };

    it('should process Xendit PAID callback and activate subscription', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      // Mock activateSubscription internals (findUnique is called inside $transaction)
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({
        id: 'sub-new',
        businessId: BUSINESS_ID,
      });
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      const result = await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'PAID',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment processed successfully');
      // Verify subscription was created
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            plan: 'premium',
            status: 'active',
            billingCycle: 'monthly',
          }),
        }),
      );
      // Verify business was upgraded
      expect(mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BUSINESS_ID },
          data: expect.objectContaining({
            subscriptionPlan: 'premium',
          }),
        }),
      );
    });

    it('should process Xendit SETTLED callback as completed', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' });
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      const result = await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'SETTLED',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment processed successfully');
    });

    it('should handle Xendit EXPIRED callback as failed', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({});

      const result = await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'EXPIRED',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment failed');
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'failed' },
        }),
      );
    });

    it('should process Midtrans completed callback', async () => {
      (mockMidtrans.handleWebhook as jest.Mock).mockResolvedValue({
        success: true,
        transactionStatus: 'completed',
      });
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' });
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      const result = await service.handlePaymentCallback('midtrans', {
        order_id: 'INV-BIZ-0001-0001',
        transaction_status: 'settlement',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment processed successfully');
    });

    it('should reject Midtrans callback with invalid signature', async () => {
      (mockMidtrans.handleWebhook as jest.Mock).mockResolvedValue({
        success: false,
      });

      const result = await service.handlePaymentCallback('midtrans', {
        order_id: 'INV-BIZ-0001-0001',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
    });

    it('should return already processed for paid invoices', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
      });

      const result = await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'PAID',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Already processed');
    });

    it('should return error for missing invoice reference', async () => {
      const result = await service.handlePaymentCallback('xendit', {});

      expect(result.success).toBe(false);
      expect(result.message).toBe('Missing invoice reference');
    });

    it('should return error when invoice not found', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.handlePaymentCallback('xendit', {
        external_id: 'INV-NOT-FOUND',
        status: 'PAID',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invoice not found');
    });

    it('should return pending for pending status', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'PENDING',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Pending');
    });

    it('should set yearly endDate for yearly billing cycle', async () => {
      const yearlyInvoice = {
        ...mockInvoice,
        metadata: { billingCycle: 'yearly', plan: 'premium' },
      };
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(yearlyInvoice);
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(yearlyInvoice);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' });
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'PAID',
      });

      // Verify subscription end date is 1 year from now
      const createCall = (mockPrisma.subscription.create as jest.Mock).mock.calls[0][0];
      const endDate: Date = createCall.data.endDate;
      expect(endDate.getFullYear()).toBe(now.getFullYear() + 1);
    });

    it('should expire existing active subscriptions when activating new one', async () => {
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' });
      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      await service.handlePaymentCallback('xendit', {
        external_id: 'INV-BIZ-0001-0001',
        status: 'PAID',
      });

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: {
          businessId: BUSINESS_ID,
          status: { in: ['active', 'trial'] },
        },
        data: { status: 'expired' },
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
      (mockPrisma.subscription.update as jest.Mock).mockResolvedValue({});

      const result = await service.cancelSubscription(BUSINESS_ID, 'Terlalu mahal');

      expect(result.message).toContain('Langganan dibatalkan');
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
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
      (mockPrisma.subscription.update as jest.Mock).mockResolvedValue({});

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
    it('should create a trial subscription for new business', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-trial' });
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      await service.startTrial(BUSINESS_ID);

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: BUSINESS_ID,
          plan: 'premium',
          status: 'trial',
          billingCycle: 'monthly',
        }),
      });

      // Verify trial duration is 14 days
      const createCall = (mockPrisma.subscription.create as jest.Mock).mock.calls[0][0];
      const trialEnd: Date = createCall.data.trialEndsAt;
      const diffDays = Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(SUBSCRIPTION_PLANS.premium.trialDays);
    });

    it('should upgrade business plan to premium during trial', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({ id: 'sub-trial' });
      (mockPrisma.business.update as jest.Mock).mockResolvedValue({});

      await service.startTrial(BUSINESS_ID);

      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: expect.objectContaining({
          subscriptionPlan: 'premium',
        }),
      });
    });

    it('should skip trial if business already had a subscription', async () => {
      (mockPrisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub-old',
        status: 'expired',
      });

      await service.startTrial(BUSINESS_ID);

      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
      expect(mockPrisma.business.update).not.toHaveBeenCalled();
    });
  });

  // ─── checkAndExpireSubscriptions ────────────────────────────────────

  describe('checkAndExpireSubscriptions', () => {
    it('should expire overdue subscriptions and downgrade businesses', async () => {
      const expired = [
        { id: 'sub-1', businessId: 'biz-1' },
        { id: 'sub-2', businessId: 'biz-2' },
        { id: 'sub-3', businessId: 'biz-1' }, // Same business, different sub
      ];
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue(expired);
      (mockPrisma.subscription.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      (mockPrisma.business.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.checkAndExpireSubscriptions();

      expect(result).toBe(3);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['sub-1', 'sub-2', 'sub-3'] } },
        data: { status: 'expired' },
      });
      // Should deduplicate business IDs
      expect(mockPrisma.business.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['biz-1', 'biz-2'] } },
        data: {
          subscriptionPlan: 'free',
          subscriptionExpiresAt: null,
        },
      });
    });

    it('should return 0 when no subscriptions are expired', async () => {
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.checkAndExpireSubscriptions();

      expect(result).toBe(0);
      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.business.updateMany).not.toHaveBeenCalled();
    });

    it('should query for active, trial, and cancelled subscriptions past endDate', async () => {
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      await service.checkAndExpireSubscriptions();

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['active', 'trial', 'cancelled'] },
          endDate: { lte: now },
        },
        select: { id: true, businessId: true },
      });
    });
  });
});
