/**
 * Notifications Multi-Channel Service
 *
 * Channels:
 * - Push notifications — NOT implemented (no FCM HTTP v1 / device-token registry)
 * - Email (SMTP via nodemailer)
 * - SMS (Twilio)
 * - WhatsApp (Fonnte API)
 *
 * Every send persists a delivery log to notification_logs with the REAL outcome:
 * a channel whose provider is not configured returns
 * { success: false, error: 'NOT_CONFIGURED' } and the log is stored as 'failed'
 * (Docs/ENGINEERING-RULES.md R10).
 *
 * Note: infrastructure/notifications/NotificationDispatcherService is a second,
 * simpler stack used by domain event listeners (SERVICE_TOKENS.NOTIFICATION).
 * Both now report failures honestly; consolidating them is tracked separately.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { AppError, ErrorCode } from '../../shared/errors/app-error';
import {
  escapeHtml,
  maskEmail,
  maskPhone,
  PROVIDER_TIMEOUT_MS,
} from '../../infrastructure/notifications/notification-utils';

// Types
export interface NotificationPayload {
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string; // Employee or Customer ID
  recipientType: 'employee' | 'customer';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
}

export interface ChannelResult {
  success: boolean;
  messageId?: string;
  /** 'NOT_CONFIGURED' | 'UNSUPPORTED' | provider error text */
  error?: string;
}

// Channel Interfaces
interface INotificationChannel {
  send(payload: NotificationPayload, recipient: string): Promise<ChannelResult>;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ========================================
// PUSH NOTIFICATION CHANNEL
// ========================================

/**
 * Push is not implemented: the legacy FCM endpoint (fcm/send + server key) was
 * shut down by Google and there is no device-token registry, so every push is
 * reported as NOT_CONFIGURED instead of a fake success.
 */
@Injectable()
export class PushNotificationChannel implements INotificationChannel {
  private readonly logger = new Logger(PushNotificationChannel.name);

  async send(payload: NotificationPayload): Promise<ChannelResult> {
    this.logger.warn(`Push not delivered (push provider not configured): ${payload.type}`);
    return { success: false, error: 'NOT_CONFIGURED' };
  }
}

// ========================================
// EMAIL CHANNEL (nodemailer)
// ========================================

@Injectable()
export class EmailChannel implements INotificationChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string | number>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass =
      this.configService.get<string>('SMTP_PASS') ??
      this.configService.get<string>('SMTP_PASSWORD');
    this.from = this.configService.get<string>('SMTP_FROM');

    if (host && this.from && (!user || pass)) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        ...(user ? { auth: { user, pass } } : {}),
        connectionTimeout: PROVIDER_TIMEOUT_MS,
        greetingTimeout: PROVIDER_TIMEOUT_MS,
        socketTimeout: PROVIDER_TIMEOUT_MS * 2,
      });
      this.logger.log(`Email transport configured: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST/SMTP_FROM, and SMTP_PASS when SMTP_USER is set) - email notifications disabled',
      );
    }
  }

  async send(payload: NotificationPayload, email: string): Promise<ChannelResult> {
    if (!this.transporter || !this.from) {
      this.logger.warn(`Email not delivered (SMTP not configured) → ${maskEmail(email)}`);
      return { success: false, error: 'NOT_CONFIGURED' };
    }

    try {
      const safeTitle = escapeHtml(payload.title);
      const safeBody = escapeHtml(payload.body);
      const safeActionUrl =
        payload.actionUrl && /^https?:\/\//i.test(payload.actionUrl)
          ? escapeHtml(payload.actionUrl)
          : null;
      const info = await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: payload.title,
        text: payload.body,
        html: `<div style="font-family:sans-serif;padding:20px;">
          <h2>${safeTitle}</h2>
          <p>${safeBody}</p>
          ${safeActionUrl ? `<p><a href="${safeActionUrl}">View Details</a></p>` : ''}
        </div>`,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Email to ${maskEmail(email)} failed: ${errorText(error)}`);
      return { success: false, error: errorText(error) };
    }
  }
}

// ========================================
// SMS CHANNEL (Twilio)
// ========================================

@Injectable()
export class SMSChannel implements INotificationChannel {
  private readonly logger = new Logger(SMSChannel.name);

  constructor(private readonly configService: ConfigService) {}

  async send(payload: NotificationPayload, phone: string): Promise<ChannelResult> {
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const twilioFrom = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (!twilioSid || !twilioToken || !twilioFrom) {
      this.logger.warn(`SMS not delivered (Twilio not configured) → ${maskPhone(phone)}`);
      return { success: false, error: 'NOT_CONFIGURED' };
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({ To: phone, From: twilioFrom, Body: payload.body }).toString(),
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        },
      );

      const result = (await response.json()) as { sid?: string; message?: string };
      if (response.ok && result.sid) {
        return { success: true, messageId: result.sid };
      }
      return { success: false, error: result.message || `Twilio HTTP ${response.status}` };
    } catch (error) {
      this.logger.error(`SMS to ${maskPhone(phone)} failed: ${errorText(error)}`);
      return { success: false, error: errorText(error) };
    }
  }
}

// ========================================
// WHATSAPP CHANNEL (Fonnte API)
// ========================================

@Injectable()
export class WhatsAppChannel implements INotificationChannel {
  private readonly logger = new Logger(WhatsAppChannel.name);

  constructor(private readonly configService: ConfigService) {}

  async send(payload: NotificationPayload, phone: string): Promise<ChannelResult> {
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    const apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');

    if (!apiUrl || !apiToken) {
      this.logger.warn(`WhatsApp not delivered (not configured) → ${maskPhone(phone)}`);
      return { success: false, error: 'NOT_CONFIGURED' };
    }

    try {
      const message = `*${payload.title}*\n\n${payload.body}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: apiToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone, message, countryCode: '62' }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

      const result = (await response.json()) as { status?: boolean; id?: unknown; reason?: string };
      if (response.ok && result.status) {
        return { success: true, messageId: result.id ? `wa_${String(result.id)}` : undefined };
      }
      return { success: false, error: result.reason || `Fonnte HTTP ${response.status}` };
    } catch (error) {
      this.logger.error(`WhatsApp to ${maskPhone(phone)} failed: ${errorText(error)}`);
      return { success: false, error: errorText(error) };
    }
  }
}

// ========================================
// NOTIFICATION SERVICE
// ========================================

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly channels: Map<string, INotificationChannel>;

  constructor(
    private readonly prisma: PrismaService,
    pushChannel: PushNotificationChannel,
    emailChannel: EmailChannel,
    smsChannel: SMSChannel,
    whatsAppChannel: WhatsAppChannel,
  ) {
    this.channels = new Map<string, INotificationChannel>();
    this.channels.set('push', pushChannel);
    this.channels.set('email', emailChannel);
    this.channels.set('sms', smsChannel);
    this.channels.set('whatsapp', whatsAppChannel);
  }

  /**
   * Send a notification to a recipient of `businessId` and log the real outcome.
   * A missing contact or unconfigured provider is logged as 'failed'.
   */
  async send(
    businessId: string,
    outletId: string,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; logId: string; error?: string }> {
    if (!businessId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'businessId is required');
    }
    const channel = this.channels.get(payload.channel);
    if (!channel) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Unknown channel: ${payload.channel}`);
    }

    const contact = await this.getRecipientContact(businessId, payload);
    const result: ChannelResult = contact
      ? await channel.send(payload, contact)
      : { success: false, error: 'NO_CONTACT' };

    const log = await this.prisma.notificationLog.create({
      data: {
        businessId,
        outletId: outletId || null,
        recipientId: payload.recipientId,
        notificationType: payload.type,
        channel: payload.channel,
        title: payload.title,
        body: payload.body,
        status: result.success ? 'sent' : 'failed',
        metadata: {
          ...(payload.data || {}),
          messageId: result.messageId ?? null,
          error: result.error ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    if (!result.success) {
      this.logger.warn(
        `Notification FAILED (${result.error}): ${payload.channel}/${payload.type} to ${payload.recipientType} ${payload.recipientId} (log: ${log.id})`,
      );
    }

    return { success: result.success, logId: log.id, error: result.error };
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  /** Contact lookup is scoped to the business, so ids of other tenants resolve to nothing. */
  private async getRecipientContact(
    businessId: string,
    payload: NotificationPayload,
  ): Promise<string | null> {
    if (payload.channel === 'push') {
      // No device-token registry: the push channel reports NOT_CONFIGURED itself.
      return payload.recipientId;
    }

    const where = { id: payload.recipientId, businessId };
    const select = { email: true, phone: true } as const;
    const contact =
      payload.recipientType === 'employee'
        ? await this.prisma.employee.findFirst({ where, select })
        : await this.prisma.customer.findFirst({ where, select });
    if (!contact) return null;

    switch (payload.channel) {
      case 'email':
        return contact.email ?? null;
      case 'sms':
      case 'whatsapp':
        return contact.phone ?? null;
      default:
        return null;
    }
  }
}
