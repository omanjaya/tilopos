import { Test } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { WebhookGuard } from '../webhook.guard';

describe('WebhookGuard', () => {
  let guard: WebhookGuard;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    guard = new WebhookGuard(mockConfigService);
  });

  describe('Midtrans Webhook Verification', () => {
    const serverKey = 'test-server-key-123';

    beforeEach(() => {
      mockConfigService.get.mockReturnValue(serverKey);
    });

    it('should allow valid Midtrans webhook', () => {
      const orderId = 'ORD-123';
      const statusCode = '200';
      const grossAmount = '100000';

      // Calculate expected signature
      const expectedSignature = createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      const context = createMockContext({
        path: '/api/v1/payments/webhook/midtrans',
        body: {
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: expectedSignature,
        },
      });

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject Midtrans webhook with invalid signature', () => {
      const context = createMockContext({
        path: '/api/v1/payments/webhook/midtrans',
        body: {
          order_id: 'ORD-123',
          status_code: '200',
          gross_amount: '100000',
          signature_key: 'invalid-signature',
        },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid signature');
    });

    it('should reject Midtrans webhook without signature_key', () => {
      const context = createMockContext({
        path: '/api/v1/payments/webhook/midtrans',
        body: {
          order_id: 'ORD-123',
          status_code: '200',
          gross_amount: '100000',
          // No signature_key
        },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Missing signature');
    });

    it('should reject Midtrans webhook when server key is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const context = createMockContext({
        path: '/api/v1/payments/webhook/midtrans',
        body: {
          order_id: 'ORD-123',
          status_code: '200',
          gross_amount: '100000',
          signature_key: 'some-signature',
        },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Webhook verification not configured');
    });

    it('should handle Midtrans signature verification with different order amounts', () => {
      const orderId = 'ORD-456';
      const statusCode = '201';
      const grossAmount = '250000.50';

      const expectedSignature = createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      const context = createMockContext({
        path: '/api/v1/payments/webhook/midtrans',
        body: {
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: expectedSignature,
        },
      });

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Xendit Webhook Verification', () => {
    const webhookToken = 'xendit-webhook-token-123';

    beforeEach(() => {
      mockConfigService.get.mockReturnValue(webhookToken);
    });

    it('should allow valid Xendit webhook', () => {
      const context = createMockContext({
        path: '/api/v1/payments/webhook/xendit',
        headers: {
          'x-callback-token': webhookToken,
        },
        body: {
          external_id: 'EXT-123',
          status: 'PAID',
        },
      });

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject Xendit webhook with invalid token', () => {
      const context = createMockContext({
        path: '/api/v1/payments/webhook/xendit',
        headers: {
          'x-callback-token': 'invalid-token',
        },
        body: {
          external_id: 'EXT-123',
          status: 'PAID',
        },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid callback token');
    });

    it('should reject Xendit webhook without callback token', () => {
      const context = createMockContext({
        path: '/api/v1/payments/webhook/xendit',
        headers: {},
        body: {
          external_id: 'EXT-123',
          status: 'PAID',
        },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Missing callback token');
    });

    it('should reject Xendit webhook when token is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const context = createMockContext({
        path: '/api/v1/payments/webhook/xendit',
        headers: {
          'x-callback-token': webhookToken,
        },
        body: {
          external_id: 'EXT-123',
          status: 'PAID',
        },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Webhook verification not configured');
    });

    it('should work with alternative Xendit endpoints', () => {
      const paths = [
        '/api/v1/payments/xendit/callback',
        '/api/v1/payments/xendit/invoice',
        '/api/v1/payments/xendit/qris',
        '/api/v1/payments/xendit/va',
        '/api/v1/payments/xendit/ewallet',
        '/api/v1/payments/xendit/retail',
      ];

      paths.forEach((path) => {
        const context = createMockContext({
          path,
          headers: {
            'x-callback-token': webhookToken,
          },
          body: {
            external_id: 'EXT-123',
            status: 'PAID',
          },
        });

        const result = guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Unknown Webhook Endpoints', () => {
    it('should reject unknown webhook endpoints', () => {
      const context = createMockContext({
        path: '/api/v1/payments/webhook/unknown',
        body: {},
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid webhook endpoint');
    });
  });
});

/**
 * Helper to create mock ExecutionContext
 */
function createMockContext(data: {
  path: string;
  headers?: Record<string, string>;
  body: Record<string, any>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        route: {
          path: data.path,
        },
        url: data.path,
        headers: data.headers || {},
        body: data.body,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as ExecutionContext;
}
