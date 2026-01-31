import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, unknown>;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly templateDir: string;

  constructor(private readonly configService: ConfigService) {
    this.templateDir = join(process.cwd(), 'src/infrastructure/notifications/email/templates');
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP not configured, emails will be logged only');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async send(options: EmailOptions): Promise<void> {
    let html = options.html || '';

    if (options.template && options.context) {
      html = this.renderTemplate(options.template, options.context);
    }

    if (!this.transporter) {
      this.logger.log(`[Mock Email] To: ${options.to} | Subject: ${options.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', 'noreply@tilopos.com'),
        to: options.to,
        subject: options.subject,
        html,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  private renderTemplate(templateName: string, context: Record<string, unknown>): string {
    const templatePath = join(this.templateDir, `${templateName}.hbs`);
    if (!existsSync(templatePath)) {
      this.logger.warn(`Template not found: ${templatePath}, using fallback`);
      return `<h1>${context.title || ''}</h1><p>${context.body || ''}</p>`;
    }
    const source = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(context);
  }
}
