import { Module } from '@nestjs/common';
import { WaitingListController } from './waiting-list.controller';
import { WaitingListService } from './waiting-list.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WaitingListController],
  providers: [WaitingListService],
  exports: [WaitingListService],
})
export class WaitingListModule {}
