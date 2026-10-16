import { Module } from '@nestjs/common';
import { ItemTrackingController } from './item-tracking.controller';
import { ItemTrackingService } from './item-tracking.service';

// PrismaService comes from the global DatabaseModule; do not re-provide it here.
@Module({
  controllers: [ItemTrackingController],
  providers: [ItemTrackingService],
  exports: [ItemTrackingService],
})
export class ItemTrackingModule {}
