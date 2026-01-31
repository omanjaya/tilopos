import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { TransactionEventListener } from './transaction-event.listener';
import { OrderEventListener } from './order-event.listener';
import { StockEventListener } from './stock-event.listener';
import { SERVICE_TOKENS } from '../services/service.tokens';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { EmailModule } from '../notifications/email/email.module';
import { WhatsAppModule } from '../notifications/whatsapp/whatsapp.module';
import { PushModule } from '../notifications/push/push.module';

@Global()
@Module({
  imports: [EmailModule, WhatsAppModule, PushModule],
  providers: [
    EventBusService,
    TransactionEventListener,
    OrderEventListener,
    StockEventListener,
    NotificationDispatcherService,
    {
      provide: SERVICE_TOKENS.NOTIFICATION,
      useExisting: NotificationDispatcherService,
    },
  ],
  exports: [EventBusService, NotificationDispatcherService],
})
export class EventBusModule {}
