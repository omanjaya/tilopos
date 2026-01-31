import { IsString, IsOptional, IsNumber, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Xendit Webhook Events
 */
export enum XenditWebhookEvent {
    // Invoice events
    INVOICE_PAID = 'invoice.paid',
    INVOICE_EXPIRED = 'invoice.expired',

    // QRIS events
    QRCODE_PAID = 'qr_code.paid',
    QRCODE_EXPIRED = 'qr_code.expired',

    // Virtual Account events
    VA_PAID = 'fixed_payment_code.paid',
    VA_CREATED = 'fixed_payment_code.created',
    VA_UPDATED = 'fixed_payment_code.updated',
    VA_EXPIRED = 'fixed_payment_code.expired',

    // E-Wallet events
    EWALLET_CAPTURED = 'ewallet.capture',
    EWALLET_VOIDED = 'ewallet.void',
    EWALLET_REFUNDED = 'ewallet.refund',

    // Retail outlet events
    RETAIL_PAID = 'retail_outlet.paid',
    RETAIL_EXPIRED = 'retail_outlet.expired',

    // Refund events
    REFUND_REQUESTED = 'refund.requested',
    REFUND_COMPLETED = 'refund.completed',
    REFUND_FAILED = 'refund.failed',

    // Payment events (new API)
    PAYMENT_SUCCEEDED = 'payment.succeeded',
    PAYMENT_FAILED = 'payment.failed',
    PAYMENT_PENDING = 'payment.pending',
}

export enum XenditPaymentStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    SETTLED = 'SETTLED',
    EXPIRED = 'EXPIRED',
    FAILED = 'FAILED',
    COMPLETED = 'COMPLETED',
    VOIDED = 'VOIDED',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

/**
 * Invoice Webhook Payload
 */
export class XenditInvoiceWebhookDto {
    @IsString()
    id!: string;

    @IsString()
    external_id!: string;

    @IsString()
    user_id!: string;

    @IsEnum(XenditPaymentStatus)
    status!: XenditPaymentStatus;

    @IsNumber()
    amount!: number;

    @IsNumber()
    @IsOptional()
    paid_amount?: number;

    @IsString()
    @IsOptional()
    paid_at?: string;

    @IsString()
    @IsOptional()
    payment_method?: string;

    @IsString()
    @IsOptional()
    payment_channel?: string;

    @IsString()
    @IsOptional()
    payment_destination?: string;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    created!: string;

    @IsString()
    updated!: string;
}

/**
 * QRIS Webhook Payload
 */
export class XenditQRCodeWebhookDto {
    @IsString()
    id!: string;

    @IsString()
    external_id!: string;

    @IsNumber()
    amount!: number;

    @IsString()
    qr_string!: string;

    @IsEnum(XenditPaymentStatus)
    status!: XenditPaymentStatus;

    @IsString()
    created!: string;

    @IsString()
    @IsOptional()
    paid_at?: string;

    @IsString()
    @IsOptional()
    payment_detail?: string;
}

/**
 * Virtual Account Webhook Payload
 */
export class XenditVAWebhookDto {
    @IsString()
    id!: string;

    @IsString()
    external_id!: string;

    @IsString()
    owner_id!: string;

    @IsString()
    bank_code!: string;

    @IsString()
    merchant_code!: string;

    @IsString()
    account_number!: string;

    @IsNumber()
    expected_amount!: number;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsEnum(XenditPaymentStatus)
    status!: XenditPaymentStatus;

    @IsString()
    @IsOptional()
    expiration_date?: string;

    @IsString()
    @IsOptional()
    paid_at?: string;

    @IsObject()
    @IsOptional()
    payment_details?: Record<string, unknown>;
}

/**
 * E-Wallet Webhook Payload
 */
export class XenditEwalletWebhookDto {
    @IsString()
    id!: string;

    @IsString()
    external_id!: string;

    @IsString()
    business_id!: string;

    @IsString()
    ewallet_type!: string;

    @IsNumber()
    amount!: number;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    status!: string;

    @IsString()
    created!: string;

    @IsString()
    @IsOptional()
    updated?: string;
}

/**
 * Retail Outlet Webhook Payload
 */
export class XenditRetailWebhookDto {
    @IsString()
    external_id!: string;

    @IsString()
    retail_outlet_name!: string;

    @IsString()
    prefix!: string;

    @IsString()
    payment_code!: string;

    @IsString()
    name!: string;

    @IsNumber()
    expected_amount!: number;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    status!: string;

    @IsString()
    @IsOptional()
    expiration_date?: string;

    @IsString()
    @IsOptional()
    paid_at?: string;
}

/**
 * Refund Webhook Payload
 */
export class XenditRefundWebhookDto {
    @IsString()
    id!: string;

    @IsString()
    payment_id!: string;

    @IsString()
    @IsOptional()
    invoice_id?: string;

    @IsNumber()
    amount!: number;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsString()
    status!: string;

    @IsString()
    created!: string;

    @IsString()
    @IsOptional()
    updated?: string;
}

/**
 * Main Xendit Webhook DTO
 * Wraps all webhook types with event discriminator
 */
export class XenditWebhookDto {
    @IsString()
    event!: string;

    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    external_id?: string;

    @IsString()
    @IsOptional()
    business_id?: string;

    @IsString()
    @IsOptional()
    created?: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, unknown>;

    // For invoice webhooks
    @ValidateNested()
    @Type(() => XenditInvoiceWebhookDto)
    @IsOptional()
    invoice?: XenditInvoiceWebhookDto;

    // For QR code webhooks
    @ValidateNested()
    @Type(() => XenditQRCodeWebhookDto)
    @IsOptional()
    qr_code?: XenditQRCodeWebhookDto;

    // For VA webhooks
    @ValidateNested()
    @Type(() => XenditVAWebhookDto)
    @IsOptional()
    virtual_account?: XenditVAWebhookDto;

    // For e-wallet webhooks
    @ValidateNested()
    @Type(() => XenditEwalletWebhookDto)
    @IsOptional()
    ewallet?: XenditEwalletWebhookDto;

    // For retail outlet webhooks
    @ValidateNested()
    @Type(() => XenditRetailWebhookDto)
    @IsOptional()
    retail_outlet?: XenditRetailWebhookDto;

    // For refund webhooks
    @ValidateNested()
    @Type(() => XenditRefundWebhookDto)
    @IsOptional()
    refund?: XenditRefundWebhookDto;

    // Generic fields that may appear in various webhook types
    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    payment_method?: string;

    @IsString()
    @IsOptional()
    payment_channel?: string;
}

/**
 * Xendit Webhook Headers
 */
export interface XenditWebhookHeaders {
    'x-callback-token'?: string;
    'webhook-id'?: string;
}
