import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { escapeHtml, maskEmail } from '../notification-utils';

export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, unknown>;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

/**
 * Template directories, in priority order:
 * - next to the compiled file (dist/…/email/templates, needs nest-cli "assets")
 * - the source tree (ts-node / dev)
 */
const TEMPLATE_DIRS = [
  join(__dirname, 'templates'),
  join(process.cwd(), 'src/infrastructure/notifications/email/templates'),
];

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private from: string | null = null;
  private readonly templateDir: string | null;

  constructor(private readonly configService: ConfigService) {
    this.templateDir = TEMPLATE_DIRS.find((dir) => existsSync(dir)) ?? null;
    if (!this.templateDir) {
      this.logger.warn(`Email templates not found in: ${TEMPLATE_DIRS.join(', ')}`);
    }
    this.initTransporter();
  }

  /** True when SMTP is configured and send() can actually deliver. */
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  private initTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const from = this.configService.get<string>('SMTP_FROM');
    if (!host || !from) {
      this.logger.warn('SMTP not configured (SMTP_HOST/SMTP_FROM missing): emails cannot be sent');
      return;
    }

    const port = Number(this.configService.get<string | number>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    // k8s manifests use SMTP_PASSWORD; older .env files use SMTP_PASS.
    const pass =
      this.configService.get<string>('SMTP_PASS') ??
      this.configService.get<string>('SMTP_PASSWORD');
    if (user && !pass) {
      this.logger.error('SMTP_USER is set but SMTP_PASS/SMTP_PASSWORD is missing: emails disabled');
      return;
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user ? { auth: { user, pass } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /**
   * Sends an e-mail. Throws when SMTP is not configured or the provider rejects
   * the message — callers must never report "sent" otherwise (R10).
   */
  async send(options: EmailOptions): Promise<void> {
    if (!this.transporter || !this.from) {
      this.logger.warn(`Email not sent (SMTP not configured): ${maskEmail(options.to)}`);
      throw new ServiceUnavailableException({
        message: 'Email delivery is not configured',
        reason: 'NOT_CONFIGURED',
      });
    }

    let html = options.html || '';
    if (options.template) {
      html = this.renderTemplate(options.template, options.context ?? {});
    }

    try {
      const result = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      if (!result.accepted?.length || result.rejected?.length) {
        throw new Error('SMTP did not accept all recipients');
      }
      this.logger.log(`Email sent to ${maskEmail(options.to)}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${maskEmail(options.to)}`, error);
      throw error;
    }
  }

  private renderTemplate(templateName: string, context: Record<string, unknown>): string {
    if (!/^[a-z0-9-]+$/i.test(templateName)) {
      throw new Error(`Invalid email template name: ${templateName}`);
    }
    const templatePath = this.templateDir ? join(this.templateDir, `${templateName}.hbs`) : null;
    if (!templatePath || !existsSync(templatePath)) {
      this.logger.warn(`Template not found: ${templateName}, using fallback`);
      return `<h1>${escapeHtml(context.title)}</h1><p>${escapeHtml(context.body)}</p>`;
    }
    const source = readFileSync(templatePath, 'utf-8');
    // Handlebars {{ }} escapes HTML by default.
    const template = Handlebars.compile(source);
    return template(context);
  }
}
