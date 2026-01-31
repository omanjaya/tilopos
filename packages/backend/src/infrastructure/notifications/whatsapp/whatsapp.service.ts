import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WhatsAppMessage {
  to: string;
  message: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL', 'https://api.fonnte.com/send');
    this.apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN', '');
  }

  async send(message: WhatsAppMessage): Promise<boolean> {
    if (!this.apiToken) {
      this.logger.log(`[Mock WhatsApp] To: ${message.to} | Message: ${message.message}`);
      return true;
    }

    try {
      await axios.post(
        this.apiUrl,
        { target: message.to, message: message.message },
        { headers: { Authorization: this.apiToken } },
      );
      this.logger.log(`WhatsApp sent to ${message.to}`);
      return true;
    } catch (error) {
      this.logger.error(`WhatsApp send failed to ${message.to}`, error);
      return false;
    }
  }
}
