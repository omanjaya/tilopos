/**
 * Notifications Multi-Channel Service
 *
 * Channels:
 * - Push notifications (FCM/APNs)
 * - Email (SMTP via nodemailer)
 * - SMS (Twilio/local providers)
 * - WhatsApp (Fonnte API)
 *
 * All channels persist delivery logs to the notification_logs table.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NotificationChannel, NotificationType, NotificationLogStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { AppError, ErrorCode } from '../../shared/errors/app-error';

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

// Channel Interfaces
interface INotificationChannel {
  send(
    payload: NotificationPayload,
    recipient: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ========================================
// PUSH NOTIFICATION CHANNEL (FCM)
// ========================================

@Injectable()
export class PushNotificationChannel implements INotificationChannel {
  private readonly logger = new Logger(PushNotificationChannel.name);

  constructor(private readonly configService: ConfigService) {}

  async send(
    payload: NotificationPayload,
    deviceToken: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      this.logger.log(`Sending push to ${deviceToken}: ${payload.title}`);

      // FCM requires firebase-admin SDK + service account credentials
      // When FCM_SERVER_KEY is configured, use it
      const fcmKey = this.configService.get<string>('FCM_SERVER_KEY');
      if (!fcmKey) {
        this.logger.warn(
          'FCM_SERVER_KEY not configured - push notification logged but not delivered',
        );
        return {
          success: true,
          messageId: `push_logged_${Date.now()}`,
        };
      }

      // Real FCM HTTP v1 send
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmKey}`,
        },
        body: JSON.stringify({
          to: deviceToken,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.imageUrl,
          },
          data: payload.data,
        }),
      });

      const result = await response.json();
      if (result.success === 1) {
        return { success: true, messageId: `fcm_${result.multicast_id}` };
      }

      return {
        success: false,
        error: result.results?.[0]?.error || 'FCM send failed',
      };
    } catch (error) {
      this.logger.error(`Push failed: ${error}`);
      return { success: false, error: String(error) };
    }
  }
}

// ========================================
// EMAIL CHANNEL (nodemailer)
// ========================================

@Injectable()
export class EmailChannel implements INotificationChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email transport configured: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS) - emails will be logged but not delivered',
      );
    }
  }

  async send(
    payload: NotificationPayload,
    email: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      this.logger.log(`Sending email to ${email}: ${payload.title}`);

      if (!this.transporter) {
        this.logger.warn(`Email not delivered (SMTP not configured): ${payload.title} → ${email}`);
        return {
          success: true,
          messageId: `email_logged_${Date.now()}`,
        };
      }

      const from = this.configService.get<string>('SMTP_FROM', 'noreply@tilopos.com');
      const info = await this.transporter.sendMail({
        from,
        to: email,
        subject: payload.title,
        text: payload.body,
        html: `<div style="font-family:sans-serif;padding:20px;">
          <h2>${payload.title}</h2>
          <p>${payload.body}</p>
          ${payload.actionUrl ? `<p><a href="${payload.actionUrl}">View Details</a></p>` : ''}
        </div>`,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error(`Email failed: ${error}`);
      return { success: false, error: String(error) };
    }
  }
}

// ========================================
// SMS CHANNEL
// ========================================

@Injectable()
export class SMSChannel implements INotificationChannel {
  private readonly logger = new Logger(SMSChannel.name);

  constructor(private readonly configService: ConfigService) {}

  async send(
    payload: NotificationPayload,
    phone: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      this.logger.log(`Sending SMS to ${phone}: ${payload.body.substring(0, 50)}...`);

      const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      const twilioFrom = this.configService.get<string>('TWILIO_FROM_NUMBER');

      if (!twilioSid || !twilioToken || !twilioFrom) {
        this.logger.warn(
          `SMS not delivered (Twilio not configured): ${payload.body.substring(0, 50)} → ${phone}`,
        );
        return {
          success: true,
          messageId: `sms_logged_${Date.now()}`,
        };
      }

      // Real Twilio HTTP API call
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioFrom,
            Body: payload.body,
          }).toString(),
        },
      );

      const result = await response.json();
      if (result.sid) {
        return { success: true, messageId: result.sid };
      }

      return { success: false, error: result.message || 'Twilio send failed' };
    } catch (error) {
      this.logger.error(`SMS failed: ${error}`);
      return { success: false, error: String(error) };
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

  async send(
    payload: NotificationPayload,
    phone: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      this.logger.log(`Sending WhatsApp to ${phone}: ${payload.title}`);

      const apiUrl = this.configService.get<string>(
        'WHATSAPP_API_URL',
        'https://api.fonnte.com/send',
      );
      const apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');

      if (!apiToken) {
        this.logger.warn(
          `WhatsApp not delivered (WHATSAPP_API_TOKEN not configured): ${payload.title} → ${phone}`,
        );
        return {
          success: true,
          messageId: `wa_logged_${Date.now()}`,
        };
      }

      // Real Fonnte API call
      const message = `*${payload.title}*\n\n${payload.body}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: apiToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message,
          countryCode: '62', // Indonesia
        }),
      });

      const result = await response.json();
      if (result.status) {
        return { success: true, messageId: `wa_${result.id || Date.now()}` };
      }

      return { success: false, error: result.reason || 'Fonnte send failed' };
    } catch (error) {
      this.logger.error(`WhatsApp failed: ${error}`);
      return { success: false, error: String(error) };
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

  // ========================================
  // SEND NOTIFICATIONS
  // ========================================

  /**
   * Send notification to a recipient and log to DB.
   */
  async send(
    businessId: string,
    outletId: string,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; logId: string }> {
    const channel = this.channels.get(payload.channel);
    if (!channel) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Unknown channel: ${payload.channel}`);
    }

    // Get recipient contact
    const contact = await this.getRecipientContact(payload);
    if (!contact) {
      this.logger.warn(`No contact for ${payload.recipientType} ${payload.recipientId}`);
      return { success: false, logId: '' };
    }

    // Send via channel
    const result = await channel.send(payload, contact);

    // Persist to notification_logs table
    const log = await this.prisma.notificationLog.create({
      data: {
        businessId,
        outletId: outletId || null,
        recipientId: payload.recipientId,
        notificationType: payload.type,
        channel: payload.channel,
        title: payload.title,
        body: payload.body,
        status: result.success ? 'sent' : ('failed' as NotificationLogStatus),
        metadata: {
          messageId: result.messageId || null,
          error: result.error || null,
          ...(payload.data || {}),
        },
      },
    });

    this.logger.log(
      `Notification ${result.success ? 'sent' : 'FAILED'}: ${payload.channel}/${payload.type} to ${payload.recipientId} (log: ${log.id})`,
    );

    return { success: result.success, logId: log.id };
  }

  /**
   * Send to multiple recipients
   */
  async sendBulk(
    businessId: string,
    outletId: string,
    payloads: NotificationPayload[],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const result = await this.send(businessId, outletId, payload);
      if (result.success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  /**
   * Send to all employees with specific notification setting enabled
   */
  async sendToEmployees(
    businessId: string,
    outletId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const settings = await this.prisma.notificationSetting.findMany({
      where: {
        businessId,
        OR: [{ outletId }, { outletId: null }],
        employeeId: { not: null },
        isEnabled: true,
        notificationType: type,
      },
      include: { employee: true },
    });

    for (const setting of settings) {
      if (!setting.employeeId) continue;
      await this.send(businessId, outletId, {
        type,
        channel: setting.channel,
        recipientId: setting.employeeId,
        recipientType: 'employee',
        title,
        body,
        data,
      });
    }
  }

  // ========================================
  // NOTIFICATION TRIGGERS
  // ========================================

  /**
   * Low stock alert
   */
  async notifyLowStock(
    businessId: string,
    outletId: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ): Promise<void> {
    await this.sendToEmployees(
      businessId,
      outletId,
      'low_stock',
      'Low Stock Alert',
      `${productName} is running low (${currentStock} remaining, threshold: ${threshold})`,
      { productName, currentStock, threshold },
    );
  }

  /**
   * Large transaction alert
   */
  async notifyLargeTransaction(
    businessId: string,
    outletId: string,
    transactionId: string,
    amount: number,
    employeeName: string,
  ): Promise<void> {
    await this.sendToEmployees(
      businessId,
      outletId,
      'large_transaction',
      'Large Transaction',
      `Transaction Rp ${amount.toLocaleString()} processed by ${employeeName}`,
      { transactionId, amount, employeeName },
    );
  }

  /**
   * Refund alert
   */
  async notifyRefund(
    businessId: string,
    outletId: string,
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    await this.sendToEmployees(
      businessId,
      outletId,
      'refund',
      'Refund Processed',
      `Refund of Rp ${amount.toLocaleString()} - ${reason}`,
      { transactionId, amount, reason },
    );
  }

  /**
   * New online order
   */
  async notifyOnlineOrder(
    businessId: string,
    outletId: string,
    orderId: string,
    platform: string,
    total: number,
  ): Promise<void> {
    await this.sendToEmployees(
      businessId,
      outletId,
      'online_order',
      `New ${platform} Order`,
      `Order #${orderId} - Rp ${total.toLocaleString()}`,
      { orderId, platform, total },
    );
  }

  /**
   * Shift reminder
   */
  async notifyShiftReminder(
    businessId: string,
    outletId: string,
    employeeId: string,
    shiftStart: Date,
  ): Promise<void> {
    const timeStr = shiftStart.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    await this.send(businessId, outletId, {
      type: 'shift_reminder',
      channel: 'push',
      recipientId: employeeId,
      recipientType: 'employee',
      title: 'Shift Reminder',
      body: `Your shift starts at ${timeStr}`,
      data: { shiftStart: shiftStart.toISOString() },
    });
  }

  // ========================================
  // CUSTOMER NOTIFICATIONS
  // ========================================

  /**
   * Send receipt to customer
   */
  async sendReceipt(
    businessId: string,
    outletId: string,
    customerId: string,
    transactionId: string,
    total: number,
    channel: 'email' | 'whatsapp',
  ): Promise<void> {
    await this.send(businessId, outletId, {
      type: 'large_transaction',
      channel,
      recipientId: customerId,
      recipientType: 'customer',
      title: 'Receipt from TILO',
      body: `Thank you for your purchase! Total: Rp ${total.toLocaleString()}`,
      data: { transactionId, total },
      actionUrl: `/receipts/${transactionId}`,
    });
  }

  /**
   * Send loyalty points update
   */
  async sendLoyaltyUpdate(
    businessId: string,
    outletId: string,
    customerId: string,
    pointsEarned: number,
    totalPoints: number,
    channel: 'push' | 'whatsapp',
  ): Promise<void> {
    await this.send(businessId, outletId, {
      type: 'large_transaction',
      channel,
      recipientId: customerId,
      recipientType: 'customer',
      title: 'Points Earned!',
      body: `You earned ${pointsEarned} points! Total: ${totalPoints} points`,
      data: { pointsEarned, totalPoints },
    });
  }

  // ========================================
  // SETTINGS & UTILITIES
  // ========================================

  async getNotificationSettings(businessId: string, employeeId?: string): Promise<unknown[]> {
    return this.prisma.notificationSetting.findMany({
      where: {
        businessId,
        ...(employeeId && { employeeId }),
      },
    });
  }

  async updateNotificationSettings(
    id: string,
    settings: Record<string, boolean>,
  ): Promise<unknown> {
    return this.prisma.notificationSetting.update({
      where: { id },
      data: settings,
    });
  }

  async getNotificationLogs(
    businessId: string,
    options?: {
      outletId?: string;
      type?: NotificationType;
      channel?: NotificationChannel;
      status?: NotificationLogStatus;
      limit?: number;
    },
  ): Promise<unknown[]> {
    return this.prisma.notificationLog.findMany({
      where: {
        businessId,
        ...(options?.outletId && { outletId: options.outletId }),
        ...(options?.type && { notificationType: options.type }),
        ...(options?.channel && { channel: options.channel }),
        ...(options?.status && { status: options.status }),
      },
      orderBy: { sentAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  private async getRecipientContact(payload: NotificationPayload): Promise<string | null> {
    if (payload.recipientType === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: payload.recipientId },
      });
      if (!employee) return null;

      switch (payload.channel) {
        case 'email':
          return employee.email;
        case 'sms':
          return employee.phone;
        case 'whatsapp':
          return employee.phone;
        case 'push':
          return payload.recipientId; // Device token from separate table
        default:
          return null;
      }
    } else {
      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.recipientId },
      });
      if (!customer) return null;

      switch (payload.channel) {
        case 'email':
          return customer.email;
        case 'sms':
          return customer.phone;
        case 'whatsapp':
          return customer.phone;
        case 'push':
          return payload.recipientId;
        default:
          return null;
      }
    }
  }
}
