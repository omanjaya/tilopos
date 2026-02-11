import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

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
  private verifyMidtrans(body: any): boolean {
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

    if (signature_key !== expectedSignature) {
      this.logger.error(
        `Invalid Midtrans signature for order ${order_id}. ` +
          `Expected: ${expectedSignature.substring(0, 10)}..., ` +
          `Got: ${signature_key.substring(0, 10)}...`,
      );
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
  private verifyXendit(request: any): boolean {
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

    if (callbackToken !== webhookToken) {
      this.logger.error(
        `Invalid Xendit callback token. ` +
          `Expected: ${webhookToken.substring(0, 8)}..., ` +
          `Got: ${callbackToken.substring(0, 8)}...`,
      );
      throw new UnauthorizedException('Invalid callback token');
    }

    const externalId = request.body?.external_id || request.body?.id || 'unknown';
    this.logger.log(`Xendit webhook verified for external_id ${externalId}`);
    return true;
  }
}
