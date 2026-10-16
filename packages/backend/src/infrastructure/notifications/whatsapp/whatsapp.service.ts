import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { maskPhone, PROVIDER_TIMEOUT_MS, type DeliveryResult } from '../notification-utils';

export interface WhatsAppMessage {
  to: string;
  message: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string | undefined;
  private readonly apiToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    this.apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiToken);
  }

  /** Never logs the message body or the full phone number (R12). */
  async send(message: WhatsAppMessage): Promise<DeliveryResult> {
    if (!this.apiUrl || !this.apiToken) {
      this.logger.warn(`WhatsApp not sent (not configured) to ${maskPhone(message.to)}`);
      return { success: false, reason: 'NOT_CONFIGURED' };
    }

    try {
      await axios.post(
        this.apiUrl,
        { target: message.to, message: message.message },
        { headers: { Authorization: this.apiToken }, timeout: PROVIDER_TIMEOUT_MS },
      );
      this.logger.log(`WhatsApp sent to ${maskPhone(message.to)}`);
      return { success: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`WhatsApp send failed to ${maskPhone(message.to)}: ${detail}`);
      return { success: false, reason: 'PROVIDER_ERROR', error: detail };
    }
  }
}
