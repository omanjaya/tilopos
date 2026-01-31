import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface SettlementJobData {
  outletId: string;
  paymentMethod: string;
  settlementDate: string;
  businessId: string;
}

@Processor(QUEUE_NAMES.SETTLEMENT)
export class SettlementProcessor extends WorkerHost {
  private readonly logger = new Logger(SettlementProcessor.name);

  async process(job: Job<SettlementJobData>): Promise<void> {
    this.logger.log(
      `Processing settlement job ${job.id}: ${job.data.paymentMethod} for ${job.data.settlementDate}`,
    );
    // Will integrate with payment reconciliation
    this.logger.log(`[Queue] Settlement processed for ${job.data.paymentMethod}`);
  }
}
