import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToInstance, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, validate } from 'class-validator';

/**
 * Fields the subscription webhook reads from Midtrans / Xendit invoice callbacks.
 *
 * Provider payloads carry many more fields than we use, and the global
 * ValidationPipe runs with `forbidNonWhitelisted`, which would reject real
 * callbacks. The body is therefore taken with @WebhookPayload() (a custom
 * decorator, not validated by the global pipe) and validated explicitly here
 * with `whitelist: true` — unknown fields are stripped, known ones type-checked.
 */
export class SubscriptionWebhookDto {
  // ---- Xendit invoice callback ----
  @IsOptional() @IsString() @MaxLength(100) id?: string;
  @IsOptional() @IsString() @MaxLength(255) external_id?: string;
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @Type(() => Number) @IsNumber() amount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() paid_amount?: number;
  @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @IsOptional() @IsString() @MaxLength(100) payment_method?: string;

  // ---- Midtrans notification ----
  @IsOptional() @IsString() @MaxLength(255) order_id?: string;
  @IsOptional() @IsString() @MaxLength(10) status_code?: string;
  @IsOptional() @IsString() @MaxLength(50) gross_amount?: string;
  @IsOptional() @IsString() @MaxLength(512) signature_key?: string;
  @IsOptional() @IsString() @MaxLength(50) transaction_status?: string;
  @IsOptional() @IsString() @MaxLength(100) transaction_id?: string;
  @IsOptional() @IsString() @MaxLength(50) fraud_status?: string;
  @IsOptional() @IsString() @MaxLength(50) payment_type?: string;
}

export async function parseSubscriptionWebhook(body: unknown): Promise<SubscriptionWebhookDto> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Invalid webhook payload');
  }
  const dto = plainToInstance(SubscriptionWebhookDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
  if (errors.length > 0) {
    throw new BadRequestException(
      `Invalid webhook payload: ${errors.map((e) => e.property).join(', ')}`,
    );
  }
  return dto;
}

/** Raw provider body (see SubscriptionWebhookDto for why it bypasses the global pipe). */
export const WebhookPayload = createParamDecorator((_: unknown, ctx: ExecutionContext): unknown => {
  return ctx.switchToHttp().getRequest<{ body?: unknown }>().body;
});
