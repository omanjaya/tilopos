import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

/** Body payload from Midtrans webhook notifications */
interface MidtransWebhookBody {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
}

/** Minimal request shape for webhook verification */
interface WebhookRequest {
  headers: Record<string, string | undefined>;
  body: Record<string, unknown>;
}

/**
 * WebhookGuard - Authenticates payment gateway webhooks
 *
 * Validates webhook authenticity via signature verification (Midtrans)
 * or callback token validation (Xendit) before allowing execution.
 *
 * Security:
 * - Prevents unauthorized webhook manipulation attacks
 * - Fails closed: rejects webhooks if verification config is missing
 * - Logs all verification failures for monitoring
 *
 * Usage:
 * ```ts
 * @Post('webhook/midtrans')
 * @UseGuards(WebhookGuard)
 * async midtransWebhook(@Body() dto: MidtransWebhookDto) {
 *   // Guard ensures this is a legitimate Midtrans webhook
 * }
 * ```
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path: string = request.route?.path || request.url;

    this.logger.log(`Webhook verification for path: ${path}`);

    // Route to appropriate verification method based on path
    if (path.includes('midtrans')) {
      return this.verifyMidtrans(request.body);
    } else if (path.includes('xendit')) {
      return this.verifyXendit(request);
    }

    this.logger.error(`Unknown webhook endpoint: ${path}`);
    throw new UnauthorizedException('Invalid webhook endpoint');
  }

  /**
   * Verifies Midtrans webhook signature
   *
   * Algorithm: SHA512(order_id + status_code + gross_amount + server_key)
   * Reference: https://docs.midtrans.com/docs/http-notifications-webhooks
   *
   * @param body - Webhook request body
   * @returns true if signature is valid
   * @throws UnauthorizedException if verification fails
   */
  private verifyMidtrans(body: MidtransWebhookBody): boolean {
    const { order_id, status_code, gross_amount, signature_key } = body;

    if (!signature_key) {
      this.logger.error('Midtrans webhook missing signature_key');
      throw new UnauthorizedException('Missing signature');
    }

    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      this.logger.error('MIDTRANS_SERVER_KEY not configured');
      throw new UnauthorizedException('Webhook verification not configured');
    }

    // Calculate expected signature
    const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expectedSignature = createHash('sha512').update(payload).digest('hex');

    const sigBuffer = Buffer.from(String(signature_key));
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      this.logger.error(`Invalid Midtrans signature for order ${order_id}`);
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`Midtrans webhook verified for order ${order_id}`);
    return true;
  }

  /**
   * Verifies Xendit webhook callback token
   *
   * Xendit sends verification token in x-callback-token header.
   * Reference: https://developers.xendit.co/api-reference/#webhook-security
   *
   * @param request - HTTP request object
   * @returns true if callback token is valid
   * @throws UnauthorizedException if verification fails
   */
  private verifyXendit(request: WebhookRequest): boolean {
    const callbackToken = request.headers['x-callback-token'];

    if (!callbackToken) {
      this.logger.error('Xendit webhook missing x-callback-token header');
      throw new UnauthorizedException('Missing callback token');
    }

    const webhookToken = this.configService.get<string>('XENDIT_WEBHOOK_TOKEN');
    if (!webhookToken) {
      this.logger.error('XENDIT_WEBHOOK_TOKEN not configured');
      throw new UnauthorizedException('Webhook verification not configured');
    }

    const tokenBuffer = Buffer.from(String(callbackToken));
    const expectedBuffer = Buffer.from(webhookToken);
    if (
      tokenBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(tokenBuffer, expectedBuffer)
    ) {
      this.logger.error('Invalid Xendit callback token');
      throw new UnauthorizedException('Invalid callback token');
    }

    const externalId = request.body?.external_id || request.body?.id || 'unknown';
    this.logger.log(`Xendit webhook verified for external_id ${externalId}`);
    return true;
  }
}
