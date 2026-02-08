import { Module } from '@nestjs/common';
import { ItemTrackingController } from './item-tracking.controller';
import { ItemTrackingService } from './item-tracking.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Module({
  controllers: [ItemTrackingController],
  providers: [ItemTrackingService, PrismaService],
  exports: [ItemTrackingService],
})
export class ItemTrackingModule {}
