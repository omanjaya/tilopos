import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface StockAlertJobData {
  outletId: string;
  productId: string;
  productName: string;
  currentStock: number;
  alertThreshold: number;
  businessId: string;
}

@Processor(QUEUE_NAMES.STOCK_ALERT)
export class StockAlertProcessor extends WorkerHost {
  private readonly logger = new Logger(StockAlertProcessor.name);

  async process(job: Job<StockAlertJobData>): Promise<void> {
    this.logger.warn(
      `Low stock alert: ${job.data.productName} at ${job.data.currentStock} units (threshold: ${job.data.alertThreshold})`,
    );
    // Will integrate with notification dispatcher in Phase 4
  }
}
