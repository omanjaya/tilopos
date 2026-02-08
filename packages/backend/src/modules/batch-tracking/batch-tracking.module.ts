import { Module } from '@nestjs/common';
import { BatchTrackingService } from './batch-tracking.service';
import { BatchTrackingController } from './batch-tracking.controller';

@Module({
  controllers: [BatchTrackingController],
  providers: [BatchTrackingService],
  exports: [BatchTrackingService],
})
export class BatchTrackingModule {}
