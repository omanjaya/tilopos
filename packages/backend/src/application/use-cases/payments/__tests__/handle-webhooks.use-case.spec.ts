import { NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import { HandleMidtransWebhookUseCase } from '../handle-midtrans-webhook.use-case';
import { HandleXenditWebhookUseCase } from '../handle-xendit-webhook.use-case';
import { normalizeXenditWebhook } from '../xendit-webhook.mapper';
import type { PaymentWebhookProcessor } from '../payment-webhook.processor';
import type { XenditWebhookDto } from '../../../dtos/xendit-webhook.dto';

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const SERVER_KEY = 'test-server-key';

function sign(orderId: string, statusCode: string, gross: string) {
  return createHash('sha512').update(`${orderId}${statusCode}${gross}${SERVER_KEY}`).digest('hex');
}

describe('HandleMidtransWebhookUseCase', () => {
  const config = { get: jest.fn().mockReturnValue(SERVER_KEY) } as unknown as ConfigService;
  let processor: { process: jest.Mock };
  let useCase: HandleMidtransWebhookUseCase;

  beforeEach(() => {
    processor = {
      process: jest
        .fn()
        .mockResolvedValue({ code: 'applied', paymentId: PAYMENT_ID, message: 'ok' }),
    };
    useCase = new HandleMidtransWebhookUseCase(
      config,
      processor as unknown as PaymentWebhookProcessor,
    );
  });

  const params = (status: string, gross = '50000.00', fraud?: string) => ({
    orderId: PAYMENT_ID,
    statusCode: '200',
    grossAmount: gross,
    signatureKey: sign(PAYMENT_ID, '200', gross),
    transactionId: 'mt-1',
    transactionStatus: status,
    fraudStatus: fraud,
  });

  it('passes the gross amount to the processor for verification', async () => {
    await useCase.execute(params('settlement'));
    expect(processor.process).toHaveBeenCalledWith(
      expect.objectContaining({ reference: PAYMENT_ID, outcome: 'completed', amount: '50000.00' }),
    );
  });

  it('reports an amount mismatch as not successful', async () => {
    processor.process.mockResolvedValue({
      code: 'amount_mismatch',
      paymentId: PAYMENT_ID,
      message: 'x',
    });
    const result = await useCase.execute(params('settlement', '1.00'));
    expect(result.success).toBe(false);
    expect(result.code).toBe('amount_mismatch');
  });

  it('keeps capture + fraud challenge pending and partial_refund partial', () => {
    expect(useCase.mapOutcome('capture', 'challenge')).toBe('pending');
    expect(useCase.mapOutcome('capture', 'deny')).toBe('failed');
    expect(useCase.mapOutcome('partial_refund')).toBe('partially_refunded');
    expect(useCase.mapOutcome('expire')).toBe('failed');
  });

  it('rejects an invalid signature', async () => {
    await expect(useCase.execute({ ...params('settlement'), signatureKey: 'bad' })).rejects.toThrow(
      'Invalid webhook signature',
    );
    expect(processor.process).not.toHaveBeenCalled();
  });

  it('answers non-2xx for an unknown payment so Midtrans retries', async () => {
    processor.process.mockResolvedValue({ code: 'not_found', paymentId: null, message: 'x' });
    await expect(useCase.execute(params('settlement'))).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Xendit callbacks', () => {
  it('normalizes a flat invoice callback (no event, extra fields) using paid_amount', () => {
    const body = {
      id: 'inv_1',
      external_id: PAYMENT_ID,
      status: 'PAID',
      amount: 50000,
      paid_amount: 50000,
    } as XenditWebhookDto;
    expect(normalizeXenditWebhook('invoice', body)).toEqual(
      expect.objectContaining({
        reference: PAYMENT_ID,
        outcome: 'completed',
        amount: 50000,
        gatewayRef: 'inv_1',
      }),
    );
  });

  it('treats an expired invoice as failed', () => {
    const n = normalizeXenditWebhook('invoice', {
      external_id: PAYMENT_ID,
      status: 'EXPIRED',
      amount: 50000,
    } as XenditWebhookDto);
    expect(n?.outcome).toBe('failed');
  });

  it('treats a fixed VA payment callback (no status) as paid and ignores VA created callbacks', () => {
    expect(
      normalizeXenditWebhook('va', {
        external_id: PAYMENT_ID,
        payment_id: 'pay_1',
        callback_virtual_account_id: 'va_1',
        amount: 50000,
      } as XenditWebhookDto)?.outcome,
    ).toBe('completed');
    expect(
      normalizeXenditWebhook('va', {
        external_id: PAYMENT_ID,
        status: 'ACTIVE',
      } as XenditWebhookDto),
    ).toBeNull();
  });

  it('reads legacy QR callbacks and e-wallet charge envelopes', () => {
    expect(
      normalizeXenditWebhook('qris', {
        event: 'qr.payment',
        id: 'qrpy_1',
        status: 'COMPLETED',
        amount: 50000,
        qr_code: { external_id: PAYMENT_ID },
      } as XenditWebhookDto),
    ).toEqual(
      expect.objectContaining({ reference: PAYMENT_ID, outcome: 'completed', amount: 50000 }),
    );
    expect(
      normalizeXenditWebhook('ewallet', {
        event: 'ewallet.capture',
        data: { id: 'ewc_1', reference_id: PAYMENT_ID, status: 'SUCCEEDED', capture_amount: 50000 },
      } as XenditWebhookDto),
    ).toEqual(
      expect.objectContaining({ reference: PAYMENT_ID, outcome: 'completed', amount: 50000 }),
    );
  });

  it('forwards the paid amount so a mismatch is not completed', async () => {
    const processor = {
      process: jest
        .fn()
        .mockResolvedValue({ code: 'amount_mismatch', paymentId: PAYMENT_ID, message: 'x' }),
    };
    const useCase = new HandleXenditWebhookUseCase(processor as unknown as PaymentWebhookProcessor);
    const result = await useCase.execute('invoice', {
      external_id: PAYMENT_ID,
      status: 'PAID',
      amount: 50000,
      paid_amount: 100,
    } as XenditWebhookDto);
    expect(processor.process).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
    expect(result.success).toBe(false);
  });

  it('answers non-2xx for an unknown payment reference', async () => {
    const processor = {
      process: jest.fn().mockResolvedValue({ code: 'not_found', paymentId: null, message: 'x' }),
    };
    const useCase = new HandleXenditWebhookUseCase(processor as unknown as PaymentWebhookProcessor);
    await expect(
      useCase.execute('invoice', {
        external_id: 'nope',
        status: 'PAID',
        amount: 1,
      } as XenditWebhookDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
